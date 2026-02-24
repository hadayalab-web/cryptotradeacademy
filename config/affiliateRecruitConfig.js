/**
 * アフィリエイトリクルート設定: X DM リクルート → FirstPromoter 登録 → Whop 販売
 * 戦略: docs/AFFILIATE_STRATEGY_X_DM_FIRSTPROMOTER_WHOP.md
 */

/** リクルート対象言語（Whop 6 市場と一致） */
const AFFILIATE_RECRUIT_LANGS = ["en", "es", "pt", "ar", "ko", "ja"];

/** 言語の表示名（DM 文案・ログ用） */
const AFFILIATE_LANG_NAMES = {
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  ar: "Arabic",
  ko: "Korean",
  ja: "Japanese"
};

function getFirstPromoterInviteUrl(lang = "en") {
  const base = process.env.FIRSTPROMOTER_INVITE_URL || "https://firstpromoter.com";
  const langParam = lang && lang !== "en" ? `?lang=${lang}` : "";
  return base + langParam;
}

function getWhopAffiliateProgramUrl(lang = "en") {
  const base = process.env.WHOP_AFFILIATE_PROGRAM_URL || "https://whop.com/affiliates";
  const langParam = lang && lang !== "en" ? `?lang=${lang}` : "";
  return base + langParam;
}

const AFFILIATE_DM_DAILY_CAP = Number(process.env.AFFILIATE_DM_DAILY_CAP || 15);
const EN_RECRUIT_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];
const EN_RECRUIT_BATCH_SIZE = 5;

const DAILY_CAP_BY_LANG_60 = {
  en: 19,
  ja: 19,
  es: 10,
  pt: 5,
  ar: 4,
  ko: 3
};

const AFFILIATE_DM_MIN_INTERVAL_MS = Number(process.env.AFFILIATE_DM_MIN_INTERVAL_MS || 5 * 60 * 1000);

const SLOT_BLOCK_HOURS = [12, 17, 21];
const SLOT_BLOCKS = {
  12: [{ lang: "ja", count: 3 }, { lang: "ko", count: 3 }],
  17: [{ lang: "ar", count: 5 }],
  21: [{ lang: "es", count: 5 }, { lang: "pt", count: 5 }]
};

const SLOTS_BY_UTC_HOUR = {
  12: ["ja", "ja", "ja", "ko", "ko", "ko"],
  17: ["ar", "ar", "ar", "ar", "ar"],
  21: ["es", "es", "es", "es", "es", "pt", "pt", "pt", "pt", "pt"]
};

function getNextRecruitLangForUtcHour(utcHour, indexInHour) {
  const slots = SLOTS_BY_UTC_HOUR[utcHour];
  if (!slots || indexInHour < 0 || indexInHour >= slots.length) return null;
  return slots[indexInHour];
}

const WHOP_MENTION_PATTERNS = [
  "whop.com",
  "whop.com/",
  " whop ",
  "whop affiliate",
  "whopアフィリエイト"
];

function scoreWhopImmune(description = "", tweetTexts = []) {
  const combined = [description, ...(Array.isArray(tweetTexts) ? tweetTexts : [])].join(" ").toLowerCase();
  let count = 0;
  for (const p of WHOP_MENTION_PATTERNS) {
    const needle = p.toLowerCase();
    let idx = combined.indexOf(needle);
    while (idx !== -1) {
      count += 1;
      idx = combined.indexOf(needle, idx + 1);
    }
  }
  const score = count === 0 ? 1 : Math.max(0, 1 - count * 0.3);
  return { count, score };
}

module.exports = {
  AFFILIATE_RECRUIT_LANGS,
  AFFILIATE_LANG_NAMES,
  getFirstPromoterInviteUrl,
  getWhopAffiliateProgramUrl,
  AFFILIATE_DM_DAILY_CAP,
  EN_RECRUIT_HOURS,
  EN_RECRUIT_BATCH_SIZE,
  SLOT_BLOCK_HOURS,
  SLOT_BLOCKS,
  DAILY_CAP_BY_LANG_60,
  AFFILIATE_DM_MIN_INTERVAL_MS,
  SLOTS_BY_UTC_HOUR,
  getNextRecruitLangForUtcHour,
  WHOP_MENTION_PATTERNS,
  scoreWhopImmune
};
