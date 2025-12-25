// scripts/verify-endpoint-fixes.js
// エンドポイント修正の動作確認

require('dotenv').config();
const { fetchCryptoQuant } = require('../services/cryptoquant/client');

async function verify() {
  console.log('🔍 エンドポイント修正の動作確認\n');
  
  const tests = [
    {
      name: 'Exchange Whale Ratio',
      path: '/btc/flow-indicator/exchange-whale-ratio',
      params: { exchange: 'all_exchange', window: 'day', limit: 1 },
      field: 'exchange_whale_ratio',
    },
    {
      name: 'SOPR',
      path: '/btc/market-indicator/sopr',
      params: { window: 'day', limit: 1 },
      field: 'sopr',
    },
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}...`);
      const data = await fetchCryptoQuant(test.path, test.params);
      
      if (data && data.status && data.status.code === 200) {
        const value = data.result?.data?.[0]?.[test.field];
        if (value !== undefined) {
          console.log(`  ✅ SUCCESS: ${test.field} = ${value}\n`);
        } else {
          console.log(`  ⚠️  WARNING: Field '${test.field}' not found`);
          console.log(`  Available fields: ${Object.keys(data.result?.data?.[0] || {}).join(', ')}\n`);
          allPassed = false;
        }
      } else {
        console.log(`  ❌ FAILED: Invalid response\n`);
        allPassed = false;
      }
    } catch (err) {
      console.log(`  ❌ ERROR: ${err.message}\n`);
      allPassed = false;
    }
  }
  
  if (allPassed) {
    console.log('✅ すべてのエンドポイントが正常に動作しています！');
  } else {
    console.log('⚠️  一部のエンドポイントで問題が発生しました');
  }
}

verify().catch(console.error);

