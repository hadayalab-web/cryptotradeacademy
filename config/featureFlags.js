// config/featureFlags.js
// Feature flags for controlling experimental or unverified features

/**
 * Feature Flags Configuration
 *
 * Controls the availability of features, especially for unverified API endpoints.
 * Can be toggled via environment variables for production safety.
 */
const FEATURE_FLAGS = {
  // CryptoQuant API endpoints
  // Set to 'false' to disable unverified endpoints
  CQ_WHALE_FLOWS_ENABLED: process.env.CQ_WHALE_FLOWS_ENABLED !== 'false', // default: true
  CQ_LIQUIDATIONS_ENABLED: process.env.CQ_LIQUIDATIONS_ENABLED !== 'false', // default: true
  CQ_NUPL_ENABLED: process.env.CQ_NUPL_ENABLED !== 'false', // default: true
  CQ_SOPR_ENABLED: process.env.CQ_SOPR_ENABLED !== 'false', // default: true
  CQ_UPBIT_INFLOW_ENABLED: process.env.CQ_UPBIT_INFLOW_ENABLED !== 'false', // default: true
  CQ_BINANCE_INFLOW_ENABLED: process.env.CQ_BINANCE_INFLOW_ENABLED !== 'false', // default: true

  // Event-driven delivery system
  ENABLE_EVENT_DRIVEN: process.env.ENABLE_EVENT_DRIVEN !== 'false', // default: true

  // Debug mode
  DEBUG_MODE: process.env.NODE_ENV === 'development',
};

/**
 * Check if a feature is enabled
 *
 * @param {string} featureName - Name of the feature flag
 * @returns {boolean} Whether the feature is enabled
 */
function isFeatureEnabled(featureName) {
  return FEATURE_FLAGS[featureName] === true;
}

/**
 * Get feature flag value
 *
 * @param {string} featureName - Name of the feature flag
 * @returns {boolean|string|undefined} Feature flag value
 */
function getFeatureFlag(featureName) {
  return FEATURE_FLAGS[featureName];
}

module.exports = {
  FEATURE_FLAGS,
  isFeatureEnabled,
  getFeatureFlag,
};

