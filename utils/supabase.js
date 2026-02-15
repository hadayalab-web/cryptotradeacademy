/**
 * Supabase クライアント（Trap Defence OS 実測パイプライン用）
 * 環境変数: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
const { loadEnv } = require("./loadEnv");
const { createClient } = require("@supabase/supabase-js");
loadEnv();

let _client = null;

function getSupabase() {
  if (_client) return _client;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  // 接続先のズレ対策: SUPABASE_PROJECT_REF が設定されていれば URL を強制
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  if (projectRef && projectRef.trim()) {
    url = `https://${projectRef.trim()}.supabase.co`;
  }
  if (!url || !key) return null;
  const host = (url.match(/https:\/\/([^/]+)/) || [])[1] || "unknown";
  console.log("[Supabase] connecting to", host);
  _client = createClient(url, key);
  return _client;
}

function isSupabaseConfigured() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const url = projectRef && projectRef.trim()
    ? `https://${projectRef.trim()}.supabase.co`
    : (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);
  return !!(url && key);
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
 * 失敗時は 1 回だけログして return。再試行・throw なし（暴走防止）。
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
      body: row.body != null ? String(row.body) : "",
      video_url: row.video_url || null
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.error("[Supabase] insertXPost failed (once, no retry):", e.message);
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
    const toInsert = rows.map((r) => {
      const row = {
        datetime_jst: r.datetime_jst,
        lang: r.lang,
        target_type: r.target_type ?? "flexible",
        mode: r.mode ?? "regular"
      };
      if (r.cluster_id != null) row.cluster_id = r.cluster_id;
      if (r.narrative_tag != null) row.narrative_tag = r.narrative_tag;
      if (r.cta_type != null) row.cta_type = r.cta_type;
      return row;
    });
    const { error } = await sb.from("td_post_slots").insert(toInsert);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.warn("[Supabase] insertTdPostSlots error:", e.message);
    return { ok: false };
  }
}

async function getTdPostSlotsInNextHour(langFilter = null) {
  const sb = getSupabase();
  if (!sb) {
    console.warn("[BuzzWeave] getTdPostSlotsInNextHour: no Supabase client");
    return [];
  }
  const exists = await checkTdPostSlotsExists();
  if (!exists) {
    console.warn("[BuzzWeave] getTdPostSlotsInNextHour: td_post_slots table missing or inaccessible");
    return [];
  }
  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    let q = sb
      .from("td_post_slots")
      .select("id, datetime_jst, lang, target_type, mode, cluster_id, narrative_tag, cta_type")
      .gte("datetime_jst", now.toISOString())
      .lt("datetime_jst", oneHourLater.toISOString())
      .order("datetime_jst", { ascending: true });
    if (langFilter) q = q.eq("lang", langFilter);
    const { data } = await q;
    const list = data || [];
    if (list.length === 0) {
      console.log("[BuzzWeave] getTdPostSlotsInNextHour: 0 slots in next hour", { langFilter: langFilter || "(any)" });
    }
    return list;
  } catch (e) {
    console.warn("[BuzzWeave] getTdPostSlotsInNextHour error:", e?.message);
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

/**
 * slot消費失敗時の補償処理: スロットを将来時刻へ退避
 * @param {string} id
 * @param {number} deferMinutes
 */
async function deferTdPostSlot(id, deferMinutes = 180) {
  const sb = getSupabase();
  if (!sb || !id) return { ok: false };
  try {
    const dt = new Date(Date.now() + Math.max(1, deferMinutes) * 60 * 1000).toISOString();
    const { error } = await sb.from("td_post_slots").update({ datetime_jst: dt }).eq("id", id);
    if (error) throw error;
    return { ok: true, deferred_to: dt };
  } catch (e) {
    console.warn("[Supabase] deferTdPostSlot error:", e.message);
    return { ok: false };
  }
}

/**
 * 古いスロットを削除
 * @param {number} olderThanHours - 何時間より古いスロットを削除するか
 */
