// services/lead-discovery/rateLimiter.js
// X API / Telegram API レート制限対策

const { kv } = require('@vercel/kv');

// X APIレート制限: 300リクエスト/15分 = 20リクエスト/分
const X_API_RATE_LIMIT_PER_MINUTE = 20;
const X_API_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15分

// Telegram APIレート制限: 30メッセージ/秒 = 1800メッセージ/分
const TELEGRAM_API_RATE_LIMIT_PER_MINUTE = 1800;
const TELEGRAM_API_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1分

// ローカルフォールバック（KV不調時）
const LOCAL_X_RATE_LIMIT = 15; // 安全側に倒す
const LOCAL_TELEGRAM_RATE_LIMIT = 1500;

const X_RATE_LIMIT_KEY = 'rate_limit:x_api';
const TELEGRAM_RATE_LIMIT_KEY = 'rate_limit:telegram_api';

// ローカルカウンター（プロセス単位）
const localXCounters = new Map();
const localTelegramCounters = new Map();

/**
 * X APIレート制限チェック
 * @returns {Promise<boolean>} リクエスト可能な場合true
 */
async function checkXApiRateLimit() {
  const now = Date.now();
  const windowStart = Math.floor(now / 60000) * 60000; // 1分単位

  try {
    if (!kv) {
      return checkLocalRateLimit(localXCounters, windowStart, LOCAL_X_RATE_LIMIT, 'X API');
    }

    const windowKey = `${X_RATE_LIMIT_KEY}:${windowStart}`;
    const currentCount = await kv.get(windowKey) || 0;

    if (currentCount >= X_API_RATE_LIMIT_PER_MINUTE) {
      console.warn(`[Rate Limit] X API limit exceeded: ${currentCount}/${X_API_RATE_LIMIT_PER_MINUTE} requests per minute`);
      return false;
    }

    await kv.incr(windowKey);
    await kv.expire(windowKey, 120); // 2分後に自動削除
    return true;
  } catch (error) {
    console.warn('[Rate Limit] X API check failed, using local limit:', error.message);
    return checkLocalRateLimit(localXCounters, windowStart, LOCAL_X_RATE_LIMIT, 'X API');
  }
}

/**
 * Telegram APIレート制限チェック
 * @returns {Promise<boolean>} リクエスト可能な場合true
 */
async function checkTelegramApiRateLimit() {
  const now = Date.now();
  const windowStart = Math.floor(now / 60000) * 60000; // 1分単位

  try {
    if (!kv) {
      return checkLocalRateLimit(localTelegramCounters, windowStart, LOCAL_TELEGRAM_RATE_LIMIT, 'Telegram API');
    }

    const windowKey = `${TELEGRAM_RATE_LIMIT_KEY}:${windowStart}`;
    const currentCount = await kv.get(windowKey) || 0;

    if (currentCount >= TELEGRAM_API_RATE_LIMIT_PER_MINUTE) {
      console.warn(`[Rate Limit] Telegram API limit exceeded: ${currentCount}/${TELEGRAM_API_RATE_LIMIT_PER_MINUTE} requests per minute`);
      return false;
    }

    await kv.incr(windowKey);
    await kv.expire(windowKey, 120); // 2分後に自動削除
    return true;
  } catch (error) {
    console.warn('[Rate Limit] Telegram API check failed, using local limit:', error.message);
    return checkLocalRateLimit(localTelegramCounters, windowStart, LOCAL_TELEGRAM_RATE_LIMIT, 'Telegram API');
  }
}

/**
 * ローカルレート制限チェック（KV不調時のフォールバック）
 * @param {Map} counters - カウンターMap
 * @param {number} windowStart - ウィンドウ開始時刻
 * @param {number} limit - レート制限値
 * @param {string} serviceName - サービス名（ログ用）
 * @returns {boolean} リクエスト可能な場合true
 */
function checkLocalRateLimit(counters, windowStart, limit, serviceName) {
  // 古いウィンドウをクリーンアップ（10個以上の場合）
  if (counters.size >= 10) {
    const now = Date.now();
    for (const [window, count] of counters.entries()) {
      if (now - window > 5 * 60 * 1000) { // 5分以上前のウィンドウを削除
        counters.delete(window);
      }
    }
  }

  const currentCount = counters.get(windowStart) || 0;
  if (currentCount >= limit) {
    console.warn(`[Rate Limit] ${serviceName} local limit exceeded: ${currentCount}/${limit} requests per minute`);
    return false;
  }

  counters.set(windowStart, currentCount + 1);
  return true;
}

/**
 * レート制限まで待機
 * @param {Function} checkFn - レート制限チェック関数
 * @param {number} maxWaitMs - 最大待機時間（ミリ秒）
 * @returns {Promise<boolean>} リクエスト可能になった場合true
 */
async function waitForRateLimit(checkFn, maxWaitMs = 60000) {
  const startTime = Date.now();
  const checkInterval = 1000; // 1秒ごとにチェック

  while (Date.now() - startTime < maxWaitMs) {
    const canProceed = await checkFn();
    if (canProceed) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  console.error('[Rate Limit] Wait timeout exceeded');
  return false;
}

module.exports = {
  checkXApiRateLimit,
  checkTelegramApiRateLimit,
  waitForRateLimit,
  X_API_RATE_LIMIT_PER_MINUTE,
  TELEGRAM_API_RATE_LIMIT_PER_MINUTE,
};
