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

// EN 実行時刻（UTC）。従来モード用（mode 指定なし /api/affiliate-recruit-run 互換）。
const EN_RECRUIT_HOURS = [0, 4, 8, 12, 16, 20];

/** EN キューライン: 1h ごとリスト取得・15 分ごと送信。docs/AFFILIATE_RECRUIT_EN_LINE_SPEC.md */
const EN_QUEUE_LIST_HOURS_UTC = Array.from({ length: 24 }, (_, hour) => hour);
/** EN リスト取得ページ数（1実行あたり）。1h 補充の既定は 1 ページ、env で調整可。 */
const EN_QUEUE_LIST_PAGES = Math.max(1, Number(process.env.EN_RECRUIT_LIST_PAGES || 1));
/** 0 = キャップなし（枯渇まで送信）。正の値で日次成功数上限。 */
const EN_QUEUE_DAILY_CAP = Number(process.env.EN_RECRUIT_DAILY_CAP || 0);
const EN_QUEUE_403_BREAKER_PER_15MIN = Number(process.env.EN_RECRUIT_403_BREAKER || 22);
/** EN: 1時間補充向けに窓90分（重複を抑えつつ供給を確保）。 */
const EN_SEARCH_WINDOW_MINUTES = Number(process.env.EN_SEARCH_WINDOW_MIN || 90);
/** 他地域: 1日1回実行 → EN同様「1回の窓で1日分をカバー」に揃え、24時間。 */
const REGION_SEARCH_WINDOW_MINUTES = Number(process.env.REGION_SEARCH_WINDOW_MIN || 1440);
/** 他地域リスト取得ページ数（1実行あたり）。候補不足対策でデフォルト2、envで調整可。 */
const REGION_QUEUE_LIST_PAGES = Math.max(1, Number(process.env.REGION_RECRUIT_LIST_PAGES || 2));
/** 全言語共通: スロットあたりの送信成功目標。403 は次候補へ進み、この数だけ成功するまで試行（Read 1・多ページで候補確保） */
/** 1 ランあたり送信成功 10 件をマストで達成するための目標値。#4 で根拠明記。 */
const RECRUIT_BATCH_SIZE_DEFAULT = 10;
/** EN スロット用 */
const EN_RECRUIT_BATCH_SIZE = Number(process.env.EN_RECRUIT_BATCH_SIZE || RECRUIT_BATCH_SIZE_DEFAULT);

/** 各 UTC 時刻に対応する言語（vercel.json の affiliate-recruit-regions の cron と対応）。スロット数は運用指示。送信成功目標10以外はどうでもよい。 */
const SLOTS_BY_UTC_HOUR = {
  12: Array(10).fill("ja"),
  13: Array(10).fill("ko"),
  17: Array(10).fill("ar"),
  21: Array(10).fill("es"),
  22: Array(10).fill("pt")
};

function getNextRecruitLangForUtcHour(utcHour, indexInHour) {
  const slots = SLOTS_BY_UTC_HOUR[utcHour];
  if (!slots || indexInHour < 0 || indexInHour >= slots.length) return null;
  return slots[indexInHour];
}

module.exports = {
  AFFILIATE_RECRUIT_LANGS,
  AFFILIATE_LANG_NAMES,
  getFirstPromoterInviteUrl,
  getFirstPromoterProfileUrl,
  getWhopAffiliateProgramUrl,
  EN_RECRUIT_HOURS,
  EN_SEARCH_WINDOW_MINUTES,
  REGION_SEARCH_WINDOW_MINUTES,
  EN_QUEUE_LIST_PAGES,
  REGION_QUEUE_LIST_PAGES,
  EN_RECRUIT_BATCH_SIZE,
  RECRUIT_BATCH_SIZE_DEFAULT,
  EN_QUEUE_LIST_HOURS_UTC,
  EN_QUEUE_DAILY_CAP,
  EN_QUEUE_403_BREAKER_PER_15MIN,
  SLOTS_BY_UTC_HOUR,
  getNextRecruitLangForUtcHour
};
