/**
 * First reply under Regular teaser post: LP + Minimal Telegram (per language).
 * URLs from env — see docs/social/REGULAR_PUBLIC_TEASER.md
 */

const { getMinimalTelegramInviteLink } = require("../../config/minimalTelegramInviteLinks");

const INTRO = {
  en: "Where to go next:",
  es: "Siguientes pasos:",
  "pt-br": "Próximos passos:",
  ar: "الخطوة التالية:",
  ko: "다음:",
  ja: "次の一手:",
};

const LP_LINE = {
  en: "🌐 LP / offer →",
  es: "🌐 LP / oferta →",
  "pt-br": "🌐 LP / oferta →",
  ar: "🌐 الصفحة / العرض ←",
  ko: "🌐 랜딩 / 오퍼 →",
  ja: "🌐 LP／オファー →",
};

const TG_LINE = {
  en: "📱 Minimal (Telegram, free) →",
  es: "📱 Minimal (Telegram, gratis) →",
  "pt-br": "📱 Minimal (Telegram, grátis) →",
  ar: "📱 Minimal (تيليجرام، مجاني) ←",
  ko: "📱 Minimal (텔레그램, 무료) →",
  ja: "📱 Minimal（Telegram・無料）→",
};

function lpEnvKeySuffix(lang) {
  const k = String(lang || "en").toLowerCase();
  if (k === "pt-br") return "PT_BR";
  return k.replace(/-/g, "_").toUpperCase();
}

/** Per-language LP, then REGULAR_TEASER_LP_URL fallback */
function getLpUrlForLang(lang) {
  const suffix = lpEnvKeySuffix(lang);
  const specific = process.env[`LP_URL_${suffix}`];
  const raw = (specific || process.env.REGULAR_TEASER_LP_URL || "").trim();
  return raw;
}

/**
 * @param {string} lang - en | es | pt-br | ar | ko | ja
 * @returns {string|null} null if nothing to link
 */
function buildRegularTeaserReply(lang) {
  const lp = getLpUrlForLang(lang);
  let tg = "";
  try {
    tg = getMinimalTelegramInviteLink(lang) || "";
  } catch {
    tg = "";
  }
  tg = String(tg).trim();

  if (!lp && !tg) return null;

  const key = String(lang).toLowerCase() === "pt-br" ? "pt-br" : String(lang).toLowerCase();
  const intro = INTRO[key] || INTRO.en;
  const lpLabel = LP_LINE[key] || LP_LINE.en;
  const tgLabel = TG_LINE[key] || TG_LINE.en;

  const lines = [intro];
  if (lp) lines.push(`${lpLabel} ${lp}`);
  if (tg) lines.push(`${tgLabel} ${tg}`);
  return lines.join("\n");
}

module.exports = {
  buildRegularTeaserReply,
  getLpUrlForLang,
};
