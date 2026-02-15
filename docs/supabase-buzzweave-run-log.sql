-- BuzzWeave run 回数・間隔制御用（1日上限・run間隔 3h のため）
-- Supabase Dashboard → SQL Editor で実行（Vercel が利用するプロジェクトを指定）

CREATE TABLE IF NOT EXISTS buzzweave_run_log (
  id BIGSERIAL PRIMARY KEY,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buzzweave_run_log_executed_at
  ON buzzweave_run_log (executed_at);

COMMENT ON TABLE buzzweave_run_log IS 'BuzzWeave 1 run ごとの実行時刻。getTodayRunCount / getLastRunTimestamp で参照。';
