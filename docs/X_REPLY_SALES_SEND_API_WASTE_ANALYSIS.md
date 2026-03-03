# X Reply Sales 送信フロー API クレジット浪費 分析

## ログ概要（2026-03-03 01:50–01:52, ar 14件）

- キュー: en: 0, ar: 14
- フロー: フォロー → いいね → リプライ試行（または skip）→ DM

---

## 1. 1件あたりの X API 呼び出し（現状）

| 処理 | エンドポイント | 回数/件 |
|------|----------------|---------|
| フォロー前 | GET /users/me | 1（followUser 内で getMe） |
| フォロー | POST /users/:id/following | 1 |
| いいね前 | GET /users/me | 1（likeTweet 内で getMe） |
| いいね | POST /users/:id/likes | 1 |
| リプライ試行（everyone のみ） | POST /tweets | 1（403 で全滅） |
| DM | POST /dm_conversations/with/:id/messages | 1 |

→ **1件あたり 2× GET /users/me + 1 follow + 1 like + (1 reply) + 1 dm = 6〜7 呼び出し**

14件で **GET /users/me が 28回**（follow と like で毎回 getMe を呼んでいるため）。

---

## 2. 浪費の内訳

### A. GET /users/me の重複（最大の無駄）

- `followUser()` と `likeTweet()` が**それぞれ内部で getMe() を呼んでいる**。
- 自ユーザー ID はラン中変わらないのに、**1件ごとに 2回** GET /users/me を実行。
- 14件 × 2 = **28 回/ラン**。月あたり（96 ラン/日 × 30 日）だと **約 8 万回以上** の GET /users/me が発生しうる。

### B. リプライ試行の全滅

- reply_settings=everyone の件で毎回 POST /tweets を実行 → すべて 403。
- リプライが通らない運用なら、**1件あたり 1 回の POST /tweets が丸ごと浪費**。
- 停止する場合は `X_REPLY_SKIP_REPLY_ATTEMPT=1` でリプライ試行を止めると削減可能。

### C. 同一ユーザーへの重複送信（infinity_crypt1）

- ログ上 **infinity_crypt1**（author_id: 1638297157835845634）が **attempt 2, 4, 5, 7, 8, 9** で 6 回登場。
- 同一ユーザーに **6 回 DM**（＋ いいね等）＝ 同じ相手に複数回 API を消費。
- リスト側の author_id 重複排除が効いていても、**既にキューに積まれた古い重複**や、送信ラン内の重複は防ぎたい。
- **送信ラン内で同一 author_id は 1 回だけ処理**するようにすれば、重複ぶんの API を削減できる。

### D. DM 403（URL invalid 等）

- 一部で `The URL in this request could not be processed or is invalid` の 403。
- DM 1 回ぶんのクレジットは消費されている可能性がある（要 X API 仕様確認）。

---

## 3. 削減策（実装済み or 推奨）

| 対策 | 効果 | 実装 |
|------|------|------|
| **GET /users/me を 1 ランに 1 回に** | 28 → 1 回/ラン（27 回削減） | ラン開始時に getMe を 1 回だけ呼び、follow/like に sourceId を渡す |
| **リプライ試行を止める** | POST /tweets を 0 に | 運用で `X_REPLY_SKIP_REPLY_ATTEMPT=1` |
| **送信ラン内で同一 author は 1 回だけ** | 重複ユーザーぶんの follow/like/reply/DM を削減 | ラン内で処理済み author_id を Set で管理し、2 件目以降はスキップ |

---

## 4. 結論

- **GET /users/me** が 1 件あたり 2 回ずつで、**最も大きな浪費**。
- これに **同一ユーザーへの重複送信** と **全滅しているリプライ試行** が重なり、API クレジットの消費が激しくなっている。
- 上記 3 点（getMe キャッシュ・リプライ停止・送信ラン内 author 重複スキップ）を入れることで、同じ送信件数でもクレジット消費を大きく減らせる。
