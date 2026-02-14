/**
 * Single source of truth for macro risk (RISK_ON / RISK_OFF / NEUTRAL).
 * Used by kiba/run, cron, buzzweave-run. Macro-only thresholds.
 */
const MACRO_THRESHOLDS = {
  NASDAQ_RISK_ON_CHANGE_24H: 1.0,
  NASDAQ_RISK_OFF_CHANGE_24H: -1.0,
  GOLD_RISK_ON_CHANGE_24H: -0.3,
  GOLD_RISK_OFF_CHANGE_24H: 0.3
};

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

function inferMacroRiskOnOff(inputs, thresholds) {
  const t = thresholds || MACRO_THRESHOLDS;
  const nasdaqChange24h = toNumberOrNull(inputs?.nasdaqChange24h);
  const goldChange24h = toNumberOrNull(inputs?.goldChange24h);
  if (nasdaqChange24h == null && goldChange24h == null) return null;
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

function buildMacroContextFromAssets(
  _params,
  thresholds
) {
  const { nasdaqSnapshot = null, goldSnapshot = null } = _params || {};
  const t = thresholds || MACRO_THRESHOLDS;
  const nasdaqChange24h = toNumberOrNull(nasdaqSnapshot?.raw?.change24h);
  const goldChange24h = toNumberOrNull(goldSnapshot?.raw?.change24h);
  const macroRiskOnOff = inferMacroRiskOnOff(
    { nasdaqChange24h, goldChange24h },
    t
  );
  const nasdaqRegime =
    nasdaqChange24h == null
      ? null
      : nasdaqChange24h >= t.NASDAQ_RISK_ON_CHANGE_24H
        ? "RISK_ON"
        : nasdaqChange24h <= t.NASDAQ_RISK_OFF_CHANGE_24H
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
  normalizeMacroRiskOnOff,
  MACRO_THRESHOLDS
};
