// api/lead-discovery/dashboard.js
// リード発見ダッシュボードAPI（週次KPIレビュー用）

const { getQueueStats, getPerfectMatchCount } = require('../../services/lead-discovery/priorityQueue');

/**
 * リード発見ダッシュボードデータを取得
 * @param {Object} req - リクエスト
 * @param {Object} res - レスポンス
 */
async function getLeadDiscoveryDashboard(req, res) {
  const authHeader = req.headers.authorization;
  const CRON_SECRET = process.env.CRON_SECRET;
  
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // キュー統計を取得
    const queueStats = await getQueueStats();
    const perfectMatchCount = await getPerfectMatchCount();
    
    // ダッシュボードデータ
    const dashboard = {
      timestamp: new Date().toISOString(),
      queue: {
        total: queueStats.total,
        perfectMatch: perfectMatchCount,
        high: queueStats.high,
        medium: queueStats.medium,
        low: queueStats.low,
      },
      kpi: {
        // 目標値（Grok CSO+CFO分析より）
        targetDailyLeads: 1000, // 初期フェーズ
        targetDailyPerfectMatch: 300, // 30%目標
        targetConversionRate: 0.25, // 25%目標
        targetPerfectMatchConversionRate: 0.50, // 50%目標
      },
      channels: {
        telegram: {
          discovered: 0, // TODO: 実際のデータから取得
          sent: 0,
          conversionRate: 0,
        },
        x: {
          discovered: 0, // TODO: 実際のデータから取得
          sent: 0,
          conversionRate: 0,
        },
      },
      languages: {
        en: { discovered: 0, sent: 0 },
        es: { discovered: 0, sent: 0 },
        'pt-br': { discovered: 0, sent: 0 },
        ar: { discovered: 0, sent: 0 },
        ja: { discovered: 0, sent: 0 },
        ko: { discovered: 0, sent: 0 },
      },
    };
    
    return res.status(200).json({
      success: true,
      dashboard,
    });
  } catch (error) {
    console.error('Dashboard error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = getLeadDiscoveryDashboard;
