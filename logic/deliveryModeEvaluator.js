/**
 * Trap Defence Unified OS — delivery mode and Emergency/Regular event-driven evaluation
 * Pure functions, testable. No I/O.
 */

// Emergency: deterministic triggers (Emergency is currently dead; these revive it)
const EMERGENCY_TRAP_SCORE_THRESHOLD = 60;
const EMERGENCY_WHALE_RETAIL_DIVERGENCE_THRESHOLD = 40;
const EMERGENCY_KIMCHI_PREMIUM_THRESHOLD = 0.08;
const EMERGENCY_LIQUIDITY_VACUUM_DEPTH_THRESHOLD = 0.3;
const EMERGENCY_ETF_SHOCK_SEVERITY_THRESHOLD = 1;
const EMERGENCY_MPI_CAPITULATION_THRESHOLD = -25;
const EMERGENCY_MINER_OUTFLOW_CAPITULATION = 5000;

// Regular event-driven: thresholds for firing outside time slots
const REGULAR_WHALE_SPIKE_WHALE_RATIO = 0.85;
const REGULAR_SENTIMENT_FLIP_SCORE_DELTA = 25;
const REGULAR_VOLATILITY_CHANGE24H = 5;
const REGULAR_LIQUIDITY_SHOCK_DELTA = 0.15;
const REGULAR_FUNDING_DELTA = 0.0005;
const REGULAR_OI_DROP_PCT = 0.05;

/**
 * liquidity vacuum (CQ Pro liquidity 指標)
 */
function isLiquidityVacuum(snapshot) {
  const liq = snapshot?.cqDeep?.liquidity;
  if (!liq || typeof liq !== "object") return false;
  const depth = liq.depth ?? liq.value;
  if (depth == null) return false;
  const n = Number(depth);
  return Number.isFinite(n) && n < EMERGENCY_LIQUIDITY_VACUUM_DEPTH_THRESHOLD;
}

/**
 * ETF shock (Grok ETF シグナル)
 */
function isETFShock(snapshot) {
  const etf = snapshot?.highResX?.etfSignal ?? snapshot?.grokXAnalysis?.etfSignal ?? snapshot?.xSentiment?.etfShock;
  if (!etf || typeof etf !== "object") return false;
  const severity = Number(etf.severity ?? etf.value ?? 0);
  return severity >= EMERGENCY_ETF_SHOCK_SEVERITY_THRESHOLD;
}

/**
 * miner capitulation (MPI / miner flows)
 */
function isMinerCapitulation(snapshot) {
  const cqDeep = snapshot?.cqDeep || {};
  const mpi = Number(cqDeep.mpi ?? cqDeep.minerMPI ?? snapshot?.raw?.mpi) ?? 0;
  if (mpi <= EMERGENCY_MPI_CAPITULATION_THRESHOLD) return true;
  const minerFlows = cqDeep.minerFlows;
  if (minerFlows && typeof minerFlows === "object" && typeof minerFlows.outflow === "number") {
    if (minerFlows.outflow >= EMERGENCY_MINER_OUTFLOW_CAPITULATION) return true;
  }
  return false;
}

/**
 * Evaluate if Emergency mode should fire (deterministic triggers only).
 * @param {Object} snapshot - btcSnapshot (or partial with at least trapDetection, cqDeep, xSentiment)
 * @returns {{ fire: boolean, reason: string }}
 */
