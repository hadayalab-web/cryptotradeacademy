-- Phase 3: btc_snapshots スキーマ拡張（meta, market_regime）
-- Run in Supabase SQL Editor after btc_snapshots table exists.

ALTER TABLE btc_snapshots
  ADD COLUMN IF NOT EXISTS meta JSONB,
  ADD COLUMN IF NOT EXISTS market_regime TEXT;

COMMENT ON COLUMN btc_snapshots.meta IS 'Phase 3: deliveryMode meta flags (watch, standbyBreak)';
COMMENT ON COLUMN btc_snapshots.market_regime IS 'Phase 3: computeMarketRegime result (whale-driven, retail-fomo, etc.)';
