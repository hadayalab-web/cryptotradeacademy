// scripts/check-lead-discovery-env.js
// リード発見システムに必要な環境変数の確認

require('dotenv').config({ path: '.env' });

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

/**
 * リード発見システムに必要な環境変数の確認
 */
function checkLeadDiscoveryEnv() {
  console.log('🔍 リード発見システムの環境変数確認を開始します...\n');
  
  const results = {
    required: [],
    optional: [],
    missing: [],
    warnings: [],
  };
  
  // 1. Vercel KV設定（リード発見キューシステム用）
  console.log('📊 Vercel KV設定:');
  const kvVars = {
    'KV_REST_API_URL': process.env.KV_REST_API_URL,
    'KV_REST_API_TOKEN': process.env.KV_REST_API_TOKEN,
    'KV_REST_API_READ_ONLY_TOKEN': process.env.KV_REST_API_READ_ONLY_TOKEN,
    'KV_URL': process.env.KV_URL,
    'KV_REDIS_URL': process.env.KV_REDIS_URL,
  };
  
  for (const [key, value] of Object.entries(kvVars)) {
    if (value) {
      const masked = value.substring(0, 20) + '...' + value.substring(value.length - 10);
      console.log(`  ✅ ${key}: ${masked}`);
      results.required.push(key);
    } else {
      console.log(`  ❌ ${key}: 未設定`);
      results.missing.push(key);
    }
  }
  
  // KV設定の完全性チェック
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    results.warnings.push('⚠️ Vercel KV設定が不完全です。リード発見キューシステムが正常に動作しない可能性があります。');
  }
  
  console.log('');
  
  // 2. Telegram Bot設定（リード発見DM送信用）
  console.log('📱 Telegram Bot設定:');
  const telegramVars = {
    'TELEGRAM_BOT_TOKEN': process.env.TELEGRAM_BOT_TOKEN,
    'TELEGRAM_BOT_TOKEN_MINIMAL': process.env.TELEGRAM_BOT_TOKEN_MINIMAL,
    'TELEGRAM_BOT_USERNAME': process.env.TELEGRAM_BOT_USERNAME,
  };
  
  for (const [key, value] of Object.entries(telegramVars)) {
    if (value) {
      const masked = value.substring(0, 10) + '...' + value.substring(value.length - 5);
      console.log(`  ✅ ${key}: ${masked}`);
      results.required.push(key);
    } else {
      if (key === 'TELEGRAM_BOT_TOKEN_MINIMAL') {
        console.log(`  ⚠️ ${key}: 未設定（TELEGRAM_BOT_TOKENにフォールバック）`);
        results.optional.push(key);
      } else {
        console.log(`  ❌ ${key}: 未設定`);
        results.missing.push(key);
      }
    }
  }
  
  // 言語別チャンネルIDの確認
  console.log('\n📋 言語別TelegramチャンネルID:');
  for (const lang of SUPPORTED_LANGS) {
    const normalized = lang.toUpperCase().replace('-', '_');
    const variants = [normalized];
    if (normalized === 'PT_BR') variants.push('PTBR');
    if (normalized === 'JA') variants.push('JP');
    if (normalized === 'KO') variants.push('KR');
    
    let found = false;
    for (const variant of variants) {
      const envVarName = `TELEGRAM_CHAT_ID_MINIMAL_${variant}`;
      if (process.env[envVarName]) {
        console.log(`  ✅ ${lang}: ${envVarName} = ${process.env[envVarName]}`);
        found = true;
        break;
      }
    }
    
    if (!found) {
      if (process.env.TELEGRAM_CHAT_ID_MINIMAL) {
        console.log(`  ⚠️ ${lang}: 未設定（TELEGRAM_CHAT_ID_MINIMALにフォールバック）`);
      } else {
        console.log(`  ❌ ${lang}: 未設定`);
        results.missing.push(`TELEGRAM_CHAT_ID_MINIMAL_${normalized}`);
      }
    }
  }
  
  console.log('');
  
  // 3. X API設定（リード発見用）
  console.log('🐦 X API設定:');
  const xVars = {
    'X_API_CONSUMER_KEY': process.env.X_API_CONSUMER_KEY,
    'X_API_CONSUMER_KEY_SECRET': process.env.X_API_CONSUMER_KEY_SECRET,
    'X_API_ACCESS_TOKEN': process.env.X_API_ACCESS_TOKEN,
    'X_API_ACCESS_TOKEN_SECRET': process.env.X_API_ACCESS_TOKEN_SECRET,
  };
  
  const xAllSet = Object.values(xVars).every(v => v);
  for (const [key, value] of Object.entries(xVars)) {
    if (value) {
      const masked = value.substring(0, 10) + '...' + value.substring(value.length - 5);
      console.log(`  ✅ ${key}: ${masked}`);
      results.required.push(key);
    } else {
      console.log(`  ❌ ${key}: 未設定`);
      results.missing.push(key);
    }
  }
  
  if (!xAllSet) {
    results.warnings.push('⚠️ X API設定が不完全です。Xからのリード発見がスキップされます。');
  }
  
  console.log('');
  
  // 4. VSLリンク設定
  console.log('🎬 VSLリンク設定:');
  const vsl1Link = process.env.VSL1_YOUTUBE_LINK || 'https://youtu.be/OqvqngJOiXc';
  const vsl2Link = process.env.VSL2_YOUTUBE_LINK || 'https://youtu.be/fXgVsKhqDjI';
  
  console.log(`  ✅ VSL1_YOUTUBE_LINK: ${vsl1Link}`);
  if (vsl1Link.includes('fXgVsKhqDjI')) {
    results.warnings.push('❌ VSL1_YOUTUBE_LINK がVSL2リンクに設定されています（正: OqvqngJOiXc）');
  }
  
  console.log(`  ✅ VSL2_YOUTUBE_LINK: ${vsl2Link}`);
  if (vsl2Link.includes('OqvqngJOiXc')) {
    results.warnings.push('❌ VSL2_YOUTUBE_LINK がVSL1リンクに設定されています（正: fXgVsKhqDjI）');
  }
  
  console.log('');
  
  // 5. Gemini API設定（リード発見メッセージ最適化用）
  console.log('🤖 Gemini API設定:');
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const masked = geminiKey.substring(0, 10) + '...' + geminiKey.substring(geminiKey.length - 5);
    console.log(`  ✅ GEMINI_API_KEY: ${masked}`);
    results.required.push('GEMINI_API_KEY');
  } else {
    console.log(`  ⚠️ GEMINI_API_KEY: 未設定（動的メッセージ生成がスキップされます）`);
    results.optional.push('GEMINI_API_KEY');
  }
  
  console.log('');
  
  // 6. Grok API設定（リード発見分析用）
  console.log('🧠 Grok API設定:');
  const grokKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  if (grokKey) {
    const masked = grokKey.substring(0, 10) + '...' + grokKey.substring(grokKey.length - 5);
    console.log(`  ✅ XAI_API_KEY/GROK_API_KEY: ${masked}`);
    results.required.push('XAI_API_KEY');
  } else {
    console.log(`  ⚠️ XAI_API_KEY/GROK_API_KEY: 未設定（リード発見分析がスキップされます）`);
    results.optional.push('XAI_API_KEY');
  }
  
  console.log('');
  
  // 7. CRON_SECRET設定
  console.log('🔐 CRON_SECRET設定:');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const masked = cronSecret.substring(0, 10) + '...' + cronSecret.substring(cronSecret.length - 5);
    console.log(`  ✅ CRON_SECRET: ${masked}`);
    results.required.push('CRON_SECRET');
  } else {
    console.log(`  ⚠️ CRON_SECRET: 未設定（本番環境では強く推奨）`);
    results.optional.push('CRON_SECRET');
  }
  
  console.log('');
  
  // 8. リード発見設定
  console.log('🎯 リード発見設定:');
  const leadDiscoveryVars = {
    'VSL1_MULTI_LANG': process.env.VSL1_MULTI_LANG,
    'X_VSL1_MULTI_LANG': process.env.X_VSL1_MULTI_LANG,
    'VSL1_LANGS': process.env.VSL1_LANGS,
  };
  
  for (const [key, value] of Object.entries(leadDiscoveryVars)) {
    if (value) {
      console.log(`  ✅ ${key}: ${value}`);
      results.optional.push(key);
    } else {
      console.log(`  ⚠️ ${key}: 未設定（デフォルト値を使用）`);
      results.optional.push(key);
    }
  }
  
  console.log('');
  
  // 結果サマリー
  console.log('='.repeat(80));
  console.log('📊 検証結果サマリー');
  console.log('='.repeat(80));
  
  if (results.missing.length > 0) {
    console.log('\n❌ 必須環境変数が未設定:');
    results.missing.forEach(key => console.log(`  - ${key}`));
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️ 警告:');
    results.warnings.forEach(warn => console.log(`  ${warn}`));
  }
  
  if (results.missing.length === 0 && results.warnings.length === 0) {
    console.log('\n✅ すべての環境変数が正しく設定されています！');
  }
  
  console.log(`\n📋 設定済み: ${results.required.length}個`);
  console.log(`📋 オプション: ${results.optional.length}個`);
  console.log(`📋 未設定: ${results.missing.length}個`);
  console.log('='.repeat(80));
  
  // Vercel KV設定の推奨事項
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.log('\n💡 Vercel KV設定の推奨事項:');
    console.log('  1. Vercel Dashboardで「cryptotradeacademy-kv」プロジェクトを開く');
    console.log('  2. Storage → Upstash for Redis を確認');
    console.log('  3. Quickstart → .env.local タブから環境変数をコピー');
    console.log('  4. または、`vercel env pull .env.development.local` コマンドを実行');
    console.log('  5. 必要な環境変数:');
    console.log('     - KV_REST_API_URL');
    console.log('     - KV_REST_API_TOKEN');
    console.log('     - KV_REST_API_READ_ONLY_TOKEN（オプション）');
    console.log('     - KV_URL（オプション）');
    console.log('     - KV_REDIS_URL（オプション）');
  }
  
  return results;
}

// 実行
if (require.main === module) {
  const results = checkLeadDiscoveryEnv();
  process.exit(results.missing.length > 0 ? 1 : 0);
}

module.exports = { checkLeadDiscoveryEnv };
