const { fetchCryptoQuant } = require('../client');

/**
 * Fetch Bitcoin Exchange Inflow (Whale Activity)
 */
async function getExchangeInflow() {
  // 実際のCryptoQuantのエンドポイントパスに合わせて調整
  // 元のcryptoQuant.jsのロジックを参照しています
  return await fetchCryptoQuant('/btc/exchange-flows', {
    window: 'day',
    limit: 1
  });
}

/**
 * Fetch Miner Position Index (MPI) - Miner Selling Pressure
 */
async function getMinerPositionIndex() {
  return await fetchCryptoQuant('/btc/miner-position-index', {
    window: 'day',
    limit: 1
  });
}

module.exports = { getExchangeInflow, getMinerPositionIndex };
