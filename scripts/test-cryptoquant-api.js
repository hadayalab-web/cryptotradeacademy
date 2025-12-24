// scripts/test-cryptoquant-api.js
// CryptoQuant API検証スクリプト
//
// 使用方法:
//   node scripts/test-cryptoquant-api.js [--endpoint=<endpoint>]
//
// 例:
//   node scripts/test-cryptoquant-api.js
//   node scripts/test-cryptoquant-api.js --endpoint=whale-ratio

// Load environment variables from .env file
require('dotenv').config();

const { fetchCryptoQuant } = require('../services/cryptoquant/client');

// 検証するエンドポイントの定義
const ENDPOINTS = {
  'whale-ratio': {
    endpoint: '/btc/flow-indicator/exchange-whale-ratio',
    params: { exchange: 'all_exchange', window: 'day', limit: 1 },
    description: 'Exchange Whale Ratio (EN market)',
  },
  'liquidations-long': {
    endpoint: '/derivatives/liquidations-long/btc',
    params: { window: 'day', limit: 1 },
    description: 'Long Liquidations',
  },
  'liquidations-short': {
    endpoint: '/derivatives/liquidations-short/btc',
    params: { window: 'day', limit: 1 },
    description: 'Short Liquidations',
  },
  'nupl': {
    endpoint: '/utxo-data/nupl/btc',
    params: { window: 'day', limit: 1 },
    description: 'NUPL (Network Unrealized Profit/Loss)',
  },
  'sopr': {
    endpoint: '/market-indicator/sopr/btc',
    params: { window: 'day', limit: 1 },
    description: 'SOPR (Spent Output Profit Ratio)',
  },
  'sopr-30d': {
    endpoint: '/market-indicator/sopr/btc',
    params: { window: 'day', limit: 30 },
    description: 'SOPR 30-day data (for MA calculation)',
  },
  'upbit-inflow': {
    endpoint: '/btc/exchange-flows/inflow',
    params: { exchange: 'upbit', window: 'day', limit: 1 },
    description: 'Upbit Inflow (KO market)',
  },
  'binance-inflow': {
    endpoint: '/btc/exchange-flows/inflow',
    params: { exchange: 'binance', window: 'day', limit: 1 },
    description: 'Binance Inflow',
  },
};

/**
 * エンドポイントをテストする
 */
async function testEndpoint(name, config) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 Testing: ${name}`);
  console.log(`📋 Description: ${config.description}`);
  console.log(`📍 Endpoint: ${config.endpoint}`);
  console.log(`📊 Params:`, JSON.stringify(config.params, null, 2));
  console.log(`${'='.repeat(60)}`);

  try {
    const startTime = Date.now();
    const data = await fetchCryptoQuant(config.endpoint, config.params);
    const duration = Date.now() - startTime;

    if (!data) {
      console.log('❌ Response: null (API key might be missing or invalid)');
      return { success: false, error: 'No response data' };
    }

    console.log(`✅ Response received (${duration}ms)`);
    console.log(`📦 Response structure:`);
    console.log(JSON.stringify(data, null, 2));

    // レスポンス構造の検証
    const structure = {
      hasResult: !!data.result,
      hasData: !!data.result?.data,
      hasArray: Array.isArray(data.result?.data),
      firstItem: data.result?.data?.[0],
      value: data.result?.data?.[0]?.value,
    };

    console.log(`\n📐 Structure analysis:`);
    console.log(`  - Has 'result': ${structure.hasResult}`);
    console.log(`  - Has 'result.data': ${structure.hasData}`);
    console.log(`  - 'result.data' is array: ${structure.hasArray}`);
    console.log(`  - First item:`, structure.firstItem);
    console.log(`  - Value: ${structure.value}`);

    return {
      success: true,
      data,
      structure,
      duration,
    };
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(`Stack:`, error.stack);
    return {
      success: false,
      error: error.message,
      stack: error.stack,
    };
  }
}

/**
 * すべてのエンドポイントをテスト
 */
async function testAllEndpoints() {
  console.log('🚀 Starting CryptoQuant API verification...\n');

  if (!process.env.CRYPTOQUANT_API_KEY) {
    console.error('❌ CRYPTOQUANT_API_KEY is not set in environment variables');
    console.error('Please set it in .env.local or as an environment variable');
    process.exit(1);
  }

  const results = {};
  let successCount = 0;
  let failCount = 0;

  for (const [name, config] of Object.entries(ENDPOINTS)) {
    const result = await testEndpoint(name, config);
    results[name] = result;

    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }

    // APIレート制限を考慮して少し待機
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // サマリー
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Verification Summary');
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📈 Total: ${successCount + failCount}`);

  // 失敗したエンドポイントの詳細
  if (failCount > 0) {
    console.log(`\n❌ Failed endpoints:`);
    for (const [name, result] of Object.entries(results)) {
      if (!result.success) {
        console.log(`  - ${name}: ${result.error}`);
      }
    }
  }

  return results;
}

/**
 * 特定のエンドポイントをテスト
 */
async function testSingleEndpoint(endpointName) {
  const config = ENDPOINTS[endpointName];
  if (!config) {
    console.error(`❌ Unknown endpoint: ${endpointName}`);
    console.log(`Available endpoints: ${Object.keys(ENDPOINTS).join(', ')}`);
    process.exit(1);
  }

  const result = await testEndpoint(endpointName, config);
  return result;
}

// メイン実行
const args = process.argv.slice(2);
const endpointArg = args.find(arg => arg.startsWith('--endpoint='));
const endpointName = endpointArg ? endpointArg.split('=')[1] : null;

if (endpointName) {
  testSingleEndpoint(endpointName)
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
} else {
  testAllEndpoints()
    .then(results => {
      const hasFailures = Object.values(results).some(r => !r.success);
      process.exit(hasFailures ? 1 : 0);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

