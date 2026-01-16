#!/usr/bin/env node
/**
 * AR版（アラビア語）有料版・無料版 Telegram配信テスト
 * 修正後のチャンネルIDが正しく動作するか確認
 */

const path = require('path');
const dotenv = require('dotenv');

// .envファイルを読み込む
const envPath = path.join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

const { sendMessageToChannel, sendMessageToAsset } = require('../services/telegram/bot');

// AR版の言語情報
const AR_LANG = {
  code: 'AR',
  lang: 'ar',
  name: 'العربية',
  series: 'BTC',
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
 * テンプレートを読み込む
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
    console.log(`✅ 有料版テンプレート読み込み成功: ${regularPath}`);
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
    console.log(`✅ 無料版テンプレート読み込み成功: ${minimalPath}`);
  } catch (error) {
    console.error(`❌ Failed to load minimal template for ${lang}:`, error.message);
  }

  return templates;
}

/**
 * AR版の配信テスト
 */
async function testArabicDelivery() {
  console.log('🚀 AR版（アラビア語）有料版・無料版 Telegram配信テスト\n');
  console.log('='.repeat(80));
  console.log('⚠️ 注意: このスクリプトは実際にTelegramにメッセージを送信します\n');

  const { code, lang, name, series } = AR_LANG;
  
  console.log(`📋 ${name} (${code})`);
  console.log('='.repeat(80));

  // 環境変数の確認
  console.log('\n🔍 環境変数の確認:');
  const paidChannelId = process.env.TELEGRAM_CHAT_ID_BTC_AR;
  const minimalChannelId = process.env.TELEGRAM_CHAT_ID_MINIMAL_AR;
  const defaultMinimalChannelId = process.env.TELEGRAM_CHAT_ID_MINIMAL;
  
  console.log(`  TELEGRAM_CHAT_ID_BTC_AR: ${paidChannelId || '❌ 未設定'}`);
  console.log(`  TELEGRAM_CHAT_ID_MINIMAL_AR: ${minimalChannelId || '❌ 未設定'}`);
  console.log(`  TELEGRAM_CHAT_ID_MINIMAL (フォールバック): ${defaultMinimalChannelId || '❌ 未設定'}`);

  const templates = loadTemplates(lang);

  const results = {
    regular: { success: false, error: null, messageId: null, chatTitle: null },
    minimal: { success: false, error: null, messageId: null, chatTitle: null },
  };

  // 有料版メッセージ生成と送信
  if (templates.regular) {
    try {
      const regularMessage = templates.regular({
        ...TEST_DATA,
        lang,
      });

      console.log(`\n📤 有料版メッセージを送信中...`);
      console.log(`   文字数: ${regularMessage.length}文字`);
      console.log(`   送信先: TELEGRAM_CHAT_ID_BTC_AR (${paidChannelId || '未設定'})`);
      
      const paidResult = await sendMessageToChannel(regularMessage, series, code);
      const messageId = paidResult?.result?.message_id || paidResult?.message_id || 'N/A';
      const chatTitle = paidResult?.result?.chat?.title || paidResult?.chat?.title || 'N/A';
      
      console.log(`✅ 有料版メッセージ送信成功！`);
      console.log(`   Message ID: ${messageId}`);
      console.log(`   Chat: ${chatTitle}`);
      console.log(`   期待されるチャンネル: Trap Deffence BTC - Arabic`);

      results.regular = {
        success: true,
        messageId,
        chatTitle,
        length: regularMessage.length,
      };
    } catch (error) {
      console.error(`❌ 有料版メッセージ送信エラー:`, error.message);
      results.regular = {
        success: false,
        error: error.message,
      };
    }
  } else {
    console.error('❌ 有料版テンプレートが見つかりません');
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
      console.log(`   送信先: TELEGRAM_CHAT_ID_MINIMAL_AR (${minimalChannelId || '未設定、フォールバック: ' + defaultMinimalChannelId})`);

      // 言語コードを環境変数形式に変換
      const langCodeForEnv = code.replace('-', '_');
      const freeResult = await sendMessageToAsset(minimalMessage, 'MINIMAL', langCodeForEnv);
      const messageId = freeResult?.result?.message_id || freeResult?.message_id || 'N/A';
      const chatTitle = freeResult?.result?.chat?.title || freeResult?.chat?.title || 'N/A';
      
      console.log(`✅ 無料版メッセージ送信成功！`);
      console.log(`   Message ID: ${messageId}`);
      console.log(`   Chat: ${chatTitle}`);
      console.log(`   期待されるチャンネル: Trap Deffence BTC Trial - Arabic`);

      results.minimal = {
        success: true,
        messageId,
        chatTitle,
        length: minimalMessage.length,
      };
    } catch (error) {
      console.error(`❌ 無料版メッセージ送信エラー:`, error.message);
      results.minimal = {
        success: false,
        error: error.message,
      };
    }
  } else {
    console.error('❌ 無料版テンプレートが見つかりません');
  }

  // 結果サマリー
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(80));

  console.log(`\n有料版（Regular）:`);
  console.log(`  ${results.regular.success ? '✅ 成功' : '❌ 失敗'}`);
  if (results.regular.success) {
    console.log(`  Message ID: ${results.regular.messageId}`);
    console.log(`  Chat: ${results.regular.chatTitle}`);
    console.log(`  文字数: ${results.regular.length}文字`);
    
    // チャンネル名の確認
    if (results.regular.chatTitle.includes('Arabic') && !results.regular.chatTitle.includes('Trial')) {
      console.log(`  ✅ 正しいチャンネル（有料版）に送信されました`);
    } else {
      console.log(`  ⚠️ 警告: チャンネル名が期待と異なる可能性があります`);
      console.log(`     期待: Trap Deffence BTC - Arabic`);
      console.log(`     実際: ${results.regular.chatTitle}`);
    }
  } else {
    console.log(`  エラー: ${results.regular.error}`);
  }

  console.log(`\n無料版（Minimal）:`);
  console.log(`  ${results.minimal.success ? '✅ 成功' : '❌ 失敗'}`);
  if (results.minimal.success) {
    console.log(`  Message ID: ${results.minimal.messageId}`);
    console.log(`  Chat: ${results.minimal.chatTitle}`);
    console.log(`  文字数: ${results.minimal.length}文字`);
    
    // チャンネル名の確認
    if (results.minimal.chatTitle.includes('Arabic') && results.minimal.chatTitle.includes('Trial')) {
      console.log(`  ✅ 正しいチャンネル（無料版）に送信されました`);
    } else {
      console.log(`  ⚠️ 警告: チャンネル名が期待と異なる可能性があります`);
      console.log(`     期待: Trap Deffence BTC Trial - Arabic`);
      console.log(`     実際: ${results.minimal.chatTitle}`);
    }
  } else {
    console.log(`  エラー: ${results.minimal.error}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ テスト完了');
  console.log('='.repeat(80));

  // 最終確認
  if (results.regular.success && results.minimal.success) {
    console.log('\n🎉 AR版の有料版・無料版の配信テストが成功しました！');
    
    // チャンネルIDの確認
    if (results.regular.chatTitle.includes('Arabic') && !results.regular.chatTitle.includes('Trial') &&
        results.minimal.chatTitle.includes('Arabic') && results.minimal.chatTitle.includes('Trial')) {
      console.log('✅ チャンネルIDの設定も正しく動作しています！');
    } else {
      console.log('⚠️ チャンネルIDの設定を確認してください。');
      console.log('   詳細は docs/ARABIC_CHANNEL_ID_FIX.md を参照してください。');
    }
  } else {
    console.log('\n⚠️ 一部のテストが失敗しました。');
    console.log('   エラーメッセージを確認して、環境変数やBotの権限を確認してください。');
  }
}

// メイン実行
testArabicDelivery().catch((error) => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
