/**
 * 寄生エントリータイミング（SHITESHI_PARASITIC_MODEL.parasitic_entry_timing）
 * rampPercentile に応じて early / mid / late を返す。
 */
const { SHITESHI_PARASITIC_MODEL } = require("./mlPqtScheduleConfig");

const EARLY_MAX = 0.2;
const MID_MAX = 0.6;

/**
 * @param {number} rampPercentile - 0-1（engagement ramp の百分位）
 * @returns {'early'|'mid'|'late'}
 */
function classifyParasiticTiming(rampPercentile) {
  const p = Number(rampPercentile);
  if (!Number.isFinite(p)) return "mid";
  const clamped = Math.max(0, Math.min(1, p));
  if (clamped < EARLY_MAX) return "early";
  if (clamped <= MID_MAX) return "mid";
  return "late";
}

module.exports = {
  classifyParasiticTiming,
  SHITESHI_PARASITIC_MODEL
};
