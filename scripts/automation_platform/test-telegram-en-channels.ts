#!/usr/bin/env tsx
/**
 * Telegram EN版チャンネル接続テスト
 * 
 * 有料版チャンネルと無料版チャンネルにテストメッセージを送信して動作確認
 */

import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .envファイルを読み込む
dotenv.config({ path: join(__dirname, '..', '.env') });

// bot.jsを動的インポート（CommonJS形式のため）
let sendMessageToChannel: any;
let sendMessageToAsset: any;
let sendMessageToUser: any;

async function loadBotFunctions() {
  const botModule = await import('../cryptosignal-ai/services/telegram/bot.js');
  sendMessageToChannel = botModule.sendMessageToChannel;
  sendMessageToAsset = botModule.sendMessageToAsset;
  sendMessageToUser = botModule.sendMessageToUser;
}

async function testPaidChannel() {
  console.log('📺 EN版有料チャンネルへのテスト送信...\n');
  
  const testMessage = `🧪 Test Message - EN Paid Channel

This is a test message to verify the connection.

✅ Bot Token: ${process.env.TELEGRAM_BOT_TOKEN ? 'Set' : 'Not Set'}
✅ Channel ID: ${process.env.TELEGRAM_CHAT_ID_BTC_EN || process.env.TELEGRAM_CHAT_ID || 'Not Set'}

If you see this message, the connection is working correctly!

Timestamp: ${new Date().toISOString()}`;

  try {
    const result = await sendMessageToChannel(testMessage, 'BTC', 'EN');
    console.log('✅ EN版有料チャンネルへの送信成功！');
    console.log(`   Message ID: ${result?.message_id || 'N/A'}`);
    console.log(`   Chat ID: ${result?.chat?.id || 'N/A'}\n`);
    return { success: true, result };
  } catch (error: any) {
    console.error('❌ EN版有料チャンネルへの送信失敗:');
    console.error(`   Error: ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

async function testFreeChannel() {
  console.log('📺 EN版無料チャンネルへのテスト送信...\n');
  
  const testMessage = `🧪 Test Message - EN Free Channel

This is a test message to verify the connection for the free version channel.

✅ Bot Token: ${process.env.TELEGRAM_BOT_TOKEN ? 'Set' : 'Not Set'}
✅ Channel ID: ${process.env.TELEGRAM_CHAT_ID_MINIMAL || 'Not Set'}

If you see this message, the connection is working correctly!

Timestamp: ${new Date().toISOString()}`;

  try {
    const result = await sendMessageToAsset(testMessage, 'MINIMAL');
    console.log('✅ EN版無料チャンネルへの送信成功！');
    console.log(`   Message ID: ${result?.message_id || 'N/A'}`);
    console.log(`   Chat ID: ${result?.chat?.id || 'N/A'}\n`);
    return { success: true, result };
  } catch (error: any) {
    console.error('❌ EN版無料チャンネルへの送信失敗:');
    console.error(`   Error: ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

async function testBotCommands() {
  console.log('🤖 Botコマンドのテスト...\n');
  
  // テスト用のUpdateオブジェクトをシミュレート
  const testUpdate = {
    update_id: 123456789,
    message: {
      message_id: 1,
      from: {
        id: 123456789,
        is_bot: false,
        first_name: 'Test',
        username: 'testuser',
      },
      chat: {
        id: 123456789,
        type: 'private',
      },
      text: '/start',
      date: Math.floor(Date.now() / 1000),
    },
  };

  try {
    // 動的インポート
    const botCommandsModule = await import('../cryptosignal-ai/services/telegram/bot-commands.js');
    const result = await botCommandsModule.handleBotCommand(testUpdate);
    
    if (result.success) {
      console.log('✅ Botコマンド処理成功！');
      console.log(`   Command: /start`);
      console.log(`   Is New User: ${result.isNewUser || 'N/A'}\n`);
      return { success: true, result };
    } else {
      console.error('❌ Botコマンド処理失敗:');
      console.error(`   Error: ${result.error || 'Unknown error'}\n`);
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error('❌ Botコマンド処理エラー:');
    console.error(`   Error: ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

async function checkEnvironmentVariables() {
  console.log('🔍 環境変数の確認...\n');
  
  const requiredVars = {
    'TELEGRAM_BOT_TOKEN': process.env.TELEGRAM_BOT_TOKEN,
    'TELEGRAM_CHAT_ID_BTC_EN': process.env.TELEGRAM_CHAT_ID_BTC_EN,
    'TELEGRAM_CHAT_ID': process.env.TELEGRAM_CHAT_ID,
    'TELEGRAM_CHAT_ID_MINIMAL': process.env.TELEGRAM_CHAT_ID_MINIMAL,
  };

  console.log('環境変数の状態:');
  let allSet = true;
  for (const [key, value] of Object.entries(requiredVars)) {
    const status = value ? '✅' : '❌';
    const displayValue = value ? (key.includes('TOKEN') ? '***' + value.slice(-4) : value) : 'Not Set';
    console.log(`   ${status} ${key}: ${displayValue}`);
    if (!value && (key === 'TELEGRAM_BOT_TOKEN' || key === 'TELEGRAM_CHAT_ID_BTC_EN')) {
      allSet = false;
    }
  }
  console.log('');
  
  return allSet;
}

async function main() {
  console.log('='.repeat(80));
  console.log('🧪 Telegram EN版チャンネル接続テスト');
  console.log('='.repeat(80) + '\n');

  // Bot関数を読み込む
  await loadBotFunctions();

  // Step 1: 環境変数の確認
  const envOk = await checkEnvironmentVariables();
  
  if (!envOk) {
    console.error('❌ 必要な環境変数が設定されていません。');
    console.error('   .envファイルを確認してください。\n');
    process.exit(1);
  }

  // Step 2: EN版有料チャンネルへのテスト送信
  const paidResult = await testPaidChannel();
  
  // Step 3: EN版無料チャンネルへのテスト送信
  const freeResult = await testFreeChannel();
  
  // Step 4: Botコマンドのテスト（オプション）
  // 注意: 実際のBotにメッセージを送信する必要があるため、ここではスキップ
  // const botCommandResult = await testBotCommands();

  // 結果サマリー
  console.log('='.repeat(80));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(80));
  console.log(`✅ 有料チャンネル: ${paidResult.success ? '成功' : '失敗'}`);
  console.log(`✅ 無料チャンネル: ${freeResult.success ? '成功' : '失敗'}`);
  console.log('='.repeat(80) + '\n');

  if (paidResult.success && freeResult.success) {
    console.log('🎉 すべてのテストが成功しました！');
    console.log('   チャンネルへの配信準備が完了しています。\n');
    process.exit(0);
  } else {
    console.error('⚠️ 一部のテストが失敗しました。');
    console.error('   エラーメッセージを確認して、環境変数やBotの権限を確認してください。\n');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ 予期しないエラー:', error.message);
  if (error.stack) {
    console.error('スタックトレース:', error.stack.substring(0, 500));
  }
  process.exit(1);
});
