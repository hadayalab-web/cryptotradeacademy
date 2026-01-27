#!/usr/bin/env node
/**
 * 韓国語版メッセージのフォーマット確認
 */

const { formatMinimalHighQualityBriefing } = require('../services/telegram/messages/user/ko/minimal-high-quality.ko.js');
const { formatRegularBriefing } = require('../services/telegram/messages/user/ko/regular.ko.js');

// ユーザー提供のサンプルデータ
const testData = {
  now: new Date('2026-01-26T06:00:22Z'),
  trapScore: 25,
  priceUsd: 87760,
  change24h: -0.75,
  inflow: 987,
  mpi: -1.32,
  sentimentLabel: 'Extreme Fear',
  score: -6,
};

console.log('='.repeat(80));
console.log('📱 무료 버전 (Minimal Version) 메시지');
console.log('='.repeat(80));
console.log('');

const minimalMessage = formatMinimalHighQualityBriefing({
  now: testData.now,
  trapScore: testData.trapScore,
  priceUsd: testData.priceUsd,
  change24h: testData.change24h,
  trapData: {
    exchangeNetflow: testData.inflow,
  },
  marketData: {
    mpi: testData.mpi,
  },
  sentimentData: {
    sentiment: testData.sentimentLabel,
  },
  lang: 'ko',
});

console.log(minimalMessage);
console.log('');
console.log('='.repeat(80));
console.log('💎 유료 버전 (Regular Briefing) 메시지');
console.log('='.repeat(80));
console.log('');

const regularMessage = formatRegularBriefing({
  now: testData.now,
  inflow: testData.inflow,
  mpi: testData.mpi,
  sentimentLabel: testData.sentimentLabel,
  priceUsd: testData.priceUsd,
  change24h: testData.change24h,
  score: testData.score,
  tradeSignal: {
    signal: 'STANDBY',
    tp: null,
    sl: null,
    rr: null,
  },
  trap: {
    isTrap: false,
    confidence: 'LOW',
    label: 'No trap detected',
  },
  trapDetection: {
    trapDetected: false,
    trapScore: testData.trapScore,
    trapSeverity: 'LOW',
    trapType: null,
  },
  trapAlert: null,
  psychologicalSupport: {
    psychologicalState: 'NEUTRAL',
    psychologicalRisk: 'LOW',
    psychologicalAdvice: '✅ 중립 상태 - 정신적 블록 미검출: 시장 센티먼트가 균형을 이루고 있습니다. 극단적인 감정은 감지되지 않았습니다. 조건이 안정적입니다.',
  },
  gptReporterAnalysis: null,
  grokXAnalysis: null,
  aiAnalysis: null,
  lang: 'ko',
});

console.log(regularMessage);
console.log('');
console.log('='.repeat(80));
console.log('✅ 메시지 생성 완료');
console.log('='.repeat(80));
