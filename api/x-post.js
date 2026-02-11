/**
 * Trap Defence OS — X投稿統合API
 * Cron: /api/x-post?lang=ja&mode=minimal
 * Grok/GrokPool/KV版廃止、gpt-5-mini 統合
 */

const { generateAndSaveXPost } = require("../services/ai/gpt5mini");
const { pickVidalyticsLink, getLinkKind } = require("../config/quoteRepostStateless");
const { postTweet } = require("../services/x/client");
const { getXConfigStatus } = require("../services/x/config");

const LANGS = ["ja", "en", "es", "pt", "ko", "ar"];
const MODES = ["minimal", "regular"];

function normalizeLang(v) {
  const s = String(v || "").trim().toLowerCase();
  if (s === "pt-br") return "pt";
  return LANGS.includes(s) ? s : "en";
}

function getLangFromHour() {
  const h = new Date().getUTCHours();
  return LANGS[h % LANGS.length];
}

function normalizeMode(v) {
  const s = String(v || "").trim().toLowerCase();
  return MODES.includes(s) ? s : "minimal";
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const lang = normalizeLang(req.query?.lang || getLangFromHour());
  const explicitMode = req.query?.mode ? normalizeMode(req.query.mode) : null;
  const postToX = req.query?.post === "true" || req.query?.post === "1";
  const dryRun = req.query?.dry_run === "true" || req.query?.dry_run === "1";

  // mode 未指定時: tier=mixed で 70% regular / 30% minimal に揃える
  let mode;
  const videoUrl = pickVidalyticsLink(lang, explicitMode || "mixed");
  if (explicitMode) {
    mode = explicitMode;
  } else {
    mode = getLinkKind(lang, videoUrl);
  }
  const runId = `xp-${lang}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const result = await generateAndSaveXPost({
      mode,
      language: lang,
      video_url: videoUrl
    });

    const payload = {
      ok: true,
      runId,
      lang,
      mode,
      variant: result.variant,
      body: result.body,
      saved: result.saved?.ok ?? false
    };

    if (postToX && !dryRun) {
      const xStatus = getXConfigStatus();
      if (!xStatus.configured || !xStatus.postingEnabled) {
        payload.posted = false;
        payload.error = "X API not configured or posting disabled";
      } else {
        try {
          const postResult = await postTweet(result.body);
          payload.posted = true;
          payload.tweetId = postResult?.id;
        } catch (e) {
          payload.posted = false;
          payload.error = e.message;
          payload.ok = false;
        }
      }
    } else if (dryRun) {
      payload.dryRun = true;
    }

    return res.status(200).json(payload);
  } catch (e) {
    console.error(`[x-post] ${runId} error:`, e.message);
    return res.status(500).json({
      ok: false,
      runId,
      error: e.message
    });
  }
};
