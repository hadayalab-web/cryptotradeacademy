// api/x-post-minimal.js
// 1日1回、無料版（Minimal Version）を6言語フル本文でXに投稿し、各ツイートでTGチャンネルへ誘導（リードマグネット）

require("../utils/suppressKnownWarnings");
const { getKV } = require("../utils/kv");
const { postTweet } = require("../services/x/client");
const { getMinimalTelegramInviteLink } = require("../config/minimalTelegramInviteLinks");

const SUPPORTED_LANGS = ["en", "es", "pt-br", "ar", "ja", "ko"];
const KV_KEY_POSTED_AT = "x_post_minimal:last_date";
const DELAY_BETWEEN_TWEETS_MS = 2 * 60 * 1000; // 2分（レート制限対策）
const X_LONG_POST_MAX = 25000; // X API 上限

function loadMinimalFormatter(lang) {
  try {
    const mod = require(`../services/telegram/messages/user/${lang}/minimal-high-quality.${lang}`);
    return mod.formatMinimalBriefing || mod.formatMinimalBriefingOSv26 || null;
  } catch (e) {
    const en = require("../services/telegram/messages/user/en/minimal-high-quality.en");
    return en.formatMinimalBriefing || en.formatMinimalBriefingOSv26 || null;
  }
}

/** 言語ごとの「無料で毎日受け取る」CTA（フル投稿の末尾に付与） */
const CTA_LABELS = {
  en: "Free daily briefing →",
  es: "Briefing diario gratis →",
  "pt-br": "Briefing diário grátis →",
  ar: "نشرة يومية مجانية ←",
  ja: "無料で毎日受け取る →",
  ko: "매일 무료 브리핑 →"
};

/**
 * 6言語フル版：Minimal 全文 + TG招待リンクを組み立て（minimal-tg-delivery と同じフォーマッタ使用）
 */
function buildFullMinimalTweet(lang, payload) {
  const formatMinimal = loadMinimalFormatter(lang);
  if (!formatMinimal || typeof formatMinimal !== "function") {
    return null;
  }
  const fullText = formatMinimal(payload, lang);
  if (!fullText || !fullText.trim()) return null;
  const cta = CTA_LABELS[lang] || CTA_LABELS.en;
  const link = getMinimalTelegramInviteLink(lang);
  const withCta = `${fullText.trim()}\n\n${cta} ${link}`;
  if (withCta.length > X_LONG_POST_MAX) {
    return `${fullText.trim()}\n\n${link}`;
  }
  return withCta;
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

  const dateStr = new Date().toISOString().slice(0, 10);
  const alreadyPosted = await kv.get(KV_KEY_POSTED_AT);
  if (alreadyPosted === dateStr) {
    return res.status(200).json({
      ok: true,
      skipped: true,
      reason: "Already posted today",
      date: dateStr
    });
  }

  let payload = await kv.get("btc:snapshot") || await kv.get("btc:snapshot:early");
  if (!payload) {
    payload = await kv.get("minimal:btc:latest");
  }
  if (!payload) {
    return res.status(503).json({
      error: "No snapshot in KV. Run /api/cron or wait for minimal-tg-delivery."
    });
  }

  const hasXAuth =
    process.env.X_API_CONSUMER_KEY &&
    process.env.X_API_CONSUMER_KEY_SECRET &&
    process.env.X_API_ACCESS_TOKEN &&
    process.env.X_API_ACCESS_TOKEN_SECRET;
  if (!hasXAuth) {
    return res.status(503).json({ error: "X API credentials not configured" });
  }

  const enableXPost = process.env.X_POST_MINIMAL_ENABLED !== "0";
  if (!enableXPost) {
    return res.status(200).json({ ok: true, skipped: true, reason: "X_POST_MINIMAL_ENABLED=0" });
  }

  const results = { posted: [], errors: [] };

  for (let i = 0; i < SUPPORTED_LANGS.length; i++) {
    const lang = SUPPORTED_LANGS[i];
    try {
      const text = buildFullMinimalTweet(lang, payload);
      if (!text || !text.trim()) {
        results.errors.push({ lang, error: "No formatter or empty content" });
        continue;
      }
      const result = await postTweet(text);
      results.posted.push({ lang, tweetId: result?.id });
      console.log(`[X Post Minimal] Posted full ${lang}:`, result?.id ?? "N/A");
      if (i < SUPPORTED_LANGS.length - 1) {
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_TWEETS_MS));
      }
    } catch (err) {
      console.error(`[X Post Minimal] Error ${lang}:`, err.message);
      results.errors.push({ lang, error: err.message });
    }
  }

  if (results.posted.length > 0) {
    await kv.set(KV_KEY_POSTED_AT, dateStr, { ex: 86400 * 2 });
  }

  return res.status(200).json({
    ok: true,
    date: dateStr,
    posted: results.posted.length,
    errors: results.errors.length,
    details: results
  });
};