async function cleanupOldTdPostSlots(olderThanHours = 48) {
  const sb = getSupabase();
  if (!sb) return { ok: false, deleted: 0 };
  try {
    const cutoff = new Date(Date.now() - Math.max(1, olderThanHours) * 60 * 60 * 1000).toISOString();
    const { data, error } = await sb
      .from("td_post_slots")
      .delete()
      .lt("datetime_jst", cutoff)
      .select("id");
    if (error) throw error;
    return { ok: true, deleted: Array.isArray(data) ? data.length : 0 };
  } catch (e) {
    console.warn("[Supabase] cleanupOldTdPostSlots error:", e.message);
    return { ok: false, deleted: 0 };
  }
}

/**
 * Health check用の簡易集計
 */
async function getTdPostSlotsHealthStats() {
  const sb = getSupabase();
  if (!sb) return { ok: false };
  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    const nowIso = now.toISOString();
    const [nextHour, total] = await Promise.all([
      sb
        .from("td_post_slots")
        .select("id", { count: "exact", head: true })
        .gte("datetime_jst", nowIso)
        .lt("datetime_jst", oneHourLater),
      sb.from("td_post_slots").select("id", { count: "exact", head: true })
    ]);
    return {
      ok: true,
      total_slots: total.count ?? 0,
      next_hour_slots: nextHour.count ?? 0
    };
  } catch (e) {
    console.warn("[Supabase] getTdPostSlotsHealthStats error:", e.message);
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

// ========== BuzzWeave cron ロック（多重実行防止 + TTL） ==========
// TTL 60秒: 例外で finally が動かなくても時間経過でロックが自動解除される

const BUZZWEAVE_LOCK_NAME = "buzzweave_main";
const LOCK_TTL_SECONDS = Number(process.env.BUZZWEAVE_LOCK_TTL_SECONDS) || 60;

function isMissingLockedColumnError(error) {
  const code = String(error?.code || "");
  const msg = String(error?.message || "");
  return code === "42703" && /buzzweave_locks\.locked|column\s+.*locked.*does not exist/i.test(msg);
}

function isMissingColumnError42703(error) {
  return String(error?.code || "") === "42703" && /buzzweave_locks|column\s+.*does not exist/i.test(String(error?.message || ""));
}

async function acquireBuzzweaveLockLegacy(sb, lockName, cutoff, now) {
  // 旧スキーマ互換: locked カラムが無い場合は updated_at の TTL のみで排他する
  const { data, error } = await sb
    .from("buzzweave_locks")
    .update({ updated_at: now })
    .eq("lock_name", lockName)
    .or(`updated_at.is.null,updated_at.lt."${cutoff}"`)
    .select("lock_name")
    .maybeSingle();
  if (error) {
    if (isMissingColumnError42703(error)) {
      // 最小スキーマ時: 常に拒否（暴走防止）。スキーマ修復は docs/supabase-buzzweave-locks.sql 参照
      console.warn("[buzzweave-run] acquireBuzzweaveLock: buzzweave_locks has minimal schema (locked column missing), refusing run. Run migration: docs/supabase-buzzweave-locks.sql");
      return false;
    }
    console.warn("[buzzweave-run] acquireBuzzweaveLock legacy update error:", error.message, error.code);
    return false;
  }
  if (data) return true;

  // 行が無い初回だけ insert を試す（既存なら 23505 で false）
  const { data: inserted, error: insertError } = await sb
    .from("buzzweave_locks")
    .insert({ lock_name: lockName, updated_at: now })
    .select("lock_name")
    .maybeSingle();
  if (insertError) {
    if (isMissingColumnError42703(insertError)) {
      console.warn("[buzzweave-run] acquireBuzzweaveLock: buzzweave_locks has minimal schema (insert path), refusing run. Run migration: docs/supabase-buzzweave-locks.sql");
      return false;
    }
    if (String(insertError.code) !== "23505") {
      console.warn("[buzzweave-run] acquireBuzzweaveLock legacy insert error:", insertError.message, insertError.code);
    }
    return false;
  }
  return !!inserted;
}

async function acquireBuzzweaveLock(lockName = BUZZWEAVE_LOCK_NAME) {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const cutoff = new Date(Date.now() - LOCK_TTL_SECONDS * 1000).toISOString();
    const now = new Date().toISOString();
    // 条件: lock_name 一致 かつ (locked=false または updated_at が TTL より古い)
    // PostgREST: timestamp に : が含まれるため .or() 内はダブルクォートで囲む
    const { data, error } = await sb
      .from("buzzweave_locks")
      .update({ locked: true, updated_at: now })
      .eq("lock_name", lockName)
      .or(`locked.eq.false,updated_at.lt."${cutoff}"`)
      .select("lock_name")
      .maybeSingle();
    if (error) {
      if (isMissingLockedColumnError(error)) {
        console.warn("[buzzweave-run] acquireBuzzweaveLock: locked column missing, fallback to legacy TTL lock");
        return await acquireBuzzweaveLockLegacy(sb, lockName, cutoff, now);
      }
      console.warn("[buzzweave-run] acquireBuzzweaveLock error:", error.message, error.code);
      return false;
    }
    if (!data) {
      console.warn("[buzzweave-run] acquireBuzzweaveLock: no row updated (filter matched 0 rows)", { cutoff, now });
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[buzzweave-run] acquireBuzzweaveLock exception:", e?.message);
    return false;
  }
}

async function releaseBuzzweaveLock(lockName = BUZZWEAVE_LOCK_NAME) {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { error } = await sb
      .from("buzzweave_locks")
      .update({ locked: false, updated_at: new Date().toISOString() })
      .eq("lock_name", lockName);
    if (error && isMissingLockedColumnError(error)) {
      // 旧スキーマ互換: updated_at を古い値にして即時アンロック扱いにする
      await sb
        .from("buzzweave_locks")
        .update({ updated_at: new Date(0).toISOString() })
        .eq("lock_name", lockName);
    }
  } catch (_) {}
}

