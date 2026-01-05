// scripts/test-phase1-product.js
// Phase1-Product機能のテストスクリプト

const { detectNoTrade } = require('../logic/tier1_btc/noTradeDetector');
const { calculateTrapRisk } = require('../logic/tier1_btc/trapRiskScorer');
const { generateExitMap } = require('../logic/tier1_btc/exitMap');

// テスト用のモックデータ
const mockMarketData = {
  priceUsd: 92466,
  change24h: 1.14,
  inflow: -158,
  mpi: -1.22,
  whaleBias: 0,
  retailFomo: 50,
  volume: 0,
  newsImpact: 0,
};

// テストケース1: NO TRADEアラート（クジラ流入検知）
console.log('=== Test Case 1: NO TRADE Alert (Whale Inflow) ===');
const noTradeResult1 = detectNoTrade({
  ...mockMarketData,
  inflow: 2500, // 大きなクジラ流入
  market: 'EN',
});
console.log('NO TRADE Result:', JSON.stringify(noTradeResult1, null, 2));
console.log('');

// テストケース2: Trap Riskスコア（高リスク）
console.log('=== Test Case 2: Trap Risk Score (High Risk) ===');
const trapRiskResult1 = calculateTrapRisk({
  priceChange: 6.5,
  volume: 0,
  inflow: -200,
  mpi: -2.5,
  whaleBias: 0,
  retailFomo: 80,
  newsImpact: 0,
  market: 'EN',
});
console.log('Trap Risk Result:', JSON.stringify(trapRiskResult1, null, 2));
console.log('');

// テストケース3: Exit Map（LONGポジション）
console.log('=== Test Case 3: Exit Map (LONG Position) ===');
const exitMapResult1 = generateExitMap({
  priceUsd: 92466,
  signal: 'BUY',
  entry: 92000,
  tp: 95000,
  sl: 91000,
  trapRisk: 45,
  market: 'EN',
});
console.log('Exit Map Result:', JSON.stringify(exitMapResult1, null, 2));
console.log('');

// テストケース4: Exit Map（SHORTポジション）
console.log('=== Test Case 4: Exit Map (SHORT Position) ===');
const exitMapResult2 = generateExitMap({
  priceUsd: 92466,
  signal: 'SELL',
  entry: 93000,
  tp: 90000,
  sl: 94000,
  trapRisk: 30,
  market: 'EN',
});
console.log('Exit Map Result:', JSON.stringify(exitMapResult2, null, 2));
console.log('');

// テストケース5: Exit Map（NONEシグナル）
console.log('=== Test Case 5: Exit Map (NONE Signal) ===');
const exitMapResult3 = generateExitMap({
  priceUsd: 92466,
  signal: 'NONE',
  entry: null,
  tp: null,
  sl: null,
  trapRisk: 0,
  market: 'EN',
});
console.log('Exit Map Result:', JSON.stringify(exitMapResult3, null, 2));
console.log('');

// テストケース6: 各言語市場でのNO TRADEアラート
console.log('=== Test Case 6: NO TRADE Alert (All Markets) ===');
const markets = ['EN', 'AR', 'ES', 'JA', 'KO', 'PT-BR'];
markets.forEach(market => {
  const result = detectNoTrade({
    ...mockMarketData,
    trapRisk: 70, // 高リスク
    market,
  });
  console.log(`${market}: shouldNoTrade=${result.shouldNoTrade}, confidence=${result.confidence}, riskScore=${result.riskScore}`);
});
console.log('');

console.log('✅ All tests completed!');
