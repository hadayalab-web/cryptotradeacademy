/**
 * Sentiment anomaly (X only).
 */
function detectSentimentAnomaly(postVolume, avgVolume, fearScore) {
  if (!Number.isFinite(avgVolume) || avgVolume <= 0) return 0;
  const volumeDrop = (avgVolume - (Number(postVolume) || 0)) / avgVolume;
  const raw = volumeDrop * 0.6 + (Number(fearScore) || 0) * 0.4;
  return Math.max(0, Math.min(raw * 5, 5));
}
module.exports = { detectSentimentAnomaly };
