// scripts/verify-env-simple.js
// .envファイルの環境変数を簡易検証

const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads', '.env');

// 必須環境変数のリスト
const REQUIRED_VARS = [
  'CRON_SECRET',
  'X_API_BEARER_TOKEN',
  'X_API_CONSUMER_KEY',
  'X_API_CONSUMER_KEY_SECRET',
  'X_API_ACCESS_TOKEN',
  'X_API_ACCESS_TOKEN_SECRET',
  'XAI_API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID_MINIMAL_EN',
  'TELEGRAM_CHAT_ID_MINIMAL_ES',
  'TELEGRAM_CHAT_ID_MINIMAL_PT_BR',
  'TELEGRAM_CHAT_ID_MINIMAL_AR',
  'TELEGRAM_CHAT_ID_MINIMAL_KO',
  'TELEGRAM_CHAT_ID_MINIMAL_JA',
  'KV_REST_API_URL',
  'KV_REST_API_TOKEN',
  'CRYPTOQUANT_API_KEY',
  'VSL1_YOUTUBE_LINK',
  'VSL2_YOUTUBE_LINK',
  'WHOP_API_KEY',
];

// オプション環境変数（デフォルト値あり）
const OPTIONAL_VARS = {
  'X_POSTING_ENABLED': 'true',
  'X_POSTING_DRY_RUN': 'false',
  'TELEGRAM_BOT_USERNAME': 'TrapDefenceBot',
  'LEAD_DISCOVERY_SEND_REPORT': 'true',
  'LEAD_DISCOVERY_QUEUE_ENABLED': 'true',
  'LEAD_DISCOVERY_DRY_RUN': 'false',
};

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const envVars = {};
  
  content.split('\n').forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }
    const match = trimmedLine.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      envVars[key] = value;
    }
  });
  
  return envVars;
}

function verifyEnvVariables() {
  console.log('🔍 環境変数検証開始\n');
  console.log('='.repeat(80));
  
  let envVars;
  try {
    envVars = parseEnvFile(ENV_FILE);
    console.log(`✅ .envファイルを読み込みました`);
    console.log(`📊 環境変数数: ${Object.keys(envVars).length}個\n`);
  } catch (error) {
    console.error(`❌ .envファイルの読み込みに失敗: ${error.message}`);
    return;
  }
  
  // 必須環境変数のチェック
  const missing = [];
  const found = [];
  const warnings = [];
  
  REQUIRED_VARS.forEach((key) => {
    if (envVars[key]) {
      found.push(key);
    } else {
      missing.push(key);
    }
  });
  
  // オプション環境変数のチェック
  Object.keys(OPTIONAL_VARS).forEach((key) => {
    if (!envVars[key]) {
      warnings.push({
        key,
        message: `未設定（デフォルト値: ${OPTIONAL_VARS[key]}）`,
        severity: 'info',
      });
    } else if (key.includes('ENABLED') || key.includes('DRY_RUN')) {
      if (envVars[key] !== 'true' && envVars[key] !== 'false') {
        warnings.push({
          key,
          message: `値が不正: "${envVars[key]}" (期待値: true/false)`,
          severity: 'warning',
        });
      }
    }
  });
  
  // 結果表示
  console.log('\n📋 検証結果\n');
  console.log('-'.repeat(80));
  
  if (missing.length > 0) {
    console.log(`\n❌ 不足している必須環境変数: ${missing.length}個\n`);
    missing.forEach((key) => {
      console.log(`   🔴 ${key}`);
    });
    console.log('');
  } else {
    console.log('✅ すべての必須環境変数が設定されています\n');
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️ 警告・情報: ${warnings.length}件\n`);
    warnings.forEach((w) => {
      const icon = w.severity === 'info' ? 'ℹ️' : '⚠️';
      console.log(`   ${icon} ${w.key}: ${w.message}`);
    });
    console.log('');
  }
  
  // 重要な環境変数の確認
  console.log('\n🔑 重要な環境変数の確認\n');
  console.log('-'.repeat(80));
  
  const criticalVars = [
    'CRON_SECRET',
    'X_API_CONSUMER_KEY',
    'X_API_ACCESS_TOKEN',
    'XAI_API_KEY',
    'TELEGRAM_BOT_TOKEN',
    'KV_REST_API_URL',
    'CRYPTOQUANT_API_KEY',
  ];
  
  criticalVars.forEach((key) => {
    const value = envVars[key];
    if (value) {
      const maskedValue = value.length > 20 
        ? value.substring(0, 10) + '...' + value.substring(value.length - 5)
        : '***';
      console.log(`✅ ${key}: ${maskedValue}`);
    } else {
      console.log(`❌ ${key}: 未設定`);
    }
  });
  
  // 総合評価
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 総合評価\n');
  
  if (missing.length === 0 && warnings.filter((w) => w.severity !== 'info').length === 0) {
    console.log('✅ すべての環境変数が正しく設定されています！');
    console.log('   Vercelの環境変数設定に問題はありません。');
    console.log('   テストを開始できます。');
  } else if (missing.length === 0) {
    console.log('⚠️ 環境変数は設定されていますが、いくつかの警告があります。');
    console.log('   警告を確認してからテストを開始してください。');
  } else {
    console.log('❌ 不足している環境変数があります。');
    console.log('   上記の不足している環境変数をVercelに設定してからテストを開始してください。');
  }
  
  console.log('\n' + '='.repeat(80));
}

if (require.main === module) {
  verifyEnvVariables();
}

module.exports = { verifyEnvVariables, parseEnvFile };