function evaluateEmergencyTrigger(snapshot) {
  if (!snapshot) return { fire: false, reason: "no_snapshot" };

  const trapDetection = snapshot.trapDetection || {};
  const cqDeep = snapshot.cqDeep || {};
  const xSentiment = snapshot.xSentiment || {};

  const trapScore = trapDetection.trapScore ?? cqDeep.trapScore ?? 0;
  if (trapScore >= EMERGENCY_TRAP_SCORE_THRESHOLD) {
    return { fire: true, reason: `trapScore ${trapScore} >= ${EMERGENCY_TRAP_SCORE_THRESHOLD}` };
  }

  const trapSeverity = (trapDetection.trapSeverity || "").toUpperCase();
  if (["CRITICAL", "HIGH"].includes(trapSeverity)) {
    return { fire: true, reason: `trapSeverity ${trapSeverity}` };
  }

  const whaleBias = Number(xSentiment.whaleBias) || 0;
  const retailFomo = Number(xSentiment.retailFomo) || 50;
  const whaleRetailDivergence = Math.abs(whaleBias * 50 - (retailFomo - 50));
  if (whaleRetailDivergence >= EMERGENCY_WHALE_RETAIL_DIVERGENCE_THRESHOLD) {
    return { fire: true, reason: `whale_retail_divergence ${whaleRetailDivergence.toFixed(0)}` };
  }

  const kimchiPremium = Number(cqDeep.kimchiPremium) || 0;
  if (kimchiPremium >= EMERGENCY_KIMCHI_PREMIUM_THRESHOLD) {
    return { fire: true, reason: `kimchiPremium ${(kimchiPremium * 100).toFixed(2)}%` };
  }

  if (isLiquidityVacuum(snapshot)) return { fire: true, reason: "liquidity_vacuum" };
  if (isETFShock(snapshot)) return { fire: true, reason: "etf_shock" };
  if (isMinerCapitulation(snapshot)) return { fire: true, reason: "miner_capitulation" };

  const change24h = Math.abs(Number(snapshot.raw?.change24h) || 0);
  const sentimentLabel = (snapshot.raw?.sentimentLabel || "").toLowerCase();
  const isPanic = /fear|extreme fear|panic/.test(sentimentLabel);
  if (isPanic && change24h >= 8) {
    return { fire: true, reason: "panic_driven_volatility" };
  }

  return { fire: false, reason: "no_trigger" };
}

/**
 * liquidity shock (liquidity 指標の急変)
 */
function isLiquidityShock(snapshot, lastSnapshot) {
  if (!lastSnapshot) return false;
  const liq = snapshot?.cqDeep?.liquidity;
  const prevLiq = lastSnapshot?.cqDeep?.liquidity;
  if (!liq || !prevLiq || typeof liq !== "object" || typeof prevLiq !== "object") return false;
  const curr = Number(liq.depth ?? liq.value ?? NaN);
  const prev = Number(prevLiq.depth ?? prevLiq.value ?? NaN);
  if (!Number.isFinite(curr) || !Number.isFinite(prev)) return false;
  return Math.abs(curr - prev) >= REGULAR_LIQUIDITY_SHOCK_DELTA;
}

/**
 * derivatives unwind (funding 急変 + OI 急減)
 */
function isDerivativesUnwind(snapshot, lastSnapshot) {
  if (!lastSnapshot) return false;
  const cq = snapshot?.cqDeep || {};
  const prevCq = lastSnapshot?.cqDeep || {};
  const funding = Number(cq.funding ?? cq.fundingRate ?? NaN);
  const prevFunding = Number(prevCq.funding ?? prevCq.fundingRate ?? NaN);
  const oi = Number(cq.openInterest ?? cq.oi ?? NaN);
  const prevOi = Number(prevCq.openInterest ?? prevCq.oi ?? NaN);
  if (!Number.isFinite(funding) || !Number.isFinite(prevFunding) || !Number.isFinite(oi) || !Number.isFinite(prevOi)) return false;
  const fundingDelta = Math.abs(funding - prevFunding);
  const oiDrop = prevOi > 0 ? (prevOi - oi) / prevOi : 0;
  return fundingDelta >= REGULAR_FUNDING_DELTA && oiDrop >= REGULAR_OI_DROP_PCT;
}

/**
 * Evaluate if Regular should fire event-driven (whale spike, liquidity shock, sentiment flip, volatility shift).
 * @param {Object} snapshot - btcSnapshot
 * @param {Object} lastSnapshot - previous btcSnapshot (for deltas)
 * @returns {{ fire: boolean, reason: string }}
 */
function evaluateRegularEventDriven(snapshot, lastSnapshot) {
  if (!snapshot) return { fire: false, reason: "no_snapshot" };

  const cqDeep = snapshot.cqDeep || {};
  const whaleRatio = Number(cqDeep.whaleFlows?.whaleRatio ?? cqDeep.whaleRatio) || 0;
  if (whaleRatio >= REGULAR_WHALE_SPIKE_WHALE_RATIO) {
    return { fire: true, reason: "whale_spike" };
  }

  const change24h = Math.abs(Number(snapshot.raw?.change24h) || 0);
  if (change24h >= REGULAR_VOLATILITY_CHANGE24H) {
    return { fire: true, reason: "volatility_regime_shift" };
  }

  if (lastSnapshot && typeof lastSnapshot.market_score === "number" && typeof snapshot.market_score === "number") {
    const delta = Math.abs(snapshot.market_score - lastSnapshot.market_score);
    if (delta >= REGULAR_SENTIMENT_FLIP_SCORE_DELTA) {
      return { fire: true, reason: "sentiment_flip" };
    }
  }

  if (isLiquidityShock(snapshot, lastSnapshot)) return { fire: true, reason: "liquidity_shock" };
  if (isDerivativesUnwind(snapshot, lastSnapshot)) return { fire: true, reason: "derivatives_unwind" };

  return { fire: false, reason: "no_trigger" };
}

