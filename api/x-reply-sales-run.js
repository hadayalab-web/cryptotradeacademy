/**
 * X リプライ直販ランナー
 * - list: 6言語で候補取得しキュー更新
 * - send: 6言語グロスFIFOでリプライ送信
 */
require("../utils/suppressKnownWarnings");

const { kv } = require("../utils/kv");
const { fetchOnePageByMode } = require("../services/td/xReplySalesSearch");
const { sendSalesReply } = require("../services/x/replySalesClient");
const { sendRecruitDm } = require("../services/x/dmClient");
const { followUser, likeTweet, getMe } = require("../services/x/client");
const {
  buildReplyMessage,
  detectReplyPostType,
  getDmClosing,
  getDmQueryHook,
  normalizeReplyLang,
  REPLY_POST_TYPE_PRIORITY
} = require("../config/xReplySalesStrategy");
const {
  X_REPLY_SALES_LANGS,
  X_REPLY_SALES_REGION_LANGS,
  X_REPLY_LIST_PAGES,
  X_REPLY_SEARCH_REQUESTS_PER_RUN,
  X_REPLY_QUEUE_CAP_PER_LANG,
  X_REPLY_SEARCH_WINDOW_MINUTES,
  X_REPLY_SEARCH_DELAY_MS,
  X_REPLY_RETAIN_PREVIOUS_QUEUE,
  X_REPLY_QUEUE_VERSION,
  X_REPLY_ATTEMPT_CAP_PER_15MIN,
  X_REPLY_MAX_ATTEMPTS_PER_RUN,
  X_REPLY_SEND_DELAY_MS,
  X_REPLY_SEND_RUN_HARD_STOP_MS,
  X_REPLY_ATTEMPT_WINDOW_TTL_SECONDS,
  X_REPLY_SLOT_LOCK_TTL_SECONDS,
  X_REPLY_EVENT_TTL_SECONDS,
  X_REPLY_EVENT_LIST_MAX,
  X_REPLY_PROMO_CODE,
  X_REPLY_FOLLOW_BEFORE_SEND,
  X_REPLY_FOLLOW_CAP_PER_DAY,
  X_REPLY_FOLLOW_DELAY_MS,
  X_REPLY_SKIP_REPLY_ATTEMPT,
  X_REPLY_LIKE_BEFORE_DM
} = require("../config/xReplySalesConfig");
const { getMinimalVersionCheckoutUrl, getWhopProductUrl } = require("../services/telegram/whop-links");

const KV_KEY_QUEUE = (lang) => `x_reply_sales:queue:${lang}`;
const KV_KEY_REPLIED_TWEET = (tweetId) => `x_reply_sales:replied:tweet:${tweetId}`;
const KV_KEY_HANDLED_TWEET = (tweetId) => `x_reply_sales:handled:tweet:${tweetId}`;
const KV_KEY_NG_TWEET = (tweetId) => `x_reply_sales:ng:tweet:${tweetId}`;
const KV_KEY_ATTEMPTS_WINDOW = (dateStr, slot15) => `x_reply_sales:attempts:${dateStr}:${slot15}`;
const KV_KEY_SLOT_LOCK = (dateStr, slot15) => `x_reply_sales:lock:send:${dateStr}:${slot15}`;
const KV_KEY_FOLLOW_COUNT_DAILY = (dateStr) => `x_reply_sales:follow_count:${dateStr}`;
const KV_KEY_FOLLOWED_DAILY = (dateStr, authorId) => `x_reply_sales:followed:${dateStr}:${authorId}`;
const KV_KEY_FOLLOWED_USERS_DAILY = (dateStr) => `x_reply_sales:followed_users:${dateStr}`;
const KV_KEY_FOLLOWUP_PENDING = "x_reply_sales:followup_pending";
const KV_KEY_FOLLOWUP_SENT = (authorId, tweetId) => `x_reply_sales:followup_sent:${authorId}:${tweetId}`;
const FOLLOWUP_PENDING_MAX = 2000;
const FOLLOWUP_PENDING_TTL_SECONDS = 86400 * 10;
const KV_KEY_LIST_SUMMARY_LATEST = "x_reply_sales:list_summary:latest";
const KV_KEY_SEND_SUMMARY_LATEST = "x_reply_sales:send_summary:latest";
const KV_KEY_LIST_EVENTS = "x_reply_sales:list_events";
const KV_KEY_SEND_EVENTS = "x_reply_sales:send_events";
const KV_KEY_DISCOVERED_DAILY = (dateStr) => `x_reply_sales:discovered:${dateStr}`;
const KV_KEY_DISCOVERED_DAILY_LANG = (dateStr, lang) => `x_reply_sales:discovered:${dateStr}:${lang}`;
const KV_KEY_SENT_DAILY = (dateStr) => `x_reply_sales:sent:${dateStr}`;
const KV_KEY_SENT_DAILY_LANG = (dateStr, lang) => `x_reply_sales:sent:${dateStr}:${lang}`;
const KV_KEY_ERROR_DAILY = (dateStr) => `x_reply_sales:error:${dateStr}`;
const KV_KEY_ERROR_DAILY_LANG = (dateStr, lang) => `x_reply_sales:error:${dateStr}:${lang}`;
const KV_KEY_ATTEMPTS_DAILY = (dateStr) => `x_reply_sales:attempts_daily:${dateStr}`;
const KV_KEY_ATTEMPTS_DAILY_LANG = (dateStr, lang) => `x_reply_sales:attempts_daily:${dateStr}:${lang}`;
const KV_KEY_DM_SENT_DAILY = (dateStr) => `x_reply_sales:dm_sent:${dateStr}`;
const KV_KEY_DM_SENT_DAILY_LANG = (dateStr, lang) => `x_reply_sales:dm_sent:${dateStr}:${lang}`;
const KV_KEY_DM_NG_DAILY = (dateStr) => `x_reply_sales:dm_ng:${dateStr}`;
const KV_KEY_DM_NG_DAILY_LANG = (dateStr, lang) => `x_reply_sales:dm_ng:${dateStr}:${lang}`;
const KV_KEY_ATTEMPTS_HOURLY = (dateStr, hour) => `x_reply_sales:attempts_h:${dateStr}:${hour}`;
const KV_KEY_SENT_HOURLY = (dateStr, hour) => `x_reply_sales:sent_h:${dateStr}:${hour}`;
const KV_KEY_DM_SENT_HOURLY = (dateStr, hour) => `x_reply_sales:dm_sent_h:${dateStr}:${hour}`;
const KV_KEY_DM_NG_HOURLY = (dateStr, hour) => `x_reply_sales:dm_ng_h:${dateStr}:${hour}`;
const KV_KEY_ATTEMPTS_HOURLY_LANG = (dateStr, hour, lang) => `x_reply_sales:attempts_h:${dateStr}:${hour}:${lang}`;
const KV_KEY_SENT_HOURLY_LANG = (dateStr, hour, lang) => `x_reply_sales:sent_h:${dateStr}:${hour}:${lang}`;
const KV_KEY_DM_SENT_HOURLY_LANG = (dateStr, hour, lang) => `x_reply_sales:dm_sent_h:${dateStr}:${hour}:${lang}`;
const KV_KEY_DM_NG_HOURLY_LANG = (dateStr, hour, lang) => `x_reply_sales:dm_ng_h:${dateStr}:${hour}:${lang}`;
const X_REPLY_HOURLY_TTL_SECONDS = 86400 * 2;

const X_REPLY_SALES_CLICK_TRACK_PATH = "/api/x-reply-sales-click";
const REPLIED_TWEET_TTL_SECONDS = Math.max(
  86400 * 30,
  Number(process.env.X_REPLY_REPLIED_TWEET_TTL_SEC || 86400 * 180)
);

