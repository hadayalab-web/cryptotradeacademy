// scripts/test-es-delivery.js
// ES版の無料版（Minimal Version）と有料版（Regular Briefing）のメッセージUI確認

const path = require('path');

// ES版のテンプレートを読み込む
function loadESTemplates() {
  const regularPath = path.join(
    __dirname,
    '..',
    'services',
    'telegram',
    'messages',
    'user',
    'es',
    'regular.es.js'
  );
  const minimalPath = path.join(
    __dirname,
    '..',
    'services',
    'telegram',
    'messages',
    'user',
    'es',
    'minimal-high-quality.es.js'
  );

  const templates = {
    regular: null,
    minimal: null,
  };

  try {
    const regularModule = require(regularPath);
    templates.regular = regularModule.formatRegularBriefing;
  } catch (error) {
    console.error(`❌ Failed to load regular template:`, error.message);
  }

  try {
    const minimalModule = require(minimalPath);
    templates.minimal = minimalModule.formatMinimalHighQualityBriefing;
  } catch (error) {
    console.error(`❌ Failed to load minimal-high-quality template:`, error.message);
  }

  return templates;
}

// テストデータ
const TEST_DATA = {
  now: new Date(),
  inflow: 584, // BTC単位
  mpi: -0.63,
  sentimentLabel: 'NEUTRAL',
  priceUsd: 95000,
  change24h: -0.46,
  score: -10,
  tradeSignal: {
    tp: null,
    sl: null,
    rr: null,
  },
  trap: {
    isTrap: false,
    confidence: 'LOW',
  },
  aiAnalysis: 'Market shows minimal trap indicators. Current market conditions appear relatively safe with low trap risk.',
  stats: {},
  noTradeAlert: null,
  trapRisk: {
    trapRiskScore: 15,
    riskLevel: 'LOW',
  },
  exitMap: null,
  trapDetection: {
    trapScore: 15,
    trapDetected: false,
    trapSeverity: 'LOW',
  },
  marketBug: null,
  trapAlert: null,
  divergenceSignal: null,
  psychologicalSupport: null, // フォールバックメッセージをテストするためnull
  hasGeminiContent: false,
  gptReporterAnalysis: 'On-chain metrics show a "Wait-and-See" mode. Market conditions are stable, but remain vigilant for trap patterns.',
  grokXAnalysis: null,
};

// Trap Data（無料版用）
const TRAP_DATA = {
  trapAlert: null,
  exchangeNetflow: 584, // BTC単位
  whaleRatio: 0.66,
};

// Market Data（無料版用）
const MARKET_DATA = {
  mpi: -0.63,
  priceUsd: 95000,
  change24h: -0.46,
};

// Sentiment Data（無料版用）
const SENTIMENT_DATA = {
  sentiment: 'NEUTRAL',
};

/**
 * ES版の有料版（Regular Briefing）メッセージを生成して表示
 */
function testRegularBriefing() {
  console.log('\n📧 ===== ES版 有料版（Regular Briefing）メッセージUI確認 =====\n');
  
  const templates = loadESTemplates();
  
  if (!templates.regular) {
    console.error('❌ 有料版テンプレートが見つかりません');
    return;
  }

  try {
    const message = templates.regular(TEST_DATA);
    
    console.log('━━━━━━━━━━━━━━━━━━━━');
    console.log('📄 メッセージ内容:');
    console.log('━━━━━━━━━━━━━━━━━━━━');
    console.log(message);
    console.log('━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n文字数: ${message.length}文字`);
    
    // チェックポイント
    console.log('\n✅ チェックポイント:');
    console.log(`  • Dr. Grokフォールバックメッセージが含まれている: ${message.includes('Estado Psicológico: 😐 NEUTRAL') ? '✅' : '❌'}`);
    console.log(`  • Dr. GrokのMental Noteが含まれている: ${message.includes('Nota Mental de Dr. Grok') ? '✅' : '❌'}`);
    console.log(`  • Exchange NetflowがBTC単位で表示されている: ${message.includes('BTC') ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('❌ メッセージ生成エラー:', error.message);
    console.error(error.stack);
  }
}

/**
 * ES版の無料版（Minimal Version）メッセージを生成して表示
 */
function testMinimalBriefing() {
  console.log('\n🆓 ===== ES版 無料版（Minimal Version）メッセージUI確認 =====\n');
  
  const templates = loadESTemplates();
  
  if (!templates.minimal) {
    console.error('❌ 無料版テンプレート（minimal-high-quality.es.js）が見つかりません');
    return;
  }

  try {
    const message = templates.minimal({
      now: TEST_DATA.now,
      trapScore: 15,
      priceUsd: TEST_DATA.priceUsd,
      change24h: TEST_DATA.change24h,
      trapData: TRAP_DATA,
      marketData: MARKET_DATA,
      sentimentData: SENTIMENT_DATA,
      lang: 'es',
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━');
    console.log('📄 メッセージ内容:');
    console.log('━━━━━━━━━━━━━━━━━━━━');
    console.log(message);
    console.log('━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n文字数: ${message.length}文字`);
    
    // チェックポイント
    console.log('\n✅ チェックポイント:');
    console.log(`  • Exchange NetflowがBTC単位で表示されている: ${message.includes('BTC') && message.includes('Flujo neto de exchanges') ? '✅' : '❌'}`);
    console.log(`  • VSL2リンクが含まれていない: ${!message.includes('youtu.be') && !message.includes('youtube.com') ? '✅' : '❌'}`);
    console.log(`  • Whopリンクが含まれていない: ${!message.includes('whop.com') ? '✅' : '❌'}`);
    console.log(`  • Dr. Grokコメントが含まれている: ${message.includes('Dr. Grok') || message.includes('paciencia') ? '✅' : '❌'}`);
    console.log(`  • Mental Noteが含まれている: ${message.includes('Mental Note') || message.includes('70% del tiempo') ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('❌ メッセージ生成エラー:', error.message);
    console.error(error.stack);
  }
}

/**
 * メイン実行関数
 */
function main() {
  console.log('🚀 ES版メッセージUI確認を開始します...\n');
  
  // 有料版（Regular Briefing）のテスト
  testRegularBriefing();
  
  // 少し待機（ログの見やすさのため）
  console.log('\n');
  
  // 無料版（Minimal Version）のテスト
  testMinimalBriefing();
  
  console.log('\n✅ ES版メッセージUI確認が完了しました');
}

// スクリプトが直接実行された場合
if (require.main === module) {
  main();
}

module.exports = { testRegularBriefing, testMinimalBriefing };
