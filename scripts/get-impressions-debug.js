// scripts/get-impressions-debug.js
// KVストレージから投稿IDを取得し、インプレッション数を集計（デバッグ版）

const { getPostsForLastNDays } = require('../services/x/postTracker');
const { getTweetMetrics } = require('../services/x/metrics');

async function getImpressionsDebug() {
  console.log('='.repeat(100));
  console.log('📊 KVストレージからインプレッション数を取得（デバッグ版）');
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

    // 最初の3件のメトリクスを詳細に確認
    console.log('📊 最初の3件のメトリクスを詳細確認:');
    console.log();

    let totalImpressions = 0;
    let successCount = 0;
    const impressionsByType = {};
    const impressionsByLang = {};

    for (let i = 0; i < Math.min(3, posts.length); i++) {
      const post = posts[i];
      const tweetId = post.tweetId;
      
      console.log(`\n[${i + 1}] ツイートID: ${tweetId}`);
      console.log(`    投稿タイプ: ${post.postType}`);
      console.log(`    言語: ${post.lang}`);
      console.log(`    投稿日時: ${post.postedAt}`);
      
      try {
        // 自分のツイートなので、non_public_metricsを含めて取得
        const metrics = await getTweetMetrics(tweetId, true);
        
        if (metrics) {
          console.log(`    ✅ メトリクス取得成功`);
          console.log(`    Public Metrics:`, JSON.stringify(metrics.publicMetrics, null, 2));
          console.log(`    Non-Public Metrics:`, JSON.stringify(metrics.nonPublicMetrics, null, 2));
          console.log(`    Organic Metrics:`, JSON.stringify(metrics.organicMetrics, null, 2));
          
          const impressions = metrics.nonPublicMetrics?.impression_count || 
                             metrics.organicMetrics?.impression_count || 0;
          
          console.log(`    📊 インプレッション数: ${impressions.toLocaleString()}`);
          
          if (impressions > 0) {
            totalImpressions += impressions;
            successCount++;

            const type = post.postType || 'unknown';
            if (!impressionsByType[type]) {
              impressionsByType[type] = 0;
            }
            impressionsByType[type] += impressions;

            const lang = post.lang || 'unknown';
            if (!impressionsByLang[lang]) {
              impressionsByLang[lang] = 0;
            }
            impressionsByLang[lang] += impressions;
          }
        } else {
          console.log(`    ❌ メトリクス取得失敗`);
        }

        // レート制限対策（1秒待機）
        if (i < Math.min(3, posts.length) - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`    ❌ エラー: ${error.message}`);
      }
    }

    // 残りの投稿も処理
    console.log('\n' + '='.repeat(100));
    console.log('📊 残りの投稿を処理中...');
    console.log('='.repeat(100));
    console.log();

    for (let i = 3; i < posts.length; i++) {
      const post = posts[i];
      const tweetId = post.tweetId;
      
      try {
        const metrics = await getTweetMetrics(tweetId, true);
        
        if (metrics) {
          const impressions = metrics.nonPublicMetrics?.impression_count || 
                             metrics.organicMetrics?.impression_count || 0;
          
          if (impressions > 0) {
            totalImpressions += impressions;
            successCount++;

            const type = post.postType || 'unknown';
            if (!impressionsByType[type]) {
              impressionsByType[type] = 0;
            }
            impressionsByType[type] += impressions;

            const lang = post.lang || 'unknown';
            if (!impressionsByLang[lang]) {
              impressionsByLang[lang] = 0;
            }
            impressionsByLang[lang] += impressions;

            console.log(`✅ [${i + 1}/${posts.length}] ${tweetId}: ${impressions.toLocaleString()} impressions (${type}, ${lang})`);
          }
        }

        // レート制限対策（1秒待機）
        if (i < posts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`❌ [${i + 1}/${posts.length}] ${tweetId}: エラー - ${error.message}`);
      }
    }

    console.log();
    console.log('='.repeat(100));
    console.log('📊 集計結果');
    console.log('='.repeat(100));
    console.log();
    console.log(`✅ 総インプレッション数: ${totalImpressions.toLocaleString()}`);
    console.log(`✅ インプレッション情報あり: ${successCount}件`);
    console.log(`📋 総投稿数: ${posts.length}件`);
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
getImpressionsDebug().catch(error => {
  console.error('❌ 実行エラー:', error);
  process.exit(1);
});
