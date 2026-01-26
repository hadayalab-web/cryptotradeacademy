// scripts/generate_24h_performance_report.js
// 24時間の実績レポートと予測レポートを生成

const { getPostsForLastNDays, getPostsForDate } = require("../services/x/postTracker");
const { getDailyEngagementMetrics } = require("../api/x-engagement-metrics");
const { getTweetMetrics } = require("../services/x/metrics");

// Vercel KV
let kv = null;
try {
  const kvModule = require("@vercel/kv");
  kv = kvModule.kv;
} catch (error) {
  console.warn("[24H Report] @vercel/kv not available:", error.message);
}

/**
 * 言語コードを市場名に変換
 */
function langToMarket(lang) {
  const marketMap = {
    en: "English (EN)",
    es: "Spanish (ES)",
    "pt-br": "Portuguese (PT-BR)",
    ar: "Arabic (AR)",
    ja: "Japanese (JA)",
    ko: "Korean (KO)"
  };
  return marketMap[lang] || lang.toUpperCase();
}

/**
 * 投稿タイプを日本語に変換
 */
function postTypeToJapanese(postType) {
  const typeMap = {
    quote_repost: "Quote Repost",
    free_report: "Free Report",
    minimal_version: "Minimal Version"
  };
  return typeMap[postType] || postType;
}

/**
 * Telegramオプトイン数を取得（過去24時間）
 */
async function getTelegramOptIns24h() {
  if (!kv) return { total: 0, byLang: {} };

  try {
    const { loadFreeUsers } = require("../services/free-users/manager");
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 過去24時間のオプトインユーザーを取得
    const freeUsers = await loadFreeUsers();
    const recentOptIns = freeUsers.filter((user) => {
      const userObj =
        typeof user === "string" ? { chatId: user, joinedAt: new Date().toISOString() } : user;
      const optedInAt = new Date(userObj.joinedAt || userObj.createdAt || new Date().toISOString());
      return optedInAt >= oneDayAgo;
    });

    // 言語別に集計
    const byLang = {};
    recentOptIns.forEach((user) => {
      const userObj = typeof user === "string" ? { lang: null } : user;
      const lang = userObj.lang || "unknown";
      byLang[lang] = (byLang[lang] || 0) + 1;
    });

    return {
      total: recentOptIns.length,
      byLang
    };
  } catch (error) {
    console.warn("[24H Report] Failed to get Telegram opt-ins:", error.message);
    return { total: 0, byLang: {} };
  }
}

/**
 * Whopトラフィックとコンバージョンを取得（推定値）
 */
async function getWhopTrafficAndConversions24h(posts, metrics) {
  // Whopリンクを含む投稿を特定
  const whopPosts = posts.filter(
    (post) => post.postType === "free_report" || post.postType === "minimal_version"
  );

  let totalImpressions = 0;
  let totalClicks = 0;
  let totalConversions = 0;

  // メトリクスからクリック数を取得
  if (metrics && metrics.tweets) {
    whopPosts.forEach((post) => {
      const tweetMetrics = metrics.tweets.find((t) => t.tweetId === post.tweetId);
      if (tweetMetrics) {
        totalImpressions += tweetMetrics.impressions || 0;
        totalClicks += tweetMetrics.clicks || 0;
      }
    });
  }

  // コンバージョン率を適用（保守的: 1%, 中程度: 2%, 楽観的: 3%）
  const conversionRates = {
    conservative: 0.01,
    moderate: 0.02,
    optimistic: 0.03
  };

  return {
    traffic: {
      impressions: totalImpressions,
      clicks: totalClicks
    },
    conversions: {
      conservative: Math.round(totalClicks * conversionRates.conservative),
      moderate: Math.round(totalClicks * conversionRates.moderate),
      optimistic: Math.round(totalClicks * conversionRates.optimistic)
    }
  };
}

/**
 * 24時間の実績レポートを生成
 */
