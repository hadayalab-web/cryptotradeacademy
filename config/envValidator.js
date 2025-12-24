// config/envValidator.js
// Environment variable validation utility

const { Logger } = require('../utils/logger');

/**
 * Required environment variables for the application
 */
const REQUIRED_ENV_VARS = [
  'CRYPTOQUANT_API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
];

/**
 * Recommended environment variables (optional but recommended)
 */
const RECOMMENDED_ENV_VARS = [
  'XAI_API_KEY',
  'CRON_SECRET',
];

/**
 * Validate environment variables
 *
 * @throws {Error} If required environment variables are missing
 */
function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);

  if (missing.length > 0) {
    const errorMessage = `Missing required environment variables: ${missing.join(', ')}`;
    Logger.error('envValidator', errorMessage);
    throw new Error(errorMessage);
  }

  // Check recommended variables and warn if missing
  const missingRecommended = RECOMMENDED_ENV_VARS.filter(key => !process.env[key]);

  if (missingRecommended.length > 0) {
    Logger.warn('envValidator', 'Recommended environment variables not set', {
      missing: missingRecommended.join(', '),
      note: 'Application may not function fully without these variables',
    });
  }

  Logger.info('envValidator', 'Environment variables validation passed', {
    required: REQUIRED_ENV_VARS.length,
    recommended: RECOMMENDED_ENV_VARS.length,
    missingRecommended: missingRecommended.length,
  });
}

/**
 * Validate environment variables (non-throwing version)
 *
 * @returns {Object} Validation result with missing required and recommended variables
 */
function validateEnvSafe() {
  const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);
  const missingRecommended = RECOMMENDED_ENV_VARS.filter(key => !process.env[key]);

  return {
    isValid: missing.length === 0,
    missingRequired: missing,
    missingRecommended,
  };
}

module.exports = {
  validateEnv,
  validateEnvSafe,
  REQUIRED_ENV_VARS,
  RECOMMENDED_ENV_VARS,
};

