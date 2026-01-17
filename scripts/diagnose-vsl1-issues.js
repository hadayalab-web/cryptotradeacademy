// scripts/diagnose-vsl1-issues.js
// VSL1配信問題の診断スクリプト

require('dotenv').config({ path: '.env' });

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

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

  const DEFAULT_LANG = normalizeLang(process.env.LANG || 'en') || 'en';
  return [DEFAULT_LANG];
}

function getTelegramDeepLink(lang) {
  let botUsername = process.env.TELEGRAM_BOT_USERNAME || 'TrapDefenceBot';
  botUsername = botUsername.replace(/^@/, '');
  const normalized = normalizeLang(lang);
  const startParam = normalized ? `minimal_${normalized}` : 'minimal';
  return `https://t.me/${botUsername}?start=${startParam}`;
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

console.log('🔍 VSL1配信問題の診断開始...\n');
console.log('='.repeat(80));

// 1. 環境変数の確認
console.log('\n📋 環境変数の状態:');
console.log(`  VSL1_YOUTUBE_LINK: ${process.env.VSL1_YOUTUBE_LINK || '❌ 未設定（デフォルト使用）'}`);
console.log(`  VSL2_YOUTUBE_LINK: ${process.env.VSL2_YOUTUBE_LINK || '❌ 未設定'}`);
console.log(`  LANG: ${process.env.LANG || '❌ 未設定（デフォルト: en）'}`);
console.log(`  VSL1_MULTI_LANG: ${process.env.VSL1_MULTI_LANG || '❌ 未設定（デフォルト: false）'}`);
console.log(`  VSL1_LANGS: ${process.env.VSL1_LANGS || '❌ 未設定'}`);
console.log(`  TELEGRAM_BOT_USERNAME: ${process.env.TELEGRAM_BOT_USERNAME || '❌ 未設定（デフォルト: TrapDefenceBot）'}`);
console.log(`  TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ 設定済み' : '❌ 未設定'}`);
console.log(`  TELEGRAM_BOT_TOKEN_MINIMAL: ${process.env.TELEGRAM_BOT_TOKEN_MINIMAL ? '✅ 設定済み' : '❌ 未設定'}`);
console.log(`  TELEGRAM_CHAT_ID_MINIMAL: ${process.env.TELEGRAM_CHAT_ID_MINIMAL ? '✅ 設定済み' : '❌ 未設定'}`);

// 2. VSL1リンクの検証
console.log('\n🔗 VSL1リンクの検証:');
let vsl1Link = process.env.VSL1_YOUTUBE_LINK || 'https://youtu.be/OqvqngJOiXc';
if (vsl1Link.includes('fXgVsKhqDjI')) {
  console.log(`  ❌ 問題発見: VSL1_YOUTUBE_LINKがVSL2リンクに設定されています！`);
  console.log(`     現在の値: ${vsl1Link}`);
  console.log(`     正しい値: https://youtu.be/OqvqngJOiXc`);
  vsl1Link = 'https://youtu.be/OqvqngJOiXc';
} else {
  console.log(`  ✅ VSL1リンクは正しい: ${vsl1Link}`);
}

// 3. Deep Linkの検証
console.log('\n🔗 Deep Linkの検証:');
const botUsernameRaw = process.env.TELEGRAM_BOT_USERNAME || 'TrapDefenceBot';
const botUsername = botUsernameRaw.replace(/^@/, '');
if (botUsernameRaw.includes('@')) {
  console.log(`  ⚠️ 問題発見: TELEGRAM_BOT_USERNAMEに@記号が含まれています`);
  console.log(`     現在の値: ${botUsernameRaw}`);
  console.log(`     修正後: ${botUsername}`);
} else {
  console.log(`  ✅ Bot Usernameは正しい: ${botUsername}`);
}

// 4. 多言語配信の状態確認
console.log('\n🌍 多言語配信の状態:');
const targetLangs = getTargetLanguages();
console.log(`  対象言語数: ${targetLangs.length}`);
console.log(`  対象言語: ${targetLangs.join(', ')}`);

if (targetLangs.length === 1) {
  console.log(`  ⚠️ 問題: 1言語のみが対象になっています`);
  console.log(`     原因: VSL1_MULTI_LANG=true または VSL1_LANGS が設定されていません`);
  console.log(`     解決策: Vercel環境変数に VSL1_MULTI_LANG=true を設定してください`);
} else {
  console.log(`  ✅ 多言語配信が有効です（${targetLangs.length}言語）`);
}

if (process.env.VSL1_LANGS) {
  console.log(`  ⚠️ 注意: VSL1_LANGS が設定されているため VSL1_MULTI_LANG より優先されます`);
}

// 5. 言語別チャンネルIDの確認
console.log('\n📱 言語別チャンネルIDの確認:');
for (const lang of SUPPORTED_LANGS) {
  const langCodeUpper = lang.toUpperCase().replace('-', '_');
  const envVarName = `TELEGRAM_CHAT_ID_MINIMAL_${langCodeUpper}`;
  const altEnvVarName = langCodeUpper === 'PT_BR'
    ? 'TELEGRAM_CHAT_ID_MINIMAL_PTBR'
    : langCodeUpper === 'JA'
      ? 'TELEGRAM_CHAT_ID_MINIMAL_JP'
      : langCodeUpper === 'KO'
        ? 'TELEGRAM_CHAT_ID_MINIMAL_KR'
        : null;
  const chatId = process.env[envVarName] || (altEnvVarName ? process.env[altEnvVarName] : null);
  const status = chatId ? '✅' : '❌';
  const label = altEnvVarName ? `${envVarName} / ${altEnvVarName}` : envVarName;
  console.log(`  ${status} ${label}: ${chatId || '未設定'}`);
}

// 6. 実際に生成されるDeep Linkの確認
console.log('\n🔗 生成されるDeep Link（各言語）:');
for (const lang of targetLangs) {
  const deepLink = getTelegramDeepLink(lang);
  console.log(`  ${lang}: ${deepLink}`);
}

// 7. メッセージテンプレートの確認
console.log('\n📝 メッセージテンプレートの確認:');
try {
  const { generateVSL1Message } = require('../services/telegram/messages/vsl1');
  for (const lang of targetLangs.slice(0, 2)) { // 最初の2言語のみ表示
    const deepLink = getTelegramDeepLink(lang);
    const message = generateVSL1Message(lang, deepLink, vsl1Link);
    console.log(`\n  ${lang.toUpperCase()}版（最初の100文字）:`);
    console.log(`  ${message.substring(0, 100)}...`);
  }
  console.log(`  ✅ メッセージテンプレートは正常に読み込めています`);
} catch (error) {
  console.log(`  ❌ エラー: メッセージテンプレートの読み込みに失敗: ${error.message}`);
}

// 8. 問題のまとめ
console.log('\n' + '='.repeat(80));
console.log('📊 診断結果のまとめ:');
console.log('='.repeat(80));

const issues = [];

if (vsl1Link !== (process.env.VSL1_YOUTUBE_LINK || 'https://youtu.be/OqvqngJOiXc')) {
  issues.push('❌ VSL1_YOUTUBE_LINKがVSL2リンクに設定されている');
}

if (botUsernameRaw.includes('@')) {
  issues.push('❌ TELEGRAM_BOT_USERNAMEに@記号が含まれている');
}

if (targetLangs.length === 1) {
  issues.push('❌ 多言語配信が有効になっていない（VSL1_MULTI_LANG=true が設定されていない）');
}

const botTokenAvailable = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN_MINIMAL;
if (!botTokenAvailable) {
  issues.push('❌ TELEGRAM_BOT_TOKEN（または TELEGRAM_BOT_TOKEN_MINIMAL）が未設定');
}

const missingChannels = SUPPORTED_LANGS.filter(lang => {
  return !resolveMinimalChatId(lang);
});

if (missingChannels.length > 0) {
  issues.push(`⚠️ 言語別チャンネルIDが未設定: ${missingChannels.join(', ')}`);
}

if (issues.length === 0) {
  console.log('✅ 問題は見つかりませんでした。すべて正常です。');
} else {
  console.log(`\n発見された問題（${issues.length}件）:`);
  issues.forEach((issue, index) => {
    console.log(`  ${index + 1}. ${issue}`);
  });
  
  console.log('\n🔧 推奨される修正:');
  console.log('  1. Vercel Dashboard → Project Settings → Environment Variables');
  console.log('  2. 以下の環境変数を設定/修正:');
  console.log('');
  console.log('     VSL1_YOUTUBE_LINK=https://youtu.be/OqvqngJOiXc');
  console.log('     TELEGRAM_BOT_USERNAME=drgrokbot  # @記号なし');
  console.log('     VSL1_MULTI_LANG=true  # 多言語配信を有効化');
  console.log('     TELEGRAM_CHAT_ID_MINIMAL_EN=...');
  console.log('     TELEGRAM_CHAT_ID_MINIMAL_JA=...');
  console.log('     TELEGRAM_CHAT_ID_MINIMAL_ES=...');
  console.log('     TELEGRAM_CHAT_ID_MINIMAL_PT_BR=...');
  console.log('     TELEGRAM_CHAT_ID_MINIMAL_AR=...');
  console.log('     TELEGRAM_CHAT_ID_MINIMAL_KO=...');
}

console.log('\n' + '='.repeat(80));
