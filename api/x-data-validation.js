// api/x-data-validation.js
// データ整合性検証機能（カウント、保存、メトリクスの整合性を定期的に検証）

const { getPostsForDate } = require("../services/x/postTracker");
const { getDailyPostCount } = require("../services/x/optimization");
const { getDailyEngagementMetrics } = require("./x-engagement-metrics");

// Vercel KV
let kv = null;
try {
  const kvModule = require("@vercel/kv");
  kv = kvModule.kv;
} catch (error) {
  console.warn("[X Data Validation] @vercel/kv not available:", error.message);
}

/**
 * 指定日のデータ整合性を検証
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {Promise<Object>} 検証結果
 */
async function validateDataIntegrity(dateString) {
  const results = {
    date: dateString,
    timestamp: new Date().toISOString(),
    inconsistencies: [],
    warnings: [],
    summary: {}
  };

  try {
    // 1. KVに保存された投稿数を取得
    const savedPosts = await getPostsForDate(dateString);
    const savedPostCount = savedPosts.length;

    // 2. Daily Post Countを取得
    const dailyPostCount = await getDailyPostCount(dateString);

    // 3. メトリクスに記録された投稿数を取得
    const metrics = await getDailyEngagementMetrics(dateString);
    const metricsPostCount = metrics?.tweets?.length || 0;

    // 4. 整合性チェック
    results.summary = {
      savedPostCount,
      dailyPostCount,
      metricsPostCount
    };

    // 不整合の検出
    if (dailyPostCount !== savedPostCount) {
      results.inconsistencies.push({
        type: "post_count_mismatch",
        message: `Daily post count (${dailyPostCount}) != Saved posts (${savedPostCount})`,
        difference: dailyPostCount - savedPostCount,
        severity: "high"
      });
    }

    if (metricsPostCount !== savedPostCount) {
      results.inconsistencies.push({
        type: "metrics_count_mismatch",
        message: `Metrics count (${metricsPostCount}) != Saved posts (${savedPostCount})`,
        difference: metricsPostCount - savedPostCount,
        severity: "high"
      });
    }

    // 5. メトリクスの詳細チェック
    if (metrics && metrics.tweets) {
      const savedTweetIds = new Set(savedPosts.map((p) => p.tweetId));
      const metricsTweetIds = new Set(metrics.tweets.map((t) => t.tweetId));

      // メトリクスに記録されているが、保存された投稿リストにないもの
      const missingInSaved = Array.from(metricsTweetIds).filter((id) => !savedTweetIds.has(id));
      if (missingInSaved.length > 0) {
        results.warnings.push({
          type: "metrics_without_saved_post",
          message: `Tweet IDs in metrics but not in saved posts: ${missingInSaved.join(", ")}`,
          tweetIds: missingInSaved
        });
      }

      // 保存された投稿リストにあるが、メトリクスに記録されていないもの
      const missingInMetrics = Array.from(savedTweetIds).filter((id) => !metricsTweetIds.has(id));
      if (missingInMetrics.length > 0) {
        results.warnings.push({
          type: "saved_post_without_metrics",
          message: `Tweet IDs in saved posts but not in metrics: ${missingInMetrics.join(", ")}`,
          tweetIds: missingInMetrics
        });
      }

      // データソースの混同チェック
      const tweetsWithEstimatedOnly = metrics.tweets.filter((t) => {
        const hasActual = t.impressions > 0 && t.dataSource?.impressions === "x_api_actual";
        const hasEstimated = t.dataSource?.estimatedImpressions > 0;
        return !hasActual && hasEstimated;
      });

      if (tweetsWithEstimatedOnly.length > 0) {
        results.warnings.push({
          type: "estimated_impressions_only",
          message: `${tweetsWithEstimatedOnly.length} tweets have only estimated impressions (no actual X API data)`,
          count: tweetsWithEstimatedOnly.length
        });
      }
    }

    // 6. 結果をKVに保存（検証履歴）
    if (kv) {
      try {
        const validationKey = `x:validation:${dateString}`;
        await kv.set(validationKey, results, { ex: 86400 * 90 }); // 90日間保持
      } catch (error) {
        console.warn("[X Data Validation] Failed to save validation results:", error.message);
      }
    }

    return results;
  } catch (error) {
    console.error("[X Data Validation] Error validating data integrity:", error.message);
    results.error = error.message;
    return results;
  }
}

/**
 * 過去N日間のデータ整合性を検証
 * @param {number} days - 日数
 * @returns {Promise<Array>} 検証結果の配列
 */
async function validateDataIntegrityForLastNDays(days = 7) {
  const results = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split("T")[0];

    const validation = await validateDataIntegrity(dateString);
    results.push(validation);
  }

  return results;
}

/**
 * Cron Jobハンドラー（毎日UTC 1時に実行）
 */
const handler = async (req, res) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  console.log("[X Data Validation] ========================================");
  console.log("[X Data Validation] Cron job triggered at", new Date().toISOString());
  console.log("[X Data Validation] ========================================");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error("[X Data Validation] ❌ Unauthorized: Invalid CRON_SECRET");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // 前日のデータ整合性を検証
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateString = yesterday.toISOString().split("T")[0];

    console.log(`[X Data Validation] Validating data integrity for ${dateString}...`);
    const validation = await validateDataIntegrity(dateString);

    console.log("[X Data Validation] ========================================");
    console.log("[X Data Validation] Validation Results:");
    console.log(JSON.stringify(validation, null, 2));
    console.log("[X Data Validation] ========================================");

    // 不整合が検出された場合は警告
    if (validation.inconsistencies.length > 0) {
      console.error(
        `[X Data Validation] ❌ ${validation.inconsistencies.length} inconsistencies detected!`
      );
      validation.inconsistencies.forEach((inc) => {
        console.error(`  - ${inc.message} (severity: ${inc.severity})`);
      });
    }

    if (validation.warnings.length > 0) {
      console.warn(`[X Data Validation] ⚠️  ${validation.warnings.length} warnings detected!`);
      validation.warnings.forEach((warn) => {
        console.warn(`  - ${warn.message}`);
      });
    }

    return res.status(200).json({
      success: true,
      date: dateString,
      validation
    });
  } catch (error) {
    console.error("[X Data Validation] ========================================");
    console.error("[X Data Validation] ❌ Handler error:", error.message);
    console.error("[X Data Validation] Stack:", error.stack);
    console.error("[X Data Validation] ========================================");
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
};

module.exports = handler;
module.exports.validateDataIntegrity = validateDataIntegrity;
module.exports.validateDataIntegrityForLastNDays = validateDataIntegrityForLastNDays;
