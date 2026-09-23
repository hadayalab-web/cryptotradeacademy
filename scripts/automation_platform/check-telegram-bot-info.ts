#!/usr/bin/env tsx
/**
 * Telegram Bot情報確認スクリプト
 * Bot名とチャットグループ名を確認
 */

import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .envファイルを読み込む（複数のパスを試す）
const envPaths = [
  join(__dirname, '..', '.env'),
  join(__dirname, '..', 'cryptosignal-ai', '.env'),
  'C:\\Users\\chiba\\hadayalab-automation-platform\\.env',
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error && process.env.TELEGRAM_BOT_TOKEN) {
      console.log(`✅ .envファイルを読み込みました: ${envPath}`);
      envLoaded = true;
      break;
    }
  } catch (error) {
    // 次のパスを試す
  }
}

// デフォルトでルートの.envを読み込む
if (!envLoaded) {
  dotenv.config({ path: join(__dirname, '..', '.env') });
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function getBotInfo() {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(`Telegram API Error: ${data.description}`);
  }

  return data.result;
}

async function getChatInfo(chatId: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChat?chat_id=${chatId}`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(`Telegram API Error: ${data.description}`);
  }

  return data.result;
}

async function main() {
  console.log('🔍 Telegram Bot情報を確認中...\n');
  
  // 環境変数の確認
  console.log('🔑 環境変数の確認:');
  console.log(`  - TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN ? '設定済み (' + TELEGRAM_BOT_TOKEN.substring(0, 10) + '...)' : '未設定'}`);
  console.log(`  - TELEGRAM_CHAT_ID: ${TELEGRAM_CHAT_ID ? '設定済み (' + TELEGRAM_CHAT_ID + ')' : '未設定'}`);
  console.log('');

  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKENが設定されていません');
    console.error('💡 .envファイルにTELEGRAM_BOT_TOKENを設定してください');
    process.exit(1);
  }

  try {
    // Bot情報を取得
    console.log('📱 Bot情報を取得中...');
    const botInfo = await getBotInfo();
    console.log('✅ Bot情報取得完了\n');
    
    console.log('🤖 Bot情報:');
    console.log(`  - Bot ID: ${botInfo.id}`);
    console.log(`  - Bot名: ${botInfo.first_name}${botInfo.username ? ` (@${botInfo.username})` : ''}`);
    console.log(`  - 説明: ${botInfo.description || 'なし'}`);
    console.log('');

    // チャット情報を取得
    if (TELEGRAM_CHAT_ID) {
      console.log('💬 チャットグループ情報を取得中...');
      const chatInfo = await getChatInfo(TELEGRAM_CHAT_ID);
      console.log('✅ チャット情報取得完了\n');
      
      console.log('💬 チャットグループ情報:');
      console.log(`  - チャットID: ${chatInfo.id}`);
      console.log(`  - チャット名: ${chatInfo.title || chatInfo.first_name || 'N/A'}`);
      console.log(`  - タイプ: ${chatInfo.type}`);
      if (chatInfo.description) {
        console.log(`  - 説明: ${chatInfo.description}`);
      }
      console.log('');
    } else {
      console.warn('⚠️ TELEGRAM_CHAT_IDが設定されていません');
    }

    console.log('✅ 確認完了！');
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

main();
