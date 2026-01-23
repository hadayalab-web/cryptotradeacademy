// api/x-algorithm-analysis.js
// Xアルゴリズム分析レポート生成API（GPTを使用）

const { performAlgorithmAnalysis, generateAlgorithmReport } = require('../services/openai/algorithmAnalyzer');
const { generateWeeklyStrategyReport, formatStrategyReport } = require('../services/openai/strategyRecommender');

/**
 * Vercel Cron Job Handler（週次アルゴリズム分析レポート生成）
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

  console.log('[X Algorithm Analysis] ========================================');
  console.log('[X Algorithm Analysis] Cron job triggered at', new Date().toISOString());
  console.log('[X Algorithm Analysis] ========================================');

  try {
    const days = parseInt(req.query?.days || '7', 10);
    const focusArea = req.query?.focus || 'engagement'; // engagement, impressions, clicks
    const reportType = req.query?.type || 'both'; // algorithm, strategy, both
    
    const results = {};
    
    // アルゴリズム分析レポート
    if (reportType === 'algorithm' || reportType === 'both') {
      console.log('[X Algorithm Analysis] Performing algorithm analysis...');
      const algorithmAnalysis = await performAlgorithmAnalysis(days);
      
      if (algorithmAnalysis) {
        results.algorithmAnalysis = algorithmAnalysis;
        results.algorithmReport = generateAlgorithmReport(algorithmAnalysis);
        console.log('[X Algorithm Analysis] ✅ Algorithm analysis completed');
      } else {
        console.warn('[X Algorithm Analysis] ⚠️ Algorithm analysis returned null');
      }
    }
    
    // 戦略的推奨事項レポート
    if (reportType === 'strategy' || reportType === 'both') {
      console.log('[X Algorithm Analysis] Generating strategy recommendations...');
      const strategyReport = await generateWeeklyStrategyReport(days, focusArea);
      
      if (strategyReport) {
        results.strategyReport = strategyReport;
        results.strategyReportFormatted = formatStrategyReport(strategyReport);
        console.log('[X Algorithm Analysis] ✅ Strategy report generated');
      } else {
        console.warn('[X Algorithm Analysis] ⚠️ Strategy report returned null');
      }
    }
    
    console.log('[X Algorithm Analysis] ========================================');
    console.log('[X Algorithm Analysis] Report generation completed');
    console.log('[X Algorithm Analysis] ========================================');

    return res.status(200).json({
      success: true,
      days,
      focusArea,
      reportType,
      results,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[X Algorithm Analysis] ========================================');
    console.error('[X Algorithm Analysis] ❌ Handler error:', error.message);
    console.error('[X Algorithm Analysis] Stack:', error.stack);
    console.error('[X Algorithm Analysis] ========================================');

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
