// scripts/get-kv-metrics-direct.js
// KVストレージから直接実際のX APIメトリクスを取得

let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.error('❌ @vercel/kv not available:', error.message);
  console.error('💡 環境変数が設定されているか確認してください:');
  console.error('   - KV_REST_API_URL');
  console.error('   - KV_REST_API_TOKEN');
  process.exit(1);
}

async function getKVMetrics() {
  console.log('='.repeat(80));
  console.log('📊 KVストレージから実際のX APIメトリクスを取得');
  console.log('='.repeat(80));
  console.log();

  try {
    // 過去7日間の日付を生成
    const dates = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    console.log(`📅 確認する日付: ${dates.join(', ')}`);
    console.log();

    let totalImpressions = 0;
    let totalEngagements = 0;
    let totalTweets = 0;

    for (const dateString of dates) {
      const key = `x:metrics:${dateString}`;
      console.log(`🔍 ${dateString}: キー "${key}" を確認中...`);

      try {
        const metrics = await kv.get(key);

        if (metrics) {
          console.log(`   ✅ データが見つかりました`);
          console.log(`   📊 ツイート数: ${metrics.tweets?.length || 0}件`);
          console.log(`   📊 総インプレッション数: ${(metrics.totalImpressions || 0).toLocaleString()}`);
          console.log(`   📊 総エンゲージメント数: ${(metrics.totalEngagements || 0).toLocaleString()}`);

          if (metrics.totalImpressions > 0) {
            const engagementRate = (metrics.totalEngagements / metrics.totalImpressions) * 100;
            console.log(`   📊 エンゲージメント率: ${engagementRate.toFixed(3)}%`);
          }

          // 各ツイートの詳細を表示
          if (metrics.tweets && metrics.tweets.length > 0) {
            console.log(`   📝 ツイート詳細:`);
            for (const tweet of metrics.tweets.slice(0, 5)) {
              const tweetEngagementRate = tweet.impressions > 0
                ? (tweet.engagements / tweet.impressions) * 100
                : 0;
              console.log(`      - Tweet ID: ${tweet.tweetId}`);
              console.log(`        インプレッション: ${(tweet.impressions || 0).toLocaleString()}`);
              console.log(`        エンゲージメント: ${(tweet.engagements || 0).toLocaleString()}`);
              console.log(`        エンゲージメント率: ${tweetEngagementRate.toFixed(3)}%`);
              console.log(`        言語: ${tweet.lang || 'N/A'}`);
              console.log(`        ソース: ${tweet.source || 'N/A'}`);
              if (tweet.influencerUsername) {
                console.log(`        インフルエンサー: @${tweet.influencerUsername}`);
              }
              console.log();
            }
            if (metrics.tweets.length > 5) {
              console.log(`      ... 他 ${metrics.tweets.length - 5}件`);
            }
          }

          totalImpressions += metrics.totalImpressions || 0;
          totalEngagements += metrics.totalEngagements || 0;
          totalTweets += metrics.tweets?.length || 0;
        } else {
          console.log(`   ⚠️  データが見つかりませんでした`);
        }
      } catch (error) {
        console.error(`   ❌ エラー: ${error.message}`);
      }

      console.log();
    }

    // サマリー
    console.log('='.repeat(80));
    console.log('📊 サマリー（過去7日間）');
    console.log('='.repeat(80));
    console.log(`総ツイート数: ${totalTweets}件`);
    console.log(`総インプレッション数: ${totalImpressions.toLocaleString()}`);
    console.log(`総エンゲージメント数: ${totalEngagements.toLocaleString()}`);

    if (totalImpressions > 0) {
      const engagementRate = (totalEngagements / totalImpressions) * 100;
      console.log(`エンゲージメント率: ${engagementRate.toFixed(3)}%`);
    } else {
      console.log(`⚠️  インプレッション数が0のため、エンゲージメント率を計算できません`);
    }

    console.log();
    console.log('='.repeat(80));
    console.log('✅ 取得完了');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// 実行
getKVMetrics().catch(error => {
  console.error('❌ 実行エラー:', error);
  process.exit(1);
});
