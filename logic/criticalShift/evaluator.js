const { classifyShiftType } = require("./shiftTypes");
const { CRITICAL_SHIFT_THRESHOLDS } = require("./thresholds");

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toNumberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function clamp100(value) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 100) return 100;
  return Math.round(value);
}

function normalizeMacroRiskOnOff(value) {
  if (!value) return null;
  const upper = String(value).toUpperCase();
  if (upper === "RISK_ON") return "RISK_ON";
  if (upper === "RISK_OFF") return "RISK_OFF";
  if (upper === "NEUTRAL" || upper === "MIXED") return "NEUTRAL";
  return null;
}

function asScore(value) {
  const n = toNumberOrNull(value);
  return n == null ? null : Number(clamp01(n).toFixed(3));
}

function inferMacroRiskOnOff(macroSnapshot, btcSnapshot) {
  const fromSnapshot = normalizeMacroRiskOnOff(
    macroSnapshot?.macroRiskOnOff || btcSnapshot?.macroContext?.macroRiskOnOff
  );
  if (fromSnapshot) return fromSnapshot;

  const t = CRITICAL_SHIFT_THRESHOLDS;
  const nasdaqChange = toNumberOrNull(
    macroSnapshot?.nasdaq?.raw?.change24h ?? macroSnapshot?.nasdaqChange24h
  );
  const goldChange = toNumberOrNull(
    macroSnapshot?.gold?.raw?.change24h ?? macroSnapshot?.goldChange24h
  );

  const nasdaqRegimeRaw = String(macroSnapshot?.nasdaqRegime || btcSnapshot?.macroContext?.nasdaqRegime || "")
    .toUpperCase();
  if (nasdaqRegimeRaw.includes("RISK_ON")) return "RISK_ON";
  if (nasdaqRegimeRaw.includes("RISK_OFF")) return "RISK_OFF";

  if (nasdaqChange == null && goldChange == null) return null;
  if (
    nasdaqChange != null &&
    nasdaqChange >= t.NASDAQ_RISK_ON_CHANGE_24H &&
    (goldChange == null || goldChange <= t.GOLD_RISK_ON_CHANGE_24H)
  ) {
    return "RISK_ON";
  }
  if (
    nasdaqChange != null &&
    nasdaqChange <= t.NASDAQ_RISK_OFF_CHANGE_24H &&
    (goldChange == null || goldChange >= t.GOLD_RISK_OFF_CHANGE_24H)
  ) {
    return "RISK_OFF";
  }
  return "NEUTRAL";
}

function scoreWhaleAccumulation(btcSnapshot) {
  const cq = btcSnapshot?.cqDeep || {};
  const x = btcSnapshot?.xSentiment || {};

  const inflow = toNumberOrNull(cq.exchangeFlowsDetailed?.inflow ?? cq.exchangeInflow);
  const outflow = toNumberOrNull(cq.exchangeFlowsDetailed?.outflow ?? cq.exchangeOutflow);
  const netflow = toNumberOrNull(cq.exchangeFlowsDetailed?.netflow ?? cq.netflow);
  const whaleBias = toNumberOrNull(x.whaleBias);
  const whaleRatio = toNumberOrNull(cq.whaleFlows?.whaleRatio ?? cq.whaleRatio);

  const flowTotal = (inflow != null ? Math.abs(inflow) : 0) + (outflow != null ? Math.abs(outflow) : 0);
  const outflowShare =
    flowTotal > 0
      ? (Math.abs(outflow || 0) / flowTotal)
      : netflow != null
      ? netflow < 0
        ? 0.8
        : 0.2
      : 0.5;

  const whaleBiasScore = whaleBias == null ? 0.5 : clamp01((whaleBias + 1) / 2);
  const antiSellPressure = whaleRatio == null ? 0.5 : clamp01((0.9 - whaleRatio) / 0.9);

  return clamp01(outflowShare * 0.45 + whaleBiasScore * 0.35 + antiSellPressure * 0.2);
}

