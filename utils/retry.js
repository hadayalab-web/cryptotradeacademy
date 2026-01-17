// utils/retry.js
// 指数バックオフ・リトライユーティリティ
// Grok CSO+CFO推奨: Telegram APIエラー時のリトライロジック

/**
 * 指数バックオフでリトライを実行
 * @param {Function} fn - 実行する関数（Promiseを返す）
 * @param {Object} options - オプション
 * @param {number} options.maxRetries - 最大リトライ回数（デフォルト: 3）
 * @param {number} options.initialDelay - 初期待機時間（ミリ秒、デフォルト: 1000）
 * @param {number} options.maxDelay - 最大待機時間（ミリ秒、デフォルト: 30000）
 * @param {Function} options.shouldRetry - リトライすべきエラーかどうかを判定する関数
 * @returns {Promise<any>} 関数の実行結果
 */
async function retryWithExponentialBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    shouldRetry = (error) => {
      // デフォルト: 429 (Rate Limit) と 500系エラーをリトライ
      if (error.status === 429 || (error.status >= 500 && error.status < 600)) {
        return true;
      }
      // Telegram APIエラーの場合
      if (error.message && (
        error.message.includes('429') ||
        error.message.includes('Too Many Requests') ||
        error.message.includes('500') ||
        error.message.includes('502') ||
        error.message.includes('503')
      )) {
        return true;
      }
      return false;
    },
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // リトライすべきエラーでない場合、または最大リトライ回数に達した場合
      if (!shouldRetry(error) || attempt === maxRetries) {
        throw error;
      }

      // 指数バックオフ: delay = initialDelay * 2^attempt
      delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
      
      console.warn(
        `⚠️ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms. Error: ${error.message || error}`
      );

      // 待機
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

module.exports = { retryWithExponentialBackoff };
