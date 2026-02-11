/**
 * Trap Defence X Repost OS — Stateless 設定・ヘルパー
 * KV 禁止・完全 stateless・Search → Pick → Shoot
 */

// ========================================
// VIDALYTICS_LINKS（Minimal / Regular × 6言語）
// ========================================
const VIDALYTICS_LINKS = {
  minimal: {
    en: "https://preview.vidalytics.com/vid/r7EVEIvFx66Nj3dp",
    es: "https://preview.vidalytics.com/vid/C7qhJZh6N8reco2h",
    pt: "https://preview.vidalytics.com/vid/0uqYb_5TWoSfBl6Y",
    ar: "https://preview.vidalytics.com/vid/rBzQDrGv2xSyZKtK",
    ko: "https://preview.vidalytics.com/vid/OQNbnGJNtF6_W5zC",
    ja: "https://preview.vidalytics.com/vid/iQUVsxj5j522r_sf",
  },
  regular: {
    en: "https://preview.vidalytics.com/vid/r7EVEIvFx66Nj3dp",
    es: "https://preview.vidalytics.com/vid/Sn0Ksfoqayhn19Hu",
    pt: "https://preview.vidalytics.com/vid/4nFpiTEQLXbOruxk",
    ar: "https://preview.vidalytics.com/vid/E3_5s_i7QfqcZnkm",
    ko: "https://preview.vidalytics.com/vid/7SP9FG5F9ox6PNYS",
    ja: "https://preview.vidalytics.com/vid/ksCwzN2p2nOGUSso",
  },
};

function pickVidalyticsLink(lang, tier = "mixed") {
  const normalLang = lang === "pt-br" ? "pt" : lang;
  if (tier === "regular") return VIDALYTICS_LINKS.regular[normalLang] ?? VIDALYTICS_LINKS.regular.en;
  if (tier === "minimal") return VIDALYTICS_LINKS.minimal[normalLang] ?? VIDALYTICS_LINKS.minimal.en;
  const roll = Math.random();
  return roll < 0.8
    ? (VIDALYTICS_LINKS.regular[normalLang] ?? VIDALYTICS_LINKS.regular.en)
    : (VIDALYTICS_LINKS.minimal[normalLang] ?? VIDALYTICS_LINKS.minimal.en);
}

// ========================================
// SEARCH_CONFIG + buildSearchQuery
// ========================================
const SEARCH_CONFIG = {
  en: { minFaves: 80, minRt: 15 },
  ja: { minFaves: 50, minRt: 10 },
  es: { minFaves: 40, minRt: 8 },
  pt: { minFaves: 40, minRt: 8 },
  ko: { minFaves: 50, minRt: 10 },
  ar: { minFaves: 30, minRt: 5 },
};

function buildSearchQuery(lang) {
  const normalLang = lang === "pt-br" ? "pt" : lang;
  const cfg = SEARCH_CONFIG[normalLang] ?? SEARCH_CONFIG.en;
  return `lang:${normalLang} -is:reply -is:quote -is:retweet min_faves:${cfg.minFaves} min_retweets:${cfg.minRt}`;
}

// ========================================
// 6言語テンプレ
// ========================================
const TEMPLATES_JA = [
  "この動きでダッシュボード真っ赤になってる人、多い。数字で見ると状況が掴める。→ {link}",
  "この反応、気づかないと後で後悔するやつ。必要な数字だけまとめた。→ {link}",
  "この変化、今のうちに位置だけ確認しとくと安心。短く整理した。→ {link}",
  "この動き、まだ巻き返し効く。数字で見るとわかる。→ {link}",
];

const TEMPLATES_EN = [
  "If your dashboard's all red from this move, see the numbers. → {link}",
  "This reaction—easy to miss, hard to regret later. Numbers inside. → {link}",
  "This change—check your position now. Quick summary. → {link}",
  "Still time to recover. Numbers tell the story. → {link}",
];

const TEMPLATES_ES = [
  "Este movimiento dejó muchos paneles en rojo. Ver los números ayuda a aclarar. → {link}",
  "Esta reacción es fácil de pasar por alto. Resumen rápido con datos. → {link}",
  "Este cambio merece revisar tu posición ahora. Datos esenciales aquí. → {link}",
  "Aún hay margen para recuperarse. Los números lo muestran. → {link}",
];

const TEMPLATES_PT = [
  "Esse movimento deixou muitos painéis vermelhos. Ver os números acalma. → {link}",
  "Essa reação passa fácil despercebida. Resumo curto com dados. → {link}",
  "Essa mudança pede uma checagem rápida da sua posição. → {link}",
  "Ainda dá para recuperar. Os números mostram isso. → {link}",
];

const TEMPLATES_KO = [
  "이 움직임에 계좌가 새빨개진 사람 많아요. 숫자로 보면 정리가 됩니다. → {link}",
  "이 반응은 놓치기 쉽지만 나중에 아쉬울 수 있어요. 핵심만 정리했습니다. → {link}",
  "지금 위치만 확인해도 마음이 한결 편해집니다. → {link}",
  "아직 회복 여지는 있습니다. 숫자가 말해줍니다. → {link}",
];

const TEMPLATES_AR = [
  "هذا التحرك جعل شاشات كثيرين حمراء. رؤية الأرقام توضح الصورة. → {link}",
  "هذا التفاعل سهل أن يفوتك، لكن الأرقام تلخصه بسرعة. → {link}",
  "هذا التغير يستحق أن تراجع موقعك الآن. ملخص مختصر هنا. → {link}",
  "ما زال هناك مجال للتعافي. الأرقام توضح ذلك. → {link}",
];

function getTemplatesForLang(lang) {
  const normalLang = lang === "pt-br" ? "pt" : lang;
  switch (normalLang) {
    case "ja": return TEMPLATES_JA;
    case "en": return TEMPLATES_EN;
    case "es": return TEMPLATES_ES;
    case "pt": return TEMPLATES_PT;
    case "ko": return TEMPLATES_KO;
    case "ar": return TEMPLATES_AR;
    default: return TEMPLATES_EN;
  }
}

function buildBody(lang, index, tier = "mixed") {
  const templates = getTemplatesForLang(lang);
  const tpl = templates[index % templates.length];
  return tpl.replace("{link}", pickVidalyticsLink(lang, tier));
}

// ========================================
// スコアリング（最適化版）
// ========================================
function scoreTweet(t) {
  const m = t.public_metrics ?? {};
  const likes = m.like_count ?? 0;
  const rts = m.retweet_count ?? 0;
  const replies = m.reply_count ?? 0;
  const quotes = m.quote_count ?? 0;
  const ageMinutes = (Date.now() - new Date(t.created_at || 0).getTime()) / 60000;
  const freshness = 1 / (1 + ageMinutes / 60);
  return (likes * 1.0 + rts * 2.0 + replies * 1.5 + quotes * 1.2) * freshness;
}

function pickTopN(tweets, n) {
  return [...tweets].sort((a, b) => scoreTweet(b) - scoreTweet(a)).slice(0, n);
}

module.exports = {
  VIDALYTICS_LINKS,
  pickVidalyticsLink,
  SEARCH_CONFIG,
  buildSearchQuery,
  getTemplatesForLang,
  buildBody,
  scoreTweet,
  pickTopN,
};
