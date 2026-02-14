/**
 * Impact evaluator. Internal only; never expose KIBA name.
 */
function evaluateKibaImpact(score) {
  const s = Number(score);
  if (!Number.isFinite(s)) return { level: "NONE", intensity: "none" };
  if (s >= 85) return { level: "CRITICAL", intensity: "max" };
  if (s >= 75) return { level: "HIGH", intensity: "strong" };
  if (s >= 65) return { level: "ELEVATED", intensity: "moderate" };
  return { level: "NONE", intensity: "none" };
}
module.exports = { evaluateKibaImpact };