async function generate24hPerformanceReport() {
  console.log("=".repeat(80));
  console.log("24時間実績レポート生成中...");
  console.log("=".repeat(80));

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = yesterday.toISOString().split("T")[0];

  // 過去24時間の投稿を取得
  let posts = [];
  let recentPosts = [];
  try {
    posts = await getPostsForLastNDays(2);
    recentPosts = posts.filter((post) => {
      const postedAt = new Date(post.postedAt);
      return postedAt >= oneDayAgo;
    });
  } catch (error) {
    console.warn("[24H Report] Failed to get posts from KV:", error.message);
    console.warn("[24H Report] Using empty posts array");
  }

  console.log(`\n📊 過去24時間の投稿数: ${recentPosts.length}件\n`);

  // メトリクスを取得
  let metrics = null;
  try {
    metrics = await getDailyEngagementMetrics(yesterdayString);
  } catch (error) {
    console.warn("[24H Report] Failed to get metrics from KV:", error.message);
  }

  // Telegramオプトイン数を取得
  const telegramOptIns = await getTelegramOptIns24h();

  // Whopトラフィックとコンバージョンを取得
  const whopData = await getWhopTrafficAndConversions24h(recentPosts, metrics);

  // インフルエンサー情報を取得（metadataから）
  const influencerMap = {};
  recentPosts.forEach((post) => {
    if (post.metadata?.influencerUsername) {
      const key = `${post.lang}_${post.metadata.influencerUsername}`;
      if (!influencerMap[key]) {
        influencerMap[key] = {
          lang: post.lang,
          influencer: post.metadata.influencerUsername,
          posts: []
        };
      }
      influencerMap[key].posts.push(post);
    }
  });

  // レポートを生成
  const report = {
    period: {
      start: oneDayAgo.toISOString(),
      end: now.toISOString(),
      duration: "24 hours"
    },
    posts: [],
    summary: {
      totalPosts: recentPosts.length,
      totalImpressions: 0,
      totalEngagements: 0,
      telegramOptIns: telegramOptIns.total,
      whopTraffic: whopData.traffic.clicks,
      whopConversions: whopData.conversions
    },
    byMarket: {}
  };

  // 投稿ごとに詳細を集計
  for (const post of recentPosts) {
    const tweetMetrics = metrics?.tweets?.find((t) => t.tweetId === post.tweetId);
    const impressions = tweetMetrics?.impressions || 0;
    const engagements = tweetMetrics?.engagements || 0;

    report.posts.push({
      market: langToMarket(post.lang),
      influencer: post.metadata?.influencerUsername || "N/A",
      postType: postTypeToJapanese(post.postType),
      tweetId: post.tweetId,
      postedAt: post.postedAt,
      impressions,
      engagements,
      engagementRate: impressions > 0 ? ((engagements / impressions) * 100).toFixed(2) + "%" : "0%"
    });

    // 市場別に集計
    if (!report.byMarket[post.lang]) {
      report.byMarket[post.lang] = {
        market: langToMarket(post.lang),
        posts: 0,
        impressions: 0,
        engagements: 0,
        telegramOptIns: telegramOptIns.byLang[post.lang] || 0
      };
    }
    report.byMarket[post.lang].posts++;
    report.byMarket[post.lang].impressions += impressions;
    report.byMarket[post.lang].engagements += engagements;

    // サマリーに追加
    report.summary.totalImpressions += impressions;
    report.summary.totalEngagements += engagements;
  }

  return report;
}

/**
 * 今後の予測レポートを生成
 */
async function generateForecastReport() {
  console.log("\n" + "=".repeat(80));
  console.log("今後の予測レポート生成中...");
  console.log("=".repeat(80));

  try {
    const { calculateDailyExpectations } = require("../services/x/postPerformanceAnalyzer");
    const forecast = await calculateDailyExpectations();

    return forecast;
  } catch (error) {
    console.warn("[24H Report] Failed to generate forecast:", error.message);
    return null;
  }
}

/**
 * メイン実行
 */
