#!/usr/bin/env node
/**
 * 日本語版無料版（Minimal High Quality）のテスト配信
 * 実際にTelegramにメッセージを送信
 */

const path = require('path');
const dotenv = require('dotenv');

// .envファイルを読み込む
const envPath = path.join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

const { sendMessageToAsset } = require('../services/telegram/bot');

// テストデータ
const TEST_DATA = {
  now: new Date(),
  trapScore: 25, // 低リスク
  priceUsd: 88343,
  change24h: -4.55,
  trapData: {
    exchangeNetflow: -2740, // BTC単位（流出）
    whaleRatio: 0.46, // 46%
  },
  marketData: {
    mpi: 0.65,
  },
  sentimentData: {
    sentiment: 'NEUTRAL',
  },
};

/**
 * 日本語版無料版メッセージのテスト配信
 */
async function testJaMinimalHighQualityDelivery() {
  console.log('🚀 日本語版無料版（Minimal High Quality）テスト配信\n');
  console.log('='.repeat(80));
  console.log('⚠️  注意: このスクリプトは実際にTelegramにメッセージを送信します\n');

  try {
    // テンプレートを読み込む
    const { formatMinimalHighQualityBriefing } = require(
      '../services/telegram/messages/user/ja/minimal-high-quality.ja'
    );

    // メッセージを生成
    const message = formatMinimalHighQualityBriefing({
      now: TEST_DATA.now,
      trapScore: TEST_DATA.trapScore,
      priceUsd: TEST_DATA.priceUsd,
      change24h: TEST_DATA.change24h,
      trapData: TEST_DATA.trapData,
      marketData: TEST_DATA.marketData,
      sentimentData: TEST_DATA.sentimentData,
      lang: 'ja',
    });

    console.log('📝 生成されたメッセージ:');
    console.log('='.repeat(80));
    console.log(message);
    console.log('='.repeat(80));
    console.log(`\n文字数: ${message.length}文字\n`);

    // 環境変数の確認
    console.log('🔍 環境変数の確認:');
    const minimalChannelId = process.env.TELEGRAM_CHAT_ID_MINIMAL_JA;
    const defaultMinimalChannelId = process.env.TELEGRAM_CHAT_ID_MINIMAL;
    console.log(`  TELEGRAM_CHAT_ID_MINIMAL_JA: ${minimalChannelId || '❌ 未設定'}`);
    console.log(`  TELEGRAM_CHAT_ID_MINIMAL (フォールバック): ${defaultMinimalChannelId || '❌ 未設定'}`);
    console.log(`  TELEGRAM_BOT_TOKEN_MINIMAL: ${process.env.TELEGRAM_BOT_TOKEN_MINIMAL ? '✅ 設定済み' : '❌ 未設定'}`);
    console.log('');

    // Telegramに送信
    console.log('📤 Telegramに送信中...\n');
    const result = await sendMessageToAsset(message, 'MINIMAL', 'JA');
    
    const messageId = result?.result?.message_id || result?.message_id || 'N/A';
    const chatTitle = result?.result?.chat?.title || result?.chat?.title || 'N/A';
    
    console.log('✅ 送信成功！');
    console.log(`   Message ID: ${messageId}`);
    console.log(`   Chat: ${chatTitle}`);
    console.log('\n📱 Telegramで実際のUIを確認してください');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  testJaMinimalHighQualityDelivery().catch((error) => {
    console.error('❌ テスト配信中にエラーが発生しました:', error);
    process.exit(1);
  });
}

module.exports = { testJaMinimalHighQualityDelivery };
