// scripts/test-endpoint-paths-extended.js
// CryptoQuant APIエンドポイントパスの詳細テスト

require('dotenv').config();
const { fetchCryptoQuant } = require('../services/cryptoquant/client');

const tests = [
  // Liquidations - 複数のパターンを試す
  { name: 'liquidations (flow-indicator)', path: '/btc/flow-indicator/liquidations', params: { window: 'day', limit: 1 } },
  { name: 'liquidations (derivatives-no-type)', path: '/btc/derivatives/liquidations', params: { window: 'day', limit: 1 } },
  { name: 'liquidations (market-data)', path: '/btc/market-data/liquidations', params: { window: 'day', limit: 1 } },
  { name: 'liquidations-total', path: '/btc/derivatives/liquidations-total', params: { window: 'day', limit: 1 } },
  
  // NUPL - 複数のパターンを試す
  { name: 'nupl (flow-indicator)', path: '/btc/flow-indicator/nupl', params: { window: 'day', limit: 1 } },
  { name: 'nupl (market-indicator)', path: '/btc/market-indicator/nupl', params: { window: 'day', limit: 1 } },
  { name: 'nupl (network-data)', path: '/btc/network-data/nupl', params: { window: 'day', limit: 1 } },
];

async function testEndpoint(test) {
  try {
    const data = await fetchCryptoQuant(test.path, test.params);
    
    if (data && data.status && data.status.code === 200 && data.result?.data?.[0]) {
      console.log(`\n✅ SUCCESS: ${test.name}`);
      console.log(`   Path: ${test.path}`);
      console.log(`   Response:`, JSON.stringify(data.result.data[0], null, 2));
      return { success: true, ...test, data: data.result.data[0] };
    }
    return { success: false, ...test };
  } catch (err) {
    // 404以外のエラーは表示
    if (!err.message.includes('404')) {
      console.log(`\n⚠️  ${test.name}: ${err.message}`);
    }
    return { success: false, ...test, error: err.message };
  }
}

async function runTests() {
  console.log('🔍 Testing additional CryptoQuant API endpoint patterns...\n');
  
  const results = [];
  
  for (const test of tests) {
    const result = await testEndpoint(test);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const successful = results.filter(r => r.success);
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Results');
  console.log(`${'='.repeat(60)}`);
  
  if (successful.length > 0) {
    console.log('\n✅ Working endpoints found:');
    successful.forEach(r => {
      console.log(`  ${r.name}`);
      console.log(`    Path: ${r.path}`);
      console.log(`    Fields: ${Object.keys(r.data).join(', ')}`);
    });
  } else {
    console.log('\n❌ No working endpoints found for these patterns.');
    console.log('   These endpoints may not exist or require different path structure.');
  }
}

runTests().catch(console.error);



