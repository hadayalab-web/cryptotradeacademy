#!/usr/bin/env node
/**
 * 有料版・無料版 全6言語 実際のTelegram配信テスト
 * 本番環境を想定したメッセージを実際にTelegramに送信
 */

const path = require('path');
const dotenv = require('dotenv');

// .envファイルを読み込む
const envPath = path.join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

const { sendMessageToChannel, sendMessageToAsset } = require('../services/telegram/bot');

// 言語リスト
const LANGUAGES = [
  { code: 'EN', lang: 'en', name: 'English', series: 'BTC' },
  { code: 'JA', lang: 'ja', name: '日本語', series: 'BTC' },
  { code: 'KO', lang: 'ko', name: '한국어', series: 'BTC' },
  { code: 'ES', lang: 'es', name: 'Español', series: 'BTC' },
  { code: 'PT_BR', lang: 'pt-br', name: 'Português (Brasil)', series: 'BTC' },
  { code: 'AR', lang: 'ar', name: 'العربية', series: 'BTC' },
];

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
  trapScore: 35,
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
    const regularModule = require(regularPath);
    templates.regular = regularModule.formatRegularBriefing;
  } catch (error) {
    console.error(`❌ Failed to load regular template for ${lang}:`, error.message);
  }

  try {
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
    const minimalModule = require(minimalPath);
    templates.minimal = minimalModule.formatMinimalBriefing;
  } catch (error) {
    console.error(`❌ Failed to load minimal template for ${lang}:`, error.message);
  }

  return templates;
}

/**
 * 実際のTelegram配信テスト
 */
async function testActualDelivery() {
  console.log('🚀 有料版・無料版 全6言語 実際のTelegram配信テスト\n');
  console.log('='.repeat(80));
  console.log('⚠️ 注意: このスクリプトは実際にTelegramにメッセージを送信します\n');

  const results = {};

  for (const langInfo of LANGUAGES) {
    const { code, lang, name, series } = langInfo;
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 ${name} (${code})`);
    console.log('='.repeat(80));

    const templates = loadTemplates(lang);

    // 有料版メッセージ生成と送信
    if (templates.regular) {
      try {
        const regularMessage = templates.regular({
          ...TEST_DATA,
          lang,
        });

        console.log(`\n📤 有料版メッセージを送信中...`);
        console.log(`   文字数: ${regularMessage.length}文字`);
        
        const paidResult = await sendMessageToChannel(regularMessage, series, code);
        const messageId = paidResult?.result?.message_id || paidResult?.message_id || 'N/A';
        const chatTitle = paidResult?.result?.chat?.title || paidResult?.chat?.title || 'N/A';
        
        console.log(`✅ 有料版メッセージ送信成功！`);
        console.log(`   Message ID: ${messageId}`);
        console.log(`   Chat: ${chatTitle}`);

        results[code] = results[code] || {};
        results[code].regular = {
          success: true,
          messageId,
          chatTitle,
          length: regularMessage.length,
        };
      } catch (error) {
        console.error(`❌ 有料版メッセージ送信エラー:`, error.message);
        results[code] = results[code] || {};
        results[code].regular = {
          success: false,
          error: error.message,
        };
      }
    }

    // 無料版メッセージ生成と送信
    if (templates.minimal) {
      try {
        const minimalMessage = templates.minimal({
          now: TEST_DATA.now,
          trapScore: TEST_DATA.trapScore,
          priceUsd: TEST_DATA.priceUsd,
          change24h: TEST_DATA.change24h,
          lang,
        });

        console.log(`\n📤 無料版メッセージを送信中...`);
        console.log(`   文字数: ${minimalMessage.length}文字`);

        const freeResult = await sendMessageToAsset(minimalMessage, 'MINIMAL');
        const messageId = freeResult?.result?.message_id || freeResult?.message_id || 'N/A';
        const chatTitle = freeResult?.result?.chat?.title || freeResult?.chat?.title || 'N/A';
        
        console.log(`✅ 無料版メッセージ送信成功！`);
        console.log(`   Message ID: ${messageId}`);
        console.log(`   Chat: ${chatTitle}`);

        results[code] = results[code] || {};
        results[code].minimal = {
          success: true,
          messageId,
          chatTitle,
          length: minimalMessage.length,
        };
      } catch (error) {
        console.error(`❌ 無料版メッセージ送信エラー:`, error.message);
        results[code] = results[code] || {};
        results[code].minimal = {
          success: false,
          error: error.message,
        };
      }
    }

    // 各言語の間に少し待機（レート制限対策）
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // サマリー表示
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 配信テスト結果サマリー');
  console.log('='.repeat(80));

  let regularSuccess = 0;
  let regularFailed = 0;
  let minimalSuccess = 0;
  let minimalFailed = 0;

  for (const langInfo of LANGUAGES) {
    const result = results[langInfo.code];
    if (result?.regular?.success) {
      regularSuccess++;
    } else {
      regularFailed++;
    }
    if (result?.minimal?.success) {
      minimalSuccess++;
    } else {
      minimalFailed++;
    }
  }

  console.log(`\n有料版（Regular）:`);
  console.log(`  ✅ 成功: ${regularSuccess}/${LANGUAGES.length}`);
  console.log(`  ❌ 失敗: ${regularFailed}/${LANGUAGES.length}`);

  console.log(`\n無料版（Minimal）:`);
  console.log(`  ✅ 成功: ${minimalSuccess}/${LANGUAGES.length}`);
  console.log(`  ❌ 失敗: ${minimalFailed}/${LANGUAGES.length}`);

  console.log('\n' + '='.repeat(80));
  console.log('詳細結果:');
  console.log('='.repeat(80));

  for (const langInfo of LANGUAGES) {
    const result = results[langInfo.code];
    console.log(`\n${langInfo.name} (${langInfo.code}):`);
    console.log(`  有料版: ${result?.regular?.success ? '✅' : '❌'} ${result?.regular?.error || `Message ID: ${result?.regular?.messageId}`}`);
    console.log(`  無料版: ${result?.minimal?.success ? '✅' : '❌'} ${result?.minimal?.error || `Message ID: ${result?.minimal?.messageId}`}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ 配信テスト完了');
  console.log('='.repeat(80));
}

// メイン実行
testActualDelivery().catch((error) => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
