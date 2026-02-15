/**
 * swarm 転換スコアの OS 接続（SHITESHI_PARASITIC_MODEL.conversion_scoring）
 * PQT ごとの swarm メトリクスを集約し、high-conversion セグメントに CTA/retarget フラグを付与。
 */
const {
  scoreSwarmConversionPotential,
  isHighConversionSwarm,
  HIGH_CONVERSION_THRESHOLD
} = require("./swarmScoring");

/**
 * swarm メトリクスから転換スコアを算出し、high-conversion なら plan にフラグを付与
 * @param {Object} plan - { highConversionSegment?, preferStrongCta?, retargetSegment? }
 * @param {Object} swarmMetrics - { pqtCtr, engagementDepth, repeatedVisits, demographicFit }
 * @returns {Object} plan（書き換え）
 */
function applyConversionFlags(plan, swarmMetrics) {
  if (!plan || typeof plan !== "object") return plan;
  if (!swarmMetrics) return plan;

  const likelihood = scoreSwarmConversionPotential(swarmMetrics);
  if (isHighConversionSwarm(likelihood)) {
    plan.highConversionSegment = true;
    plan.preferStrongCta = true;
    plan.retargetSegment = true;
  }
  plan.swarmConversionLikelihood = likelihood;
  return plan;
}

module.exports = {
  scoreSwarmConversionPotential,
  isHighConversionSwarm,
  HIGH_CONVERSION_THRESHOLD,
  applyConversionFlags
};
