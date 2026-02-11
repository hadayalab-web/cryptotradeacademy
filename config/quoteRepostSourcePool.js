/**
 * Trap Defence X Repost OS — Search 不可時のフォールバック用 Tweet ID プール
 * Search API が 401 で使えない場合、ここに手動で Tweet ID を入れて運用する。
 */

const SOURCE_TWEET_IDS = {
  // Fill EN first (10-20 IDs recommended)
  en: [],
  es: [],
  pt: [],
  ja: [],
  ko: [],
  ar: []
};

// 優先順位（高いほど優先）。未指定なら 0。
const SOURCE_TWEET_PRIORITY = {
  en: {},
  es: {},
  pt: {},
  ja: {},
  ko: {},
  ar: {}
};

function normalizeLang(lang) {
  return lang === "pt-br" ? "pt" : lang;
}

function getFallbackTweetIds(lang) {
  const key = normalizeLang(lang);
  return SOURCE_TWEET_IDS[key] || SOURCE_TWEET_IDS.en || [];
}

/**
 * Stateless で複数 ID を選ぶ（決定的）
 */
function pickFallbackTweetIds(lang, count = 3) {
  const pool = getFallbackTweetIds(lang);
  if (!pool.length) return [];

  const key = normalizeLang(lang);
  const priorityMap = SOURCE_TWEET_PRIORITY[key] || {};

  // 優先順位の高い順に並べ、同順位内はランダム
  const sorted = [...pool].sort((a, b) => {
    const pa = priorityMap[a] ?? 0;
    const pb = priorityMap[b] ?? 0;
    if (pa !== pb) return pb - pa;
    return Math.random() - 0.5;
  });

  return sorted.slice(0, count);
}

module.exports = {
  SOURCE_TWEET_IDS,
  SOURCE_TWEET_PRIORITY,
  getFallbackTweetIds,
  pickFallbackTweetIds
};
