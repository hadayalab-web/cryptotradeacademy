/**
 * Xリプライ直販 クリック計測リダイレクト
 * - リプライ内リンクはこのAPIを経由してWhop/Checkoutへ302
 * - KPI用にクリックイベントをKVへ保存
 */
const { kv } = require("../utils/kv");
const { X_REPLY_EVENT_TTL_SECONDS, X_REPLY_EVENT_LIST_MAX } = require("../config/xReplySalesConfig");
const { normalizeReplyLang } = require("../config/xReplySalesStrategy");

const KV_KEY_CLICK_TOTAL = "x_reply_sales:click:total";
const KV_KEY_CLICK_DAILY = (dateStr) => `x_reply_sales:click:${dateStr}`;
const KV_KEY_CLICK_DAILY_LANG = (dateStr, lang) => `x_reply_sales:click:${dateStr}:${lang}`;
const KV_KEY_CLICK_DAILY_REPLY = (dateStr) => `x_reply_sales:click_reply:${dateStr}`;
const KV_KEY_CLICK_DAILY_REPLY_LANG = (dateStr, lang) => `x_reply_sales:click_reply:${dateStr}:${lang}`;
const KV_KEY_CLICK_DAILY_DM = (dateStr) => `x_reply_sales:click_dm:${dateStr}`;
const KV_KEY_CLICK_DAILY_DM_LANG = (dateStr, lang) => `x_reply_sales:click_dm:${dateStr}:${lang}`;
const KV_KEY_CLICK_TWEET = (tweetId) => `x_reply_sales:click:tweet:${tweetId}`;
const KV_KEY_CLICK_EVENTS = "x_reply_sales:click_events";

function sanitizeDestination(raw) {
  const destination = String(raw || "").trim();
  if (!destination) return "";
  try {
    const parsed = new URL(destination);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    return parsed.toString();
  } catch (_) {
    return "";
  }
}

function parseObject(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch (_) {
    return null;
  }
}

function getHeaderValue(req, key) {
  const raw = req?.headers?.[key];
  return Array.isArray(raw) ? raw[0] : raw;
}

function parseForwardedFirstValue(raw) {
  return String(raw || "")
    .split(",")[0]
    .trim();
}

function sanitizeSlug(raw, max = 40) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, max);
}

function sanitizeHandle(raw) {
  return String(raw || "")
    .trim()
    .replace(/^@/, "")
    .slice(0, 50);
}

function isLikelyBotUserAgent(userAgent) {
  const ua = String(userAgent || "").toLowerCase();
  if (!ua) return false;
  const patterns = [
    "twitterbot",
    "slackbot",
    "discordbot",
    "facebookexternalhit",
    "linkedinbot",
    "whatsapp",
    "telegrambot",
    "crawler",
    "spider",
    "preview"
  ];
  return patterns.some((p) => ua.includes(p));
}

