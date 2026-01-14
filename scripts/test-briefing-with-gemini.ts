#!/usr/bin/env node
/**
 * 有料版ブリーフィング（Geminiコンテンツ統合版）のテスト配信スクリプト
 * 
 * 使用方法:
 *   cd cryptosignal-ai
 *   node scripts/test-briefing-with-gemini.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');

// 必要なモジュールをインポート
const { produceShow } = require('../services/gemini/showProducer');
const { formatRegularBriefing } = require('../services/telegram/messages/user/en/regular.en');
const { sendMessage } = require('../services/telegram/bot');
const { getExchangeInflow, getMinerPositionIndex } = require('../services/cryptoquant/endpoints/btc');
const { getCQDeepMetrics } = require('../services/cryptoquant/deepMetrics');
const { analyzeMarket } = require('../services/grok/client');
const { diagnoseUserSentimentCompat } = require('../services/grok/psychologicalSupport');
const { detectTrapDetection, generateTrapAlert } = require('../logic/core/trapDetector');
const { analyzeCryptoQuantData } = require('../services/gpt/client');
const { fetch24hTicker } = require('../services/binance/client');

async function main() {
  console.log('🧪 有料版ブリーフィング（Geminiコンテンツ統合版）テスト配信開始\n');
  console.log('='.repeat(80));

  try {
    // 1. 市場データを取得
    console.log('\n📊 市場データ取得中...');
    const ticker = await fetch24hTicker('BTCUSDT');
    const priceUsd = parseFloat(ticker.lastPrice);
    const change24h = parseFloat(ticker.priceChangePercent);

    // CryptoQuantデータを取得
    const inflow = await getExchangeInflow();
    const mpi = await getMinerPositionIndex();
    const cqDeep = await getCQDeepMetrics('EN');

    console.log(`✅ 価格: $${priceUsd.toLocaleString()} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%)`);
    console.log(`✅ Exchange Netflow: ${inflow.toFixed(0)} BTC`);
    console.log(`✅ MPI: ${mpi.toFixed(2)}`);

    // 2. Trap Detectionを実行
    console.log('\n🛡️ トラップ検出中...');
    const trapDetection = await detectTrapDetection({
      exchangeNetflow: inflow,
      whaleRatio: cqDeep?.whaleRatio || 0.5,
      mpi: mpi,
      priceUsd: priceUsd,
      change24h: change24h,
    });
    const trapAlert = await generateTrapAlert(trapDetection);

    console.log(`✅ Trap Score: ${trapDetection?.trapScore || 0}/100`);
    console.log(`✅ Trap Alert: ${trapAlert?.recommendation || 'STANDBY'}`);

    // 3. Grok分析を実行
    console.log('\n🤖 Grok分析中...');
    const grokAnalysis = await analyzeMarket({
      price: priceUsd,
      change24h: change24h,
      inflow: inflow,
      mpi: mpi,
    });
    const grokXAnalysis = grokAnalysis?.text || 'Market analysis unavailable.';

    // 4. 心理的サポートを実行
    console.log('\n💊 Dr. Grok心理的サポート診断中...');
    const psychologicalSupport = await diagnoseUserSentimentCompat({
      marketData: {
        price: priceUsd,
        change24h: change24h,
      },
      sentimentData: {
        sentiment: change24h > 0 ? 'GREED' : 'FEAR',
      },
    });

    // 5. GPT分析を実行
    console.log('\n📰 GPTリポーター分析中...');
    const gptAnalysis = await analyzeCryptoQuantData({
      exchangeInflow: inflow,
      mpi: mpi,
      whaleRatio: cqDeep?.whaleRatio || 0.5,
      trapScore: trapDetection?.trapScore || 0,
    });
    const gptReporterAnalysis = gptAnalysis?.text || 'Analysis unavailable.';

    // 6. Gemini番組プロデューサーを実行
    console.log('\n📺 Gemini番組プロデューサー実行中...');
    const showContent = await produceShow({
      marketData: {
        price_usd_display: priceUsd,
        change_24h: change24h,
        market_score: 50, // 仮の値
        sentiment_label: change24h > 0 ? 'GREED' : 'FEAR',
        inflow: inflow,
        mpi: mpi,
      },
      cryptoQuantData: cqDeep || {},
      trapDetection: trapDetection,
      psychologicalSupport: psychologicalSupport,
      gptMentalTrainerAnalysis: gptReporterAnalysis,
      lang: 'en',
    });

    if (showContent) {
      console.log('✅ Gemini番組プロデューサー完了');
      console.log(`   - Opening: ${showContent.narrativeArc?.open ? 'あり' : 'なし'}`);
      console.log(`   - Data Presentation: ${showContent.dataPresentation?.problemVisualization ? 'あり' : 'なし'}`);
      console.log(`   - Analysis: ${showContent.analysis?.trapDefenseEngine ? 'あり' : 'なし'}`);
      console.log(`   - Call to Action: ${showContent.callToAction ? 'あり' : 'なし'}`);
    } else {
      console.log('⚠️ Gemini番組プロデューサーがnullを返しました');
    }

    // 7. メッセージを生成
    console.log('\n📝 メッセージ生成中...');
    const now = new Date();
    const regularText = formatRegularBriefing({
      now,
      inflow: inflow,
      mpi: mpi,
      sentimentLabel: change24h > 0 ? 'GREED' : 'FEAR',
      priceUsd: priceUsd,
      change24h: change24h,
      score: 50, // 仮の値
      tradeSignal: null,
      trap: null,
      aiAnalysis: grokAnalysis?.text || 'Analysis unavailable.',
      stats: null,
      trapScore: cqDeep?.trapScore,
      whaleFlows: cqDeep?.whaleFlows,
      liquidations: cqDeep?.liquidations,
      noTradeAlert: null,
      trapRisk: null,
      exitMap: null,
      trapDetection: trapDetection,
      marketBug: null,
      trapAlert: trapAlert,
      divergenceSignal: null,
      psychologicalSupport: psychologicalSupport,
      hasGeminiContent: false,
      showContent: showContent, // Geminiコンテンツを渡す
      gptReporterAnalysis: gptReporterAnalysis,
      grokXAnalysis: grokXAnalysis,
    });

    console.log('✅ メッセージ生成完了');
    console.log(`   文字数: ${regularText.length}文字`);

    // 8. メッセージを表示（コンソール）
    console.log('\n' + '='.repeat(80));
    console.log('📱 生成されたメッセージ:');
    console.log('='.repeat(80));
    console.log(regularText);
    console.log('='.repeat(80));

    // 9. メッセージをファイルに保存
    const outputPath = join(__dirname, '..', '..', 'docs', 'TEST_BRIEFING_WITH_GEMINI.md');
    const content = `# 有料版ブリーフィング（Geminiコンテンツ統合版）テスト配信結果

**実行日時**: ${now.toISOString()}

---

## 📊 市場データ

- **価格**: $${priceUsd.toLocaleString()} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%)
- **Exchange Netflow**: ${inflow.toFixed(0)} BTC
- **MPI**: ${mpi.toFixed(2)}
- **Trap Score**: ${trapDetection?.trapScore || 0}/100
- **Trap Alert**: ${trapAlert?.recommendation || 'STANDBY'}

---

## 📺 Geminiコンテンツ

${showContent ? `
- **Opening**: ${showContent.narrativeArc?.open ? 'あり' : 'なし'}
- **Data Presentation**: ${showContent.dataPresentation?.problemVisualization ? 'あり' : 'なし'}
- **Analysis**: ${showContent.analysis?.trapDefenseEngine ? 'あり' : 'なし'}
- **Call to Action**: ${showContent.callToAction ? 'あり' : 'なし'}
- **Key Idea**: ${showContent.keyIdea || 'N/A'}
` : '⚠️ Geminiコンテンツが生成されませんでした'}

---

## 📱 生成されたメッセージ

\`\`\`
${regularText}
\`\`\`

---

**文字数**: ${regularText.length}文字
`;

    fs.writeFileSync(outputPath, content, 'utf-8');
    console.log(`\n✅ メッセージを保存しました: ${outputPath}`);

    // 10. Telegramに送信（オプション）
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    const ENABLE_TELEGRAM_SEND = process.env.ENABLE_TEST_TELEGRAM_SEND === 'true';

    if (ENABLE_TELEGRAM_SEND && TELEGRAM_CHAT_ID) {
      console.log('\n📤 Telegramに送信中...');
      try {
        await sendMessage(regularText);
        console.log('✅ Telegram送信成功');
      } catch (error) {
        console.error('❌ Telegram送信エラー:', error.message || error);
      }
    } else {
      console.log('\n⚠️ Telegram送信はスキップされました');
      console.log('   送信する場合は、.envに以下を設定してください:');
      console.log('   ENABLE_TEST_TELEGRAM_SEND=true');
      console.log('   TELEGRAM_CHAT_ID=<your-chat-id>');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ テスト配信完了');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ エラー発生:');
    console.error('エラーメッセージ:', error.message || error);
    if (error.stack) {
      console.error('エラースタック:', error.stack);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('致命的なエラー:', error);
  process.exit(1);
});
