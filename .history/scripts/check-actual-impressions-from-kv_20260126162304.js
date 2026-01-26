// scripts/check-actual-impressions-from-kv.js
// KVストレージから実際のX APIから取得したインプレッション数を確認

let kv = null;
try {
  const kvModule = require("@vercel/kv");
  kv = kvModule.kv;
} catch (error) {
  console.error("❌ @vercel/kv not available:", error.message);
  process.exit(1);
}

const { getDailyEngagementMetrics } = require("../api/x-engagement-metrics");
const { getPostsForLastNDays } = require("../services/x/postTracker");

async function checkActualImpressions() {
  console.log("=".repeat(80));
  console.log("📊 実際のX APIから取得したインプレッション数を確認");
  console.log("=".repeat(80));
  console.log();

  try {
    // 過去7日間の投稿を取得
    const posts = await getPostsForLastNDays(7);
    console.log(`📝 過去7日間の投稿数: ${posts.length}件`);
    console.log();

    // 日付別にグループ化
    const postsByDate = {};
    for (const post of posts) {
      const dateString = post.postedAt.split("T")[0];
      if (!postsByDate[dateString]) {
        postsByDate[dateString] = [];
      }
      postsByDate[dateString].push(post);
    }

    // 各日付の実際のインプレッション数を確認
    let totalActualImpressions = 0;
    let totalEstimatedImpressions = 0;
    let totalEngagements = 0;

    for (const [dateString, datePosts] of Object.entries(postsByDate)) {
      console.log(`📅 ${dateString}`);
      console.log(`   投稿数: ${datePosts.length}件`);

      // 実際のX APIから取得したメトリクスを取得
      const metrics = await getDailyEngagementMetrics(dateString);

      if (metrics) {
        console.log(
          `   ✅ 実際のX APIから取得したインプレッション数: ${metrics.totalImpressions.toLocaleString()}`
        );
        console.log(`   ✅ 実際のエンゲージメント数: ${metrics.totalEngagements.toLocaleString()}`);

        if (metrics.totalImpressions > 0) {
          const actualEngagementRate = (metrics.totalEngagements / metrics.totalImpressions) * 100;
          console.log(`   ✅ 実際のエンゲージメント率: ${actualEngagementRate.toFixed(3)}%`);
        }

        totalActualImpressions += metrics.totalImpressions;
        totalEngagements += metrics.totalEngagements;

        // 各ツイートの詳細を表示
        console.log(`   📊 ツイート別メトリクス:`);
        for (const tweet of metrics.tweets) {
          const tweetEngagementRate =
            tweet.impressions > 0 ? (tweet.engagements / tweet.impressions) * 100 : 0;
          console.log(`      - Tweet ID: ${tweet.tweetId}`);
          console.log(`        インプレッション: ${(tweet.impressions || 0).toLocaleString()}`);
          console.log(`        エンゲージメント: ${(tweet.engagements || 0).toLocaleString()}`);
          console.log(`        エンゲージメント率: ${tweetEngagementRate.toFixed(3)}%`);
          console.log(`        言語: ${tweet.lang || "N/A"}`);
          console.log(`        ソース: ${tweet.source || "N/A"}`);
          if (tweet.influencerUsername) {
            console.log(`        インフルエンサー: @${tweet.influencerUsername}`);
          }
          console.log();
        }
      } else {
        console.log(`   ⚠️  メトリクスデータが見つかりません`);
      }

      // 推定インプレッション数（Grokの推定値）を計算
      let estimatedImpressions = 0;
      for (const post of datePosts) {
        if (post.metadata?.estimatedImpressions) {
          estimatedImpressions += post.metadata.estimatedImpressions;
        }
      }
      if (estimatedImpressions > 0) {
        console.log(`   📊 Grokの推定インプレッション数: ${estimatedImpressions.toLocaleString()}`);
        totalEstimatedImpressions += estimatedImpressions;
      }

      console.log();
    }

    // サマリー
    console.log("=".repeat(80));
    console.log("📊 サマリー");
    console.log("=".repeat(80));
    console.log(
      `実際のX APIから取得したインプレッション数: ${totalActualImpressions.toLocaleString()}`
    );
    console.log(`Grokの推定インプレッション数: ${totalEstimatedImpressions.toLocaleString()}`);
    console.log(`実際のエンゲージメント数: ${totalEngagements.toLocaleString()}`);

    if (totalActualImpressions > 0) {
      const actualEngagementRate = (totalEngagements / totalActualImpressions) * 100;
      console.log(`実際のエンゲージメント率: ${actualEngagementRate.toFixed(3)}%`);
    }

    if (totalEstimatedImpressions > 0 && totalActualImpressions > 0) {
      const difference = totalEstimatedImpressions - totalActualImpressions;
      const differencePercent = (difference / totalEstimatedImpressions) * 100;
      console.log();
      console.log(`📊 推定値と実際の値の差:`);
      console.log(`   差: ${difference.toLocaleString()} (${differencePercent.toFixed(1)}%)`);
    }

    console.log();
    console.log("=".repeat(80));
    console.log("✅ 確認完了");
    console.log("=".repeat(80));
  } catch (error) {
    console.error("❌ エラー:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

// 実行
checkActualImpressions().catch((error) => {
  console.error("❌ 実行エラー:", error);
  process.exit(1);
});
