const REQUIRED_KEYS = [
  'X_API_CONSUMER_KEY',
  'X_API_CONSUMER_KEY_SECRET',
  'X_API_ACCESS_TOKEN',
  'X_API_ACCESS_TOKEN_SECRET',
];

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return defaultValue;
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
