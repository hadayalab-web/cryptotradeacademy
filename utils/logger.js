// utils/logger.js
// 構造化ログユーティリティ（UTC固定）

const { formatInTimeZone } = require('date-fns-tz');

const TZ_UTC = 'UTC';

/**
 * 構造化ロガーを作成
 * @param {string} prefix - ログのプレフィックス
 * @returns {Object} loggerオブジェクト {info, warn, error}
 */
function createLogger(prefix) {
  return {
    info: (msg, extra = {}) => {
      console.log(JSON.stringify({
        level: 'info',
        service: 'cron',
        prefix,
        msg,
        time: formatInTimeZone(new Date(), TZ_UTC, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
        ...extra,
      }));
    },
    warn: (msg, extra = {}) => {
      console.warn(JSON.stringify({
        level: 'warn',
        service: 'cron',
        prefix,
        msg,
        time: formatInTimeZone(new Date(), TZ_UTC, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
        ...extra,
      }));
    },
    error: (msg, extra = {}) => {
      console.error(JSON.stringify({
        level: 'error',
        service: 'cron',
        prefix,
        msg,
        time: formatInTimeZone(new Date(), TZ_UTC, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
        ...extra,
      }));
    },
  };
}

module.exports = {
  createLogger,
  TZ_UTC,
};
