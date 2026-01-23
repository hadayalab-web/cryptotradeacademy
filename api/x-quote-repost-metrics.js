// api/x-quote-repost-metrics.js
// 引用リポストのメトリクスを定期的に追跡するCron Job
// 実行頻度: 1時間ごと（過去24時間以内の引用リポストを追跡）

const { trackMultipleQuoteRepostMetrics } = require('../services/x/metricsTracker');
// 注意: influencerList機能は削除されました（エンドユーザー追跡機能の削除のため）
// const { getInfluencerList } = require('../services/lead-discovery/influencerList');

/**
 * 過去24時間以内の引用リポストを取得
 * 注意: influencerList機能が削除されたため、現在は空の配列を返します
 * @returns {Promise<Array>} 引用リポストの配列
 */
async function getRecentQuoteReposts() {
  // 注意: influencerList機能は削除されました（エンドユーザー追跡機能の削除のため）
  // 将来的に、KVストレージから直接引用リポスト履歴を取得する実装に変更可能
  console.warn('[Quote Repost Metrics] influencerList機能が削除されたため、引用リポスト履歴の取得をスキップします');
  return [];
}

/**
 * Vercel Cron Job Handler
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

  console.log('[Quote Repost Metrics] ========================================');
  console.log('[Quote Repost Metrics] Cron job triggered at', new Date().toISOString());
  console.log('[Quote Repost Metrics] ========================================');

  try {
    // 過去24時間以内の引用リポストを取得
    const recentQuoteReposts = await getRecentQuoteReposts();
    console.log(`[Quote Repost Metrics] Found ${recentQuoteReposts.length} recent quote reposts to track`);

    if (recentQuoteReposts.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No recent quote reposts to track',
        tracked: 0,
      });
    }

    // メトリクスを追跡
    const results = await trackMultipleQuoteRepostMetrics(recentQuoteReposts);
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`[Quote Repost Metrics] ========================================`);
    console.log(`[Quote Repost Metrics] Completed: ${successCount} successful, ${failureCount} failed`);
    console.log(`[Quote Repost Metrics] ========================================`);

    return res.status(200).json({
      success: true,
      tracked: successCount,
      failed: failureCount,
      total: recentQuoteReposts.length,
      results: results.slice(0, 10), // 最初の10件のみ返す（デバッグ用）
    });
  } catch (error) {
    console.error('[Quote Repost Metrics] ========================================');
    console.error('[Quote Repost Metrics] ❌ Handler error:', error.message);
    console.error('[Quote Repost Metrics] Stack:', error.stack);
    console.error('[Quote Repost Metrics] ========================================');

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
