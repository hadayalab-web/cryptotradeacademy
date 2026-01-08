// utils/metrics.js
// GPT呼び出しメトリクス収集ユーティリティ

const { kv } = require('@vercel/kv');
const { formatInTimeZone } = require('date-fns-tz');
const { createLogger, TZ_UTC } = require('./logger');

const logger = createLogger('metrics');

// メトリクスキーのプレフィックス
const METRICS_PREFIX = 'metrics:gpt';

/**
 * 現在のUTC時間ベースのメトリクスキーを生成
 * @param {Date} date - 日時（デフォルト: 現在時刻）
 * @returns {string} メトリクスキー（例: metrics:gpt:2026-01-07:14）
 */
function buildMetricsKey(date = new Date()) {
  const dateStr = formatInTimeZone(date, TZ_UTC, 'yyyy-MM-dd:HH');
  return `${METRICS_PREFIX}:${dateStr}`;
}

/**
 * メトリクスデータのスキーマ（zod）
 */
const MetricsSchema = {
  calls: 0,           // GPT呼び出し回数
  cacheHits: 0,        // キャッシュヒット回数（メモリ + KV）
  memoryCacheHits: 0,  // メモリキャッシュヒット回数
  kvCacheHits: 0,      // KVキャッシュヒット回数
  errors: 0,           // エラー回数
  rateLimitErrors: 0,  // レート制限エラー回数
  serverErrors: 0,     // サーバーエラー（5xx）回数
  lastUpdated: null,   // 最終更新時刻（ISO文字列）
};

/**
 * メトリクスを記録
 * @param {Object} event - イベント情報
 * @param {string} event.type - イベントタイプ ('call', 'cache_hit', 'memory_cache_hit', 'kv_cache_hit', 'error', 'rate_limit_error', 'server_error')
 * @param {Date} event.timestamp - タイムスタンプ（オプション）
 */
async function recordMetric(event) {
  const { type, timestamp } = event;
  const key = buildMetricsKey(timestamp || new Date());
  
  try {
    if (!kv) {
      logger.warn('KV not available, metrics not recorded');
      return;
    }

    // 現在のメトリクスを取得（存在しない場合はデフォルト値）
    const current = await kv.get(key) || { ...MetricsSchema };
    
    // メトリクスを更新
    const updated = {
      ...current,
      lastUpdated: (timestamp || new Date()).toISOString(),
    };

    switch (type) {
      case 'call':
        updated.calls = (updated.calls || 0) + 1;
        break;
      case 'cache_hit':
        updated.cacheHits = (updated.cacheHits || 0) + 1;
        break;
      case 'memory_cache_hit':
        updated.memoryCacheHits = (updated.memoryCacheHits || 0) + 1;
        updated.cacheHits = (updated.cacheHits || 0) + 1; // 総キャッシュヒットにもカウント
        break;
      case 'kv_cache_hit':
        updated.kvCacheHits = (updated.kvCacheHits || 0) + 1;
        updated.cacheHits = (updated.cacheHits || 0) + 1; // 総キャッシュヒットにもカウント
        break;
      case 'error':
        updated.errors = (updated.errors || 0) + 1;
        break;
      case 'rate_limit_error':
        updated.rateLimitErrors = (updated.rateLimitErrors || 0) + 1;
        updated.errors = (updated.errors || 0) + 1; // 総エラーにもカウント
        break;
      case 'server_error':
        updated.serverErrors = (updated.serverErrors || 0) + 1;
        updated.errors = (updated.errors || 0) + 1; // 総エラーにもカウント
        break;
      default:
        logger.warn('Unknown metric type', { type });
        return;
    }

    // KVに保存（24時間TTL）
    await kv.set(key, updated, { ex: 86400 });
    
    logger.info('Metric recorded', {
      type,
      key,
      updated,
    });
  } catch (error) {
    logger.warn('Failed to record metric', {
      error: error?.message,
      type,
    });
  }
}

