// utils/errorTracker.js
// Error tracking utility for structured logging and monitoring

/**
 * ErrorTracker - Structured error logging and tracking
 * 
 * Features:
 * - Structured error logging with context
 * - Stack trace preservation
 * - Optional external monitoring integration (Sentry, etc.)
 * - Error metadata tracking
 */
class ErrorTracker {
  /**
   * Track an error with full context
   * 
   * @param {string} service - Service name (e.g., 'cryptoquant', 'binance')
   * @param {string} operation - Operation name (e.g., 'getWhaleFlows', 'fetchKlines')
   * @param {Error} error - Error object
   * @param {Object} context - Additional context (endpoint, params, etc.)
   * @returns {Object} Error information object
   */
  static trackError(service, operation, error, context = {}) {
    const errorInfo = {
      service,
      operation,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
      },
      context,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
    };

    // Structured logging
    console.error(`[${service}] ERROR in ${operation}:`, JSON.stringify(errorInfo, null, 2));

    // External monitoring integration (Sentry, DataDog, etc.)
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry integration (uncomment if Sentry is configured)
      // if (typeof Sentry !== 'undefined') {
      //   Sentry.captureException(error, {
      //     tags: {
      //       service,
      //       operation,
      //     },
      //     extra: context,
      //   });
      // }

      // Example: Custom error tracking endpoint
      // if (process.env.ERROR_TRACKING_ENDPOINT) {
      //   fetch(process.env.ERROR_TRACKING_ENDPOINT, {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify(errorInfo),
      //   }).catch(err => console.error('Failed to send error to tracking service:', err));
      // }
    }

    return errorInfo;
  }

  /**
   * Track a warning (non-critical issue)
   * 
   * @param {string} service - Service name
   * @param {string} operation - Operation name
   * @param {string} message - Warning message
   * @param {Object} context - Additional context
   */
  static trackWarning(service, operation, message, context = {}) {
    const warningInfo = {
      service,
      operation,
      message,
      context,
      timestamp: new Date().toISOString(),
      level: 'warning',
    };

    console.warn(`[${service}] WARNING in ${operation}:`, JSON.stringify(warningInfo, null, 2));
    return warningInfo;
  }

  /**
   * Create error object with metadata for return values
   * 
   * @param {Error} error - Original error
   * @param {Object} defaults - Default values to return
   * @returns {Object} Object with defaults and error metadata
   */
  static createErrorResult(error, defaults = {}) {
    return {
      ...defaults,
      error: true,
      errorMessage: error.message,
      errorName: error.name,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = { ErrorTracker };

