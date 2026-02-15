-- Trap Defence OS v4.3 / v4.4 / v4.5 — スキーマ拡張
-- 前提: supabase-chain-raid-kpi-schema.sql が実行済み

-- ============================================================
-- v4.3: BotNet × CTR 相関
-- ============================================================
ALTER TABLE chain_raid_post_kpi ADD COLUMN IF NOT EXISTS botnet_cluster_id TEXT;
ALTER TABLE chain_raid_post_kpi ADD COLUMN IF NOT EXISTS botnet_density NUMERIC;
ALTER TABLE chain_raid_post_kpi ADD COLUMN IF NOT EXISTS botnet_coherence NUMERIC;

CREATE INDEX IF NOT EXISTS idx_chain_raid_post_kpi_botnet_cluster ON chain_raid_post_kpi(botnet_cluster_id) WHERE botnet_cluster_id IS NOT NULL;

-- ============================================================
-- v4.4: ナラティブ収益
-- ============================================================
ALTER TABLE chain_raid_post_kpi ADD COLUMN IF NOT EXISTS narrative_tag TEXT;
ALTER TABLE chain_raid_post_kpi ADD COLUMN IF NOT EXISTS asset_class TEXT;
ALTER TABLE chain_raid_post_kpi ADD COLUMN IF NOT EXISTS market_volatility NUMERIC;

CREATE INDEX IF NOT EXISTS idx_chain_raid_post_kpi_narrative ON chain_raid_post_kpi(narrative_tag) WHERE narrative_tag IS NOT NULL;

-- ============================================================
-- v4.3: view_cluster_ctr_stats 拡張（avg_er, botnet, corr_botnet_ctr）
-- ============================================================
CREATE OR REPLACE VIEW view_cluster_ctr_stats AS
SELECT
  COALESCE(kpi.botnet_cluster_id, kpi.cluster_id, 'unknown') AS cluster_id,
  kpi.lang,
  COUNT(*) AS posts,
  AVG(kpi.ctr) AS avg_ctr,
  AVG(kpi.er) AS avg_er,
  AVG(kpi.burst_factor) AS avg_burst_factor,
  AVG(kpi.fusion_score) AS avg_fusion_score,
  AVG(kpi.botnet_density) AS avg_botnet_density,
  AVG(kpi.botnet_coherence) AS avg_botnet_coherence,
  COALESCE(fcm.fishermen_count, 0) AS cluster_size,
  AVG(kpi.demo_views) AS avg_demo_views,
  AVG(kpi.tg_joins) AS avg_tg_joins,
  AVG(kpi.subs) AS avg_subs,
  CORR(kpi.burst_factor, kpi.ctr) AS corr_burst_ctr,
  CORR(kpi.botnet_density, kpi.ctr) AS corr_botnet_ctr
FROM chain_raid_post_kpi kpi
LEFT JOIN fishermen_cluster_metrics fcm
  ON fcm.cluster_id = COALESCE(kpi.botnet_cluster_id, kpi.cluster_id) AND fcm.lang = kpi.lang
WHERE kpi.created_at > NOW() - INTERVAL '7 days'
GROUP BY COALESCE(kpi.botnet_cluster_id, kpi.cluster_id, 'unknown'), kpi.lang, fcm.fishermen_count;

-- ============================================================
-- v4.3: view_cluster_corr（金クラスタ判定用）
-- ============================================================
CREATE OR REPLACE VIEW view_cluster_corr AS
SELECT
  cluster_id,
  lang,
  posts,
  avg_ctr,
  avg_er,
  cluster_size,
  corr_burst_ctr,
  corr_botnet_ctr
FROM view_cluster_ctr_stats;

-- ============================================================
-- v4.4: view_narrative_ctr_stats
-- ============================================================
CREATE OR REPLACE VIEW view_narrative_ctr_stats AS
SELECT
  COALESCE(narrative_tag, 'UNKNOWN') AS narrative_tag,
  COALESCE(asset_class, 'BTC') AS asset_class,
  lang,
  COUNT(*) AS posts,
  AVG(ctr) AS avg_ctr,
  AVG(er) AS avg_er,
  AVG(burst_factor) AS avg_burst_factor,
  AVG(fusion_score) AS avg_fusion_score,
  AVG(demo_views) AS avg_demo_views,
  AVG(tg_joins) AS avg_tg_joins,
  AVG(subs) AS avg_subs
FROM chain_raid_post_kpi
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY COALESCE(narrative_tag, 'UNKNOWN'), COALESCE(asset_class, 'BTC'), lang;

