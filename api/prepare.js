// api/prepare.js
// 定時配信5分前にマーケット分析・サマリー作成・コンテンツ生成を実行

// p-retryはES Moduleのため動的インポートを使用
let pRetry;
const { zonedTimeToUtc, formatInTimeZone } = require('date-fns-tz');
const { z } = require('zod');
const { createLogger, TZ_UTC } = require('../utils/logger');

// LANG を正規化
const rawLang = process.env.LANG || 'en';
const baseLang = rawLang.toLowerCase().split('.')[0].split('_')[0];
const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
const LANG = SUPPORTED_LANGS.includes(baseLang) ? baseLang : 'en';

// 環境変数検証スキーマ
const EnvSchema = z.object({
  CRON_SECRET: z.string().optional(),
  REGULAR_SCHEDULE: z.enum(['4h', '6h']).optional(),
}).passthrough();

const { getExchangeInflow, getMinerPositionIndex } = require(
  '../services/cryptoquant/endpoints/btc',
);
const { getCQDeepMetrics } = require('../services/cryptoquant/deepMetrics');
const { fetchBTCKRWPrice } = require('../services/upbit/client');
const { fetch24hTicker } = require('../services/binance/client');
const { fetchUSDKRWRate } = require('../services/exchange/rate');

const { buildMarketContext, decideSignalAdvanced } = require('../logic/core/marketCore');
const { generateSignal } = require('../logic/tier1_btc/signalGen');
const { detectTrap } = require('../logic/tier1_btc/trapDetector');
const { normalizeSentiment } = require('../logic/tier1_btc/sentiment');
const marketSnapshotService = require('../services/core/marketSnapshot');
const { analyzeMarket, analyzeXSentimentLive } = require('../services/grok/client');
// GPT解析サービス（CryptoQuantデータ解析用）
const { generateCryptoQuantAnalysis } = require('../services/gpt/client');
const { generateMarketImage } = require('../services/gemini/imageGenerator');
const { generateMarketVideo } = require('../services/gemini/videoGenerator');
const { saveContent } = require('../services/core/contentStorage');

// 市場コードの取得
function getMarketCode(lang) {
  const langToMarket = {
    'en': 'EN',
    'ar': 'AR',
    'ko': 'KO',
    'ja': 'JA',
    'es': 'ES',
    'pt-br': 'PT-BR',
  };
  return langToMarket[lang] || 'EN';
}

// 外部データ取得ヘルパー
async function fetchBtcPrice() {
  const url = new URL(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
  );
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Price API Error: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  const data = json.bitcoin || {};
  return {
    priceUsd: Number(data.usd) || 0,
    change24h: Number(data.usd_24h_change) || 0,
  };
}

