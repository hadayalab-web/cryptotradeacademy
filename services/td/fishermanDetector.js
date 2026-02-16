/**
 * Fisherman 検出＋PQT スロット選定（パターンのみ、Grok の数字は使わない）
 * PQT-ONLY: hype / engagement velocity / 上位 5〜10% のみ対象。API クレジットで動的上限。
 */

const HYPE_KEYWORDS_BY_LANG = {
  en: ["moon", "pump", "lambo", "get rich", "easy money", "100x", "1000x", "last chance", "don't miss", "easy win", "no risk", "guaranteed"],
  ja: ["今すぐ", "乗り遅れるな", "絶対", "確実", "儲かる", "必ず", "moon", "pump"],
  ko: ["확실", "반드시", "moon", "pump", "100x", "급등"],
  es: ["moon", "pump", "sube", "oportunidad", "última chance", "fácil"],
  pt: ["moon", "pump", "sobe", "oportunidade", "última chance", "fácil"],
  ar: ["moon", "pump", "فرصة", "مضمون"]
};
const HYPE_KEYWORDS = [
  "moon", "pump", "lambo", "get rich", "easy money", "100x", "1000x",
  "last chance", "don't miss", "easy win", "no risk", "guaranteed",
  "今すぐ", "乗り遅れるな", "絶対", "확실", "반드시"
];

const DEFAULT_ENGAGEMENT_THRESHOLD = 500;
const DEFAULT_TOP_PERCENT = 0.08; // 上位 8%（5〜10% の中央）

/**
 * 投稿が Fisherman 的か（hype + エンゲージメント立ち上がり）
 * @param {Object} post - { id, text, created_at, public_metrics?, ... } または candidate 全体
 * @param {string} lang
 * @param {number} engagementThreshold
 */
function isFishermanPost(post, lang, engagementThreshold = DEFAULT_ENGAGEMENT_THRESHOLD) {
  const text = post?.post?.text ?? post?.text ?? "";
  const metrics = post?.post?.public_metrics ?? post?.public_metrics ?? {};
  const score = post?.engagementScore ?? scoreFromMetrics(metrics);
  const is_hype = HYPE_KEYWORDS.some((k) => text.toLowerCase().includes(k.toLowerCase()));
  return is_hype && score >= engagementThreshold;
}

function scoreFromMetrics(metrics = {}) {
  const likes = Number(metrics.like_count) || 0;
  const retweets = Number(metrics.retweet_count) || 0;
  const quotes = Number(metrics.quote_count) || 0;
  const replies = Number(metrics.reply_count) || 0;
  return likes + 2 * retweets + 3 * quotes + replies;
}

function rankScore(candidate) {
  if (!candidate || typeof candidate !== "object") return 0;
  if (Number.isFinite(candidate.impressionScore)) {
    // impressionScore is 0..1; scale to align with engagement-based ordering fallback
    return Number(candidate.impressionScore) * 1000000;
  }
  if (Number.isFinite(candidate.engagementScore)) return Number(candidate.engagementScore);
  return scoreFromMetrics(candidate?.post?.public_metrics || candidate?.public_metrics || {});
}

/**
 * 候補から Fisherman スロットを選定（engagement velocity 降順で上から targetCount 件）
 */
function selectFishermanSlots(candidates, lang, targetCount, engagementThreshold = DEFAULT_ENGAGEMENT_THRESHOLD) {
  const filtered = (candidates || [])
    .filter((c) => isFishermanPost(c, lang, engagementThreshold))
    .sort((a, b) => rankScore(b) - rankScore(a));
  return filtered.slice(0, Math.max(0, targetCount));
}

/**
 * PQT-ONLY: 上位 5〜10% の Fisherman のみ選定。API クレジットに応じて maxCount で cap。
 * @param {Array} candidates - buzz 候補
 * @param {string} lang
 * @param {Object} [opts] - { topPercent: 0.05〜0.10, maxCount, engagementThreshold }
 */
function selectFishermanSlotsTopPercent(candidates, lang, opts = {}) {
  const topPercent = Math.min(0.10, Math.max(0.05, opts.topPercent ?? DEFAULT_TOP_PERCENT));
  const maxCount = opts.maxCount ?? Infinity;
  const engagementThreshold = opts.engagementThreshold ?? DEFAULT_ENGAGEMENT_THRESHOLD;

  const filtered = (candidates || [])
    .filter((c) => isFishermanPost(c, lang, engagementThreshold))
    .sort((a, b) => rankScore(b) - rankScore(a));

  const take = Math.max(1, Math.min(maxCount, Math.ceil(filtered.length * topPercent)));
  return filtered.slice(0, take);
}

/**
 * Fisherman でない場合のフォールバック: 全候補を engagement 降順で targetCount 件
 */
function selectSlotsFallback(candidates, targetCount) {
  const sorted = (candidates || []).sort((a, b) => rankScore(b) - rankScore(a));
  return sorted.slice(0, Math.max(0, targetCount));
}

module.exports = {
  isFishermanPost,
  selectFishermanSlots,
  selectFishermanSlotsTopPercent,
  selectSlotsFallback,
  DEFAULT_ENGAGEMENT_THRESHOLD,
  DEFAULT_TOP_PERCENT
};
