#!/usr/bin/env node
/**
 * CEO宛てEメール配信テストスクリプト
 * 
 * 実際のデータを取得してEメール配信をテスト
 */

const { formatRegularBriefingHTML } = require('../services/email/messages/user/en/regular.en.js');
const dotenv = require('dotenv');
const path = require('path');

// .envファイルを読み込む（親ディレクトリから）
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY is not set in environment variables');
  process.exit(1);
}

// 親ディレクトリのresendパッケージを使用
const { Resend } = require(path.resolve(__dirname, '../../node_modules/resend'));
const resend = new Resend(RESEND_API_KEY);
const { getExchangeInflow, getMinerPositionIndex } = require('../services/cryptoquant/endpoints/btc');
const { fetch24hTicker } = require('../services/binance/client');
const { analyzeXSentimentHighResolutionCompat } = require('../services/grok/highResolution');
const { diagnoseUserSentimentCompat } = require('../services/grok/psychologicalSupport');
const { detectTrapDetection, generateTrapAlert } = require('../logic/core/trapDetector');
const { buildMarketContext, decideSignal } = require('../logic/core/marketCore');
const { generateSignal } = require('../logic/tier1_btc/signalGen');
const { detectTrap } = require('../logic/tier1_btc/trapDetector');
const { normalizeSentiment } = require('../logic/tier1_btc/sentiment');
const { analyzeCryptoQuantData } = require('../services/gpt/client');

const CEO_EMAIL = 'chibaichi.work@gmail.com'; // CEOのメールアドレス

async function main() {
  console.log('🚀 CEO宛てEメール配信テストを開始します...\n');

  try {
    // 環境変数の確認
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set in environment variables');
    }
    console.log('✅ RESEND_API_KEY確認完了\n');
    // 1. 市場データ取得
    console.log('📊 市場データを取得中...');
    const [inflow, mpi, ticker] = await Promise.all([
      getExchangeInflow(),
      getMinerPositionIndex(),
      fetch24hTicker('BTCUSDT'),
    ]);

    const priceUsd = parseFloat(ticker.lastPrice);
    const change24h = parseFloat(ticker.priceChangePercent);

    // inflowとmpiがオブジェクトの場合は値を抽出（getExchangeInflow/getMinerPositionIndexは{value, raw}を返す）
    const inflowValue = inflow?.value ?? 0;
    const mpiValue = mpi?.value ?? 0;

    console.log(`✅ データ取得完了: Price=${priceUsd}, Change24h=${change24h}%, Inflow=${inflowValue}, MPI=${mpiValue}\n`);

    // 2. センチメント分析
    console.log('🧠 センチメント分析中...');
    const sentimentLabel = normalizeSentiment({
      whaleBias: 0,
      retailFomo: 50,
      newsImpact: 0,
    });

    // 3. 市場コンテキスト構築
    const xSentiment = {
      whaleBias: 0,
      retailFomo: 50,
      newsImpact: 0,
    };

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
      inflow: inflowValue,
      mpi: mpiValue,
    });

    // 4. Grok X解析（高解像度）
    console.log('📱 Grok X解析中...');
    let grokXAnalysis = null;
    try {
      const grokSent = await analyzeXSentimentHighResolutionCompat(
        'latest BTC price action, funding, liquidations, whale activity, ETF flows on X',
        'en',
      );
      grokXAnalysis = grokSent._highResolution?.summary || 'Analyzing X sentiment...';
    } catch (error) {
      console.warn('⚠️ Grok X解析エラー:', error.message);
      grokXAnalysis = 'X sentiment analysis unavailable';
    }

    // 5. GPT Reporter分析
    console.log('📰 GPT Reporter分析中...');
    let gptReporterAnalysis = null;
    try {
      gptReporterAnalysis = await analyzeCryptoQuantData({
        priceUsd,
        change24h,
        inflow,
        mpi,
        xSentiment,
      });
    } catch (error) {
      console.warn('⚠️ GPT Reporter分析エラー:', error.message);
      gptReporterAnalysis = 'Market analysis in progress...';
    }

    // 6. トラップ検出
    console.log('🛡️ トラップ検出中...');
    let trapDetection = null;
    let trapAlert = null;
    try {
      trapDetection = await detectTrapDetection({
        priceUsd,
        change24h,
        inflow,
        mpi,
        xSentiment,
      });

      if (trapDetection && trapDetection.trapDetected) {
        trapAlert = await generateTrapAlert(trapDetection);
      }
    } catch (error) {
      console.warn('⚠️ トラップ検出エラー:', error.message);
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
    } catch (error) {
      console.warn('⚠️ 心理的サポート診断エラー:', error.message);
    }

    // 8. EメールHTML生成
    console.log('📧 EメールHTML生成中...');
    
    // formatRegularBriefingHTMLのパラメータを正しく設定
    const html = formatRegularBriefingHTML({
      now: new Date(),
      inflow: inflowValue,
      mpi: mpiValue,
      sentimentLabel,
      priceUsd,
      change24h,
      score: coreDecision.score,
      tradeSignal,
      trap,
      aiAnalysis: gptReporterAnalysis,
      stats: null,
      trapScore: trapDetection?.trapScore || null,
      whaleFlows: null, // 簡略化のためnull
      liquidations: null, // 簡略化のためnull
      noTradeAlert: null,
      trapRisk: null,
      exitMap: null,
      trapDetection,
      marketBug: null,
      trapAlert,
      divergenceSignal: null,
      psychologicalSupport,
      hasGeminiContent: false, // テストではGeminiコンテンツは生成しない
      gptReporterAnalysis,
      grokXAnalysis,
      geminiImageUrl: null,
      geminiVideoUrl: null,
    });

    // 9. Eメール送信
    console.log('📨 CEO宛てEメール送信中...');
    const result = await resend.emails.send({
      from: 'Trap Defense BTC <reports@cryptotradeacademy.io>',
      to: CEO_EMAIL,
      subject: `🌤️ Trap Defense BTC Report - Test Delivery @ ${new Date().toISOString()}`,
      html,
      text: html.replace(/<[^>]*>/g, ''), // HTMLからテキストを抽出
    });

    console.log('\n✅ Eメール送信成功！');
    console.log('📧 Email ID:', result.data?.id || 'N/A');
    console.log(`📬 送信先: ${CEO_EMAIL}`);
    console.log('\n🎯 テスト完了');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main().catch(console.error);
