-- Phase 4: asset_snapshots table (multi-asset)
-- Run in Supabase SQL Editor after btc_snapshots exists.

CREATE TABLE IF NOT EXISTS asset_snapshots (
  id BIGSERIAL PRIMARY KEY,
  asset_code TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
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
  meta JSONB,
  market_regime TEXT,
  diff JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(asset_code, snapshot_id)
);

CREATE INDEX IF NOT EXISTS idx_asset_snapshots_asset_code ON asset_snapshots(asset_code);
CREATE INDEX IF NOT EXISTS idx_asset_snapshots_as_of_utc ON asset_snapshots(as_of_utc DESC);
CREATE INDEX IF NOT EXISTS idx_asset_snapshots_created_at ON asset_snapshots(created_at DESC);

COMMENT ON TABLE asset_snapshots IS 'Phase 4: Multi-asset snapshot history (BTC, ETH, SOL, NASDAQ, GOLD)';
