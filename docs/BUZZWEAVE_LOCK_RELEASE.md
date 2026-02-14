# BuzzWeave ロック解除手順

「`early return: Locked (another run in progress)`」が連続し、BWE が一度も実行されない場合の対処。

---

## 方法 1: Node スクリプト（推奨）

```bash
node scripts/release-buzzweave-lock.js
```

- 前提: `.env` に `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` が設定済み
- `buzzweave_main` のロックを `locked = false` に更新

---

## 方法 2: Supabase SQL Editor

Supabase Dashboard → SQL Editor で実行:

```sql
UPDATE buzzweave_locks
SET locked = false, updated_at = NOW()
WHERE lock_name = 'buzzweave_main';
```

---

## 解除後の確認

1. `/api/buzzweave-run` を手動で 1 回叩く
2. Vercel ログで以下を確認:
   - `[buzzweave-run] lock acquired`
   - `[buzzweave-run] run started`
   - `[BuzzWeave] BWE SCAN: X API accessed OK, posts fetched: N`
   - `[BuzzWeave] BWE SCAN RESULT: posts_fetched=N buzz_candidates=M`
   - 投稿した場合: `[BuzzWeave] BWE SCAN: REPOSTED quoted_id=XXX our_tweet_id=YYY`
   - `[buzzweave-run] lock released`

---

## ロックが残る原因

- 例外で `finally` が実行されなかった（v2 修正で try/finally 構造に変更済み）
- TTL 60秒経過前にプロセスが異常終了（TTL 経過で自動解除）
- 同一ロックを複数プロセスが競合（Cron の多重起動など）
