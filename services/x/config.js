const REQUIRED_KEYS = [
  'X_API_CONSUMER_KEY',
  'X_API_CONSUMER_KEY_SECRET',
  'X_API_ACCESS_TOKEN',
  'X_API_ACCESS_TOKEN_SECRET',
];

// P2 FIX: 共通ユーティリティを使用
const { parseBoolean: parseBooleanUtil } = require('../../utils/common');

function parseBoolean(value, defaultValue = false) {
  return parseBooleanUtil(value, defaultValue);
}

function getXConfigStatus() {
  const missing = REQUIRED_KEYS.filter((key) => !process.env[key]);
  return {
    configured: missing.length === 0,
    missing,
    postingEnabled: parseBoolean(process.env.X_POSTING_ENABLED, true),
    dryRun: parseBoolean(process.env.X_POSTING_DRY_RUN, false),
  };
}

module.exports = {
  getXConfigStatus,
};
