#!/usr/bin/env node
/**
 * 日本語版メッセージのフォーマット確認
 */

const { formatMinimalHighQualityBriefing } = require('../services/telegram/messages/user/ja/minimal-high-quality.ja.js');
const { formatRegularBriefing } = require('../services/telegram/messages/user/ja/regular.ja.js');

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
console.log('📱 無料版（Minimal Version）メッセージ');
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
  lang: 'ja',
});

console.log(minimalMessage);
console.log('');
console.log('='.repeat(80));
console.log('💎 有料版（Regular Briefing）メッセージ');
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
    psychologicalAdvice: '✅ 中立状態 - メンタルブロック未検出: 市場センチメントはバランスが取れています。極端な感情は検知されていません。条件は安定しています。',
  },
  gptReporterAnalysis: null,
  grokXAnalysis: null,
  aiAnalysis: null,
  lang: 'ja',
});

console.log(regularMessage);
console.log('');
console.log('='.repeat(80));
console.log('✅ メッセージ生成完了');
console.log('='.repeat(80));
