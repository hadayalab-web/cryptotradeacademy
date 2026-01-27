// api/x-engagement-metrics.js
// EN実測ダッシュボード（Grok推奨: 毎日EN実測ダッシュボード作成）

const { getTweetMetrics } = require("../services/x/metrics");
const { getXConfigStatus } = require("../services/x/config");

// Vercel KV（メトリクス保存用）
let kv = null;
try {
  const kvModule = require("@vercel/kv");
  kv = kvModule.kv;
} catch (error) {
  console.warn("[X Engagement Metrics] @vercel/kv not available:", error.message);
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
    console.warn("[X Engagement Metrics] Failed to get daily metrics:", error.message);
    return null;
  }
}

/**
 * エンゲージメントメトリクスを記録
 * @param {string} tweetId - ツイートID
 * @param {Object} metrics - メトリクスデータ
 * @returns {Promise<boolean>} 記録に成功した場合true、失敗した場合false
 */
async function recordEngagementMetrics(tweetId, metrics) {
  if (!kv) {
    console.warn("[X Engagement Metrics] KV not available, skipping metrics record");
    return false;
  }

  if (!tweetId) {
    console.warn("[X Engagement Metrics] Missing tweetId, skipping metrics record");
    return false;
  }

  try {
    const dateString = new Date().toISOString().split("T")[0];
    const key = `x:metrics:${dateString}`;

    // 既存のメトリクスを取得
    const existing = (await getDailyEngagementMetrics(dateString)) || {
      tweets: [],
      totalImpressions: 0,
      totalEngagements: 0,
      totalClicks: 0,
      totalReplies: 0,
      totalRetweets: 0,
      totalLikes: 0,
      totalQuoteTweets: 0
    };

    // CRITICAL FIX: 重複チェック（同じtweetIdが既に存在する場合は更新）
    const existingIndex = existing.tweets.findIndex((t) => t.tweetId === tweetId);

    if (existingIndex >= 0) {
      // 既存のメトリクスを更新
      const oldMetrics = existing.tweets[existingIndex];

      // 合計値から古い値を減算
      existing.totalImpressions -= oldMetrics.impressions || 0;
      existing.totalEngagements -= oldMetrics.engagements || 0;
      existing.totalClicks -= oldMetrics.clicks || 0;
      existing.totalReplies -= oldMetrics.replies || 0;
      existing.totalRetweets -= oldMetrics.retweets || 0;
      existing.totalLikes -= oldMetrics.likes || 0;
      existing.totalQuoteTweets -= oldMetrics.quoteTweets || 0;

      // 新しいメトリクスで更新
      existing.tweets[existingIndex] = {
        tweetId,
        ...metrics,
        recordedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log(`[X Engagement Metrics] Updated existing metrics for tweet ${tweetId}`);
    } else {
      // 新しいメトリクスを追加
      existing.tweets.push({
        tweetId,
        ...metrics,
        recordedAt: new Date().toISOString()
      });

      console.log(`[X Engagement Metrics] Added new metrics for tweet ${tweetId}`);
    }

    // 合計値を更新（新しい値で再計算）
    existing.totalImpressions += metrics.impressions || 0;
    existing.totalEngagements += metrics.engagements || 0;
    existing.totalClicks += metrics.clicks || 0;
    existing.totalReplies += metrics.replies || 0;
    existing.totalRetweets += metrics.retweets || 0;
    existing.totalLikes += metrics.likes || 0;
    existing.totalQuoteTweets += metrics.quoteTweets || 0;

    // 保存
    await kv.set(key, existing, { ex: 86400 * 30 }); // 30日間保持

    console.log(`[X Engagement Metrics] ✅ Metrics recorded for tweet ${tweetId}`);
    return true;
  } catch (error) {
    console.error("[X Engagement Metrics] ❌ Failed to record metrics:", error.message);
    console.error("[X Engagement Metrics] Error stack:", error.stack);
    return false;
  }
}

/**
 * 前日の投稿IDを取得してメトリクスを更新
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {Promise<void>}
 */
async function updateMetricsForDate(dateString) {
  if (!kv) {
    console.warn("[X Engagement Metrics] KV not available, skipping metrics update");
    return;
  }

  try {
    const { getPostsForDate } = require("../services/x/postTracker");
    const { getTweetMetrics } = require("../services/x/metrics");
    const posts = await getPostsForDate(dateString);

    if (posts.length === 0) {
      console.log(`[X Engagement Metrics] No posts found for ${dateString}, skipping update`);
      return;
    }

    console.log(
      `[X Engagement Metrics] Updating metrics for ${posts.length} posts on ${dateString}...`
    );

    let successCount = 0;
    let failureCount = 0;
    const failedTweetIds = [];

    for (const post of posts) {
      let retries = 3;
      let success = false;

      while (retries > 0 && !success) {
        try {
          // CRITICAL FIX: X APIから最新のメトリクスを取得（リトライ対応、エラーをスローする）
          // getTweetMetricsはエラーをスローするように変更されたため、try-catchで捕捉
          const metrics = await getTweetMetrics(post.tweetId, true, { maxRetries: 2 }); // 自分のツイートなのでnon_public_metrics取得可能

          // CRITICAL FIX: メトリクスデータの妥当性を確認
          if (!metrics || !metrics.publicMetrics) {
            throw new Error(`Invalid metrics data for tweet ${post.tweetId}`);
          }

          // CRITICAL FIX: インプレッション数の取得優先順位を明確化（GPT推奨）
          // 優先順位: 1. non_public_metrics (最も正確) → 2. organic_metrics (過去30日以内のツイートのみ) → 3. 0 (フォールバック)
          // 注意: non_public_metricsは自分のツイートのみ取得可能（OAuth 1.0a User Context認証が必要）
          const impressions =
            metrics.nonPublicMetrics?.impression_count ??
            metrics.organicMetrics?.impression_count ??
            0;
          const clicks =
            metrics.nonPublicMetrics?.url_link_clicks ??
            metrics.organicMetrics?.url_link_clicks ??
            0;

          const engagementMetrics = {
            impressions,
            engagements:
              (metrics.publicMetrics?.like_count || 0) +
              (metrics.publicMetrics?.retweet_count || 0) +
              (metrics.publicMetrics?.reply_count || 0) +
              (metrics.publicMetrics?.quote_count || 0),
            clicks,
            replies: metrics.publicMetrics?.reply_count || 0,
            retweets: metrics.publicMetrics?.retweet_count || 0,
            likes: metrics.publicMetrics?.like_count || 0,
            quoteTweets: metrics.publicMetrics?.quote_count || 0
          };

          // データソースのログ出力（デバッグ用）
          if (metrics.nonPublicMetrics?.impression_count !== undefined) {
            console.log(
              `[X Engagement Metrics] Using non_public_metrics for tweet ${post.tweetId} (impressions: ${impressions})`
            );
          } else if (metrics.organicMetrics?.impression_count !== undefined) {
            console.log(
              `[X Engagement Metrics] Using organic_metrics for tweet ${post.tweetId} (impressions: ${impressions})`
            );
          } else {
            console.warn(
              `[X Engagement Metrics] ⚠️ No impression data available for tweet ${post.tweetId} (using 0 as fallback)`
            );
          }

          // CRITICAL FIX: インプレッション数が0の場合の警告（投稿から時間が経過していない可能性）
          if (engagementMetrics.impressions === 0) {
            const postTime = new Date(post.postedAt);
            const now = new Date();
            const minutesSincePost = (now - postTime) / (1000 * 60);

            if (minutesSincePost < 10) {
              console.log(
                `[X Engagement Metrics] ⚠️ Impressions is 0 for tweet ${post.tweetId} (posted ${minutesSincePost.toFixed(1)} minutes ago - normal, will retry later)`
              );
            } else {
              console.warn(
                `[X Engagement Metrics] ⚠️ Impressions is still 0 for tweet ${post.tweetId} after ${minutesSincePost.toFixed(1)} minutes - may need investigation`
              );
            }
          }

          // CRITICAL FIX: データソースを明確に区別（Cron Jobから取得する場合は実測値のみ）
          const recordSuccess = await recordEngagementMetrics(post.tweetId, {
            ...engagementMetrics,
            lang: post.lang,
            source: post.postType,
            updatedAt: new Date().toISOString(),
            // データソースを明確に区別
            dataSource: {
              impressions: "x_api_actual", // X APIから取得した実測値
              engagements: "x_api_actual", // X APIから取得した実測値
              // メタデータから推定値を取得（存在する場合）
              estimatedImpressions: post.metadata?.estimatedImpressions || null,
              estimatedSource: post.metadata?.estimatedSource || null
            },
            isInitialRecord: false, // Cron Jobからの更新であることを明示
            ...post.metadata
          });

          if (recordSuccess) {
            success = true;
            successCount++;
            console.log(
              `[X Engagement Metrics] ✅ Successfully updated metrics for tweet ${post.tweetId} (impressions: ${engagementMetrics.impressions})`
            );
          } else {
            throw new Error(`Failed to record metrics for tweet ${post.tweetId}`);
          }

          // レート制限対策（1秒待機）
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          retries--;
          if (retries > 0) {
            console.warn(
              `[X Engagement Metrics] ⚠️ Retrying metrics update for tweet ${post.tweetId} (${retries} retries left):`,
              error.message
            );
            // 指数バックオフ（2秒、4秒、8秒）
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, 3 - retries) * 1000));
          } else {
            console.error(
              `[X Engagement Metrics] ❌ CRITICAL: Failed to update metrics for tweet ${post.tweetId} after 3 retries:`,
              error.message
            );
            failureCount++;
            failedTweetIds.push(post.tweetId);
          }
        }
      }
    }

    console.log(`[X Engagement Metrics] ✅ Metrics update completed for ${dateString}:`);
    console.log(`  Success: ${successCount}/${posts.length}`);
    console.log(`  Failed: ${failureCount}/${posts.length}`);
    if (failedTweetIds.length > 0) {
      console.log(`  Failed tweet IDs: ${failedTweetIds.join(", ")}`);
    }

    // P0-1: インフルエンサー別パフォーマンスを構築（日次確定メトリクスから）
    try {
      const {
        buildInfluencerDailyPerformance,
      } = require("../services/x/influencerPerformance");

      // metricsFetcher: tweetIdから確定メトリクスを取得する関数
      const metricsFetcher = async (tweetId) => {
        try {
          const metrics = await getTweetMetrics(tweetId, true, {
            maxRetries: 1,
          });
          if (!metrics || !metrics.publicMetrics) {
            return null;
          }

          const impressions =
            metrics.nonPublicMetrics?.impression_count ??
            metrics.organicMetrics?.impression_count ??
            0;
          const engagements =
            (metrics.publicMetrics?.like_count || 0) +
            (metrics.publicMetrics?.retweet_count || 0) +
            (metrics.publicMetrics?.reply_count || 0) +
            (metrics.publicMetrics?.quote_count || 0);

          return {
            impressions,
            engagements,
            replies: metrics.publicMetrics?.reply_count || 0,
            retweets: metrics.publicMetrics?.retweet_count || 0,
            likes: metrics.publicMetrics?.like_count || 0,
            quoteTweets: metrics.publicMetrics?.quote_count || 0,
          };
        } catch (error) {
          console.warn(
            `[X Engagement Metrics] ⚠️ Failed to fetch metrics for influencer performance (tweet ${tweetId}):`,
            error.message
          );
          return null;
        }
      };

      const perfResult = await buildInfluencerDailyPerformance(
        dateString,
        posts,
        metricsFetcher
      );

      console.log(
        `[X Engagement Metrics] ✅ Built influencer daily performance for ${dateString}:`,
        perfResult
      );
    } catch (perfError) {
      console.warn(
        `[X Engagement Metrics] ⚠️ Failed to build influencer daily performance (non-fatal):`,
        perfError.message
      );
      // エラーでもメトリクス更新は成功しているため続行
    }
  } catch (error) {
    console.warn("[X Engagement Metrics] Failed to update metrics for date:", error.message);
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
      error: "No metrics available"
    };
  }

  // エンゲージメント率を計算
  const engagementRate =
    metrics.totalImpressions > 0 ? (metrics.totalEngagements / metrics.totalImpressions) * 100 : 0;

  const clickRate =
    metrics.totalImpressions > 0 ? (metrics.totalClicks / metrics.totalImpressions) * 100 : 0;

  const replyRate =
    metrics.totalImpressions > 0 ? (metrics.totalReplies / metrics.totalImpressions) * 100 : 0;

  const dashboard = {
    date: dateString,
    summary: {
      totalTweets: metrics.tweets.length,
      totalImpressions: metrics.totalImpressions,
      totalEngagements: metrics.totalEngagements,
      totalClicks: metrics.totalClicks,
      totalReplies: metrics.totalReplies,
      totalRetweets: metrics.totalRetweets,
      totalLikes: metrics.totalLikes,
      totalQuoteTweets: metrics.totalQuoteTweets
    },
    rates: {
      engagementRate: engagementRate.toFixed(2),
      clickRate: clickRate.toFixed(2),
      replyRate: replyRate.toFixed(2)
    },
    tweets: metrics.tweets,
    generatedAt: new Date().toISOString()
  };

  // P0-2: インフルエンサー別パフォーマンスと投稿タイミング別エンゲージメント率を追加
  try {
    const { getPostsForDate } = require("../services/x/postTracker");
    const { getInfluencerMapping } = require("../services/x/influencerPerformance");
    const posts = await getPostsForDate(dateString);

    // influencer単位に集約
    const influencerAgg = new Map(); // key: `${lang}:${username}`
    // UTC hour別に集約（0-23時）
    const hourAgg = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      posts: 0,
      impressions: 0,
      engagements: 0,
    }));

    for (const t of metrics.tweets || []) {
      // t: {tweetId, impressions, engagements, ...}
      if (!t.tweetId) continue;

      try {
        // インフルエンサーマッピングを取得
        const mapping = await getInfluencerMapping(t.tweetId);
        if (mapping?.influencerUsername) {
          const lang = mapping.lang || t.lang || "unknown";
          const username = mapping.influencerUsername;
          const key = `${lang}:${username}`;
          const cur =
            influencerAgg.get(key) ||
            {
              username,
              lang,
              posts: 0,
              impressions: 0,
              engagements: 0,
            };

          cur.posts += 1;
          cur.impressions += t.impressions || 0;
          cur.engagements += t.engagements || 0;
          influencerAgg.set(key, cur);
        }

        // 投稿タイミング別集計（postedAtからUTC hourを取得）
        const post = posts.find((p) => p.tweetId === t.tweetId);
        if (post?.postedAt && (t.impressions || 0) > 0) {
          try {
            const hour = new Date(post.postedAt).getUTCHours();
            hourAgg[hour].posts += 1;
            hourAgg[hour].impressions += t.impressions || 0;
            hourAgg[hour].engagements += t.engagements || 0;
          } catch (dateError) {
            // 日付パースエラーはスキップ
          }
        }
      } catch (error) {
        // 個別のエラーは警告のみ（全体の処理は続行）
        console.warn(
          `[X Engagement Metrics] ⚠️ Error processing tweet ${t.tweetId} for extensions:`,
          error.message
        );
      }
    }

    // インフルエンサー別パフォーマンスを計算
    const influencerRows = Array.from(influencerAgg.values())
      .map((r) => ({
        username: r.username,
        lang: r.lang,
        posts: r.posts,
        avgER:
          r.impressions > 0 ? r.engagements / r.impressions : null,
      }))
      .filter((r) => r.avgER != null)
      .sort((a, b) => b.avgER - a.avgER);

    // 上位20%の閾値（P80）を計算
    const p80Index = Math.floor(influencerRows.length * 0.2) - 1;
    const p80Threshold =
      influencerRows.length > 0
        ? influencerRows[Math.max(0, p80Index)]?.avgER || null
        : null;

    // UTC hour別のエンゲージメント率を計算
    const byUtcHour = hourAgg.map((h) => ({
      hour: h.hour,
      posts: h.posts,
      avgER:
        h.impressions > 0 ? h.engagements / h.impressions : null,
    }));

    // 高エンゲージメントタイミングを特定（最低3投稿以上、ER降順）
    const bestHours = byUtcHour
      .filter((x) => x.avgER != null && x.posts >= 3)
      .sort((a, b) => b.avgER - a.avgER)
      .slice(0, 3)
      .map((x) => x.hour);

    // extensionsを追加
    dashboard.extensions = {
      influencers: {
        top: influencerRows.slice(
          0,
          Math.max(5, Math.ceil(influencerRows.length * 0.2))
        ),
        bottom: influencerRows.slice(-5),
        p80Threshold,
      },
      timing: {
        byUtcHour,
        bestHours,
      },
    };

    console.log(
      `[X Engagement Metrics] ✅ Added extensions to dashboard for ${dateString}:`,
      {
        influencerCount: influencerRows.length,
        topInfluencers: dashboard.extensions.influencers.top.length,
        bestHours: dashboard.extensions.timing.bestHours,
      }
    );
  } catch (extError) {
    console.warn(
      `[X Engagement Metrics] ⚠️ Failed to add extensions to dashboard (non-fatal):`,
      extError.message
    );
    // エラーでも基本ダッシュボードは返す
  }

  return dashboard;
}

