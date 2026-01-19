// api/lead-discovery-daily-report.js
// リード発見システム 日次レポート送信APIエンドポイント

const { generateDailyReport } = require('../services/lead-discovery/leadDiscoveryReport');

/**
 * 日次レポートを生成してCEOに送信
 * @param {Object} req - リクエスト
 * @param {Object} res - レスポンス
 */
module.exports = async function handler(req, res) {
  const authHeader = req.headers.authorization;
  const CRON_SECRET = process.env.CRON_SECRET;
  
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // クエリパラメータから日付を取得（デフォルト: 昨日）
    const { date } = req.query;
    
    const report = await generateDailyReport({ date });
    
    return res.status(200).json({
      success: true,
      report: {
        date: report.date,
        cvrStats: report.cvrStats,
        timestamp: report.timestamp,
      },
    });
  } catch (error) {
    console.error('[Lead Discovery Daily Report] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
