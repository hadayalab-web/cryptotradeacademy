// services/x/metrics.js
// X API v2 メトリクス取得機能（インプレッション、エンゲージメント追跡）

const { xApiRequest } = require("./client");

/**
 * ツイートのメトリクスを取得
 * @param {string} tweetId - ツイートID
 * @param {boolean} includeNonPublic - non_public_metricsを含めるか（自分のツイートのみ）
 * @returns {Promise<Object>} メトリクスデータ
 */
/** ツイート未検出（削除・非公開・ID誤り）かどうか */
function isTweetNotFoundError(error) {
  if (!error || !error.message) return false;
  const msg = error.message;
  return (
    /Could not find tweet with id/i.test(msg) ||
    /resource-not-found/i.test(msg) ||
    (msg.includes("Not Found Error") && msg.includes("tweet"))
  );
}

/**
 * ツイートのメトリクスを取得
 * @param {string} tweetId - ツイートID
 * @param {boolean} includeNonPublic - non_public_metricsを含めるか（自分のツイートのみ）
 * @param {Object} options - オプション
 * @param {number} options.maxRetries - 最大リトライ回数（デフォルト: 3）
 * @param {number} options.retryDelay - リトライ間隔（ミリ秒、デフォルト: 1000）
 * @returns {Promise<Object>} メトリクスデータ
 * @throws {Error} メトリクス取得に失敗した場合
 */
