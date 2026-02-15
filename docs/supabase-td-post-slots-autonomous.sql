-- td_post_slots 自律化カラム追加（cluster_id / narrative_tag / cta_type）
-- Supabase SQL Editor で実行

ALTER TABLE td_post_slots ADD COLUMN IF NOT EXISTS cluster_id TEXT;
ALTER TABLE td_post_slots ADD COLUMN IF NOT EXISTS narrative_tag TEXT;
ALTER TABLE td_post_slots ADD COLUMN IF NOT EXISTS cta_type TEXT;

CREATE INDEX IF NOT EXISTS idx_td_post_slots_cluster ON td_post_slots(cluster_id) WHERE cluster_id IS NOT NULL;
