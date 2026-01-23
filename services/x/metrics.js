// services/x/metrics.js
// X API v2 メトリクス取得機能（インプレッション、エンゲージメント追跡）

const { xApiRequest } = require('./client');

/**
 * ツイートのメトリクスを取得
 * @param {string} tweetId - ツイートID
 * @param {boolean} includeNonPublic - non_public_metricsを含めるか（自分のツイートのみ）
 * @returns {Promise<Object>} メトリクスデータ
 */
async function getTweetMetrics(tweetId, includeNonPublic = false) {
  if (!tweetId) {
    throw new Error('Tweet ID is required');
  }

  try {
    // tweet.fieldsにpublic_metricsを追加
    // non_public_metricsは自分のツイートのみ取得可能
    const tweetFields = includeNonPublic
      ? 'id,text,author_id,created_at,public_metrics,non_public_metrics,organic_metrics'
      : 'id,text,author_id,created_at,public_metrics';

    const response = await xApiRequest(`/tweets/${tweetId}`, {
      method: 'GET',
      params: {
        'tweet.fields': tweetFields,
      },
    });

    if (!response.data) {
      return null;
    }

    const tweet = response.data;
    const metrics = {
      tweetId: tweet.id,
      publicMetrics: tweet.public_metrics || {
        retweet_count: 0,
        like_count: 0,
        quote_count: 0,
        reply_count: 0,
      },
      // non_public_metricsは自分のツイートのみ取得可能
      nonPublicMetrics: includeNonPublic && tweet.non_public_metrics ? {
        impression_count: tweet.non_public_metrics.impression_count || 0,
        url_link_clicks: tweet.non_public_metrics.url_link_clicks || 0,
        user_profile_clicks: tweet.non_public_metrics.user_profile_clicks || 0,
      } : null,
      // organic_metrics（過去30日以内のツイートのみ）
      organicMetrics: includeNonPublic && tweet.organic_metrics ? {
        impression_count: tweet.organic_metrics.impression_count || 0,
        like_count: tweet.organic_metrics.like_count || 0,
        retweet_count: tweet.organic_metrics.retweet_count || 0,
        reply_count: tweet.organic_metrics.reply_count || 0,
        url_link_clicks: tweet.organic_metrics.url_link_clicks || 0,
        user_profile_clicks: tweet.organic_metrics.user_profile_clicks || 0,
      } : null,
    };

    return metrics;
  } catch (error) {
    console.error(`[X Metrics] Failed to get metrics for tweet ${tweetId}:`, error.message);
    return null;
  }
}

/**
 * 複数のツイートのメトリクスを一括取得
 * @param {string[]} tweetIds - ツイートIDの配列（最大100件）
 * @param {boolean} includeNonPublic - non_public_metricsを含めるか（自分のツイートのみ）
 * @returns {Promise<Object>} ツイートIDをキーとしたメトリクスのマップ
 */
async function getMultipleTweetMetrics(tweetIds, includeNonPublic = false) {
  if (!tweetIds || tweetIds.length === 0) {
    return {};
  }

  // X API v2の制限: 最大100件まで
  const batchSize = 100;
  const results = {};

  for (let i = 0; i < tweetIds.length; i += batchSize) {
    const batch = tweetIds.slice(i, i + batchSize);
    
    try {
      const tweetFields = includeNonPublic
        ? 'id,public_metrics,non_public_metrics,organic_metrics'
        : 'id,public_metrics';

      const idsParam = batch.join(',');
      const response = await xApiRequest(`/tweets`, {
        method: 'GET',
        params: {
          ids: idsParam,
          'tweet.fields': tweetFields,
        },
      });

      if (response.data && Array.isArray(response.data)) {
        for (const tweet of response.data) {
          results[tweet.id] = {
            publicMetrics: tweet.public_metrics || {
              retweet_count: 0,
              like_count: 0,
              quote_count: 0,
              reply_count: 0,
            },
            nonPublicMetrics: includeNonPublic && tweet.non_public_metrics ? {
              impression_count: tweet.non_public_metrics.impression_count || 0,
              url_link_clicks: tweet.non_public_metrics.url_link_clicks || 0,
              user_profile_clicks: tweet.non_public_metrics.user_profile_clicks || 0,
            } : null,
            organicMetrics: includeNonPublic && tweet.organic_metrics ? {
              impression_count: tweet.organic_metrics.impression_count || 0,
              like_count: tweet.organic_metrics.like_count || 0,
              retweet_count: tweet.organic_metrics.retweet_count || 0,
              reply_count: tweet.organic_metrics.reply_count || 0,
              url_link_clicks: tweet.organic_metrics.url_link_clicks || 0,
              user_profile_clicks: tweet.organic_metrics.user_profile_clicks || 0,
            } : null,
          };
        }
      }
    } catch (error) {
      console.error(`[X Metrics] Failed to get metrics for batch ${i}-${i + batch.length}:`, error.message);
    }
  }

  return results;
}

/**
 * エンゲージメント率を計算
 * @param {Object} metrics - メトリクスデータ
 * @param {number} impressions - インプレッション数（自分のツイートの場合）
 * @returns {number} エンゲージメント率（0-1）
 */
function calculateEngagementRate(metrics, impressions = null) {
  if (!metrics || !metrics.publicMetrics) {
    return 0;
  }

  const { like_count = 0, retweet_count = 0, reply_count = 0, quote_count = 0 } = metrics.publicMetrics;
  const totalEngagements = like_count + retweet_count + reply_count + quote_count;

  // インプレッション数が利用可能な場合（自分のツイート）
  if (impressions && impressions > 0) {
    return totalEngagements / impressions;
  }

  // インプレッション数が不明な場合、フォロワー数から推定（不正確）
  // 注意: これは正確な値ではない
  return null; // インプレッション数がない場合は計算不可
}

module.exports = {
  getTweetMetrics,
  getMultipleTweetMetrics,
  calculateEngagementRate,
};
