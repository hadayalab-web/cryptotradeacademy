// api/cron-premium-alerts.js
// Premium Tier向けリアルタイムアラートの定期実行（15分ごと）

const { monitorAllPremiumUsers } = require('../services/premium/realtimeAlertMonitor');
const { fetchBTCOnchainData } = require('../services/cryptoquant/endpoints/btc');

/**
 * Premium Tierアラート監視のCronジョブ
 */
export default async function handler(req, res) {
  // Vercel Cronからのリクエストを検証
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('[Premium Alerts] Starting monitoring cycle...');

    // 1. 現在の市場データを取得
    const onchainData = await fetchBTCOnchainData();
    
    // 2. Premium Tierユーザーリストを取得
    // 実際の実装では、データベースから取得
    // const premiumUsers = await db.users.find({ tier: 'premium', alertEnabled: true });
    
    // テスト用のユーザーリスト
    const premiumUsers = [
      { id: 'user1', email: 'premium1@example.com' },
      { id: 'user2', email: 'premium2@example.com' },
    ];

    // 3. 市場データを整形
    const currentMarketData = {
      price: onchainData.current?.price || 88600,
      change24h: onchainData.current?.change24h || -0.81,
      trapScore: onchainData.current?.trapScore || 8,
      exchangeNetflow: onchainData.current?.exchangeNetflow || -40.9,
      mpi: onchainData.current?.mpi || -1.55,
    };

    // 4. すべてのPremium Tierユーザーを監視
    const results = await monitorAllPremiumUsers(premiumUsers, currentMarketData);

    const summary = {
      totalUsers: premiumUsers.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalAlertsSent: results.reduce((sum, r) => sum + (r.alertsSent || 0), 0),
      timestamp: new Date().toISOString(),
    };

    console.log('[Premium Alerts] Monitoring complete:', summary);

    return res.status(200).json({
      success: true,
      summary,
      results,
    });

  } catch (error) {
    console.error('[Premium Alerts] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