function parseQueueValue(rawValue) {
  if (Array.isArray(rawValue)) return rawValue;
  if (typeof rawValue === "string") {
    try {
      const parsed = JSON.parse(rawValue);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

function toDateString(now = new Date()) {
  return now.toISOString().split("T")[0];
}

function toSlot15(now = new Date()) {
  const utcMinute = now.getUTCMinutes();
  return [0, 15, 30, 45].find((m) => utcMinute >= m && utcMinute < m + 15) ?? 0;
}

function normalizeCandidate(candidate, lang) {
  const normalizedLang = normalizeReplyLang(lang || candidate?.lang);
  const queueVersion = Number(candidate?.queue_version ?? candidate?.queueVersion);
  return {
    lang: normalizedLang,
    tweet_id: String(candidate?.tweet_id || candidate?.tweetId || "").trim(),
    author_id: String(candidate?.author_id || candidate?.authorId || "").trim(),
    username: String(candidate?.username || "").trim().replace(/^@/, ""),
    text: String(candidate?.text || "").trim(),
    created_at: candidate?.created_at || candidate?.createdAt || null,
    discovered_at: candidate?.discovered_at || candidate?.discoveredAt || null,
    queue_version: Number.isFinite(queueVersion) && queueVersion > 0 ? queueVersion : 0,
    post_type: String(candidate?.post_type || candidate?.postType || "").trim() || null,
    priority:
      Number.isFinite(Number(candidate?.priority)) && Number(candidate.priority) > 0
        ? Number(candidate.priority)
        : 1,
    reply_settings: String(candidate?.reply_settings ?? "").trim().toLowerCase() || null
  };
}

function candidateKey(candidate) {
  const tweetId = String(candidate?.tweet_id || "").trim();
  return tweetId ? `tid:${tweetId}` : "";
}

function getQueueLengthsByLang(queuesByLang) {
  const out = {};
  for (const lang of X_REPLY_SALES_LANGS) {
    out[lang] = Array.isArray(queuesByLang[lang]) ? queuesByLang[lang].length : 0;
  }
  return out;
}

const IMMEDIATE_NG_ERROR_TYPES = new Set([
  "reply_not_allowed_by_conversation",
  "target_not_visible",
  "target_not_found"
]);

function shouldMarkImmediateNg(classified) {
  if (!classified || classified.retryable) return false;
  return IMMEDIATE_NG_ERROR_TYPES.has(String(classified.type || ""));
}

function sleepMs(ms) {
  const wait = Math.max(0, Number(ms) || 0);
  if (!wait) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, wait));
}

function pickOfferBaseUrl(lang, tweetId) {
  const regular = getWhopProductUrl(lang);
  if (regular) return regular;
  const checkout = getMinimalVersionCheckoutUrl(lang, {
    source: "x_reply_sales",
    medium: "reply",
    campaign: "trap_defence_reply",
    content: `tweet_${tweetId || "unknown"}`
  });
  if (checkout) return checkout;
  return regular || "https://whop.com/trapdefence/btc-en/";
}

function appendUrlParams(urlString, paramsObject) {
  try {
    const url = new URL(urlString);
    for (const [key, value] of Object.entries(paramsObject || {})) {
      const v = String(value || "").trim();
      if (v) url.searchParams.set(key, v);
    }
    return url.toString();
  } catch (_) {
    return urlString;
  }
}

function resolveRequestOrigin(req) {
  const explicit = process.env.X_REPLY_SALES_CLICK_BASE_URL || process.env.BASE_URL || process.env.APP_BASE_URL;
  if (explicit) return String(explicit).trim().replace(/\/+$/, "");

  const forwardedHostRaw = req?.headers?.["x-forwarded-host"];
  const hostRaw = Array.isArray(forwardedHostRaw)
    ? forwardedHostRaw[0]
    : forwardedHostRaw || req?.headers?.host;
  const host = String(hostRaw || "").split(",")[0].trim();
  if (host) {
    const forwardedProtoRaw = req?.headers?.["x-forwarded-proto"];
    const proto = String(
      Array.isArray(forwardedProtoRaw) ? forwardedProtoRaw[0] : forwardedProtoRaw || "https"
    )
      .split(",")[0]
      .trim();
    return `${proto}://${host}`;
  }

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "";
}

/**
 * @param {object} req - request
 * @param {object} candidate - queue item
 * @param {object} messageMeta - postType, pattern
 * @param {"reply"|"dm"} channel - "reply" = リプライ内リンク, "dm" = DM内リンク（クリック計測で別集計）
 */
function buildTrackedOfferUrl(req, candidate, messageMeta, channel = "reply") {
  const lang = normalizeReplyLang(candidate?.lang);
  const tweetId = String(candidate?.tweet_id || "").trim();
  const baseOffer = pickOfferBaseUrl(lang, tweetId);
  const enrichedOffer = appendUrlParams(baseOffer, {
    utm_source: "x_reply_sales",
    utm_medium: channel,
    utm_campaign: "trap_defence_reply",
    utm_content: `tweet_${tweetId || "unknown"}`,
    xrs_lang: lang,
    xrs_tweet_id: tweetId,
    xrs_post_type: messageMeta?.postType || "",
    xrs_pattern: messageMeta?.pattern || "",
    xrs_author_id: candidate?.author_id || ""
  });

  const origin = resolveRequestOrigin(req);
  if (!origin) return enrichedOffer;

  try {
    const tracked = new URL(`${origin}${X_REPLY_SALES_CLICK_TRACK_PATH}`);
    tracked.searchParams.set("to", enrichedOffer);
    tracked.searchParams.set("lang", lang);
    tracked.searchParams.set("channel", channel);
    tracked.searchParams.set("tweet_id", tweetId);
    tracked.searchParams.set("post_type", messageMeta?.postType || "");
    tracked.searchParams.set("pattern", messageMeta?.pattern || "");
    tracked.searchParams.set("author_id", String(candidate?.author_id || ""));
    tracked.searchParams.set("handle", String(candidate?.username || ""));
    return tracked.toString();
  } catch (_) {
    return enrichedOffer;
  }
}

async function isTweetHandled(tweetId) {
  if (!kv || !tweetId) return false;
  const [replied, handled, ng] = await Promise.all([
    kv.get(KV_KEY_REPLIED_TWEET(tweetId)),
    kv.get(KV_KEY_HANDLED_TWEET(tweetId)),
    kv.get(KV_KEY_NG_TWEET(tweetId))
  ]);
  return Boolean(replied || handled || ng);
}

async function markTweetHandled(tweetId, payload = {}, asReplied = false) {
  if (!kv || !tweetId) return;
  const key = asReplied ? KV_KEY_REPLIED_TWEET(tweetId) : KV_KEY_HANDLED_TWEET(tweetId);
  await kv.set(
    key,
    {
      ...payload,
      tweetId: String(tweetId),
      ts: new Date().toISOString()
    },
    { ex: REPLIED_TWEET_TTL_SECONDS }
  );
}

async function markTweetNg(tweetId, payload = {}) {
  if (!kv || !tweetId) return;
  await kv.set(
    KV_KEY_NG_TWEET(tweetId),
    {
      ...payload,
      tweetId: String(tweetId),
      ts: new Date().toISOString()
    },
    { ex: REPLIED_TWEET_TTL_SECONDS }
  );
}

/** 同一 author_id は1件のみキューに残す（複数ツイートで同一ユーザーが重複しないようにする） */
function mergeQueueEntries(freshItems, existingItems) {
  const queue = [];
  const seenAuthorIds = new Set();
  let addedFromFresh = 0;
  let retainedFromExisting = 0;
  let droppedDuplicates = 0;
  let droppedInvalid = 0;

  const push = (item, source) => {
    const normalized = normalizeCandidate(item, item?.lang);
    if (!normalized.tweet_id || !normalized.username || !normalized.author_id) {
      droppedInvalid += 1;
      return;
    }
    const authorId = String(normalized.author_id || "").trim();
    if (!authorId) {
      droppedInvalid += 1;
      return;
    }
    if (seenAuthorIds.has(authorId)) {
      droppedDuplicates += 1;
      return;
    }
    seenAuthorIds.add(authorId);
    queue.push(normalized);
    if (source === "fresh") addedFromFresh += 1;
    else retainedFromExisting += 1;
  };

  for (const item of Array.isArray(freshItems) ? freshItems : []) push(item, "fresh");
  for (const item of Array.isArray(existingItems) ? existingItems : []) push(item, "existing");

  return {
    queue,
    addedFromFresh,
    retainedFromExisting,
    droppedDuplicates,
    droppedInvalid
  };
}

async function appendEvent(listKey, row) {
  if (!kv) return;
  const prev = await kv.get(listKey);
  const arr = Array.isArray(prev) ? prev : [];
  arr.push(row);
  if (arr.length > X_REPLY_EVENT_LIST_MAX) {
    arr.splice(0, arr.length - X_REPLY_EVENT_LIST_MAX);
  }
  await kv.set(listKey, arr, { ex: X_REPLY_EVENT_TTL_SECONDS });
}

/** リプライ or DM 到達したユーザーを48h後フォロー用キューに追加 */
async function enqueueFollowupPending(item, channel) {
  if (!kv || !item?.author_id || !item?.tweet_id || !item?.username) return;
  try {
    const raw = await kv.get(KV_KEY_FOLLOWUP_PENDING);
    const list = Array.isArray(raw) ? raw : (typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch (_) { return []; } })() : []);
    list.push({
      authorId: String(item.author_id),
      tweetId: String(item.tweet_id),
      lang: normalizeReplyLang(item.lang),
      channel,
      deliveredAt: new Date().toISOString(),
      handle: String(item.username).replace(/^@/, "")
    });
    if (list.length > FOLLOWUP_PENDING_MAX) list.splice(0, list.length - FOLLOWUP_PENDING_MAX);
    await kv.set(KV_KEY_FOLLOWUP_PENDING, list, { ex: FOLLOWUP_PENDING_TTL_SECONDS });
  } catch (e) {
    console.warn("[X Reply Sales] enqueueFollowupPending failed:", e?.message);
  }
}

