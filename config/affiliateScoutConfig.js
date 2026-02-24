/**
 * アフィリエイトスカウト設定: X DM スカウト → FirstPromoter 登録 → Whop 販売
 * 戦略: docs/AFFILIATE_STRATEGY_X_DM_FIRSTPROMOTER_WHOP.md
 */

/** スカウト対象言語（Whop 6 市場と一致） */
const AFFILIATE_SCOUT_LANGS = ["en", "es", "pt", "ar", "ko", "ja"];

/** 言語の表示名（DM 文案・ログ用） */
const AFFILIATE_LANG_NAMES = {
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  ar: "Arabic",
  ko: "Korean",
  ja: "Japanese"
};

/** FirstPromoter 招待 URL（環境変数で上書き推奨） */
function getFirstPromoterInviteUrl(lang = "en") {
  const base = process.env.FIRSTPROMOTER_INVITE_URL || "https://firstpromoter.com";
  const langParam = lang && lang !== "en" ? `?lang=${lang}` : "";
  return base + langParam;
}

/** Whop アフィリエイトプログラムページ（DM 用）。公式: https://whop.com/affiliates/ */
function getWhopAffiliateProgramUrl(lang = "en") {
  const base = process.env.WHOP_AFFILIATE_PROGRAM_URL || "https://whop.com/affiliates";
  const langParam = lang && lang !== "en" ? `?lang=${lang}` : "";
  return base + langParam;
}

/** DM 送信レート制限: 1日あたりの最大送信数。60 にすると言語別最適化を有効にしやすい */
const AFFILIATE_DM_DAILY_CAP = Number(process.env.AFFILIATE_DM_DAILY_CAP || 15);

/** Cron: 1時間に1回（0 * * * *）。15分間隔だとログが多すぎるため整理済み。vercel.json 参照。 */

/**
 * 1日60本時の言語別配分（合計 60）。AFFILIATE_DM_DAILY_CAP=60 のとき参照。
 * 出典: docs/AFFILIATE_SCOUT_60DM_OPTIMIZATION.md（調査プール比率に基づく案A）
 */
const DAILY_CAP_BY_LANG_60 = {
  en: 19,
  ja: 19,
  es: 10,
  pt: 5,
  ar: 4,
  ko: 3
};

/** DM 送信間隔（ミリ秒）。60本/日なら 10 分推奨。連続送信を避けるための最小間隔 */
const AFFILIATE_DM_MIN_INTERVAL_MS = Number(process.env.AFFILIATE_DM_MIN_INTERVAL_MS || 5 * 60 * 1000); // 5分（60本/日なら 600000 推奨）

/**
 * 言語別ピークに寄せた送付スケジュール（UTC 時 → その時間帯に送る言語の並び）。
 * 60 は目安のため、案A配分を満たす 62 枠を推奨。出典: docs/AFFILIATE_SCOUT_60DM_OPTIMIZATION.md §2.3
 */
const SLOTS_BY_UTC_HOUR = {
  0: ["ja", "ja", "ja", "ja"],
  1: ["ja", "ja", "ja", "ja"],
  2: ["ja", "ja", "ja"],
  3: ["ja", "ja", "ja"],
  4: ["ja", "ja", "ja"],
  5: ["ja", "ja"],
  6: ["ko", "ko", "ko"],
  7: ["ar"],
  8: ["ar"],
  9: ["ar"],
  10: ["ar"],
  11: ["en", "en"],
  12: ["en", "en", "en"],
  13: ["en", "en", "en"],
  14: ["en", "es", "en", "es", "es"],
  15: ["en", "es", "en", "es"],
  16: ["en", "es", "en", "es"],
  17: ["en", "es", "en"],
  18: ["en", "es", "en", "pt"],
  19: ["en", "es", "en", "pt"],
  20: ["en", "es", "pt", "pt"]
};

/**
 * 指定 UTC 時における「その時間帯の何本目か」に対応する言語を返す。
 * @param {number} utcHour - 0..20（21 以降は送付窓外）
 * @param {number} indexInHour - その時間帯内の送信番号（0 始まり）
 * @returns {string|null} 言語コード。枠外なら null
 */
function getNextScoutLangForUtcHour(utcHour, indexInHour) {
  const slots = SLOTS_BY_UTC_HOUR[utcHour];
  if (!slots || indexInHour < 0 || indexInHour >= slots.length) return null;
  return slots[indexInHour];
}

/** 「Whop に免疫がある」検出用: Whop 言及が少ないほどスコア高。テキストに含まれるとスコア下がる語 */
const WHOP_MENTION_PATTERNS = [
  "whop.com",
  "whop.com/",
  " whop ",
  "whop affiliate",
  "whopアフィリエイト"
];

/**
 * プロフィール・投稿テキストから Whop 言及の有無を簡易カウント。
 * 言及が少ないほど「Whop に免疫がある」とみなす（戻り値が小さいほど優先したい候補）。
 * @param {string} description - ユーザー description (bio)
 * @param {string[]} tweetTexts - ツイート本文の配列（任意）
 * @returns {{ count: number, score: number }} count=言及回数の合計、score=0..1（1=言及なしで「免疫あり」寄り）
 */
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
  AFFILIATE_SCOUT_LANGS,
  AFFILIATE_LANG_NAMES,
  getFirstPromoterInviteUrl,
  getWhopAffiliateProgramUrl,
  AFFILIATE_DM_DAILY_CAP,
  DAILY_CAP_BY_LANG_60,
  AFFILIATE_DM_MIN_INTERVAL_MS,
  SLOTS_BY_UTC_HOUR,
  getNextScoutLangForUtcHour,
  WHOP_MENTION_PATTERNS,
  scoreWhopImmune
};
