#!/usr/bin/env node
/**
 * 無料版（Minimal Version）と有料版（Regular Briefing）の配信テスト
 * 本番ローンチ前のメッセージUI最終チェック
 */

const path = require('path');
const dotenv = require('dotenv');

// .envファイルを読み込む
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const { sendMessageToChannel, sendMessageToAsset } = require('../services/telegram/bot');

// 本番環境を想定したテストデータ
const TEST_DATA = {
  now: new Date(),
  inflow: -1250.5,
  mpi: 0.65,
  sentimentLabel: 'NEUTRAL',
  priceUsd: 43250,
  change24h: 2.35,
  score: 15,
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
  trapScore: 35,
  whaleFlows: {
    whaleRatio: 0.42,
    isHighPressure: false,
    netFlow: -850,
  },
  liquidations: {
    longLiquidations: 12500000,
    shortLiquidations: 8900000,
    totalLiquidations: 21400000,
  },
  trapDetection: {
    trapDetected: false,
    trapScore: 35,
    trapSeverity: 'LOW',
    trapType: null,
    details: {
      multipleDivergences: 1,
      anomalyDetected: false,
      accelerationDetected: false,
    },
  },
  trapAlert: null,
  psychologicalSupport: {
    psychologicalState: 'NEUTRAL',
    psychologicalRisk: 'LOW',
    psychologicalAdvice: 'Market conditions are stable. Maintain discipline.',
  },
  gptReporterAnalysis: `◆ Psychological Interpretation of On-Chain Metrics

The CryptoQuant data shows Outflow 1251 BTC, a Miners' Position Index (MPI) of +0.65, and neutral sentiment, while the price has changed +2.35% over 24 hours.

From a psychological perspective, these metrics suggest a neutral market environment. The outflow indicates more cryptocurrency leaving exchanges, which often signals holders securing their assets off-exchange.

The MPI of +0.65 suggests that miners are selling, which can be interpreted as potential supply pressure.

▼ Market Context

The neutral sentiment reflects a lack of strong emotional drivers such as fear or greed among traders. This suggests a market in a wait-and-see mode, where traders are monitoring conditions carefully.`,
  grokXAnalysis: {
    sentiment: 'NEUTRAL',
    risk: 'LOW',
    analysis: 'Market sentiment is neutral with low risk indicators.',
  },
  showContent: {
    narrativeArc: {
      open: 'The market is showing minimal trap indicators. Current conditions appear relatively safe, but vigilance remains key.',
    },
    dataPresentation: {
      problemVisualization: 'On-chain metrics suggest a wait-and-see approach is prudent at this time.',
    },
    evidence: 'Trap Score: 35/100 indicates low trap risk. Market conditions appear relatively safe, but remain vigilant for trap patterns.',
    analysis: {
      trapDefenseEngine: {
        process: 'The Trap Defense Engine has analyzed multiple on-chain indicators and found minimal trap signals. Current market conditions suggest a defensive stance is appropriate.',
        promise: 'By maintaining discipline and waiting for clearer signals, you protect your capital and position yourself for better opportunities.',
      },
    },
    callToAction: {
      avoidFailure: 'Avoid rushing into trades based on emotional impulses. The data shows patience is the strategic choice.',
      successEnding: 'Strategic preparation is victory preparation, not weakness. 70% of the time, prepare for victory.',
    },
  },
  aiAnalysis: 'Market shows minimal trap indicators. Current market conditions appear relatively safe with low trap risk.',
};

/**
 * 無料版メッセージを生成（minimal-high-quality版を使用）
 */
function generateMinimalMessage() {
  try {
    const { formatMinimalHighQualityBriefing } = require(
      '../services/telegram/messages/user/en/minimal-high-quality.en'
    );

    const trapData = {
      trapAlert: TEST_DATA.trapAlert,
      exchangeNetflow: TEST_DATA.inflow,
      whaleRatio: TEST_DATA.whaleFlows?.whaleRatio || null,
    };

    const marketData = {
      mpi: TEST_DATA.mpi,
      priceUsd: TEST_DATA.priceUsd,
      change24h: TEST_DATA.change24h,
    };

    const sentimentData = TEST_DATA.grokXAnalysis ? {
      sentiment: TEST_DATA.grokXAnalysis.sentiment || TEST_DATA.sentimentLabel,
      risk: TEST_DATA.grokXAnalysis.risk || null,
    } : {
      sentiment: TEST_DATA.sentimentLabel,
    };

    return formatMinimalHighQualityBriefing({
      now: TEST_DATA.now,
      trapScore: TEST_DATA.trapScore,
      priceUsd: TEST_DATA.priceUsd,
      change24h: TEST_DATA.change24h,
      trapData,
      marketData,
      sentimentData,
      lang: 'en',
    });
  } catch (error) {
    console.error('❌ 無料版メッセージ生成エラー:', error.message);
    throw error;
  }
}

