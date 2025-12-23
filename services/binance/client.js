// services/binance/client.js
// Binance API クライアント - CryptoQuantデータを補完するためのデータ取得

const BINANCE_API_BASE = 'https://api.binance.com';
const BINANCE_FUTURES_API_BASE = 'https://fapi.binance.com';

/**
 * Binance Spot API: Klines (OHLCV) 取得
 * @param {string} symbol - シンボル (例: 'BTCUSDT')
 * @param {string} interval - 時間足 (1h, 4h, 1d等)
 * @param {number} startTime - 開始時刻 (ミリ秒)
 * @param {number} endTime - 終了時刻 (ミリ秒)
 * @param {number} limit - 取得件数 (最大1000)
 * @returns {Promise<Array>} Klineデータ配列
 */
async function fetchKlines(symbol, interval, startTime, endTime, limit = 1000) {
  // Input validation
  if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
    throw new Error('Invalid symbol parameter: must be a non-empty string');
  }

  const validIntervals = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];
  if (!validIntervals.includes(interval)) {
    throw new Error(`Invalid interval: ${interval}. Must be one of: ${validIntervals.join(', ')}`);
  }

  if (!Number.isFinite(startTime) || startTime < 0) {
    throw new Error('Invalid startTime: must be a non-negative number (milliseconds)');
  }

  if (!Number.isFinite(endTime) || endTime < startTime) {
    throw new Error('Invalid endTime: must be >= startTime');
  }

  // Clamp limit to API constraints (1-1000)
  limit = Math.min(Math.max(1, Math.floor(limit)), 1000);

  try {
    const params = new URLSearchParams({
      symbol,
      interval,
      startTime: String(startTime),
      endTime: String(endTime),
      limit: String(limit),
    });

    const url = `${BINANCE_API_BASE}/api/v3/klines?${params}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Binance API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    // Binance形式: [openTime, open, high, low, close, volume, closeTime, ...]
    return data.map((k) => ({
      openTime: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      closeTime: k[6],
      quoteVolume: parseFloat(k[7]),
      trades: k[8],
    }));
  } catch (error) {
    console.error(`[binance] Error fetching klines for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Binance Futures API: Funding Rate 取得
 * @param {string} symbol - シンボル (例: 'BTCUSDT')
 * @param {number} startTime - 開始時刻 (ミリ秒、オプション)
 * @param {number} limit - 取得件数 (最大1000)
 * @returns {Promise<Array>} Funding Rateデータ配列
 */
async function fetchFundingRate(symbol, startTime = null, limit = 500) {
  // Input validation
  if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
    throw new Error('Invalid symbol parameter: must be a non-empty string');
  }

  if (startTime !== null && (!Number.isFinite(startTime) || startTime < 0)) {
    throw new Error('Invalid startTime: must be a non-negative number (milliseconds) or null');
  }

  // Clamp limit to API constraints (1-1000)
  limit = Math.min(Math.max(1, Math.floor(limit)), 1000);

  try {
    const params = new URLSearchParams({
      symbol,
      limit: String(limit),
    });

    if (startTime !== null) {
      params.append('startTime', String(startTime));
    }

    const url = `${BINANCE_FUTURES_API_BASE}/fapi/v1/fundingRate?${params}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Binance Futures API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.map((f) => ({
      symbol: f.symbol,
      fundingRate: parseFloat(f.fundingRate),
      fundingTime: f.fundingTime,
      markPrice: parseFloat(f.markPrice),
    }));
  } catch (error) {
    console.error(`[binance] Error fetching funding rate for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Binance Futures API: Open Interest 取得
 * @param {string} symbol - シンボル (例: 'BTCUSDT')
 * @returns {Promise<Object>} Open Interestデータ
 */
async function fetchOpenInterest(symbol) {
  // Input validation
  if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
    throw new Error('Invalid symbol parameter: must be a non-empty string');
  }

  try {
    const params = new URLSearchParams({ symbol });
    const url = `${BINANCE_FUTURES_API_BASE}/fapi/v1/openInterest?${params}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Binance Futures API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return {
      symbol: data.symbol,
      openInterest: parseFloat(data.openInterest),
      sumOpenInterest: parseFloat(data.sumOpenInterest),
      sumOpenInterestValue: parseFloat(data.sumOpenInterestValue),
      timestamp: data.time,
    };
  } catch (error) {
    console.error(`[binance] Error fetching open interest for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Binance Futures API: Long/Short Ratio 取得
 * @param {string} symbol - シンボル (例: 'BTCUSDT')
 * @param {string} period - 期間 (5m, 15m, 30m, 1h, 2h, 4h, 6h, 12h, 1d)
 * @param {number} limit - 取得件数 (最大500)
 * @param {number} startTime - 開始時刻 (ミリ秒、オプション)
 * @returns {Promise<Array>} Long/Short Ratioデータ配列
 */
async function fetchLongShortRatio(symbol, period = '1h', limit = 500, startTime = null) {
  // Input validation
  if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
    throw new Error('Invalid symbol parameter: must be a non-empty string');
  }

  const validPeriods = ['5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d'];
  if (!validPeriods.includes(period)) {
    throw new Error(`Invalid period: ${period}. Must be one of: ${validPeriods.join(', ')}`);
  }

  if (startTime !== null && (!Number.isFinite(startTime) || startTime < 0)) {
    throw new Error('Invalid startTime: must be a non-negative number (milliseconds) or null');
  }

  // Clamp limit to API constraints (1-500)
  limit = Math.min(Math.max(1, Math.floor(limit)), 500);

  try {
    const params = new URLSearchParams({
      symbol,
      period,
      limit: String(limit),
    });

    if (startTime !== null) {
      params.append('startTime', String(startTime));
    }

    const url = `${BINANCE_FUTURES_API_BASE}/futures/data/topLongShortAccountRatio?${params}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Binance Futures API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.map((r) => ({
      symbol: r.symbol,
      longShortRatio: parseFloat(r.longShortRatio),
      longAccount: parseFloat(r.longAccount),
      shortAccount: parseFloat(r.shortAccount),
      timestamp: r.timestamp,
    }));
  } catch (error) {
    console.error(`[binance] Error fetching long/short ratio for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Binance Futures API: 24時間取引統計
 * @param {string} symbol - シンボル (例: 'BTCUSDT')
 * @returns {Promise<Object>} 24時間統計データ
 */
async function fetch24hTicker(symbol) {
  // Input validation
  if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
    throw new Error('Invalid symbol parameter: must be a non-empty string');
  }

  try {
    const params = new URLSearchParams({ symbol });
    const url = `${BINANCE_FUTURES_API_BASE}/fapi/v1/ticker/24hr?${params}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Binance Futures API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return {
      symbol: data.symbol,
      priceChange: parseFloat(data.priceChange),
      priceChangePercent: parseFloat(data.priceChangePercent),
      weightedAvgPrice: parseFloat(data.weightedAvgPrice),
      lastPrice: parseFloat(data.lastPrice),
      openPrice: parseFloat(data.openPrice),
      highPrice: parseFloat(data.highPrice),
      lowPrice: parseFloat(data.lowPrice),
      volume: parseFloat(data.volume),
      quoteVolume: parseFloat(data.quoteVolume),
      openTime: data.openTime,
      closeTime: data.closeTime,
      count: data.count,
    };
  } catch (error) {
    console.error(`[binance] Error fetching 24h ticker for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * CryptoQuantデータを補完するためのBinanceデータ統合取得
 * @param {string} symbol - シンボル (例: 'BTCUSDT')
 * @param {number} timestamp - タイムスタンプ (ミリ秒、オプション、現在時刻の場合は省略)
 * @returns {Promise<Object>} 補完データ
 */
async function getComplementaryData(symbol = 'BTCUSDT', timestamp = null) {
  // Input validation
  if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
    throw new Error('Invalid symbol parameter: must be a non-empty string');
  }

  if (timestamp !== null && (!Number.isFinite(timestamp) || timestamp < 0)) {
    throw new Error('Invalid timestamp: must be a non-negative number (milliseconds) or null');
  }

  try {
    const targetTime = timestamp || Date.now();

    // 並列取得（エラー発生時も部分的なデータを返す）
    const [fundingRate, openInterest, longShortRatio, ticker24h] = await Promise.allSettled([
      fetchFundingRate(symbol, targetTime - 24 * 60 * 60 * 1000, 24), // 過去24時間
      fetchOpenInterest(symbol),
      fetchLongShortRatio(symbol, '1h', 24, targetTime - 24 * 60 * 60 * 1000),
      fetch24hTicker(symbol),
    ]);

    const result = {
      timestamp: targetTime,
      symbol,
    };

    if (fundingRate.status === 'fulfilled') {
      result.fundingRate = fundingRate.value;
      // 最新のFunding Rate
      result.currentFundingRate = fundingRate.value[fundingRate.value.length - 1]?.fundingRate || 0;
      // 平均Funding Rate（24時間）
      const avgFundingRate =
        fundingRate.value.reduce((sum, f) => sum + f.fundingRate, 0) / fundingRate.value.length || 0;
      result.avgFundingRate24h = avgFundingRate;
    }

    if (openInterest.status === 'fulfilled') {
      result.openInterest = openInterest.value;
    }

    if (longShortRatio.status === 'fulfilled') {
      result.longShortRatio = longShortRatio.value;
      // 最新のLong/Short Ratio
      result.currentLongShortRatio =
        longShortRatio.value[longShortRatio.value.length - 1]?.longShortRatio || 1.0;
      // 平均Long/Short Ratio（24時間）
      const avgLSR =
        longShortRatio.value.reduce((sum, r) => sum + r.longShortRatio, 0) / longShortRatio.value.length || 1.0;
      result.avgLongShortRatio24h = avgLSR;
    }

    if (ticker24h.status === 'fulfilled') {
      result.ticker24h = ticker24h.value;
    }

    return result;
  } catch (error) {
    console.error('[binance] Error getting complementary data:', error.message);
    throw error;
  }
}

module.exports = {
  fetchKlines,
  fetchFundingRate,
  fetchOpenInterest,
  fetchLongShortRatio,
  fetch24hTicker,
  getComplementaryData,
};

