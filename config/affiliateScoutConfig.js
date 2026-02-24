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

/** Cron: 0,30 * * * *。EN は 3 時間ごと 8 回・5 人ずつ（別枠）。vercel.json 参照。 */

/** EN 専用: 3 時間ごと 1 日 8 回（0,3,6,9,12,15,18,21 UTC）、1 回 5 人で計 40 人/日。API コスト抑え。 */
const EN_SCOUT_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];
const EN_SCOUT_BATCH_SIZE = 5;

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
 * EN は別枠（EN_SCOUT_HOURS）。1時間あたり最大2スロット（:00 / :30）。
 * 構成: AR5、南米ES5+南米PT5、JA3+KO3。ヨーロッパなし。
 */
const SLOTS_BY_UTC_HOUR = {
  0: ["es", "pt"],
  11: ["ja", "ko"],
  12: ["ja", "ko"],
  13: ["ja", "ko"],
  16: ["ar", "ar"],
  17: ["ar", "ar"],
  18: ["ar"],
  20: ["es", "pt"],
  21: ["es", "pt"],
  22: ["es", "pt"],
  23: ["es", "pt"]
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
  EN_SCOUT_HOURS,
  EN_SCOUT_BATCH_SIZE,
  DAILY_CAP_BY_LANG_60,
  AFFILIATE_DM_MIN_INTERVAL_MS,
  SLOTS_BY_UTC_HOUR,
  getNextScoutLangForUtcHour,
  WHOP_MENTION_PATTERNS,
  scoreWhopImmune
};