/**
 * メトリクスを取得
 * @param {Date} date - 取得する日時（デフォルト: 現在時刻）
 * @returns {Promise<Object>} メトリクスデータ
 */
async function getMetrics(date = new Date()) {
  const key = buildMetricsKey(date);
  
  try {
    if (!kv) {
      logger.warn('KV not available, returning default metrics');
      return { ...MetricsSchema };
    }

    const metrics = await kv.get(key);
    if (!metrics) {
      return { ...MetricsSchema };
    }

    // キャッシュヒット率とエラー率を計算
    const calls = metrics.calls || 0;
    const cacheHits = metrics.cacheHits || 0;
    const errors = metrics.errors || 0;

    return {
      ...metrics,
      cacheHitRate: calls > 0 ? (cacheHits / calls) * 100 : 0,
      errorRate: calls > 0 ? (errors / calls) * 100 : 0,
    };
  } catch (error) {
    logger.warn('Failed to get metrics', {
      error: error?.message,
      key,
    });
    return { ...MetricsSchema };
  }
}

/**
 * 過去N時間のメトリクスを集計
 * @param {number} hours - 集計する時間数（デフォルト: 24）
 * @returns {Promise<Object>} 集計されたメトリクス
 */
async function getAggregatedMetrics(hours = 24) {
  try {
    if (!kv) {
      logger.warn('KV not available, returning empty aggregated metrics');
      return {
        totalCalls: 0,
        totalCacheHits: 0,
        totalMemoryCacheHits: 0,
        totalKvCacheHits: 0,
        totalErrors: 0,
        totalRateLimitErrors: 0,
        totalServerErrors: 0,
        averageCacheHitRate: 0,
        averageErrorRate: 0,
      };
    }

    const now = new Date();
    const keys = [];
    
    // 過去N時間のキーを生成
    for (let i = 0; i < hours; i++) {
      const date = new Date(now);
      date.setUTCHours(date.getUTCHours() - i);
      keys.push(buildMetricsKey(date));
    }

    // すべてのキーからメトリクスを取得
    const metricsList = await Promise.all(
      keys.map(key => kv.get(key).catch(() => null))
    );

    // 集計
    const aggregated = {
      totalCalls: 0,
      totalCacheHits: 0,
      totalMemoryCacheHits: 0,
      totalKvCacheHits: 0,
      totalErrors: 0,
      totalRateLimitErrors: 0,
      totalServerErrors: 0,
    };

    for (const metrics of metricsList) {
      if (!metrics) continue;
      aggregated.totalCalls += metrics.calls || 0;
      aggregated.totalCacheHits += metrics.cacheHits || 0;
      aggregated.totalMemoryCacheHits += metrics.memoryCacheHits || 0;
      aggregated.totalKvCacheHits += metrics.kvCacheHits || 0;
      aggregated.totalErrors += metrics.errors || 0;
      aggregated.totalRateLimitErrors += metrics.rateLimitErrors || 0;
      aggregated.totalServerErrors += metrics.serverErrors || 0;
    }

    // 平均ヒット率とエラー率を計算
    aggregated.averageCacheHitRate = aggregated.totalCalls > 0
      ? (aggregated.totalCacheHits / aggregated.totalCalls) * 100
      : 0;
    aggregated.averageErrorRate = aggregated.totalCalls > 0
      ? (aggregated.totalErrors / aggregated.totalCalls) * 100
      : 0;

    return aggregated;
  } catch (error) {
    logger.warn('Failed to get aggregated metrics', {
      error: error?.message,
      hours,
    });
    return {
      totalCalls: 0,
      totalCacheHits: 0,
      totalMemoryCacheHits: 0,
      totalKvCacheHits: 0,
      totalErrors: 0,
      totalRateLimitErrors: 0,
      totalServerErrors: 0,
      averageCacheHitRate: 0,
      averageErrorRate: 0,
    };
  }
}

module.exports = {
  recordMetric,
  getMetrics,
  getAggregatedMetrics,
  buildMetricsKey,
};
