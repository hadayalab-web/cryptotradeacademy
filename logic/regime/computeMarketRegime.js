/**
 * Phase 3: Market regime detection for templates and BWE
 * Regimes: whale-driven, retail-fomo, high-volatility, low-volatility,
 *          liquidity-vacuum, miner-capitulation, neutral
 */

/**
 * @param {Object} snapshot - btcSnapshot
 * @returns {string} regime label
 */
function computeMarketRegime(snapshot) {
  if (!snapshot) return "neutral";

  const cqDeep = snapshot.cqDeep || {};
  const raw = snapshot.raw || {};
  const xSentiment = snapshot.xSentiment || {};
  const minerFlows = cqDeep.minerFlows;
  const liquidity = cqDeep.liquidity;

  const whaleRatio = Number(cqDeep.whaleFlows?.whaleRatio ?? cqDeep.whaleRatio ?? 0);
  const retailFomo = Number(xSentiment.retailFomo ?? 50);
  const change24h = Math.abs(Number(raw.change24h ?? 0));
  const mpi = Number(cqDeep.mpi ?? cqDeep.minerMPI ?? raw.mpi ?? 0);

  // Whale-driven: whale ratio dominates
  if (whaleRatio >= 0.88) return "whale-driven";

  // Retail FOMO: retail chasing
  if (retailFomo >= 75) return "retail-fomo";

  // High volatility (5%+ 24h change)
  if (change24h >= 5) return "high-volatility";

  // Miner capitulation: MPI very negative
  if (mpi <= -25) return "miner-capitulation";
  if (minerFlows && typeof minerFlows.outflow === "number" && minerFlows.outflow > 5000) {
    return "miner-capitulation";
  }

  // Liquidity vacuum: liquidity data suggests thin conditions
  if (liquidity && typeof liquidity === "object") {
    const depth = liquidity.depth ?? liquidity.value;
    if (depth != null && Number(depth) < 0.3) return "liquidity-vacuum";
  }

  // Low volatility
  if (change24h < 2) return "low-volatility";

  return "neutral";
}

module.exports = { computeMarketRegime };
