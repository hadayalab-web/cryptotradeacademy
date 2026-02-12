-- BuzzWeave Engine: cron 多重実行防止ロック + ステータス管理
-- Supabase SQL Editor で実行

CREATE TABLE IF NOT EXISTS buzzweave_locks (
  lock_name TEXT PRIMARY KEY,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO buzzweave_locks (lock_name, locked) VALUES ('buzzweave_main', FALSE)
ON CONFLICT (lock_name) DO NOTHING;

-- buzzweave_status: 緊急停止・402 ブロック等の状態管理（1行運用）
CREATE TABLE IF NOT EXISTS buzzweave_status (
  id TEXT PRIMARY KEY DEFAULT 'main',
  last_emergency_stop_at TIMESTAMPTZ,
  emergency_stop_reason TEXT,
  x_api_blocked BOOLEAN DEFAULT FALSE,
  x_api_last_402_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO buzzweave_status (id) VALUES ('main')
ON CONFLICT (id) DO NOTHING;

-- 既存で buzzweave_run を使っていた場合、buzzweave_main を追加:
-- INSERT INTO buzzweave_locks (lock_name, locked) VALUES ('buzzweave_main', FALSE) ON CONFLICT (lock_name) DO NOTHING;
