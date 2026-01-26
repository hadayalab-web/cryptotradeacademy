#!/usr/bin/env node
/**
 * EN版の無料版・有料版メッセージを生成して確認
 */

const { formatMinimalHighQualityBriefing } = require('../services/telegram/messages/user/en/minimal-high-quality.en.js');
const { formatRegularBriefing } = require('../services/telegram/messages/user/en/regular.en.js');

// ユーザー提供のサンプルデータに基づくテストデータ
const testData = {
  now: new Date('2026-01-26T00:00:14Z'),
  trapScore: 0,
  priceUsd: 86562,
  change24h: -2.84,
  inflow: -41, // Exchange Netflow: Outflow 41 BTC
  mpi: -1.55,
  sentimentLabel: 'Extreme Fear',
  score: 4, // Market Score: 4/100
  whaleRatio: 0.576, // Whale Ratio: 57.6%
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
    whaleRatio: testData.whaleRatio,
  },
  marketData: {
    mpi: testData.mpi,
    score: testData.score,
  },
  sentimentData: {
    sentiment: testData.sentimentLabel,
  },
  lang: 'en',
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
  trapScore: testData.trapScore,
  whaleFlows: {
    whaleRatio: testData.whaleRatio,
    isHighPressure: false,
  },
  liquidations: null,
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
    psychologicalAdvice: '✅ 中立状態 - メンタルブロック未検出: 市場センチメントはバランスが取れています。極端な感情は検知されていません。条件は安定しています。\n\nメンタルコーチの洞察: これは理想的な状態です。メンタルブロックが判断を曇らせていません。監視を継続してください。規律を維持し、高確率のセットアップを待ってください。トレーダーとしてのあなたの潜在能力は、この冷静な状態を維持できるときに輝きます。資金の保護を続けてください。素晴らしいです。',
  },
  gptReporterAnalysis: `📰 💡 Psychological Interpretation of On-Chain Metrics

The current CryptoQuant data reveals a market environment fraught with emotional turbulence. The inflow of -40.90 suggests a net outflow of assets from exchanges, indicating that traders are moving their holdings away from immediate liquidity, possibly in response to the perceived instability. The MPI (Miners' Position Index) at -1.55 typically signals that miners are holding rather than selling, which usually suggests a lack of confidence in the current price levels.…

You want to protect your capital, but traps are everywhere. The belief that "I must always trade" and "Waiting is weakness". This philosophical problem prevents you from following the 70% waiting strategy.`,
  grokXAnalysis: null,
  showContent: null,
  aiAnalysis: null,
  lang: 'en',
});

console.log(regularMessage);
console.log('');
console.log('='.repeat(80));
console.log('✅ メッセージ生成完了');
console.log('='.repeat(80));
