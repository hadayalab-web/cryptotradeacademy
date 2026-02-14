/**
 * Retail anomaly (X only).
 */
function detectRetailAnomaly(panicKeywords, bullishDrop) {
  const raw = (Number(panicKeywords) || 0) * 0.6 + (Number(bullishDrop) || 0) * 0.4;
  return Math.max(0, Math.min(raw * 5, 5));
}
module.exports = { detectRetailAnomaly };