async function main() {
  try {
    // 24時間の実績レポート
    const performanceReport = await generate24hPerformanceReport();

    // 予測レポート
    const forecastReport = await generateForecastReport();

    // レポートを出力
    console.log("\n" + "=".repeat(80));
    console.log("📊 24時間実績レポート");
    console.log("=".repeat(80));
    console.log(`\n期間: ${performanceReport.period.start} ～ ${performanceReport.period.end}`);
    console.log(`\n【サマリー】`);
    console.log(`- 総投稿数: ${performanceReport.summary.totalPosts}件`);
    console.log(
      `- 総インプレッション: ${performanceReport.summary.totalImpressions.toLocaleString()}`
    );
    console.log(
      `- 総エンゲージメント: ${performanceReport.summary.totalEngagements.toLocaleString()}`
    );
    console.log(`- Telegramオプトイン: ${performanceReport.summary.telegramOptIns}人`);
    console.log(`- Whopトラフィック（クリック）: ${performanceReport.summary.whopTraffic}回`);
    console.log(`- Whopコンバージョン:`);
    console.log(`  - 保守的: ${performanceReport.summary.whopConversions.conservative}件`);
    console.log(`  - 中程度: ${performanceReport.summary.whopConversions.moderate}件`);
    console.log(`  - 楽観的: ${performanceReport.summary.whopConversions.optimistic}件`);

    console.log(`\n【市場別実績】`);
    Object.values(performanceReport.byMarket).forEach((market) => {
      console.log(`\n${market.market}:`);
      console.log(`  - 投稿数: ${market.posts}件`);
      console.log(`  - インプレッション: ${market.impressions.toLocaleString()}`);
      console.log(`  - エンゲージメント: ${market.engagements.toLocaleString()}`);
      console.log(`  - Telegramオプトイン: ${market.telegramOptIns}人`);
    });

    console.log(`\n【投稿詳細】`);
    performanceReport.posts.forEach((post, index) => {
      console.log(`\n${index + 1}. ${post.market} - ${post.influencer}`);
      console.log(`   投稿タイプ: ${post.postType}`);
      console.log(`   ツイートID: ${post.tweetId}`);
      console.log(`   投稿時刻: ${post.postedAt}`);
      console.log(`   インプレッション: ${post.impressions.toLocaleString()}`);
      console.log(`   エンゲージメント: ${post.engagements.toLocaleString()}`);
      console.log(`   エンゲージメント率: ${post.engagementRate}`);
    });

    console.log("\n" + "=".repeat(80));
    console.log("🔮 今後の予測レポート");
    console.log("=".repeat(80));

    if (forecastReport) {
      console.log(`\n【日次予測】`);
      if (forecastReport.dailyImpressions) {
        console.log(
          `- インプレッション: ${forecastReport.dailyImpressions.total.toLocaleString()}`
        );
      }
      if (forecastReport.dailyEngagements) {
        console.log(
          `- エンゲージメント: ${forecastReport.dailyEngagements.total.toLocaleString()}`
        );
      }
      if (forecastReport.telegramOptIns) {
        console.log(`- Telegramオプトイン:`);
        console.log(`  - 保守的: ${forecastReport.telegramOptIns.daily.conservative}人/日`);
        console.log(`  - 中程度: ${forecastReport.telegramOptIns.daily.moderate}人/日`);
        console.log(`  - 楽観的: ${forecastReport.telegramOptIns.daily.optimistic}人/日`);
      }
      if (forecastReport.whopConversions) {
        console.log(`- Whopコンバージョン:`);
        console.log(`  - 保守的: ${forecastReport.whopConversions.daily.conservative}件/日`);
        console.log(`  - 中程度: ${forecastReport.whopConversions.daily.moderate}件/日`);
        console.log(`  - 楽観的: ${forecastReport.whopConversions.daily.optimistic}件/日`);
      }
    }

    // JSONファイルとしても保存
    const fs = require("fs");
    const reportData = {
      performance: performanceReport,
      forecast: forecastReport,
      generatedAt: new Date().toISOString()
    };

    const reportPath = `docs/24H_PERFORMANCE_REPORT_${new Date().toISOString().split("T")[0]}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\n✅ レポートを保存しました: ${reportPath}`);
  } catch (error) {
    console.error("❌ エラー:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  generate24hPerformanceReport,
  generateForecastReport
};