async function getTweetMetrics(tweetId, includeNonPublic = false, options = {}) {
  if (!tweetId) {
    throw new Error("CRITICAL: Tweet ID is required");
  }

  const maxRetries = options.maxRetries || 3;
  const retryDelay = options.retryDelay || 1000;

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // tweet.fieldsにpublic_metricsを追加
      // non_public_metricsは自分のツイートのみ取得可能
      const tweetFields = includeNonPublic
        ? "id,text,author_id,created_at,public_metrics,non_public_metrics,organic_metrics"
        : "id,text,author_id,created_at,public_metrics";

      const response = await xApiRequest(`/tweets/${tweetId}`, {
        method: "GET",
        params: {
          "tweet.fields": tweetFields
        }
      });

      if (!response || !response.data) {
        throw new Error(`X API returned no data for tweet ${tweetId}`);
      }

      const tweet = response.data;

      // CRITICAL FIX: データの存在を確認
      if (!tweet.id) {
        throw new Error(`Invalid tweet data: missing id`);
      }

      const metrics = {
        tweetId: tweet.id,
        createdAt: tweet.created_at || null,
        publicMetrics: tweet.public_metrics || {
          retweet_count: 0,
          like_count: 0,
          quote_count: 0,
          reply_count: 0
        },
        // non_public_metrics: 自分のツイートのみ取得可能（OAuth 1.0a User Context認証が必要）
        // 優先度: 1（最も正確なインプレッション数）
        nonPublicMetrics:
          includeNonPublic && tweet.non_public_metrics
            ? {
                impression_count: tweet.non_public_metrics.impression_count || 0,
                url_link_clicks: tweet.non_public_metrics.url_link_clicks || 0,
                user_profile_clicks: tweet.non_public_metrics.user_profile_clicks || 0
              }
            : null,
        // organic_metrics: 過去30日以内のツイートのみ取得可能
        // 優先度: 2（non_public_metricsが利用できない場合のフォールバック）
        organicMetrics:
          includeNonPublic && tweet.organic_metrics
            ? {
                impression_count: tweet.organic_metrics.impression_count || 0,
                like_count: tweet.organic_metrics.like_count || 0,
                retweet_count: tweet.organic_metrics.retweet_count || 0,
                reply_count: tweet.organic_metrics.reply_count || 0,
                url_link_clicks: tweet.organic_metrics.url_link_clicks || 0,
                user_profile_clicks: tweet.organic_metrics.user_profile_clicks || 0
              }
            : null
      };

      // CRITICAL FIX: メトリクスデータの妥当性を確認
      if (!metrics.publicMetrics) {
        throw new Error(`Invalid metrics data: missing publicMetrics`);
      }

      console.log(
        `[X Metrics] ✅ Successfully retrieved metrics for tweet ${tweetId} (attempt ${attempt + 1}/${maxRetries + 1})`
      );
      return metrics;
    } catch (error) {
      lastError = error;

      // ツイート未検出（削除・非公開・ID誤り）はリトライしない・CRITICALにしない
      if (isTweetNotFoundError(error)) {
        console.warn(
          `[X Metrics] ⚠️ Tweet not found (deleted or private): ${tweetId}. Skipping retries.`
        );
        throw new Error(`Tweet not found: ${tweetId} (deleted or private)`);
      }

      // レート制限エラーの場合は待機時間を長くする
      const isRateLimit = error.message?.includes("429") || error.message?.includes("rate limit");
      const delay = isRateLimit ? retryDelay * Math.pow(2, attempt) : retryDelay;

      if (attempt < maxRetries) {
        console.warn(
          `[X Metrics] ⚠️ Failed to get metrics for tweet ${tweetId} (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}. Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(
          `[X Metrics] ❌ CRITICAL: Failed to get metrics for tweet ${tweetId} after ${maxRetries + 1} attempts: ${error.message}`
        );
      }
    }
  }

  // すべてのリトライが失敗した場合
  // CRITICAL FIX: エラーメッセージの詳細化（GPT推奨）
  const finalErrorDetails = {
    message: lastError?.message || "Unknown error",
    status: lastError?.status || lastError?.statusCode || null,
    response: lastError?.response
      ? typeof lastError.response === "string"
        ? lastError.response.substring(0, 200)
        : JSON.stringify(lastError.response).substring(0, 200)
      : null
  };

  throw new Error(
    `CRITICAL: Failed to get metrics for tweet ${tweetId} after ${maxRetries + 1} attempts. Last error: ${finalErrorDetails.message}${finalErrorDetails.status ? ` (Status: ${finalErrorDetails.status})` : ""}${finalErrorDetails.response ? ` (Response: ${finalErrorDetails.response})` : ""}`
  );
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
        ? "id,public_metrics,non_public_metrics,organic_metrics"
        : "id,public_metrics";

      const idsParam = batch.join(",");
      const response = await xApiRequest(`/tweets`, {
        method: "GET",
        params: {
          ids: idsParam,
          "tweet.fields": tweetFields
        }
      });

      if (response.data && Array.isArray(response.data)) {
        for (const tweet of response.data) {
          results[tweet.id] = {
            publicMetrics: tweet.public_metrics || {
              retweet_count: 0,
              like_count: 0,
              quote_count: 0,
              reply_count: 0
            },
            nonPublicMetrics:
              includeNonPublic && tweet.non_public_metrics
                ? {
                    impression_count: tweet.non_public_metrics.impression_count || 0,
                    url_link_clicks: tweet.non_public_metrics.url_link_clicks || 0,
                    user_profile_clicks: tweet.non_public_metrics.user_profile_clicks || 0
                  }
                : null,
            organicMetrics:
              includeNonPublic && tweet.organic_metrics
                ? {
                    impression_count: tweet.organic_metrics.impression_count || 0,
                    like_count: tweet.organic_metrics.like_count || 0,
                    retweet_count: tweet.organic_metrics.retweet_count || 0,
                    reply_count: tweet.organic_metrics.reply_count || 0,
                    url_link_clicks: tweet.organic_metrics.url_link_clicks || 0,
                    user_profile_clicks: tweet.organic_metrics.user_profile_clicks || 0
                  }
                : null
          };
        }
      }
    } catch (error) {
      console.error(
        `[X Metrics] Failed to get metrics for batch ${i}-${i + batch.length}:`,
        error.message
      );
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

  const {
    like_count = 0,
    retweet_count = 0,
    reply_count = 0,
    quote_count = 0
  } = metrics.publicMetrics;
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
  calculateEngagementRate
};
