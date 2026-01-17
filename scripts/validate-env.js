// scripts/validate-env.js
// デプロイ前の環境変数検証スクリプト
// Grok CSO+CFO推奨: デプロイ前必須化

require('dotenv').config({ path: '.env' });

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
const LANG_VARIANTS = {
  'PT_BR': ['PTBR'],
  'JA': ['JP'],
  'KO': ['KR'],
};

function normalizeLang(value) {
  if (!value) return null;
  const base = String(value).trim().toLowerCase().split('.')[0].replace('_', '-');
  return SUPPORTED_LANGS.includes(base) ? base : null;
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return defaultValue;
}

function parseLangList(value) {
  if (!value) return [];
  const langs = value
    .split(',')
    .map((entry) => normalizeLang(entry))
    .filter((lang) => lang && SUPPORTED_LANGS.includes(lang));
  const unique = [];
  const seen = new Set();
  for (const lang of langs) {
    if (!seen.has(lang)) {
      seen.add(lang);
      unique.push(lang);
    }
  }
  return unique;
}

function getTargetLanguages() {
  const explicitList = parseLangList(process.env.VSL1_LANGS);
  if (explicitList.length > 0) return explicitList;

  const useMultiLang = parseBoolean(process.env.VSL1_MULTI_LANG, false);
  if (useMultiLang) return SUPPORTED_LANGS;

  const defaultLang = normalizeLang(process.env.LANG || 'en') || 'en';
  return [defaultLang];
}

function resolveMinimalChatId(lang) {
  const normalized = normalizeLang(lang);
  if (!normalized) return process.env.TELEGRAM_CHAT_ID_MINIMAL || null;
  const base = normalized.toUpperCase().replace('-', '_');
  const variants = [base];
  if (base === 'PT_BR') variants.push('PTBR');
  if (base === 'JA') variants.push('JP');
  if (base === 'KO') variants.push('KR');

  for (const variant of variants) {
    const envVarName = `TELEGRAM_CHAT_ID_MINIMAL_${variant}`;
    const chatId = process.env[envVarName];
    if (chatId) return chatId;
  }

  return process.env.TELEGRAM_CHAT_ID_MINIMAL || null;
}

/**
 * 環境変数の検証を実行
 * @returns {Object} { isValid: boolean, errors: Array<string>, warnings: Array<string> }
 */