/**
 * 有料版メッセージを生成
 */
function generateRegularMessage() {
  try {
    const { formatRegularBriefing } = require(
      '../services/telegram/messages/user/en/regular.en'
    );

    return formatRegularBriefing({
      now: TEST_DATA.now,
      inflow: TEST_DATA.inflow,
      mpi: TEST_DATA.mpi,
      sentimentLabel: TEST_DATA.sentimentLabel,
      priceUsd: TEST_DATA.priceUsd,
      change24h: TEST_DATA.change24h,
      score: TEST_DATA.score,
      tradeSignal: TEST_DATA.tradeSignal,
      trap: TEST_DATA.trap,
      aiAnalysis: TEST_DATA.aiAnalysis,
      trapScore: TEST_DATA.trapScore,
      whaleFlows: TEST_DATA.whaleFlows,
      liquidations: TEST_DATA.liquidations,
      trapDetection: TEST_DATA.trapDetection,
      trapAlert: TEST_DATA.trapAlert,
      psychologicalSupport: TEST_DATA.psychologicalSupport,
      gptReporterAnalysis: TEST_DATA.gptReporterAnalysis,
      grokXAnalysis: TEST_DATA.grokXAnalysis?.analysis || null,
      showContent: TEST_DATA.showContent,
      lang: 'en',
    });
  } catch (error) {
    console.error('❌ 有料版メッセージ生成エラー:', error.message);
    throw error;
  }
}

/**
 * メッセージUIの最終チェック
 */
