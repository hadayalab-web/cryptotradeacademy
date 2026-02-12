-- BuzzWeave Engine: 集中投下結果回収ログ
-- Supabase SQL Editor で実行してください
-- 用途: clusterScore係数調整・言語別クラスタ重み・buzzSummary/clusterPsych/insight パターン別成果の学習

CREATE TABLE IF NOT EXISTS buzzweave_post_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 投稿時保存
  slot_lang TEXT NOT NULL,
  cluster_label TEXT NOT NULL,
  cluster_score NUMERIC NOT NULL,
  candidate_tweet_id TEXT NOT NULL,
  engagement_score NUMERIC NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  our_tweet_id TEXT,
  slot_mode TEXT,
  -- パターン別成果分析用（将来的に学習）
  buzz_summary TEXT,
  cluster_psych TEXT,
  trap_defence_insight TEXT,
  danger_label TEXT,
  used_mode TEXT,
  -- 後続ポーリングで取得する public_metrics
  our_impressions BIGINT,
  our_likes INT,
  our_retweets INT,
  our_quotes INT,
  our_replies INT,
  metrics_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buzzweave_post_log_posted_at ON buzzweave_post_log(posted_at);
CREATE INDEX IF NOT EXISTS idx_buzzweave_post_log_slot_lang ON buzzweave_post_log(slot_lang);
CREATE INDEX IF NOT EXISTS idx_buzzweave_post_log_cluster_label ON buzzweave_post_log(cluster_label);
CREATE INDEX IF NOT EXISTS idx_buzzweave_post_log_our_tweet_id ON buzzweave_post_log(our_tweet_id) WHERE our_tweet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_buzzweave_post_log_metrics_pending ON buzzweave_post_log(our_tweet_id) WHERE metrics_fetched_at IS NULL AND our_tweet_id IS NOT NULL;

-- 既存テーブルに danger_label, used_mode を追加する場合:
-- ALTER TABLE buzzweave_post_log ADD COLUMN IF NOT EXISTS danger_label TEXT;
-- ALTER TABLE buzzweave_post_log ADD COLUMN IF NOT EXISTS used_mode TEXT;
