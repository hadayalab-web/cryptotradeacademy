/**
 * 仕手師スコアリング（SHITESHI_PARASITIC_MODEL.shiteshi_scoring_model）
 * 候補アカウントに 0–1 の shiteshiScore を付与。24h 経過で減衰。
 */
const { SHITESHI_PARASITIC_MODEL } = require("./mlPqtScheduleConfig");

const WEIGHTS = {
  velocity: 0.30,
  volatilityImpact: 0.25,
  followerQuality: 0.20,
  networkCentrality: 0.15,
  spikeFrequency: 0.10
};

const HIGH_IMPACT_THRESHOLD = 0.7;
const DECAY_HOURS = 24;

function toNum(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : def;
}

/**
 * @param {Object} candidateMetrics - { velocity, volatilityImpact, followerQuality, networkCentrality, spikeFrequency, lastSpikeAt }
 * @returns {number} 0–1
 */
function scoreShiteshiCandidate(candidateMetrics) {
  if (!candidateMetrics || typeof candidateMetrics !== "object") return 0;

  const f = candidateMetrics;
  const score =
    WEIGHTS.velocity * toNum(f.velocity) +
    WEIGHTS.volatilityImpact * toNum(f.volatilityImpact) +
    WEIGHTS.followerQuality * toNum(f.followerQuality) +
    WEIGHTS.networkCentrality * toNum(f.networkCentrality) +
    WEIGHTS.spikeFrequency * toNum(f.spikeFrequency);

  const lastSpikeAt = Number(f.lastSpikeAt);
  let decayFactor = 1;
  if (Number.isFinite(lastSpikeAt) && lastSpikeAt > 0) {
    const hoursSince = (Date.now() - lastSpikeAt) / (1000 * 60 * 60);
    decayFactor = Math.max(0, 1 - hoursSince / DECAY_HOURS);
  }

  return Math.max(0, Math.min(1, score * decayFactor));
}

function isHighImpactShiteshi(score) {
  return Number(score) > HIGH_IMPACT_THRESHOLD;
}

module.exports = {
  scoreShiteshiCandidate,
  isHighImpactShiteshi,
  HIGH_IMPACT_THRESHOLD,
  SHITESHI_PARASITIC_MODEL
};
