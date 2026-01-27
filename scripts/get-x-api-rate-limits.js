// scripts/get-x-api-rate-limits.js
// X APIレート制限情報を取得・表示するスクリプト

require('dotenv').config({ path: '.env' });

const {
  getRateLimitConfig,
  getAllRateLimitStatuses,
  getRateLimit,
  getRateLimitStatus,
  saveRateLimitConfig,
} = require('../services/x/rateLimitTracker');

/**
 * レート制限情報を表示
 */
async function displayRateLimits() {
  console.log('='.repeat(80));
  console.log('📊 X APIレート制限情報');
  console.log('='.repeat(80));
  console.log('');

  // レート制限設定をKVに保存（初回実行時）
  console.log('💾 レート制限設定をKVに保存中...');
  await saveRateLimitConfig();
  console.log('');

  // レート制限設定を取得
  console.log('📋 レート制限設定（公式ドキュメント参照）:');
  console.log('');
  const config = await getRateLimitConfig();
  
  // 主要なエンドポイントを表示
  const mainEndpoints = [
    { category: 'posts', endpoint: 'POST /2/tweets', authType: 'user' },
    { category: 'posts', endpoint: 'GET /2/tweets/:id', authType: 'user' },
    { category: 'posts', endpoint: 'GET /2/users/:id/tweets', authType: 'user' },
    { category: 'media', endpoint: 'POST /2/media/upload', authType: 'user' },
  ];

  for (const { category, endpoint, authType } of mainEndpoints) {
    if (config[category] && config[category][endpoint]) {
      const endpointConfig = config[category][endpoint];
      const authConfig = authType === 'app' ? endpointConfig.perApp : endpointConfig.perUser;
      
      if (authConfig) {
        console.log(`  ${endpoint} (${authType}):`);
        console.log(`    制限: ${authConfig.limit}リクエスト/${authConfig.window}`);
        console.log('');
      }
    }
  }

  // 現在のレート制限ステータスを取得
  console.log('📊 現在のレート制限ステータス（KVから取得）:');
  console.log('');
  
  const statuses = await getAllRateLimitStatuses();
  
  if (statuses.length === 0) {
    console.log('  ⚠️  レート制限情報がまだ記録されていません');
    console.log('  💡 X APIリクエストを実行すると、自動的に記録されます');
    console.log('');
  } else {
    for (const status of statuses) {
      console.log(`  ${status.endpoint} (${status.authType}):`);
      console.log(`    制限: ${status.limit}リクエスト`);
      console.log(`    残り: ${status.remaining}リクエスト`);
      console.log(`    リセット時刻: ${status.resetTime}`);
      console.log(`    制限中: ${status.isLimited ? '❌ はい' : '✅ いいえ'}`);
      console.log(`    最終更新: ${status.lastUpdated}`);
      console.log('');
    }
  }

  // 主要なエンドポイントの詳細情報を取得
  console.log('🔍 主要エンドポイントの詳細情報:');
  console.log('');
  
  for (const { endpoint, authType } of mainEndpoints) {
    const rateLimit = await getRateLimit(endpoint, authType);
    const status = await getRateLimitStatus(endpoint, authType);
    
    if (rateLimit || status) {
      console.log(`  ${endpoint} (${authType}):`);
      
      if (rateLimit) {
        console.log(`    KV記録: ✅`);
        console.log(`    制限: ${rateLimit.limit}リクエスト/${rateLimit.window}`);
        console.log(`    残り: ${rateLimit.remaining}リクエスト`);
        console.log(`    リセット: ${new Date(rateLimit.reset * 1000).toISOString()}`);
        console.log(`    最終更新: ${rateLimit.lastUpdated}`);
      } else {
        console.log(`    KV記録: ❌ 未記録`);
      }
      
      console.log('');
    }
  }

  console.log('='.repeat(80));
}

/**
 * JSON形式で出力
 */
async function displayRateLimitsJson() {
  const config = await getRateLimitConfig();
  const statuses = await getAllRateLimitStatuses();
  
  const result = {
    config,
    statuses,
    timestamp: new Date().toISOString(),
  };
  
  console.log(JSON.stringify(result, null, 2));
}

/**
 * メイン関数
 */
async function main() {
  const args = process.argv.slice(2);
  const isJson = args.includes('--json');
  
  try {
    if (isJson) {
      await displayRateLimitsJson();
    } else {
      await displayRateLimits();
    }
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { displayRateLimits, displayRateLimitsJson };
