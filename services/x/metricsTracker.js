// services/x/metricsTracker.js
// 引用リポストのメトリクスを定期的に追跡する機能

const { getTweetMetrics } = require('./metrics');

/**
 * 引用リポストのメトリクスを取得して更新
 * @param {string} quoteTweetId - 引用リポストのツイートID
 * @param {string} influencerId - インフルエンサーID（オプション）
 * @returns {Promise<Object>} 更新されたメトリクス
 */
async function trackQuoteRepostMetrics(quoteTweetId, influencerId = null) {
  if (!quoteTweetId) {
    throw new Error('Quote tweet ID is required');
  }

  try {
    // 自分のツイートなので、non_public_metricsを含めて取得
    const metrics = await getTweetMetrics(quoteTweetId, true);
    
    if (!metrics) {
      console.warn(`[Metrics Tracker] Failed to get metrics for quote tweet ${quoteTweetId}`);
      return null;
    }

    // メトリクスを構造化
    const trackedMetrics = {
      quoteTweetId,
      trackedAt: new Date().toISOString(),
      // Public Metrics（正確）
      publicMetrics: {
        likes: metrics.publicMetrics.like_count || 0,
        retweets: metrics.publicMetrics.retweet_count || 0,
        replies: metrics.publicMetrics.reply_count || 0,
        quotes: metrics.publicMetrics.quote_count || 0,
      },
      // Non-public Metrics（正確 - 自分のツイートのみ）
      impressions: metrics.nonPublicMetrics?.impression_count || metrics.organicMetrics?.impression_count || 0,
      urlClicks: metrics.nonPublicMetrics?.url_link_clicks || metrics.organicMetrics?.url_link_clicks || 0,
      profileClicks: metrics.nonPublicMetrics?.user_profile_clicks || metrics.organicMetrics?.user_profile_clicks || 0,
      // Organic Metrics（過去30日以内のツイートのみ）
      organicMetrics: metrics.organicMetrics ? {
        impressions: metrics.organicMetrics.impression_count || 0,
        likes: metrics.organicMetrics.like_count || 0,
        retweets: metrics.organicMetrics.retweet_count || 0,
        replies: metrics.organicMetrics.reply_count || 0,
        urlClicks: metrics.organicMetrics.url_link_clicks || 0,
        profileClicks: metrics.organicMetrics.user_profile_clicks || 0,
      } : null,
    };

    // エンゲージメント率を計算
    if (trackedMetrics.impressions > 0) {
      const totalEngagements = trackedMetrics.publicMetrics.likes + 
                               trackedMetrics.publicMetrics.retweets + 
                               trackedMetrics.publicMetrics.replies + 
                               trackedMetrics.publicMetrics.quotes;
      trackedMetrics.engagementRate = (totalEngagements / trackedMetrics.impressions) * 100;
    } else {
      trackedMetrics.engagementRate = null;
    }

    // インフルエンサーIDが指定されている場合、引用リポスト履歴を更新
    // 注意: influencerList機能は削除されました（エンドユーザー追跡機能の削除のため）
    // if (influencerId) {
    //   await recordQuoteRepost(influencerId, quoteTweetId, trackedMetrics);
    // }

    console.log(`[Metrics Tracker] Tracked metrics for quote tweet ${quoteTweetId}:`, {
      impressions: trackedMetrics.impressions,
      engagementRate: trackedMetrics.engagementRate ? `${trackedMetrics.engagementRate.toFixed(2)}%` : 'N/A',
      likes: trackedMetrics.publicMetrics.likes,
      retweets: trackedMetrics.publicMetrics.retweets,
    });

    return trackedMetrics;
  } catch (error) {
    console.error(`[Metrics Tracker] Failed to track metrics for quote tweet ${quoteTweetId}:`, error.message);
    return null;
  }
}

/**
 * 複数の引用リポストのメトリクスを一括追跡
 * @param {Array<{quoteTweetId: string, influencerId?: string}>} quoteReposts - 引用リポストの配列
 * @returns {Promise<Array>} 追跡結果の配列
 */
async function trackMultipleQuoteRepostMetrics(quoteReposts) {
  if (!quoteReposts || quoteReposts.length === 0) {
    return [];
  }

  const results = [];
  
  for (const quoteRepost of quoteReposts) {
    try {
      const metrics = await trackQuoteRepostMetrics(
        quoteRepost.quoteTweetId,
        quoteRepost.influencerId
      );
      results.push({
        quoteTweetId: quoteRepost.quoteTweetId,
        success: !!metrics,
        metrics,
      });
      
      // レート制限対策（1秒待機）
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`[Metrics Tracker] Failed to track quote repost ${quoteRepost.quoteTweetId}:`, error.message);
      results.push({
        quoteTweetId: quoteRepost.quoteTweetId,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

module.exports = {
  trackQuoteRepostMetrics,
  trackMultipleQuoteRepostMetrics,
};