function toPercent(numerator, denominator) {
  const n = Math.max(0, Number(numerator) || 0);
  const d = Math.max(0, Number(denominator) || 0);
  if (!d) return 0;
  return Math.round((n / d) * 10000) / 100;
}

async function incrementDailyCounter(dateStr, lang, type, amount = 1) {
  if (!kv || !dateStr || !lang || !type) return;
  const safeAmount = Math.max(1, Number(amount) || 1);

  let totalKey;
  let langKey;
  if (type === "discovered") {
    totalKey = KV_KEY_DISCOVERED_DAILY(dateStr);
    langKey = KV_KEY_DISCOVERED_DAILY_LANG(dateStr, lang);
  } else if (type === "sent") {
    totalKey = KV_KEY_SENT_DAILY(dateStr);
    langKey = KV_KEY_SENT_DAILY_LANG(dateStr, lang);
  } else if (type === "attempts") {
    totalKey = KV_KEY_ATTEMPTS_DAILY(dateStr);
    langKey = KV_KEY_ATTEMPTS_DAILY_LANG(dateStr, lang);
  } else if (type === "dm_sent") {
    totalKey = KV_KEY_DM_SENT_DAILY(dateStr);
    langKey = KV_KEY_DM_SENT_DAILY_LANG(dateStr, lang);
  } else if (type === "dm_ng") {
    totalKey = KV_KEY_DM_NG_DAILY(dateStr);
    langKey = KV_KEY_DM_NG_DAILY_LANG(dateStr, lang);
  } else {
    totalKey = KV_KEY_ERROR_DAILY(dateStr);
    langKey = KV_KEY_ERROR_DAILY_LANG(dateStr, lang);
  }

  const [v1, v2] = await Promise.all([kv.incr(totalKey, safeAmount), kv.incr(langKey, safeAmount)]);
  if (v1 != null) await kv.expire(totalKey, X_REPLY_EVENT_TTL_SECONDS);
  if (v2 != null) await kv.expire(langKey, X_REPLY_EVENT_TTL_SECONDS);
}

async function incrementHourlyCounter(dateStr, hour, type, amount = 1, lang = null) {
  if (!kv || !dateStr || type == null) return;
  const safeAmount = Math.max(1, Number(amount) || 1);
  let key;
  let keyLang = null;
  if (type === "attempts") {
    key = KV_KEY_ATTEMPTS_HOURLY(dateStr, hour);
    if (lang) keyLang = KV_KEY_ATTEMPTS_HOURLY_LANG(dateStr, hour, lang);
  } else if (type === "sent") {
    key = KV_KEY_SENT_HOURLY(dateStr, hour);
    if (lang) keyLang = KV_KEY_SENT_HOURLY_LANG(dateStr, hour, lang);
  } else if (type === "dm_sent") {
    key = KV_KEY_DM_SENT_HOURLY(dateStr, hour);
    if (lang) keyLang = KV_KEY_DM_SENT_HOURLY_LANG(dateStr, hour, lang);
  } else if (type === "dm_ng") {
    key = KV_KEY_DM_NG_HOURLY(dateStr, hour);
    if (lang) keyLang = KV_KEY_DM_NG_HOURLY_LANG(dateStr, hour, lang);
  } else return;
  const [v, vLang] = await Promise.all([
    kv.incr(key, safeAmount),
    keyLang ? kv.incr(keyLang, safeAmount) : Promise.resolve(null)
  ]);
  if (v != null) await kv.expire(key, X_REPLY_HOURLY_TTL_SECONDS);
  if (vLang != null && keyLang) await kv.expire(keyLang, X_REPLY_HOURLY_TTL_SECONDS);
}

function buildCandidatesFromSearchRows(lang, rows, usersById, options = {}) {
  const normalizedLang = normalizeReplyLang(lang);
  const discoveredAt = String(options.discoveredAt || new Date().toISOString());
  const queueVersion = Math.max(1, Number(options.queueVersion || X_REPLY_QUEUE_VERSION || 1));
  const candidates = [];
  let skippedReplyRestricted = 0;
  const sourceRows = Array.isArray(rows) ? rows : [];
  const replySettingsCounts = {};
  for (const row of sourceRows) {
    const raw = String(row?.reply_settings ?? "").trim() || "(empty)";
    replySettingsCounts[raw] = (replySettingsCounts[raw] || 0) + 1;
    const tweetId = String(row?.id || "").trim();
    const authorId = String(row?.author_id || "").trim();
    const text = String(row?.text || "").trim();
    if (!tweetId || !authorId || !text) continue;
    const replySettings = String(row?.reply_settings ?? "").trim().toLowerCase();
    // reply_settings で除外しない（everyone 以外でも DM が通る候補があるため。リプライは送信側で試行しない運用）
    const user = usersById?.[authorId];
    if (!user?.username) continue;
    const postType = detectReplyPostType(normalizedLang, text);
    const priority = REPLY_POST_TYPE_PRIORITY[postType] || 1;
    candidates.push({
      lang: normalizedLang,
      tweet_id: tweetId,
      author_id: authorId,
      username: String(user.username).replace(/^@/, ""),
      text,
      created_at: row?.created_at || null,
      discovered_at: discoveredAt,
      queue_version: queueVersion,
      post_type: postType,
      priority,
      reply_settings: replySettings || null
    });
  }

  candidates.sort((a, b) => {
    const p = (b.priority || 0) - (a.priority || 0);
    if (p !== 0) return p;
    const aTs = new Date(a.created_at || 0).getTime();
    const bTs = new Date(b.created_at || 0).getTime();
    return bTs - aTs;
  });
  return {
    candidates,
    skippedReplyRestricted,
    replySettingsCounts
  };
}

/** 取得候補リストの「ホット度」を集計（post_type・新しさ）。リスト品質の分析用 */
function buildHotListAnalysis(candidates) {
  const list = Array.isArray(candidates) ? candidates : [];
  const postTypeCounts = {};
  let highPriorityCount = 0;
  const priorityHotThreshold = 3;
  let newestCreatedAt = null;
  let oldestCreatedAt = null;
  for (const c of list) {
    const pt = String(c?.post_type || "").trim() || "unknown";
    postTypeCounts[pt] = (postTypeCounts[pt] || 0) + 1;
    const p = Number(c?.priority);
    if (Number.isFinite(p) && p >= priorityHotThreshold) highPriorityCount += 1;
    const at = c?.created_at ? new Date(c.created_at).getTime() : null;
    if (at) {
      if (newestCreatedAt == null || at > newestCreatedAt) newestCreatedAt = at;
      if (oldestCreatedAt == null || at < oldestCreatedAt) oldestCreatedAt = at;
    }
  }
  const total = list.length;
  const hotList =
    total > 0 &&
    (highPriorityCount >= Math.ceil(total * 0.5) || highPriorityCount === total);
  return {
    postTypeCounts,
    highPriorityCount,
    totalItems: total,
    newestCreatedAt: newestCreatedAt != null ? new Date(newestCreatedAt).toISOString() : null,
    oldestCreatedAt: oldestCreatedAt != null ? new Date(oldestCreatedAt).toISOString() : null,
    hotList
  };
}

