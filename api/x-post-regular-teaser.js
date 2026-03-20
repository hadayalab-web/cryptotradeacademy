// api/x-post-regular-teaser.js
// Regular briefing "chirashi" → X (6 languages). Zeigarnik: cut before data-backed block + hook + CTA.
// Same KV snapshot keys as x-post-minimal; schedule offset from Minimal cron to reduce burst.

require("../utils/suppressKnownWarnings");
const { getKV } = require("../utils/kv");
const { postTweet, replyToTweet } = require("../services/x/client");
const {
  SUPPORTED_LANGS,
  composeRegularBriefingForXAutoPost,
} = require("../services/social/regularPublicTeaserCore.js");
const { buildRegularTeaserReply } = require("../services/social/regularPublicTeaserReply.js");

/** Pause between parent tweet and reply (ms) */
const DELAY_BEFORE_REPLY_MS = 3500;

const RUNS_PER_DAY = 4;
const DELAY_BETWEEN_TWEETS_MS = 45 * 1000;
const X_LONG_POST_MAX = 25000;

function countKeyForDate(dateStr) {
  return `x_post_regular_teaser:runs:${dateStr}`;
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

  if (process.env.X_POST_REGULAR_TEASER_ENABLED === "0") {
    return res.status(200).json({
      ok: true,
      skipped: true,
      reason: "X_POST_REGULAR_TEASER_ENABLED=0",
    });
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
      runsToday,
    });
  }

  let payload =
    (await kv.get("btc:snapshot")) ||
    (await kv.get("btc:snapshot:early")) ||
    (await kv.get("minimal:btc:latest"));
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch (e) {
      console.error("[X Post Regular Teaser] Failed to parse payload:", e.message);
      payload = null;
    }
  }

  const useLive =
    process.env.REGULAR_TEASER_USE_LIVE_SNAPSHOT !== "0" &&
    payload &&
    typeof payload === "object" &&
    payload.raw != null;

  const langs = SUPPORTED_LANGS.filter(Boolean);
  const results = { posted: [], errors: [] };

  for (let i = 0; i < langs.length; i++) {
    const lang = langs[i];
    try {
      const { text, mode } = composeRegularBriefingForXAutoPost(
        lang,
        useLive ? payload : null,
        { useLiveSnapshot: useLive }
      );
      if (!text || !text.trim()) {
        results.errors.push({ lang, error: "Empty content" });
        continue;
      }
      if (text.length > X_LONG_POST_MAX) {
        results.errors.push({
          lang,
          error: `Too long: ${text.length} > ${X_LONG_POST_MAX}`,
        });
        continue;
      }
      const result = await postTweet(text);
      let replyId = null;
      const replyText = buildRegularTeaserReply(lang);
      if (result?.id && replyText) {
        await new Promise((r) => setTimeout(r, DELAY_BEFORE_REPLY_MS));
        const replyRes = await replyToTweet(replyText, result.id);
        replyId = replyRes?.id ?? null;
        console.log("[X Post Regular Teaser] Reply", lang, replyId ?? "N/A");
      }
      results.posted.push({
        lang,
        mode,
        tweetId: result?.id,
        replyId,
      });
      console.log("[X Post Regular Teaser] Posted", lang, mode, result?.id ?? "N/A");
      if (i < langs.length - 1) {
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_TWEETS_MS));
      }
    } catch (err) {
      console.error("[X Post Regular Teaser] Error", lang, err.message);
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
    useLiveSnapshot: useLive,
    posted: results.posted.length,
    errors: results.errors.length,
    runsToday: runsToday + (results.posted.length > 0 ? 1 : 0),
    maxRunsPerDay: RUNS_PER_DAY,
    details: results,
  });
};
