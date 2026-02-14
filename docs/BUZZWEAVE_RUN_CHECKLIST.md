# BuzzWeave — 正常に動かすためのチェックリスト

ロジックは揃っている。あとは以下を満たせば正常に動く。

---

## 稼働の前提（一度だけ確認）

| 項目 | 確認 |
|------|------|
| **ロックテーブル** | `buzzweave_locks` に `locked` と `updated_at` があること。[BUZZWEAVE_LOCK_SCHEMA_FIX.md](./BUZZWEAVE_LOCK_SCHEMA_FIX.md) の SQL を未実行なら実行する。 |
| **x_api_blocked** | 402 解消後は `false` に戻す。必要なら `scripts/clear-buzzweave-x-api-blocked.js` を実行。 |
| **btcSnapshot** | `/api/cron` が動いて KV に `btc:snapshot` が入っていること。無いと buzzweave-run は `SKIP_NO_SNAPSHOT` で終了する。 |
| **スロット** | `/api/buzzweave-slots` が日1回（0:00 JST 等）で動き、`td_post_slots` に枠が入っていること。 |
| **環境変数** | X API（Bearer / OAuth）、OpenAI、Supabase、Vidalytics 用（任意）が Vercel に設定されていること。 |

---

## Cron（Vercel）

- **buzzweave-run**: 毎分（`* * * * *`）→ 上記が揃っている時間帯だけ X を叩き、投稿する。
- **buzzweave-slots**: 日1回（例: 0:00 JST）→ 翌日の枠を投入。

---

## オプション（挙動を絞りたいとき）

- **投稿時間帯を絞る**: `BUZZWEAVE_ACTIVE_HOURS_JST=8,9,10,11,12,13,14,17,18,19,20,21,22,23` など。未設定なら従来どおり全時間帯。
- **緊急停止**: `BUZZWEAVE_EMERGENCY_STOP=true` で run を止める。

ここまで満たせば、あとはそのまま動かせばよい。
