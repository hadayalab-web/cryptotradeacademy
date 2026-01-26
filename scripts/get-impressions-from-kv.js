// scripts/get-impressions-from-kv.js
// KVストレージから投稿IDを取得し、インプレッション数を集計

const { getPostsForLastNDays } = require('../services/x/postTracker');
const { getTweetMetrics } = require('../services/x/metrics');

async function getImpressionsFromKV() {
  console.log('='.repeat(100));
  console.log('📊 KVストレージからインプレッション数を取得');
  console.log('='.repeat(100));
  console.log();

  try {
    // 過去7日間の投稿を取得
    const days = parseInt(process.argv[2]) || 7;
    console.log(`📅 過去${days}日間の投稿を取得中...`);
    
    const posts = await getPostsForLastNDays(days);
    console.log(`✅ 取得した投稿数: ${posts.length}件`);
    console.log();

    if (posts.length === 0) {
      console.log('⚠️  投稿が見つかりませんでした');
      return;
    }

    // 投稿タイプ別に集計
    const byType = {};
    posts.forEach(post => {
      const type = post.postType || 'unknown';
      if (!byType[type]) {
        byType[type] = [];
      }
      byType[type].push(post);
    });

    console.log('📋 投稿タイプ別内訳:');
    for (const [type, typePosts] of Object.entries(byType)) {
      console.log(`   ${type}: ${typePosts.length}件`);
    }
    console.log();

    // 各投稿のメトリクスを取得
    console.log('📊 メトリクス取得中...');
    console.log('⚠️  注意: X APIのレート制限により、時間がかかる場合があります');
    console.log();

    let totalImpressions = 0;
    let successCount = 0;
    let failureCount = 0;
    const impressionsByType = {};
    const impressionsByLang = {};

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const tweetId = post.tweetId;
      
      try {
        // 自分のツイートなので、non_public_metricsを含めて取得
        const metrics = await getTweetMetrics(tweetId, true);
        
        if (metrics) {
          const impressions = metrics.nonPublicMetrics?.impression_count || 
                             metrics.organicMetrics?.impression_count || 0;
          
          if (impressions > 0) {
            totalImpressions += impressions;
            successCount++;

            // タイプ別集計
            const type = post.postType || 'unknown';
            if (!impressionsByType[type]) {
              impressionsByType[type] = 0;
            }
            impressionsByType[type] += impressions;

            // 言語別集計
            const lang = post.lang || 'unknown';
            if (!impressionsByLang[lang]) {
              impressionsByLang[lang] = 0;
            }
            impressionsByLang[lang] += impressions;

            console.log(`✅ [${i + 1}/${posts.length}] ${tweetId}: ${impressions.toLocaleString()} impressions (${type}, ${lang})`);
          } else {
            console.log(`⚠️  [${i + 1}/${posts.length}] ${tweetId}: インプレッション情報なし`);
          }
        } else {
          failureCount++;
          console.log(`❌ [${i + 1}/${posts.length}] ${tweetId}: メトリクス取得失敗`);
        }

        // レート制限対策（1秒待機）
        if (i < posts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        failureCount++;
        console.error(`❌ [${i + 1}/${posts.length}] ${tweetId}: エラー - ${error.message}`);
      }
    }

    console.log();
    console.log('='.repeat(100));
    console.log('📊 集計結果');
    console.log('='.repeat(100));
    console.log();
    console.log(`✅ 総インプレッション数: ${totalImpressions.toLocaleString()}`);
    console.log(`✅ 成功: ${successCount}件`);
    console.log(`❌ 失敗: ${failureCount}件`);
    console.log();

    if (Object.keys(impressionsByType).length > 0) {
      console.log('📋 投稿タイプ別インプレッション数:');
      for (const [type, impressions] of Object.entries(impressionsByType).sort((a, b) => b[1] - a[1])) {
        console.log(`   ${type}: ${impressions.toLocaleString()}`);
      }
      console.log();
    }

    if (Object.keys(impressionsByLang).length > 0) {
      console.log('🌍 言語別インプレッション数:');
      for (const [lang, impressions] of Object.entries(impressionsByLang).sort((a, b) => b[1] - a[1])) {
        console.log(`   ${lang}: ${impressions.toLocaleString()}`);
      }
      console.log();
    }

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
getImpressionsFromKV().catch(error => {
  console.error('❌ 実行エラー:', error);
  process.exit(1);
});
