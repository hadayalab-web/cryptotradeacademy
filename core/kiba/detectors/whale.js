/**
 * Whale anomaly (CQ only). Large-player flow imbalance.
 */
function detectWhaleAnomaly(whaleIn, whaleOut, mean, std) {
  if (!Number.isFinite(std) || std === 0) return 0;
  const imbalance = Math.abs(Number(whaleIn) - Number(whaleOut));
  const z = (imbalance - Number(mean)) / std;
  return Math.max(0, Math.min(z, 5));
}
module.exports = { detectWhaleAnomaly };
