// scripts/check-metrics-accuracy.js
// メトリクス取得の精度を確認するスクリプト

let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[Check Metrics] @vercel/kv not available:', error.message);
}

/**
 * 日付文字列を取得（YYYY-MM-DD）
 */
function getDateString(date = new Date()) {
  return date.toISOString().split('T')[0];
}

/**
 * メトリクスの精度を確認
 */
async function checkMetricsAccuracy() {
  if (!kv) {
    console.error('❌ KV storage not available');
    return;
  }

  console.log('🔍 メトリクス取得精度の確認を開始...\n');

  // 今日と昨日のメトリクスを確認
  const today = getDateString();
  const yesterday = getDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));

  console.log(`📅 確認対象日: ${today} (今日), ${yesterday} (昨日)\n`);

  for (const dateString of [today, yesterday]) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 ${dateString} のメトリクス`);
    console.log('='.repeat(80));

    try {
      // メトリクスを取得
      const metricsKey = `x:metrics:${dateString}`;
      const metrics = await kv.get(metricsKey);

      if (!metrics) {
        console.log(`⚠️ メトリクスが見つかりません: ${metricsKey}`);
        continue;
      }

      // ダッシュボードを取得
      const dashboardKey = `x:dashboard:${dateString}`;
      const dashboard = await kv.get(dashboardKey);

      console.log(`\n📈 サマリー:`);
      console.log(`  - 投稿数: ${metrics.tweets?.length || 0}`);
      console.log(`  - 総インプレッション: ${(metrics.totalImpressions || 0).toLocaleString()}`);
      console.log(`  - 総エンゲージメント: ${(metrics.totalEngagements || 0).toLocaleString()}`);
      console.log(`  - 総クリック数: ${(metrics.totalClicks || 0).toLocaleString()}`);

      if (metrics.totalImpressions > 0) {
        const engagementRate = (metrics.totalEngagements / metrics.totalImpressions) * 100;
        const clickRate = (metrics.totalClicks / metrics.totalImpressions) * 100;
        console.log(`\n📊 レート:`);
        console.log(`  - エンゲージメント率: ${engagementRate.toFixed(3)}%`);
        console.log(`  - クリック率: ${clickRate.toFixed(3)}%`);
      }

      // データソースの確認
      console.log(`\n🔍 データソースの確認:`);
      const tweetsWithActualData = metrics.tweets?.filter(t => 
        t.dataSource?.impressions === 'x_api_actual'
      ) || [];
      const tweetsWithEstimatedData = metrics.tweets?.filter(t => 
        t.dataSource?.estimatedImpressions && t.dataSource?.estimatedSource
      ) || [];

      console.log(`  - 実測値データ: ${tweetsWithActualData.length}件`);
      console.log(`  - 推定値データ: ${tweetsWithEstimatedData.length}件`);

      // インプレッション数が0のツイートを確認
      const tweetsWithZeroImpressions = metrics.tweets?.filter(t => 
        t.impressions === 0
      ) || [];
      
      if (tweetsWithZeroImpressions.length > 0) {
        console.log(`\n⚠️ インプレッション数が0のツイート: ${tweetsWithZeroImpressions.length}件`);
        
        // 投稿から経過時間を確認
        const { getPostsForDate } = require('../services/x/postTracker');
        const posts = await getPostsForDate(dateString);
        const postsMap = new Map(posts.map(p => [p.tweetId, p]));

        for (const tweet of tweetsWithZeroImpressions.slice(0, 5)) {
          const post = postsMap.get(tweet.tweetId);
          if (post) {
            const postTime = new Date(post.postedAt);
            const now = new Date();
            const minutesSincePost = (now - postTime) / (1000 * 60);
            console.log(`  - Tweet ${tweet.tweetId}: ${minutesSincePost.toFixed(1)}分前 (${minutesSincePost < 10 ? '正常' : '要確認'})`);
          }
        }
      }

      // ダッシュボードの確認
      if (dashboard) {
        console.log(`\n📊 ダッシュボード:`);
        console.log(`  - 生成時刻: ${dashboard.generatedAt || 'N/A'}`);
        if (dashboard.rates) {
          console.log(`  - エンゲージメント率: ${dashboard.rates.engagementRate}%`);
          console.log(`  - クリック率: ${dashboard.rates.clickRate}%`);
        }
      }

      // 最新の5件のツイートを表示
      if (metrics.tweets && metrics.tweets.length > 0) {
        console.log(`\n📝 最新の5件のツイート:`);
        const recentTweets = metrics.tweets.slice(-5);
        for (const tweet of recentTweets) {
          const engagementRate = tweet.impressions > 0 
            ? ((tweet.engagements / tweet.impressions) * 100).toFixed(3)
            : 'N/A';
          console.log(`  - Tweet ${tweet.tweetId}:`);
          console.log(`    - インプレッション: ${(tweet.impressions || 0).toLocaleString()}`);
          console.log(`    - エンゲージメント: ${(tweet.engagements || 0).toLocaleString()} (${engagementRate}%)`);
          console.log(`    - クリック: ${(tweet.clicks || 0).toLocaleString()}`);
          console.log(`    - データソース: ${tweet.dataSource?.impressions || 'N/A'}`);
          if (tweet.dataSource?.estimatedImpressions) {
            console.log(`    - 推定インプレッション: ${tweet.dataSource.estimatedImpressions.toLocaleString()} (${tweet.dataSource.estimatedSource || 'N/A'})`);
          }
        }
      }

    } catch (error) {
      console.error(`❌ エラー: ${error.message}`);
      console.error(error.stack);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ 確認完了');
  console.log('='.repeat(80));
}

// 実行
if (require.main === module) {
  checkMetricsAccuracy()
    .then(() => {
      console.log('\n✅ 確認完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ エラー:', error.message);
      process.exit(1);
    });
}

module.exports = { checkMetricsAccuracy };
