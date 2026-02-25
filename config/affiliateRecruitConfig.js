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

/**
 * 言語別 FirstPromoter 招待 URL の env キー（Vercel で FIRSTPROMOTER_INVITE_URL_EN 等を設定している場合に使用）
 */
function getFirstPromoterInviteUrlEnvKey(lang) {
  if (!lang || typeof lang !== "string") return null;
  const key = `FIRSTPROMOTER_INVITE_URL_${lang.toUpperCase()}`;
  return process.env[key] ? key : null;
}

/**
 * FirstPromoter 招待 URL。ref を渡すと DM→登録の紐づけ用にクエリに付与する（v2.0 ref対応）
 * 優先: FIRSTPROMOTER_INVITE_URL_XX（言語別）→ FIRSTPROMOTER_INVITE_URL → firstpromoter.com
 * @param {string} [lang="en"]
 * @param {{ ref?: string }} [options] - ref: X の author_id（送信先識別子）
 */
function getFirstPromoterInviteUrl(lang = "en", options = {}) {
  const langKey = getFirstPromoterInviteUrlEnvKey(lang);
  const base =
    (langKey && process.env[langKey]) ||
    process.env.FIRSTPROMOTER_INVITE_URL ||
    "https://firstpromoter.com";
  const params = new URLSearchParams();
  if (!langKey && lang && lang !== "en") params.set("lang", lang);
  if (options.ref) params.set("ref", String(options.ref));
  const qs = params.toString();
  return qs ? `${base}${base.includes("?") ? "&" : "?"}${qs}` : base;
}

function getWhopAffiliateProgramUrl(lang = "en") {
  const base = process.env.WHOP_AFFILIATE_PROGRAM_URL || "https://whop.com/affiliates";
  const langParam = lang && lang !== "en" ? `?lang=${lang}` : "";
  return base + langParam;
}

/**
 * X プロフィールの「ウェブサイト」欄に貼る FirstPromoter 招待 URL（1本のみ）。
 * 優先: FIRSTPROMOTER_INVITE_URL_EN → FIRSTPROMOTER_INVITE_URL → firstpromoter.com。utm_source=x_profile で出所識別。
 */
function getFirstPromoterProfileUrl() {
  const base =
    process.env.FIRSTPROMOTER_INVITE_URL_EN ||
    process.env.FIRSTPROMOTER_INVITE_URL ||
    "https://firstpromoter.com";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}utm_source=x_profile`;
}

/** 日次 DM 送信上限。0 または未設定 = 制限なし。正の数でキャップをかける（過去の 15 は廃止） */
const AFFILIATE_DM_DAILY_CAP = Number(process.env.AFFILIATE_DM_DAILY_CAP || 0);
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
  getFirstPromoterProfileUrl,
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
