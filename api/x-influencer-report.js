// api/x-influencer-report.js
// インフルエンサー効果レポート生成API（最適化案: どのインフルエンサーが最も効果的か分析）

const { generateInfluencerReport, analyzeInfluencerPerformance } = require('../services/x/influencerAnalyzer');

// Vercel KV（レポート保存用）
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[Influencer Report] @vercel/kv not available:', error.message);
}

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

    // PDCAサイクル用: レポート結果をKVストレージに保存
    const reportData = {
      days,
      report,
      ranking: ranking,
      generatedAt: new Date().toISOString(),
    };

    if (kv) {
      try {
        const dateString = new Date().toISOString().split('T')[0];
        const key = `x:influencer_report:${dateString}`;
        await kv.set(key, reportData, { ex: 86400 * 90 }); // 90日間保持
        console.log(`[Influencer Report] ✅ Report saved to KV: ${key}`);
      } catch (error) {
        console.warn('[Influencer Report] Failed to save report to KV:', error.message);
      }
    }

    return res.status(200).json({
      success: true,
      days,
      report,
      ranking: ranking.slice(0, 10), // トップ10のみ返す
      generatedAt: new Date().toISOString(),
      savedToKV: !!kv,
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
