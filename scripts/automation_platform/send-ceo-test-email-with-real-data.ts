#!/usr/bin/env tsx
/**
 * CEO宛てEメール配信テストスクリプト（実際のデータ使用版）
 * 
 * 実際の市場データを取得して、完全なEメールレポートを送信
 */

import { sendResendEmail } from '../api/unified-api.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { formatRegularBriefingHTML } = require('../cryptosignal-ai/services/email/messages/user/en/regular.en.js');

// 実際のデータ取得関数をインポート
const { getExchangeInflow, getMinerPositionIndex } = require('../cryptosignal-ai/services/cryptoquant/endpoints/btc.js');
const { fetch24hTicker } = require('../cryptosignal-ai/services/binance/client.js');
const { getCQDeepMetrics } = require('../cryptosignal-ai/services/cryptoquant/deepMetrics.js');
const { detectTrapDetection, generateTrapAlert } = require('../cryptosignal-ai/logic/core/trapDetector.js');
const { buildMarketContext, decideSignal } = require('../cryptosignal-ai/logic/core/marketCore.js');
const { generateSignal } = require('../cryptosignal-ai/logic/tier1_btc/signalGen.js');
const { detectTrap } = require('../cryptosignal-ai/logic/tier1_btc/trapDetector.js');
const { normalizeSentiment } = require('../cryptosignal-ai/logic/tier1_btc/sentiment.js');
const { analyzeXSentimentHighResolutionCompat } = require('../cryptosignal-ai/services/grok/highResolution.js');
const { diagnoseUserSentimentCompat } = require('../cryptosignal-ai/services/grok/psychologicalSupport.js');
const { generateCryptoQuantAnalysis } = require('../cryptosignal-ai/services/gpt/client.js');

const CEO_EMAIL = 'chibaichi.work@gmail.com';

async function main() {
  console.log('🚀 CEO宛てEメール配信テスト（実際のデータ使用）を開始します...\n');

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

    console.log(`✅ 基本データ取得完了: Price=$${priceUsd}, Change24h=${change24h}%, Inflow=${inflow}, MPI=${mpi}\n`);

    // 2. 深掘りデータ取得
    console.log('🔍 深掘りデータを取得中...');
    const cqDeep = await getCQDeepMetrics('EN', {
      upbitPrice: priceUsd,
      binancePrice: priceUsd,
      usdKrwRate: 1300,
    });

    console.log(`✅ 深掘りデータ取得完了: trapScore=${cqDeep?.trapScore ?? 'N/A'}, whaleRatio=${cqDeep?.whaleFlows?.whaleRatio ?? 'N/A'}\n`);

    // 3. センチメント分析
    const xSentiment = {
      whaleBias: 0,
      retailFomo: 50,
      newsImpact: 0,
    };

    // 4. Grok X解析
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
    } catch (error) {
      console.warn('⚠️ Grok X解析エラー:', error.message);
      grokXAnalysis = 'X sentiment analysis unavailable.';
    }

    // 5. 市場コンテキスト構築
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

    // 6. トラップ検出
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
    } catch (error) {
      console.warn('⚠️ トラップ検出エラー:', error.message);
    }

    // 7. GPT Reporter分析
    console.log('📰 GPT Reporter分析中...');
    let gptReporterAnalysis = null;
    try {
      const cryptoQuantData = {
        inflow,
        mpi,
        priceUsd,
        change24h,
        sentiment: sentimentLabel,
        ...cqDeep,
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
    } catch (error) {
      console.warn('⚠️ GPT Reporter分析エラー:', error.message);
      gptReporterAnalysis = 'Market analysis in progress...';
    }

    // 8. Dr. Grok心理的サポート
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
    } catch (error) {
      console.warn('⚠️ 心理的サポート診断エラー:', error.message);
    }

    // 9. EメールHTML生成（実際のデータを使用）
    console.log('📧 EメールHTML生成中...');
    const html = formatRegularBriefingHTML({
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
      trapScore: trapDetection?.trapScore ?? cqDeep?.trapScore ?? null,
      whaleFlows: cqDeep?.whaleFlows ?? null,
      liquidations: cqDeep?.liquidations ?? null,
      noTradeAlert: null,
      trapRisk: null,
      exitMap: null, // Exit Mapは実際のポジション情報が必要
      trapDetection,
      marketBug: null,
      trapAlert,
      divergenceSignal: null,
      psychologicalSupport,
      hasGeminiContent: false, // Geminiコンテンツは後で追加可能
      gptReporterAnalysis,
      grokXAnalysis,
      geminiImageUrl: null,
      geminiVideoUrl: null,
    });

    console.log(`✅ HTML生成完了 (${html.length}文字)\n`);

    // 10. Eメール送信
    console.log('📨 CEO宛てEメール送信中...');
    const result = await sendResendEmail({
      from: 'Trap Defense BTC <reports@cryptotradeacademy.io>',
      to: CEO_EMAIL,
      subject: `🌤️ Trap Defense BTC Report - Real Data Test @ ${new Date().toISOString()}`,
      html,
      text: html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n'),
    });

    console.log('\n✅ Eメール送信成功！');
    console.log('📧 Email ID:', result.emailId || 'N/A');
    console.log(`📬 送信先: ${CEO_EMAIL}`);
    console.log('\n📊 送信されたデータ:');
    console.log(`  - Trap Score: ${trapDetection?.trapScore ?? cqDeep?.trapScore ?? 'N/A'}`);
    console.log(`  - Whale Ratio: ${cqDeep?.whaleFlows?.whaleRatio ? (cqDeep.whaleFlows.whaleRatio * 100).toFixed(1) + '%' : 'N/A'}`);
    console.log(`  - Liquidations: ${cqDeep?.liquidations?.totalLiquidations ? '$' + cqDeep.liquidations.totalLiquidations.toLocaleString() : 'N/A'}`);
    console.log('\n🎯 テスト完了');

  } catch (error: any) {
    console.error('\n❌ エラー:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

main();
