// utils/logger.js
// Unified logging utility with log levels

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/**
 * Get current log level from environment variable
 * Default: INFO
 * Validates LOG_LEVEL and warns if invalid
 */
function getCurrentLogLevel() {
  const envLevel = process.env.LOG_LEVEL || 'INFO';
  const upperLevel = envLevel.toUpperCase();
  
  // Validate and warn if invalid
  if (envLevel && !LOG_LEVELS.hasOwnProperty(upperLevel)) {
    console.warn(`[logger] WARN: Invalid LOG_LEVEL="${envLevel}". Valid values: DEBUG, INFO, WARN, ERROR. Defaulting to INFO.`);
    return LOG_LEVELS.INFO;
  }
  
  return LOG_LEVELS[upperLevel] ?? LOG_LEVELS.INFO;
}

/**
 * Logger - Unified logging utility with log levels
 *
 * Features:
 * - Log level filtering (DEBUG/INFO/WARN/ERROR)
 * - Structured logging with context
 * - Consistent format across the application
 */
class Logger {
  /**
   * Log debug message (only in development or when LOG_LEVEL=DEBUG)
   *
   * @param {string} service - Service name (e.g., 'cron', 'cryptoquant')
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  static debug(service, message, context = {}) {
    // Re-evaluate log level on each call to support runtime changes
    const currentLevel = getCurrentLogLevel();
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      const logData = {
        level: 'DEBUG',
        service,
        message,
        timestamp: new Date().toISOString(),
        ...(Object.keys(context).length > 0 && { context }),
      };
      console.log(`[${service}] DEBUG:`, message, Object.keys(context).length > 0 ? context : '');
    }
  }

  /**
   * Log info message
   *
   * @param {string} service - Service name
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  static info(service, message, context = {}) {
    // Re-evaluate log level on each call to support runtime changes
    const currentLevel = getCurrentLogLevel();
    if (currentLevel <= LOG_LEVELS.INFO) {
      console.log(`[${service}] INFO:`, message, Object.keys(context).length > 0 ? context : '');
    }
  }

  /**
   * Log warning message
   *
   * @param {string} service - Service name
   * @param {string} message - Warning message
   * @param {Object} context - Additional context
   */
  static warn(service, message, context = {}) {
    // Re-evaluate log level on each call to support runtime changes
    const currentLevel = getCurrentLogLevel();
    if (currentLevel <= LOG_LEVELS.WARN) {
      console.warn(`[${service}] WARN:`, message, Object.keys(context).length > 0 ? context : '');
    }
  }

  /**
   * Log error message
   *
   * @param {string} service - Service name
   * @param {string} message - Error message
   * @param {Error|Object} error - Error object or context
   * @param {Object} context - Additional context
   */
  static error(service, message, error = null, context = {}) {
    // Re-evaluate log level on each call to support runtime changes
    const currentLevel = getCurrentLogLevel();
    if (currentLevel <= LOG_LEVELS.ERROR) {
      if (error instanceof Error) {
        console.error(`[${service}] ERROR:`, message, {
          error: error.message,
          stack: error.stack,
          ...context,
        });
      } else {
        console.error(`[${service}] ERROR:`, message, error || context);
      }
    }
  }
}

module.exports = { Logger, LOG_LEVELS };

