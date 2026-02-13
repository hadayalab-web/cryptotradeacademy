/**
 * Phase 4: Snapshot diff engine
 * computeSnapshotDiff(current, previous) → diff object
 */

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {Object} current - current snapshot
 * @param {Object|null} previous - previous snapshot
 * @returns {Object} { priceChange, whaleRatioChange, fundingChange, OIChange, liquidityChange, sentimentFlip, trapScoreDelta, divergenceDelta, regimeShift, summaryText }
 */
function computeSnapshotDiff(current, previous) {
  const empty = {
    priceChange: null,
    whaleRatioChange: null,
    fundingChange: null,
    OIChange: null,
    liquidityChange: null,
    sentimentFlip: false,
    trapScoreDelta: null,
    divergenceDelta: null,
    regimeShift: false,
    summaryText: ""
  };

  if (!current || !previous) return empty;

  const curRaw = current.raw || {};
  const prevRaw = previous.raw || {};
  const curCq = current.cqDeep || {};
  const prevCq = previous.cqDeep || {};
  const curPrice = safeNum(curRaw.priceUsd);
  const prevPrice = safeNum(prevRaw.priceUsd);
  const curWhale = safeNum(curCq.whaleFlows?.whaleRatio ?? curCq.whaleRatio);
  const prevWhale = safeNum(prevCq.whaleFlows?.whaleRatio ?? prevCq.whaleRatio);
  const curFunding = safeNum(curCq.funding);
  const prevFunding = safeNum(prevCq.funding);
  const curOI = safeNum(curCq.openInterest ?? curCq.open_interest);
  const prevOI = safeNum(prevCq.openInterest ?? prevCq.open_interest);
  const curLiq = curCq.liquidity && typeof curCq.liquidity === "object"
    ? safeNum(curCq.liquidity.depth ?? curCq.liquidity.value)
    : safeNum(curCq.liquidity);
  const prevLiq = prevCq.liquidity && typeof prevCq.liquidity === "object"
    ? safeNum(prevCq.liquidity.depth ?? prevCq.liquidity.value)
    : safeNum(prevCq.liquidity);
  const curTrap = safeNum(current.trapDetection?.trapScore ?? curCq.trapScore);
  const prevTrap = safeNum(previous.trapDetection?.trapScore ?? prevCq.trapScore);
  const curDiv = current.divergenceSignal?.divergenceLevel || current.divergenceSignal?.confidence;
  const prevDiv = previous.divergenceSignal?.divergenceLevel || previous.divergenceSignal?.confidence;
  const curRegime = current.marketRegime || "neutral";
  const prevRegime = previous.marketRegime || "neutral";
  const curSent = String(curRaw.sentimentLabel || "").toLowerCase();
  const prevSent = String(prevRaw.sentimentLabel || "").toLowerCase();

  const priceChange = curPrice != null && prevPrice != null && prevPrice !== 0
    ? ((curPrice - prevPrice) / prevPrice) * 100
    : null;
  const whaleRatioChange = curWhale != null && prevWhale != null ? curWhale - prevWhale : null;
  const fundingChange = curFunding != null && prevFunding != null ? curFunding - prevFunding : null;
  const OIChange = curOI != null && prevOI != null ? curOI - prevOI : null;
  const liquidityChange = curLiq != null && prevLiq != null ? curLiq - prevLiq : null;
  const sentimentFlip = prevSent && curSent && prevSent !== curSent;
  const trapScoreDelta = curTrap != null && prevTrap != null ? curTrap - prevTrap : null;
  const divergenceDelta = curDiv !== prevDiv;
  const regimeShift = curRegime !== prevRegime;

  const parts = [];
  if (priceChange != null) parts.push(`Price ${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(2)}%`);
  if (whaleRatioChange != null) parts.push(`Whale ratio ${whaleRatioChange >= 0 ? "+" : ""}${whaleRatioChange.toFixed(3)}`);
  if (trapScoreDelta != null) parts.push(`Trap score ${trapScoreDelta >= 0 ? "+" : ""}${trapScoreDelta.toFixed(0)}`);
  if (regimeShift) parts.push(`Regime ${prevRegime} → ${curRegime}`);
  if (sentimentFlip) parts.push(`Sentiment ${prevSent} → ${curSent}`);

  const summaryText = parts.length > 0 ? parts.join(". ") : "No significant changes";

  return {
    priceChange,
    whaleRatioChange,
    fundingChange,
    OIChange,
    liquidityChange,
    sentimentFlip,
    trapScoreDelta,
    divergenceDelta,
    regimeShift,
    summaryText
  };
}

module.exports = { computeSnapshotDiff };
