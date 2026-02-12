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

-- 5. td_influencers: インフルエンサー300件（KV→Supabase移設）
CREATE TABLE IF NOT EXISTS td_influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'x',
  lang TEXT,
  category TEXT,
  followers INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_td_influencers_lang ON td_influencers(lang);
CREATE INDEX IF NOT EXISTS idx_td_influencers_handle ON td_influencers(handle);

-- 6. td_official_accounts: 公式アカウント88件
CREATE TABLE IF NOT EXISTS td_official_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'x',
  org_type TEXT NOT NULL,
  lang TEXT,
  region TEXT,
  priority INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_td_official_org_type ON td_official_accounts(org_type);

-- 7. td_emotion_dictionary: 感情辞書
CREATE TABLE IF NOT EXISTS td_emotion_dictionary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  phrase TEXT NOT NULL,
  lang TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_td_emotion_category_lang ON td_emotion_dictionary(category, lang);

-- 8. td_copy_meta: コピー生成メタ情報
CREATE TABLE IF NOT EXISTS td_copy_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lang TEXT NOT NULL,
  mode TEXT NOT NULL,
  emotion_profile JSONB,
  enemy_profile JSONB,
  length INT,
  intensity INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. td_copy_archive: コピーアーカイブ
CREATE TABLE IF NOT EXISTS td_copy_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  lang TEXT NOT NULL,
  mode TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. td_post_slots: 投稿スロット（600枠/日・TD BuzzWeave Engine）
CREATE TABLE IF NOT EXISTS td_post_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datetime_jst TIMESTAMPTZ NOT NULL,
  lang TEXT NOT NULL,
  target_type TEXT NOT NULL,
  mode TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_td_post_slots_datetime ON td_post_slots(datetime_jst);

-- 10b. buzzweave_locks: cron 多重実行防止（TTL 10分）
CREATE TABLE IF NOT EXISTS buzzweave_locks (
  lock_name TEXT PRIMARY KEY,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO buzzweave_locks (lock_name, locked) VALUES ('buzzweave_main', FALSE)
ON CONFLICT (lock_name) DO NOTHING;

-- 10c. buzzweave_status: 緊急停止・402ブロック状態管理
CREATE TABLE IF NOT EXISTS buzzweave_status (
  id TEXT PRIMARY KEY DEFAULT 'main',
  last_emergency_stop_at TIMESTAMPTZ,
  emergency_stop_reason TEXT,
  x_api_blocked BOOLEAN DEFAULT FALSE,
  x_api_last_402_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO buzzweave_status (id) VALUES ('main')
ON CONFLICT (id) DO NOTHING;

-- 11. buzzweave_post_log: 集中投下結果回収ログ（市場から回収・学習用）
CREATE TABLE IF NOT EXISTS buzzweave_post_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_lang TEXT NOT NULL,
  cluster_label TEXT NOT NULL,
  cluster_score NUMERIC NOT NULL,
  candidate_tweet_id TEXT NOT NULL,
  engagement_score NUMERIC NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  our_tweet_id TEXT,
  slot_mode TEXT,
  buzz_summary TEXT,
  cluster_psych TEXT,
  trap_defence_insight TEXT,
  danger_label TEXT,
  used_mode TEXT,
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
