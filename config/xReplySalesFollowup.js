/**
 * Xリプライ直販 48h後フォローメッセージ（「ご検討いかがでしたか？」）
 */
const { normalizeReplyLang } = require("./xReplySalesStrategy");

const FOLLOWUP_MESSAGE_BY_LANG = {
  en: "How's your consideration going? If you have any questions about Trap Defence, just reply here.",
  ja: "ご検討いかがでしたか？Trap Defenceで気になる点があれば、このDMに返信ください。",
  ko: "검토해 보셨나요? Trap Defence 관련해서 궁금한 점 있으시면 이 DM으로 답장 주세요.",
  es: "¿Has podido considerarlo? Si tienes dudas sobre Trap Defence, responde a este DM.",
  pt: "Conseguiu considerar? Se tiver dúvidas sobre o Trap Defence, responda neste DM.",
  ar: "هل تمكنت من التفكير في الأمر؟ إن كان لديك سؤال عن Trap Defence، رد على هذا الـ DM."
};

function getFollowupMessage(lang) {
  const normalized = normalizeReplyLang(lang);
  return FOLLOWUP_MESSAGE_BY_LANG[normalized] || FOLLOWUP_MESSAGE_BY_LANG.en;
}

module.exports = {
  FOLLOWUP_MESSAGE_BY_LANG,
  getFollowupMessage
};