function scoreWhaleDistribution(btcSnapshot) {
  const cq = btcSnapshot?.cqDeep || {};
  const x = btcSnapshot?.xSentiment || {};

  const inflow = toNumberOrNull(cq.exchangeFlowsDetailed?.inflow ?? cq.exchangeInflow);
  const outflow = toNumberOrNull(cq.exchangeFlowsDetailed?.outflow ?? cq.exchangeOutflow);
  const netflow = toNumberOrNull(cq.exchangeFlowsDetailed?.netflow ?? cq.netflow);
  const whaleBias = toNumberOrNull(x.whaleBias);
  const whaleRatio = toNumberOrNull(cq.whaleFlows?.whaleRatio ?? cq.whaleRatio);

  const flowTotal = (inflow != null ? Math.abs(inflow) : 0) + (outflow != null ? Math.abs(outflow) : 0);
  const inflowShare =
    flowTotal > 0
      ? (Math.abs(inflow || 0) / flowTotal)
      : netflow != null
      ? netflow > 0
        ? 0.8
        : 0.2
      : 0.5;

  const whaleBiasBear = whaleBias == null ? 0.5 : clamp01((1 - whaleBias) / 2);
  const whaleRatioPressure = whaleRatio == null ? 0.5 : clamp01(whaleRatio / 0.9);

  return clamp01(inflowShare * 0.4 + whaleBiasBear * 0.25 + whaleRatioPressure * 0.35);
}

function scoreRetailFomo(btcSnapshot) {
  const x = btcSnapshot?.xSentiment || {};
  const raw = btcSnapshot?.raw || {};

  const retailFomo = toNumberOrNull(x.retailFomo);
  const label = String(raw.sentimentLabel || "").toLowerCase();
  const labelFomo =
    /fomo|greed|euphoria|extreme greed/.test(label) ? 1 : /fear|panic|extreme fear/.test(label) ? 0 : 0.5;

  const retailScore = retailFomo == null ? 0.5 : clamp01(retailFomo / 100);
  return clamp01(retailScore * 0.8 + labelFomo * 0.2);
}

function scorePanic(btcSnapshot) {
  const x = btcSnapshot?.xSentiment || {};
  const raw = btcSnapshot?.raw || {};

  const label = String(raw.sentimentLabel || "").toLowerCase();
  const fngValue = toNumberOrNull(raw.fng?.value ?? raw.fng);
  const retailFomo = toNumberOrNull(x.retailFomo);

  const panicLabel =
    /panic|fear|extreme fear|capitulation/.test(label) ? 1 : /greed|euphoria|fomo/.test(label) ? 0 : 0.4;
  const panicFromFng = fngValue == null ? 0.4 : clamp01((35 - fngValue) / 35);
  const panicFromRetail = retailFomo == null ? 0.4 : clamp01((40 - retailFomo) / 40);

  return clamp01(panicLabel * 0.55 + panicFromFng * 0.3 + panicFromRetail * 0.15);
}

function scoreLiquidityStress(btcSnapshot) {
  const cq = btcSnapshot?.cqDeep || {};
  const liquidity = cq.liquidity || {};

  const depth = toNumberOrNull(liquidity.depth ?? liquidity.value);
  const spread = toNumberOrNull(liquidity.bidAskSpread ?? liquidity.spread);
  const trapType = String(btcSnapshot?.trapDetection?.trapType || "").toLowerCase();
  const trapSeverity = String(btcSnapshot?.trapDetection?.trapSeverity || "").toLowerCase();

  const depthStress = depth == null ? 0.4 : clamp01((0.4 - depth) / 0.4);
  const spreadStress = spread == null ? 0.2 : clamp01(spread / 0.01);
  const vacuumBoost =
    trapType.includes("liquidity") || trapType.includes("vacuum") || trapSeverity === "critical" ? 0.2 : 0;

  return clamp01(depthStress * 0.65 + spreadStress * 0.25 + vacuumBoost);
}

