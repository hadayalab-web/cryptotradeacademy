// scripts/test-endpoint-paths.js
// CryptoQuant APIエンドポイントパスのパターンをテスト

require('dotenv').config();
const { fetchCryptoQuant } = require('../services/cryptoquant/client');

const tests = [
  // Liquidations
  { name: 'liquidations-long (current)', path: '/derivatives/liquidations-long/btc', params: { window: 'day', limit: 1 } },
  { name: 'liquidations-long (btc prefix)', path: '/btc/derivatives/liquidations-long', params: { window: 'day', limit: 1 } },
  { name: 'liquidations-short (current)', path: '/derivatives/liquidations-short/btc', params: { window: 'day', limit: 1 } },
  { name: 'liquidations-short (btc prefix)', path: '/btc/derivatives/liquidations-short', params: { window: 'day', limit: 1 } },

  // NUPL
  { name: 'nupl (current)', path: '/utxo-data/nupl/btc', params: { window: 'day', limit: 1 } },
  { name: 'nupl (btc prefix)', path: '/btc/utxo-data/nupl', params: { window: 'day', limit: 1 } },

  // SOPR
  { name: 'sopr (current)', path: '/market-indicator/sopr/btc', params: { window: 'day', limit: 1 } },
  { name: 'sopr (btc prefix)', path: '/btc/market-indicator/sopr', params: { window: 'day', limit: 1 } },
];

async function testEndpoint(test) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${test.name}`);
  console.log(`Path: ${test.path}`);
  console.log(`Params:`, JSON.stringify(test.params, null, 2));
  console.log(`${'='.repeat(60)}`);

  try {
    const data = await fetchCryptoQuant(test.path, test.params);

    if (data && data.status && data.status.code === 200) {
      console.log('✅ SUCCESS!');
      console.log('Response structure:');
      console.log(JSON.stringify(data.result?.data?.[0], null, 2));
      return { success: true, path: test.path, data };
    } else {
      console.log('❌ Failed: No data or invalid response');
      return { success: false, path: test.path, error: 'No data' };
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
    return { success: false, path: test.path, error: err.message };
  }
}

async function runTests() {
  console.log('🔍 Testing CryptoQuant API endpoint path patterns...\n');

  const results = [];

  for (const test of tests) {
    const result = await testEndpoint(test);
    results.push(result);

    // APIレート制限を考慮して待機
    await new Promise(resolve => setTimeout(resolve, 500));

    // 成功したら、同じカテゴリの他のテストをスキップ
    if (result.success) {
      console.log(`\n✅ Found working path for ${test.name.split(' ')[0]}`);
    }
  }

  // サマリー
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Test Summary');
  console.log(`${'='.repeat(60)}`);

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  if (successful.length > 0) {
    console.log('\n✅ Working paths:');
    successful.forEach(r => console.log(`  - ${r.path}`));
  }

  console.log('\n❌ Failed paths:');
  failed.forEach(r => console.log(`  - ${r.path}: ${r.error}`));
}

runTests().catch(console.error);







