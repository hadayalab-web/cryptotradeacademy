// api/x-engagement-metrics.js
// EN実測ダッシュボード（Grok推奨: 毎日EN実測ダッシュボード作成）

const { getTweetMetrics } = require('../services/x/metrics');
const { getXConfigStatus } = require('../services/x/config');

// Vercel KV（メトリクス保存用）
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[X Engagement Metrics] @vercel/kv not available:', error.message);
}

/**
 * 1日のエンゲージメントメトリクスを取得
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {Promise<Object>} メトリクスデータ
 */
async function getDailyEngagementMetrics(dateString) {
  if (!kv) {
    return null;
  }
  
  try {
    const key = `x:metrics:${dateString}`;
    const metrics = await kv.get(key);
    return metrics || null;
  } catch (error) {
    console.warn('[X Engagement Metrics] Failed to get daily metrics:', error.message);
    return null;
  }
}

/**
 * エンゲージメントメトリクスを記録
 * @param {string} tweetId - ツイートID
 * @param {Object} metrics - メトリクスデータ
 */
async function recordEngagementMetrics(tweetId, metrics) {
  if (!kv) {
    return;
  }
  
  try {
    const dateString = new Date().toISOString().split('T')[0];
    const key = `x:metrics:${dateString}`;
    
    // 既存のメトリクスを取得
    const existing = await getDailyEngagementMetrics(dateString) || {
      tweets: [],
      totalImpressions: 0,
      totalEngagements: 0,
      totalClicks: 0,
      totalReplies: 0,
      totalRetweets: 0,
      totalLikes: 0,
      totalQuoteTweets: 0,
    };
    
    // 新しいメトリクスを追加
    existing.tweets.push({
      tweetId,
      ...metrics,
      recordedAt: new Date().toISOString(),
    });
    
    // 合計値を更新
    existing.totalImpressions += metrics.impressions || 0;
    existing.totalEngagements += metrics.engagements || 0;
    existing.totalClicks += metrics.clicks || 0;
    existing.totalReplies += metrics.replies || 0;
    existing.totalRetweets += metrics.retweets || 0;
    existing.totalLikes += metrics.likes || 0;
    existing.totalQuoteTweets += metrics.quoteTweets || 0;
    
    // 保存
    await kv.set(key, existing, { ex: 86400 * 30 }); // 30日間保持
  } catch (error) {
    console.warn('[X Engagement Metrics] Failed to record metrics:', error.message);
  }
}

/**
 * 前日の投稿IDを取得してメトリクスを更新
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {Promise<void>}
 */