function scoreDerivativesStress(btcSnapshot) {
  const cq = btcSnapshot?.cqDeep || {};
  const funding = Math.abs(toNumber(cq.funding ?? cq.fundingRate, 0));
  const openInterest = toNumberOrNull(cq.openInterest ?? cq.oi);
  const liq = cq.liquidations || {};
  const totalLiquidations = Math.abs(
    toNumber(liq.totalLiquidations ?? (toNumber(liq.longLiquidations, 0) + toNumber(liq.shortLiquidations, 0)), 0)
  );

  // Temporary normalization constants (need production calibration).
  const fundingStress = clamp01(funding / 0.0012);
  const liquidationStress = clamp01(Math.log10(totalLiquidations + 1) / 8);
  const oiRelativeStress =
    openInterest != null && openInterest > 0
      ? clamp01(totalLiquidations / (openInterest * 0.01))
      : 0.25;

  return clamp01(fundingStress * 0.4 + liquidationStress * 0.4 + oiRelativeStress * 0.2);
}

function buildReasons(metrics, shiftType, macroRiskOnOff) {
  const t = CRITICAL_SHIFT_THRESHOLDS;
  const reasons = [];

  if (
    metrics.whaleAccumulationScore != null &&
    metrics.whaleAccumulationScore >= t.WHALE_ACCUMULATION_HIGH &&
    metrics.retailFomoScore != null &&
    metrics.retailFomoScore < t.RETAIL_FOMO_HIGH
  ) {
    reasons.push("Whales are accumulating while sentiment is quiet.");
  }
  if (
    metrics.whaleDistributionScore != null &&
    metrics.whaleDistributionScore >= t.WHALE_DISTRIBUTION_HIGH &&
    metrics.retailFomoScore != null &&
    metrics.retailFomoScore >= t.RETAIL_FOMO_HIGH
  ) {
    reasons.push("Whales are distributing into retail FOMO.");
  }
  if (
    metrics.derivativesStressScore != null &&
    metrics.derivativesStressScore >= t.DERIVATIVES_STRESS_HIGH
  ) {
    reasons.push("Derivatives are unwinding with high liquidations.");
  }
  if (
    metrics.liquidityStressScore != null &&
    metrics.liquidityStressScore >= t.LIQUIDITY_STRESS_HIGH
  ) {
    reasons.push("Liquidity is thin above current price.");
  }
  if (metrics.panicScore != null && metrics.panicScore >= t.PANIC_HIGH) {
    reasons.push("Panic sentiment is elevated with forced deleveraging.");
  }
  if (macroRiskOnOff === "RISK_ON") {
    reasons.push("Macro backdrop is risk-on from NASDAQ/GOLD.");
  } else if (macroRiskOnOff === "RISK_OFF") {
    reasons.push("Macro backdrop is risk-off from NASDAQ/GOLD.");
  }

  if (reasons.length === 0 && shiftType !== "NONE") {
    reasons.push("Cross-market structure shows a potential regime transition.");
  }
  if (reasons.length === 0) {
    reasons.push("No structural confluence reached the trigger threshold.");
  }

  return reasons;
}