function validateEnvironment() {
  const errors = [];
  const warnings = [];

  // 1. Bot Tokenの検証
  const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN_MINIMAL;
  if (!botToken) {
    errors.push('❌ TELEGRAM_BOT_TOKEN または TELEGRAM_BOT_TOKEN_MINIMAL が設定されていません');
  }

  // 2. VSL1 YouTubeリンクの検証
  const vsl1Link = process.env.VSL1_YOUTUBE_LINK || 'https://youtu.be/OqvqngJOiXc';
  if (vsl1Link.includes('fXgVsKhqDjI')) {
    errors.push('❌ VSL1_YOUTUBE_LINK がVSL2リンクに設定されています（正: OqvqngJOiXc）');
  }

  // 3. VSL2 YouTubeリンクの検証
  const vsl2Link = process.env.VSL2_YOUTUBE_LINK || 'https://youtu.be/fXgVsKhqDjI';
  if (vsl2Link.includes('OqvqngJOiXc')) {
    errors.push('❌ VSL2_YOUTUBE_LINK がVSL1リンクに設定されています（正: fXgVsKhqDjI）');
  }

  // 4. Bot Usernameの検証
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'TrapDefenceBot';
  if (botUsername.startsWith('@')) {
    warnings.push('⚠️ TELEGRAM_BOT_USERNAME に@記号が含まれています（自動削除されます）');
  }

  // 5. 多言語配信設定の検証
  const targetLangs = getTargetLanguages();
  if (targetLangs.length === 0) {
    errors.push('❌ 対象言語が設定されていません（VSL1_LANGS または VSL1_MULTI_LANG を設定してください）');
  }

  // 6. 言語別チャンネルIDの検証
  const missingChatIds = [];
  for (const lang of targetLangs) {
    const chatId = resolveMinimalChatId(lang);
    if (!chatId) {
      const normalized = lang.toUpperCase().replace('-', '_');
      const variants = [normalized];
      if (normalized === 'PT_BR') variants.push('PTBR');
      if (normalized === 'JA') variants.push('JP');
      if (normalized === 'KO') variants.push('KR');
      
      const envVarNames = variants.map(v => `TELEGRAM_CHAT_ID_MINIMAL_${v}`);
      if (!process.env.TELEGRAM_CHAT_ID_MINIMAL) {
        missingChatIds.push(`${lang}: ${envVarNames.join(' または ')} または TELEGRAM_CHAT_ID_MINIMAL`);
      } else {
        warnings.push(`⚠️ ${lang}言語用のチャンネルIDが未設定（TELEGRAM_CHAT_ID_MINIMALにフォールバック）`);
      }
    }
  }

  if (missingChatIds.length > 0 && !process.env.TELEGRAM_CHAT_ID_MINIMAL) {
    errors.push(`❌ 以下の言語用チャンネルIDが設定されていません:\n   ${missingChatIds.join('\n   ')}`);
  }

  // 7. VSL1_MULTI_LANG と VSL1_LANGS の競合チェック
  if (process.env.VSL1_MULTI_LANG && process.env.VSL1_LANGS) {
    warnings.push('⚠️ VSL1_MULTI_LANG と VSL1_LANGS が両方設定されています（VSL1_LANGSが優先されます）');
  }

  // 8. KVストレージの検証（オプション）
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    warnings.push('⚠️ Vercel KV設定が未設定（ファイルストレージにフォールバック）');
  }

  // 9. X API設定の検証（オプション）
  const xRequiredKeys = [
    'X_API_CONSUMER_KEY',
    'X_API_CONSUMER_KEY_SECRET',
    'X_API_ACCESS_TOKEN',
    'X_API_ACCESS_TOKEN_SECRET',
  ];
  const xMissing = xRequiredKeys.filter((key) => !process.env[key]);
  if (xMissing.length > 0) {
    // 旧キーが入っている可能性もあるため、互換キーを確認して警告を調整
    const legacyKeysSet = !!process.env.X_API_KEY && !!process.env.X_API_SECRET;
    if (legacyKeysSet) {
      warnings.push(
        `⚠️ X API設定が旧形式の可能性があります（必要: ${xRequiredKeys.join(', ')}）`
      );
    } else {
      warnings.push('⚠️ X API設定が未設定（X投稿がスキップされます）');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    targetLangs,
  };
}

// 実行
if (require.main === module) {
  console.log('🔍 環境変数検証を実行中...\n');
  
  const result = validateEnvironment();
  
  console.log('='.repeat(80));
  console.log('📊 検証結果');
  console.log('='.repeat(80));
  
  if (result.errors.length > 0) {
    console.log('\n❌ エラー:');
    result.errors.forEach(err => console.log(`  ${err}`));
  }
  
  if (result.warnings.length > 0) {
    console.log('\n⚠️ 警告:');
    result.warnings.forEach(warn => console.log(`  ${warn}`));
  }
  
  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log('\n✅ すべての環境変数が正しく設定されています');
  }
  
  console.log(`\n📋 対象言語: ${result.targetLangs.join(', ')}`);
  console.log('='.repeat(80));
  
  // エラーがある場合は終了コード1で終了
  if (!result.isValid) {
    console.error('\n❌ 環境変数の検証に失敗しました。デプロイを中止してください。');
    process.exit(1);
  }
  
  console.log('\n✅ 環境変数の検証が完了しました。デプロイを続行できます。');
  process.exit(0);
}

module.exports = { validateEnvironment };
