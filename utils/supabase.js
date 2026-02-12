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

// ========== TD 拡散エンジン（インフルエンサー・公式・辞書・コピーメタ） ==========

async function insertTdInfluencers(rows) {
  const sb = getSupabase();
  if (!sb || !rows?.length) return { ok: false };
  try {
    const toInsert = rows.map((r) => ({
      handle: String(r.handle || r.username || "").replace(/^@/, ""),
      platform: r.platform || "x",
      lang: r.lang || null,
      category: r.category || "crypto",
      followers: r.followers ?? null,
      notes: r.notes || null
    }));
    const { error } = await sb.from("td_influencers").insert(toInsert);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.warn("[Supabase] insertTdInfluencers error:", e.message);
    return { ok: false };
  }
}

async function getTdInfluencers(lang = null, limit = 100) {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    let q = sb.from("td_influencers").select("id, handle, platform, lang, category, followers");
    if (lang) q = q.eq("lang", lang);
    const { data } = await q.limit(limit);
    return data || [];
  } catch (e) {
    console.warn("[Supabase] getTdInfluencers error:", e.message);
    return [];
  }
}

async function insertTdOfficialAccounts(rows) {
  const sb = getSupabase();
  if (!sb || !rows?.length) return { ok: false };
  try {
    const toInsert = rows.map((r) => ({
      handle: String(r.handle || "").replace(/^@/, ""),
      platform: r.platform || "x",
      org_type: r.org_type || "corporate",
      lang: r.lang || null,
      region: r.region || null,
      priority: r.priority ?? 1
    }));
    const { error } = await sb.from("td_official_accounts").insert(toInsert);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.warn("[Supabase] insertTdOfficialAccounts error:", e.message);
    return { ok: false };
  }
}

async function getTdOfficialAccounts(orgType = null, limit = 100) {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    let q = sb.from("td_official_accounts").select("id, handle, org_type, lang, region, priority");
    if (orgType) q = q.eq("org_type", orgType);
    const { data } = await q.order("priority", { ascending: false }).limit(limit);
    return data || [];
  } catch (e) {
    console.warn("[Supabase] getTdOfficialAccounts error:", e.message);
    return [];
  }
}

async function insertTdEmotionPhrases(rows) {
  const sb = getSupabase();
  if (!sb || !rows?.length) return { ok: false };
  try {
    const toInsert = rows.map((r) => ({
      category: r.category || "general",
      phrase: r.phrase || "",
      lang: r.lang || "ja"
    }));
    const { error } = await sb.from("td_emotion_dictionary").insert(toInsert);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.warn("[Supabase] insertTdEmotionPhrases error:", e.message);
    return { ok: false };
  }
}

async function getTdEmotionDictionary(category = null, lang = null, limit = 20) {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    let q = sb.from("td_emotion_dictionary").select("category, phrase, lang");
    if (category) q = q.eq("category", category);
    if (lang) q = q.eq("lang", lang);
    const { data } = await q.limit(limit);
    return data || [];
  } catch (e) {
    console.warn("[Supabase] getTdEmotionDictionary error:", e.message);
    return [];
  }
}

