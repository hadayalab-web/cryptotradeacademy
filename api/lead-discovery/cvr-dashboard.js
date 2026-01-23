// api/lead-discovery/cvr-dashboard.js
// CVRダッシュボードAPIエンドポイント

const { getCVRStats, syncWhopPurchases } = require('../../services/lead-discovery/conversionTracker');

/**
 * CVRダッシュボードを取得
 * @param {Object} req - リクエスト
 * @param {Object} res - レスポンス
 */
async function getCVRDashboard(req, res) {
  const authHeader = req.headers.authorization;
  const CRON_SECRET = process.env.CRON_SECRET;
  
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 日付範囲を取得（デフォルト: 過去30日間）
    const endDate = req.query.endDate || new Date().toISOString().split('T')[0];
    const startDate = req.query.startDate || (() => {
      const d = new Date(endDate);
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    })();

    // CVR統計を取得
    const stats = await getCVRStats(startDate, endDate);

    // 収益シミュレーション用のデータも含める
    const simulation = {
      currentCVR: stats.cvr,
      perfectMatchCVR: stats.perfectMatchCVR,
      averageRevenue: stats.conversions > 0 ? stats.revenue / stats.conversions : 150,
      projectedMonthlyRevenue: calculateProjectedRevenue(stats),
    };

    return res.status(200).json({
      success: true,
      period: { startDate, endDate },
      stats,
      simulation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CVR Dashboard] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Whop購入を同期
 * @param {Object} req - リクエスト
 * @param {Object} res - レスポンス
 */
async function syncPurchases(req, res) {
  const authHeader = req.headers.authorization;
  const CRON_SECRET = process.env.CRON_SECRET;
  
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const syncResult = await syncWhopPurchases();
    
    return res.status(200).json({
      success: true,
      sync: syncResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CVR Dashboard] Sync error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * 収益シミュレーションを計算
 * @param {Object} stats - CVR統計
 * @returns {Object} 収益シミュレーション
 */
function calculateProjectedRevenue(stats) {
  // 現在のCVRとリード発見数から月間収益を予測
  const dailyLeads = stats.totalLeads / 30; // 1日あたりのリード数
  const monthlyLeads = dailyLeads * 30;
  const monthlyConversions = monthlyLeads * (stats.cvr / 100);
  const monthlyRevenue = monthlyConversions * stats.averageRevenue || 150;

  return {
    dailyLeads: Math.round(dailyLeads),
    monthlyLeads: Math.round(monthlyLeads),
    monthlyConversions: Math.round(monthlyConversions),
    monthlyRevenue: Math.round(monthlyRevenue),
    cvr: stats.cvr,
    averageRevenue: stats.averageRevenue || 150,
  };
}

// Vercel要件: デフォルトエクスポートは関数またはサーバーである必要がある
// GETリクエスト: CVRダッシュボード取得
// POSTリクエスト: Whop購入同期
module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return await getCVRDashboard(req, res);
  } else if (req.method === 'POST') {
    return await syncPurchases(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
};

// 名前付きエクスポートも維持（後方互換性のため）
module.exports.getCVRDashboard = getCVRDashboard;
module.exports.syncPurchases = syncPurchases;