/** ロック状態を読み取り（診断用）。Supabase 接続確認にも使う */
async function getBuzzweaveLockState(lockName = BUZZWEAVE_LOCK_NAME) {
  const sb = getSupabase();
  if (!sb) return { ok: false, reason: "supabase_not_configured" };
  try {
    const { data, error } = await sb
      .from("buzzweave_locks")
      .select("lock_name, locked, updated_at")
      .eq("lock_name", lockName)
      .maybeSingle();
    if (error) {
      if (!isMissingLockedColumnError(error)) {
        return { ok: false, reason: "supabase_error", error: error.message };
      }
      // 旧スキーマ互換: updated_at の鮮度から lock 状態を近似
      const { data: legacyData, error: legacyError } = await sb
        .from("buzzweave_locks")
        .select("lock_name, updated_at")
        .eq("lock_name", lockName)
        .maybeSingle();
      if (legacyError) return { ok: false, reason: "supabase_error", error: legacyError.message };
      const updatedAt = legacyData?.updated_at || null;
      const ageMs = updatedAt ? Date.now() - new Date(updatedAt).getTime() : Number.POSITIVE_INFINITY;
      return {
        ok: true,
        lock_name: legacyData?.lock_name ?? lockName,
        locked: ageMs <= LOCK_TTL_SECONDS * 1000,
        updated_at: updatedAt,
        legacy_mode: true
      };
    }
    return {
      ok: true,
      lock_name: data?.lock_name ?? lockName,
      locked: !!data?.locked,
      updated_at: data?.updated_at ?? null
    };
  } catch (e) {
    return { ok: false, reason: "supabase_error", error: e?.message };
  }
}

// ========== BuzzWeave ステータス（緊急停止・402ブロック） ==========

async function upsertBuzzweaveStatusEmergencyStop(reason = "env_flag") {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const now = new Date().toISOString();
    await sb
      .from("buzzweave_status")
      .upsert(
        { id: "main", last_emergency_stop_at: now, emergency_stop_reason: reason, updated_at: now },
        { onConflict: "id" }
      );
  } catch (_) {}
}

async function upsertBuzzweaveStatus402() {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const now = new Date().toISOString();
    await sb
      .from("buzzweave_status")
      .upsert(
        { id: "main", x_api_blocked: true, x_api_last_402_at: now, updated_at: now },
        { onConflict: "id" }
      );
  } catch (_) {}
}

async function getBuzzweaveStatus() {
  const sb = getSupabase();
  if (!sb) return { x_api_blocked: false };
  try {
    const { data } = await sb
      .from("buzzweave_status")
      .select("x_api_blocked")
      .eq("id", "main")
      .maybeSingle();
    return { x_api_blocked: !!data?.x_api_blocked };
  } catch (e) {
    return { x_api_blocked: false };
  }
}

