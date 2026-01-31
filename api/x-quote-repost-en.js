// api/x-quote-repost-en.js
// EN言語専用の引用リポスト（完全版実装）

const { postQuoteRepostsForLang } = require('./x-quote-repost');

const LANG = 'en';

module.exports = async (req, res) => {
  const runId = `qr-en-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  try {
    console.log(`[QuoteRepost-EN] 実行開始: ${new Date().toISOString()} [runId: ${runId}]`);
    
    // 市場データを取得（リクエストボディから、または最新データを取得）
    let reportData = req.body?.reportData || null;
    
    if (!reportData || !reportData.trapScore || !reportData.priceUsd) {
      console.log('[QuoteRepost-EN] Fetching latest market data...');
      try {
        const xPostFreeReportModule = require('./x-post-free-report');
        let fetchLatestMarketData = null;
        
        if (typeof xPostFreeReportModule === 'function') {
          fetchLatestMarketData = xPostFreeReportModule.fetchLatestMarketData;
        } else if (xPostFreeReportModule.fetchLatestMarketData) {
          fetchLatestMarketData = xPostFreeReportModule.fetchLatestMarketData;
        } else if (xPostFreeReportModule.default?.fetchLatestMarketData) {
          fetchLatestMarketData = xPostFreeReportModule.default.fetchLatestMarketData;
        }
        
        if (fetchLatestMarketData && typeof fetchLatestMarketData === 'function') {
          reportData = await fetchLatestMarketData();
        } else {
          // フォールバック: marketSnapshotServiceから最新スナップショットを取得
          const marketSnapshotService = require('../services/core/marketSnapshot');
          const snapshot = marketSnapshotService.getLatestSnapshot();
          if (snapshot) {
            reportData = {
              trapScore: snapshot.trap_score || 0,
              priceUsd: snapshot.price_usd_raw || 0,
              change24h: snapshot.change_24h || 0,
              exchangeNetflow: snapshot.exchange_netflow || snapshot.inflow || null,
              whaleRatio: snapshot.whale_ratio || snapshot.whaleRatio || null,
            };
          } else {
            // デフォルト値を使用
            reportData = {
              trapScore: 0,
              priceUsd: 89077,
              change24h: -0.84,
              exchangeNetflow: 1252,
              whaleRatio: 56,
            };
          }
        }
      } catch (fetchError) {
        console.error('[QuoteRepost-EN] ❌ Error fetching market data:', fetchError.message);
        // デフォルト値を使用して続行
        reportData = {
          trapScore: 0,
          priceUsd: 89077,
          change24h: -0.84,
          exchangeNetflow: 1252,
          whaleRatio: 56,
        };
      }
    }
    
    // 日次投稿数を取得（グローバルな日次投稿数）
    const dateString = new Date().toISOString().split('T')[0];
    const { getDailyPostCount: getGlobalDailyPostCount } = require('../services/x/optimization');
    const dailyPostCount = await getGlobalDailyPostCount(dateString);
    
    // deadlineMsを設定（Vercel Functionsの60秒制限を考慮）
    const MAX_DURATION_MS = 60_000;
    const deadlineMs = Date.now() + MAX_DURATION_MS - 1500;
    
    // 完全版のpostQuoteRepostsForLangを呼び出し
    const results = await postQuoteRepostsForLang(LANG, reportData, dailyPostCount, runId, deadlineMs);
    
    const successCount = results.filter(r => r.success && !r.dryRun).length;
    const totalCount = results.length;
    
    console.log(`[QuoteRepost-EN] ✅ 完了: ${successCount}/${totalCount} 成功 [runId: ${runId}]`);
    
    return res.status(200).json({
      success: successCount > 0,
      lang: LANG,
      results,
      metrics: {
        success_count: successCount,
        total_count: totalCount,
        posted_count: successCount,
      },
      runId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[QuoteRepost-EN] ❌ エラー [runId: ${runId}]:`, error.message);
    console.error(`[QuoteRepost-EN] Stack:`, error.stack);
    return res.status(500).json({
      success: false,
      error: error.message,
      lang: LANG,
      runId,
      timestamp: new Date().toISOString(),
    });
  }
};
