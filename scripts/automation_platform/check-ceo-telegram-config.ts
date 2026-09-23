#!/usr/bin/env tsx
/**
 * CEO Telegram設定確認
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .envファイルを読み込む
dotenv.config({ path: join(__dirname, '..', '.env') });

const TELEGRAM_CHAT_ID_CEO = process.env.TELEGRAM_CHAT_ID_CEO || '';
const TELEGRAM_BOT_TOKEN_CEO = process.env.TELEGRAM_BOT_TOKEN_CEO || '';
const TELEGRAM_BOT_TOKEN_EN = process.env.TELEGRAM_BOT_TOKEN_EN || '';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

console.log('📋 CEO Telegram設定確認\n');

console.log('環境変数設定状況:');
console.log(`  TELEGRAM_CHAT_ID_CEO: ${TELEGRAM_CHAT_ID_CEO ? '✅ 設定済み' : '❌ 未設定'}`);
console.log(`  TELEGRAM_BOT_TOKEN_CEO: ${TELEGRAM_BOT_TOKEN_CEO ? '✅ 設定済み' : '❌ 未設定'}`);
console.log(`  TELEGRAM_BOT_TOKEN_EN: ${TELEGRAM_BOT_TOKEN_EN ? '✅ 設定済み（フォールバック用）' : '❌ 未設定'}`);
console.log(`  TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN ? '✅ 設定済み（フォールバック用）' : '❌ 未設定'}\n`);

if (!TELEGRAM_CHAT_ID_CEO) {
  console.error('❌ TELEGRAM_CHAT_ID_CEOが設定されていません\n');
  console.error('📋 設定方法:');
  console.error('   1. Telegram Botにメッセージを送信（/start）');
  console.error('   2. ブラウザで以下にアクセス:');
  console.error('      https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates');
  console.error('   3. レスポンスのchat.idをコピー');
  console.error('   4. .envファイルに追加:');
  console.error('      TELEGRAM_CHAT_ID_CEO=<chat.id>\n');
  process.exit(1);
}

const botToken = TELEGRAM_BOT_TOKEN_CEO || TELEGRAM_BOT_TOKEN_EN || TELEGRAM_BOT_TOKEN;
if (!botToken) {
  console.error('❌ Bot Tokenが設定されていません\n');
  console.error('📋 設定方法:');
  console.error('   .envファイルに以下を追加:');
  console.error('   TELEGRAM_BOT_TOKEN_CEO=あなたのTelegram Bot Token');
  console.error('   または既存のBot Tokenを使用:');
  console.error('   TELEGRAM_BOT_TOKEN_EN=既存のBot Token\n');
  process.exit(1);
}

console.log('✅ 設定完了！');
console.log(`   使用するBot Token: ${botToken.substring(0, 10)}...`);
console.log(`   CEO Chat ID: ${TELEGRAM_CHAT_ID_CEO}\n`);
console.log('📱 テスト送信を実行するには:');
console.log('   npx tsx scripts/test-ceo-notification-direct.ts\n');
