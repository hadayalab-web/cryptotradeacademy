/**
 * Algo anomaly (sync approximation). No microstructure.
 */
function detectAlgoAnomaly(flowPriceCorr, periodicWhale) {
  const raw = (Number(flowPriceCorr) || 0) * 0.7 + (Number(periodicWhale) || 0) * 0.3;
  return Math.max(0, Math.min(raw * 5, 5));
}
module.exports = { detectAlgoAnomaly };
