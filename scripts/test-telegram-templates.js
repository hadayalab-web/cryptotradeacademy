// scripts/test-telegram-templates.js
// 各言語市場のTelegramメッセージテンプレートテスト

const { formatRegularBriefing } = require('../services/telegram/messages/user/en/regular.en');
const { formatRegularBriefing: formatRegularBriefingAR } = require('../services/telegram/messages/user/ar/regular.ar');
const { formatRegularBriefing: formatRegularBriefingES } = require('../services/telegram/messages/user/es/regular.es');
const { formatRegularBriefing: formatRegularBriefingJA } = require('../services/telegram/messages/user/ja/regular.ja');
const { formatRegularBriefing: formatRegularBriefingKO } = require('../services/telegram/messages/user/ko/regular.ko');
const { formatRegularBriefing: formatRegularBriefingPTBR } = require('../services/telegram/messages/user/pt-br/regular.pt-br');

const { detectNoTrade } = require('../logic/tier1_btc/noTradeDetector');
const { calculateTrapRisk } = require('../logic/tier1_btc/trapRiskScorer');
const { generateExitMap } = require('../logic/tier1_btc/exitMap');

// テスト用のモックデータ
const now = new Date();
const mockData = {
  now,
  inflow: -158,
  mpi: -1.22,
  sentimentLabel: 'Fear',
  priceUsd: 92466,
  change24h: 1.14,
  score: 3,
  tradeSignal: {
    signal: 'BUY',
    entry: 92466,
    tp: 95000,
    sl: 91000,
    rr: 1.5,
  },
  trap: {
    isTrap: false,
    confidence: 'LOW',
  },
  aiAnalysis: 'Test analysis from Dr. Grok',
};

// Phase1-Productデータの生成
const trapRiskResult = calculateTrapRisk({
  priceChange: 1.14,
  volume: 0,
  inflow: -158,
  mpi: -1.22,
  whaleBias: 0,
  retailFomo: 50,
  newsImpact: 0,
  market: 'EN',
});

const noTradeResult = detectNoTrade({
  priceUsd: 92466,
  change24h: 1.14,
  inflow: -158,
  mpi: -1.22,
  whaleBias: 0,
  retailFomo: 50,
  volume: 0,
  trapRisk: trapRiskResult.trapRiskScore,
  market: 'EN',
});

const exitMapResult = generateExitMap({
  priceUsd: 92466,
  signal: 'BUY',
  entry: 92466,
  tp: 95000,
  sl: 91000,
  trapRisk: trapRiskResult.trapRiskScore,
  market: 'EN',
});

const testData = {
  ...mockData,
  noTradeAlert: noTradeResult,
  trapRisk: trapRiskResult,
  exitMap: exitMapResult,
};

// EN市場テスト
console.log('=== EN Market Template Test ===');
try {
  const enMessage = formatRegularBriefing(testData);
  console.log('✅ EN template generated successfully');
  console.log('Message length:', enMessage.length, 'characters');
  console.log('First 500 characters:', enMessage.substring(0, 500));
  console.log('');
} catch (error) {
  console.error('❌ EN template error:', error.message);
  console.error(error.stack);
  console.log('');
}

// AR市場テスト
console.log('=== AR Market Template Test ===');
try {
  const arMessage = formatRegularBriefingAR(testData);
  console.log('✅ AR template generated successfully');
  console.log('Message length:', arMessage.length, 'characters');
  console.log('First 500 characters:', arMessage.substring(0, 500));
  console.log('');
} catch (error) {
  console.error('❌ AR template error:', error.message);
  console.error(error.stack);
  console.log('');
}

// ES市場テスト
console.log('=== ES Market Template Test ===');
try {
  const esMessage = formatRegularBriefingES(testData);
  console.log('✅ ES template generated successfully');
  console.log('Message length:', esMessage.length, 'characters');
  console.log('First 500 characters:', esMessage.substring(0, 500));
  console.log('');
} catch (error) {
  console.error('❌ ES template error:', error.message);
  console.error(error.stack);
  console.log('');
}

// JA市場テスト
console.log('=== JA Market Template Test ===');
try {
  const jaMessage = formatRegularBriefingJA({
    ...testData,
    riskReward: 1.5,
    nupl: 0.5,
    sopr30d: 1.02,
  });
  console.log('✅ JA template generated successfully');
  console.log('Message length:', jaMessage.length, 'characters');
  console.log('First 500 characters:', jaMessage.substring(0, 500));
  console.log('');
} catch (error) {
  console.error('❌ JA template error:', error.message);
  console.error(error.stack);
  console.log('');
}

// KO市場テスト
console.log('=== KO Market Template Test ===');
try {
  const koMessage = formatRegularBriefingKO({
    ...testData,
    kimchiPremium: 0.05,
    upbitPrice: 120000000,
    binancePrice: 92466,
  });
  console.log('✅ KO template generated successfully');
  console.log('Message length:', koMessage.length, 'characters');
  console.log('First 500 characters:', koMessage.substring(0, 500));
  console.log('');
} catch (error) {
  console.error('❌ KO template error:', error.message);
  console.error(error.stack);
  console.log('');
}

// PT-BR市場テスト
console.log('=== PT-BR Market Template Test ===');
try {
  const ptbrMessage = formatRegularBriefingPTBR(testData);
  console.log('✅ PT-BR template generated successfully');
  console.log('Message length:', ptbrMessage.length, 'characters');
  console.log('First 500 characters:', ptbrMessage.substring(0, 500));
  console.log('');
} catch (error) {
  console.error('❌ PT-BR template error:', error.message);
  console.error(error.stack);
  console.log('');
}

console.log('✅ All template tests completed!');