async function fetchFearGreed() {
  const url = new URL('https://api.alternative.me/fng/?limit=1');
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`FNG API Error: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  const point = json?.data?.[0];
  if (!point) return { value: null, label: 'Unknown' };
  return {
    value: Number(point.value) || null,
    label: point.value_classification || 'Unknown',
  };
}

// --- Main Prepare Handler -----------------------------------------

module.exports = async function handler(req, res) {
  // p-retryを動的インポート（ES Module対応）
  if (!pRetry) {
    try {
      const pRetryModule = await import('p-retry');
      pRetry = pRetryModule.default || pRetryModule;
    } catch (error) {
      console.error('[p-retry] Failed to import:', error);
      throw error;
    }
  }

  const debugBypass = req.query?.debug === 'local';
  const authHeader = req.headers.authorization;

  if (
    !debugBypass &&
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const logger = createLogger('handler');
  
  // 環境変数検証
  const envResult = EnvSchema.safeParse(process.env);
  if (!envResult.success) {
    logger.warn('Invalid environment variables', {
      errors: envResult.error.errors,
    });
  }

  logger.info('Prepare job started: Content Generation');

  try {
    // 0. 時間スロット判定（定時の5分前）- UTC固定
    const now = new Date();
    const nowUTC = zonedTimeToUtc(now, TZ_UTC);
    const utcHour = Number(formatInTimeZone(nowUTC, TZ_UTC, 'HH'));
    const utcMinute = Number(formatInTimeZone(nowUTC, TZ_UTC, 'mm'));
    // 定期配信スケジュール: 6時間ごと（0, 6, 12, 18）デフォルト、または4時間ごと（0, 4, 8, 12, 16, 20）
    const USE_4H_SCHEDULE = process.env.REGULAR_SCHEDULE === '4h';
    const REGULAR_HOURS_6H = [0, 6, 12, 18];
    const REGULAR_HOURS_4H = [0, 4, 8, 12, 16, 20];
    const REGULAR_HOURS = USE_4H_SCHEDULE ? REGULAR_HOURS_4H : REGULAR_HOURS_6H;
    const PREPARE_MINUTE = 55; // 定時の5分前
    
    // 定時の5分前（55分）または定時の0-4分の間を準備スロットとする
    const isPrepareSlot = REGULAR_HOURS.some(hour => {
      const interval = USE_4H_SCHEDULE ? 4 : 6;
      const prevHour = (hour - interval + 24) % 24;
      // 前の定時の55-59分（例: 23:55-23:59 → 0時の準備、または 17:55-17:59 → 18時の準備）
      if (utcHour === prevHour && utcMinute >= PREPARE_MINUTE) {
        return true;
      }
      // 現在の定時の0-4分（例: 0:00-0:04 → 0時の準備、フォールバック）
      if (utcHour === hour && utcMinute < 5) {
        return true;
      }
      return false;
    });
    const force = req.query?.force === 'true';

    if (!isPrepareSlot && !force) {
      console.log(
        `Prepare slot check => utcHour=${utcHour}, utcMinute=${utcMinute}, isPrepareSlot=${isPrepareSlot}, force=${force}`,
      );
      return res.status(200).json({ 
        message: 'Not a prepare slot, skipped.',
        utcHour,
        utcMinute,
        isPrepareSlot,
      });
    }

    console.log('✅ Prepare slot detected, starting content generation...');

    // 1. On-chain (CryptoQuant)
    const [inflowData, mpiData] = await Promise.all([
      getExchangeInflow(),
      getMinerPositionIndex(),
    ]);

    if (!inflowData || !mpiData) {
      logger.warn('No data from CryptoQuant');
      return res.status(200).json({ message: 'No on-chain data, skipped.' });
    }

    const inflow = Number(inflowData.value) || 0;
    const mpi = Number(mpiData.value) || 0;

    // 2. Price & Fear&Greed - リトライ付き
    const fetchPriceData = async () => {
      return await Promise.all([
        pRetry(() => fetchBtcPrice(), { retries: 2, factor: 2, minTimeout: 500 }),
        pRetry(() => fetchFearGreed(), { retries: 2, factor: 2, minTimeout: 500 }),
      ]);
    };

    const [priceMeta, fng] = await fetchPriceData();
    const priceUsd = priceMeta.priceUsd;
    const change24h = priceMeta.change24h;

    const rawSentiment = fng.label ?? fng.value;
    const sentimentLabel = normalizeSentiment(rawSentiment);

    // 3. Base context
    let xSentiment = { whaleBias: 0, retailFomo: 50, newsImpact: 0 };

    // X Sentiment取得（オプション、エラー時はデフォルト値を使用）
    try {
      const xSentimentResult = await analyzeXSentimentLive(LANG);
      if (xSentimentResult && typeof xSentimentResult === 'object') {
        xSentiment = xSentimentResult;
      }
    } catch (error) {
      logger.warn('X Sentiment fetch failed, using defaults', {
        error: error?.message,
      });
    }

    const market = getMarketCode(LANG);
    let ctx = buildMarketContext({
      asset: 'BTC',
      priceUsd,
      change24h,
      inflow,
      mpi,
      xSentiment,
      market,
    });

    // 4. CryptoQuant深掘りデータ取得 - リトライ付き
    let cqDeep = {};
    try {
      const deepData = await pRetry(
        () => getCQDeepMetrics(market, {
          upbitPrice: priceUsd,
          binancePrice: priceUsd,
          usdKrwRate: 1300,
        }),
        { retries: 2, factor: 2, minTimeout: 500 }
      );
      cqDeep = { ...cqDeep, ...deepData };
    } catch (error) {
      logger.warn('Error fetching deep metrics', {
        error: error?.message,
        market,
      });
    }

    // 5. 市場判定
    const coreDecision = await decideSignalAdvanced(market, ctx, cqDeep);
    const tradeSignal = generateSignal(coreDecision, ctx);
    const trap = detectTrap({ inflow, mpi, priceUsd, change24h });

    // 6. マーケットスナップショット作成
    const snapshot = marketSnapshotService.createSnapshot({
      asset: 'BTC',
      price_usd: priceUsd,
      price_usd_display: priceUsd.toLocaleString('en-US', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
      }),
      change_24h: change24h,
      inflow,
      mpi,
      sentiment_label: sentimentLabel,
      market_score: coreDecision.score,
      signal: tradeSignal.signal,
      tp: tradeSignal.tp,
      sl: tradeSignal.sl,
      regime: coreDecision.regime,
      confidence: coreDecision.confidence,
      trap: trap.isTrap,
      trap_confidence: trap.confidence,
    });

    // 7. AI分析（定期配信用）
    // GPTでCryptoQuantデータを解析、GrokでXを解析（並列実行）
    const cryptoQuantData = {
      inflow,
      mpi,
      priceUsd,
      change24h,
      sentiment: sentimentLabel,
      ...cqDeep, // 深掘りデータも含める
    };

    const marketContext = {
      priceUsd,
      change24h,
      score: coreDecision.score,
      signal: tradeSignal.signal,
      sentiment: sentimentLabel,
      trap,
    };

    // GPTとGrokを並列実行（一方が失敗してももう一方は継続）
    logger.info('Starting parallel AI analysis (GPT + Grok)');
    const [gptResult, grokResult] = await Promise.allSettled([
      // GPTでCryptoQuantデータを詳細解析
      (async () => {
        try {
          logger.info('GPT analyzing CryptoQuant data');
          const analysis = await generateCryptoQuantAnalysis(cryptoQuantData, marketContext, LANG);
          logger.info('GPT analysis completed', {
            analysisLength: analysis?.length || 0,
          });
          return analysis;
        } catch (error) {
          logger.warn('GPT analysis error', {
            error: error?.message,
            stack: error?.stack?.substring(0, 200),
          });
          throw error; // Promise.allSettledでキャッチされる
        }
      })(),
      // GrokでX（Twitter）を解析
      (async () => {
        try {
          logger.info('Grok analyzing X sentiment');
          const grokSent = await analyzeXSentimentLive(
            'latest BTC price action, funding, liquidations, whale activity, ETF flows on X',
          );
          
          if (grokSent && typeof grokSent === 'object') {
            xSentiment = {
              whaleBias: Number(grokSent.whaleBias) || 0,
              retailFomo: Number(grokSent.retailFomo) || 50,
              newsImpact: Number(grokSent.newsImpact) || 0,
            };
          }
          logger.info('Grok X analysis completed', {
            whaleBias: xSentiment.whaleBias,
            retailFomo: xSentiment.retailFomo,
            newsImpact: xSentiment.newsImpact,
          });
          return grokSent;
        } catch (error) {
          logger.warn('Grok X analysis error', {
            error: error?.message,
            stack: error?.stack?.substring(0, 200),
          });
          throw error; // Promise.allSettledでキャッチされる
        }
      })(),
    ]);

    // 結果を抽出（Promise.allSettledの結果を処理）
    let gptAnalysis = null;
    if (gptResult.status === 'fulfilled') {
      gptAnalysis = gptResult.value;
    } else {
      logger.warn('GPT analysis failed', {
        error: gptResult.reason?.message || 'Unknown error',
      });
    }

    let grokXAnalysis = null;
    if (grokResult.status === 'fulfilled') {
      grokXAnalysis = grokResult.value;
    } else {
      logger.warn('Grok X analysis failed', {
        error: grokResult.reason?.message || 'Unknown error',
      });
    }

    // 後方互換性のため、aiAnalysisにGPT解析結果を設定
    let aiAnalysis = gptAnalysis;

    // 8. Gemini画像生成
    let imageUrl = null;
    try {
      logger.info('Generating market image');
      imageUrl = await generateMarketImage(snapshot, LANG);
      if (imageUrl) {
        logger.info('Image generated successfully', {
          imageUrlLength: imageUrl.length,
        });
      } else {
        logger.warn('Image generation returned null');
      }
    } catch (error) {
      logger.warn('Image generation failed', {
        error: error?.message,
        stack: error?.stack?.substring(0, 200),
      });
    }

    // 9. Gemini動画生成（AIキャスター）
    let videoUrl = null;
    if (aiAnalysis) {
      try {
        logger.info('Generating market video (AI caster)');
        videoUrl = await generateMarketVideo(snapshot, aiAnalysis, LANG);
        if (videoUrl) {
          logger.info('Video generated successfully', {
            videoUrlLength: videoUrl.length,
          });
        } else {
          logger.warn('Video generation returned null');
        }
      } catch (error) {
        logger.warn('Video generation failed', {
          error: error?.message,
          stack: error?.stack?.substring(0, 200),
        });
      }
    }

    // 10. コンテンツをVercel KVに保存
    // GPT解析結果とGrok X解析結果の両方を保存
    const slotTime = require('../services/core/contentStorage').getNextRegularSlotTime(now);
    const contentSaved = await saveContent(market, {
      imageUrl,
      videoUrl,
      summary: aiAnalysis, // GPT解析結果
      gptAnalysis: gptAnalysis, // GPT解析結果（明示的に保存）
      grokXAnalysis: grokXAnalysis, // Grok X解析結果
      marketData: {
        ...snapshot,
        coreDecision,
        tradeSignal,
        trap,
        cqDeep,
        xSentiment, // Xセンチメントも保存
      },
    }, slotTime);

    if (!contentSaved) {
      console.warn('[Prepare] Failed to save content to storage');
    }


    return res.status(200).json({
      success: true,
      message: 'Content prepared successfully',
      slotTime,
      market,
      content: {
        imageGenerated: !!imageUrl,
        videoGenerated: !!videoUrl,
        summaryGenerated: !!aiAnalysis,
      },
      metrics: {
        inflow,
        mpi,
        sentiment: sentimentLabel,
        priceUsd,
        change24h,
        score: coreDecision.score,
        signal: tradeSignal.signal,
      },
    });
  } catch (error) {
    const logger = createLogger('handler');
    logger.error('Prepare job error', {
      error: error?.message,
      stack: error?.stack?.substring(0, 500),
    });
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
