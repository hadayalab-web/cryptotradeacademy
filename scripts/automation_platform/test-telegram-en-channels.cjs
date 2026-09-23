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
  console.log('='.repeat(80));
  console.log('');
  
  // 強制的に出力をフラッシュ
  process.stdout.write('');

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
    console.error('   .envファイルを確認してください。\n');
    process.exit(1);
  }

  const results = {
    paid: { success: false, error: null },
    free: { success: false, error: null },
  };

  // EN版有料チャンネルへのテスト送信
  console.log('📺 EN版有料チャンネルへのテスト送信...\n');
  try {
    const paidTestMessage = `🧪 Test Message - EN Paid Channel

This is a test message to verify the connection.

✅ Connection successful!
Timestamp: ${new Date().toISOString()}`;

    const paidResult = await sendMessageToChannel(paidTestMessage, 'BTC', 'EN');
    console.log('✅ EN版有料チャンネルへの送信成功！');
    console.log(`   Message ID: ${paidResult?.message_id || 'N/A'}`);
    console.log(`   Chat: ${paidResult?.chat?.title || paidResult?.chat?.id || 'N/A'}\n`);
    results.paid.success = true;
  } catch (error) {
    console.error('❌ EN版有料チャンネルへの送信失敗:');
    console.error(`   Error: ${error.message}\n`);
    results.paid.error = error.message;
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
      console.log(`   Message ID: ${freeResult?.message_id || 'N/A'}`);
      console.log(`   Chat: ${freeResult?.chat?.title || freeResult?.chat?.id || 'N/A'}\n`);
      results.free.success = true;
    } catch (error) {
      console.error('❌ EN版無料チャンネルへの送信失敗:');
      console.error(`   Error: ${error.message}\n`);
      results.free.error = error.message;
    }
  } else {
    console.log('⚠️ 無料チャンネルIDが設定されていないため、スキップします。\n');
  }

  // 結果サマリー
  console.log('='.repeat(80));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(80));
  console.log(`✅ 有料チャンネル: ${results.paid.success ? '成功' : '失敗'}`);
  if (results.paid.error) {
    console.log(`   エラー: ${results.paid.error}`);
  }
  console.log(`✅ 無料チャンネル: ${results.free.success ? '成功' : freeChannelId ? '失敗' : 'スキップ'}`);
  if (results.free.error) {
    console.log(`   エラー: ${results.free.error}`);
  }
  console.log('='.repeat(80) + '\n');

  if (results.paid.success && (results.free.success || !freeChannelId)) {
    console.log('🎉 テストが成功しました！');
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