async function appendEvent(row) {
  if (!kv) return;
  const prev = await kv.get(KV_KEY_CLICK_EVENTS);
  const arr = Array.isArray(prev) ? prev : [];
  arr.push(row);
  if (arr.length > X_REPLY_EVENT_LIST_MAX) {
    arr.splice(0, arr.length - X_REPLY_EVENT_LIST_MAX);
  }
  await kv.set(KV_KEY_CLICK_EVENTS, arr, { ex: X_REPLY_EVENT_TTL_SECONDS });
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const destination = sanitizeDestination(req.query?.to);
  if (!destination) {
    return res.status(400).json({
      error: "Bad request",
      message: "Valid query parameter 'to' (http/https URL) is required"
    });
  }

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const userAgent = getHeaderValue(req, "user-agent") || "";
  const forwardedFor = parseForwardedFirstValue(getHeaderValue(req, "x-forwarded-for"));
  const forwardedProto = parseForwardedFirstValue(getHeaderValue(req, "x-forwarded-proto"));
  const shouldSkipLogging = req.method === "HEAD" || isLikelyBotUserAgent(userAgent);

  const lang = normalizeReplyLang(req.query?.lang);
  let channelRaw = String(req.query?.channel || "").trim().toLowerCase();
  if (!channelRaw && destination) {
    try {
      const toUrl = new URL(destination);
      channelRaw = String(toUrl.searchParams.get("utm_medium") || "").trim().toLowerCase();
    } catch (_) { /* ignore */ }
  }
  const channel = channelRaw === "dm" ? "dm" : "reply";
  const tweetId = String(req.query?.tweet_id || "").trim().slice(0, 30);
  const postType = sanitizeSlug(req.query?.post_type);
  const pattern = sanitizeSlug(req.query?.pattern);
  const handle = sanitizeHandle(req.query?.handle);
  const authorId = String(req.query?.author_id || "").trim().slice(0, 30) || null;

  if (!shouldSkipLogging && kv) {
    try {
      const incrKeys = [
        kv.incr(KV_KEY_CLICK_TOTAL, 1),
        kv.incr(KV_KEY_CLICK_DAILY(dateStr), 1),
        kv.incr(KV_KEY_CLICK_DAILY_LANG(dateStr, lang), 1),
        channel === "dm"
          ? Promise.all([
              kv.incr(KV_KEY_CLICK_DAILY_DM(dateStr), 1),
              kv.incr(KV_KEY_CLICK_DAILY_DM_LANG(dateStr, lang), 1)
            ])
          : Promise.all([
              kv.incr(KV_KEY_CLICK_DAILY_REPLY(dateStr), 1),
              kv.incr(KV_KEY_CLICK_DAILY_REPLY_LANG(dateStr, lang), 1)
            ])
      ];
      const results = await Promise.all(incrKeys);
      if (results[0] != null) await kv.expire(KV_KEY_CLICK_TOTAL, X_REPLY_EVENT_TTL_SECONDS);
      if (results[1] != null) await kv.expire(KV_KEY_CLICK_DAILY(dateStr), X_REPLY_EVENT_TTL_SECONDS);
      if (results[2] != null) await kv.expire(KV_KEY_CLICK_DAILY_LANG(dateStr, lang), X_REPLY_EVENT_TTL_SECONDS);
      const channelResults = results[3];
      if (channel === "dm") {
        if (channelResults?.[0] != null) await kv.expire(KV_KEY_CLICK_DAILY_DM(dateStr), X_REPLY_EVENT_TTL_SECONDS);
        if (channelResults?.[1] != null) await kv.expire(KV_KEY_CLICK_DAILY_DM_LANG(dateStr, lang), X_REPLY_EVENT_TTL_SECONDS);
      } else {
        if (channelResults?.[0] != null) await kv.expire(KV_KEY_CLICK_DAILY_REPLY(dateStr), X_REPLY_EVENT_TTL_SECONDS);
        if (channelResults?.[1] != null) await kv.expire(KV_KEY_CLICK_DAILY_REPLY_LANG(dateStr, lang), X_REPLY_EVENT_TTL_SECONDS);
      }

      if (tweetId) {
        const tweetKey = KV_KEY_CLICK_TWEET(tweetId);
        const prev = parseObject(await kv.get(tweetKey)) || {
          tweetId,
          lang,
          postType,
          pattern,
          handle: handle || null,
          authorId,
          count: 0,
          firstClickAt: now.toISOString()
        };
        const next = {
          ...prev,
          count: Math.max(0, Number(prev.count) || 0) + 1,
          lastClickAt: now.toISOString()
        };
        await kv.set(tweetKey, next, { ex: X_REPLY_EVENT_TTL_SECONDS });
      }

      await appendEvent({
        ts: now.toISOString(),
        date: dateStr,
        lang,
        channel,
        tweetId: tweetId || null,
        postType: postType || null,
        pattern: pattern || null,
        handle: handle || null,
        authorId,
        ip: forwardedFor || null,
        proto: forwardedProto || null,
        ua: String(userAgent).slice(0, 300)
      });
    } catch (error) {
      console.warn("[x-reply-sales-click] logging failed:", error?.message);
    }
  }

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  return res.redirect(302, destination);
};
