// scripts/verify-env-variables.js
// .envファイルの環境変数を検証し、Cron Jobsで必要な変数がすべて揃っているか確認

const fs = require('fs');
const path = require('path');

// .envファイルのパス
const ENV_FILE = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads', '.env');

// Cron Jobsで必要な環境変数の定義
const REQUIRED_ENV_VARS = {
  // 基本設定
  'CRON_SECRET': {
    required: true,
    description: 'Cron Jobs認証用シークレット',
    usedBy: ['すべてのCron Jobs'],
  },
  
  // X (Twitter) API設定
  'X_API_BEARER_TOKEN': {
    required: true,
    description: 'X API Bearer Token',
    usedBy: ['x-post-free-report', 'x-quote-repost', 'vsl1-post'],
  },
  'X_API_CONSUMER_KEY': {
    required: true,
    description: 'X API Consumer Key',
    usedBy: ['x-post-free-report', 'x-quote-repost', 'vsl1-post'],
  },
  'X_API_CONSUMER_KEY_SECRET': {
    required: true,
    description: 'X API Consumer Key Secret',
    usedBy: ['x-post-free-report', 'x-quote-repost', 'vsl1-post'],
  },
  'X_API_ACCESS_TOKEN': {
    required: true,
    description: 'X API Access Token',
    usedBy: ['x-post-free-report', 'x-quote-repost', 'vsl1-post'],
  },
  'X_API_ACCESS_TOKEN_SECRET': {
    required: true,
    description: 'X API Access Token Secret',
    usedBy: ['x-post-free-report', 'x-quote-repost', 'vsl1-post'],
  },
  'X_POSTING_ENABLED': {
    required: false,
    description: 'X投稿を有効化（デフォルト: true）',
    usedBy: ['x-post-free-report', 'x-quote-repost'],
    defaultValue: 'true',
  },
  'X_POSTING_DRY_RUN': {
    required: false,
    description: 'X投稿をドライラン（デフォルト: false）',
    usedBy: ['x-post-free-report', 'x-quote-repost'],
    defaultValue: 'false',
  },
  
  // Grok API設定
  'XAI_API_KEY': {
    required: true,
    description: 'Grok API Key（インフルエンサー発見、リード発掘用）',
    usedBy: ['x-quote-repost', 'lead-discovery'],
  },
  
  // Telegram設定
  'TELEGRAM_BOT_TOKEN': {
    required: true,
    description: 'Telegram Bot Token',
    usedBy: ['すべてのTelegram送信Cron Jobs'],
  },
  'TELEGRAM_BOT_USERNAME': {
    required: false,
    description: 'Telegram Bot Username（デフォルト: TrapDefenceBot）',
    usedBy: ['x-post-free-report', 'x-quote-repost'],
    defaultValue: 'TrapDefenceBot',
  },
  
  // Telegram Chat IDs（6言語）
  'TELEGRAM_CHAT_ID_MINIMAL_EN': { required: true, description: 'EN無料版チャンネル', usedBy: ['x-post-free-report'] },
  'TELEGRAM_CHAT_ID_MINIMAL_ES': { required: true, description: 'ES無料版チャンネル', usedBy: ['x-post-free-report'] },
  'TELEGRAM_CHAT_ID_MINIMAL_PT_BR': { required: true, description: 'PT-BR無料版チャンネル', usedBy: ['x-post-free-report'] },
  'TELEGRAM_CHAT_ID_MINIMAL_AR': { required: true, description: 'AR無料版チャンネル', usedBy: ['x-post-free-report'] },
  'TELEGRAM_CHAT_ID_MINIMAL_KO': { required: true, description: 'KO無料版チャンネル', usedBy: ['x-post-free-report'] },
  'TELEGRAM_CHAT_ID_MINIMAL_JA': { required: true, description: 'JA無料版チャンネル', usedBy: ['x-post-free-report'] },
  
  // Vercel KV設定
  'KV_REST_API_URL': {
    required: true,
    description: 'Vercel KV REST API URL（投稿履歴追跡用）',
    usedBy: ['x-post-free-report', 'x-quote-repost'],
  },
  'KV_REST_API_TOKEN': {
    required: true,
    description: 'Vercel KV REST API Token',
    usedBy: ['x-post-free-report', 'x-quote-repost'],
  },
  
  // CryptoQuant API設定
  'CRYPTOQUANT_API_KEY': {
    required: true,
    description: 'CryptoQuant API Key（市場データ取得用）',
    usedBy: ['x-post-free-report', 'x-quote-repost', 'cron'],
  },
  
  // VSL設定
  'VSL1_YOUTUBE_LINK': {
    required: true,
    description: 'VSL1 YouTubeリンク',
    usedBy: ['vsl1-post', 'vsl1-reminder'],
  },
  'VSL2_YOUTUBE_LINK': {
    required: true,
    description: 'VSL2 YouTubeリンク',
    usedBy: ['vsl2-free-users', 'vsl2-last-call'],
  },
  
  // Lead Discovery設定
  'LEAD_DISCOVERY_SEND_REPORT': {
    required: false,
    description: 'リード発見レポート送信（デフォルト: true）',
    usedBy: ['lead-discovery'],
    defaultValue: 'true',
  },
  'LEAD_DISCOVERY_QUEUE_ENABLED': {
    required: false,
    description: 'リード発見キュー有効化（デフォルト: true）',
    usedBy: ['lead-discovery'],
    defaultValue: 'true',
  },
  'LEAD_DISCOVERY_DRY_RUN': {
    required: false,
    description: 'リード発見ドライラン（デフォルト: false）',
    usedBy: ['lead-discovery'],
    defaultValue: 'false',
  },
  
  // Whop設定
  'WHOP_API_KEY': {
    required: true,
    description: 'Whop API Key（購入同期用）',
    usedBy: ['lead-discovery/cvr-dashboard', 'lead-discovery/sync-purchases'],
  },
};

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const envVars = {};
  
  content.split('\n').forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // 空行やコメントをスキップ
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }
    
    // KEY=VALUE形式をパース
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
  
  // .envファイルを読み込み
  let envVars;
  try {
    envVars = parseEnvFile(ENV_FILE);
    console.log(`✅ .envファイルを読み込みました: ${ENV_FILE}`);
    console.log(`📊 環境変数数: ${Object.keys(envVars).length}個\n`);
  } catch (error) {
    console.error(`❌ .envファイルの読み込みに失敗: ${error.message}`);
    return;
  }
  
  // 必須環境変数のチェック
  const missing = [];
  const warnings = [];
  const found = [];
  
  Object.keys(REQUIRED_ENV_VARS).forEach(key => {
    const config = REQUIRED_ENV_VARS[key];
    const value = envVars[key];
    
    if (config.required && !value) {
      missing.push({
        key,
        description: config.description,
        usedBy: config.usedBy,
      });
    } else if (value) {
      found.push({
        key,
        value: value.length > 50 ? value.substring(0, 50) + '...' : value,
        description: config.description,
        usedBy: config.usedBy,
      });
      
      // 値の検証
      if (key === 'X_POSTING_ENABLED' && value !== 'true' && value !== 'false') {
        warnings.push({
          key,
          issue: `値が不正です: "${value}" (期待値: true/false)`,
        });
      }
      if (key === 'X_POSTING_DRY_RUN' && value !== 'true' && value !== 'false') {
        warnings.push({
          key,
          issue: `値が不正です: "${value}" (期待値: true/false)`,
        });
      }
      if (key === 'LEAD_DISCOVERY_DRY_RUN' && value !== 'true' && value !== 'false') {
        warnings.push({
          key,
          issue: `値が不正です: "${value}" (期待値: true/false)`,
        });
      }
    } else if (!config.required && config.defaultValue) {
      // オプションだがデフォルト値がある場合
      warnings.push({
        key,
        issue: `設定されていません（デフォルト値: ${config.defaultValue}）`,
        severity: 'info',
      });
    }
  }
  
  // 結果を表示
  console.log('\n📋 検証結果\n');
  console.log('-'.repeat(80));
  
  if (missing.length > 0) {
    console.log(`\n❌ 不足している必須環境変数: ${missing.length}個\n`);
    missing.forEach(item => {
      console.log(`   🔴 ${item.key}`);
      console.log(`      説明: ${item.description}`);
      console.log(`      使用: ${item.usedBy.join(', ')}`);
      console.log('');
    });
  } else {
    console.log('✅ すべての必須環境変数が設定されています\n');
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️ 警告・情報: ${warnings.length}件\n`);
    warnings.forEach(warning => {
      const icon = warning.severity === 'info' ? 'ℹ️' : '⚠️';
      console.log(`   ${icon} ${warning.key}: ${warning.issue}`);
    });
    console.log('');
  }
  
  // 設定されている環境変数のサマリー
  console.log(`\n✅ 設定されている環境変数: ${found.length}個\n`);
  
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
  
  criticalVars.forEach(key => {
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
  
  if (missing.length === 0 && warnings.filter(w => w.severity !== 'info').length === 0) {
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

// 実行
if (require.main === module) {
  verifyEnvVariables();
}

module.exports = { verifyEnvVariables, parseEnvFile };
