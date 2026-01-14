#!/usr/bin/env node
/**
 * 有料版・無料版 全6言語 配信テスト・メッセージUI確認スクリプト
 * 本番環境を想定したテストデータで各言語のメッセージを生成し、UIを確認
 */

const fs = require('fs');
const path = require('path');

// 言語リスト
const LANGUAGES = ['en', 'ja', 'ko', 'es', 'pt-br', 'ar'];
const LANGUAGE_NAMES = {
  'en': 'English',
  'ja': '日本語',
  'ko': '한국어',
  'es': 'Español',
  'pt-br': 'Português (Brasil)',
  'ar': 'العربية',
};

// 本番環境を想定したテストデータ
const TEST_DATA = {
  now: new Date(),
  inflow: -1250.5,
  mpi: 0.65,
  sentimentLabel: 'NEUTRAL',
  priceUsd: 43250,
  change24h: 2.35,
  score: 15,
  tradeSignal: 'STANDBY',
  trap: {
    isTrap: false,
    confidence: 'LOW',
  },
  trapScore: 35, // 低リスク
  whaleFlows: {
    whaleRatio: 0.42,
    netFlow: -850,
  },
  liquidations: {
    long: 12500000,
    short: 8900000,
  },
  trapDetection: {
    trapScore: 35,
    riskLevel: 'LOW',
    signals: ['MINIMAL_TRAP_INDICATORS'],
  },
  psychologicalSupport: {
    diagnosis: 'Market conditions are stable. Maintain discipline.',
    recommendation: 'Continue monitoring. No immediate action needed.',
  },
  gptReporterAnalysis: 'Market shows minimal trap indicators. Current market conditions appear relatively safe with low trap risk.',
  grokXAnalysis: {
    sentiment: 'NEUTRAL',
    risk: 'LOW',
  },
  showContent: {
    opening: 'Welcome to Trap Defense BTC briefing.',
    trapScore: 35,
    whatToAvoid: 'No major traps detected.',
    evidence: ['Low whale activity', 'Stable sentiment'],
    mentalNote: 'Stay disciplined. Market is relatively safe.',
    callToAction: 'Continue monitoring for changes.',
  },
  hasGeminiContent: true,
};

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
    if (fs.existsSync(regularPath)) {
      const regularModule = require(regularPath);
      templates.regular = regularModule.formatRegularBriefing;
    }
  } catch (error) {
    console.error(`❌ Failed to load regular template for ${lang}:`, error.message);
  }

  try {
    // 無料版（minimal）
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
    if (fs.existsSync(minimalPath)) {
      const minimalModule = require(minimalPath);
      templates.minimal = minimalModule.formatMinimalBriefing;
    }
  } catch (error) {
    console.error(`❌ Failed to load minimal template for ${lang}:`, error.message);
  }

  return templates;
}

/**
 * メッセージを生成して表示
 */
