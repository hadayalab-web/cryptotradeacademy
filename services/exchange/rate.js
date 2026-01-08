// services/exchange/rate.js
// 為替レート取得サービス - USD/KRW等の為替レート取得

const EXCHANGE_RATE_API_BASE = 'https://api.exchangerate-api.com/v4/latest';

/**
 * 為替レート取得（USD基準）
 * @param {string} baseCurrency - 基準通貨（デフォルト: USD）
 * @returns {Promise<Object>} 為替レート情報
 */
async function fetchExchangeRates(baseCurrency = 'USD') {
  try {
    const url = `${EXCHANGE_RATE_API_BASE}/${baseCurrency}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Exchange Rate API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return {
      base: data.base,
      date: data.date,
      rates: data.rates,
      usdKrwRate: data.rates?.KRW || null, // USD/KRW為替レート
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('[exchange-rate] Error fetching exchange rates:', error.message);
    throw error;
  }
}

/**
 * USD/KRW為替レート取得（簡易版）
 * @returns {Promise<number>} USD/KRW為替レート
 */
async function fetchUSDKRWRate() {
  try {
    const rates = await fetchExchangeRates('USD');
    const usdKrwRate = rates.usdKrwRate;

    if (!usdKrwRate || usdKrwRate <= 0) {
      throw new Error('Invalid USD/KRW rate returned');
    }

    console.log(`[exchange-rate] USD/KRW rate: ${usdKrwRate}`);
    return usdKrwRate;
  } catch (error) {
    console.error('[exchange-rate] Error fetching USD/KRW rate:', error.message);
    throw error;
  }
}

/**
 * 複数通貨ペアの為替レート取得
 * @param {Array<string>} currencies - 通貨コード配列 (例: ['KRW', 'JPY', 'EUR'])
 * @param {string} baseCurrency - 基準通貨（デフォルト: USD）
 * @returns {Promise<Object>} 為替レート情報
 */
async function fetchMultipleRates(currencies, baseCurrency = 'USD') {
  try {
    const rates = await fetchExchangeRates(baseCurrency);
    const result = {
      base: baseCurrency,
      date: rates.date,
      timestamp: rates.timestamp,
    };

    currencies.forEach((currency) => {
      if (rates.rates && rates.rates[currency]) {
        result[currency] = rates.rates[currency];
      }
    });

    return result;
  } catch (error) {
    console.error('[exchange-rate] Error fetching multiple rates:', error.message);
    throw error;
  }
}

module.exports = {
  fetchExchangeRates,
  fetchUSDKRWRate,
  fetchMultipleRates,
};
