-- buzzweave_locks を minimal (lock_name のみ) から完全スキーマへ移行
-- 「minimal schema, allowing run without lock」を解消し、新ロック方式で動かす用。
-- Supabase Dashboard → SQL Editor で実行（Vercel が使うプロジェクトを指定）

-- 1. locked を追加（既にあればスキップ）
ALTER TABLE buzzweave_locks ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. updated_at を追加（既にあればスキップ）。TTL 判定に使用。
ALTER TABLE buzzweave_locks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. 既存行の初期化（locked を false、updated_at を古くしてロック解放状態に）
UPDATE buzzweave_locks SET locked = FALSE WHERE locked IS NULL;
UPDATE buzzweave_locks SET updated_at = '1970-01-01T00:00:00Z' WHERE updated_at IS NULL;

-- 4. 確認
SELECT lock_name, locked, updated_at FROM buzzweave_locks;
