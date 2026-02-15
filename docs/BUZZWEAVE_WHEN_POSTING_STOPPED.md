# BuzzWeave — 投稿が止まったときの確認

暴走防止を入れた結果、投稿が完全にストップしてしまうことがあった経緯を踏まえ、**止まった原因ごとの対処**をまとめる。

---

## 1. 投稿が止まる主な原因と対処

| 原因 | 確認方法 | 対処 |
|------|----------|------|
| **ロックが minimal のまま** | ログに `refusing run` / `minimal schema` が出る | [BUZZWEAVE_LOCK_SCHEMA_FIX.md](./BUZZWEAVE_LOCK_SCHEMA_FIX.md) の SQL を実行し、`locked` / `updated_at` を追加。 |
| **x_api_blocked が true のまま** | ログに `X API blocked flag active` | 402 解消・Token/クレジット対応後: **API** `GET /api/buzzweave-clear-x-api-blocked?cron_secret=xxx`（CRON_SECRET 認証）、**スクリプト** `node scripts/clear-buzzweave-x-api-blocked.js`、または Supabase で `x_api_blocked=false` に更新。 |
| **btcSnapshot が無い** | ログに `SKIP_NO_SNAPSHOT` | `/api/cron` が動き、KV に `btc:snapshot` が入るようにする。cron が止まっているなら原因を解消してから再実行。 |
| **スロットが 0 件** | ログに `No slots in next hour` | `/api/buzzweave-slots` が日1回動いているか確認。`td_post_slots` にレコードが入っているか確認。 |

---

## 2. 「暴走は止めたいが、投稿は止めたくない」とき

- **ロックテーブルを直す** → minimal スキーマ時はバイパス不可。テーブル修復のみ（[BUZZWEAVE_LOCK_SCHEMA_FIX.md](./BUZZWEAVE_LOCK_SCHEMA_FIX.md)）。
- **402 後も再試行させたくない** → `x_api_blocked` はそのまま true でよい。解除するのは「Token/クレジットを直したあと」だけにすれば、暴走は起きない。
- **時間帯で叩く回数を減らしたい** → `BUZZWEAVE_ACTIVE_HOURS_JST` で投稿したい時間だけスロットを生成する。

---

## 3. まとめ

- 暴走防止で「run を拒否する」条件を入れた結果、投稿が止まった場合は、上記のどれに当たるかログで確認する。
- **ロックが原因で止まっている**場合は、テーブル修復のみで再開する。