async function updateMetricsForDate(dateString) {
  if (!kv) {
    console.warn('[X Engagement Metrics] KV not available, skipping metrics update');
    return;
  }
  
  try {
    const { getPostsForDate } = require('../services/x/postTracker');
    const { getTweetMetrics } = require('../services/x/metrics');
    const posts = await getPostsForDate(dateString);
    
    if (posts.length === 0) {
      console.log(`[X Engagement Metrics] No posts found for ${dateString}, skipping update`);
      return;
    }
    
    console.log(`[X Engagement Metrics] Updating metrics for ${posts.length} posts on ${dateString}...`);
    
    for (const post of posts) {
      try {
        // X APIから最新のメトリクスを取得
        const metrics = await getTweetMetrics(post.tweetId, true); // 自分のツイートなのでnon_public_metrics取得可能
        if (metrics) {
          const engagementMetrics = {
            impressions: metrics.nonPublicMetrics?.impression_count || metrics.organicMetrics?.impression_count || 0,
            engagements: (metrics.publicMetrics?.like_count || 0) +
                        (metrics.publicMetrics?.retweet_count || 0) +
                        (metrics.publicMetrics?.reply_count || 0) +
                        (metrics.publicMetrics?.quote_count || 0),
            clicks: metrics.nonPublicMetrics?.url_link_clicks || metrics.organicMetrics?.url_link_clicks || 0,
            replies: metrics.publicMetrics?.reply_count || 0,
            retweets: metrics.publicMetrics?.retweet_count || 0,
            likes: metrics.publicMetrics?.like_count || 0,
            quoteTweets: metrics.publicMetrics?.quote_count || 0,
          };
          
          // メトリクスを更新
          await recordEngagementMetrics(post.tweetId, {
            ...engagementMetrics,
            lang: post.lang,
            source: post.postType,
            updatedAt: new Date().toISOString(),
            ...post.metadata,
          });
          
          // レート制限対策（1秒待機）
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.warn(`[X Engagement Metrics] Failed to update metrics for tweet ${post.tweetId}:`, error.message);
      }
    }
    
    console.log(`[X Engagement Metrics] ✅ Metrics updated for ${posts.length} posts on ${dateString}`);
  } catch (error) {
    console.warn('[X Engagement Metrics] Failed to update metrics for date:', error.message);
  }
}

/**
 * エンゲージメントダッシュボードを生成
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {Promise<Object>} ダッシュボードデータ
 */
async function generateEngagementDashboard(dateString) {
  const metrics = await getDailyEngagementMetrics(dateString);
  
  if (!metrics) {
    return {
      date: dateString,
      error: 'No metrics available',
    };
  }
  
  // エンゲージメント率を計算
  const engagementRate = metrics.totalImpressions > 0
    ? (metrics.totalEngagements / metrics.totalImpressions) * 100
    : 0;
  
  const clickRate = metrics.totalImpressions > 0
    ? (metrics.totalClicks / metrics.totalImpressions) * 100
    : 0;
  
  const replyRate = metrics.totalImpressions > 0
    ? (metrics.totalReplies / metrics.totalImpressions) * 100
    : 0;
  
  return {
    date: dateString,
    summary: {
      totalTweets: metrics.tweets.length,
      totalImpressions: metrics.totalImpressions,
      totalEngagements: metrics.totalEngagements,
      totalClicks: metrics.totalClicks,
      totalReplies: metrics.totalReplies,
      totalRetweets: metrics.totalRetweets,
      totalLikes: metrics.totalLikes,
      totalQuoteTweets: metrics.totalQuoteTweets,
    },
    rates: {
      engagementRate: engagementRate.toFixed(2),
      clickRate: clickRate.toFixed(2),
      replyRate: replyRate.toFixed(2),
    },
    tweets: metrics.tweets,
    generatedAt: new Date().toISOString(),
  };
}

// Vercel Cron実行時（毎日UTC 0時に実行）
const handler = async (req, res) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  console.log('[X Engagement Metrics] ========================================');
  console.log('[X Engagement Metrics] Cron job triggered at', new Date().toISOString());
  console.log('[X Engagement Metrics] ========================================');
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('[X Engagement Metrics] ❌ Unauthorized: Invalid CRON_SECRET');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // 前日のメトリクスダッシュボードを生成
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateString = yesterday.toISOString().split('T')[0];
    
    // 前日の投稿IDを取得してメトリクスを更新
    console.log(`[X Engagement Metrics] Updating metrics for ${dateString}...`);
    await updateMetricsForDate(dateString);
    
    console.log(`[X Engagement Metrics] Generating dashboard for ${dateString}...`);
    const dashboard = await generateEngagementDashboard(dateString);
    
    // ダッシュボードをKVストレージに保存
    if (kv) {
      try {
        const dashboardKey = `x:dashboard:${dateString}`;
        await kv.set(dashboardKey, dashboard, { ex: 86400 * 90 }); // 90日間保持
        console.log(`[X Engagement Metrics] ✅ Dashboard saved: ${dashboardKey}`);
      } catch (error) {
        console.warn('[X Engagement Metrics] Failed to save dashboard:', error.message);
      }
    }
    
    console.log('[X Engagement Metrics] ========================================');
    console.log('[X Engagement Metrics] Dashboard:', JSON.stringify(dashboard, null, 2));
    console.log('[X Engagement Metrics] ========================================');
    
    return res.status(200).json({
      success: true,
      date: dateString,
      dashboard,
    });
  } catch (error) {
    console.error('[X Engagement Metrics] ========================================');
    console.error('[X Engagement Metrics] ❌ Handler error:', error.message);
    console.error('[X Engagement Metrics] Stack:', error.stack);
    console.error('[X Engagement Metrics] ========================================');
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
};

module.exports = handler;
module.exports.getDailyEngagementMetrics = getDailyEngagementMetrics;
module.exports.recordEngagementMetrics = recordEngagementMetrics;
module.exports.generateEngagementDashboard = generateEngagementDashboard;
module.exports.updateMetricsForDate = updateMetricsForDate;
