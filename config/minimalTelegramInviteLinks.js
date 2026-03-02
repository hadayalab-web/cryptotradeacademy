/**
 * 無料版（Minimal Version）Telegram チャンネル招待リンク
 * X 投稿などで「無料ブリーフィングはTGで」リードマグネット用
 */
const MINIMAL_TELEGRAM_INVITE_LINKS = {
  en: "https://t.me/cryptotradeacademytrialenglish",
  es: "https://t.me/cryptotradeacademytrialspanish",
  "pt-br": "https://t.me/cryptotradeacademytrialportugues",
  ar: "https://t.me/cryptotradeacademytriaarabic",
  ko: "https://t.me/cryptotradeacademytrialkorean",
  ja: "https://t.me/cryptotradeacademytrialjapanese"
};

function getMinimalTelegramInviteLink(lang) {
  const normalized = (lang || "en").toLowerCase().replace("_", "-");
  return MINIMAL_TELEGRAM_INVITE_LINKS[normalized] || MINIMAL_TELEGRAM_INVITE_LINKS.en;
}

module.exports = {
  MINIMAL_TELEGRAM_INVITE_LINKS,
  getMinimalTelegramInviteLink
};
