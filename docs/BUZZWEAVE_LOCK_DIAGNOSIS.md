# BuzzWeave ロック診断レポート

## 結論（会話ログより）

> **今の "Locked" は、本当のロック競合じゃない。**  
> Vercel 側で Supabase に繋がっていない or 別の Supabase を見ているせいで、  
> ずっと「ロック取得失敗＝Locked」と誤判定している可能性が極めて高い。

- ローカルで `release-buzzweave-lock.js` を実行 → 自分の Supabase に対してロック解除
- Vercel 上の `buzzweave-run` → 別の Supabase or 何も設定されていない
- `getSupabase()` が null or 別DB → `acquireBuzzweaveLock()` が毎回 false
- それを「Locked」とログ出力しているだけ

**→ 今すぐやるべきは 1 つ：Vercel の環境変数をローカルと完全一致させる。**

---

## STEP 1：ロックキー名の一致確認

**結論：一致している（犯人ではない）**

| 箇所 | キー名 | テーブル |
|------|--------|----------|
| `utils/supabase.js` acquireBuzzweaveLock | `buzzweave_main` | buzzweave_locks |
| `utils/supabase.js` releaseBuzzweaveLock | `buzzweave_main` | buzzweave_locks |
| `scripts/release-buzzweave-lock.js` | 同上（デフォルト使用） | 同上 |

- `buzzweave:lock` や `buzzweave_lock` 等の別名は **コード内に存在しない**

---

## STEP 2：critical-shift の呼び出し元

**結論：このリポジトリからは呼ばれていない（ロックの直接原因ではない）**

- `vercel.json` の crons: critical-shift なし
- コードベース内: 参照ゼロ
- `api/critical-shift/run.js` 削除済み

POST 401 `/api/critical-shift/run` は外部（UptimeRobot 等）からの「亡霊」リクエスト。後で潰すが最優先ではない。

---

## STEP 3：本命 — Vercel の Supabase 設定

### A) Vercel とローカルで Supabase が違う（可能性高）

- ローカルは `.env` の Supabase に接続
- Vercel は環境変数の Supabase に接続
- **別プロジェクト／別 DB** の場合、ローカルで解除しても Vercel 側はそのまま

### B) Vercel で Supabase が未設定

- `getSupabase()` が null → `acquireBuzzweaveLock()` 即 false
- ログは「Locked」とだけ出る（実際は接続不可）

---

## 実装済みの対策

1. **Supabase 未設定時の明確なログ**
   - `isSupabaseConfigured()` で事前チェック
   - 未設定時: `[buzzweave-run] early return: Supabase NOT configured`、503 返却

2. **buzzweave-health の拡張**
   - `checks.supabase.lock` でロック状態を表示
   - Supabase 未設定時は `hint` で Vercel 環境変数の確認を促す
   - ローカルで release した直後に health を叩けば、同じ DB かどうか判定可能

3. **getBuzzweaveLockState()**
   - ロック読み取り専用関数（診断用）

---

## 次のアクション（確定）

1. **Vercel 環境変数をローカルと完全一致させる**
   - `NEXT_PUBLIC_SUPABASE_URL` または `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - 詳細: [VERCEL_SUPABASE_SETUP.md](./VERCEL_SUPABASE_SETUP.md)

2. **デプロイ後、`/api/buzzweave-health` で接続を確認**

3. **`/api/buzzweave-run?dry_run=true` を叩き、ログで以下を確認**
   - `lock acquired` → `run started` → `BWE SCAN: X API accessed OK` → `lock released`
