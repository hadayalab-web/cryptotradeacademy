/**
 * Supabase クライアント（Trap Defence OS 実測パイプライン用）
 * 環境変数: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
const { createClient } = require("@supabase/supabase-js");

let _client = null;

function getSupabase() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key);
  return _client;
}

/**
 * tweet_queue に insert
 * @param {Object} row - { tweet_id, lang?, vid_link_kind? }
 */
async function insertTweetQueue(row) {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };
  try {
    const { data, error } = await sb
      .from("tweet_queue")
      .upsert(
        {
          tweet_id: String(row.tweet_id),
          lang: row.lang || null,
          vid_link_kind: row.vid_link_kind || null
        },
        { onConflict: "tweet_id", ignoreDuplicates: true }
      )
      .select();
    if (error) throw error;
    return { ok: true, data };
  } catch (e) {
    console.warn("[Supabase] insertTweetQueue error:", e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * 未処理の tweet_queue を取得
 */
async function fetchUnprocessedQueue(limit = 50) {
  const sb = getSupabase();
  if (!sb) return { ok: false, rows: [] };
  try {
    const { data, error } = await sb
      .from("tweet_queue")
      .select("id, tweet_id, lang, vid_link_kind")
      .eq("processed", false)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return { ok: true, rows: data || [] };
  } catch (e) {
    console.warn("[Supabase] fetchUnprocessedQueue error:", e.message);
    return { ok: false, rows: [] };
  }
}

/**
 * queue を processed にマーク
 */
async function markQueueProcessed(id) {
  const sb = getSupabase();
  if (!sb) return { ok: false };
  try {
    await sb
      .from("tweet_queue")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("id", id);
    return { ok: true };
  } catch (e) {
    console.warn("[Supabase] markQueueProcessed error:", e.message);
    return { ok: false };
  }
}

/**
 * tweet_metrics に insert
 */
async function insertTweetMetrics(row) {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };
  try {
    const { data, error } = await sb
      .from("tweet_metrics")
      .upsert(
        {
          tweet_id: String(row.tweet_id),
          lang: row.lang || null,
          created_at: row.created_at || null,
          impressions: row.impressions ?? null,
          likes: row.likes ?? null,
          retweets: row.retweets ?? null,
          quotes: row.quotes ?? null,
          replies: row.replies ?? null,
          vid_link_kind: row.vid_link_kind || null,
          vid_clicks: row.vid_clicks ?? null,
          vid_unique: row.vid_unique ?? null,
          vid_watch_time: row.vid_watch_time ?? null,
          vid_completion: row.vid_completion ?? null
        },
        { onConflict: "tweet_id" }
      )
      .select();
    if (error) throw error;
    return { ok: true, data };
  } catch (e) {
    console.warn("[Supabase] insertTweetMetrics error:", e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * 過去30日以内に引用済みの tweet_id 一覧を取得
 * @param {string[]} tweetIds - チェック対象の tweet_id 配列
 * @returns {Promise<Set<string>>} 除外すべき tweet_id の Set
 */
async function getQuotedTweetIdsInLast30Days(tweetIds) {
  const sb = getSupabase();
  if (!sb || !tweetIds || tweetIds.length === 0) return new Set();
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await sb
      .from("quoted_tweets")
      .select("tweet_id")
      .in("tweet_id", tweetIds.map(String))
      .gte("quoted_at", thirtyDaysAgo);
    if (error) throw error;
    return new Set((data || []).map((r) => String(r.tweet_id)));
  } catch (e) {
    console.warn("[Supabase] getQuotedTweetIdsInLast30Days error:", e.message);
    return new Set();
  }
}

/**
 * 引用リポスト後に quoted_tweets に insert（upsert）
 * @param {Array<{tweet_id: string, lang: string}>} rows
 */
async function insertQuotedTweets(rows) {
  const sb = getSupabase();
  if (!sb || !rows || rows.length === 0) return { ok: false };
  try {
    const now = new Date().toISOString();
    const toInsert = rows.map((r) => ({
      tweet_id: String(r.tweet_id),
      lang: r.lang || null,
      quoted_at: now
    }));
    const { error } = await sb.from("quoted_tweets").upsert(toInsert, { onConflict: "tweet_id" });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.warn("[Supabase] insertQuotedTweets error:", e.message);
    return { ok: false };
  }
}

/**
 * x_posts に insert（X投稿生成ログ）
 * @param {Object} row - { lang, mode, variant?, body, video_url? }
 */
async function insertXPost(row) {
  const sb = getSupabase();
  if (!sb) return { ok: false };
  try {
    const { error } = await sb.from("x_posts").insert({
      lang: row.lang || null,
      mode: row.mode || null,
      variant: row.variant || null,
      body: row.body || "",
      video_url: row.video_url || null
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.warn("[Supabase] insertXPost error:", e.message);
    return { ok: false };
  }
}

module.exports = {
  getSupabase,
  insertTweetQueue,
  fetchUnprocessedQueue,
  markQueueProcessed,
  insertTweetMetrics,
  getQuotedTweetIdsInLast30Days,
  insertQuotedTweets,
  insertXPost
};