async function refreshQueueForLang(lang, now) {
  const normalizedLang = normalizeReplyLang(lang);
  const queueKey = KV_KEY_QUEUE(normalizedLang);
  let allRows = [];
  const usersById = {};
  const modes = ["strict", "balanced", "broad"];
  const nextTokens = { strict: null, balanced: null, broad: null };
  const hitsByMode = { strict: 0, balanced: 0, broad: 0 };
  const searchRequestCap = X_REPLY_SEARCH_REQUESTS_PER_RUN;
  const maxRounds = Math.min(X_REPLY_LIST_PAGES, searchRequestCap);
  let pagesFetched = 0;

  const windowMinutes = X_REPLY_SEARCH_WINDOW_MINUTES;

  console.log("[X Reply Sales][list] round-robin start", {
    lang: normalizedLang,
    maxRounds,
    windowMinutes
  });
  for (let round = 0; round < maxRounds; round += 1) {
    if (round > 0 && X_REPLY_SEARCH_DELAY_MS > 0) {
      await new Promise((r) => setTimeout(r, X_REPLY_SEARCH_DELAY_MS));
    }
    if (allRows.length >= X_REPLY_QUEUE_CAP_PER_LANG) {
      const tempBuilt = buildCandidatesFromSearchRows(normalizedLang, allRows, usersById, {
        discoveredAt: now.toISOString(),
        queueVersion: X_REPLY_QUEUE_VERSION
      });
      const tempCandidates = tempBuilt.candidates || [];
      const seenTempAuthors = new Set();
      const tempByAuthor = [];
      for (const c of tempCandidates) {
        const aid = String(c?.author_id || "").trim();
        if (!aid || seenTempAuthors.has(aid)) continue;
        seenTempAuthors.add(aid);
        tempByAuthor.push(c);
      }
      const tempHandled = await Promise.all(
        tempByAuthor.map((c) => isTweetHandled(c.tweet_id))
      );
      const unhandledCount = tempHandled.filter((h) => !h).length;
      if (unhandledCount >= X_REPLY_QUEUE_CAP_PER_LANG) break;
    }

    const mode = modes[round % modes.length];
    try {
      const page = await fetchOnePageByMode(normalizedLang, mode, {
        nextToken: nextTokens[mode] || undefined,
        windowMinutes
      });
      if (page?.fatal402) {
        console.log("[X Reply Sales][list] round-robin early exit (新規取得が少なくなる)", {
          lang: normalizedLang,
          reason: "search_402",
          rounds: pagesFetched,
          hint: "X_REPLY_LIST_PAGES を下げる(例:80) or X_REPLY_SEARCH_DELAY_MS を増やすと 402 を避けやすい"
        });
        return {
          ok: false,
          lang: normalizedLang,
          reason: "search_402",
          pagesFetched
        };
      }
      const rows = Array.isArray(page?.data) ? page.data : [];
      allRows.push(...rows);
      for (const user of page?.includes?.users || []) {
        if (user?.id) usersById[user.id] = user;
      }
      hitsByMode[mode] += rows.length;
      nextTokens[mode] = page?.nextToken || null;
      pagesFetched += 1;
    } catch (err) {
      const errMsg = String(err?.message || "");
      if (errMsg.includes("temporarily locked") || errMsg.includes("account is temporarily locked")) {
        console.error("[X Reply Sales][list] X アカウントが一時ロックされています。https://twitter.com でログインして解除してください", {
          lang: normalizedLang,
          rounds: pagesFetched
        });
        return { ok: false, lang: normalizedLang, reason: "account_locked", pagesFetched };
      }
      if (errMsg.includes("402")) {
        console.log("[X Reply Sales][list] round-robin early exit (新規取得が少なくなる)", {
          lang: normalizedLang,
          reason: "search_402",
          rounds: pagesFetched,
          hint: "X_REPLY_LIST_PAGES を下げる(例:80) or X_REPLY_SEARCH_DELAY_MS を増やすと 402 を避けやすい"
        });
        return { ok: false, lang: normalizedLang, reason: "search_402", pagesFetched };
      }
      console.warn("[X Reply Sales][list] round-robin fetch failed (non-fatal)", {
        lang: normalizedLang,
        mode,
        round,
        error: err?.message
      });
    }
  }
  console.log("[X Reply Sales][list] round-robin done", {
    lang: normalizedLang,
    rounds: pagesFetched,
    maxRounds,
    rawRows: allRows.length,
    strict: hitsByMode.strict,
    balanced: hitsByMode.balanced,
    broad: hitsByMode.broad
  });
  // 重複取得の徹底排除: 同一 author_id は先頭1件のみ残してからキャップ適用
  const seenAuthorIdsInRows = new Set();
  const allRowsDeduped = [];
  for (const row of allRows) {
    const aid = String(row?.author_id || "").trim();
    if (!aid || seenAuthorIdsInRows.has(aid)) continue;
    seenAuthorIdsInRows.add(aid);
    allRowsDeduped.push(row);
  }
  if (allRowsDeduped.length < allRows.length) {
    console.log("[X Reply Sales][list] raw rows deduped by author_id (one per user)", {
      lang: normalizedLang,
      before: allRows.length,
      after: allRowsDeduped.length
    });
  }
  allRows = allRowsDeduped;
  if (allRows.length > X_REPLY_QUEUE_CAP_PER_LANG) {
    allRows = allRows.slice(0, X_REPLY_QUEUE_CAP_PER_LANG);
  }
  const strictHitsTotal = hitsByMode.strict;
  const balancedHitsTotal = hitsByMode.balanced;
  const balancedPageCount = 0;

  const builtResult = buildCandidatesFromSearchRows(normalizedLang, allRows, usersById, {
    discoveredAt: now.toISOString(),
    queueVersion: X_REPLY_QUEUE_VERSION
  });
  const built = builtResult.candidates || [];
  const skippedReplyRestricted = Number(builtResult.skippedReplyRestricted || 0);
  const replySettingsCounts = builtResult.replySettingsCounts || {};
  const listCount = built.length;
  console.log(`[X Reply Sales][list] ${normalizedLang} リスト ${listCount} 件 (reply_settings 除外: ${skippedReplyRestricted}, 内訳: ${JSON.stringify(replySettingsCounts)})`);
  // 同一 author_id は1件のみ採用（優先度順の先頭を残す）。二度と同一ユーザーに複数回試行しない
  const seenAuthorIds = new Set();
  const builtDeduped = [];
  for (const c of built) {
    const aid = String(c?.author_id || "").trim();
    if (!aid) continue;
    if (seenAuthorIds.has(aid)) continue;
    seenAuthorIds.add(aid);
    builtDeduped.push(c);
  }
  const droppedDuplicateAuthors = built.length - builtDeduped.length;
  if (droppedDuplicateAuthors > 0) {
    console.log("[X Reply Sales][list] duplicate authors dropped (one tweet per user)", {
      lang: normalizedLang,
      dropped: droppedDuplicateAuthors,
      before: built.length,
      after: builtDeduped.length
    });
  }
  const handledChecks = await Promise.all(
    builtDeduped.map((candidate) => isTweetHandled(candidate.tweet_id))
  );
  const freshQueue = [];
  let skippedHandled = 0;
  for (let i = 0; i < builtDeduped.length; i += 1) {
    if (handledChecks[i]) {
      skippedHandled += 1;
      continue;
    }
    freshQueue.push(builtDeduped[i]);
  }

  const prevQueueRaw = parseQueueValue(await kv.get(queueKey));
  const prevFiltered = [];
  const seenPrevAuthorIds = new Set();
  let removedHandledFromPrev = 0;
  let removedLegacyVersionFromPrev = 0;
  let droppedDuplicateAuthorFromPrev = 0;
  let droppedFromPrevByPolicy = 0;
  if (X_REPLY_RETAIN_PREVIOUS_QUEUE) {
    for (const item of prevQueueRaw) {
      const normalized = normalizeCandidate(item, normalizedLang);
      if (!normalized.tweet_id || !normalized.username || !normalized.author_id) continue;
      const aid = String(normalized.author_id).trim();
      if (seenPrevAuthorIds.has(aid)) {
        droppedDuplicateAuthorFromPrev += 1;
        continue;
      }
      const queueVersion = Number(normalized.queue_version || 0);
      if (queueVersion < X_REPLY_QUEUE_VERSION) {
        removedLegacyVersionFromPrev += 1;
        continue;
      }
      if (await isTweetHandled(normalized.tweet_id)) {
        removedHandledFromPrev += 1;
        continue;
      }
      seenPrevAuthorIds.add(aid);
      prevFiltered.push(normalized);
    }
    if (droppedDuplicateAuthorFromPrev > 0) {
      console.log("[X Reply Sales][list] prev queue deduped by author_id (one per user)", {
        lang: normalizedLang,
        droppedDuplicateAuthorFromPrev
      });
    }
  } else {
    droppedFromPrevByPolicy = prevQueueRaw.length;
  }

  const merged = mergeQueueEntries(freshQueue, X_REPLY_RETAIN_PREVIOUS_QUEUE ? prevFiltered : []);
  const cap = Math.max(1, Number(X_REPLY_QUEUE_CAP_PER_LANG || 20));
  let droppedByCap = 0;
  if (merged.queue.length > cap) {
    droppedByCap = merged.queue.length - cap;
    merged.queue = merged.queue.slice(0, cap);
  }

  await kv.set(queueKey, JSON.stringify(merged.queue), { ex: X_REPLY_EVENT_TTL_SECONDS });

  const dateStr = toDateString(now);
  if (freshQueue.length > 0) {
    await incrementDailyCounter(dateStr, normalizedLang, "discovered", freshQueue.length);
  }

  const summary = {
    ok: true,
    lang: normalizedLang,
    listMode: "round_robin_strict_balanced_broad",
    runAt: now.toISOString(),
    queueVersion: X_REPLY_QUEUE_VERSION,
    retainPreviousQueue: X_REPLY_RETAIN_PREVIOUS_QUEUE,
    pagesFetched,
    configuredPages: X_REPLY_LIST_PAGES,
    strictHitsTotal,
    balancedHitsTotal,
    broadHitsTotal: hitsByMode.broad,
    balancedPageCount,
    fetchedPosts: allRows.length,
    fetchedUsers: Object.keys(usersById).length,
    skippedReplyRestricted,
    discoveredCandidates: built.length,
    freshDiscovered: builtDeduped.length,
    droppedDuplicateAuthors,
    skippedHandled,
    enqueuedFresh: freshQueue.length,
    freshEnqueued: freshQueue.length,
    removedHandledFromPrev,
    removedLegacyVersionFromPrev,
    droppedDuplicateAuthorFromPrev,
    droppedFromPrevByPolicy,
    addedFromFresh: merged.addedFromFresh,
    retainedFromPrev: merged.retainedFromExisting,
    droppedDuplicates: merged.droppedDuplicates,
    droppedInvalid: merged.droppedInvalid,
    prevQueueLength: prevQueueRaw.length,
    nextQueueLength: merged.queue.length,
    droppedByCap,
    queueCapPerLang: cap,
    replySettingsCounts,
    sample: freshQueue.slice(0, 3).map((x) => ({
      tweetId: x.tweet_id,
      handle: x.username,
      postType: x.post_type
    })),
    hotAnalysis: buildHotListAnalysis(built)
  };

  if (droppedByCap > 0) {
    console.log("[X Reply Sales][list][lang] queue cap applied", {
      lang: normalizedLang,
      droppedByCap,
      queueCapPerLang: cap,
      nextQueueLength: merged.queue.length
    });
  }
  const hot = summary.hotAnalysis || {};
  console.log("[X Reply Sales][list][lang]", {
    lang: normalizedLang,
    freshDiscovered: summary.freshDiscovered,
    freshEnqueued: summary.freshEnqueued,
    skippedReplyRestricted: summary.skippedReplyRestricted,
    replySettingsCounts: summary.replySettingsCounts,
    retainedFromPrev: summary.retainedFromPrev,
    droppedFromPrevByPolicy: summary.droppedFromPrevByPolicy,
    droppedDuplicateAuthorFromPrev: summary.droppedDuplicateAuthorFromPrev,
    nextQueueLength: summary.nextQueueLength,
    hotList: hot.hotList,
    postTypeCounts: hot.postTypeCounts,
    highPriorityCount: hot.highPriorityCount
  });

  return summary;
}

