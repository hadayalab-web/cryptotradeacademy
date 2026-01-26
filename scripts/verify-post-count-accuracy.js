// scripts/verify-post-count-accuracy.js
// 投稿数の正確性を検証するスクリプト

require("dotenv").config({ path: ".env" });
const kv = require("@vercel/kv").kv;

/**
 * 指定日の投稿数を検証
 */
async function verifyPostCount(dateString) {
  try {
    console.log(`\n🔍 Verifying post count for ${dateString}...\n`);

    // 1. KVから保存された投稿IDリストを取得
    const postsKey = `x:posts:${dateString}`;
    const savedPosts = await kv.get(postsKey);

    console.log("📊 Saved Posts from KV:");
    if (!savedPosts || !Array.isArray(savedPosts)) {
      console.log("  ❌ No posts found or invalid format");
      console.log(`  Type: ${typeof savedPosts}`);
      console.log(`  Value: ${JSON.stringify(savedPosts)}`);
      return;
    }

    console.log(`  Total saved posts: ${savedPosts.length}`);
    console.log(`  Post types breakdown:`);
    const typeCount = {};
    savedPosts.forEach((post) => {
      typeCount[post.postType] = (typeCount[post.postType] || 0) + 1;
    });
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`    - ${type}: ${count}`);
    });

    // 2. 各投稿の詳細を表示
    console.log(`\n📝 Post Details:`);
    savedPosts.forEach((post, idx) => {
      console.log(`  [${idx + 1}] ${post.postType} (${post.lang})`);
      console.log(`      Tweet ID: ${post.tweetId}`);
      console.log(`      Posted At: ${post.postedAt}`);
      if (post.metadata) {
        console.log(`      Metadata: ${JSON.stringify(post.metadata)}`);
      }
    });

    // 3. 実際のX APIから投稿の存在を確認（オプション）
    // 注意: これはX APIのレート制限に達する可能性があるため、コメントアウト
    // const { getTweetMetrics } = require('../services/x/metrics');
    // let verifiedCount = 0;
    // for (const post of savedPosts) {
    //   try {
    //     const metrics = await getTweetMetrics(post.tweetId, false);
    //     if (metrics) {
    //       verifiedCount++;
    //       console.log(`  ✅ Verified: ${post.tweetId}`);
    //     } else {
    //       console.log(`  ❌ Not found: ${post.tweetId}`);
    //     }
    //   } catch (error) {
    //     console.log(`  ⚠️  Error verifying ${post.tweetId}: ${error.message}`);
    //   }
    // }

    // 4. 日別投稿カウント（incrementDailyPostCount）と比較
    const countKey = `x:posts_count:${dateString}`;
    const dailyCount = await kv.get(countKey);
    console.log(`\n📈 Daily Post Count (from incrementDailyPostCount):`);
    console.log(`  Count: ${dailyCount || 0}`);
    console.log(`  Difference from saved posts: ${(dailyCount || 0) - savedPosts.length}`);

    // 5. メトリクスに記録されている投稿数と比較
    const metricsKey = `x:metrics:${dateString}`;
    const metrics = await kv.get(metricsKey);
    if (metrics && metrics.tweets) {
      console.log(`\n📊 Metrics Recorded Posts:`);
      console.log(`  Total tweets in metrics: ${metrics.tweets.length}`);
      console.log(`  Difference from saved posts: ${metrics.tweets.length - savedPosts.length}`);

      // メトリクスに記録されているが、保存された投稿リストにないもの
      const metricsTweetIds = new Set(metrics.tweets.map((t) => t.tweetId));
      const savedTweetIds = new Set(savedPosts.map((p) => p.tweetId));
      const missingInSaved = Array.from(metricsTweetIds).filter((id) => !savedTweetIds.has(id));
      const missingInMetrics = Array.from(savedTweetIds).filter((id) => !metricsTweetIds.has(id));

      if (missingInSaved.length > 0) {
        console.log(
          `  ⚠️  Tweet IDs in metrics but not in saved posts: ${missingInSaved.join(", ")}`
        );
      }
      if (missingInMetrics.length > 0) {
        console.log(
          `  ⚠️  Tweet IDs in saved posts but not in metrics: ${missingInMetrics.join(", ")}`
        );
      }
    }

    // 6. 結論
    console.log(`\n✅ Verification Summary:`);
    console.log(`  Saved posts count: ${savedPosts.length}`);
    console.log(`  Daily count: ${dailyCount || 0}`);
    if (metrics && metrics.tweets) {
      console.log(`  Metrics count: ${metrics.tweets.length}`);
    }

    // 不整合がある場合
    const inconsistencies = [];
    if ((dailyCount || 0) !== savedPosts.length) {
      inconsistencies.push(
        `Daily count (${dailyCount || 0}) != Saved posts (${savedPosts.length})`
      );
    }
    if (metrics && metrics.tweets && metrics.tweets.length !== savedPosts.length) {
      inconsistencies.push(
        `Metrics count (${metrics.tweets.length}) != Saved posts (${savedPosts.length})`
      );
    }

    if (inconsistencies.length > 0) {
      console.log(`\n❌ INCONSISTENCIES DETECTED:`);
      inconsistencies.forEach((inc) => console.log(`  - ${inc}`));
    } else {
      console.log(`\n✅ All counts are consistent!`);
    }
  } catch (error) {
    console.error("❌ Error verifying post count:", error.message);
    console.error(error.stack);
  }
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  const dateString = args[0] || new Date().toISOString().split("T")[0]; // デフォルトは今日

  console.log("🚀 Post Count Verification Script");
  console.log(`📅 Date: ${dateString}\n`);

  await verifyPostCount(dateString);

  // 過去数日間も確認（オプション）
  if (args[1] === "--last-n-days") {
    const days = parseInt(args[2]) || 7;
    console.log(`\n📅 Checking last ${days} days...\n`);
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const checkDate = date.toISOString().split("T")[0];
      await verifyPostCount(checkDate);
    }
  }
}

main().catch(console.error);
