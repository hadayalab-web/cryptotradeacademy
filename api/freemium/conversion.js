// api/freemium/conversion.js
// フリーミアム転換戦略のAPIエンドポイント

const { executeConversionStrategyForFreeUsers } = require('../../services/freemium/conversion');

/**
 * 転換戦略を実行するAPIエンドポイント（cronジョブ用）
 * 無料ユーザーに対して自動的に転換ナッジを送信
 */
module.exports = async function handler(req, res) {
  // GETリクエストも許可（cronジョブ用）
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await executeConversionStrategyForFreeUsers();
    
    return res.status(200).json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Freemium Conversion] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