function popNextGlobalFifo(queuesByLang, langs, startCursor = 0) {
  const orderedLangs = Array.isArray(langs) ? langs.filter(Boolean) : [];
  if (!orderedLangs.length) return null;

  for (let offset = 0; offset < orderedLangs.length; offset += 1) {
    const langIndex = (startCursor + offset) % orderedLangs.length;
    const lang = orderedLangs[langIndex];
    const queue = Array.isArray(queuesByLang[lang]) ? queuesByLang[lang] : [];
    if (!queue.length) continue;

    while (queue.length > 0) {
      const item = normalizeCandidate(queue.shift(), lang);
      if (!item.tweet_id || !item.username || !item.author_id || !item.text) continue;
      return {
        lang,
        item,
        nextCursor: (langIndex + 1) % orderedLangs.length
      };
    }
  }
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "POST, GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const dryRun = req.query?.dryRun === "1" || req.body?.dryRun === true;
  const auth =
    (process.env.CRON_SECRET && req.headers?.authorization === `Bearer ${process.env.CRON_SECRET}`) ||
    req.query?.secret === process.env.CRON_SECRET;

  const forceMode = String(req.query?.mode || req.body?.mode || "").trim().toLowerCase();
  if (!forceMode || !["list", "send"].includes(forceMode)) {
    return res.status(400).json({
      ok: false,
      reason: "mode_required",
      message: "mode=list or mode=send is required"
    });
  }

  if (!auth) {
    return res.status(401).json({
      ok: false,
      reason: "unauthorized",
      message: "CRON_SECRET is required"
    });
  }

  console.log("[X Reply Sales][run] start", { mode: forceMode, dryRun: !!dryRun });

  if (forceMode === "list") {
    const now = new Date();
    const scope = String(req.query?.scope || req.body?.scope || "")
      .trim()
      .toLowerCase();
    const forcedLang = String(req.query?.lang || req.body?.lang || "")
      .trim()
      .toLowerCase();
    const forcedLangsRaw = req.query?.langs ?? req.body?.langs ?? "";
    let targets = [];
    if (forcedLang) {
      if (!X_REPLY_SALES_LANGS.includes(forcedLang)) {
        return res.status(400).json({
          ok: false,
          reason: "invalid_target_lang",
          lang: forcedLang
        });
      }
      targets = [normalizeReplyLang(forcedLang)];
    } else if (forcedLangsRaw) {
      const sourceList = Array.isArray(forcedLangsRaw)
        ? forcedLangsRaw
        : String(forcedLangsRaw)
            .split(",")
            .map((v) => v.trim());
      const dedup = new Set();
      for (const row of sourceList) {
        const value = String(row || "")
          .trim()
          .toLowerCase();
        if (!value) continue;
        if (!X_REPLY_SALES_LANGS.includes(value)) continue;
        dedup.add(normalizeReplyLang(value));
      }
      targets = Array.from(dedup.values());
      if (!targets.length) {
        return res.status(400).json({
          ok: false,
          reason: "invalid_target_langs",
          langs: forcedLangsRaw
        });
      }
    } else if (scope === "rotate") {
      // 15分スロットで6言語ローテ（90分で全言語1周）。X API 450req/15min を1言語450ページで使い切る
      const slot15 = Math.floor(now.getUTCMinutes() / 15) + now.getUTCHours() * 4;
      const langIndex = slot15 % X_REPLY_SALES_LANGS.length;
      targets = [X_REPLY_SALES_LANGS[langIndex]];
    } else if (scope === "en") {
      targets = ["en"];
    } else if (scope === "regions") {
      targets = [...X_REPLY_SALES_REGION_LANGS];
    } else {
      // 安全デフォルト: scope未指定時はENのみ（全言語一括の誤実行を防ぐ）
      targets = ["en"];
    }
    const perLang = [];
    for (const lang of targets) {
      const row = await refreshQueueForLang(lang, now);
      perLang.push(row);
    }
    const accountLockedRow = perLang.find((row) => row?.reason === "account_locked");
    if (accountLockedRow) {
      console.error("[X Reply Sales][list] list run aborted: account_locked");
      return res.status(200).json({
        ok: false,
        reason: "account_locked",
        message: "X account temporarily locked. Log in at https://twitter.com to unlock.",
        mode: "list",
        runAt: now.toISOString(),
        scope: scope || "all",
        targets,
        perLang
      });
    }

    const gross = {
      targets,
      discoveredCandidatesTotal: perLang.reduce(
        (acc, row) => acc + (Number(row?.discoveredCandidates) || 0),
        0
      ),
      freshDiscoveredTotal: perLang.reduce((acc, row) => acc + (Number(row?.freshDiscovered) || 0), 0),
      enqueuedFreshTotal: perLang.reduce((acc, row) => acc + (Number(row?.enqueuedFresh) || 0), 0),
      freshEnqueuedTotal: perLang.reduce((acc, row) => acc + (Number(row?.freshEnqueued) || 0), 0),
      skippedReplyRestrictedTotal: perLang.reduce(
        (acc, row) => acc + (Number(row?.skippedReplyRestricted) || 0),
        0
      ),
      retainedFromPrevTotal: perLang.reduce((acc, row) => acc + (Number(row?.retainedFromPrev) || 0), 0),
      droppedFromPrevByPolicyTotal: perLang.reduce(
        (acc, row) => acc + (Number(row?.droppedFromPrevByPolicy) || 0),
        0
      ),
      droppedDuplicateAuthorFromPrevTotal: perLang.reduce(
        (acc, row) => acc + (Number(row?.droppedDuplicateAuthorFromPrev) || 0),
        0
      ),
      droppedByCapTotal: perLang.reduce((acc, row) => acc + (Number(row?.droppedByCap) || 0), 0),
      nextQueueTotal: perLang.reduce((acc, row) => acc + (Number(row?.nextQueueLength) || 0), 0)
    };
    const snapshot = {
      mode: "list",
      runAt: now.toISOString(),
      scope: scope || "all",
      perLang,
      gross
    };
    const newCount = Number(gross.freshEnqueuedTotal ?? gross.freshDiscoveredTotal ?? 0);
    console.log(`[X Reply Sales][list] 新規取得 ${newCount} 件 (enqueuedFresh=${gross.freshEnqueuedTotal}, nextQueueTotal=${gross.nextQueueTotal})`, {
      runAt: snapshot.runAt,
      scope: snapshot.scope,
      targets: gross.targets,
      freshDiscoveredTotal: gross.freshDiscoveredTotal,
      freshEnqueuedTotal: gross.freshEnqueuedTotal,
      skippedReplyRestrictedTotal: gross.skippedReplyRestrictedTotal,
      droppedFromPrevByPolicyTotal: gross.droppedFromPrevByPolicyTotal,
      droppedDuplicateAuthorFromPrevTotal: gross.droppedDuplicateAuthorFromPrevTotal,
      droppedByCapTotal: gross.droppedByCapTotal,
      nextQueueTotal: gross.nextQueueTotal
    });
    const nextTotal = Number(gross.nextQueueTotal ?? 0);
    if (nextTotal < 80 && X_REPLY_LIST_PAGES < 15) {
      console.warn("[X Reply Sales][list] キュー少なめ (nextQueueTotal=" + nextTotal + ") → ページ増強の候補: X_REPLY_LIST_PAGES=8 または 10（現在 " + X_REPLY_LIST_PAGES + "）");
    }
    await kv.set(KV_KEY_LIST_SUMMARY_LATEST, snapshot, { ex: X_REPLY_EVENT_TTL_SECONDS });
    await appendEvent(KV_KEY_LIST_EVENTS, snapshot);

    return res.status(200).json({
      ok: !perLang.some((row) => row?.ok === false),
      mode: "list",
      ...snapshot
    });
  }

  // send mode（unfollow・48hフォローアップは :10 の x-reply-sales-followup で実行）
  const now = new Date();
  const dateStr = toDateString(now);

  const hourUtc = now.getUTCHours();
  const slot15 = toSlot15(now);
  const slotKey = `${dateStr}:${slot15}`;
  const invocationId = `${slotKey}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  const runStartedAtMs = Date.now();

  const slotLockKey = KV_KEY_SLOT_LOCK(dateStr, slot15);
  const slotLockValue = JSON.stringify({
    invocationId,
    slotKey,
    acquiredAt: now.toISOString()
  });
  const rawKv = kv.getInstance?.();
  const lockSupported = Boolean(rawKv && typeof rawKv.set === "function");
  let lockAcquired = false;
  if (lockSupported) {
    try {
      const lockResult = await rawKv.set(slotLockKey, slotLockValue, {
        nx: true,
        ex: X_REPLY_SLOT_LOCK_TTL_SECONDS
      });
      lockAcquired = lockResult === "OK" || lockResult === true;
    } catch (error) {
      console.warn("[x-reply-sales] slot lock error:", error?.message);
    }
  }
  if (lockSupported && !lockAcquired) {
    const existing = await kv.get(slotLockKey);
    console.log("[X Reply Sales][send] slot locked, skip", { slotKey });
    return res.status(200).json({
      ok: true,
      reason: "slot_locked",
      slotKey,
      invocationId,
      existingLock: existing || null
    });
  }

  const releaseSlotLock = async () => {
    if (!lockAcquired) return;
    try {
      const current = await kv.get(slotLockKey);
      const currentString = typeof current === "string" ? current : JSON.stringify(current);
      if (!current || currentString === slotLockValue) {
        await kv.del(slotLockKey);
      }
    } catch (error) {
      console.warn("[x-reply-sales] slot lock release failed:", error?.message);
    }
  };

  try {
    const attemptWindowKey = KV_KEY_ATTEMPTS_WINDOW(dateStr, slot15);
    let attemptsThisWindow = parseInt(await kv.get(attemptWindowKey), 10) || 0;
    if (attemptsThisWindow >= X_REPLY_ATTEMPT_CAP_PER_15MIN) {
      console.log("[X Reply Sales][send] attempt cap, skip", {
        slotKey,
        attemptsThisWindow,
        attemptCapPer15min: X_REPLY_ATTEMPT_CAP_PER_15MIN
      });
      return res.status(200).json({
        ok: true,
        mode: "send",
        reason: "attempt_cap",
        slotKey,
        attemptsThisWindow,
        attemptCapPer15min: X_REPLY_ATTEMPT_CAP_PER_15MIN
      });
    }

    const queuesByLang = {};
    const droppedLegacyQueueByLang = {};
    let droppedLegacyQueueTotal = 0;
    for (const lang of X_REPLY_SALES_LANGS) {
      const rawQueue = await kv.get(KV_KEY_QUEUE(lang));
      const normalizedQueue = parseQueueValue(rawQueue).map((item) => normalizeCandidate(item, lang));
      let droppedLegacy = 0;
      let droppedDuplicateAuthor = 0;
      const seenAuthorIdsInLang = new Set();
      const filteredQueue = [];
      for (const item of normalizedQueue) {
        const queueVersion = Number(item?.queue_version || 0);
        if (queueVersion < X_REPLY_QUEUE_VERSION) {
          droppedLegacy += 1;
          continue;
        }
        const aid = String(item?.author_id || "").trim();
        if (aid && seenAuthorIdsInLang.has(aid)) {
          droppedDuplicateAuthor += 1;
          continue;
        }
        if (aid) seenAuthorIdsInLang.add(aid);
        filteredQueue.push(item);
      }
      queuesByLang[lang] = filteredQueue;
      droppedLegacyQueueByLang[lang] = droppedLegacy;
      droppedLegacyQueueTotal += droppedLegacy;
      if (droppedDuplicateAuthor > 0) {
        console.log("[X Reply Sales][send] queue deduped by author_id (one per user)", {
          lang,
          droppedDuplicateAuthor
        });
      }
      if (droppedLegacy > 0) {
        console.warn("[X Reply Sales][send] dropped legacy queue items", {
          lang,
          droppedLegacy,
          requiredQueueVersion: X_REPLY_QUEUE_VERSION
        });
      }
    }
    const queueLengthsStart = getQueueLengthsByLang(queuesByLang);
    const queueTotalStart = Object.values(queueLengthsStart).reduce((a, n) => a + n, 0);
    console.log("[X Reply Sales][send] queue loaded", {
      slotKey,
      queueLengthsStart,
      queueTotalStart
    });

    let me;
    try {
      me = await getMe();
    } catch (getMeErr) {
      const msg = String(getMeErr?.message || "");
      if (msg.includes("temporarily locked") || msg.includes("account is temporarily locked")) {
        console.error("[X Reply Sales][send] X アカウントが一時ロックされています。https://twitter.com でログインして解除してください", {
          error: msg
        });
        return res.status(200).json({
          ok: false,
          reason: "account_locked",
          message: "X account temporarily locked. Log in at https://twitter.com to unlock.",
          slotKey,
          queueTotalStart
        });
      }
      throw getMeErr;
    }
    const cachedSourceId = me?.id || null;
    if (!cachedSourceId) {
      console.warn("[X Reply Sales][send] getMe failed, follow/like will call getMe per request");
    }

    const processedAuthorIdsInRun = new Set();

    let attemptsThisRun = 0;
    let sentThisRun = 0;
    let errorsThisRun = 0;
    let sendCursor = 0;
    let stopReason = null;
    let lastAttemptStartedAtMs = 0;
    let lastSentReplyText = "";
    let waitedDelayMs = 0;
    const sentRows = [];

    const canContinueRun = () => Date.now() - runStartedAtMs < X_REPLY_SEND_RUN_HARD_STOP_MS;
    const waitBeforeNextAttempt = async () => {
      if (X_REPLY_SEND_DELAY_MS <= 0 || lastAttemptStartedAtMs <= 0) return;
      const elapsed = Date.now() - lastAttemptStartedAtMs;
      const remain = X_REPLY_SEND_DELAY_MS - elapsed;
      if (remain > 0) {
        await sleepMs(remain);
        waitedDelayMs += remain;
      }
    };

    const registerAttempt = async () => {
      const nextAttemptRaw = await kv.incr(attemptWindowKey, 1);
      if (nextAttemptRaw != null) {
        attemptsThisWindow = Math.max(0, parseInt(nextAttemptRaw, 10) || 0);
        await kv.expire(attemptWindowKey, X_REPLY_ATTEMPT_WINDOW_TTL_SECONDS);
      } else {
        attemptsThisWindow += 1;
        await kv.set(attemptWindowKey, String(attemptsThisWindow), {
          ex: X_REPLY_ATTEMPT_WINDOW_TTL_SECONDS
        });
      }
      attemptsThisRun += 1;
      return attemptsThisWindow <= X_REPLY_ATTEMPT_CAP_PER_15MIN;
    };

    while (
      attemptsThisRun < X_REPLY_MAX_ATTEMPTS_PER_RUN &&
      attemptsThisWindow < X_REPLY_ATTEMPT_CAP_PER_15MIN &&
      canContinueRun()
    ) {
      const picked = popNextGlobalFifo(queuesByLang, X_REPLY_SALES_LANGS, sendCursor);
      if (!picked) {
        stopReason = "queue_exhausted";
        break;
      }
      sendCursor = Number.isFinite(picked.nextCursor) ? picked.nextCursor : sendCursor;
      const { lang, item } = picked;

      if (await isTweetHandled(item.tweet_id)) {
        continue;
      }
      const authorId = String(item?.author_id || "").trim();
      if (authorId && processedAuthorIdsInRun.has(authorId)) {
        console.log("[X Reply Sales][send] skip duplicate author in same run", {
          lang,
          handle: item.username,
          authorId
        });
        continue;
      }
      if (authorId) processedAuthorIdsInRun.add(authorId);

      const previewOfferUrl = buildTrackedOfferUrl(req, item, {
        postType: item.post_type || detectReplyPostType(lang, item.text),
        pattern: "A"
      }, "reply");
      const previewMessage = buildReplyMessage({
        lang,
        username: item.username,
        tweetText: item.text,
        tweetId: item.tweet_id,
        offerUrl: previewOfferUrl
      });
      const offerUrl = buildTrackedOfferUrl(req, item, {
        postType: previewMessage.postType,
        pattern: previewMessage.pattern
      }, "reply");
      const finalMessage = buildReplyMessage({
        lang,
        username: item.username,
        tweetText: item.text,
        tweetId: item.tweet_id,
        offerUrl
      });

      let selectedMessage = finalMessage;
      let selectedOfferUrl = offerUrl;
      let textWithCoupon = `${selectedMessage.text} Coupon: ${X_REPLY_PROMO_CODE}`.trim();
      if (lastSentReplyText && textWithCoupon === lastSentReplyText) {
        const rotatePatterns = ["A", "B", "C"].filter((p) => p !== finalMessage.pattern);
        for (let i = 0; i < rotatePatterns.length; i += 1) {
          const altMessage = buildReplyMessage({
            lang,
            username: item.username,
            tweetText: item.text,
            tweetId: item.tweet_id,
            offerUrl,
            forcedPattern: rotatePatterns[i],
            seedSalt: `rotate_${i + 1}`
          });
          const altText = `${altMessage.text} Coupon: ${X_REPLY_PROMO_CODE}`.trim();
          if (altText !== lastSentReplyText) {
            selectedMessage = altMessage;
            textWithCoupon = altText;
            break;
          }
        }
      }
      if (
        selectedMessage.pattern !== finalMessage.pattern ||
        selectedMessage.postType !== finalMessage.postType
      ) {
        selectedOfferUrl = buildTrackedOfferUrl(req, item, {
          postType: selectedMessage.postType,
          pattern: selectedMessage.pattern
        }, "reply");
        textWithCoupon = textWithCoupon.replace(offerUrl, selectedOfferUrl);
      }

      if (dryRun) {
        return res.status(200).json({
          ok: true,
          dryRun: true,
          mode: "send",
          wouldSend: {
            lang,
            tweetId: item.tweet_id,
            handle: item.username,
            postType: selectedMessage.postType,
            pattern: selectedMessage.pattern,
            text: textWithCoupon,
            offerUrl: selectedOfferUrl
          },
          queueLengthsStart
        });
      }

      await waitBeforeNextAttempt();
      const attemptAccepted = await registerAttempt();
      if (!attemptAccepted) {
        queuesByLang[lang].unshift(item);
        stopReason = "attempt_cap_reached";
        break;
      }

      lastAttemptStartedAtMs = Date.now();
      await incrementDailyCounter(dateStr, lang, "attempts", 1);
      await incrementHourlyCounter(dateStr, hourUtc, "attempts", 1, lang);
      const replySettings = String(item.reply_settings ?? "").trim().toLowerCase();
      const canAttemptReply =
        !X_REPLY_SKIP_REPLY_ATTEMPT && replySettings === "everyone";
      console.log("[X Reply Sales][send] " + (canAttemptReply ? "attempting reply" : "DM"), {
        attempt: attemptsThisRun,
        tweetId: item.tweet_id,
        lang,
        handle: item.username
      });
      let sendResult;
      if (canAttemptReply) {
        const replyText = item.username
          ? `@${String(item.username).replace(/^@/, "")} ${textWithCoupon}`.trim()
          : textWithCoupon;
        sendResult = await sendSalesReply({
          tweetId: item.tweet_id,
          text: replyText
        });
      } else {
        sendResult = {
          ok: false,
          classified: {
            retryable: false,
            type: "reply_not_allowed_by_conversation"
          }
        };
      }

      if (!sendResult.ok) {
        if (!X_REPLY_SKIP_REPLY_ATTEMPT) {
          await appendEvent(KV_KEY_SEND_EVENTS, {
            ts: new Date().toISOString(),
            slotKey,
            invocationId,
            status: "error",
            lang,
            tweetId: item.tweet_id,
            handle: item.username,
            postType: selectedMessage.postType,
            pattern: selectedMessage.pattern,
            error: sendResult.error,
            classified: sendResult.classified || null
          });
        }

        const classified = sendResult.classified || { retryable: false, type: "unknown" };
        if (classified.retryable) {
          queuesByLang[lang].unshift(item);
          stopReason = `retryable_error:${classified.type}`;
          break;
        }
        const immediateNg = shouldMarkImmediateNg(classified);
        if (immediateNg) {
          // いいねはリプライ試行前に済ませているため、ここではDMのみ送る
          // DM用トラッキングURL（channel=dm）に差し替え、クリックをリプライと別集計
          const offerUrlForDm = buildTrackedOfferUrl(req, item, {
            postType: selectedMessage.postType,
            pattern: selectedMessage.pattern
          }, "dm");
          const textForDm = textWithCoupon.replace(selectedOfferUrl, offerUrlForDm);
          // テンプレはDM専用のため@は含まないが、念のため@除去と空白正規化
          const dmBody = textForDm
            .replace(/\s*@\w+\s*/g, " ")
            .replace(/\s{2,}/g, " ")
            .trim();
          const tweetQuote = (item.text && String(item.text).trim())
            ? `「${String(item.text).replace(/\n/g, " ").trim().slice(0, 250)}${String(item.text).length > 250 ? "…" : ""}」`
            : "";
          const queryHook = getDmQueryHook(lang, item.post_type);
          const closingLine = getDmClosing(lang);
          const parts = [tweetQuote, queryHook, dmBody].filter(Boolean);
          const dmText = parts.join("\n\n") + (closingLine ? "\n\n" + closingLine : "");
          // いいね・フォローはDM送信成功時のみ実行（送信前にフォローしない）
          let dmResult;
          try {
            dmResult = await sendRecruitDm(item.username, dmText || textWithCoupon, {
              participantId: item.author_id
            });
          } catch (dmErr) {
            dmResult = { error: dmErr?.message || "DM send threw" };
          }
          const dmFailed = !dmResult || dmResult.error;
          if (dmFailed) {
            errorsThisRun += 1;
            await incrementDailyCounter(dateStr, lang, "dm_ng", 1);
            await incrementHourlyCounter(dateStr, hourUtc, "dm_ng", 1, lang);
            await markTweetNg(item.tweet_id, {
              status: "ng",
              reason: "reply_rejected_then_dm_failed",
              lang,
              handle: item.username,
              replyError: classified.type,
              dmError: dmResult?.error || "unknown"
            });
            await markTweetHandled(
              item.tweet_id,
              {
                status: "ng",
                reason: "reply_rejected_then_dm_failed",
                lang,
                handle: item.username,
                immediateNg: true
              },
              false
            );
            console.warn("[X Reply Sales][send] reply rejected, DM failed → NG", {
              lang,
              tweetId: item.tweet_id,
              handle: item.username,
              dmError: dmResult?.error || "unknown"
            });
          } else {
            await incrementDailyCounter(dateStr, lang, "dm_sent", 1);
            await incrementHourlyCounter(dateStr, hourUtc, "dm_sent", 1, lang);
            if (X_REPLY_FOLLOW_BEFORE_SEND && kv && item.author_id && X_REPLY_FOLLOW_CAP_PER_DAY > 0) {
              try {
                const currentCount = parseInt(await kv.get(KV_KEY_FOLLOW_COUNT_DAILY(dateStr)), 10) || 0;
                const alreadyFollowed = await kv.get(KV_KEY_FOLLOWED_DAILY(dateStr, item.author_id));
                if (currentCount < X_REPLY_FOLLOW_CAP_PER_DAY && !alreadyFollowed) {
                  const followResult = await followUser(item.author_id, {
                    sourceId: cachedSourceId || undefined
                  });
                  if (followResult.ok || followResult.error) {
                    await kv.set(KV_KEY_FOLLOWED_DAILY(dateStr, item.author_id), "1", {
                      ex: 86400 * 2
                    });
                    const nextCount = currentCount + 1;
                    await kv.set(KV_KEY_FOLLOW_COUNT_DAILY(dateStr), String(nextCount), {
                      ex: 86400 * 2
                    });
                    const usersKey = KV_KEY_FOLLOWED_USERS_DAILY(dateStr);
                    const prevList = await kv.get(usersKey);
                    const arr = Array.isArray(prevList) ? prevList : (typeof prevList === "string" ? (() => { try { return JSON.parse(prevList); } catch (_) { return []; } })() : []);
                    if (!arr.includes(item.author_id)) arr.push(item.author_id);
                    await kv.set(usersKey, arr, { ex: 86400 * 8 });
                    if (X_REPLY_FOLLOW_DELAY_MS > 0) {
                      await new Promise((r) => setTimeout(r, X_REPLY_FOLLOW_DELAY_MS));
                    }
                    console.log("[X Reply Sales][send] follow after DM sent", {
                      authorId: item.author_id,
                      handle: item.username,
                      following: followResult.following,
                      followCountToday: nextCount,
                      cap: X_REPLY_FOLLOW_CAP_PER_DAY
                    });
                  }
                }
              } catch (followErr) {
                console.warn("[X Reply Sales][send] follow after DM sent failed (non-fatal):", followErr?.message);
              }
            }
            if (X_REPLY_LIKE_BEFORE_DM && item.tweet_id) {
              try {
                const likeResult = await likeTweet(item.tweet_id, {
                  sourceId: cachedSourceId || undefined
                });
                if (!likeResult.ok) {
                  console.warn("[X Reply Sales][send] like after DM sent failed (non-fatal):", {
                    tweetId: item.tweet_id,
                    error: likeResult.error
                  });
                }
              } catch (likeErr) {
                console.warn("[X Reply Sales][send] like after DM sent threw (non-fatal):", likeErr?.message);
              }
            }
            await markTweetHandled(
              item.tweet_id,
              {
                status: "dm_sent",
                reason: "reply_rejected_dm_sent",
                lang,
                handle: item.username,
                dmEventId: dmResult.dmEventId || null
              },
              false
            );
            await appendEvent(KV_KEY_SEND_EVENTS, {
              ts: new Date().toISOString(),
              slotKey,
              invocationId,
              status: "dm_sent",
              lang,
              tweetId: item.tweet_id,
              handle: item.username,
              dmEventId: dmResult.dmEventId || null
            });
            console.log("[X Reply Sales][send] reply rejected → DM sent", {
              lang,
              tweetId: item.tweet_id,
              handle: item.username
            });
            await enqueueFollowupPending(item, "dm");
          }
        } else {
          errorsThisRun += 1;
          await incrementDailyCounter(dateStr, lang, "error", 1);
          await markTweetHandled(
            item.tweet_id,
            {
              status: "failed",
              reason: classified.type || "error",
              lang,
              handle: item.username,
              immediateNg: false
            },
            false
          );
        }
        continue;
      }

      sentThisRun += 1;
      await incrementDailyCounter(dateStr, lang, "sent", 1);
      await incrementHourlyCounter(dateStr, hourUtc, "sent", 1, lang);
      await markTweetHandled(
        item.tweet_id,
        {
          status: "sent",
          lang,
          handle: item.username,
          replyId: sendResult.replyId || null,
          pattern: selectedMessage.pattern,
          postType: selectedMessage.postType
        },
        true
      );

      await enqueueFollowupPending(item, "reply");

      lastSentReplyText = textWithCoupon;

      const sentRow = {
        ts: new Date().toISOString(),
        slotKey,
        invocationId,
        status: "sent",
        lang,
        tweetId: item.tweet_id,
        handle: item.username,
        authorId: item.author_id,
        replyId: sendResult.replyId || null,
        postType: selectedMessage.postType,
        pattern: selectedMessage.pattern,
        offerUrl: selectedOfferUrl
      };
      sentRows.push(sentRow);
      await appendEvent(KV_KEY_SEND_EVENTS, sentRow);
    }

    for (const lang of X_REPLY_SALES_LANGS) {
      await kv.set(KV_KEY_QUEUE(lang), JSON.stringify(queuesByLang[lang] || []), {
        ex: X_REPLY_EVENT_TTL_SECONDS
      });
    }

    if (!stopReason) {
      if (attemptsThisRun >= X_REPLY_MAX_ATTEMPTS_PER_RUN) stopReason = "attempts_per_run_reached";
      else if (attemptsThisWindow >= X_REPLY_ATTEMPT_CAP_PER_15MIN) stopReason = "attempt_cap_reached";
      else if (!canContinueRun()) stopReason = "run_time_limit";
    }

    const queueLengthsEnd = getQueueLengthsByLang(queuesByLang);
    const summary = {
      mode: "send",
      runAt: new Date().toISOString(),
      slotKey,
      invocationId,
      attemptsThisRun,
      attemptsThisWindow,
      sentThisRun,
      errorsThisRun,
      sendDelayMs: X_REPLY_SEND_DELAY_MS,
      waitedDelayMs,
      maxAttemptsPerRun: X_REPLY_MAX_ATTEMPTS_PER_RUN,
      attemptCapPer15min: X_REPLY_ATTEMPT_CAP_PER_15MIN,
      queueVersion: X_REPLY_QUEUE_VERSION,
      droppedLegacyQueueByLang,
      droppedLegacyQueueTotal,
      queueLengthsStart,
      queueLengthsEnd,
      stopReason: stopReason || null,
      sentRows
    };
    await kv.set(KV_KEY_SEND_SUMMARY_LATEST, summary, { ex: X_REPLY_EVENT_TTL_SECONDS });

    console.log("[X Reply Sales][send] done", {
      slotKey,
      attemptsThisRun,
      sentThisRun,
      errorsThisRun,
      stopReason: summary.stopReason,
      queueLengthsEnd: summary.queueLengthsEnd
    });

    return res.status(200).json({
      ok: true,
      ...summary
    });
  } finally {
    await releaseSlotLock();
  }
};
