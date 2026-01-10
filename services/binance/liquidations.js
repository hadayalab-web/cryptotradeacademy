// services/binance/liquidations.js
// Phase 4: Binanceからのliquidations取得（CryptoQuantの代替ソース）
// SSOT準拠: liquidations>$500M の即時トリガー実装

const BINANCE_FUTURES_API_BASE = 'https://fapi.binance.com';

/**
 * Binance Futures API: 強制決済（Liquidations）履歴を取得
 * Phase 4: CryptoQuantの代替ソースとして使用
 * 
 * @param {string} symbol - シンボル (例: 'BTCUSDT')
 * @param {number} startTime - 開始時刻 (ミリ秒、過去24時間)
 * @param {number} endTime - 終了時刻 (ミリ秒、現在時刻)
 * @returns {Promise<Object>} { totalLiquidations, longLiquidations, shortLiquidations }
 */
async function fetchLiquidationsFromBinance(symbol = 'BTCUSDT', startTime = null, endTime = null) {
  try {
    // デフォルト: 過去24時間
    const now = Date.now();
    const defaultStartTime = now - 24 * 60 * 60 * 1000;
    const params = new URLSearchParams({
      symbol,
      startTime: String(startTime || defaultStartTime),
      endTime: String(endTime || now),
      limit: '1000', // 最大1000件
    });

    const url = `${BINANCE_FUTURES_API_BASE}/fapi/v1/forceOrders?${params}`;
    const res = await fetch(url);

    if (!res.ok) {
      // 451エラー（地域制限）の場合はnullを返す
      if (res.status === 451) {
        return null;
      }
      throw new Error(`Binance Futures API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    
    // 強制決済の合計を計算
    let totalLiquidations = 0;
    let longLiquidations = 0;
    let shortLiquidations = 0;
    
    data.forEach((order) => {
      const qty = parseFloat(order.executedQty || 0);
      const price = parseFloat(order.averagePrice || order.price || 0);
      const liquidationValue = qty * price;
      
      totalLiquidations += liquidationValue;
      
      // 強制決済タイプ: 'LIQUIDATION' (ロング強制決済) または 'ADL' (自動デレバレッジ)
      if (order.side === 'SELL' && order.type === 'LIQUIDATION') {
        longLiquidations += liquidationValue;
      } else if (order.side === 'BUY' && order.type === 'LIQUIDATION') {
        shortLiquidations += liquidationValue;
      }
    });
    
    return {
      totalLiquidations,
      longLiquidations,
      shortLiquidations,
      timestamp: now,
      source: 'binance',
    };
  } catch (error) {
    // 451エラー（地域制限）の場合はnullを返す
    if (error.message && error.message.includes('451')) {
      return null;
    }
    console.warn('[binance/liquidations] Error fetching liquidations:', error.message);
    return null;
  }
}

/**
 * Liquidationsを取得（CryptoQuant優先、失敗時はBinance）
 * Phase 4: SSOT準拠 - liquidations>$500M の即時トリガー実装
 * 
 * @param {Object} cqLiquidations - CryptoQuantからのliquidationsデータ
 * @returns {Promise<Object>} { totalLiquidations, longLiquidations, shortLiquidations, source }
 */
async function getLiquidationsWithFallback(cqLiquidations = null) {
  // CryptoQuantからのデータが有効な場合はそれを使用
  if (cqLiquidations && cqLiquidations.totalLiquidations > 0) {
    return {
      ...cqLiquidations,
      source: 'cryptoquant',
    };
  }
  
  // CryptoQuantからのデータが無効な場合はBinanceから取得
  try {
    const binanceLiquidations = await fetchLiquidationsFromBinance('BTCUSDT');
    if (binanceLiquidations) {
      return binanceLiquidations;
    }
  } catch (error) {
    console.warn('[liquidations] Error fetching from Binance fallback:', error.message);
  }
  
  // 両方とも失敗した場合は安全なデフォルトを返す
  return {
    totalLiquidations: 0,
    longLiquidations: 0,
    shortLiquidations: 0,
    source: 'none',
  };
}

module.exports = {
  fetchLiquidationsFromBinance,
  getLiquidationsWithFallback,
};