async function testFinalMessageUI() {
  console.log('🚀 無料版・有料版 メッセージUI最終チェック\n');
  console.log('='.repeat(80));
  console.log('⚠️ 注意: このスクリプトは実際にTelegramにメッセージを送信します\n');
  console.log('📋 チェック項目:');
  console.log('  1. 無料版（Minimal Version）メッセージのUI確認');
  console.log('  2. 有料版（Regular Briefing）メッセージのUI確認');
  console.log('  3. メッセージの構造・フォーマット確認');
  console.log('  4. 絵文字・セクション区切りの確認');
  console.log('  5. CTAリンクの確認\n');
  console.log('='.repeat(80) + '\n');

  const results = {
    minimal: { success: false, error: null, messageId: null, chatTitle: null, preview: null },
    regular: { success: false, error: null, messageId: null, chatTitle: null, preview: null },
  };

  // 環境変数の確認
  console.log('🔍 環境変数の確認...\n');
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const paidChannelId = process.env.TELEGRAM_CHAT_ID_BTC_EN || process.env.TELEGRAM_CHAT_ID;
  const freeChannelId = process.env.TELEGRAM_CHAT_ID_MINIMAL_EN || process.env.TELEGRAM_CHAT_ID_MINIMAL;

  console.log(`Bot Token: ${botToken ? '✅ Set (' + botToken.slice(-4) + ')' : '❌ Not Set'}`);
  console.log(`有料チャンネルID: ${paidChannelId || '❌ Not Set'}`);
  console.log(`無料チャンネルID: ${freeChannelId || '❌ Not Set'}\n`);

  if (!botToken) {
    console.warn('⚠️ TELEGRAM_BOT_TOKENが設定されていません。');
    console.warn('   メッセージ生成とUIチェックのみを実行します。\n');
  }

  // ===== 無料版（Minimal Version）テスト =====
  console.log('='.repeat(80));
  console.log('📱 無料版（Minimal Version）メッセージUIチェック');
  console.log('='.repeat(80) + '\n');

  try {
    const minimalMessage = generateMinimalMessage();
    
    console.log('📝 無料版メッセージプレビュー（最初の500文字）:');
    console.log('-'.repeat(80));
    console.log(minimalMessage.substring(0, 500) + '...\n');
    console.log('-'.repeat(80));
    console.log(`📊 文字数: ${minimalMessage.length}文字\n`);

    // UIチェック項目
    console.log('🔍 UIチェック項目:');
    const checks = {
      'Openingセクション': minimalMessage.includes('【Opening】') || minimalMessage.includes('Opening'),
      'Trap Score表示': minimalMessage.includes('Trap Score') || minimalMessage.includes('Score'),
      'Market Storyセクション': minimalMessage.includes('【Market Story】') || minimalMessage.includes('Market Story'),
      'Evidenceセクション': minimalMessage.includes('【Evidence】') || minimalMessage.includes('Evidence'),
      'What to Avoidセクション': minimalMessage.includes('【Solution】') || minimalMessage.includes('What to Avoid'),
      'Dr. Grokコメント': minimalMessage.includes('【Commentator】') || minimalMessage.includes('Dr. Grok'),
      'Mental Note': minimalMessage.includes('【Success Ending】') || minimalMessage.includes('Mental Note'),
      'Closingセクション': minimalMessage.includes('【Closing】') || minimalMessage.includes('Closing'),
      'CTAリンク': minimalMessage.includes('cryptotradeacademy.io') || minimalMessage.includes('whop.com'),
      '価格情報': minimalMessage.includes('BTC Price') || minimalMessage.includes('$'),
    };

    for (const [check, passed] of Object.entries(checks)) {
      console.log(`  ${passed ? '✅' : '❌'} ${check}`);
    }
    console.log('');

    if (!freeChannelId) {
      console.warn('⚠️ 無料チャンネルIDが設定されていないため、送信をスキップします。');
      console.warn('   メッセージ生成は成功しました。\n');
      results.minimal.preview = minimalMessage.substring(0, 500);
    } else {
      console.log('📤 無料版メッセージを送信中...\n');
      const freeResult = await sendMessageToAsset(minimalMessage, 'MINIMAL', 'EN');
      const messageId = freeResult?.result?.message_id || freeResult?.message_id || 'N/A';
      const chatTitle = freeResult?.result?.chat?.title || freeResult?.chat?.title || 'N/A';

      console.log('✅ 無料版メッセージ送信成功！');
      console.log(`   Message ID: ${messageId}`);
      console.log(`   Chat: ${chatTitle}\n`);

      results.minimal = {
        success: true,
        messageId,
        chatTitle,
        length: minimalMessage.length,
        preview: minimalMessage.substring(0, 500),
      };
    }
  } catch (error) {
    console.error('❌ 無料版メッセージエラー:', error.message);
    console.error('   スタック:', error.stack?.substring(0, 300) + '...\n');
    results.minimal.error = error.message;
  }

  // 待機（レート制限対策）
  await new Promise(resolve => setTimeout(resolve, 2000));

  // ===== 有料版（Regular Briefing）テスト =====
  console.log('='.repeat(80));
  console.log('💎 有料版（Regular Briefing）メッセージUIチェック');
  console.log('='.repeat(80) + '\n');

  try {
    const regularMessage = generateRegularMessage();
    
    console.log('📝 有料版メッセージプレビュー（最初の500文字）:');
    console.log('-'.repeat(80));
    console.log(regularMessage.substring(0, 500) + '...\n');
    console.log('-'.repeat(80));
    console.log(`📊 文字数: ${regularMessage.length}文字\n`);

    // UIチェック項目
    console.log('🔍 UIチェック項目:');
    const checks = {
      'Trade Verdictセクション': regularMessage.includes('Trade Verdict') || regularMessage.includes('Signal:'),
      'Today\'s Highlights': regularMessage.includes('Today\'s Highlights') || regularMessage.includes('Core Feature'),
      'Openingセクション': regularMessage.includes('【Opening】') || regularMessage.includes('Opening'),
      'GPT Reporter分析': regularMessage.includes('GPT') || regularMessage.includes('Reporter') || regularMessage.includes('Summary:'),
      'Market Storyセクション': regularMessage.includes('【Core Feature 2') || regularMessage.includes('Market Story'),
      'Evidenceセクション': regularMessage.includes('【Evidence】') || regularMessage.includes('Evidence'),
      'Trap Defense Strategy': regularMessage.includes('【Analysis】') || regularMessage.includes('Trap Defense'),
      'Dr. Grokコメント': regularMessage.includes('【Core Feature 3') || regularMessage.includes('Dr. Grok'),
      'Psychological Support': regularMessage.includes('Psychological') || regularMessage.includes('Mental Note'),
      'Closingセクション': regularMessage.includes('【Closing】') || regularMessage.includes('Closing'),
      '基本市場データ': regularMessage.includes('BTC Price') && regularMessage.includes('Exchange Netflow'),
      'Trap Score表示': regularMessage.includes('Trap Score') || regularMessage.includes('Score'),
    };

    for (const [check, passed] of Object.entries(checks)) {
      console.log(`  ${passed ? '✅' : '❌'} ${check}`);
    }
    console.log('');

    if (!paidChannelId) {
      console.warn('⚠️ 有料チャンネルIDが設定されていないため、送信をスキップします。');
      console.warn('   メッセージ生成は成功しました。\n');
      results.regular.preview = regularMessage.substring(0, 500);
    } else {
      console.log('📤 有料版メッセージを送信中...\n');
      const paidResult = await sendMessageToChannel(regularMessage, 'BTC', 'EN');
      const messageId = paidResult?.result?.message_id || paidResult?.message_id || 'N/A';
      const chatTitle = paidResult?.result?.chat?.title || paidResult?.chat?.title || 'N/A';

      console.log('✅ 有料版メッセージ送信成功！');
      console.log(`   Message ID: ${messageId}`);
      console.log(`   Chat: ${chatTitle}\n`);

      results.regular = {
        success: true,
        messageId,
        chatTitle,
        length: regularMessage.length,
        preview: regularMessage.substring(0, 500),
      };
    }
  } catch (error) {
    console.error('❌ 有料版メッセージエラー:', error.message);
    console.error('   スタック:', error.stack?.substring(0, 300) + '...\n');
    results.regular.error = error.message;
  }

  // ===== 結果サマリー =====
  console.log('\n' + '='.repeat(80));
  console.log('📊 メッセージUI最終チェック結果サマリー');
  console.log('='.repeat(80) + '\n');

  console.log('📱 無料版（Minimal Version）:');
  if (results.minimal.success) {
    console.log(`  ✅ 送信成功`);
    console.log(`     Message ID: ${results.minimal.messageId}`);
    console.log(`     Chat: ${results.minimal.chatTitle}`);
    console.log(`     文字数: ${results.minimal.length}文字`);
  } else if (results.minimal.preview) {
    console.log(`  ⚠️  メッセージ生成成功（送信はスキップ）`);
    console.log(`     文字数: ${results.minimal.preview.length}文字（プレビュー）`);
  } else {
    console.log(`  ❌ 失敗: ${results.minimal.error || 'Unknown error'}`);
  }

  console.log('\n💎 有料版（Regular Briefing）:');
  if (results.regular.success) {
    console.log(`  ✅ 送信成功`);
    console.log(`     Message ID: ${results.regular.messageId}`);
    console.log(`     Chat: ${results.regular.chatTitle}`);
    console.log(`     文字数: ${results.regular.length}文字`);
  } else if (results.regular.preview) {
    console.log(`  ⚠️  メッセージ生成成功（送信はスキップ）`);
    console.log(`     文字数: ${results.regular.preview.length}文字（プレビュー）`);
  } else {
    console.log(`  ❌ 失敗: ${results.regular.error || 'Unknown error'}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ メッセージUI最終チェック完了');
  console.log('='.repeat(80) + '\n');

  console.log('📋 次のステップ:');
  console.log('  1. Telegramで実際のメッセージを確認');
  console.log('  2. メッセージのUI・フォーマットを確認');
  console.log('  3. セクション区切り・絵文字が正しく表示されているか確認');
  console.log('  4. CTAリンクが正しく機能するか確認');
  console.log('  5. モバイル表示での確認も推奨\n');

  // 成功判定（メッセージ生成が成功していればOK）
  const minimalOk = results.minimal.success || results.minimal.preview || !results.minimal.error;
  const regularOk = results.regular.success || results.regular.preview || !results.regular.error;
  const allSuccess = minimalOk && regularOk;
  
  if (allSuccess) {
    console.log('🎉 すべてのチェックが完了しました！');
    if (!botToken || !paidChannelId || !freeChannelId) {
      console.log('💡 環境変数を設定すると、実際のTelegram配信もテストできます。');
    }
    process.exit(0);
  } else {
    console.error('⚠️ 一部のチェックが失敗しました。エラーを確認してください。');
    process.exit(1);
  }
}

// メイン実行
testFinalMessageUI().catch((error) => {
  console.error('\n❌ 予期しないエラー:', error.message);
  if (error.stack) {
    console.error('スタックトレース:', error.stack.substring(0, 500));
  }
  process.exit(1);
});
