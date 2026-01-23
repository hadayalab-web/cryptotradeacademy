// scripts/diagnose-x-posting.js
// X投稿機能の診断スクリプト

const { getXConfigStatus } = require('../services/x/config');

async function diagnoseXPosting() {
  console.log('='.repeat(80));
  console.log('🔍 X投稿機能診断');
  console.log('='.repeat(80));
  console.log('');

  // 1. X API設定確認
  console.log('1️⃣ X API設定確認:');
  const xStatus = getXConfigStatus();
  console.log(`   Configured: ${xStatus.configured ? '✅' : '❌'}`);
  console.log(`   Posting Enabled: ${xStatus.postingEnabled ? '✅' : '❌'}`);
  console.log(`   Dry Run: ${xStatus.dryRun ? '⚠️ 有効（テストモード）' : '✅ 無効（本番モード）'}`);
  if (xStatus.missing && xStatus.missing.length > 0) {
    console.log(`   Missing Keys: ❌ ${xStatus.missing.join(', ')}`);
  }
  console.log('');

  // 2. KVストレージ確認
  console.log('2️⃣ KVストレージ確認:');
  let kv = null;
  try {
    const kvModule = require('@vercel/kv');
    kv = kvModule.kv;
    if (kv) {
      console.log('   ✅ @vercel/kv module loaded');
      // テスト接続
      try {
        const testKey = 'x:diagnostic:test';
        await kv.set(testKey, 'test', { ex: 60 });
        const testValue = await kv.get(testKey);
        if (testValue === 'test') {
          console.log('   ✅ KVストレージ接続成功');
          await kv.del(testKey);
        } else {
          console.log('   ⚠️ KVストレージ接続は成功したが、読み書きに問題があります');
        }
      } catch (error) {
        console.log(`   ❌ KVストレージ接続エラー: ${error.message}`);
      }
    } else {
      console.log('   ❌ @vercel/kv module not available');
    }
  } catch (error) {
    console.log(`   ❌ @vercel/kv module not found: ${error.message}`);
  }
  console.log('');

  // 3. Grok API確認
  console.log('3️⃣ Grok API確認:');
  const xaiApiKey = process.env.XAI_API_KEY;
  if (xaiApiKey) {
    console.log('   ✅ XAI_API_KEY設定済み');
    console.log(`   Key preview: ${xaiApiKey.substring(0, 10)}...`);
  } else {
    console.log('   ❌ XAI_API_KEY未設定 - インフルエンサー発掘が機能しません');
  }
  console.log('');

  // 4. Cron設定確認
  console.log('4️⃣ Cron設定確認:');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    console.log('   ✅ CRON_SECRET設定済み');
  } else {
    console.log('   ⚠️ CRON_SECRET未設定 - Cronジョブが実行されない可能性があります');
  }
  console.log('');

  // 5. 環境変数確認
  console.log('5️⃣ その他の環境変数確認:');
  const requiredEnvVars = [
    'X_API_CONSUMER_KEY',
    'X_API_CONSUMER_KEY_SECRET',
    'X_API_ACCESS_TOKEN',
    'X_API_ACCESS_TOKEN_SECRET',
    'X_POSTING_ENABLED',
    'X_POSTING_DRY_RUN',
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN',
  ];
  
  const optionalEnvVars = [
    'XAI_API_KEY',
    'CRON_SECRET',
  ];

  console.log('   必須環境変数:');
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    const status = value ? '✅' : '❌';
    const displayValue = value ? (value.length > 20 ? `${value.substring(0, 20)}...` : value) : '未設定';
    console.log(`     ${status} ${envVar}: ${displayValue}`);
  }

  console.log('   オプション環境変数:');
  for (const envVar of optionalEnvVars) {
    const value = process.env[envVar];
    const status = value ? '✅' : '⚠️';
    const displayValue = value ? (value.length > 20 ? `${value.substring(0, 20)}...` : value) : '未設定';
    console.log(`     ${status} ${envVar}: ${displayValue}`);
  }
  console.log('');

  // 6. 診断結果サマリー
  console.log('='.repeat(80));
  console.log('📊 診断結果サマリー');
  console.log('='.repeat(80));
  
  const issues = [];
  if (!xStatus.configured) {
    issues.push(`X API設定が不完全: ${xStatus.missing.join(', ')}`);
  }
  if (!xStatus.postingEnabled) {
    issues.push('X_POSTING_ENABLEDがfalseに設定されています');
  }
  if (xStatus.dryRun) {
    issues.push('X_POSTING_DRY_RUNがtrueに設定されています（テストモード）');
  }
  if (!kv) {
    issues.push('KVストレージが利用できません（二重実行防止が機能しません）');
  }
  if (!xaiApiKey) {
    issues.push('XAI_API_KEYが設定されていません（インフルエンサー発掘が機能しません）');
  }
  if (!cronSecret) {
    issues.push('CRON_SECRETが設定されていません（Cronジョブが実行されない可能性があります）');
  }

  if (issues.length === 0) {
    console.log('✅ すべての設定が正常です！');
  } else {
    console.log('❌ 以下の問題が見つかりました:');
    issues.forEach((issue, idx) => {
      console.log(`   ${idx + 1}. ${issue}`);
    });
  }
  console.log('='.repeat(80));
}

// 実行
diagnoseXPosting().catch(error => {
  console.error('❌ 診断エラー:', error.message);
  console.error(error.stack);
  process.exit(1);
});
