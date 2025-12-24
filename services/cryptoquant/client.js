// services/cryptoquant/client.js
// Node.js 18+ Native Fetchを使用

const { Logger } = require('../../utils/logger');

const BASE_URL = "https://api.cryptoquant.com/v1";
const API_KEY = process.env.CRYPTOQUANT_API_KEY;

/**
 * Generic Fetch Wrapper for CryptoQuant
 * @param {string} endpoint
 * @param {object} params
 */
async function fetchCryptoQuant(endpoint, params = {}) {
    if (!API_KEY) {
        Logger.error('cryptoquant', 'CRYPTOQUANT_API_KEY is not set in .env.local');
        return null;
    }

    const url = new URL(`${BASE_URL}${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    Logger.debug('cryptoquant', 'Fetching CryptoQuant API', { url: url.toString() });

    try {
        // Node.js標準のfetchを使用 (require不要)
        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        Logger.error('cryptoquant', 'CryptoQuant Request Failed', error);
        throw error;
    }
}

module.exports = { fetchCryptoQuant };