function generateAndDisplayMessages() {
  console.log('🚀 有料版・無料版 全6言語 配信テスト・メッセージUI確認\n');
  console.log('='.repeat(80));
  console.log('本番環境を想定したテストデータを使用します\n');

  const results = {};

  for (const lang of LANGUAGES) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 ${LANGUAGE_NAMES[lang]} (${lang.toUpperCase()})`);
    console.log('='.repeat(80));

    const templates = loadTemplates(lang);

    // 有料版メッセージ生成
    if (templates.regular) {
      try {
        const regularMessage = templates.regular({
          ...TEST_DATA,
          lang,
        });

        console.log('\n✅ 有料版（Regular）メッセージ:');
        console.log('-'.repeat(80));
        console.log(regularMessage);
        console.log('-'.repeat(80));
        console.log(`文字数: ${regularMessage.length}文字`);

        results[lang] = results[lang] || {};
        results[lang].regular = {
          success: true,
          message: regularMessage,
          length: regularMessage.length,
        };
      } catch (error) {
        console.error(`❌ 有料版メッセージ生成エラー:`, error.message);
        results[lang] = results[lang] || {};
        results[lang].regular = {
          success: false,
          error: error.message,
        };
      }
    } else {
      console.warn('⚠️ 有料版テンプレートが見つかりません');
      results[lang] = results[lang] || {};
      results[lang].regular = {
        success: false,
        error: 'Template not found',
      };
    }

    // 無料版メッセージ生成
    if (templates.minimal) {
      try {
        const minimalMessage = templates.minimal({
          now: TEST_DATA.now,
          trapScore: TEST_DATA.trapScore,
          priceUsd: TEST_DATA.priceUsd,
          change24h: TEST_DATA.change24h,
          lang,
        });

        console.log('\n✅ 無料版（Minimal）メッセージ:');
        console.log('-'.repeat(80));
        console.log(minimalMessage);
        console.log('-'.repeat(80));
        console.log(`文字数: ${minimalMessage.length}文字`);

        results[lang] = results[lang] || {};
        results[lang].minimal = {
          success: true,
          message: minimalMessage,
          length: minimalMessage.length,
        };
      } catch (error) {
        console.error(`❌ 無料版メッセージ生成エラー:`, error.message);
        results[lang] = results[lang] || {};
        results[lang].minimal = {
          success: false,
          error: error.message,
        };
      }
    } else {
      console.warn('⚠️ 無料版テンプレートが見つかりません');
      results[lang] = results[lang] || {};
      results[lang].minimal = {
        success: false,
        error: 'Template not found',
      };
    }
  }

  // サマリー表示
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(80));

  const summary = {
    total: LANGUAGES.length,
    regularSuccess: 0,
    regularFailed: 0,
    minimalSuccess: 0,
    minimalFailed: 0,
  };

  for (const lang of LANGUAGES) {
    const result = results[lang];
    if (result?.regular?.success) {
      summary.regularSuccess++;
    } else {
      summary.regularFailed++;
    }
    if (result?.minimal?.success) {
      summary.minimalSuccess++;
    } else {
      summary.minimalFailed++;
    }
  }

  console.log(`\n有料版（Regular）:`);
  console.log(`  ✅ 成功: ${summary.regularSuccess}/${summary.total}`);
  console.log(`  ❌ 失敗: ${summary.regularFailed}/${summary.total}`);

  console.log(`\n無料版（Minimal）:`);
  console.log(`  ✅ 成功: ${summary.minimalSuccess}/${summary.total}`);
  console.log(`  ❌ 失敗: ${summary.minimalFailed}/${summary.total}`);

  // 詳細結果をファイルに保存
  const outputDir = path.join(__dirname, '..', 'data', 'test-results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(
    outputDir,
    `all-languages-messages-test-${Date.now()}.json`
  );

  fs.writeFileSync(
    outputFile,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        testData: TEST_DATA,
        results,
        summary,
      },
      null,
      2
    ),
    'utf-8'
  );

  console.log(`\n📄 詳細結果を保存しました: ${outputFile}`);

  // 成功/失敗の詳細
  console.log('\n' + '='.repeat(80));
  console.log('詳細結果:');
  console.log('='.repeat(80));

  for (const lang of LANGUAGES) {
    const result = results[lang];
    console.log(`\n${LANGUAGE_NAMES[lang]} (${lang.toUpperCase()}):`);
    console.log(`  有料版: ${result?.regular?.success ? '✅' : '❌'} ${result?.regular?.error || `(${result?.regular?.length}文字)`}`);
    console.log(`  無料版: ${result?.minimal?.success ? '✅' : '❌'} ${result?.minimal?.error || `(${result?.minimal?.length}文字)`}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ テスト完了');
  console.log('='.repeat(80));
}

// メイン実行
try {
  generateAndDisplayMessages();
} catch (error) {
  console.error('❌ エラー:', error);
  process.exit(1);
}
