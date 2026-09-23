#!/usr/bin/env tsx
/**
 * Telegram配信テストスクリプト
 * 実際の市場データを取得してTelegramに送信し、メッセージUIを確認
 */

import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .envファイルを読み込む（複数のパスを試す）
const envPaths = [
  join(__dirname, '..', '.env'),
  join(__dirname, '..', 'cryptosignal-ai', '.env'),
];

for (const envPath of envPaths) {
  try {
    dotenv.config({ path: envPath });
    if (process.env.TELEGRAM_BOT_TOKEN) {
      console.log(`✅ .envファイルを読み込みました: ${envPath}`);
      break;
    }
  } catch (error) {
    // 次のパスを試す
  }
}

// 必要なモジュールをインポート
const { getExchangeInflow, getMinerPositionIndex } = require('../cryptosignal-ai/services/cryptoquant/endpoints/btc.js');
const { fetch24hTicker } = require('../cryptosignal-ai/services/binance/client.js');
const { analyzeXSentimentHighResolutionCompat } = require('../cryptosignal-ai/services/grok/highResolution.js');
const { diagnoseUserSentimentCompat } = require('../cryptosignal-ai/services/grok/psychologicalSupport.js');
const { detectTrapDetection, generateTrapAlert } = require('../cryptosignal-ai/logic/core/trapDetector.js');
const { buildMarketContext, decideSignal } = require('../cryptosignal-ai/logic/core/marketCore.js');
const { generateSignal } = require('../cryptosignal-ai/logic/tier1_btc/signalGen.js');
const { detectTrap } = require('../cryptosignal-ai/logic/tier1_btc/trapDetector.js');
const { normalizeSentiment } = require('../cryptosignal-ai/logic/tier1_btc/sentiment.js');
const { generateCryptoQuantAnalysis } = require('../cryptosignal-ai/services/gpt/client.js');
const { sendMessage } = require('../cryptosignal-ai/services/telegram/bot.js');
const { formatRegularBriefing } = require('../cryptosignal-ai/services/telegram/messages/user/en/regular.en.js');

