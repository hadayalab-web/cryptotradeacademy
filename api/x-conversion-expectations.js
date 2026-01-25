// api/x-conversion-expectations.js
// 期待値計算APIエンドポイント（再利用可能）

const { calculateDailyExpectations } = require('../services/x/postPerformanceAnalyzer');

module.exports = async function handler(req, res) {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // GET/POSTのみ許可
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // 期待値を計算
    const result = await calculateDailyExpectations();
    
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[X Conversion Expectations] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};