-- ============================================================
-- v4.4: view_narrative_corr
-- ============================================================
CREATE OR REPLACE VIEW view_narrative_corr AS
SELECT
  narrative_tag,
  asset_class,
  lang,
  posts,
  avg_ctr,
  corr_burst_ctr
FROM (
  SELECT
    COALESCE(narrative_tag, 'UNKNOWN') AS narrative_tag,
    COALESCE(asset_class, 'BTC') AS asset_class,
    lang,
    COUNT(*) AS posts,
    AVG(ctr) AS avg_ctr,
    CORR(burst_factor, ctr) AS corr_burst_ctr
  FROM chain_raid_post_kpi
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY COALESCE(narrative_tag, 'UNKNOWN'), COALESCE(asset_class, 'BTC'), lang
) sub;

-- ============================================================
-- v4.4: view_narrative_revenue_est
-- ============================================================
CREATE OR REPLACE VIEW view_narrative_revenue_est AS
SELECT
  COALESCE(narrative_tag, 'UNKNOWN') AS narrative_tag,
  COALESCE(asset_class, 'BTC') AS asset_class,
  lang,
  COUNT(*) AS posts,
  AVG(ctr) AS avg_ctr,
  AVG(subs) AS avg_subs,
  AVG(burst_factor) AS avg_burst_factor,
  AVG(COALESCE(market_volatility, 0.02)) AS avg_vol,
  AVG(ctr * COALESCE(subs, 0) * COALESCE(market_volatility, 0.02)) AS revenue_est
FROM chain_raid_post_kpi
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY COALESCE(narrative_tag, 'UNKNOWN'), COALESCE(asset_class, 'BTC'), lang;

-- ============================================================
-- v4.5: view_lang_psych_sensitivity
-- ============================================================
CREATE OR REPLACE VIEW view_lang_psych_sensitivity AS
SELECT
  lang,
  COUNT(*) AS posts,
  CORR(
    CASE WHEN (COALESCE(poll_yes, 0) + COALESCE(poll_no, 0)) > 0
      THEN poll_yes::NUMERIC / (poll_yes + poll_no) ELSE NULL END,
    fusion_score
  ) AS corr_poll_fusion,
  CORR(
    CASE WHEN (COALESCE(poll_yes, 0) + COALESCE(poll_no, 0)) > 0
      THEN poll_yes::NUMERIC / (poll_yes + poll_no) ELSE NULL END,
    burst_factor
  ) AS corr_poll_burst
FROM chain_raid_post_kpi
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY lang;

-- ============================================================
-- v4.5: view_lang_psych_matrix
-- ============================================================
CREATE OR REPLACE VIEW view_lang_psych_matrix AS
SELECT
  lang,
  COALESCE(narrative_tag, 'UNKNOWN') AS narrative_tag,
  COUNT(*) AS posts,
  AVG(ctr) AS avg_ctr,
  AVG(er) AS avg_er
FROM chain_raid_post_kpi
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY lang, COALESCE(narrative_tag, 'UNKNOWN');

-- ============================================================
-- Materialized Views 更新（refresh_chain_raid_mvs に追加）
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS mv_cluster_ctr_stats;
CREATE MATERIALIZED VIEW mv_cluster_ctr_stats AS SELECT * FROM view_cluster_ctr_stats;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_cluster_ctr_pk ON mv_cluster_ctr_stats(cluster_id, lang);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_cluster_corr AS SELECT * FROM view_cluster_corr;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_cluster_corr_pk ON mv_cluster_corr(cluster_id, lang);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_narrative_ctr_stats AS SELECT * FROM view_narrative_ctr_stats;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_narrative_ctr_pk ON mv_narrative_ctr_stats(narrative_tag, asset_class, lang);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_lang_psych_sensitivity AS SELECT * FROM view_lang_psych_sensitivity;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_lang_psych_lang ON mv_lang_psych_sensitivity(lang);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_lang_psych_matrix AS SELECT * FROM view_lang_psych_matrix;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_lang_psych_matrix_pk ON mv_lang_psych_matrix(lang, narrative_tag);

-- REFRESH 関数更新
CREATE OR REPLACE FUNCTION refresh_chain_raid_mvs()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_lang_ctr_realtime;
  REFRESH MATERIALIZED VIEW mv_cluster_ctr_stats;
  REFRESH MATERIALIZED VIEW mv_cluster_corr;
  REFRESH MATERIALIZED VIEW mv_narrative_ctr_stats;
  REFRESH MATERIALIZED VIEW mv_lang_psych_sensitivity;
  REFRESH MATERIALIZED VIEW mv_lang_psych_matrix;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'refresh_chain_raid_mvs: %', SQLERRM;
END;
$$;
