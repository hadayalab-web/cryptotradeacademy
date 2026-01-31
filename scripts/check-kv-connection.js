// scripts/check-kv-connection.js
// KV接続を確認するスクリプト

console.log('========================================');
console.log('KV接続確認');
console.log('========================================\n');

// 環境変数の確認
console.log('📋 環境変数の確認:');
console.log(`  KV_REST_API_URL: ${process.env.KV_REST_API_URL ? '✅ 設定済み' : '❌ 未設定'}`);
console.log(`  KV_URL: ${process.env.KV_URL ? '✅ 設定済み' : '❌ 未設定'}`);
console.log(`  KV_REST_API_TOKEN: ${process.env.KV_REST_API_TOKEN ? '✅ 設定済み' : '❌ 未設定'}`);

if (process.env.KV_REST_API_URL) {
  console.log(`  KV_REST_API_URLの値: ${process.env.KV_REST_API_URL.substring(0, 50)}...`);
}
if (process.env.KV_URL) {
  console.log(`  KV_URLの値: ${process.env.KV_URL.substring(0, 50)}...`);
}

console.log('');

// @vercel/kvモジュールの確認
console.log('📦 @vercel/kvモジュールの確認:');
try {
  const kvModule = require('@vercel/kv');
  console.log('  ✅ @vercel/kvモジュールが見つかりました');
  console.log(`  kvオブジェクト: ${typeof kvModule.kv}`);
} catch (error) {
  console.log(`  ❌ @vercel/kvモジュールが見つかりません: ${error.message}`);
  console.log('  💡 npm install @vercel/kv を実行してください');
}

console.log('');

// KVユーティリティの確認
console.log('🔧 KVユーティリティの確認:');
try {
  const { kv, isKVAvailable, testKVConnection } = require('../utils/kv');
  
  console.log(`  KVインスタンス: ${kv ? '✅ 存在' : '❌ null'}`);
  console.log(`  KV利用可能: ${isKVAvailable() ? '✅ はい' : '❌ いいえ'}`);
  
  if (isKVAvailable()) {
    console.log('\n📡 KV接続テストを実行中...');
    testKVConnection().then(success => {
      if (success) {
        console.log('  ✅ KV接続テスト成功');
        
        // テストキーで読み書きテスト
        console.log('\n🧪 読み書きテストを実行中...');
        const testKey = '__kv_test_' + Date.now();
        kv.set(testKey, { test: 'data', timestamp: new Date().toISOString() })
          .then(() => {
            console.log(`  ✅ 書き込み成功 (キー: ${testKey})`);
            return kv.get(testKey);
          })
          .then(data => {
            if (data) {
              console.log(`  ✅ 読み込み成功:`, JSON.stringify(data));
              return kv.del(testKey);
            } else {
              console.log('  ⚠️  読み込み結果がnull');
            }
          })
          .then(() => {
            console.log(`  ✅ 削除成功 (キー: ${testKey})`);
            console.log('\n========================================');
            console.log('✅ KV接続確認完了');
            console.log('========================================');
          })
          .catch(error => {
            console.error('  ❌ 読み書きテストエラー:', error.message);
            console.log('\n========================================');
            console.log('❌ KV接続確認失敗');
            console.log('========================================');
            process.exit(1);
          });
      } else {
        console.log('  ❌ KV接続テスト失敗');
        console.log('\n========================================');
        console.log('❌ KV接続確認失敗');
        console.log('========================================');
        console.log('\n💡 確認事項:');
        console.log('  1. 環境変数 KV_REST_API_URL または KV_URL が設定されているか');
        console.log('  2. 環境変数 KV_REST_API_TOKEN が設定されているか');
        console.log('  3. Vercel DashboardでKVストアが作成されているか');
        console.log('  4. ネットワーク接続が正常か');
        process.exit(1);
      }
    }).catch(error => {
      console.error('  ❌ KV接続テストエラー:', error.message);
      console.log('\n========================================');
      console.log('❌ KV接続確認失敗');
      console.log('========================================');
      process.exit(1);
    });
  } else {
    console.log('\n========================================');
    console.log('❌ KVが利用できません');
    console.log('========================================');
    console.log('\n💡 確認事項:');
    console.log('  1. 環境変数 KV_REST_API_URL または KV_URL が設定されているか');
    console.log('  2. 環境変数 KV_REST_API_TOKEN が設定されているか');
    console.log('  3. @vercel/kvパッケージがインストールされているか (npm install @vercel/kv)');
    console.log('  4. Vercel DashboardでKVストアが作成されているか');
    process.exit(1);
  }
} catch (error) {
  console.error('  ❌ KVユーティリティの読み込みエラー:', error.message);
  console.log('\n========================================');
  console.log('❌ KV接続確認失敗');
  console.log('========================================');
  process.exit(1);
}