const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function main() {
  console.log('🚀 Telegram配信テストを開始します...\n');

  if (!TELEGRAM_CHAT_ID) {
    console.error('❌ TELEGRAM_CHAT_IDが設定されていません');
    process.exit(1);
  }

  try {
    // 1. 市場データ取得
    console.log('📊 市場データを取得中...');
    const [inflowData, mpiData, ticker] = await Promise.all([
      getExchangeInflow(),
      getMinerPositionIndex(),
      fetch24hTicker('BTCUSDT'),
    ]);

    const inflow = inflowData?.value ?? 0;
    const mpi = mpiData?.value ?? 0;
    const priceUsd = parseFloat(ticker.lastPrice);
    const change24h = parseFloat(ticker.priceChangePercent);

    console.log(`✅ データ取得完了: Price=$${priceUsd}, Change24h=${change24h}%, Inflow=${inflow}, MPI=${mpi}\n`);

    // 2. センチメント分析
    console.log('🧠 センチメント分析中...');
    const xSentiment = {
      whaleBias: 0,
      retailFomo: 50,
      newsImpact: 0,
    };

    // 3. Grok X解析
    console.log('📱 Grok X解析中...');
    let grokXAnalysis = null;
    try {
      const grokSent = await analyzeXSentimentHighResolutionCompat(
        'latest BTC price action, funding, liquidations, whale activity, ETF flows on X',
        'en',
      );
      grokXAnalysis = grokSent._highResolution?.summary || grokSent.summary || 'X sentiment analysis completed.';
      xSentiment.whaleBias = Number(grokSent.whaleBias) || 0;
      xSentiment.retailFomo = Number(grokSent.retailFomo) || 50;
      xSentiment.newsImpact = Number(grokSent.newsImpact) || 0;
    } catch (error: any) {
      console.warn('⚠️ Grok X解析エラー:', error.message);
      grokXAnalysis = 'X sentiment analysis unavailable.';
    }

    // 4. 市場コンテキスト構築
    const ctx = buildMarketContext({
      asset: 'BTC',
      priceUsd,
      change24h,
      inflow,
      mpi,
      xSentiment,
      market: 'EN',
    });

    const coreDecision = decideSignal(ctx);
    const tradeSignal = generateSignal({
      priceUsd,
      score: coreDecision.score,
      direction: coreDecision.signal,
    });

    const trap = detectTrap({
      priceChange: change24h,
      volume: 0,
      inflow,
      mpi,
    });

    const sentimentLabel = normalizeSentiment(xSentiment);

    // 5. トラップ検出
    console.log('🛡️ トラップ検出中...');
    let trapDetection = null;
    let trapAlert = null;
    try {
      trapDetection = detectTrapDetection({
        exchangeNetflow: inflow,
        minerMPI: mpi,
        whaleBias: xSentiment.whaleBias,
        retailFomo: xSentiment.retailFomo,
        priceChange24h: change24h,
        highResCQ: null,
        highResX: null,
        binanceData: null,
      });

      if (trapDetection?.trapDetected) {
        trapAlert = generateTrapAlert({
          exchangeNetflow: inflow,
          minerMPI: mpi,
          whaleBias: xSentiment.whaleBias,
          retailFomo: xSentiment.retailFomo,
          priceChange24h: change24h,
          highResCQ: null,
          highResX: null,
          binanceData: null,
        });
      }
    } catch (error: any) {
      console.warn('⚠️ トラップ検出エラー:', error.message);
    }

    // 6. GPT Reporter分析
    console.log('📰 GPT Reporter分析中...');
    let gptReporterAnalysis = null;
    try {
      const cryptoQuantData = {
        inflow,
        mpi,
        priceUsd,
        change24h,
        sentiment: sentimentLabel,
      };
      const marketContext = {
        priceUsd,
        change24h,
        score: coreDecision.score,
        signal: tradeSignal.signal,
        sentiment: sentimentLabel,
        trap,
      };
      gptReporterAnalysis = await generateCryptoQuantAnalysis(cryptoQuantData, marketContext, 'en');
    } catch (error: any) {
      console.warn('⚠️ GPT Reporter分析エラー:', error.message);
      gptReporterAnalysis = 'Market analysis in progress...';
    }

    // 7. Dr. Grok心理的サポート
    console.log('💊 Dr. Grok心理的サポート診断中...');
    let psychologicalSupport = null;
    try {
      psychologicalSupport = await diagnoseUserSentimentCompat(
        {
          price_usd_display: priceUsd,
          change_24h: change24h,
          market_score: coreDecision.score,
          trapDetection,
          trapAlert,
        },
        xSentiment,
        'en',
      );
    } catch (error: any) {
      console.warn('⚠️ 心理的サポート診断エラー:', error.message);
    }

    // 8. Telegramメッセージ生成
    console.log('📝 Telegramメッセージ生成中...');
    const snapshot = {
      price_usd_display: priceUsd,
      change_24h: change24h,
      market_score: coreDecision.score,
      sentiment_label: sentimentLabel,
      inflow,
      mpi,
    };

    // Gemini番組プロデューサーを実行（新機能）
    console.log('📺 Gemini番組プロデューサー実行中...');
    let showContent = null;
    try {
      const { produceShow } = require('../cryptosignal-ai/services/gemini/showProducer');
      const { getCQDeepMetrics } = require('../cryptosignal-ai/services/cryptoquant/deepMetrics');
      const cqDeep = await getCQDeepMetrics('EN');
      
      showContent = await produceShow({
        marketData: {
          price_usd_display: priceUsd,
          change_24h: change24h,
          market_score: coreDecision.score,
          sentiment_label: sentimentLabel,
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
      } else {
        console.log('⚠️ Gemini番組プロデューサーがnullを返しました');
      }
    } catch (error: any) {
      console.warn('⚠️ Gemini番組プロデューサーエラー:', error.message);
    }

    const regularText = formatRegularBriefing({
      snapshot,
      now: new Date(),
      inflow,
      mpi,
      sentimentLabel,
      priceUsd,
      change24h,
      score: coreDecision.score,
      tradeSignal,
      trap,
      aiAnalysis: gptReporterAnalysis,
      stats: null,
      trapScore: trapDetection?.trapScore || null,
      whaleFlows: null,
      liquidations: null,
      noTradeAlert: null,
      trapRisk: null,
      exitMap: null,
      trapDetection,
      marketBug: null,
      trapAlert,
      divergenceSignal: null,
      psychologicalSupport,
      hasGeminiContent: false,
      showContent: showContent, // Geminiコンテンツを追加
      gptReporterAnalysis,
      grokXAnalysis,
      geminiImageUrl: null,
      geminiVideoUrl: null,
    });

    console.log(`✅ メッセージ生成完了 (${regularText.length}文字)\n`);

    // 9. Telegram送信
    console.log('📨 Telegramに送信中...');
    console.log('📋 メッセージプレビュー（最初の500文字）:');
    console.log('─'.repeat(60));
    console.log(regularText.substring(0, 500) + '...\n');
    console.log('─'.repeat(60));

    const sendResult = await sendMessage(regularText);
    const telegramMessageId = sendResult?.message_id || sendResult?.raw?.result?.message_id;

    console.log('\n✅ Telegram送信成功！');
    console.log('📧 Message ID:', telegramMessageId || 'N/A');
    console.log(`📬 送信先: Trap Defence BTC - English (${TELEGRAM_CHAT_ID})`);
    console.log('\n📊 送信されたデータ:');
    console.log(`  - Trap Score: ${trapDetection?.trapScore ?? 'N/A'}`);
    console.log(`  - Market Score: ${coreDecision.score}`);
    console.log(`  - Signal: ${tradeSignal.signal}`);
    console.log(`  - Price: $${priceUsd}`);
    console.log(`  - Change 24h: ${change24h}%`);
    console.log('\n🎯 テスト完了');
    console.log('\n💡 メッセージUIを確認してください:');
    console.log('   Telegramアプリで「Trap Defence BTC - English」チャットグループを開いてください');

  } catch (error: any) {
    console.error('\n❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack.substring(0, 500));
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ 予期しないエラー:', error);
  process.exit(1);
});
