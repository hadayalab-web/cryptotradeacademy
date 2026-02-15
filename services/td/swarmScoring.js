/**
 * swarm 転換スコア（SHITESHI_PARASITIC_MODEL.conversion_scoring）
 * PQT CTR / depth / repeats / fit の重み付き和を sigmoid で 0–1 に圧縮。
 */
const { SHITESHI_PARASITIC_MODEL } = require("./mlPqtScheduleConfig");

const WEIGHTS = {
  pqtCtr: 0.40,
  engagementDepth: 0.30,
  repeatedVisits: 0.20,
  demographicFit: 0.10
};

const HIGH_CONVERSION_THRESHOLD = 0.6;
const SIGMOID_STEEPNESS = 8;
const SIGMOID_CENTER = 0.5;

function toNum(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : def;
}

/**
 * @param {Object} swarmMetrics - { pqtCtr, engagementDepth, repeatedVisits, demographicFit }
 * @returns {number} 0–1 likelihood
 */
function scoreSwarmConversionPotential(swarmMetrics) {
  if (!swarmMetrics || typeof swarmMetrics !== "object") return 0;

  const s = swarmMetrics;
  const raw =
    WEIGHTS.pqtCtr * toNum(s.pqtCtr) +
    WEIGHTS.engagementDepth * toNum(s.engagementDepth) +
    WEIGHTS.repeatedVisits * toNum(s.repeatedVisits) +
    WEIGHTS.demographicFit * toNum(s.demographicFit);

  const likelihood = 1 / (1 + Math.exp(-SIGMOID_STEEPNESS * (raw - SIGMOID_CENTER)));
  return Math.max(0, Math.min(1, likelihood));
}

function isHighConversionSwarm(likelihood) {
  return Number(likelihood) > HIGH_CONVERSION_THRESHOLD;
}

module.exports = {
  scoreSwarmConversionPotential,
  isHighConversionSwarm,
  HIGH_CONVERSION_THRESHOLD,
  SHITESHI_PARASITIC_MODEL
};
