// scripts/test-message-formats.js
// TrapShield 1.0 メッセージフォーマットの詳細テスト

console.log('🧪 TrapShield 1.0 Message Format Test\n');

const markets = [
  { code: 'en', name: 'EN' },
  { code: 'ja', name: 'JA' },
  { code: 'ko', name: 'KO' },
  { code: 'ar', name: 'AR' },
  { code: 'es', name: 'ES' },
  { code: 'pt-br', name: 'PT-BR' },
];

// テストデータ
const regularTestData = {
  now: new Date(),
  inflow: 150,
  mpi: 0.8,
  sentimentLabel: 'Neutral',
  priceUsd: 50000,
  change24h: 2.5,
  score: 55,
  tradeSignal: {
    signal: 'BUY',
    tp: 52000,
    sl: 48000,
    rr: 2.0,
  },
  trap: {
    isTrap: false,
  },
  aiAnalysis: 'Market shows moderate bullish signals. Watch for resistance at $52K. Risk-reward looks favorable.',
};

const emergencyTestData = {
  inflow: -800,
  mpi: -3.2,
  priceUsd: 49500,
  trap: {
    isTrap: true,
    confidence: 'HIGH',
    label: 'Whale Trap',
    side: 'SHORT',
    note: 'Large outflows detected',
    hint: 'Consider reducing leverage',
  },
  aiAnalysis: 'High risk trap zone detected. Immediate defensive action recommended.',
};

// 定期配信メッセージのテスト
console.log('📋 定期配信メッセージフォーマットテスト');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

for (const market of markets) {
  try {
    const { formatRegularBriefing } = require(`../services/telegram/messages/user/${market.code}/regular.${market.code}`);
    const message = formatRegularBriefing(regularTestData);
    
    console.log(`\n${market.name}市場 (${market.code}):`);
    console.log(`  長さ: ${message.length}文字`);
    console.log(`  TrapShield含む: ${message.includes('TrapShield') ? '✅' : '❌'}`);
    console.log(`  視覚的区切り含む: ${message.includes('━━━') ? '✅' : '❌'}`);
    
    // 構造確認（EN市場を基準に）
    if (market.code === 'en') {
      console.log(`  TRADE SIGNAL含む: ${message.includes('TRADE SIGNAL') ? '✅' : '❌'}`);
      console.log(`  MARKET STATUS含む: ${message.includes('MARKET STATUS') ? '✅' : '❌'}`);
      console.log(`  Key Metrics含む: ${message.includes('Key Metrics') ? '✅' : '❌'}`);
      console.log(`  AI Analysis含む: ${message.includes('AI Analysis') ? '✅' : '❌'}`);
    }
    
    // JA市場の文字数制限確認
    if (market.code === 'ja') {
      const withinLimit = message.length <= 300;
      console.log(`  300文字制限内: ${withinLimit ? '✅' : '❌'} (${message.length}文字)`);
    }
    
  } catch (error) {
    console.log(`\n${market.name}市場: ❌ エラー - ${error.message}`);
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 緊急配信メッセージフォーマットテスト');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

for (const market of markets) {
  try {
    const { formatTrapAlert } = require(`../services/telegram/messages/user/${market.code}/emergency.${market.code}`);
    const message = formatTrapAlert(emergencyTestData);
    
    console.log(`\n${market.name}市場 (${market.code}):`);
    console.log(`  長さ: ${message.length}文字`);
    console.log(`  緊急絵文字含む: ${message.includes('🚨') ? '✅' : '❌'}`);
    console.log(`  視覚的区切り含む: ${message.includes('━━━') ? '✅' : '❌'}`);
    
    // 構造確認（EN市場を基準に）
    if (market.code === 'en') {
      console.log(`  TRAP ALERT含む: ${message.includes('TRAP ALERT') ? '✅' : '❌'}`);
      console.log(`  ACTION REQUIRED含む: ${message.includes('ACTION REQUIRED') ? '✅' : '❌'}`);
      console.log(`  Market Data含む: ${message.includes('Market Data') ? '✅' : '❌'}`);
    }
    
  } catch (error) {
    console.log(`\n${market.name}市場: ❌ エラー - ${error.message}`);
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ メッセージフォーマットテスト完了');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

