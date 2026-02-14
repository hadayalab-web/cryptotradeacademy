/**
 * Liquidity anomaly (CQ flow approximation). No orderbook.
 */
function detectLiquidityAnomaly(netflowChange, priceImpact, volumeSpike) {
  const raw =
    (Number(netflowChange) || 0) * 0.4 +
    (Number(priceImpact) || 0) * 0.3 +
    (Number(volumeSpike) || 0) * 0.3;
  return Math.max(0, Math.min(raw, 5));
}
module.exports = { detectLiquidityAnomaly };