function computeConfidence(shiftType, metrics, macroRiskOnOff) {
  const t = CRITICAL_SHIFT_THRESHOLDS;
  let confidence = 0;

  const score = {
    acc: toNumber(metrics.whaleAccumulationScore, 0),
    dist: toNumber(metrics.whaleDistributionScore, 0),
    fomo: toNumber(metrics.retailFomoScore, 0),
    panic: toNumber(metrics.panicScore, 0),
    liq: toNumber(metrics.liquidityStressScore, 0),
    der: toNumber(metrics.derivativesStressScore, 0)
  };

  switch (shiftType) {
    case "UP":
      confidence += score.acc >= t.WHALE_ACCUMULATION_HIGH ? 28 : score.acc >= t.SCORE_MEDIUM ? 14 : 0;
      confidence += score.fomo < t.RETAIL_FOMO_HIGH ? 14 : 0;
      confidence += score.panic < t.PANIC_HIGH ? 10 : 0;
      confidence += score.liq >= t.SCORE_MEDIUM ? 12 : 0;
      confidence += score.der >= t.SCORE_MEDIUM ? 12 : 0;
      confidence += macroRiskOnOff === "RISK_ON" ? 16 : macroRiskOnOff === "NEUTRAL" ? 8 : 0;
      break;
    case "DOWN":
      confidence += score.dist >= t.WHALE_DISTRIBUTION_HIGH ? 24 : score.dist >= t.SCORE_MEDIUM ? 12 : 0;
      confidence += score.der >= t.SCORE_MEDIUM ? 15 : 0;
      confidence += score.panic >= t.SCORE_MEDIUM ? 10 : 0;
      confidence += score.liq >= t.SCORE_MEDIUM ? 8 : 0;
      confidence += macroRiskOnOff === "RISK_OFF" ? 18 : macroRiskOnOff === "NEUTRAL" ? 6 : 0;
      break;
    case "TOP":
      confidence += score.dist >= t.WHALE_DISTRIBUTION_HIGH ? 30 : 0;
      confidence += score.fomo >= t.RETAIL_FOMO_HIGH ? 25 : 0;
      confidence += score.der >= t.DERIVATIVES_STRESS_HIGH ? 20 : score.der >= t.SCORE_MEDIUM ? 10 : 0;
      confidence += score.liq >= t.SCORE_MEDIUM ? 8 : 0;
      confidence += macroRiskOnOff === "RISK_OFF" ? 8 : 0;
      break;
    case "BOTTOM":
      confidence += score.panic >= t.PANIC_HIGH ? 26 : 0;
      confidence += score.acc >= t.SCORE_MEDIUM ? 18 : 0;
      confidence += score.der >= t.DERIVATIVES_STRESS_HIGH ? 18 : score.der >= t.SCORE_MEDIUM ? 8 : 0;
      confidence += score.liq >= t.SCORE_MEDIUM ? 10 : 0;
      confidence += macroRiskOnOff === "RISK_ON" ? 10 : macroRiskOnOff === "NEUTRAL" ? 5 : 0;
      break;
    case "ACCEL":
      confidence += score.liq >= t.LIQUIDITY_STRESS_HIGH ? 28 : 0;
      confidence += score.der >= t.SCORE_MEDIUM ? 20 : 0;
      confidence += score.panic >= t.SCORE_MEDIUM || score.fomo >= t.SCORE_MEDIUM ? 10 : 0;
      confidence += score.dist >= t.SCORE_MEDIUM || score.acc >= t.SCORE_MEDIUM ? 10 : 0;
      confidence += macroRiskOnOff ? 8 : 0;
      break;
    case "REVERSAL":
      confidence += Math.max(score.acc, score.dist) >= t.WHALE_ACCUMULATION_HIGH ? 22 : 0;
      confidence += score.der >= t.SCORE_MEDIUM ? 16 : 0;
      confidence += score.liq >= t.SCORE_MEDIUM ? 14 : 0;
      confidence += Math.abs(score.panic - score.fomo) >= 0.2 ? 10 : 0;
      confidence += macroRiskOnOff ? 12 : 0;
      break;
    default:
      confidence = 0;
  }

  return clamp100(confidence);
}

/**
 * Evaluate CRITICAL SHIFT trigger signal.
 *
 * @param {Object} params
 * @param {Object|null} params.btcSnapshot
 * @param {Object|null} params.macroSnapshot
 * @param {Object|null} params.lastCriticalShift
 * @returns {Promise<{
 *  triggered: boolean,
 *  shiftType: "UP"|"DOWN"|"TOP"|"BOTTOM"|"ACCEL"|"REVERSAL"|"NONE",
 *  confidence: number,
 *  reasons: string[],
 *  metrics: {
 *    whaleAccumulationScore?: number|null,
 *    whaleDistributionScore?: number|null,
 *    retailFomoScore?: number|null,
 *    panicScore?: number|null,
 *    liquidityStressScore?: number|null,
 *    derivativesStressScore?: number|null,
 *    macroRiskOnOff?: "RISK_ON"|"RISK_OFF"|"NEUTRAL"|null
 *  }
 * }>}
 */
