#!/usr/bin/env node
/**
 * 有料版メッセージの一部をマスクしてXに投稿するテスト
 * 証拠（プルーフ）として使用
 */

const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const { formatRegularBriefing } = require('../services/telegram/messages/user/en/regular.en');
const { postProofToX } = require('../services/x/proof-post');

// テストデータ（高リスクパターン）
const TEST_DATA = {
  now: new Date(),
  inflow: 9850,
  mpi: 3.25,
  sentimentLabel: 'FEAR',
  priceUsd: 38250,
  change24h: -6.85,
  score: -45,
  tradeSignal: {
    signal: 'STANDBY',
    tp: null,
    sl: null,
    rr: null,
  },
  trap: {
    isTrap: true,
    confidence: 'HIGH',
    label: 'Whale Trap',
  },
  trapScore: 78,
  whaleFlows: {
    whaleRatio: 0.88,
    isHighPressure: true,
    netFlow: 5200,
  },
  liquidations: {
    longLiquidations: 78000000,
    shortLiquidations: 24000000,
    totalLiquidations: 102000000,
  },
  trapDetection: {
    trapDetected: true,
    trapScore: 78,
    trapSeverity: 'HIGH',
    trapType: 'WHALE_TRAP',
    details: {
      multipleDivergences: 3,
      anomalyDetected: true,
      accelerationDetected: true,
      onchainSocialDivergence: 60,
      priceOnchainDivergence: true,
      priceSocialDivergence: true,
    },
  },
  trapAlert: {
    alert: true,
    severity: 'HIGH',
    recommendation: 'AVOID_LONG',
    type: 'AVOID_LONG',
    confidence: 0.82,
  },
  psychologicalSupport: {
    psychologicalState: 'FOMO',
    psychologicalRisk: 'HIGH',
    psychologicalAdvice: 'Slow down. High risk zone. Defense first.',
  },
  gptReporterAnalysis:
    'High-risk zone detected. On-chain inflow spike, elevated MPI, and fear sentiment suggest a trap-prone environment.',
  grokXAnalysis: 'High-risk sentiment signals are elevated. Avoid FOMO and protect capital.',
  showContent: {
    narrativeArc: {
      open: 'High-risk conditions detected. Market structure shows trap patterns.',
    },
    evidence: 'Trap Score: 78/100 indicates high trap risk.',
    analysis: {
      trapDefenseEngine: {
        process: 'The Trap Defense Engine detects strong divergences.',
      },
    },
  },
  aiAnalysis: 'High-risk trap zone. Avoid new positions.',
};

async function testProofPost() {
  console.log('🚀 有料版メッセージの一部をマスクしてXに投稿するテスト\n');
  console.log('='.repeat(80));
  console.log('⚠️ 注意: このスクリプトは実際にXにツイートを投稿します\n');

  // 有料版メッセージを生成
  console.log('📝 有料版メッセージを生成中...\n');
  const fullMessage = formatRegularBriefing({
    ...TEST_DATA,
    lang: 'en',
  });

  console.log('📊 完全メッセージの文字数:', fullMessage.length);
  console.log('📄 完全メッセージのプレビュー（最初の300文字）:');
  console.log('-'.repeat(80));
  console.log(fullMessage.substring(0, 300) + '...\n');
  console.log('-'.repeat(80) + '\n');

  // マスク済みメッセージを生成
  console.log('🎭 マスク済みメッセージを生成中...\n');
  const { maskMessageForProof } = require('../services/x/proof-post');
  const maskedText = maskMessageForProof(fullMessage, {
    trapScore: TEST_DATA.trapScore,
    trapDetection: TEST_DATA.trapDetection,
    trapAlert: TEST_DATA.trapAlert,
    lang: 'en',
  });

  console.log('📊 マスク済みメッセージの文字数:', maskedText.length);
  console.log('📄 マスク済みメッセージ:');
  console.log('-'.repeat(80));
  console.log(maskedText);
  console.log('-'.repeat(80) + '\n');

  // Xに投稿
  console.log('📤 Xに投稿中...\n');
  try {
    const result = await postProofToX(fullMessage, {
      trapScore: TEST_DATA.trapScore,
      trapDetection: TEST_DATA.trapDetection,
      trapAlert: TEST_DATA.trapAlert,
      lang: 'en',
    });

    console.log('✅ X投稿成功！');
    console.log(`   Tweet ID: ${result.id}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   投稿テキスト: ${result.text}\n`);

    console.log('='.repeat(80));
    console.log('✅ テスト完了');
    console.log('='.repeat(80));
    console.log('\n📋 次のステップ:');
    console.log('   1. Xで投稿を確認');
    console.log('   2. 証拠として適切に表示されているか確認');
    console.log('   3. 機密情報が適切にマスクされているか確認\n');
  } catch (error) {
    console.error('❌ X投稿エラー:', error.message);
    console.error('   スタック:', error.stack?.substring(0, 300) + '...\n');
    process.exit(1);
  }
}

testProofPost().catch((error) => {
  console.error('\n❌ 予期しないエラー:', error.message);
  if (error.stack) {
    console.error('スタックトレース:', error.stack.substring(0, 500));
  }
  process.exit(1);
});
