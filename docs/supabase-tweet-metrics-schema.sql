-- Trap Defence OS: 実測データ収集パイプライン
-- Supabase SQL Editor で実行してください

-- 1. tweet_queue: Webhook が投入するキュー
CREATE TABLE IF NOT EXISTS tweet_queue (
  id BIGSERIAL PRIMARY KEY,
  tweet_id TEXT NOT NULL UNIQUE,
  lang TEXT,
  vid_link_kind TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tweet_queue_processed ON tweet_queue(processed) WHERE processed = FALSE;

-- 2. tweet_metrics: 実測データ保存
CREATE TABLE IF NOT EXISTS tweet_metrics (
  id BIGSERIAL PRIMARY KEY,
  tweet_id TEXT NOT NULL UNIQUE,
  lang TEXT,
  created_at TIMESTAMPTZ,
  impressions BIGINT,
  likes INT,
  retweets INT,
  quotes INT,
  replies INT,
  vid_link_kind TEXT,
  vid_clicks INT,
  vid_unique INT,
  vid_watch_time NUMERIC,
  vid_completion NUMERIC,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tweet_metrics_tweet_id ON tweet_metrics(tweet_id);
CREATE INDEX IF NOT EXISTS idx_tweet_metrics_created_at ON tweet_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_tweet_metrics_lang ON tweet_metrics(lang);