/**
 * X API blocked フラグを手動解除する（Token 修正後などに使用）
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function clearBuzzweaveStatusXApiBlocked() {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };
  try {
    const now = new Date().toISOString();
    const { error } = await sb
      .from("buzzweave_status")
      .upsert(
        { id: "main", x_api_blocked: false, updated_at: now },
        { onConflict: "id" }
      );
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

// ========== BuzzWeave 集中投下ログ（市場回収用） ==========

/**
 * 集中投下結果を buzzweave_post_log に保存
 * @param {Object} row - { slotLang, clusterLabel, clusterScore, candidateTweetId, engagementScore, postedAt?, ourTweetId?, slotMode?, buzzSummary?, clusterPsych?, trapDefenceInsight?, dangerLabel?, usedMode? }
 * @returns {Promise<{ok: boolean, data?: Object, error?: string}>}
 */
async function insertBuzzweavePostLog(row) {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };
  try {
    const { data, error } = await sb
      .from("buzzweave_post_log")
      .insert({
        slot_lang: row.slotLang || row.slot_lang,
        cluster_label: row.clusterLabel || row.cluster_label,
        cluster_score: Number(row.clusterScore ?? row.cluster_score ?? 0),
        candidate_tweet_id: String(row.candidateTweetId || row.candidate_tweet_id || ""),
        engagement_score: Number(row.engagementScore ?? row.engagement_score ?? 0),
        posted_at: row.postedAt || row.posted_at || new Date().toISOString(),
        our_tweet_id: row.ourTweetId || row.our_tweet_id || null,
        slot_mode: row.slotMode || row.slot_mode || null,
        buzz_summary: row.buzzSummary || row.buzz_summary || null,
        cluster_psych: row.clusterPsych || row.cluster_psych || null,
        trap_defence_insight: row.trapDefenceInsight || row.trap_defence_insight || null,
        danger_label: row.dangerLabel || row.danger_label || "neutral",
        used_mode: row.usedMode || row.used_mode || "neutral_insight",
        funnel_type: row.funnelType ?? row.funnel_type ?? null,
        funnel_url: row.funnelUrl ?? row.funnel_url ?? null,
        narrative_tag: row.narrativeTag ?? row.narrative_tag ?? null,
        cta_type: row.ctaType ?? row.cta_type ?? null,
        our_clicks: row.ourClicks ?? row.our_clicks ?? null,
        our_subs: row.ourSubs ?? row.our_subs ?? null
      })
      .select("id, our_tweet_id")
      .single();
    if (error) throw error;
    return { ok: true, data };
  } catch (e) {
    console.warn("[Supabase] insertBuzzweavePostLog error:", e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * our_tweet_id で public_metrics を紐づけて更新（ポーリング/別ジョブ用）
 * @param {string} ourTweetId - 自分が投稿した引用リポストの tweet_id
 * @param {Object} metrics - { impressions, likes, retweets, quotes, replies }
 * @returns {Promise<{ok: boolean, rowsUpdated?: number}>}
 */
async function updateBuzzweavePostLogWithMetrics(ourTweetId, metrics) {
  const sb = getSupabase();
  if (!sb || !ourTweetId) return { ok: false };
  try {
    const { data, error } = await sb
      .from("buzzweave_post_log")
      .update({
        our_impressions: metrics.impressions ?? null,
        our_likes: metrics.likes ?? null,
        our_retweets: metrics.retweets ?? null,
        our_quotes: metrics.quotes ?? null,
        our_replies: metrics.replies ?? null,
        our_clicks: metrics.clicks ?? metrics.link_clicks ?? null,
        our_subs: metrics.subs ?? null,
        metrics_fetched_at: new Date().toISOString()
      })
      .eq("our_tweet_id", String(ourTweetId))
      .select("id");
    if (error) throw error;
    return { ok: true, rowsUpdated: (data || []).length };
  } catch (e) {
    console.warn("[Supabase] updateBuzzweavePostLogWithMetrics error:", e.message);
    return { ok: false };
  }
}

/**
 * public_metrics 未取得のログを取得（ポーリング/別ジョブ用）
 * @param {number} limit - 取得件数
 * @param {number} minAgeMinutes - 投稿後これ以上経過したもののみ（X API 反映待ち）
 * @returns {Promise<{ok: boolean, rows: Array}>}
 */
async function fetchBuzzweavePostLogsPendingMetrics(limit = 50, minAgeMinutes = 5) {
  const sb = getSupabase();
  if (!sb) return { ok: false, rows: [] };
  try {
    const minPosted = new Date(Date.now() - minAgeMinutes * 60 * 1000).toISOString();
    const { data, error } = await sb
      .from("buzzweave_post_log")
      .select("id, our_tweet_id, slot_lang, cluster_label, engagement_score")
      .not("our_tweet_id", "is", null)
      .is("metrics_fetched_at", null)
      .lt("posted_at", minPosted)
      .order("posted_at", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return { ok: true, rows: data || [] };
  } catch (e) {
    console.warn("[Supabase] fetchBuzzweavePostLogsPendingMetrics error:", e.message);
    return { ok: false, rows: [] };
  }
}

// ========== CHAIN_RAID KPI（v4.2+） ==========

/**
 * CHAIN_RAID 投稿時に chain_raid_post_kpi に 1 行挿入
 * @param {Object} row - { postId, quotedTweetId, lang, burstFactor, fusionScore, cqSnapshotTs, clusterId?, mediaType?, fusionScoreBin?, postTiming? }
 */
async function insertChainRaidPostKpi(row) {
  const sb = getSupabase();
  if (!sb || !row?.postId) return { ok: false };
  try {
    const payload = {
      post_id: String(row.postId),
      quoted_tweet_id: String(row.quotedTweetId || ""),
      lang: row.lang || "en",
      psychology_tag: "CHAIN_RAID",
      burst_factor: row.burstFactor ?? null,
      fusion_score: row.fusionScore ?? null,
      cq_snapshot_ts: row.cqSnapshotTs ?? null,
      cluster_id: row.clusterId ?? null,
      botnet_cluster_id: row.botnetClusterId ?? null,
      botnet_density: row.botnetDensity ?? null,
      botnet_coherence: row.botnetCoherence ?? null,
      media_type: row.mediaType ?? null,
      fusion_score_bin: row.fusionScoreBin ?? null,
      post_timing: row.postTiming ?? null,
      narrative_tag: row.narrativeTag ?? null,
      asset_class: row.assetClass ?? null
    };
    const { error } = await sb.from("chain_raid_post_kpi").upsert(payload, { onConflict: "post_id" });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.warn("[Supabase] insertChainRaidPostKpi error:", e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * 金クラスタ一覧取得（v4.3: corr_botnet_ctr > 0.7, avg_ctr > 0.08, cluster_size >= 20）
 */
async function getGoldClusters(thresholds = {}) {
  const sb = getSupabase();
  if (!sb) return [];
  const { corrMin = 0.7, ctrMin = 0.08, sizeMin = 20 } = thresholds;
  try {
    const { data, error } = await sb
      .from("mv_cluster_ctr_stats")
      .select("cluster_id, lang, avg_ctr, corr_botnet_ctr, cluster_size")
      .gte("corr_botnet_ctr", corrMin)
      .gte("avg_ctr", ctrMin)
      .gte("cluster_size", sizeMin);
    if (error) throw error;
    return data || [];
  } catch (e) {
    try {
      const { data } = await sb.from("view_cluster_ctr_stats").select("cluster_id, lang, avg_ctr, corr_botnet_ctr, cluster_size");
      return (data || []).filter(
        (r) =>
          (r.corr_botnet_ctr ?? 0) >= corrMin &&
          (r.avg_ctr ?? 0) >= ctrMin &&
          (r.cluster_size ?? 0) >= sizeMin
      );
    } catch (_) {
      return [];
    }
  }
}

/**
 * chain_raid_post_kpi のメトリクスを更新（X API / Vidalytics ポーリング用）
 */
async function updateChainRaidPostKpiWithMetrics(postId, metrics) {
  const sb = getSupabase();
  if (!sb || !postId) return { ok: false };
  try {
    const update = {
      metrics_updated_at: new Date().toISOString()
    };
    if (metrics.impressions != null) update.impressions = metrics.impressions;
    if (metrics.link_clicks != null) update.link_clicks = metrics.link_clicks;
    if (metrics.replies != null) update.replies = metrics.replies;
    if (metrics.reposts != null) update.reposts = metrics.reposts;
    if (metrics.bookmarks != null) update.bookmarks = metrics.bookmarks;
    if (metrics.poll_yes != null) update.poll_yes = metrics.poll_yes;
    if (metrics.poll_no != null) update.poll_no = metrics.poll_no;
    if (metrics.demo_views != null) update.demo_views = metrics.demo_views;
    if (metrics.tg_joins != null) update.tg_joins = metrics.tg_joins;
    if (metrics.subs != null) update.subs = metrics.subs;
    const { error } = await sb.from("chain_raid_post_kpi").update(update).eq("post_id", String(postId));
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.warn("[Supabase] updateChainRaidPostKpiWithMetrics error:", e.message);
    return { ok: false };
  }
}

/**
 * btcSnapshot を btc_snapshots に保存（Unified OS: 必須履歴）
 * @param {Object} row - snapshotToDbRow(snapshot) の戻り値
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function insertBtcSnapshot(row) {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };
  try {
    const { error } = await sb.from("btc_snapshots").upsert(row, {
      onConflict: "snapshot_id",
      ignoreDuplicates: false
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.warn("[Supabase] insertBtcSnapshot error:", e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * Phase 4: 直近 N 件の btcSnapshot 履歴を取得（Dashboard 用）
 * @param {number} [limit=50] - 取得件数
 * @returns {Promise<Object[]>} btcSnapshot 形式の配列
 */
async function getBtcSnapshotsHistory(limit = 50) {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from("btc_snapshots")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 200));
    if (error) throw error;
    return (data || []).map((row) => ({
      ...dbRowToBtcSnapshot(row),
      created_at: row.created_at
    }));
  } catch (e) {
    console.warn("[Supabase] getBtcSnapshotsHistory error:", e.message);
    return [];
  }
}

/**
 * 直近の btcSnapshot を btc_snapshots から取得（evaluateDeliveryMode 用）
 * @returns {Promise<Object|null>} btcSnapshot 形式、または null
 */
async function getLastBtcSnapshot() {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from("btc_snapshots")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return dbRowToBtcSnapshot(data);
  } catch (e) {
    console.warn("[Supabase] getLastBtcSnapshot error:", e.message);
    return null;
  }
}

function dbRowToBtcSnapshot(row) {
  if (!row) return null;
  return {
    snapshot_id: row.snapshot_id,
    as_of_utc: row.as_of_utc,
    raw: row.raw || {},
    cqDeep: row.cq_deep || null,
    xSentiment: row.x_sentiment || null,
    highResX: row.high_res_x || null,
    gptStructureReasoning: row.gpt_structure_reasoning ?? null,
    gptScenarioMap: row.gpt_scenario_map ?? null,
    gptTrapInterpretation: row.gpt_trap_interpretation ?? null,
    sosovalueArticle: row.sosovalue_article ?? null,
    drGrok: row.dr_grok ?? null,
    trapDetection: row.trap_detection || null,
    trapAlert: row.trap_alert || null,
    divergenceSignal: row.divergence_signal || null,
    market_score: row.market_score ?? 0,
    tradeSignal: row.trade_signal || null,
    meta: row.meta ?? null,
    marketRegime: row.market_regime ?? null,
    diff: row.diff ?? null
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
  consumeTdPostSlot,
  deferTdPostSlot,
  cleanupOldTdPostSlots,
  getTdPostSlotsHealthStats,
  acquireBuzzweaveLock,
  releaseBuzzweaveLock,
  upsertBuzzweaveStatusEmergencyStop,
  upsertBuzzweaveStatus402,
  getBuzzweaveStatus,
  clearBuzzweaveStatusXApiBlocked,
  insertBuzzweavePostLog,
  updateBuzzweavePostLogWithMetrics,
  fetchBuzzweavePostLogsPendingMetrics,
  insertChainRaidPostKpi,
  updateChainRaidPostKpiWithMetrics,
  getGoldClusters,
  insertBtcSnapshot,
  getLastBtcSnapshot,
  getBtcSnapshotsHistory,
  isSupabaseConfigured,
  getBuzzweaveLockState
};
