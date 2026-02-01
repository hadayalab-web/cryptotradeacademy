// api/x-algorithm-analysis.js
// Xアルゴリズム分析レポート生成API
// アルゴリズム分析: Grok (grok-4-1-fast-reasoning) / 戦略レポート: GPT

const { analyzeXAlgorithmOptimization } = require('../services/grok/xAlgorithmAnalyzer');
const { performAlgorithmAnalysis, generateAlgorithmReport } = require('../services/openai/algorithmAnalyzer');
const { generateWeeklyStrategyReport, formatStrategyReport } = require('../services/openai/strategyRecommender');

/**
 * Vercel Cron Job Handler（日次アルゴリズム分析レポート生成）
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
    
    // Vercel Cronのタイムアウト（10秒）を考慮して、即座にレスポンスを返し、バックグラウンドで処理
    // 注意: Vercel Cronは10秒でタイムアウトするため、長時間かかるGPT-5.2分析は非同期で実行
    res.status(202).json({
      success: true,
      message: 'Analysis started in background',
      days,
      focusArea,
      reportType,
      startedAt: new Date().toISOString(),
    });
    
    // バックグラウンドで分析を実行（レスポンスを返した後）
    (async () => {
      try {
        const results = {};
        
        // アルゴリズム分析: Grok (grok-4-1-fast-reasoning) に仕事させる
        if (reportType === 'algorithm' || reportType === 'both') {
          console.log('[X Algorithm Analysis] Performing algorithm analysis with Grok (grok-4-1-fast-reasoning)...');
          const startTime = Date.now();
          const grokAnalysis = await analyzeXAlgorithmOptimization({ lang: 'en' });
          const duration = Date.now() - startTime;
          console.log(`[X Algorithm Analysis] Grok algorithm analysis took ${duration}ms`);
          
          if (grokAnalysis && !grokAnalysis.error) {
            results.grokAlgorithmAnalysis = grokAnalysis;
            results.algorithmAnalysis = grokAnalysis; // 互換のため同じオブジェクトを参照
            results.algorithmReport = grokAnalysis.algorithmInsights
              ? JSON.stringify(grokAnalysis.algorithmInsights, null, 2)
              : JSON.stringify(grokAnalysis, null, 2);
            console.log('[X Algorithm Analysis] ✅ Grok algorithm analysis completed');
          } else {
            console.warn('[X Algorithm Analysis] ⚠️ Grok analysis returned null or error:', grokAnalysis?.error);
            // フォールバック: GPT
            const algorithmAnalysis = await performAlgorithmAnalysis(days);
            if (algorithmAnalysis) {
              results.algorithmAnalysis = algorithmAnalysis;
              results.algorithmReport = generateAlgorithmReport(algorithmAnalysis);
              console.log('[X Algorithm Analysis] ✅ Fallback GPT algorithm analysis completed');
            }
          }
        }
        
        // 戦略的推奨事項レポート
        if (reportType === 'strategy' || reportType === 'both') {
          console.log('[X Algorithm Analysis] Generating strategy recommendations...');
          const startTime = Date.now();
          const strategyReport = await generateWeeklyStrategyReport(days, focusArea);
          const duration = Date.now() - startTime;
          console.log(`[X Algorithm Analysis] Strategy report generation took ${duration}ms`);
          
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
        
        // Grok/GPT 分析結果を KV に保存（RealTimeOptimizer 等で利用）
        try {
          const kvModule = require('@vercel/kv');
          const kv = kvModule.kv;
          if (kv) {
            const analysisKey = 'x:gpt_analysis:latest'; // キーは互換のため維持（中身は Grok アルゴリズム分析 + GPT 戦略）
            await kv.set(analysisKey, results, { ex: 86400 * 2 }); // 2日間保持
            console.log('[X Algorithm Analysis] ✅ Analysis result saved to KV (Grok algorithm + GPT strategy)');
          }
        } catch (error) {
          console.warn('[X Algorithm Analysis] Failed to save analysis to KV:', error.message);
        }
      } catch (error) {
        console.error('[X Algorithm Analysis] ========================================');
        console.error('[X Algorithm Analysis] ❌ Background processing error:', error.message);
        console.error('[X Algorithm Analysis] Stack:', error.stack);
        console.error('[X Algorithm Analysis] ========================================');
      }
    })();
    
    return;
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
