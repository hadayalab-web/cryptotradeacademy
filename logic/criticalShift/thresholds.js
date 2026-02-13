/**
 * CRITICAL SHIFT threshold set.
 * NOTE: All numeric values are temporary and expected to be tuned with production logs.
 */
const CRITICAL_SHIFT_THRESHOLDS = {
  // Trigger gate
  MIN_CONFIDENCE: 70,
  SUPPRESSION_WINDOW_MS: 60 * 60 * 1000, // 1h duplicate suppression window (temporary)

  // Core score thresholds (0..1)
  WHALE_ACCUMULATION_HIGH: 0.7,
  WHALE_DISTRIBUTION_HIGH: 0.7,
  RETAIL_FOMO_HIGH: 0.7,
  PANIC_HIGH: 0.7,
  LIQUIDITY_STRESS_HIGH: 0.7,
  DERIVATIVES_STRESS_HIGH: 0.7,
  SCORE_MEDIUM: 0.5,

  // Macro temporary thresholds (change24h based)
  NASDAQ_RISK_ON_CHANGE_24H: 1.0,
  NASDAQ_RISK_OFF_CHANGE_24H: -1.0,
  GOLD_RISK_ON_CHANGE_24H: -0.3,
  GOLD_RISK_OFF_CHANGE_24H: 0.3
};

module.exports = {
  CRITICAL_SHIFT_THRESHOLDS
};
