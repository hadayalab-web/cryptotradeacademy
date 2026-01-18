// scripts/test-message-ui-only.js
// メッセージ生成のみのUI確認スクリプト（API呼び出しなし、高速）

const path = require('path');

/**
 * 言語別のテンプレートを読み込む
 */
function loadTemplates(lang) {
  const templates = {
    regular: null,
    minimal: null,
  };

  try {
    // 有料版（regular）
    const regularPath = path.join(
      __dirname,
      '..',
      'services',
      'telegram',
      'messages',
      'user',
      lang,
      `regular.${lang}.js`
    );
    if (require('fs').existsSync(regularPath)) {
      const regularModule = require(regularPath);
      templates.regular = regularModule.formatRegularBriefing;
    }
  } catch (error) {
    console.error(`❌ Failed to load regular template for ${lang}:`, error.message);
  }

  try {
    // 無料版（minimal-high-quality版を優先、なければminimal版）
    const minimalHighQualityPath = path.join(
      __dirname,
      '..',
      'services',
      'telegram',
      'messages',
      'user',
      lang,
      `minimal-high-quality.${lang}.js`
    );
    if (require('fs').existsSync(minimalHighQualityPath)) {
      const minimalModule = require(minimalHighQualityPath);
      templates.minimal = minimalModule.formatMinimalHighQualityBriefing;
    } else {
      const minimalPath = path.join(
        __dirname,
        '..',
        'services',
        'telegram',
        'messages',
        'user',
        lang,
        `minimal.${lang}.js`
      );
      if (require('fs').existsSync(minimalPath)) {
        const minimalModule = require(minimalPath);
        templates.minimal = minimalModule.formatMinimalBriefing;
      }
    }
  } catch (error) {
    console.error(`❌ Failed to load minimal template for ${lang}:`, error.message);
  }

  return templates;
}

// テストデータ（実際のデータに近い値）
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
  whaleRatio: null, // nullの場合は表示されないことを確認
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
 * メッセージを生成して検証（簡潔版）
 */
function testLanguage(lang, langName, templates = null) {
  const results = {
    lang: langName,
    regular: { ok: false, errors: [], preview: '' },
    minimal: { ok: false, errors: [], preview: '' },
  };

  if (!templates) {
    templates = loadTemplates(lang);
  }

  // 有料版メッセージ生成
  if (templates.regular) {
    try {
      const regularMessage = templates.regular(TEST_DATA);
      results.regular.ok = true;
      results.regular.preview = regularMessage.substring(0, 200) + '...';
      
      // 簡潔なチェック
      const hasFallback = regularMessage.includes('NEUTRAL') && 
        (regularMessage.includes('BAJO') || regularMessage.includes('BAIXO') || regularMessage.includes('LOW') || regularMessage.includes('低'));
      const hasBTC = regularMessage.includes('BTC') && regularMessage.includes('584');
      
      if (!hasFallback) results.regular.errors.push('Dr. Grokフォールバックメッセージなし');
      if (!hasBTC) results.regular.errors.push('Exchange NetflowがBTC単位でない');
      
    } catch (error) {
      results.regular.errors.push(`生成エラー: ${error.message}`);
    }
  } else {
    results.regular.errors.push('テンプレートが見つかりません');
  }

  // 無料版メッセージ生成
  if (templates.minimal) {
    try {
      const minimalMessage = templates.minimal({
        now: TEST_DATA.now,
        trapScore: 15,
        priceUsd: TEST_DATA.priceUsd,
        change24h: TEST_DATA.change24h,
        trapData: TRAP_DATA,
        marketData: MARKET_DATA,
        sentimentData: SENTIMENT_DATA,
        lang: lang,
      });

      results.minimal.ok = true;
      results.minimal.preview = minimalMessage.substring(0, 200) + '...';
      
      // 簡潔なチェック
      const hasTrapScore = minimalMessage.includes('15/100') || minimalMessage.includes('/100');
      // Exchange Netflow: BTC単位で表示されているか（「数字 BTC」のパターンが含まれる）
      const hasBTC = /\d+\s*BTC/.test(minimalMessage);
      const noVSL2 = !minimalMessage.includes('youtu.be') && !minimalMessage.includes('youtube.com');
      const noWhop = !minimalMessage.includes('whop.com');
      const hasDrGrok = minimalMessage.includes('Dr. Grok') || minimalMessage.includes('paciencia') || 
                        minimalMessage.includes('paciência') || minimalMessage.includes('인내') || 
                        minimalMessage.includes('忍耐') || minimalMessage.includes('صبر');
      const hasMentalNote = minimalMessage.includes('Mental Note') || minimalMessage.includes('70%') || 
                           minimalMessage.includes('멘탈') || minimalMessage.includes('メンタル');
      
      if (!hasTrapScore) results.minimal.errors.push('Trap Scoreが表示されない');
      if (!hasBTC) results.minimal.errors.push('Exchange NetflowがBTC単位でない');
      if (!noVSL2) results.minimal.errors.push('VSL2リンクが含まれている');
      if (!noWhop) results.minimal.errors.push('Whopリンクが含まれている');
      if (!hasDrGrok) results.minimal.errors.push('Dr. Grokコメントなし');
      if (!hasMentalNote) results.minimal.errors.push('Mental Noteなし');
      
    } catch (error) {
      results.minimal.errors.push(`生成エラー: ${error.message}`);
    }
  } else {
    results.minimal.errors.push('テンプレートが見つかりません');
  }

  return results;
}

/**
 * メイン実行関数（最適化版）
 */
function main() {
  const startTime = Date.now();
  console.log('🚀 メッセージUI確認を開始します（高速モード）...\n');
  
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'pt-br', name: 'Português (Brasil)' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'ar', name: 'العربية' },
  ];

  const allResults = [];
  
  languages.forEach(({ code, name }) => {
    const result = testLanguage(code, name);
    allResults.push({ code, name, ...result });
  });

  // サマリー表示
  console.log('\n' + '='.repeat(80));
  console.log('📊 検証結果サマリー');
  console.log('='.repeat(80));
  
  allResults.forEach(({ name, regular, minimal }) => {
    const regularStatus = regular.ok && regular.errors.length === 0 ? '✅' : '❌';
    const minimalStatus = minimal.ok && minimal.errors.length === 0 ? '✅' : '❌';
    console.log(`\n${name}:`);
    console.log(`  有料版: ${regularStatus} ${regular.errors.length > 0 ? `(${regular.errors.join(', ')})` : ''}`);
    console.log(`  無料版: ${minimalStatus} ${minimal.errors.length > 0 ? `(${minimal.errors.join(', ')})` : ''}`);
  });

  const totalErrors = allResults.reduce((sum, r) => 
    sum + r.regular.errors.length + r.minimal.errors.length, 0);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(80));
  console.log(`✅ 完了: ${totalErrors === 0 ? 'すべて正常' : `${totalErrors}件のエラー`} (${elapsed}秒)`);
  console.log('='.repeat(80));
  
  // エラーがある場合のみ詳細を表示
  if (totalErrors > 0) {
    console.log('\n⚠️ エラー詳細:');
    allResults.forEach(({ name, regular, minimal }) => {
      if (regular.errors.length > 0 || minimal.errors.length > 0) {
        console.log(`\n${name}:`);
        if (regular.errors.length > 0) {
          console.log(`  有料版: ${regular.errors.join(', ')}`);
        }
        if (minimal.errors.length > 0) {
          console.log(`  無料版: ${minimal.errors.join(', ')}`);
        }
      }
    });
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  main();
}

module.exports = { testLanguage, loadTemplates };
