/**
 * CRITICAL SHIFT snapshot schema helpers.
 */

const CRITICAL_SHIFT_LATEST_KV_KEY = "criticalshift:snapshot:latest";
const CRITICAL_SHIFT_HISTORY_PREFIX = "criticalshift:snapshot";
const CRITICAL_SHIFT_TYPES = ["UP", "DOWN", "TOP", "BOTTOM", "ACCEL", "REVERSAL", "NONE"];
const CRITICAL_SHIFT_MACRO_STATES = ["RISK_ON", "RISK_OFF", "NEUTRAL"];

function toNumberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp01(value) {
  if (!Number.isFinite(value)) return null;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return Number(value.toFixed(3));
}

function clampConfidence(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n <= 0) return 0;
  if (n >= 100) return 100;
  return Math.round(n);
}

function normalizeShiftType(value) {
  const upper = String(value || "NONE").toUpperCase();
  return CRITICAL_SHIFT_TYPES.includes(upper) ? upper : "NONE";
}

function normalizeMacroRiskOnOff(value) {
  if (!value) return null;
  const upper = String(value).toUpperCase();
  if (upper === "MIXED") return "NEUTRAL";
  return CRITICAL_SHIFT_MACRO_STATES.includes(upper) ? upper : null;
}

function buildCriticalShiftHistoryKey(asOfUtc, bucketMinutes = 15) {
  const d = new Date(asOfUtc || Date.now());
  if (!Number.isFinite(d.getTime())) {
    return `${CRITICAL_SHIFT_HISTORY_PREFIX}:${Date.now()}`;
  }
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const minute = d.getUTCMinutes();
  const bucket = Math.max(1, Number(bucketMinutes) || 15);
  const minuteBucket = String(Math.floor(minute / bucket) * bucket).padStart(2, "0");
  return `${CRITICAL_SHIFT_HISTORY_PREFIX}:${y}${m}${day}${h}${minuteBucket}`;
}

function pickMacroContext(macroSnapshot, btcSnapshot, normalizedMacroRiskOnOff) {
  const source = macroSnapshot || btcSnapshot?.macroContext || null;
  if (!source) return null;

  const nasdaqRegime = source.nasdaqRegime ?? btcSnapshot?.macroContext?.nasdaqRegime ?? null;
  const goldBiasRaw = source.goldWhaleBias ?? btcSnapshot?.macroContext?.goldWhaleBias ?? null;
  const goldWhaleBias = goldBiasRaw == null ? null : String(goldBiasRaw);
  const macroRiskOnOff =
    normalizeMacroRiskOnOff(source.macroRiskOnOff) ??
    normalizedMacroRiskOnOff ??
    normalizeMacroRiskOnOff(btcSnapshot?.macroContext?.macroRiskOnOff) ??
    null;

  return {
    nasdaqRegime: nasdaqRegime == null ? null : String(nasdaqRegime),
    goldWhaleBias,
    macroRiskOnOff
  };
}

/**
 * @typedef {Object} CriticalShiftSnapshot
 * @property {string} as_of_utc
 * @property {"UP"|"DOWN"|"TOP"|"BOTTOM"|"ACCEL"|"REVERSAL"|"NONE"} shiftType
 * @property {number} confidence
 * @property {string[]} reasons
 * @property {{
 *  whaleAccumulationScore?: number|null,
 *  whaleDistributionScore?: number|null,
 *  retailFomoScore?: number|null,
 *  panicScore?: number|null,
 *  liquidityStressScore?: number|null,
 *  derivativesStressScore?: number|null,
 *  macroRiskOnOff?: "RISK_ON"|"RISK_OFF"|"NEUTRAL"|null
 * }} metrics
 * @property {{ priceUsd?: number|null, change24h?: number|null, regime?: string|null }|null} [btcContext]
 * @property {{ nasdaqRegime?: string|null, goldWhaleBias?: string|null, macroRiskOnOff?: "RISK_ON"|"RISK_OFF"|"NEUTRAL"|null }|null} [macroContext]
 */

/**
 * Build normalized CRITICAL SHIFT snapshot object.
 *
 * @param {Object} params
 * @param {Object} params.evaluation - evaluateCriticalShift result
 * @param {Object|null} params.btcSnapshot
 * @param {Object|null} params.macroSnapshot
 * @param {string} [params.as_of_utc]
 * @returns {CriticalShiftSnapshot}
 */
function buildCriticalShiftSnapshot({ evaluation, btcSnapshot = null, macroSnapshot = null, as_of_utc }) {
  const evalSafe = evaluation && typeof evaluation === "object" ? evaluation : {};
  const metrics = evalSafe.metrics && typeof evalSafe.metrics === "object" ? evalSafe.metrics : {};
  const normalizedMacroRiskOnOff = normalizeMacroRiskOnOff(metrics.macroRiskOnOff);

  return {
    as_of_utc: as_of_utc || btcSnapshot?.as_of_utc || new Date().toISOString(),
    shiftType: normalizeShiftType(evalSafe.shiftType),
    confidence: clampConfidence(evalSafe.confidence),
    reasons: Array.isArray(evalSafe.reasons)
      ? evalSafe.reasons.filter((x) => typeof x === "string" && x.trim()).slice(0, 8)
      : [],
    metrics: {
      whaleAccumulationScore: clamp01(toNumberOrNull(metrics.whaleAccumulationScore)),
      whaleDistributionScore: clamp01(toNumberOrNull(metrics.whaleDistributionScore)),
      retailFomoScore: clamp01(toNumberOrNull(metrics.retailFomoScore)),
      panicScore: clamp01(toNumberOrNull(metrics.panicScore)),
      liquidityStressScore: clamp01(toNumberOrNull(metrics.liquidityStressScore)),
      derivativesStressScore: clamp01(toNumberOrNull(metrics.derivativesStressScore)),
      macroRiskOnOff: normalizedMacroRiskOnOff
    },
    btcContext: btcSnapshot
      ? {
          priceUsd: toNumberOrNull(btcSnapshot?.raw?.priceUsd),
          change24h: toNumberOrNull(btcSnapshot?.raw?.change24h),
          regime: btcSnapshot?.marketRegime ?? null
        }
      : null,
    macroContext: pickMacroContext(macroSnapshot, btcSnapshot, normalizedMacroRiskOnOff)
  };
}

module.exports = {
  CRITICAL_SHIFT_LATEST_KV_KEY,
  CRITICAL_SHIFT_HISTORY_PREFIX,
  CRITICAL_SHIFT_TYPES,
  CRITICAL_SHIFT_MACRO_STATES,
  buildCriticalShiftHistoryKey,
  buildCriticalShiftSnapshot,
  normalizeMacroRiskOnOff
};
