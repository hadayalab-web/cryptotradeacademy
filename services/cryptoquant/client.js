const fetch = require('node-fetch'); // package.jsonに追加したnode-fetchを使用

const API_KEY = process.env.CRYPTOQUANT_API_KEY;
const BASE_URL = 'https://api.cryptoquant.com/v1'; // APIバージョンは適宜変更

if (!API_KEY) {
  console.warn("⚠️ CRYPTOQUANT_API_KEY is not set in .env.local");
}

/**
 * Generic function to fetch data from CryptoQuant
 * @param {string} endpoint - e.g., '/btc/exchange-flows'
 * @param {object} params - Query parameters
 * @returns {Promise<object>} - API Response
 */
async function fetchCryptoQuant(endpoint, params = {}) {
  // クエリパラメータの構築
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  try {
    console.log(`🌐 Fetching: ${url.toString()}`);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error(`❌ CryptoQuant Request Failed: ${error.message}`);
    throw error;
  }
}

module.exports = { fetchCryptoQuant };
