-- Trap Defence OS v4.2+ — CHAIN_RAID KPI ログ・リアルタイムCTR・相関分析
-- Supabase SQL Editor で実行
-- 前提: btc_snapshots, tweet_metrics, buzzweave_post_log が存在すること

-- ============================================================
-- 1. chain_raid_post_kpi（1ポスト単位のKPI）
-- ============================================================
CREATE TABLE IF NOT EXISTS chain_raid_post_kpi (
  id BIGSERIAL PRIMARY KEY,
  post_id TEXT NOT NULL UNIQUE,
  quoted_tweet_id TEXT NOT NULL,
  lang TEXT NOT NULL,
  psychology_tag TEXT NOT NULL DEFAULT 'CHAIN_RAID',
  burst_factor NUMERIC,
  fusion_score NUMERIC,
  cq_snapshot_ts BIGINT,
  -- X API メトリクス
  impressions BIGINT,
  link_clicks BIGINT,
  replies INT,
  reposts INT,
  bookmarks INT,
  er NUMERIC GENERATED ALWAYS AS (
    CASE WHEN impressions > 0 THEN (COALESCE(replies,0) + COALESCE(reposts,0) + COALESCE(bookmarks,0))::NUMERIC / impressions ELSE NULL END
  ) STORED,
  ctr NUMERIC GENERATED ALWAYS AS (
    CASE WHEN impressions > 0 AND link_clicks IS NOT NULL THEN (link_clicks::NUMERIC / impressions) ELSE NULL END
  ) STORED,
  -- 投稿メタ
  post_timing INT,
  media_type TEXT,
  fusion_score_bin TEXT,
  cluster_id TEXT,
  -- Poll / Vidalytics / TG
  poll_yes INT,
  poll_no INT,
  demo_views INT,
  tg_joins INT,
  subs INT,
  retention_subs_7d INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metrics_updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chain_raid_post_kpi_created_at ON chain_raid_post_kpi(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chain_raid_post_kpi_lang ON chain_raid_post_kpi(lang);
CREATE INDEX IF NOT EXISTS idx_chain_raid_post_kpi_cluster ON chain_raid_post_kpi(cluster_id) WHERE cluster_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chain_raid_post_kpi_post_timing ON chain_raid_post_kpi(post_timing) WHERE post_timing IS NOT NULL;

COMMENT ON TABLE chain_raid_post_kpi IS 'v4.2: CHAIN_RAID 1ポスト単位のKPI。CTR・ER・相関分析用';

-- ============================================================
-- 2. fishermen_cluster_metrics（釣り師クラスタ指標）
-- ============================================================
CREATE TABLE IF NOT EXISTS fishermen_cluster_metrics (
  id BIGSERIAL PRIMARY KEY,
  cluster_id TEXT NOT NULL,
  lang TEXT NOT NULL,
  fishermen_count INT,
  avg_burst_factor NUMERIC,
  avg_botnet_density NUMERIC,
  peak_hours INT[],
  recent_burst_events INT,
  chain_raid_posts INT,
  avg_ctr NUMERIC,
  avg_fusion_score NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cluster_id, lang)
);

CREATE INDEX IF NOT EXISTS idx_fishermen_cluster_lang ON fishermen_cluster_metrics(lang);

-- ============================================================
-- 3. view_lang_ctr_realtime（過去24h 言語別集計）
-- ============================================================
CREATE OR REPLACE VIEW view_lang_ctr_realtime AS
SELECT
  lang,
  COUNT(*) AS posts,
  SUM(COALESCE(impressions, 0)) AS total_impressions,
  SUM(COALESCE(link_clicks, 0)) AS total_clicks,
  CASE WHEN SUM(COALESCE(impressions, 0)) > 0
    THEN SUM(COALESCE(link_clicks, 0))::NUMERIC / SUM(COALESCE(impressions, 0))
    ELSE NULL END AS avg_ctr,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY
    CASE WHEN impressions > 0 AND link_clicks IS NOT NULL
      THEN link_clicks::NUMERIC / impressions ELSE NULL END
  ) AS median_ctr,
  AVG(burst_factor) AS avg_burst_factor,
  AVG(fusion_score) AS avg_fusion_score,
  AVG(COALESCE(demo_views, 0)) AS avg_demo_views_per_post,
  AVG(COALESCE(tg_joins, 0)) AS avg_tg_joins_per_post,
  CASE WHEN SUM(COALESCE(demo_views, 0)) > 0
    THEN SUM(COALESCE(tg_joins, 0))::NUMERIC / SUM(COALESCE(demo_views, 0))
    ELSE NULL END AS cvr_tg,
  -- ROI: 言語別 price_per_sub（リスト価格 USD）。初月50%オフは別途考慮
  CASE WHEN COUNT(*) > 0
    THEN (SUM(COALESCE(subs, 0)) * (
      CASE LOWER(lang)
        WHEN 'en' THEN 99.0 WHEN 'es' THEN 89.0 WHEN 'ar' THEN 79.0
        WHEN 'pt' THEN 87.0 WHEN 'ko' THEN 95.0 WHEN 'ja' THEN 95.0
        ELSE 99.0 END
    )) / COUNT(*)
    ELSE NULL END AS roi
