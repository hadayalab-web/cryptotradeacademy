/**
 * Normalize any sentiment source into:
 * 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed'
 *
 * raw:
 *  - number (0–100 Fear & Greed index)
 *  - string: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed' など
 */

function normalizeSentiment(raw) {
  if (raw === null || raw === undefined) return 'Neutral';

  // 数値インデックス (0–100) の場合
  if (typeof raw === 'number') {
    const v = Math.max(0, Math.min(100, raw));
    if (v <= 20) return 'Extreme Fear';
    if (v <= 40) return 'Fear';
    if (v < 60) return 'Neutral';
    if (v < 80) return 'Greed';
    return 'Extreme Greed';
  }

  // 文字列の場合
  const s = String(raw).toLowerCase();

  if (s.includes('extreme') && s.includes('fear')) return 'Extreme Fear';
  if (s === 'fear' || s.includes('fear')) return 'Fear';
  if (s.includes('extreme') && s.includes('greed')) return 'Extreme Greed';
  if (s === 'greed' || s.includes('greed')) return 'Greed';

  return 'Neutral';
}

function isFearLike(label) {
  const s = String(label);
  return s.includes('Fear');
}

function isGreedLike(label) {
  const s = String(label);
  return s.includes('Greed');
}

module.exports = {
  normalizeSentiment,
  isFearLike,
  isGreedLike,
};
