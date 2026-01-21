#!/usr/bin/env node
/**
 * KO版（韓国語）有料版（Regular Briefing）Telegram配信テスト
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
  inflow: 9867, // BTC units (inflow)
  mpi: -0.79,
  sentimentLabel: 'Extreme Fear',
  priceUsd: 89833,
  change24h: -1.91,
  score: -23,
  tradeSignal: {
    tp: 89833,
    sl: 89833,
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
    psychologicalAdvice: '시장 조건이 상대적으로 안정적입니다. 규율을 유지하세요',
    mentalNote: '인내는 약점이 아니다—전략적 강점이다. 최고의 트레이더는 거래하지 않을 때를 안다.',
  },
  gptReporterAnalysis: '현재 CryptoQuant 데이터는 트레이더들이 운영하는 심리적 환경을 이해하는 데 중요한 시장 센티먼트와 행동의 스냅샷을 제공합니다. 데이터와 그 심리적 의미를 분석해보겠습니다:\n\n### 온체인 지표의 심리적 해석\n\n1. 유입 및 MPI: 9867 BTC의 유입은 많은 투자자들이 자산을 거래소로 이동시키고 있음을 시사하며, 잠재적으로 매도할 준비를 하고 있을 수 있습니다. 이러한 행동은 종종 추가 가격 하락에 대한 우려로 인한 공포에서 비롯됩니다.\n\n2. 채굴자 포지션 지수 (MPI): -0.791의 MPI는 채굴자들이 코인을 보유하고 있음을 나타냅니다. 이는 일반적으로 채굴자들이 현재 가격을 매도에 유리하지 않다고 인식하고 있음을 시사하며, 더 신중하거나 낙관적인 전망을 반영합니다.\n\n3. 가격 변동 (-1.91% / 24h): 가격 하락은 공포를 악화시킬 수 있으며...',
  grokXAnalysis: '현재 X(Twitter) 센티먼트는 Extreme Fear 상태를 보여주고 있습니다. 트레이더들은 시장의 불확실성에 대해 우려하고 있으며, 많은 사람들이 방어적 자세를 취하고 있습니다.',
  hasGeminiContent: false,
};

/**
 * 韓国語版有料版メッセージテスト配信
 */
async function testKoRegularDelivery() {
  console.log('🚀 Korean Paid Version (Regular Briefing) Test Delivery\n');
  console.log('='.repeat(80));
  console.log('⚠️  Warning: This script will actually send a message to Telegram');
  console.log('⚠️  This script sends ONLY to Korean (KO) channel');
  console.log('⚠️  If you received messages in all languages, the cron job may have been triggered\n');

  try {
    // テンプレートを読み込む
    const { formatRegularBriefing } = require(
      '../services/telegram/messages/user/ko/regular.ko'
    );

    // メッセージを生成
    const message = formatRegularBriefing({
      ...TEST_DATA,
      lang: 'ko',
    });

    console.log('📝 Generated Message:');
    console.log('='.repeat(80));
    console.log(message);
    console.log('='.repeat(80));
    console.log(`\nCharacter Count: ${message.length} characters\n`);

    // 環境変数の確認
    console.log('🔍 Environment Variables Check:');
    const regularChannelId = process.env.TELEGRAM_CHAT_ID_REGULAR_KO || process.env.TELEGRAM_CHAT_ID_BTC_KO;
    console.log(`  TELEGRAM_CHAT_ID_REGULAR_KO: ${regularChannelId || '❌ Not Set'}`);
    console.log(`  TELEGRAM_CHAT_ID_BTC_KO: ${process.env.TELEGRAM_CHAT_ID_BTC_KO || '❌ Not Set'}`);
    console.log(`  TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ Not Set'}`);
    console.log('');

    // Telegramに送信
    console.log('📤 Sending to Telegram...\n');
    const result = await sendMessageToChannel(message, 'BTC', 'KO');
    
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
  testKoRegularDelivery().catch((error) => {
    console.error('❌ Error during test delivery:', error);
    process.exit(1);
  });
}

module.exports = { testKoRegularDelivery };
