// Telegram EN版チャンネル接続テスト（CommonJS版）
// シンプルなテストスクリプト

const path = require('path');
const dotenv = require('dotenv');

// .envファイルを読み込む
const envPath = path.join(__dirname, '..', '.env');
console.log(`📁 Loading .env from: ${envPath}`);
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  console.error('⚠️ .envファイルの読み込みエラー:', envResult.error.message);
} else {
  console.log('✅ .envファイルを読み込みました\n');
}

const { sendMessageToChannel, sendMessageToAsset } = require('../cryptosignal-ai/services/telegram/bot');

async function main() {
  console.log('='.repeat(80));
  console.log('🧪 Telegram EN版チャンネル接続テスト');
  console.log('='.repeat(80) + '\n');

  // 環境変数の確認
  console.log('🔍 環境変数の確認...\n');
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const paidChannelId = process.env.TELEGRAM_CHAT_ID_BTC_EN || process.env.TELEGRAM_CHAT_ID;
  const freeChannelId = process.env.TELEGRAM_CHAT_ID_MINIMAL;

  console.log(`Bot Token: ${botToken ? '✅ Set (' + botToken.slice(-4) + ')' : '❌ Not Set'}`);
  console.log(`有料チャンネルID: ${paidChannelId || '❌ Not Set'}`);
  console.log(`無料チャンネルID: ${freeChannelId || '❌ Not Set'}\n`);

  if (!botToken || !paidChannelId) {
    console.error('❌ 必要な環境変数が設定されていません。');
    process.exit(1);
  }

  // EN版有料チャンネルへのテスト送信
  console.log('📺 EN版有料チャンネルへのテスト送信...\n');
  try {
    const paidTestMessage = `🧪 Test Message - EN Paid Channel

This is a test message to verify the connection.

✅ Connection successful!
Timestamp: ${new Date().toISOString()}`;

    const paidResult = await sendMessageToChannel(paidTestMessage, 'BTC', 'EN');
    console.log('✅ EN版有料チャンネルへの送信成功！');
    const messageId = paidResult?.result?.message_id || paidResult?.message_id || 'N/A';
    const chatTitle = paidResult?.result?.chat?.title || paidResult?.chat?.title || 'N/A';
    console.log(`   Message ID: ${messageId}`);
    console.log(`   Chat: ${chatTitle}\n`);
  } catch (error) {
    console.error('❌ EN版有料チャンネルへの送信失敗:');
    console.error(`   Error: ${error.message}\n`);
  }

  // EN版無料チャンネルへのテスト送信
  if (freeChannelId) {
    console.log('📺 EN版無料チャンネルへのテスト送信...\n');
    try {
      const freeTestMessage = `🧪 Test Message - EN Free Channel

This is a test message to verify the connection for the free version channel.

✅ Connection successful!
Timestamp: ${new Date().toISOString()}`;

      const freeResult = await sendMessageToAsset(freeTestMessage, 'MINIMAL');
      console.log('✅ EN版無料チャンネルへの送信成功！');
      const messageId = freeResult?.result?.message_id || freeResult?.message_id || 'N/A';
      const chatTitle = freeResult?.result?.chat?.title || freeResult?.chat?.title || 'N/A';
      console.log(`   Message ID: ${messageId}`);
      console.log(`   Chat: ${chatTitle}\n`);
    } catch (error) {
      console.error('❌ EN版無料チャンネルへの送信失敗:');
      console.error(`   Error: ${error.message}\n`);
    }
  } else {
    console.log('⚠️ 無料チャンネルIDが設定されていないため、スキップします。\n');
  }

  console.log('='.repeat(80));
  console.log('✅ テスト完了');
  console.log('='.repeat(80) + '\n');
}

main().catch((error) => {
  console.error('\n❌ エラー:', error.message);
  if (error.stack) {
    console.error('スタックトレース:', error.stack.substring(0, 500));
  }
  process.exit(1);
});
