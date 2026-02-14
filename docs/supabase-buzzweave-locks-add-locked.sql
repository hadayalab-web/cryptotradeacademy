-- buzzweave_locks に locked カラムを追加（qctmnyoyanisxxsekcjj 等で 42703 が出る場合）
-- Supabase Dashboard → SQL Editor で実行（接続先プロジェクト = Vercel が使う qctmnyoyanisxxsekcjj）

-- 1. locked カラムを追加（既にあればスキップ）
ALTER TABLE buzzweave_locks ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. 既存行の locked を明示的に初期化（万が一 NULL があれば）
UPDATE buzzweave_locks SET locked = FALSE WHERE locked IS NULL;

-- 3. 確認
SELECT lock_name, locked, updated_at FROM buzzweave_locks;