async function insertTdCopyMeta(row) {
  const sb = getSupabase();
  if (!sb) return { ok: false };
  try {
    const { error } = await sb.from("td_copy_meta").insert({
      lang: row.lang,
      mode: row.mode,
      emotion_profile: row.emotion_profile || null,
      enemy_profile: row.enemy_profile || null,
      length: row.length ?? null,
      intensity: row.intensity ?? null
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.warn("[Supabase] insertTdCopyMeta error:", e.message);
    return { ok: false };
  }
}

async function insertTdCopyArchive(row) {
  const sb = getSupabase();
  if (!sb) return { ok: false };
  try {
    const { error } = await sb.from("td_copy_archive").insert({
      text: row.text,
      lang: row.lang,
      mode: row.mode
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.warn("[Supabase] insertTdCopyArchive error:", e.message);
    return { ok: false };
  }
}

const TD_POST_SLOTS_MIGRATION_HINT =
  "td_post_slots が存在しません。Supabase SQL Editor で docs/supabase-tweet-metrics-schema.sql を実行してテーブルを作成してください。";

async function checkTdPostSlotsExists() {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from("td_post_slots").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * コピー本文からメタ情報を推定（指示書 inferMeta 相当）
 * @param {string} text - コピー本文
 * @param {string} mode - minimal | regular
 * @param {string} lang - 言語コード
 * @returns {Object} { lang, mode, emotion_profile, enemy_profile, length, intensity }
 */
async function insertTdPostSlots(rows) {
  const sb = getSupabase();
  if (!sb || !rows?.length) return { ok: false };
  const exists = await checkTdPostSlotsExists();
  if (!exists) {
    console.error("[Supabase]", TD_POST_SLOTS_MIGRATION_HINT);
    return { ok: false, error: TD_POST_SLOTS_MIGRATION_HINT };
  }
  try {
    const toInsert = rows.map((r) => ({
      datetime_jst: r.datetime_jst,
      lang: r.lang,
      target_type: r.target_type,
      mode: r.mode
    }));
    const { error } = await sb.from("td_post_slots").insert(toInsert);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.warn("[Supabase] insertTdPostSlots error:", e.message);
    return { ok: false };
  }
}

async function getTdPostSlotsInNextHour() {
  const sb = getSupabase();
  if (!sb) return [];
  const exists = await checkTdPostSlotsExists();
  if (!exists) {
    console.warn("[Supabase]", TD_POST_SLOTS_MIGRATION_HINT);
    return [];
  }
  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const { data } = await sb
      .from("td_post_slots")
      .select("id, datetime_jst, lang, target_type, mode")
      .gte("datetime_jst", now.toISOString())
      .lt("datetime_jst", oneHourLater.toISOString())
      .order("datetime_jst", { ascending: true });
    return data || [];
  } catch (e) {
    console.warn("[Supabase] getTdPostSlotsInNextHour error:", e.message);
    return [];
  }
}

async function consumeTdPostSlot(id) {
  const sb = getSupabase();
  if (!sb || !id) return { ok: false };
  try {
    const { error } = await sb.from("td_post_slots").delete().eq("id", id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.warn("[Supabase] consumeTdPostSlot error:", e.message);
    return { ok: false };
  }
}

function inferCopyMeta(text, mode, lang) {
  const t = String(text || "");
  return {
    lang: lang || "ja",
    mode: mode || "minimal",
    emotion_profile: {
      fear: /冷える|tight|fear|凍/i.test(t) ? 0.4 : 0.2,
      anxiety: /ざわ|unease|不安/i.test(t) ? 0.3 : 0.2,
      sadness: /崩れ|ache|崩壊/i.test(t) ? 0.2 : 0.1,
      disappointment: 0.1
    },
    enemy_profile: {
      whale: /クジラ|whale|吸う/i.test(t) ? 1 : 0,
      algo: /アルゴ|algo|罠/i.test(t) ? 1 : 0
    },
    length: t.length,
    intensity: mode === "regular" ? 4 : 2
  };
}

module.exports = {
  getSupabase,
  insertTweetQueue,
  fetchUnprocessedQueue,
  markQueueProcessed,
  insertTweetMetrics,
  getQuotedTweetIdsInLast30Days,
  insertQuotedTweets,
  insertXPost,
  insertTdInfluencers,
  getTdInfluencers,
  insertTdOfficialAccounts,
  getTdOfficialAccounts,
  insertTdEmotionPhrases,
  getTdEmotionDictionary,
  insertTdCopyMeta,
  insertTdCopyArchive,
  inferCopyMeta,
  insertTdPostSlots,
  getTdPostSlotsInNextHour,
  consumeTdPostSlot
};
