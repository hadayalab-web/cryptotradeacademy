// api/lead-discovery-weekly-report.js
// リード発見システム 週次レポートAPIエンドポイント

const { generateWeeklyReport } = require('../services/lead-discovery/leadDiscoveryReport');

/**
 * 週次レポートを生成して送信
 * @param {Object} req - リクエスト
 * @param {Object} res - レスポンス
 */
module.exports = async function handler(req, res) {
  // Cron認証チェック
  const authHeader = req.headers.authorization;
  const CRON_SECRET = process.env.CRON_SECRET;
  
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // GETリクエストのみ許可
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // クエリパラメータから日付を取得（オプション）
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;
    
    const report = await generateWeeklyReport({
      startDate,
      endDate,
    });
    
    return res.status(200).json({
      success: true,
      message: 'Weekly report generated and sent successfully',
      report,
    });
  } catch (error) {
    console.error('[Lead Discovery Weekly Report] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
