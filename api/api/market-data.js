// api/api/market-data.js
// API販売: 市場データ取得エンドポイント

const { getMarketDataAPI, validateAPIKey } = require('../../services/api/sales');

/**
 * 市場データ取得API
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    const marketData = await getMarketDataAPI(apiKey, req.query);
    
    return res.status(200).json({
      success: true,
      data: marketData,
    });
  } catch (error) {
    if (error.message.includes('Rate limit')) {
      return res.status(429).json({ error: error.message });
    }
    if (error.message.includes('limit exceeded')) {
      return res.status(403).json({ error: error.message });
    }
    
    console.error('API market data error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
