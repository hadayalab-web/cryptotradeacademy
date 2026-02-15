-- v5.3: buzzweave_post_log に導線KPI学習用カラム追加
-- Supabase SQL Editor で実行

ALTER TABLE buzzweave_post_log ADD COLUMN IF NOT EXISTS funnel_type TEXT;
ALTER TABLE buzzweave_post_log ADD COLUMN IF NOT EXISTS funnel_url TEXT;
ALTER TABLE buzzweave_post_log ADD COLUMN IF NOT EXISTS narrative_tag TEXT;
ALTER TABLE buzzweave_post_log ADD COLUMN IF NOT EXISTS cta_type TEXT;
ALTER TABLE buzzweave_post_log ADD COLUMN IF NOT EXISTS our_clicks BIGINT;
ALTER TABLE buzzweave_post_log ADD COLUMN IF NOT EXISTS our_subs BIGINT;

CREATE INDEX IF NOT EXISTS idx_buzzweave_post_log_funnel_type ON buzzweave_post_log(funnel_type) WHERE funnel_type IS NOT NULL;
