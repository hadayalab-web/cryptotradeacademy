/**
 * Affiliate Recruit DM クリック計測リダイレクト
 * - DM内リンクはこのAPIを経由して LP（→WarriorPlus決済）へ 302 リダイレクト
 * - ref(=author_id) 単位のクリック集計と直近イベントログを KV に保存
 */
const { kv } = require("../utils/kv");

const RECRUIT_LANGS = new Set(["en", "ja", "ko", "es", "pt", "ar"]);
const CLICK_TTL_SECONDS = Math.max(
  86400,
  Number(process.env.AFFILIATE_RECRUIT_CLICK_TTL_SEC || 86400 * 90)
);
const CLICK_EVENTS_MAX = Math.max(
  50,
  Number(process.env.AFFILIATE_RECRUIT_CLICK_EVENTS_MAX || 500)
);

const KV_KEY_CLICK_REF = (ref) => `affiliate_recruit:click:ref:${ref}`;
const KV_KEY_CLICK_REFS_LIST = "affiliate_recruit:click_refs:list";
const KV_KEY_CLICK_EVENTS_LIST = "affiliate_recruit:click_events:list";
const KV_KEY_CLICK_TOTAL = "affiliate_recruit:click:total";
const KV_KEY_CLICK_LANG = (lang) => `affiliate_recruit:click:lang:${lang}`;

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

function toStringList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v || "").trim())
    .filter((v) => v.length > 0);
}

function normalizeLang(rawLang) {
  const lang = String(rawLang || "").toLowerCase().trim();
  return RECRUIT_LANGS.has(lang) ? lang : "en";
}

function sanitizeHandle(rawHandle) {
  return String(rawHandle || "")
    .trim()
    .replace(/^@/, "")
    .slice(0, 50);
}

function sanitizeSource(rawSource) {
  return String(rawSource || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 50) || "dm_invite";
}

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

function getHeaderValue(req, key) {
  const raw = req?.headers?.[key];
  return Array.isArray(raw) ? raw[0] : raw;
}

function parseForwardedFirstValue(raw) {
  return String(raw || "")
    .split(",")[0]
    .trim();
}

function extractRefFromDestination(destination) {
  try {
    const parsed = new URL(destination);
    return (
      parsed.searchParams.get("ref") ||
      parsed.searchParams.get("referral_id") ||
      parsed.searchParams.get("referrer_id") ||
      ""
    ).trim();
  } catch (_) {
    return "";
  }
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
    "preview",
    "httpclient"
  ];
  return patterns.some((p) => ua.includes(p));
}

async function appendRefIfAbsent(ref) {
  if (!ref || !kv) return;
  const refsRaw = await kv.get(KV_KEY_CLICK_REFS_LIST);
  const refs = toStringList(refsRaw);
  if (refs.includes(ref)) return;
  refs.push(ref);
  if (refs.length > 2000) refs.splice(0, refs.length - 1500);
  await kv.set(KV_KEY_CLICK_REFS_LIST, refs, { ex: CLICK_TTL_SECONDS });
}

async function appendClickEvent(event) {
  if (!kv) return;
  const eventsRaw = await kv.get(KV_KEY_CLICK_EVENTS_LIST);
  const events = Array.isArray(eventsRaw) ? eventsRaw : [];
  events.push(event);
  if (events.length > CLICK_EVENTS_MAX) {
    events.splice(0, events.length - CLICK_EVENTS_MAX);
  }
  await kv.set(KV_KEY_CLICK_EVENTS_LIST, events, { ex: CLICK_TTL_SECONDS });
}

async function updateRefClickAggregate({ ref, lang, angle, handle, authorId, source, clickedAt }) {
  if (!kv || !ref) return;
  const key = KV_KEY_CLICK_REF(ref);
  const prev = parseObject(await kv.get(key)) || {};
  const count = Math.max(0, Number(prev.count) || 0) + 1;
  await kv.set(
    key,
    {
      ref,
      authorId: authorId || prev.authorId || ref,
      handle: handle || prev.handle || null,
      lang: lang || prev.lang || "en",
      angle: angle || prev.angle || null,
      source: source || prev.source || "dm_invite",
      firstClickAt: prev.firstClickAt || clickedAt,
      lastClickAt: clickedAt,
      count
    },
    { ex: CLICK_TTL_SECONDS }
  );
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

  const userAgent = getHeaderValue(req, "user-agent") || "";
  const forwardedFor = parseForwardedFirstValue(getHeaderValue(req, "x-forwarded-for"));
  const forwardedProto = parseForwardedFirstValue(getHeaderValue(req, "x-forwarded-proto"));
  const nowIso = new Date().toISOString();

  // 事前プレビュー/クローラの誤検知を避けるため、HEAD と bot UA は計測せずにリダイレクトのみ行う
  const shouldSkipLogging = req.method === "HEAD" || isLikelyBotUserAgent(userAgent);

  const refFromQuery = String(req.query?.ref || "").trim();
  const ref = refFromQuery || extractRefFromDestination(destination) || "";
  const lang = normalizeLang(req.query?.lang);
  const angle = String(req.query?.angle || "").toLowerCase().trim().slice(0, 20) || null;
  const handle = sanitizeHandle(req.query?.handle);
  const authorId = String(req.query?.author_id || ref || "").trim() || null;
  const source = sanitizeSource(req.query?.source);

  if (!shouldSkipLogging && kv) {
    try {
      await updateRefClickAggregate({
        ref,
        lang,
        angle,
        handle: handle || null,
        authorId,
        source,
        clickedAt: nowIso
      });
      if (ref) await appendRefIfAbsent(ref);

      await appendClickEvent({
        ref: ref || null,
        authorId,
        handle: handle || null,
        lang,
        angle,
        source,
        clickedAt: nowIso,
        ip: forwardedFor || null,
        proto: forwardedProto || null,
        ua: String(userAgent || "").slice(0, 300)
      });

      await kv.incr(KV_KEY_CLICK_TOTAL);
      await kv.expire(KV_KEY_CLICK_TOTAL, CLICK_TTL_SECONDS);
      await kv.incr(KV_KEY_CLICK_LANG(lang));
      await kv.expire(KV_KEY_CLICK_LANG(lang), CLICK_TTL_SECONDS);
    } catch (e) {
      console.warn("[affiliate-recruit-click] logging failed:", e?.message);
    }
  }

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  return res.redirect(302, destination);
};
