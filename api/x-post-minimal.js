// api/x-post-minimal.js
// TGで配信している無料版（Minimal Version）をそのままXの自アカウントに投稿する。1日4回×6言語（TGの4期配信に合わせる）。

require("../utils/suppressKnownWarnings");
const { getKV } = require("../utils/kv");
const { postTweet } = require("../services/x/client");
const { getMinimalTelegramInviteLink } = require("../config/minimalTelegramInviteLinks");

const SUPPORTED_LANGS = ["en", "es", "pt-br", "ar", "ja", "ko"];
const RUNS_PER_DAY = 4;
const DELAY_BETWEEN_TWEETS_MS = 45 * 1000; // 45秒（レート制限対策）
const X_LONG_POST_MAX = 25000;

function countKeyForDate(dateStr) {
  return `x_post_minimal:runs:${dateStr}`;
}

function loadMinimalFormatter(lang) {
  try {
    const mod = require(`../services/telegram/messages/user/${lang}/minimal-high-quality.${lang}`);
    return mod.formatMinimalBriefing || mod.formatMinimalBriefingOSv26 || null;
  } catch (e) {
    const en = require("../services/telegram/messages/user/en/minimal-high-quality.en");
    return en.formatMinimalBriefing || en.formatMinimalBriefingOSv26 || null;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.authorization;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const kv = getKV();
  if (!kv) {
    return res.status(503).json({ error: "KV not available" });
  }

  const hasXAuth =
    process.env.X_API_CONSUMER_KEY &&
    process.env.X_API_CONSUMER_KEY_SECRET &&
    process.env.X_API_ACCESS_TOKEN &&
    process.env.X_API_ACCESS_TOKEN_SECRET;
  if (!hasXAuth) {
    return res.status(503).json({ error: "X API credentials not configured" });
  }

  if (process.env.X_POST_MINIMAL_ENABLED === "0") {
    return res.status(200).json({ ok: true, skipped: true, reason: "X_POST_MINIMAL_ENABLED=0" });
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const countKey = countKeyForDate(dateStr);
  const runsToday = parseInt(await kv.get(countKey) || "0", 10);
  if (runsToday >= RUNS_PER_DAY) {
    return res.status(200).json({
      ok: true,
      skipped: true,
      reason: `Already ran ${RUNS_PER_DAY} times today`,
      date: dateStr,
      runsToday
    });
  }

  let payload = await kv.get("btc:snapshot") || await kv.get("btc:snapshot:early");
  if (!payload) {
    payload = await kv.get("minimal:btc:latest");
  }
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch (e) {
      console.error("[X Post Minimal] Failed to parse payload:", e.message);
    }
  }

  if (!payload) {
    return res.status(503).json({
      error: "No snapshot in KV. Run /api/cron or wait for minimal-tg-delivery."
    });
  }

  const results = { posted: [], errors: [] };
  const CTA_BY_LANG = {
    en: "Get daily briefings on Telegram →",
    es: "Recibe el briefing en Telegram →",
    "pt-br": "Receba o briefing no Telegram →",
    ar: "اقرأ الملخص على تليجرام ←",
    ja: "続きはTGチャンネルで →",
    ko: "전체 브리핑은 텔레그램에서 →"
  };

  for (let i = 0; i < SUPPORTED_LANGS.length; i++) {
    const lang = SUPPORTED_LANGS[i];
    try {
      const formatMinimal = loadMinimalFormatter(lang);
      if (!formatMinimal || typeof formatMinimal !== "function") {
        results.errors.push({ lang, error: "No formatter" });
        continue;
      }
      let text = formatMinimal(payload, lang);
      if (!text || !text.trim()) {
        results.errors.push({ lang, error: "Empty content" });
        continue;
      }
      const link = getMinimalTelegramInviteLink(lang);
      const cta = CTA_BY_LANG[lang] || CTA_BY_LANG.en;
      const footer = `\n\n${cta} ${link}`;
      if (text.length + footer.length <= X_LONG_POST_MAX) {
        text = text.trim() + footer;
      }
      const result = await postTweet(text);
      results.posted.push({ lang, tweetId: result?.id });
      console.log("[X Post Minimal] Posted", lang, result?.id ?? "N/A");
      if (i < SUPPORTED_LANGS.length - 1) {
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_TWEETS_MS));
      }
    } catch (err) {
      console.error("[X Post Minimal] Error", lang, err.message);
      results.errors.push({ lang, error: err.message });
    }
  }

  if (results.posted.length > 0) {
    const newRuns = runsToday + 1;
    await kv.set(countKey, String(newRuns), { ex: 86400 * 2 });
  }

  return res.status(200).json({
    ok: true,
    date: dateStr,
    posted: results.posted.length,
    errors: results.errors.length,
    runsToday: runsToday + (results.posted.length > 0 ? 1 : 0),
    maxRunsPerDay: RUNS_PER_DAY,
    details: results
  });
};
