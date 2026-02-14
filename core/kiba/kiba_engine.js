/**
 * KIBA engine. CQ + X only. Internal only; never expose KIBA name or score to users.
 * No Kaiko / orderbook / cluster / liquidation.
 */
const { detectFlowAnomaly } = require("./detectors/flow");
const { detectLiquidityAnomaly } = require("./detectors/liquidity");
const { detectSentimentAnomaly } = require("./detectors/sentiment");
const { detectWhaleAnomaly } = require("./detectors/whale");
const { detectAlgoAnomaly } = require("./detectors/algo");
const { detectRetailAnomaly } = require("./detectors/retail");
const { computeKibaScore } = require("./scoring/kiba_score");
const { evaluateKibaImpact } = require("./evaluator/kiba_trigger");

const SUPPRESSION_WINDOW_MS = 60 * 60 * 1000; // 1h cooldown
const LOW_VOLATILITY_THRESHOLD = 0.5; // |change24h| < this → suppress
const X_VOLUME_MIN = 10; // avgVolume or postVolume below → suppress
const WHALE_SIGMA = 0.5; // normalized whale imbalance within threshold → suppress

function toNum(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Map btcSnapshot to detector inputs. CQ + X only. No orderbook / cluster / liquidation.
 */
function snapshotToDetectorInputs(btcSnapshot) {
  const cq = btcSnapshot?.cqDeep || {};
  const x = btcSnapshot?.xSentiment || {};
  const raw = btcSnapshot?.raw || {};
  const flows = cq.exchangeFlowsDetailed || {};
  const inflow = toNum(flows.inflow ?? cq.exchangeInflow, 0);
  const outflow = toNum(flows.outflow ?? cq.exchangeOutflow, 0);
  const netflow = toNum(flows.netflow ?? cq.netflow, inflow - outflow);
  const mean = 0;
  const std = 1;

  const postVolume = toNum(x.postVolume ?? x.volume, 0);
  const avgVolume = Math.max(1, toNum(x.avgVolume ?? x.postVolume, 1));
  const fearRaw = toNum(raw.fng?.value ?? raw.fng, 50);
  const fearScore = fearRaw <= 25 ? 1 : fearRaw >= 75 ? 0 : (75 - fearRaw) / 50;

  const panicKeywords = toNum(x.panicKeywords ?? x.panicRatio, 0);
  const bullishDrop = toNum(x.bullishDrop ?? x.retailBias, 0);

  const change24h = toNum(raw.change24h, 0);
  const netflowChange = 0;
  const priceImpact = Math.min(1, Math.abs(change24h) / 10);
  const flowTotal = Math.abs(inflow) + Math.abs(outflow);
  const volumeSpike = flowTotal > 0 ? Math.min(1, Math.log10(flowTotal + 1) / 8) : 0;

  const flowPriceCorr = 0;
  const periodicWhale = 0;

  return {
    flow: { netflow, mean, std },
    whale: { whaleIn: inflow, whaleOut: Math.abs(outflow), mean, std },
    sentiment: { postVolume, avgVolume, fearScore },
    retail: { panicKeywords, bullishDrop },
    liquidity: { netflowChange, priceImpact, volumeSpike },
    algo: { flowPriceCorr, periodicWhale },
    _meta: {
      hasCq: !!(cq && (cq.exchangeInflow != null || cq.exchangeOutflow != null || cq.netflow != null || inflow !== 0 || outflow !== 0)),
      postVolume,
      avgVolume,
      change24h,
      whaleImbalanceNorm: flowTotal > 0 ? Math.abs(inflow - outflow) / (flowTotal + 1e-6) : 0
    }
  };
}

/**
 * 誤検出防止: score を 0〜30 に抑制する条件
 */
function applySuppressionFilters(score, inputs) {
  const m = inputs._meta || {};
  let capped = score;

  if (!m.hasCq) capped = Math.min(capped, 30);
  if (m.avgVolume < X_VOLUME_MIN || m.postVolume < X_VOLUME_MIN) capped = Math.min(capped, 30);
  if (Math.abs(m.change24h) < LOW_VOLATILITY_THRESHOLD) capped = Math.min(capped, 30);
  if ((m.whaleImbalanceNorm || 0) <= WHALE_SIGMA) capped = Math.min(capped, 30);

  return capped;
}

function runKibaEngine({ btcSnapshot = null, macroSnapshot = null, lastKibaSnapshot = null }) {
  const empty = {
    triggered: false,
    kibaScore: 0,
    impact: { level: "NONE", intensity: "none" },
    snapshot: null,
    detectors: {}
  };

  if (!btcSnapshot || typeof btcSnapshot !== "object") return empty;

  const inputs = snapshotToDetectorInputs(btcSnapshot);

  const flow = detectFlowAnomaly(inputs.flow.netflow, inputs.flow.mean, inputs.flow.std);
  const whale = detectWhaleAnomaly(
    inputs.whale.whaleIn,
    inputs.whale.whaleOut,
    inputs.whale.mean,
    inputs.whale.std
  );
  const sentiment = detectSentimentAnomaly(
    inputs.sentiment.postVolume,
    inputs.sentiment.avgVolume,
    inputs.sentiment.fearScore
  );
  const retail = detectRetailAnomaly(inputs.retail.panicKeywords, inputs.retail.bullishDrop);
  const liquidity = detectLiquidityAnomaly(
    inputs.liquidity.netflowChange,
    inputs.liquidity.priceImpact,
    inputs.liquidity.volumeSpike
  );
  const algo = detectAlgoAnomaly(inputs.algo.flowPriceCorr, inputs.algo.periodicWhale);

  const detectors = { flow, liquidity, sentiment, whale, algo, retail };
  const rawScore = computeKibaScore(detectors);
  const kibaScore = applySuppressionFilters(rawScore, inputs);
  const impact = evaluateKibaImpact(kibaScore);

  let triggered =
    (impact.level === "CRITICAL" || impact.level === "HIGH" || impact.level === "ELEVATED") &&
    kibaScore >= 65;

  if (triggered && lastKibaSnapshot && typeof lastKibaSnapshot === "object") {
    const lastTime = new Date(lastKibaSnapshot.as_of_utc || 0).getTime();
    const nowTime = new Date(btcSnapshot.as_of_utc || Date.now()).getTime();
    if (
      Number.isFinite(lastTime) &&
      Number.isFinite(nowTime) &&
      nowTime - lastTime >= 0 &&
      nowTime - lastTime < SUPPRESSION_WINDOW_MS
    ) {
      triggered = false;
    }
  }

  const asOfUtc = btcSnapshot.as_of_utc || new Date().toISOString();
  const snapshot = {
    as_of_utc: asOfUtc,
    level: impact.level,
    intensity: impact.intensity,
    btcContext: btcSnapshot.raw
      ? {
          priceUsd: toNum(btcSnapshot.raw.priceUsd, null),
          change24h: toNum(btcSnapshot.raw.change24h, null),
          regime: btcSnapshot.marketRegime ?? null
        }
      : null,
    macroContext:
      macroSnapshot?.macroRiskOnOff != null
        ? {
            nasdaqRegime: macroSnapshot.nasdaqRegime ?? null,
            goldWhaleBias: macroSnapshot.goldWhaleBias ?? null,
            macroRiskOnOff: macroSnapshot.macroRiskOnOff ?? null
          }
        : null
  };

  return { triggered, kibaScore, impact, snapshot, detectors };
}

module.exports = {
  runKibaEngine,
  evaluateKibaImpact,
  computeKibaScore,
  SUPPRESSION_WINDOW_MS
};
