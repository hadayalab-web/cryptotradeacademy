// scripts/check-kv-hardcoded.js
// KV接続確認スクリプト（環境変数を直接設定）

// 環境変数を直接設定（バッチファイルの環境変数がNode.jsに伝わらない問題を回避）
process.env.KV_REST_API_URL = 'https://genuine-stork-35682.upstash.io';
process.env.KV_REST_API_TOKEN = 'AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI';
process.env.KV_REST_API_READ_ONLY_TOKEN = 'AotiAAIgcDE1X4iRkRRJB4nbs9u_WKXO4e3LAV9o8X7a2ZGDQwIcZw';
process.env.KV_URL = 'rediss://default:AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI@genuine-stork-35682.upstash.io:6379';
process.env.REDIS_URL = 'rediss://default:AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI@genuine-stork-35682.upstash.io:6379';

console.log('========================================');
console.log('KV接続確認（環境変数直接設定）');
console.log('========================================\n');

// 環境変数の確認
console.log('📋 環境変数の確認:');
console.log(`  KV_REST_API_URL: ${process.env.KV_REST_API_URL ? '✅ 設定済み' : '❌ 未設定'}`);
console.log(`  KV_REST_API_TOKEN: ${process.env.KV_REST_API_TOKEN ? '✅ 設定済み' : '❌ 未設定'}`);
if (process.env.KV_REST_API_URL) {
  console.log(`  URL: ${process.env.KV_REST_API_URL}`);
}

console.log('');

// @vercel/kvモジュールの確認
console.log('📦 @vercel/kvモジュールの確認:');
try {
  const kvModule = require('@vercel/kv');
  console.log('  ✅ @vercel/kvモジュールが見つかりました');
  console.log(`  kvオブジェクト: ${typeof kvModule.kv}`);
  
  // KVインスタンスを直接取得
  const kvInstance = kvModule.kv;
  console.log(`  KVインスタンス: ${kvInstance ? '✅ 存在' : '❌ null'}`);
  
  if (kvInstance) {
    console.log('\n📡 KV接続テストを実行中...');
    
    // テストキーで読み書きテスト
    const testKey = '__kv_test_' + Date.now();
    console.log(`  テストキー: ${testKey}`);
    
    kvInstance.set(testKey, { test: 'data', timestamp: new Date().toISOString() })
      .then(() => {
        console.log('  ✅ 書き込み成功');
        return kvInstance.get(testKey);
      })
      .then(data => {
        if (data) {
          console.log(`  ✅ 読み込み成功:`, JSON.stringify(data));
          return kvInstance.del(testKey);
        } else {
          console.log('  ⚠️  読み込み結果がnull');
        }
      })
      .then(() => {
        console.log('  ✅ 削除成功');
        
        // インフルエンサーストックを確認
        console.log('\n📋 インフルエンサーストックを確認中...');
        const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
        const promises = SUPPORTED_LANGS.map(async (lang) => {
          const stockKey = `x:influencer_stock:${lang}`;
          const influencers = await kvInstance.get(stockKey);
          const count = Array.isArray(influencers) ? influencers.length : 0;
          return { lang, count, influencers };
        });
        
        Promise.all(promises).then(results => {
          console.log('\n========================================');
          console.log('📊 インフルエンサーストック状況');
          console.log('========================================');
          let total = 0;
          for (const result of results) {
            const status = result.count > 0 ? '✅' : '⚠️';
            console.log(`${status} ${result.lang}: ${result.count}人`);
            total += result.count;
          }
          console.log(`\n総インフルエンサー数: ${total}人`);
          
          if (total > 0) {
            console.log('\n✅ KV接続成功！インフルエンサーストックが見つかりました');
          } else {
            console.log('\n⚠️  KV接続は成功しましたが、インフルエンサーストックが空です');
          }
          
          console.log('\n========================================');
          console.log('✅ 確認完了');
          console.log('========================================');
        }).catch(error => {
          console.error('  ❌ ストック確認エラー:', error.message);
          console.error('  スタック:', error.stack);
        });
      })
      .catch(error => {
        console.error('  ❌ KV接続テストエラー:', error.message);
        console.error('  スタック:', error.stack);
        console.log('\n========================================');
        console.log('❌ KV接続確認失敗');
        console.log('========================================');
        process.exit(1);
      });
  } else {
    console.log('  ❌ KVインスタンスがnullです');
    console.log('\n💡 確認事項:');
    console.log('  1. 環境変数 KV_REST_API_URL が正しく設定されているか');
    console.log('  2. 環境変数 KV_REST_API_TOKEN が正しく設定されているか');
    process.exit(1);
  }
} catch (error) {
  console.log(`  ❌ @vercel/kvモジュールが見つかりません: ${error.message}`);
  console.log('  💡 npm install @vercel/kv を実行してください');
  console.error('  スタック:', error.stack);
  process.exit(1);
}
