// services/upbit/client.js
// Upbit API クライアント - KO市場用のBTC価格取得

const UPBIT_API_BASE = 'https://api.upbit.com/v1';

/**
 * Upbit API: BTC/KRW 価格取得（24時間統計）
 * @returns {Promise<Object>} BTC/KRW価格情報
 */
async function fetchBTCKRWPrice() {
  try {
    const url = `${UPBIT_API_BASE}/ticker?markets=KRW-BTC`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Upbit API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const ticker = data[0];

    if (!ticker) {
      throw new Error('Upbit API: No ticker data returned');
    }

    return {
      market: ticker.market,
      tradePrice: parseFloat(ticker.trade_price), // 현재가 (현재 거래 가격)
      openingPrice: parseFloat(ticker.opening_price),
      highPrice: parseFloat(ticker.high_price),
      lowPrice: parseFloat(ticker.low_price),
      tradeVolume: parseFloat(ticker.trade_volume),
      accTradePrice24h: parseFloat(ticker.acc_trade_price_24h),
      accTradeVolume24h: parseFloat(ticker.acc_trade_volume_24h),
      highest52WeekPrice: parseFloat(ticker.highest_52_week_price),
      lowest52WeekPrice: parseFloat(ticker.lowest_52_week_price),
      change: ticker.change, // RISE, FALL, EVEN
      changePrice: parseFloat(ticker.change_price),
      changeRate: parseFloat(ticker.change_rate),
      timestamp: ticker.timestamp,
    };
  } catch (error) {
    console.error('[upbit] Error fetching BTC/KRW price:', error.message);
    throw error;
  }
}

/**
 * Upbit API: 複数市場の価格取得
 * @param {Array<string>} markets - 市場コード配列 (例: ['KRW-BTC', 'KRW-ETH'])
 * @returns {Promise<Array>} 価格情報配列
 */
async function fetchMultipleTickers(markets) {
  try {
    const marketsParam = markets.join(',');
    const url = `${UPBIT_API_BASE}/ticker?markets=${marketsParam}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Upbit API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.map((ticker) => ({
      market: ticker.market,
      tradePrice: parseFloat(ticker.trade_price),
      openingPrice: parseFloat(ticker.opening_price),
      highPrice: parseFloat(ticker.high_price),
      lowPrice: parseFloat(ticker.low_price),
      tradeVolume: parseFloat(ticker.trade_volume),
      accTradePrice24h: parseFloat(ticker.acc_trade_price_24h),
      accTradeVolume24h: parseFloat(ticker.acc_trade_volume_24h),
      change: ticker.change,
      changePrice: parseFloat(ticker.change_price),
      changeRate: parseFloat(ticker.change_rate),
      timestamp: ticker.timestamp,
    }));
  } catch (error) {
    console.error('[upbit] Error fetching multiple tickers:', error.message);
    throw error;
  }
}

module.exports = {
  fetchBTCKRWPrice,
  fetchMultipleTickers,
};
