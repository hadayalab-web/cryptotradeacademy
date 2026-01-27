// scripts/test-kv-connection.js
// KV接続をテストするスクリプト

require('dotenv').config();
const { kv, isKVAvailable, testKVConnection } = require('../utils/kv');

async function testKV() {
  console.log('🔍 KV接続テスト');
  console.log('='.repeat(80));
  console.log(`実行日時: ${new Date().toISOString()}\n`);

  // 1. KVが利用可能かチェック
  console.log('1️⃣ KV利用可能性チェック');
  const available = isKVAvailable();
  console.log(`   ${available ? '✅' : '❌'} KV is ${available ? 'available' : 'not available'}\n`);

  if (!available) {
    console.log('⚠️  KVが利用できません。環境変数を確認してください:');
    console.log('   - KV_REST_API_URL');
    console.log('   - KV_REST_API_TOKEN');
    console.log('   - KV_URL (代替)');
    process.exit(1);
  }

  // 2. 接続テスト
  console.log('2️⃣ KV接続テスト');
  const connected = await testKVConnection();
  console.log(`   ${connected ? '✅' : '❌'} Connection ${connected ? 'successful' : 'failed'}\n`);

  if (!connected) {
    console.log('⚠️  KV接続に失敗しました。環境変数とネットワーク接続を確認してください。');
    process.exit(1);
  }

  // 3. 基本的な操作テスト
  console.log('3️⃣ 基本的な操作テスト');
  
  const testKey = `kv_test_${Date.now()}`;
  const testValue = { message: 'Hello KV', timestamp: new Date().toISOString() };

  try {
    // SET
    console.log(`   📝 Setting key: ${testKey}`);
    const setResult = await kv.set(testKey, testValue, { ex: 60 }); // 60秒TTL
    console.log(`   ${setResult ? '✅' : '❌'} SET ${setResult ? 'successful' : 'failed'}`);

    // GET
    console.log(`   📖 Getting key: ${testKey}`);
    const getValue = await kv.get(testKey);
    console.log(`   ${getValue ? '✅' : '❌'} GET ${getValue ? 'successful' : 'failed'}`);
    if (getValue) {
      console.log(`   Value: ${JSON.stringify(getValue, null, 2)}`);
    }

    // EXISTS
    console.log(`   🔍 Checking existence: ${testKey}`);
    const exists = await kv.exists(testKey);
    console.log(`   ${exists ? '✅' : '❌'} EXISTS ${exists ? 'true' : 'false'}`);

    // TTL
    console.log(`   ⏰ Getting TTL: ${testKey}`);
    const ttl = await kv.ttl(testKey);
    console.log(`   ${ttl !== null ? '✅' : '❌'} TTL: ${ttl !== null ? `${ttl}s` : 'N/A'}`);

    // INCR
    const counterKey = `${testKey}_counter`;
    console.log(`   🔢 Incrementing counter: ${counterKey}`);
    const counterValue = await kv.incr(counterKey, 1);
    console.log(`   ${counterValue !== null ? '✅' : '❌'} INCR ${counterValue !== null ? `successful (value: ${counterValue})` : 'failed'}`);

    // DEL
    console.log(`   🗑️  Deleting key: ${testKey}`);
    const delResult = await kv.del(testKey);
    console.log(`   ${delResult ? '✅' : '❌'} DEL ${delResult ? 'successful' : 'failed'}`);

    // Counter cleanup
    await kv.del(counterKey);

    console.log('\n   ✅ すべての操作が成功しました！\n');
  } catch (error) {
    console.error(`\n   ❌ エラーが発生しました: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    process.exit(1);
  }

  // 4. 環境変数の確認
  console.log('4️⃣ 環境変数確認');
  const envVars = {
    'KV_REST_API_URL': process.env.KV_REST_API_URL ? '✅ Set' : '❌ Not set',
    'KV_REST_API_TOKEN': process.env.KV_REST_API_TOKEN ? '✅ Set' : '❌ Not set',
    'KV_URL': process.env.KV_URL ? '✅ Set' : '⚠️  Not set (optional)',
  };

  Object.entries(envVars).forEach(([key, status]) => {
    console.log(`   ${key}: ${status}`);
  });

  console.log('\n✅ KV接続テスト完了');
  console.log('='.repeat(80));
}

// 実行
if (require.main === module) {
  testKV()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ テスト実行エラー:', error);
      process.exit(1);
    });
}

module.exports = { testKV };
