#!/usr/bin/env node
/**
 * AR版（アラビア語）有料版（Regular Briefing）Telegram配信テスト
 * 実際にTelegramにメッセージを送信します
 */

const path = require('path');
const dotenv = require('dotenv');

// .envファイルを読み込む
const envPath = path.join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

const { sendMessageToChannel } = require('../services/telegram/bot');

// 本番環境を想定したテストデータ
const TEST_DATA = {
  now: new Date(),
  inflow: -2740, // BTC units (outflow)
  mpi: -0.79,
  sentimentLabel: 'Extreme Fear',
  priceUsd: 88343,
  change24h: -4.55,
  score: -2,
  tradeSignal: {
    tp: 88343,
    sl: 88343,
    rr: 1.40,
  },
  trap: {
    isTrap: false,
    confidence: 'LOW',
  },
  trapRisk: {
    trapRiskScore: 25,
    riskLevel: 'LOW',
    riskFactors: [],
  },
  trapDetection: {
    trapDetected: false,
    trapScore: 25,
    trapType: 'WHALE_RETAIL_DIVERGENCE',
    trapSeverity: 'LOW',
    details: {
      multipleDivergences: 0,
      anomalyDetected: false,
      accelerationDetected: false,
      onchainSocialDivergence: 0,
      priceOnchainDivergence: false,
      priceSocialDivergence: false,
    },
  },
  psychologicalSupport: {
    psychologicalState: 'NEUTRAL',
    psychologicalRisk: 'LOW',
    psychologicalAdvice: 'ظروف السوق مستقرة نسبياً. حافظ على الانضباط',
    mentalNote: 'الصبر ليس ضعفاً—إنه قوة استراتيجية. أفضل المتداولين يعرفون متى لا يتداولون.',
  },
  gptReporterAnalysis: 'The current CryptoQuant data provides a snapshot of market sentiment and behavior, which is crucial for understanding the psychological landscape in which traders operate. Let\'s break down the data and its psychological implications:\n\n### Psychological Interpretation of On-Chain Metrics\n\n1. Inflow and MPI: The negative inflow of -2740.05 suggests that more assets are leaving exchanges than entering, often a sign that traders are withdrawing their holdings, possibly due to a lack of confidence in the market. The Market Price Index (MPI) at -0.79 indicates a bearish sentiment, reflecting a lack of buying pressure from large investors. Together, these metrics suggest a market environment where fear dominates, leading to defensive strategies among traders.',
  grokXAnalysis: {
    sentiment: 'FEAR',
    risk: 'LOW',
  },
  hasGeminiContent: false,
};

/**
 * アラビア語版有料版メッセージテスト配信
 */
async function testArRegularDelivery() {
  console.log('🚀 Arabic Paid Version (Regular Briefing) Test Delivery\n');
  console.log('='.repeat(80));
  console.log('⚠️  Warning: This script will actually send a message to Telegram');
  console.log('⚠️  This script sends ONLY to Arabic (AR) channel');
  console.log('⚠️  If you received messages in all languages, the cron job may have been triggered\n');

  try {
    // テンプレートを読み込む
    const { formatRegularBriefing } = require(
      '../services/telegram/messages/user/ar/regular.ar'
    );

    // メッセージを生成
    const message = formatRegularBriefing({
      ...TEST_DATA,
      lang: 'ar',
    });

    console.log('📝 Generated Message:');
    console.log('='.repeat(80));
    console.log(message);
    console.log('='.repeat(80));
    console.log(`\nCharacter Count: ${message.length} characters\n`);

    // 環境変数の確認
    console.log('🔍 Environment Variables Check:');
    const regularChannelId = process.env.TELEGRAM_CHAT_ID_REGULAR_AR || process.env.TELEGRAM_CHAT_ID_BTC_AR;
    console.log(`  TELEGRAM_CHAT_ID_REGULAR_AR: ${regularChannelId || '❌ Not Set'}`);
    console.log(`  TELEGRAM_CHAT_ID_BTC_AR: ${process.env.TELEGRAM_CHAT_ID_BTC_AR || '❌ Not Set'}`);
    console.log(`  TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ Not Set'}`);
    console.log('');

    // Telegramに送信
    console.log('📤 Sending to Telegram...\n');
    const result = await sendMessageToChannel(message, 'BTC', 'AR');
    
    const messageId = result?.result?.message_id || result?.message_id || 'N/A';
    const chatTitle = result?.result?.chat?.title || result?.chat?.title || 'N/A';
    
    console.log('✅ Send Successful!');
    console.log(`   Message ID: ${messageId}`);
    console.log(`   Chat: ${chatTitle}`);
    console.log('\n📱 Please check the actual UI on Telegram');

  } catch (error) {
    console.error('\n❌ Error occurred:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  testArRegularDelivery().catch((error) => {
    console.error('❌ Error during test delivery:', error);
    process.exit(1);
  });
}

module.exports = { testArRegularDelivery };
