// scripts/test-kv-local.js
// ローカル環境からKVにアクセスするテストスクリプト

console.log('========================================');
console.log('ローカルKV接続テスト');
console.log('========================================\n');

// 環境変数の確認
console.log('📋 環境変数の確認:');
const envVars = {
  'KV_REST_API_URL': process.env.KV_REST_API_URL,
  'KV_REST_API_TOKEN': process.env.KV_REST_API_TOKEN,
  'KV_REST_API_READ_ONLY_TOKEN': process.env.KV_REST_API_READ_ONLY_TOKEN,
  'KV_URL': process.env.KV_URL,
  'REDIS_URL': process.env.REDIS_URL,
};

for (const [key, value] of Object.entries(envVars)) {
  if (value) {
    const displayValue = key.includes('TOKEN') 
      ? `${value.substring(0, 20)}...` 
      : value;
    console.log(`  ✅ ${key}: ${displayValue}`);
  } else {
    console.log(`  ❌ ${key}: 未設定`);
  }
}

console.log('');

// KV接続テスト
try {
  const { kv, isKVAvailable, testKVConnection } = require('../utils/kv');
  
  if (!isKVAvailable()) {
    console.error('❌ KVが利用できません');
    console.log('\n💡 環境変数を設定してください:');
    console.log('  バッチファイルを使用: scripts\\check-kv-with-env.bat');
    console.log('  または手動で環境変数を設定してください');
    process.exit(1);
  }

  console.log('✅ KVインスタンスが利用可能です\n');
  console.log('📡 KV接続テストを実行中...\n');

  testKVConnection().then(async (success) => {
    if (success) {
      console.log('✅ KV接続テスト成功\n');
      
      // 簡単な読み書きテスト
      console.log('🧪 読み書きテストを実行中...\n');
      const testKey = '__kv_local_test_' + Date.now();
      
      try {
        // 書き込み
        const writeResult = await kv.set(testKey, {
          message: 'ローカルからのテスト',
          timestamp: new Date().toISOString(),
        });
        console.log(`  ✅ 書き込み成功 (キー: ${testKey})`);
        
        // 読み込み
        const readResult = await kv.get(testKey);
        if (readResult) {
          console.log(`  ✅ 読み込み成功:`, JSON.stringify(readResult, null, 2));
        } else {
          console.log('  ⚠️  読み込み結果がnull');
        }
        
        // 削除
        const deleteResult = await kv.del(testKey);
        if (deleteResult) {
          console.log(`  ✅ 削除成功 (キー: ${testKey})`);
        }
        
        console.log('\n========================================');
        console.log('✅ ローカルKV接続テスト完了');
        console.log('========================================');
        console.log('\n💡 これでローカルからKVにアクセスできます！');
        console.log('   他のスクリプトも実行できます:');
        console.log('   - scripts\\check-kv-direct.bat');
        console.log('   - scripts\\check-kv-influencers.bat');
        
      } catch (error) {
        console.error('  ❌ 読み書きテストエラー:', error.message);
        console.error('  詳細:', error);
        process.exit(1);
      }
    } else {
      console.log('❌ KV接続テスト失敗');
      console.log('\n💡 確認事項:');
      console.log('  1. 環境変数が正しく設定されているか');
      console.log('  2. ネットワーク接続が正常か');
      console.log('  3. KVストアがUpstashで有効か');
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ KV接続テストエラー:', error.message);
    console.error('詳細:', error);
    process.exit(1);
  });

} catch (error) {
  console.error('❌ KVユーティリティの読み込みエラー:', error.message);
  console.error('詳細:', error);
  console.log('\n💡 @vercel/kvパッケージがインストールされているか確認してください:');
  console.log('   npm install @vercel/kv');
  process.exit(1);
}