FROM chain_raid_post_kpi
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY lang;

COMMENT ON VIEW view_lang_ctr_realtime IS '過去24h 言語別 CTR・CVR・ROI。ORDER BY avg_ctr DESC 等で運用';

-- ============================================================
-- 4. view_cluster_ctr_stats（クラスタ別集計・相関）
-- ============================================================
CREATE OR REPLACE VIEW view_cluster_ctr_stats AS
SELECT
  COALESCE(kpi.cluster_id, 'unknown') AS cluster_id,
  kpi.lang,
  COUNT(*) AS posts,
  AVG(kpi.ctr) AS avg_ctr,
  AVG(kpi.burst_factor) AS avg_burst_factor,
  AVG(kpi.fusion_score) AS avg_fusion_score,
  AVG(kpi.demo_views) AS avg_demo_views,
  AVG(kpi.tg_joins) AS avg_tg_joins,
  AVG(kpi.subs) AS avg_subs,
  fcm.fishermen_count AS cluster_size,
  fcm.avg_botnet_density AS avg_botnet_density,
  CORR(kpi.burst_factor, kpi.ctr) AS corr_burst_ctr
FROM chain_raid_post_kpi kpi
LEFT JOIN fishermen_cluster_metrics fcm
  ON fcm.cluster_id = kpi.cluster_id AND fcm.lang = kpi.lang
WHERE kpi.created_at > NOW() - INTERVAL '7 days'
GROUP BY COALESCE(kpi.cluster_id, 'unknown'), kpi.lang, fcm.fishermen_count, fcm.avg_botnet_density;

COMMENT ON VIEW view_cluster_ctr_stats IS 'クラスタ別 CTR・burst×CTR 相関。corr_burst_ctr > 0.6 を金クラスタ';

-- ============================================================
-- 5. materialized views（5分 cron で REFRESH）
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_lang_ctr_realtime AS
SELECT * FROM view_lang_ctr_realtime;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_lang_ctr_lang ON mv_lang_ctr_realtime(lang);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_cluster_ctr_stats AS
SELECT * FROM view_cluster_ctr_stats;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_cluster_ctr_pk ON mv_cluster_ctr_stats(cluster_id, lang);

-- ============================================================
-- 6. REFRESH 用関数（RPC から呼ぶ）
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_chain_raid_mvs()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_lang_ctr_realtime;
  REFRESH MATERIALIZED VIEW mv_cluster_ctr_stats;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'refresh_chain_raid_mvs: %', SQLERRM;
END;
$$;

-- 実行: SELECT refresh_chain_raid_mvs();
-- CONCURRENTLY を使う場合: ユニークインデックス必須。データ投入後に ALTER で CONCURRENTLY に変更可能