// Vercel Cron実行時（毎日UTC 0時に実行）
const handler = async (req, res) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  console.log("[X Engagement Metrics] ========================================");
  console.log("[X Engagement Metrics] Cron job triggered at", new Date().toISOString());
  console.log("[X Engagement Metrics] ========================================");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error("[X Engagement Metrics] ❌ Unauthorized: Invalid CRON_SECRET");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // 前日のメトリクスダッシュボードを生成
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateString = yesterday.toISOString().split("T")[0];

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
        console.warn("[X Engagement Metrics] Failed to save dashboard:", error.message);
      }
    }

    console.log("[X Engagement Metrics] ========================================");
    console.log("[X Engagement Metrics] Dashboard:", JSON.stringify(dashboard, null, 2));
    console.log("[X Engagement Metrics] ========================================");

    return res.status(200).json({
      success: true,
      date: dateString,
      dashboard
    });
  } catch (error) {
    console.error("[X Engagement Metrics] ========================================");
    console.error("[X Engagement Metrics] ❌ Handler error:", error.message);
    console.error("[X Engagement Metrics] Stack:", error.stack);
    console.error("[X Engagement Metrics] ========================================");
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
};

module.exports = handler;
module.exports.getDailyEngagementMetrics = getDailyEngagementMetrics;
module.exports.recordEngagementMetrics = recordEngagementMetrics;
module.exports.generateEngagementDashboard = generateEngagementDashboard;
module.exports.updateMetricsForDate = updateMetricsForDate;
