// services/core/postLogger.js
// 投稿履歴の確実なログ記録（KVストレージ）

let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[PostLogger] @vercel/kv not available:', error.message);
}

const LOG_KEY_PREFIX = 'x:post_logs:';
const MAX_LOGS_PER_DAY = 1000; // 1日あたりの最大ログ数

/**
 * 日付文字列を取得（YYYY-MM-DD）
 */
function getDateString(date = new Date()) {
  return date.toISOString().split('T')[0];
}

/**
 * ログキーを生成
 */
function getLogKey(dateString) {
  return `${LOG_KEY_PREFIX}${dateString}`;
}

/**
 * 投稿成功ログを記録
 * @param {Object} logData - ログデータ
 * @returns {Promise<boolean>} 記録成功時true
 */
async function logPostSuccess(logData) {
  if (!kv) {
    console.warn('[PostLogger] KV not available, cannot log post success');
    // KVが利用できない場合でも、console.logで記録
    console.log('[PostLogger] POST_SUCCESS:', JSON.stringify(logData, null, 2));
    return false;
  }

  try {
    const dateString = getDateString();
    const logKey = getLogKey(dateString);
    const timestamp = new Date().toISOString();
    
    // 構造化ログデータ
    const structuredLog = {
      timestamp,
      type: 'POST_SUCCESS',
      ...logData,
    };
    
    // 既存のログを取得
    let logs = await kv.get(logKey) || [];
    if (!Array.isArray(logs)) {
      logs = [];
    }
    
    // 新しいログを追加
    logs.push(structuredLog);
    
    // 最大ログ数を超える場合は古いログを削除
    if (logs.length > MAX_LOGS_PER_DAY) {
      logs = logs.slice(-MAX_LOGS_PER_DAY);
    }
    
    // KVに保存（TTL: 30日）
    await kv.set(logKey, logs, { ex: 30 * 24 * 60 * 60 });
    
    // console.logでも記録（Vercelログ用）
    console.log(`[PostLogger] ✅ POST_SUCCESS logged: ${JSON.stringify(structuredLog)}`);
    
    return true;
  } catch (error) {
    console.error('[PostLogger] ❌ Failed to log post success:', error.message);
    // エラー時もconsole.logで記録
    console.log('[PostLogger] POST_SUCCESS (fallback):', JSON.stringify(logData, null, 2));
    return false;
  }
}

/**
 * 投稿失敗ログを記録
 * @param {Object} logData - ログデータ
 * @returns {Promise<boolean>} 記録成功時true
 */
async function logPostFailure(logData) {
  if (!kv) {
    console.warn('[PostLogger] KV not available, cannot log post failure');
    console.error('[PostLogger] POST_FAILURE:', JSON.stringify(logData, null, 2));
    return false;
  }

  try {
    const dateString = getDateString();
    const logKey = getLogKey(dateString);
    const timestamp = new Date().toISOString();
    
    // 構造化ログデータ
    const structuredLog = {
      timestamp,
      type: 'POST_FAILURE',
      ...logData,
    };
    
    // 既存のログを取得
    let logs = await kv.get(logKey) || [];
    if (!Array.isArray(logs)) {
      logs = [];
    }
    
    // 新しいログを追加
    logs.push(structuredLog);
    
    // 最大ログ数を超える場合は古いログを削除
    if (logs.length > MAX_LOGS_PER_DAY) {
      logs = logs.slice(-MAX_LOGS_PER_DAY);
    }
    
    // KVに保存（TTL: 30日）
    await kv.set(logKey, logs, { ex: 30 * 24 * 60 * 60 });
    
    // console.errorでも記録（Vercelログ用）
    console.error(`[PostLogger] ❌ POST_FAILURE logged: ${JSON.stringify(structuredLog)}`);
    
    return true;
  } catch (error) {
    console.error('[PostLogger] ❌ Failed to log post failure:', error.message);
    // エラー時もconsole.errorで記録
    console.error('[PostLogger] POST_FAILURE (fallback):', JSON.stringify(logData, null, 2));
    return false;
  }
}

/**
 * 指定日のログを取得
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {Promise<Array>} ログ配列
 */
async function getLogsForDate(dateString) {
  if (!kv) {
    console.warn('[PostLogger] KV not available, cannot get logs');
    return [];
  }

  try {
    const logKey = getLogKey(dateString);
    const logs = await kv.get(logKey) || [];
    return Array.isArray(logs) ? logs : [];
  } catch (error) {
    console.error('[PostLogger] ❌ Failed to get logs:', error.message);
    return [];
  }
}

/**
 * 最近のログを取得
 * @param {number} days - 取得する日数（デフォルト: 7日）
 * @returns {Promise<Array>} ログ配列
 */
async function getRecentLogs(days = 7) {
  if (!kv) {
    console.warn('[PostLogger] KV not available, cannot get recent logs');
    return [];
  }

  try {
    const allLogs = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = getDateString(date);
      const logs = await getLogsForDate(dateString);
      allLogs.push(...logs);
    }
    
    // タイムスタンプでソート（新しい順）
    allLogs.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });
    
    return allLogs;
  } catch (error) {
    console.error('[PostLogger] ❌ Failed to get recent logs:', error.message);
    return [];
  }
}

module.exports = {
  logPostSuccess,
  logPostFailure,
  getLogsForDate,
  getRecentLogs,
};
