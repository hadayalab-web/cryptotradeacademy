# X API DM 403 とアフィリエイトリクルートの整理

**目的**: リクルート稼働再開時に発生した `403 Forbidden — You do not have permission to DM one or more participants` を整理し、対応方針をまとめる。

---

## 1. エラーの中身

| 項目 | 内容 |
|------|------|
| **エンドポイント** | `POST /2/dm_conversations/with/{participant_id}/messages` |
| **HTTP ステータス** | 403 Forbidden |
| **メッセージ** | `You do not have permission to DM one or more participants.` |
| **意味** | **その参加者（候補ユーザー）に DM を送る権限が X 側で許可されていない** |

---

## 2. なぜ 403 になるか（想定される要因）

X API が 403 を返す理由は公式に「この条件で 403」とは明示されていない。以下は **コミュニティやエラー説明からよく挙がる要因**であり、当環境では未検証。

| 要因 | 説明（推測） |
|------|--------------|
| **受信側の設定** | 相手の DM 設定で未フォローからのリクエストを許可していない、など。 |
| **アプリ・プラン** | Developer Portal の DM 権限・allowlist・プラン（Basic / Pro 等）。 |
| **ブロック・スパム** | ブロックやスパム判定。 |
| **その他** | OAuth スコープ、レート制限、対象ユーザー固有の制限など。 |

※ 「検索でヒットした未フォロー・未会話ユーザーに送ると 403 になりやすい」という説は、**当方で検証していない**。DM 送信は別途テスト済みであり、403 の原因は環境・対象ユーザー・X 側の仕様次第。

---

## 3. 現在のリクルートフロー（どこで 403 が出るか）

```
Cron: /api/affiliate-recruit-run
  → 言語別スロットで候補検索（X Search API）
  → 候補 1 件につき sendRecruitDm(handle, text)
       → services/x/dmClient.js: POST /dm_conversations/with/{id}/messages
  → 相手が「DM 許可していない」など → 403
```

- **送信対象**: 検索で出てきた候補（フォロワー限定ではない）。
- **403 の扱い**: 現状はエラーログになるだけで、同じ候補を次回も試す可能性あり（必要なら「403 だった ID をスキップする」などの拡張が可能）。

---

## 4. 対応の選択肢

| 方針 | 内容 | 効果 |
|------|------|------|
| **403 をスキップして次へ** | 403 が出たユーザーはログに残し、次の候補へ進む。 | 1 件 403 で全体を止めない。 |
| **NG リストで二度送らない** | 403 だったユーザー ID を KV 等に保存し、次回以降は送信対象から外す。 | 同じ相手に何度も 403 を叩かない。 |
| **Developer Portal の確認** | 使用アプリのプラン・DM 用権限・allowlist を確認。 | 権限・プラン起因なら解消の余地。 |

---

## 5. 推奨の進め方

- **DM 送信はテスト済み**である前提で運用する。
- **403 時**: そのユーザーはスキップして次へ。**NG リスト**（Vercel KV 等）に 403 だったユーザー ID を保存し、次回から送信対象に含めない。
- 必要に応じて Developer Portal で DM 権限・プランを確認する。

---

## 6. 実装済み: 403 スキップ＋NG リスト＋スクリーニング用データ

- **候補選択時**: `affiliate_recruit:dm_ng:{userId}` が KV に存在するユーザーは送信対象から除外する。
- **403 発生時**: 送信に失敗し、エラー内容が 403 または "permission to DM" を含む場合、そのユーザーを NG 登録し、**スクリーニング用に以下のデータを JSON で保存**する（TTL 90 日）。
  - `userId`, `username`, `score`, `lang`, `breakdown`, `ts`, `reason: "403"`
- **KV キー**: `affiliate_recruit:dm_ng:{userId}`。値は上記の JSON。有効期限 90 日。
- **スクリーニングでの利用**: `npm run inspect:kv` や KV の prefix 検索（`affiliate_recruit:dm_ng:*`）で 403 になった候補一覧を取得し、スコア・言語・breakdown の傾向を見て候補検索条件の改善に使える。
- **方針**: 現状のスクリーニングは甘い。**DM が届きやすい相手を探す**ことに注力し、403 データを分析してスクリーニング力を上げる。

## 7. 関連ファイル

| ファイル | 役割 |
|----------|------|
| `api/affiliate-recruit-run.js` | Cron でリクルート実行・候補検索・DM 送信の起点。NG リストの参照・登録。 |
| `services/x/dmClient.js` | `sendRecruitDm(handle, text)` — DM API 呼び出し |
| `services/x/client.js` | `xApiRequest`・403 時のログ（possibleCauses 等） |
| `docs/AFFILIATE_STRATEGY_X_DM_FIRSTPROMOTER_WHOP.md` | 戦略全体・リクルートの位置づけ |

---

## 8. 参考（X 側の言及）

- [Direct Messages - Introduction](https://docs.x.com/x-api/direct-messages/manage/introduction)
- [Failed To Post DM - You do not have permission to DM one or more participants](https://devcommunity.x.com/t/failed-to-post-dm-you-do-not-have-permission-to-dm-one-or-more-participants/206731)（Developer Community）
