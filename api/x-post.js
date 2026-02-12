/**
 * Trap Defence OS — X投稿統合API
 * Cron: /api/x-post?lang=ja&mode=minimal
 * ?use_td=1 で Supabase td_* (辞書・公式文脈) をプロンプトに付与
 */

const { generateAndSaveXPost } = require("../services/ai/gpt5mini");
const { pickVidalyticsLink, getLinkKind } = require("../config/quoteRepostStateless");
const { postTweet } = require("../services/x/client");
const { getXConfigStatus } = require("../services/x/config");
const {
  getTdInfluencers,
  getTdOfficialAccounts,
  getTdEmotionDictionary,
  insertTdCopyArchive,
  insertTdCopyMeta,
  inferCopyMeta
} = require("../utils/supabase");

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
  const useTd = req.query?.use_td === "1" || req.query?.use_td === "true";

  // mode 未指定時: tier=mixed で 70% regular / 30% minimal に揃える
  let mode;
  const videoUrl = pickVidalyticsLink(lang, explicitMode || "mixed");
  if (explicitMode) {
    mode = explicitMode;
  } else {
    mode = getLinkKind(lang, videoUrl);
  }
  const runId = `xp-${lang}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Supabase td_* 連携: 辞書・公式 org_type 文脈を付与
  let tdContext = {};
  if (useTd) {
    const useOfficial = Math.random() < 0.5;
    if (useOfficial) {
      const officials = await getTdOfficialAccounts(null, 50);
      const pick = officials[Math.floor(Math.random() * officials.length)];
      if (pick) tdContext.orgType = pick.org_type;
    }
    const dict = await getTdEmotionDictionary(null, lang, 10);
    tdContext.dictionaryPhrases = dict.map((d) => d.phrase).filter(Boolean);
  }

  try {
    const result = await generateAndSaveXPost({
      mode,
      language: lang,
      video_url: videoUrl,
      orgType: tdContext.orgType,
      dictionaryPhrases: tdContext.dictionaryPhrases
    });

    if (useTd && result.body) {
      await insertTdCopyArchive({ text: result.body, lang, mode });
      const meta = inferCopyMeta(result.body, mode, lang);
      await insertTdCopyMeta(meta);
    }

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
