-- Trap Defence Unified OS: btcSnapshot history (mandatory)
-- Used for: Emergency accuracy, divergence precision, BWE optimization, backtesting, market structure replay
-- Run in Supabase SQL Editor after tweet_metrics schema.

CREATE TABLE IF NOT EXISTS btc_snapshots (
  id BIGSERIAL PRIMARY KEY,
  snapshot_id TEXT NOT NULL UNIQUE,
  as_of_utc TIMESTAMPTZ NOT NULL,
  raw JSONB NOT NULL,
  cq_deep JSONB,
  x_sentiment JSONB,
  high_res_x JSONB,
  gpt_structure_reasoning TEXT,
  gpt_scenario_map TEXT,
  gpt_trap_interpretation TEXT,
  sosovalue_article TEXT,
  dr_grok JSONB,
  trap_detection JSONB,
  trap_alert JSONB,
  divergence_signal JSONB,
  market_score INT,
  trade_signal JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_btc_snapshots_as_of_utc ON btc_snapshots(as_of_utc DESC);
CREATE INDEX IF NOT EXISTS idx_btc_snapshots_created_at ON btc_snapshots(created_at DESC);

COMMENT ON TABLE btc_snapshots IS 'Unified OS: one row per cron cycle. Required for Emergency, BWE, backtesting.';
