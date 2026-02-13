/**
 * Single source of truth for macro risk (RISK_ON / RISK_OFF / NEUTRAL).
 * Used by run.js, evaluator.js, buzzweave-run.js. All thresholds from thresholds.js.
 */
const { CRITICAL_SHIFT_THRESHOLDS } = require("./thresholds");

function toNumberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeMacroRiskOnOff(value) {
  if (!value) return null;
  const upper = String(value).toUpperCase();
  if (upper === "RISK_ON") return "RISK_ON";
  if (upper === "RISK_OFF") return "RISK_OFF";
  if (upper === "NEUTRAL" || upper === "MIXED") return "NEUTRAL";
  return null;
}

/**
 * Infer macro risk from NASDAQ/GOLD change24h only. No snapshot labels.
 * @param {{ nasdaqChange24h?: number|null, goldChange24h?: number|null }} inputs
 * @param {Object} [thresholds] - defaults to CRITICAL_SHIFT_THRESHOLDS
 * @returns {"RISK_ON"|"RISK_OFF"|"NEUTRAL"|null}
 */
function inferMacroRiskOnOff(inputs, thresholds = CRITICAL_SHIFT_THRESHOLDS) {
  const nasdaqChange24h = toNumberOrNull(inputs?.nasdaqChange24h);
  const goldChange24h = toNumberOrNull(inputs?.goldChange24h);

  if (nasdaqChange24h == null && goldChange24h == null) return null;

  const t = thresholds;
  if (
    nasdaqChange24h != null &&
    nasdaqChange24h >= t.NASDAQ_RISK_ON_CHANGE_24H &&
    (goldChange24h == null || goldChange24h <= t.GOLD_RISK_ON_CHANGE_24H)
  ) {
    return "RISK_ON";
  }
  if (
    nasdaqChange24h != null &&
    nasdaqChange24h <= t.NASDAQ_RISK_OFF_CHANGE_24H &&
    (goldChange24h == null || goldChange24h >= t.GOLD_RISK_OFF_CHANGE_24H)
  ) {
    return "RISK_OFF";
  }
  return "NEUTRAL";
}

/**
 * Build macroContext from NASDAQ/GOLD asset snapshots (for cron → btcSnapshot).
 * @param {{ nasdaqSnapshot?: object|null, goldSnapshot?: object|null }} params
 * @param {Object} [thresholds]
 * @returns {{ nasdaqRegime: string|null, goldWhaleBias: string|null, macroRiskOnOff: "RISK_ON"|"RISK_OFF"|"NEUTRAL"|null }}
 */
function buildMacroContextFromAssets(
  { nasdaqSnapshot = null, goldSnapshot = null } = {},
  thresholds = CRITICAL_SHIFT_THRESHOLDS
) {
  const nasdaqChange24h = toNumberOrNull(nasdaqSnapshot?.raw?.change24h);
  const goldChange24h = toNumberOrNull(goldSnapshot?.raw?.change24h);

  const macroRiskOnOff = inferMacroRiskOnOff(
    { nasdaqChange24h, goldChange24h },
    thresholds
  );

  const nasdaqRegime =
    nasdaqChange24h == null
      ? null
      : nasdaqChange24h >= thresholds.NASDAQ_RISK_ON_CHANGE_24H
        ? "RISK_ON"
        : nasdaqChange24h <= thresholds.NASDAQ_RISK_OFF_CHANGE_24H
          ? "RISK_OFF"
          : "NEUTRAL";

  const goldWhaleBias =
    goldChange24h == null
      ? null
      : goldChange24h > 0
        ? "BULLISH"
        : goldChange24h < 0
          ? "BEARISH"
          : "NEUTRAL";

  return {
    nasdaqRegime: nasdaqRegime == null ? null : String(nasdaqRegime),
    goldWhaleBias: goldWhaleBias == null ? null : String(goldWhaleBias),
    macroRiskOnOff
  };
}

module.exports = {
  inferMacroRiskOnOff,
  buildMacroContextFromAssets,
  normalizeMacroRiskOnOff
};
