-- BuzzWeave Engine: x_posts / td_copy_archive / td_copy_meta スキーマ修復
-- 接続先 Supabase（Vercel cryptotradeacademy が参照する DB）の SQL Editor で実行
-- エラー: Could not find the 'body' column of 'x_posts' in the schema cache

-- ========== 0. テーブル未作成時のフォールバック ==========
CREATE TABLE IF NOT EXISTS x_posts (
  id BIGSERIAL PRIMARY KEY,
  lang TEXT,
  mode TEXT,
  variant TEXT,
  body TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS td_copy_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT,
  lang TEXT,
  mode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS td_copy_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lang TEXT,
  mode TEXT,
  emotion_profile JSONB,
  enemy_profile JSONB,
  length INT,
  intensity INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 1. x_posts（既存テーブルに不足カラムを追加）==========
ALTER TABLE x_posts ADD COLUMN IF NOT EXISTS body TEXT DEFAULT '';
ALTER TABLE x_posts ADD COLUMN IF NOT EXISTS lang TEXT;
ALTER TABLE x_posts ADD COLUMN IF NOT EXISTS mode TEXT;
ALTER TABLE x_posts ADD COLUMN IF NOT EXISTS variant TEXT;
ALTER TABLE x_posts ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE x_posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 既存行の body が NULL なら空文字へ
UPDATE x_posts SET body = '' WHERE body IS NULL;
UPDATE x_posts SET lang = COALESCE(lang, 'en') WHERE lang IS NULL;
UPDATE x_posts SET mode = COALESCE(mode, 'regular') WHERE mode IS NULL;

-- ========== 2. td_copy_archive ==========
ALTER TABLE td_copy_archive ADD COLUMN IF NOT EXISTS text TEXT;
ALTER TABLE td_copy_archive ADD COLUMN IF NOT EXISTS lang TEXT;
ALTER TABLE td_copy_archive ADD COLUMN IF NOT EXISTS mode TEXT;
ALTER TABLE td_copy_archive ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 既存行の NOT NULL 必須カラム補完
UPDATE td_copy_archive SET text = COALESCE(text, '') WHERE text IS NULL;
UPDATE td_copy_archive SET lang = COALESCE(lang, 'en') WHERE lang IS NULL;
UPDATE td_copy_archive SET mode = COALESCE(mode, 'regular') WHERE mode IS NULL;

-- ========== 3. td_copy_meta ==========
ALTER TABLE td_copy_meta ADD COLUMN IF NOT EXISTS lang TEXT;
ALTER TABLE td_copy_meta ADD COLUMN IF NOT EXISTS mode TEXT;
ALTER TABLE td_copy_meta ADD COLUMN IF NOT EXISTS emotion_profile JSONB;
ALTER TABLE td_copy_meta ADD COLUMN IF NOT EXISTS enemy_profile JSONB;
ALTER TABLE td_copy_meta ADD COLUMN IF NOT EXISTS length INT;
ALTER TABLE td_copy_meta ADD COLUMN IF NOT EXISTS intensity INT;
ALTER TABLE td_copy_meta ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ========== 4. btc_snapshots（cron の getLastBtcSnapshot 用）==========
CREATE TABLE IF NOT EXISTS btc_snapshots (
  id BIGSERIAL PRIMARY KEY,
  snapshot_id TEXT NOT NULL UNIQUE,
  as_of_utc TIMESTAMPTZ NOT NULL,
  raw JSONB NOT NULL,
  cq_deep JSONB,
  x_sentiment JSONB,
  high_res_x JSONB,
  gpt_structure_reasoning TEXT,
  gpt_scenario_map TEXT,
  gpt_trap_interpretation TEXT,
  sosovalue_article TEXT,
  dr_grok JSONB,
  trap_detection JSONB,
  trap_alert JSONB,
  divergence_signal JSONB,
  market_score INT,
  trade_signal JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_btc_snapshots_as_of_utc ON btc_snapshots(as_of_utc DESC);
CREATE INDEX IF NOT EXISTS idx_btc_snapshots_created_at ON btc_snapshots(created_at DESC);

-- ========== 5. PostgREST スキーマキャッシュ再読込 ==========
NOTIFY pgrst, 'reload schema';
