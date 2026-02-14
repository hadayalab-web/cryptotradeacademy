/**
 * Flow anomaly (CQ). Liquidity flow deviation.
 */
function detectFlowAnomaly(netflow, mean, std) {
  if (!Number.isFinite(std) || std === 0) return 0;
  const z = (Number(netflow) - Number(mean)) / std;
  return Math.max(0, Math.min(z, 5));
}
module.exports = { detectFlowAnomaly };
