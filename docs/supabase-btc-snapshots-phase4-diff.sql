-- Phase 4: btc_snapshots — add diff column
-- Run in Supabase SQL Editor after Phase 3 migration.

ALTER TABLE btc_snapshots
  ADD COLUMN IF NOT EXISTS diff JSONB;

COMMENT ON COLUMN btc_snapshots.diff IS 'Phase 4: computeSnapshotDiff result (priceChange, whaleRatioChange, summaryText, etc.)';
