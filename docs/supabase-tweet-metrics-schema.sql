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

-- 3. quoted_tweets: 引用リポスト永続重複除外用
CREATE TABLE IF NOT EXISTS quoted_tweets (
  tweet_id TEXT PRIMARY KEY,
  lang TEXT,
  quoted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quoted_tweets_quoted_at ON quoted_tweets(quoted_at);

-- 4. x_posts: X投稿生成ログ（統合実装）
CREATE TABLE IF NOT EXISTS x_posts (
  id BIGSERIAL PRIMARY KEY,
  lang TEXT NOT NULL,
  mode TEXT NOT NULL,
  variant TEXT,
  body TEXT NOT NULL,
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_x_posts_created_at ON x_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_x_posts_lang ON x_posts(lang);
