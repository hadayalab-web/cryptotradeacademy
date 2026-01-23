// api/x-influencer-report.js
// インフルエンサー効果レポート生成API（最適化案: どのインフルエンサーが最も効果的か分析）

const { generateInfluencerReport, analyzeInfluencerPerformance } = require('../services/x/influencerAnalyzer');

/**
 * Vercel Cron Job Handler（週次レポート生成）
 */
module.exports = async function handler(req, res) {
  // Vercel CronはGETまたはPOSTで呼ばれる可能性があるため、両方許可
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 認証チェック
  const authHeader = req.headers.authorization;
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('[Influencer Report] ========================================');
  console.log('[Influencer Report] Cron job triggered at', new Date().toISOString());
  console.log('[Influencer Report] ========================================');

  try {
    const days = parseInt(req.query?.days || '7', 10);
    
    // インフルエンサー効果レポートを生成
    const report = await generateInfluencerReport(days);
    const ranking = await analyzeInfluencerPerformance(days);
    
    console.log('[Influencer Report] ========================================');
    console.log('[Influencer Report] Report generated:');
    console.log(report);
    console.log('[Influencer Report] ========================================');

    return res.status(200).json({
      success: true,
      days,
      report,
      ranking: ranking.slice(0, 10), // トップ10のみ返す
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Influencer Report] ========================================');
    console.error('[Influencer Report] ❌ Handler error:', error.message);
    console.error('[Influencer Report] Stack:', error.stack);
    console.error('[Influencer Report] ========================================');

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
