#!/usr/bin/env node
/**
 * JA版（日本語）有料版（Regular Briefing）Telegram配信テスト
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
    psychologicalAdvice: '市場状況は比較的安定しています。規律を保ち続けましょう',
    mentalNote: '忍耐は弱さではない—それは戦略的な強さだ。最高のトレーダーは、取引しない時を知っている。',
  },
  gptReporterAnalysis: '現在のCryptoQuantデータは、市場のセンチメントと行動のスナップショットを提供しており、トレーダーが活動する心理的環境を理解する上で重要です。データとその心理的意味を分析しましょう。\n\n### オンチェーンメトリクスの心理的解釈\n\n1. 流入とMPI: -2740.05の負の流入は、取引所から出る資産が入る資産よりも多いことを示唆しており、トレーダーが市場への信頼の欠如により、保有資産を引き出している可能性があります。市場価格インデックス（MPI）が-0.79であることは、弱気のセンチメントを示しており、大口投資家からの買い圧力の欠如を反映しています。これらのメトリクスを合わせると、恐怖が支配する市場環境が示唆され、トレーダー間で防御的な戦略が導かれています。',
  grokXAnalysis: '現在のX(Twitter)センチメントはExtreme Fear状態を示しています。トレーダーは市場の不確実性について懸念しており、多くの人々が防御的な姿勢を取っています。',
  hasGeminiContent: false,
};

/**
 * 日本語版有料版メッセージテスト配信
 */
async function testJaRegularDelivery() {
  console.log('🚀 Japanese Paid Version (Regular Briefing) Test Delivery\n');
  console.log('='.repeat(80));
  console.log('⚠️  Warning: This script will actually send a message to Telegram');
  console.log('⚠️  This script sends ONLY to Japanese (JA) channel');
  console.log('⚠️  If you received messages in all languages, the cron job may have been triggered\n');

  try {
    // テンプレートを読み込む
    const { formatRegularBriefing } = require(
      '../services/telegram/messages/user/ja/regular.ja'
    );

    // メッセージを生成
    const message = formatRegularBriefing({
      ...TEST_DATA,
      lang: 'ja',
    });

    console.log('📝 Generated Message:');
    console.log('='.repeat(80));
    console.log(message);
    console.log('='.repeat(80));
    console.log(`\nCharacter Count: ${message.length} characters\n`);

    // 環境変数の確認
    console.log('🔍 Environment Variables Check:');
    const regularChannelId = process.env.TELEGRAM_CHAT_ID_REGULAR_JA || process.env.TELEGRAM_CHAT_ID_BTC_JA;
    console.log(`  TELEGRAM_CHAT_ID_REGULAR_JA: ${regularChannelId || '❌ Not Set'}`);
    console.log(`  TELEGRAM_CHAT_ID_BTC_JA: ${process.env.TELEGRAM_CHAT_ID_BTC_JA || '❌ Not Set'}`);
    console.log(`  TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ Not Set'}`);
    console.log('');

    // Telegramに送信
    console.log('📤 Sending to Telegram...\n');
    const result = await sendMessageToChannel(message, 'BTC', 'JA');
    
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
  testJaRegularDelivery().catch((error) => {
    console.error('❌ Error during test delivery:', error);
    process.exit(1);
  });
}

module.exports = { testJaRegularDelivery };
