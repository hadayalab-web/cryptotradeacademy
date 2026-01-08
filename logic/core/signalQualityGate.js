// logic/core/signalQualityGate.js
// SELL/SHORTシグナルの80%勝率要件をチェックするゲート関数

const fs = require('fs');
const path = require('path');

// メトリクスファイルのパス
const METRICS_PATH = path.join(__dirname, '..', '..', 'data', 'signal_quality_metrics.json');

// キャッシュ設定（5分間有効）
const CACHE_TTL_MS = 5 * 60 * 1000;

let cache = { loadedAt: 0, data: null };

/**
 * メトリクスファイルを読み込む（キャッシュ付き）
 */
function loadMetrics() {
  const now = Date.now();

  // キャッシュが有効な場合はキャッシュを返す
  if (cache.data && (now - cache.loadedAt) < CACHE_TTL_MS) {
    return cache.data;
  }

  try {
    if (!fs.existsSync(METRICS_PATH)) {
      console.warn(`[signalQualityGate] Metrics file not found: ${METRICS_PATH}`);
      return null;
    }

    const raw = fs.readFileSync(METRICS_PATH, 'utf8');
    const data = JSON.parse(raw);
    cache = { loadedAt: now, data };
    return data;
  } catch (error) {
    console.warn(`[signalQualityGate] Error loading metrics: ${error.message}`);
    // メトリクスが無い/壊れている場合は安全側（配信停止）
    return null;
  }
}

/**
 * SELL/SHORTシグナルの配信可否を評価
 *
 * @param {Object} options - 評価オプション
 * @param {number} options.minWinRate - 最低勝率（デフォルト: 0.80）
 * @returns {Object} { pass: boolean, reason: string, details: Object }
 */
function evaluateShortSellGate({ minWinRate = 0.80 } = {}) {
  const metrics = loadMetrics();

  if (!metrics || !metrics.windows || !metrics.windows.short_last_100) {
    return {
      pass: false,
      reason: 'NO_METRICS',
      details: null,
      message: 'Signal quality metrics not available',
    };
  }

  const w = metrics.windows.short_last_100;

  // 最低サンプル数チェック
  if (w.total < (w.minTrades ?? 30)) {
    return {
      pass: false,
      reason: 'INSUFFICIENT_SAMPLE',
      details: w,
      message: `Insufficient sample size: ${w.total} < ${w.minTrades ?? 30}`,
    };
  }

  // 勝率チェック
  if (w.winRate < minWinRate) {
    return {
      pass: false,
      reason: 'LOW_WINRATE',
      details: w,
      message: `Win rate ${(w.winRate * 100).toFixed(2)}% < ${minWinRate * 100}%`,
    };
  }

  return {
    pass: true,
    reason: 'OK',
    details: w,
    message: `Win rate ${(w.winRate * 100).toFixed(2)}% >= ${minWinRate * 100}%`,
  };
}

/**
 * キャッシュをクリア（テスト用）
 */
function clearCache() {
  cache = { loadedAt: 0, data: null };
}

module.exports = {
  evaluateShortSellGate,
  clearCache,
};