async function evaluateCriticalShift({ btcSnapshot, macroSnapshot = null, lastCriticalShift = null }) {
  const fallback = {
    triggered: false,
    shiftType: "NONE",
    confidence: 0,
    reasons: ["CRITICAL SHIFT evaluation fallback was used."],
    metrics: {
      whaleAccumulationScore: null,
      whaleDistributionScore: null,
      retailFomoScore: null,
      panicScore: null,
      liquidityStressScore: null,
      derivativesStressScore: null,
      macroRiskOnOff: null
    }
  };

  try {
    if (!btcSnapshot) {
      return {
        ...fallback,
        reasons: ["BTC snapshot is missing; CRITICAL SHIFT evaluation skipped."]
      };
    }

    const whaleAccumulationScore = scoreWhaleAccumulation(btcSnapshot);
    const whaleDistributionScore = scoreWhaleDistribution(btcSnapshot);
    const retailFomoScore = scoreRetailFomo(btcSnapshot);
    const panicScore = scorePanic(btcSnapshot);
    const liquidityStressScore = scoreLiquidityStress(btcSnapshot);
    const derivativesStressScore = scoreDerivativesStress(btcSnapshot);
    const macroRiskOnOff = inferMacroRiskOnOff(macroSnapshot, btcSnapshot);

    const metrics = {
      whaleAccumulationScore,
      whaleDistributionScore,
      retailFomoScore,
      panicScore,
      liquidityStressScore,
      derivativesStressScore,
      macroRiskOnOff
    };

    const shiftType = classifyShiftType(metrics, btcSnapshot, macroSnapshot);
    const confidence = computeConfidence(shiftType, metrics, macroRiskOnOff);
    const reasons = buildReasons(metrics, shiftType, macroRiskOnOff);

    let triggered = shiftType !== "NONE" && confidence >= CRITICAL_SHIFT_THRESHOLDS.MIN_CONFIDENCE;

    if (triggered && lastCriticalShift && typeof lastCriticalShift === "object") {
      const lastType = String(lastCriticalShift.shiftType || "NONE").toUpperCase();
      const lastTime = new Date(lastCriticalShift.as_of_utc || 0).getTime();
      const nowTime = new Date(btcSnapshot.as_of_utc || Date.now()).getTime();
      const isDuplicateType = lastType === shiftType;
      const withinCooldown =
        Number.isFinite(lastTime) &&
        Number.isFinite(nowTime) &&
        nowTime - lastTime >= 0 &&
        nowTime - lastTime < CRITICAL_SHIFT_THRESHOLDS.SUPPRESSION_WINDOW_MS;

      if (isDuplicateType && withinCooldown) {
        triggered = false;
        reasons.push("Duplicate shift signal was suppressed by cooldown.");
      }
    }

    return {
      triggered,
      shiftType,
      confidence,
      reasons,
      metrics: {
        whaleAccumulationScore: asScore(metrics.whaleAccumulationScore),
        whaleDistributionScore: asScore(metrics.whaleDistributionScore),
        retailFomoScore: asScore(metrics.retailFomoScore),
        panicScore: asScore(metrics.panicScore),
        liquidityStressScore: asScore(metrics.liquidityStressScore),
        derivativesStressScore: asScore(metrics.derivativesStressScore),
        macroRiskOnOff: metrics.macroRiskOnOff || null
      }
    };
  } catch (error) {
    console.warn("[criticalShift/evaluator] Error:", error?.message);
    return {
      ...fallback,
      reasons: ["CRITICAL SHIFT evaluation failed and was safely suppressed."]
    };
  }
}

module.exports = {
  evaluateCriticalShift
};
