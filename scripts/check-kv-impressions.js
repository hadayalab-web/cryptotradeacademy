// scripts/check-kv-impressions.js
// KVストレージから投稿データを取得し、インプレッション情報を確認

const { getPostsForLastNDays } = require('../services/x/postTracker');

async function checkKVImpressions() {
  console.log('='.repeat(100));
  console.log('📊 KVストレージからインプレッション情報を確認');
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

    // 投稿データの構造を確認
    console.log('📋 投稿データの構造を確認:');
    if (posts.length > 0) {
      console.log('\n最初の投稿データ:');
      console.log(JSON.stringify(posts[0], null, 2));
      console.log();
    }

    // インプレッション情報が含まれている投稿を探す
    let impressionsFound = 0;
    let totalImpressions = 0;
    const impressionsByType = {};
    const impressionsByLang = {};

    posts.forEach(post => {
      // メタデータにインプレッション情報が含まれているか確認
      const impressions = post.impressions || 
                          post.metrics?.impressions || 
                          post.metrics?.nonPublicMetrics?.impression_count ||
                          post.metrics?.organicMetrics?.impression_count ||
                          post.metadata?.impressions ||
                          0;

      if (impressions > 0) {
        impressionsFound++;
        totalImpressions += impressions;

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
    });

    console.log('='.repeat(100));
    console.log('📊 集計結果');
    console.log('='.repeat(100));
    console.log();

    if (impressionsFound > 0) {
      console.log(`✅ インプレッション情報が見つかった投稿: ${impressionsFound}件`);
      console.log(`✅ 総インプレッション数: ${totalImpressions.toLocaleString()}`);
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
    } else {
      console.log('⚠️  KVストレージの投稿データにインプレッション情報は含まれていません');
      console.log('💡 インプレッション情報はX APIから取得する必要があります');
      console.log();
    }

    // 全投稿のメタデータを確認
    console.log('📋 全投稿のメタデータキー:');
    const metadataKeys = new Set();
    posts.forEach(post => {
      if (post.metadata) {
        Object.keys(post.metadata).forEach(key => metadataKeys.add(key));
      }
      if (post.metrics) {
        Object.keys(post.metrics).forEach(key => metadataKeys.add(`metrics.${key}`));
      }
    });
    
    if (metadataKeys.size > 0) {
      console.log('   見つかったメタデータキー:');
      Array.from(metadataKeys).sort().forEach(key => {
        console.log(`   - ${key}`);
      });
    } else {
      console.log('   メタデータキーが見つかりませんでした');
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
checkKVImpressions().catch(error => {
  console.error('❌ 実行エラー:', error);
  process.exit(1);
});