const WATCH_SCORE_CHANGE_THRESHOLD = 30;
const WATCH_MPI_THRESHOLD = -20;
const WATCH_KIMCHI_PREMIUM_THRESHOLD = 0.05;
const STANDBY_BREAK_HOURS = 24;

/**
 * Compute meta flags (watch, standbyBreak) from snapshot + lastSnapshot.
 * WATCH = minimal の亜種、STANDBY_BREAK = regular の亜種。
 * @param {Object} snapshot - btcSnapshot
 * @param {Object} lastSnapshot - previous btcSnapshot
 * @returns {{ watch: boolean, standbyBreak: boolean }}
 */
function computeMetaFlags(snapshot, lastSnapshot) {
  const meta = { watch: false, standbyBreak: false };
  if (!snapshot) return meta;

  const cqDeep = snapshot.cqDeep || {};
  const mpi = Number(cqDeep.mpi ?? cqDeep.minerMPI ?? snapshot.raw?.mpi) || 0;
  const kimchiPremium = Number(cqDeep.kimchiPremium) || 0;

  if (lastSnapshot && typeof snapshot.market_score === "number" && typeof lastSnapshot.market_score === "number") {
    const scoreChange = Math.abs(snapshot.market_score - lastSnapshot.market_score);
    if (scoreChange >= WATCH_SCORE_CHANGE_THRESHOLD) meta.watch = true;
  }
  if (mpi <= WATCH_MPI_THRESHOLD) meta.watch = true;
  if (kimchiPremium >= WATCH_KIMCHI_PREMIUM_THRESHOLD) meta.watch = true;

  if (lastSnapshot && lastSnapshot.as_of_utc) {
    const hoursSince = (Date.now() - new Date(lastSnapshot.as_of_utc).getTime()) / 3600000;
    if (hoursSince >= STANDBY_BREAK_HOURS) {
      const trapScore = snapshot.trapDetection?.trapScore ?? cqDeep.trapScore ?? 0;
      const lastTrapScore = lastSnapshot.trapDetection?.trapScore ?? lastSnapshot.cqDeep?.trapScore ?? 0;
      const wasStandby = lastTrapScore < 40 && !(lastSnapshot.trapDetection?.trapDetected);
      const nowActive = trapScore >= 40 || (snapshot.trapDetection?.trapDetected);
      if (wasStandby && nowActive) meta.standbyBreak = true;
    }
  }

  return meta;
}

/**
 * Evaluate delivery mode: minimal | regular | emergency
 * Priority: force → emergency → regular (slot or event-driven) → minimal
 * Meta flags: watch (minimal 亜種), standbyBreak (regular 亜種)
 * @param {Object} snapshot - btcSnapshot
 * @param {Object} context - { isRegularSlot: boolean, force: boolean, lastSnapshot?: Object }
 * @returns {{ mode: 'minimal'|'regular'|'emergency', reason: string, meta: { watch: boolean, standbyBreak: boolean } }}
 */
function evaluateDeliveryMode(snapshot, context = {}) {
  const { isRegularSlot = false, force = false, lastSnapshot = null } = context;
  const meta = computeMetaFlags(snapshot, lastSnapshot);

  if (force) return { mode: "regular", reason: "force", meta };

  // Emergency は廃止。SHIFT と役割が被るため外部通知ゼロに統一。
  // if (emergency.fire) return { mode: "emergency", ... }; は削除済み。

  if (isRegularSlot) return { mode: "regular", reason: "regular_slot", meta };

  const regularEvent = evaluateRegularEventDriven(snapshot, lastSnapshot);
  if (regularEvent.fire) return { mode: "regular", reason: `event_driven: ${regularEvent.reason}`, meta };

  return { mode: "minimal", reason: "default", meta };
}

module.exports = {
  evaluateEmergencyTrigger,
  evaluateRegularEventDriven,
  evaluateDeliveryMode,
  computeMetaFlags,
  EMERGENCY_TRAP_SCORE_THRESHOLD,
  EMERGENCY_WHALE_RETAIL_DIVERGENCE_THRESHOLD,
  REGULAR_WHALE_SPIKE_WHALE_RATIO,
  REGULAR_SENTIMENT_FLIP_SCORE_DELTA,
  REGULAR_VOLATILITY_CHANGE24H
};
