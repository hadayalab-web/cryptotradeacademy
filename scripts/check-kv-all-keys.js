// scripts/check-kv-all-keys.js
// KVに接続して、主要なキーを確認するスクリプト

const { kv, isKVAvailable } = require('../utils/kv');

async function checkAllKeys() {
  console.log('========================================');
  console.log('KV全キー確認');
  console.log('========================================\n');

  if (!isKVAvailable()) {
    console.error('❌ KVが利用できません');
    console.log('環境変数が設定されているか確認してください');
    process.exit(1);
  }

  console.log('✅ KV接続成功\n');

  // 確認するキーのリスト
  const keysToCheck = [
    // インフルエンサーストック関連
    'x:influencer_stock:en',
    'x:influencer_stock:es',
    'x:influencer_stock:pt-br',
    'x:influencer_stock:ar',
    'x:influencer_stock:ja',
    'x:influencer_stock:ko',
    'x:influencer_stock_update:en',
    'x:influencer_stock_update:es',
    'x:influencer_stock_update:pt-br',
    'x:influencer_stock_update:ar',
    'x:influencer_stock_update:ja',
    'x:influencer_stock_update:ko',
    // その他の主要キー
    'free_users',
    'state:EN',
    'state:AR',
    'state:KO',
    'state:JA',
    'state:ES',
    'state:PT-BR',
  ];

  console.log('📋 キー確認中...\n');

  const results = {
    found: [],
    notFound: [],
    errors: [],
  };

  for (const key of keysToCheck) {
    try {
      const value = await kv.get(key);
      if (value !== null) {
        const type = Array.isArray(value) ? `配列(${value.length}件)` : typeof value;
        const preview = Array.isArray(value) 
          ? `[${value.length}件]` 
          : typeof value === 'object' 
            ? JSON.stringify(value).substring(0, 50) + '...'
            : String(value).substring(0, 50);
        
        results.found.push({
          key,
          type,
          preview,
        });
        console.log(`  ✅ ${key}`);
        console.log(`     タイプ: ${type}, プレビュー: ${preview}`);
      } else {
        results.notFound.push(key);
        console.log(`  ⚠️  ${key} (存在しません)`);
      }
    } catch (error) {
      results.errors.push({ key, error: error.message });
      console.log(`  ❌ ${key} (エラー: ${error.message})`);
    }
  }

  console.log('\n========================================');
  console.log('📊 サマリー');
  console.log('========================================');
  console.log(`✅ 見つかったキー: ${results.found.length}件`);
  console.log(`⚠️  存在しないキー: ${results.notFound.length}件`);
  console.log(`❌ エラー: ${results.errors.length}件`);

  if (results.found.length > 0) {
    console.log('\n見つかったキー:');
    results.found.forEach(item => {
      console.log(`  - ${item.key} (${item.type})`);
    });
  }

  if (results.notFound.length > 0) {
    console.log('\n存在しないキー:');
    results.notFound.forEach(key => {
      console.log(`  - ${key}`);
    });
  }

  if (results.errors.length > 0) {
    console.log('\nエラーが発生したキー:');
    results.errors.forEach(item => {
      console.log(`  - ${item.key}: ${item.error}`);
    });
  }

  // 接続テスト（読み書き）
  console.log('\n========================================');
  console.log('🧪 接続テスト（読み書き）');
  console.log('========================================');
  
  const testKey = '__kv_test_' + Date.now();
  try {
    // 書き込み
    const writeResult = await kv.set(testKey, {
      test: 'data',
      timestamp: new Date().toISOString(),
      message: 'ローカルからの接続テスト',
    });
    console.log(`✅ 書き込み成功: ${testKey}`);

    // 読み込み
    const readValue = await kv.get(testKey);
    if (readValue) {
      console.log(`✅ 読み込み成功:`, JSON.stringify(readValue, null, 2));
    } else {
      console.log(`⚠️  読み込み結果がnull`);
    }

    // 削除
    const deleteResult = await kv.del(testKey);
    if (deleteResult) {
      console.log(`✅ 削除成功: ${testKey}`);
    }

    console.log('\n========================================');
    console.log('✅ KV接続確認完了');
    console.log('========================================');
    console.log('\n💡 ローカルからKVへの接続は正常に動作しています！');
  } catch (error) {
    console.error(`❌ 接続テストエラー:`, error.message);
    console.error('詳細:', error);
    process.exit(1);
  }
}

checkAllKeys().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
