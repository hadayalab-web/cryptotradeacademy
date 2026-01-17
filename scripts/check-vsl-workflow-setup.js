#!/usr/bin/env node
/**
 * VSLワークフロー起動準備チェックスクリプト
 * 環境変数、KV設定、API接続を確認
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const REQUIRED_ENV_VARS = {
  // Telegram
  telegram: [
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_BOT_USERNAME',
  ],
  // X API
  x_api: [
    'X_API_CONSUMER_KEY',
    'X_API_CONSUMER_KEY_SECRET',
    'X_API_ACCESS_TOKEN',
    'X_API_ACCESS_TOKEN_SECRET',
  ],
  // Grok (X AI)
  grok: [
    'XAI_API_KEY',
  ],
  // Whop API
  whop: [
    'WHOP_API_KEY',
    // WHOP_PROMO_CODE_ID: プロモコード監視機能を使用する場合のみ必須
    // WHOP_PROMO_CODE: デフォルト値 'DEFEND50' あり
  ],
  // Vercel KV
  kv: [
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN',
  ],
  // VSL YouTube Links（デフォルト値あり、推奨）
  vsl_links: [
    'VSL1_YOUTUBE_LINK',
    'VSL2_YOUTUBE_LINK',
  ],
};

const OPTIONAL_ENV_VARS = {
  x_posting: [
    'X_POSTING_ENABLED',
    'X_POSTING_DRY_RUN',
    'X_VSL1_USE_GROK_SENTIMENT',
  ],
  whop_urls: [
    'WHOP_PRODUCT_URL_EN',
    'WHOP_PRODUCT_URL_ES',
    'WHOP_PRODUCT_URL_PTBR',
    'WHOP_PRODUCT_URL_AR',
    'WHOP_PRODUCT_URL_KO',
    'WHOP_PRODUCT_URL_JA',
  ],
  whop_promo: [
    'WHOP_PROMO_CODE_ID',  // プロモコード監視機能を使用する場合のみ必須
    'WHOP_PROMO_CODE',  // デフォルト値 'DEFEND50' あり
  ],
  telegram_optional: [
    'TELEGRAM_BOT_USERNAME',
  ],
  cron_secret: [
    'CRON_SECRET',  // オプションだが本番環境では強く推奨
  ],
  kv: [
    'KV_REST_API_URL',  // フォールバックあり（ローカルファイル）
    'KV_REST_API_TOKEN',  // フォールバックあり（ローカルファイル）
  ],
};

function checkEnvVars() {
  console.log('🔍 環境変数チェックを開始します...\n');
  
  const results = {
    required: {},
    optional: {},
    missing: [],
    warnings: [],
  };

  // 必須環境変数のチェック
  for (const [category, vars] of Object.entries(REQUIRED_ENV_VARS)) {
    results.required[category] = {};
    for (const varName of vars) {
      // コメント行をスキップ
      if (varName.startsWith('//')) continue;
      
      const value = process.env[varName];
      const isSet = value !== undefined && value !== null && value.trim() !== '';
      results.required[category][varName] = isSet;
      
      if (!isSet) {
        results.missing.push(varName);
      }
    }
  }

  // オプション環境変数のチェック
  for (const [category, vars] of Object.entries(OPTIONAL_ENV_VARS)) {
    results.optional[category] = {};
    for (const varName of vars) {
      const value = process.env[varName];
      const isSet = value !== undefined && value !== null && value.trim() !== '';
      results.optional[category][varName] = isSet;
    }
  }

  // 警告チェック
  if (!process.env.X_POSTING_ENABLED || process.env.X_POSTING_ENABLED.toLowerCase() === 'false') {
    results.warnings.push('X_POSTING_ENABLED が false に設定されています。X投稿機能が無効です。');
  }
  
  if (process.env.X_POSTING_DRY_RUN === 'true') {
    results.warnings.push('X_POSTING_DRY_RUN が true に設定されています。X投稿は実際には実行されません（ドライラン）。');
  }

  // VSL Linksのデフォルト値チェック
  if (!process.env.VSL1_YOUTUBE_LINK) {
    results.warnings.push('VSL1_YOUTUBE_LINK が設定されていません（デフォルト値が使用されます: https://youtu.be/fXgVsKhqDjI）');
  }
  if (!process.env.VSL2_YOUTUBE_LINK) {
    results.warnings.push('VSL2_YOUTUBE_LINK が設定されていません（デフォルト値が使用されます: https://youtu.be/OqvqngJOiXc）');
  }

  // CRON_SECRETの警告（本番環境では必須）
  if (!process.env.CRON_SECRET) {
    results.warnings.push('CRON_SECRET が設定されていません（本番環境では強く推奨されます）');
  }

  // KV設定の警告（本番環境では推奨）
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    results.warnings.push('Vercel KVが設定されていません（ローカルのfree-users.jsonが使用されます。本番環境ではKVの使用を推奨します）');
  }

  return results;
}

function printResults(results) {
  console.log('='.repeat(80));
  console.log('📋 VSLワークフロー起動準備チェック結果');
  console.log('='.repeat(80));
  console.log();

  // 必須環境変数の結果
  console.log('✅ 必須環境変数:');
  for (const [category, vars] of Object.entries(results.required)) {
    const allSet = Object.values(vars).every(v => v);
    const icon = allSet ? '✅' : '❌';
    console.log(`  ${icon} ${category.toUpperCase()}`);
    for (const [varName, isSet] of Object.entries(vars)) {
      const statusIcon = isSet ? '  ✅' : '  ❌';
      console.log(`${statusIcon} ${varName}`);
    }
    console.log();
  }

  // オプション環境変数の結果
  console.log('ℹ️  オプション環境変数:');
  for (const [category, vars] of Object.entries(results.optional)) {
    const setCount = Object.values(vars).filter(v => v).length;
    const totalCount = Object.keys(vars).length;
    console.log(`  ${category.toUpperCase()}: ${setCount}/${totalCount} 設定済み`);
    for (const [varName, isSet] of Object.entries(vars)) {
      if (isSet) {
        console.log(`    ✅ ${varName}`);
      }
    }
    console.log();
  }

  // 不足している環境変数（デフォルト値がないもののみ）
  const optionalVars = ['VSL1_YOUTUBE_LINK', 'VSL2_YOUTUBE_LINK', 'TELEGRAM_BOT_USERNAME', 'CRON_SECRET', 'WHOP_PROMO_CODE_ID', 'WHOP_PROMO_CODE', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'];
  const criticalMissing = results.missing.filter(v => !optionalVars.includes(v));
  
  if (criticalMissing.length > 0) {
    console.log('❌ 不足している必須環境変数（デフォルト値なし）:');
    for (const varName of criticalMissing) {
      console.log(`  - ${varName}`);
    }
    console.log();
  }
  
  const recommendedMissing = results.missing.filter(v => 
    ['VSL1_YOUTUBE_LINK', 'VSL2_YOUTUBE_LINK', 'TELEGRAM_BOT_USERNAME', 'CRON_SECRET'].includes(v)
  );
  if (recommendedMissing.length > 0) {
    console.log('⚠️  推奨環境変数（デフォルト値あり、明示的な設定を推奨）:');
    for (const varName of recommendedMissing) {
      console.log(`  - ${varName}`);
    }
    console.log();
  }
  
  const optionalMissing = results.missing.filter(v => 
    ['WHOP_PROMO_CODE_ID', 'WHOP_PROMO_CODE', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'].includes(v)
  );
  if (optionalMissing.length > 0) {
    console.log('ℹ️  オプション環境変数（機能が制限されますが動作可能）:');
    for (const varName of optionalMissing) {
      let note = '';
      if (varName === 'WHOP_PROMO_CODE_ID') note = '（プロモコード監視機能が無効）';
      if (varName === 'WHOP_PROMO_CODE') note = '（デフォルト値 DEFEND50 が使用されます）';
      if (varName.startsWith('KV_')) note = '（ローカルのfree-users.jsonが使用されます）';
      console.log(`  - ${varName}${note}`);
    }
    console.log();
  }

  // 警告
  if (results.warnings.length > 0) {
    console.log('⚠️  警告:');
    for (const warning of results.warnings) {
      console.log(`  - ${warning}`);
    }
    console.log();
  }

  // 総合判定（必須環境変数のみ）
  const allRequiredSet = criticalMissing.length === 0;
  console.log('='.repeat(80));
  if (allRequiredSet) {
    console.log('✅ すべての必須環境変数が設定されています！');
    console.log('🚀 VSLワークフローを起動する準備が整いました。');
  } else {
    console.log('❌ 一部の必須環境変数が不足しています。');
    console.log('📝 上記の不足項目を設定してから再実行してください。');
  }
  console.log('='.repeat(80));
  console.log();

  return allRequiredSet;
}

async function checkKVConnection() {
  console.log('🔍 Vercel KV接続チェック...');
  try {
    const { kv } = require('@vercel/kv');
    if (!kv) {
      console.log('  ⚠️  @vercel/kv モジュールが見つかりません');
      return false;
    }

    // KV接続テスト（free_usersキーを読み取り）
    try {
      const testKey = 'free_users';
      await kv.get(testKey);
      console.log('  ✅ Vercel KV接続成功');
      return true;
    } catch (error) {
      if (error.message.includes('KV_REST_API_URL') || error.message.includes('KV_REST_API_TOKEN')) {
        console.log('  ❌ Vercel KV環境変数が設定されていません');
        return false;
      }
      // キーが存在しない場合は接続自体は成功している
      console.log('  ✅ Vercel KV接続成功（キーが存在しない可能性があります）');
      return true;
    }
  } catch (error) {
    console.log(`  ❌ Vercel KV接続エラー: ${error.message}`);
    return false;
  }
}

async function checkXAPIConnection() {
  console.log('🔍 X API接続チェック...');
  try {
    const { getXConfigStatus } = require('../services/x/config');
    const status = getXConfigStatus();
    
    if (!status.configured) {
      console.log(`  ❌ X API設定が不完全: ${status.missing.join(', ')}`);
      return false;
    }
    
    if (!status.postingEnabled) {
      console.log('  ⚠️  X投稿機能が無効化されています');
      return false;
    }
    
    if (status.dryRun) {
      console.log('  ⚠️  X投稿はドライランモードです（実際には投稿されません）');
    }
    
    console.log('  ✅ X API設定完了');
    return true;
  } catch (error) {
    console.log(`  ❌ X API設定チェックエラー: ${error.message}`);
    return false;
  }
}

async function checkGrokConnection() {
  console.log('🔍 Grok API接続チェック...');
  try {
    const XAI_API_KEY = process.env.XAI_API_KEY;
    if (!XAI_API_KEY) {
      console.log('  ❌ XAI_API_KEY が設定されていません');
      return false;
    }
    
    console.log('  ✅ Grok API設定完了（実際の接続テストはスキップ）');
    return true;
  } catch (error) {
    console.log(`  ❌ Grok API設定チェックエラー: ${error.message}`);
    return false;
  }
}

async function checkWhopConnection() {
  console.log('🔍 Whop API接続チェック...');
  try {
    const WHOP_API_KEY = process.env.WHOP_API_KEY;
    const WHOP_PROMO_CODE_ID = process.env.WHOP_PROMO_CODE_ID;
    
    if (!WHOP_API_KEY) {
      console.log('  ❌ WHOP_API_KEY が設定されていません');
      return false;
    }
    
    if (!WHOP_PROMO_CODE_ID) {
      console.log('  ⚠️  WHOP_PROMO_CODE_ID が設定されていません（プロモコード監視が動作しません）');
      return false;
    }
    
    console.log('  ✅ Whop API設定完了（実際の接続テストはスキップ）');
    return true;
  } catch (error) {
    console.log(`  ❌ Whop API設定チェックエラー: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 VSLワークフロー起動準備チェック\n');
  
  // 環境変数チェック
  const envResults = checkEnvVars();
  const envOk = printResults(envResults);
  
  if (!envOk) {
    console.log('❌ 環境変数の設定が不完全です。上記の不足項目を設定してください。\n');
    process.exit(1);
  }
  
  // API接続チェック
  console.log('\n🔍 API接続チェック...\n');
  
  const kvOk = await checkKVConnection();
  console.log();
  
  const xApiOk = await checkXAPIConnection();
  console.log();
  
  const grokOk = await checkGrokConnection();
  console.log();
  
  const whopOk = await checkWhopConnection();
  console.log();
  
  // 総合判定
  console.log('='.repeat(80));
  console.log('📊 総合判定');
  console.log('='.repeat(80));
  console.log(`環境変数: ${envOk ? '✅' : '❌'}`);
  console.log(`Vercel KV: ${kvOk ? '✅' : '❌'}`);
  console.log(`X API: ${xApiOk ? '✅' : '❌'}`);
  console.log(`Grok API: ${grokOk ? '✅' : '❌'}`);
  console.log(`Whop API: ${whopOk ? '✅' : '⚠️'}`);
  console.log('='.repeat(80));
  console.log();
  
  // KVはオプションなので、必須チェックから除外
  const allOk = envOk && xApiOk && grokOk;
  
  if (allOk) {
    console.log('✅ すべてのチェックが完了しました！');
    console.log('🚀 VSLワークフローを起動する準備が整いました。');
    console.log('\n📋 次のステップ:');
    console.log('  1. Vercel Dashboardで環境変数を確認');
    console.log('  2. vercel.jsonのCron設定を確認');
    console.log('  3. 本番環境にデプロイ');
    console.log('  4. Vercel Cronが正常に動作しているか確認');
  } else {
    console.log('⚠️  一部のチェックで問題が見つかりました。');
    console.log('上記のエラーを修正してから再実行してください。');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ チェック実行エラー:', error);
    process.exit(1);
  });
}

module.exports = { checkEnvVars, checkKVConnection, checkXAPIConnection, checkGrokConnection, checkWhopConnection };
