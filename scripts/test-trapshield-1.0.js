// scripts/test-trapshield-1.0.js
// TrapShield 1.0 実装内容のテストスクリプト

console.log('🧪 TrapShield 1.0 Implementation Test\n');

let testResults = {
  passed: 0,
  failed: 0,
  errors: [],
};

function assert(condition, message) {
  if (condition) {
    console.log(`✅ ${message}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${message}`);
    testResults.failed++;
    testResults.errors.push(message);
  }
}

// Test 1: Phase 2 - プロダクト名の変更
console.log('📋 Phase 2: プロダクト名の変更');
try {
  const { getMarketProfile } = require('../api/config/marketProfiles');
  const enProfile = getMarketProfile('EN');
  assert(enProfile.brandName === 'TrapShield', 'EN市場のブランド名がTrapShieldである');
  assert(enProfile.tagline === 'Spot traps before you fall', 'EN市場のタグラインが正しい');
  console.log('');
} catch (error) {
  console.log(`❌ Phase 2 テストエラー: ${error.message}`);
  testResults.failed++;
  testResults.errors.push(`Phase 2: ${error.message}`);
  console.log('');
}

// Test 2: Phase 4 - 配信頻度の変更（コード確認）
console.log('📋 Phase 4: 配信頻度の変更（コード確認）');
try {
  const fs = require('fs');
  const cronJsContent = fs.readFileSync('./api/cron.js', 'utf8');
  const hasCorrectHours = /REGULAR_HOURS\s*=\s*\[\s*0\s*,\s*12\s*\]/.test(cronJsContent);
  assert(hasCorrectHours, 'REGULAR_HOURSが[0, 12]に設定されている');
  const hasComment = /TrapShield 1.0.*1日6回.*2回/.test(cronJsContent);
  assert(hasComment, '変更コメントが記載されている');
  console.log('');
} catch (error) {
  console.log(`❌ Phase 4 テストエラー: ${error.message}`);
  testResults.failed++;
  testResults.errors.push(`Phase 4: ${error.message}`);
  console.log('');
}

// Test 3: Phase 3 - TelegramメッセージUIの最適化（モジュール読み込み確認）
console.log('📋 Phase 3: TelegramメッセージUIの最適化（モジュール読み込み確認）');
const markets = [
  { code: 'en', name: 'EN' },
  { code: 'ja', name: 'JA' },
  { code: 'ko', name: 'KO' },
  { code: 'ar', name: 'AR' },
  { code: 'es', name: 'ES' },
  { code: 'pt-br', name: 'PT-BR' },
];

for (const market of markets) {
  try {
    const { formatRegularBriefing } = require(`../services/telegram/messages/user/${market.code}/regular.${market.code}`);
    assert(typeof formatRegularBriefing === 'function', `${market.name}市場: formatRegularBriefing関数が存在する`);
  } catch (error) {
    console.log(`❌ ${market.name}市場 定期配信モジュール読み込みエラー: ${error.message}`);
    testResults.failed++;
    testResults.errors.push(`${market.name}市場 定期配信: ${error.message}`);
  }

  try {
    const { formatTrapAlert } = require(`../services/telegram/messages/user/${market.code}/emergency.${market.code}`);
    assert(typeof formatTrapAlert === 'function', `${market.name}市場: formatTrapAlert関数が存在する`);
  } catch (error) {
    console.log(`❌ ${market.name}市場 緊急配信モジュール読み込みエラー: ${error.message}`);
    testResults.failed++;
    testResults.errors.push(`${market.name}市場 緊急配信: ${error.message}`);
  }
}
console.log('');

