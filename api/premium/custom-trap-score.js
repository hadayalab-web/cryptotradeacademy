// api/premium/custom-trap-score.js
// Premium Tier向けカスタムTrap Score API

const { 
  saveCustomTrapScoreSettings, 
  getCustomTrapScoreSettings,
  calculateCustomTrapScore,
} = require('../../services/premium/customTrapScore');

/**
 * カスタムTrap Score設定API
 */
export default async function handler(req, res) {
  // 認証チェック（実際の実装では、JWTトークンなどを使用）
  const userId = req.headers['x-user-id'] || req.query.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'User ID required' });
  }

  if (req.method === 'GET') {
    // 設定を取得
    try {
      const settings = await getCustomTrapScoreSettings(userId);
      return res.status(200).json({
        success: true,
        settings,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  if (req.method === 'POST') {
    // 設定を保存
    try {
      const { settings } = req.body;
      const result = await saveCustomTrapScoreSettings(userId, settings);
      return res.status(200).json({
        success: true,
        result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  if (req.method === 'PUT') {
    // カスタムTrap Scoreを計算
    try {
      const { marketData } = req.body;
      const result = await calculateCustomTrapScore(userId, marketData);
      return res.status(200).json({
        success: true,
        result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
