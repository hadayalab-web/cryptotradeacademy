/**
 * Telegram 管理者スカウト用メッセージ取得 API
 * GET ?lang=es&handle=AdminName&channel=ChannelName&inviteUrl=https://...
 * 戻り: firstMessage（一通目）, kit（OK 後キット）. kitOnly=1 のとき kit のみ。
 */
const {
  fillScoutFirstMessage,
  fillScoutKit,
  getSearchKeywords,
  TARGET_CHANNEL_SIZE,
  LEAD_SCORING_KEYWORDS
} = require("../config/telegramScoutTemplates");
const { getScout30Message } = require("../config/telegramScout30Templates");
const { getFirstPromoterInviteUrl } = require("../config/affiliateRecruitConfig");

const SUPPORTED_LANGS = ["en", "es", "pt", "ko", "ar", "ja", "vi"];

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const lang = (req.query.lang || "en").toLowerCase().split("-")[0];
  const handle = String(req.query.handle || "").trim();
  const channel = String(req.query.channel || req.query.channelName || "").trim();
  const inviteUrl = String(
    req.query.inviteUrl || getFirstPromoterInviteUrl(lang)
  ).trim();
  const kitOnly = req.query.kitOnly === "1" || req.query.kitOnly === "true";
  const variation = req.query.variation === "random" ? "random" : Math.max(0, parseInt(req.query.variation, 10) || 0);
  const template30 = req.query.template30 === "1" || req.query.template30 === "true";
  const category = String(req.query.category || "Admin").trim();
  const market = (req.query.market || "").trim() || undefined;

  const resolvedLang = SUPPORTED_LANGS.includes(lang) ? lang : "en";
  const options = { handle, Channel_Name: channel || "{Channel_Name}", inviteUrl };

  const firstMessage = kitOnly ? null : fillScoutFirstMessage(resolvedLang, options, variation);
  const kit = fillScoutKit(resolvedLang, { inviteUrl });

  const payload = {
    lang: resolvedLang,
    searchKeywords: getSearchKeywords(resolvedLang),
    targetChannelSize: TARGET_CHANNEL_SIZE,
    leadScoringKeywords: LEAD_SCORING_KEYWORDS[resolvedLang] || LEAD_SCORING_KEYWORDS.en
  };
  if (firstMessage) payload.firstMessage = firstMessage;
  payload.kit = kit;

  if (template30) {
    const msg30 = getScout30Message(lang, category, market);
    payload.message30 = msg30 || null;
    payload.category = category;
    payload.market = market || null;
  }

  return res.status(200).json(payload);
};