// Test 4: Phase 3 - メッセージ構造の確認（EN市場サンプル）
console.log('📋 Phase 3: メッセージ構造の確認（EN市場サンプル）');
try {
  const { formatRegularBriefing } = require('../services/telegram/messages/user/en/regular.en');
  const testData = {
    now: new Date(),
    inflow: 100,
    mpi: 0.5,
    sentimentLabel: 'Neutral',
    priceUsd: 50000,
    change24h: 2.5,
    score: 50,
    tradeSignal: { signal: 'BUY', tp: 52000, sl: 48000, rr: 2.0 },
    trap: { isTrap: false },
    aiAnalysis: 'Test analysis for TrapShield 1.0',
  };
  const message = formatRegularBriefing(testData);
  assert(typeof message === 'string', 'メッセージが文字列として返される');
  assert(message.includes('TrapShield'), 'メッセージにTrapShieldブランド名が含まれる');
  assert(message.includes('TRADE SIGNAL'), 'メッセージにTRADE SIGNALセクションが含まれる');
  assert(message.includes('━━━'), 'メッセージに視覚的区切りが含まれる');
  assert(message.length > 0, 'メッセージが空でない');
  console.log('');
} catch (error) {
  console.log(`❌ メッセージ構造確認エラー: ${error.message}`);
  testResults.failed++;
  testResults.errors.push(`メッセージ構造: ${error.message}`);
  console.log('');
}

// Test 5: Phase 5 - GPT API統合（モジュール読み込み確認）
console.log('📋 Phase 5: GPT API統合（モジュール読み込み確認）');
try {
  const fs = require('fs');
  const openaiClientExists = fs.existsSync('./services/openai/client.js');
  assert(openaiClientExists, 'services/openai/client.jsが存在する');

  if (openaiClientExists) {
    const { analyzeMarketGPT, summarizeData } = require('../services/openai/client');
    assert(typeof analyzeMarketGPT === 'function', 'analyzeMarketGPT関数が存在する');
    assert(typeof summarizeData === 'function', 'summarizeData関数が存在する');
  }

  const grokClientContent = fs.readFileSync('./services/grok/client.js', 'utf8');
  const hasGPTIntegration = /openaiGPT|analyzeMarketGPT/.test(grokClientContent);
  assert(hasGPTIntegration, 'services/grok/client.jsにGPT API統合コードが含まれる');
  console.log('');
} catch (error) {
  console.log(`❌ Phase 5 テストエラー: ${error.message}`);
  testResults.failed++;
  testResults.errors.push(`Phase 5: ${error.message}`);
  console.log('');
}

// Test 6: 緊急配信メッセージ構造の確認（EN市場サンプル）
console.log('📋 Phase 3: 緊急配信メッセージ構造の確認（EN市場サンプル）');
try {
  const { formatTrapAlert } = require('../services/telegram/messages/user/en/emergency.en');
  const testData = {
    inflow: -500,
    mpi: -2.5,
    priceUsd: 50000,
    trap: {
      isTrap: true,
      confidence: 'HIGH',
      label: 'Whale Trap',
      side: 'SHORT',
    },
    aiAnalysis: 'High risk trap detected',
  };
  const message = formatTrapAlert(testData);
  assert(typeof message === 'string', '緊急配信メッセージが文字列として返される');
  assert(message.includes('TRAP ALERT') || message.includes('🚨'), '緊急配信メッセージに緊急性が示される');
  assert(message.includes('ACTION REQUIRED'), '緊急配信メッセージにACTION REQUIREDセクションが含まれる');
  assert(message.includes('━━━'), '緊急配信メッセージに視覚的区切りが含まれる');
  console.log('');
} catch (error) {
  console.log(`❌ 緊急配信メッセージ構造確認エラー: ${error.message}`);
  testResults.failed++;
  testResults.errors.push(`緊急配信メッセージ構造: ${error.message}`);
  console.log('');
}

// テスト結果サマリー
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 テスト結果サマリー');
console.log(`✅ 成功: ${testResults.passed}`);
console.log(`❌ 失敗: ${testResults.failed}`);
console.log(`📈 成功率: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (testResults.errors.length > 0) {
  console.log('\n❌ エラー詳細:');
  testResults.errors.forEach((error, index) => {
    console.log(`  ${index + 1}. ${error}`);
  });
}

if (testResults.failed === 0) {
  console.log('\n🎉 すべてのテストが成功しました！');
  process.exit(0);
} else {
  console.log(`\n⚠️ ${testResults.failed}件のテストが失敗しました。`);
  process.exit(1);
}

