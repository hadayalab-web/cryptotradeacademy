const { CRITICAL_SHIFT_THRESHOLDS } = require("./thresholds");

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeMacroRiskOnOff(value) {
  if (!value) return null;
  const upper = String(value).toUpperCase();
  if (upper === "RISK_ON") return "RISK_ON";
  if (upper === "RISK_OFF") return "RISK_OFF";
  if (upper === "NEUTRAL" || upper === "MIXED") return "NEUTRAL";
  return null;
}

/**
 * Classify CRITICAL SHIFT type from scored metrics.
 * Thresholds are intentionally simple for v1 (temporary/tunable).
 *
 * @param {Object} metrics
 * @param {Object|null} btcSnapshot
 * @param {Object|null} macroSnapshot
 * @returns {"UP"|"DOWN"|"TOP"|"BOTTOM"|"ACCEL"|"REVERSAL"|"NONE"}
 */
function classifyShiftType(metrics = {}, btcSnapshot = null, macroSnapshot = null) {
  const t = CRITICAL_SHIFT_THRESHOLDS;
  const whaleAccumulationScore = toNumber(metrics.whaleAccumulationScore, 0);
  const whaleDistributionScore = toNumber(metrics.whaleDistributionScore, 0);
  const retailFomoScore = toNumber(metrics.retailFomoScore, 0);
  const panicScore = toNumber(metrics.panicScore, 0);
  const liquidityStressScore = toNumber(metrics.liquidityStressScore, 0);
  const derivativesStressScore = toNumber(metrics.derivativesStressScore, 0);

  const macroRiskOnOff = normalizeMacroRiskOnOff(
    metrics.macroRiskOnOff || macroSnapshot?.macroRiskOnOff || btcSnapshot?.macroContext?.macroRiskOnOff
  );
  const change24h = toNumber(btcSnapshot?.raw?.change24h, 0);
  const trapScore = toNumber(
    btcSnapshot?.trapDetection?.trapScore ?? btcSnapshot?.cqDeep?.trapScore,
    0
  );

  // TOP: distribution into crowd euphoria + leverage stress
  if (
    whaleDistributionScore >= t.WHALE_DISTRIBUTION_HIGH &&
    retailFomoScore >= t.RETAIL_FOMO_HIGH &&
    derivativesStressScore >= t.DERIVATIVES_STRESS_HIGH
  ) {
    return "TOP";
  }

  // BOTTOM: panic washout + selective whale absorption
  if (
    panicScore >= t.PANIC_HIGH &&
    whaleAccumulationScore >= t.SCORE_MEDIUM &&
    derivativesStressScore >= t.DERIVATIVES_STRESS_HIGH
  ) {
    return "BOTTOM";
  }

  // UP: constructive accumulation with non-euphoric sentiment
  if (
    whaleAccumulationScore >= t.WHALE_ACCUMULATION_HIGH &&
    retailFomoScore < t.RETAIL_FOMO_HIGH &&
    panicScore < t.PANIC_HIGH &&
    liquidityStressScore >= t.SCORE_MEDIUM &&
    (macroRiskOnOff === "RISK_ON" || macroRiskOnOff === "NEUTRAL" || macroRiskOnOff === null)
  ) {
    return "UP";
  }

  // DOWN: distribution + fragile macro backdrop
  if (
    whaleDistributionScore >= t.WHALE_DISTRIBUTION_HIGH &&
    derivativesStressScore >= t.SCORE_MEDIUM &&
    (macroRiskOnOff === "RISK_OFF" || panicScore >= t.SCORE_MEDIUM || change24h <= -1)
  ) {
    return "DOWN";
  }

  // ACCEL: structure is thin + derivatives pressure can amplify move
  if (
    liquidityStressScore >= t.LIQUIDITY_STRESS_HIGH &&
    derivativesStressScore >= t.SCORE_MEDIUM
  ) {
    return "ACCEL";
  }

  // REVERSAL: opposite pressure emerges vs recent direction
  const bullishReversal =
    change24h < 0 &&
    whaleAccumulationScore >= t.WHALE_ACCUMULATION_HIGH &&
    panicScore < t.PANIC_HIGH &&
    macroRiskOnOff !== "RISK_OFF";

  const bearishReversal =
    change24h > 0 &&
    whaleDistributionScore >= t.WHALE_DISTRIBUTION_HIGH &&
    retailFomoScore >= t.SCORE_MEDIUM &&
    (macroRiskOnOff !== "RISK_ON" || trapScore >= 60);

  if (bullishReversal || bearishReversal) {
    return "REVERSAL";
  }

  return "NONE";
}

module.exports = {
  classifyShiftType
};
