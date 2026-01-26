// scripts/test-old-tweets-impressions.js
// 24時間以上経過した投稿のインプレッション数を確認

const { getPostsForLastNDays } = require('../services/x/postTracker');
const { getTweetMetrics } = require('../services/x/metrics');

async function testOldTweetsImpressions() {
  console.log('='.repeat(100));
  console.log('📊 24時間以上経過した投稿のインプレッション数を確認');
  console.log('='.repeat(100));
  console.log();

  try {
    const posts = await getPostsForLastNDays(7);
    console.log(`✅ 取得した投稿数: ${posts.length}件`);
    console.log();

    // 24時間以上経過した投稿をフィルタ
    const now = new Date();
    const oldPosts = posts.filter(p => {
      const postedAt = new Date(p.postedAt);
      const hoursAgo = (now - postedAt) / (1000 * 60 * 60);
      return hoursAgo >= 24;
    });

    console.log(`📅 24時間以上経過した投稿: ${oldPosts.length}件`);
    console.log();

    if (oldPosts.length === 0) {
      console.log('⚠️  24時間以上経過した投稿が見つかりませんでした');
      return;
    }

    // 最初の3件のインプレッション数を確認
    console.log('📊 最初の3件のインプレッション数を確認:');
    console.log();

    for (let i = 0; i < Math.min(3, oldPosts.length); i++) {
      const post = oldPosts[i];
      const postedAt = new Date(post.postedAt);
      const hoursAgo = ((now - postedAt) / (1000 * 60 * 60)).toFixed(1);

      console.log(`\n[${i + 1}] ツイートID: ${post.tweetId}`);
      console.log(`    投稿タイプ: ${post.postType}`);
      console.log(`    言語: ${post.lang}`);
      console.log(`    投稿日時: ${post.postedAt}`);
      console.log(`    経過時間: ${hoursAgo}時間前`);

      try {
        // 自分のツイートなので、non_public_metricsを含めて取得
        const metrics = await getTweetMetrics(post.tweetId, true);

        if (metrics) {
          const impressions = metrics.nonPublicMetrics?.impression_count || 
                             metrics.organicMetrics?.impression_count || 0;

          console.log(`    ✅ メトリクス取得成功`);
          console.log(`    Non-Public Metrics:`, JSON.stringify(metrics.nonPublicMetrics, null, 2));
          console.log(`    Organic Metrics:`, JSON.stringify(metrics.organicMetrics, null, 2));
          console.log(`    📊 インプレッション数: ${impressions.toLocaleString()}`);

          if (impressions > 0) {
            console.log(`    ✅ インプレッション情報が取得できました！`);
          } else {
            console.log(`    ⚠️  インプレッション数が0です（投稿から${hoursAgo}時間経過しているのに）`);
          }
        }

        // レート制限対策（1秒待機）
        if (i < Math.min(3, oldPosts.length) - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`    ❌ エラー: ${error.message}`);
      }
    }

    console.log();
    console.log('='.repeat(100));
    console.log('✅ 完了');
    console.log('='.repeat(100));

  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// 実行
testOldTweetsImpressions().catch(error => {
  console.error('❌ 実行エラー:', error);
  process.exit(1);
});
