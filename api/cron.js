// api/cron.js

// --- Imports ----------------------------------------------------

// p-retryはES Moduleのため動的インポートを使用
let pRetry;
const { zonedTimeToUtc, formatInTimeZone } = require('date-fns-tz');
const { createLogger, TZ_UTC } = require('../utils/logger');

// LANG を正規化（en, es, pt-br, ar, ja, ko だけ許可）
const rawLang = process.env.LANG || 'en';
const baseLang = rawLang.toLowerCase().split('.')[0].split('_')[0];
const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
const LANG = SUPPORTED_LANGS.includes(baseLang) ? baseLang : 'en';

// 言語別テンプレートを lang-suffixed ファイルから読み込む
function loadUserTemplates(lang) {
  try {
    // 例: services/telegram/messages/user/en/regular.en.js
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const { formatRegularBriefing } = require(
      `../services/telegram/messages/user/${lang}/regular.${lang}`,
    );
    const { formatTrapAlert } = require(
      `../services/telegram/messages/user/${lang}/emergency.${lang}`,
    );
    // 無料版テンプレート（minimal-high-quality版を優先、なければminimal版）
    let formatMinimalBriefing = null;
    try {
      const { formatMinimalHighQualityBriefing } = require(
        `../services/telegram/messages/user/${lang}/minimal-high-quality.${lang}`,
      );
      formatMinimalBriefing = formatMinimalHighQualityBriefing;
    } catch (e) {
      try {
        const { formatMinimalBriefing: minimalFn } = require(
          `../services/telegram/messages/user/${lang}/minimal.${lang}`,
        );
        formatMinimalBriefing = minimalFn;
      } catch (e2) {
        console.warn(`Minimal template not found for ${lang}, will use EN fallback`);
      }
    }
    return { formatRegularBriefing, formatTrapAlert, formatMinimalBriefing };
  } catch (e) {
    console.warn(`Fallback to EN templates. lang=${lang} error=${e.message}`);
    const { formatRegularBriefing } = require(
      '../services/telegram/messages/user/en/regular.en',
    );
    const { formatTrapAlert } = require(
      '../services/telegram/messages/user/en/emergency.en',
    );
    // 無料版テンプレート（EN版をフォールバック）
    let formatMinimalBriefing = null;
    try {
      const { formatMinimalHighQualityBriefing } = require(
        '../services/telegram/messages/user/en/minimal-high-quality.en',
      );
      formatMinimalBriefing = formatMinimalHighQualityBriefing;
    } catch (e2) {
      try {
        const { formatMinimalBriefing: minimalFn } = require(
          '../services/telegram/messages/user/en/minimal.en',
        );
        formatMinimalBriefing = minimalFn;
      } catch (e3) {
        console.warn('Minimal template not found even in EN fallback');
      }
    }
    return { formatRegularBriefing, formatTrapAlert, formatMinimalBriefing };
  }
}

const { formatRegularBriefing, formatTrapAlert, formatMinimalBriefing } = loadUserTemplates(LANG);
// メールHTMLフォーマット関数（英語版をデフォルトとして使用）
const { formatRegularBriefingHTML } = require('../services/email/messages/user/en/regular.en');

const { getExchangeInflow, getMinerPositionIndex } = require(
  '../services/cryptoquant/endpoints/btc',
);
// Phase 2: 市場別深掘りデータ
const { getCQDeepMetrics } = require('../services/cryptoquant/deepMetrics');
// 高解像度CryptoQuantデータ取得
const { getHighResolutionCQData } = require('../services/cryptoquant/highResolution');
// Phase 3: CryptoQuant capabilities初期化
const { initializeCapabilities } = require('../services/cryptoquant/capabilities');
// 価格取得サービス（KO市場用）
const { fetchBTCKRWPrice } = require('../services/upbit/client');
const { fetch24hTicker, getComplementaryData } = require('../services/binance/client');
const { fetchUSDKRWRate } = require('../services/exchange/rate');

const { buildMarketContext, decideSignal, decideSignalAdvanced } = require('../logic/core/marketCore');
const { generateSignal } = require('../logic/tier1_btc/signalGen');
const { BASE } = require('./config/thresholds');
// 市場別プロファイル（MIN_CONF_FOR_TRADE取得用）
let marketProfiles = null;
try {
  marketProfiles = require('./config/marketProfiles');
} catch (e) {
  // marketProfiles.jsがない場合は無視
}
const { detectTrap } = require('../logic/tier1_btc/trapDetector');
const { normalizeSentiment } = require('../logic/tier1_btc/sentiment');
// Phase 3: Market Snapshot Service (リアルタイム検証対応)
const marketSnapshotService = require('../services/core/marketSnapshot');
// Phase 2: Message Logger Service (A/Bテスト・計測用)
const messageLogger = require('../services/core/messageLogger');

const { analyzeMarket, analyzeXSentimentLive } = require('../services/grok/client');
// 高解像度Grok X解析
const { analyzeXSentimentHighResolutionCompat } = require('../services/grok/highResolution');
// USP3: Dr. Grokの心理的サポート機能
const { diagnoseUserSentimentCompat } = require('../services/grok/psychologicalSupport');
// USP1: トラップ防御エンジン
const { detectTrapDetection, generateTrapAlert, detectMarketBug, evaluateMarketBugSignal } = require('../logic/core/trapDetector');
// GPT解析サービス（CryptoQuantデータ解析用）
const { analyzeCryptoQuantData, generateCryptoQuantAnalysis, generateNonUserImpactReport } = require('../services/gpt/client');
const { sendMessage, sendPhoto, sendVideo, sendMessageMinimal, sendMessageToChannel, sendMessageToAsset } = require('../services/telegram/bot');
// Resend Email送信サービス
const { sendBatchEmails } = require('../services/email/resendClient');
// Gemini画像生成サービス（オプション）- 無効化: CEO指示により削除
// const { generateMarketImage } = require('../services/gemini/imageGenerator');
// Gemini動画生成サービス（定期配信用）- 無効化: CEO指示により削除
// const { generateMarketVideo } = require('../services/gemini/videoGenerator');
// Gemini番組プロデューサー（ストーリーブランド戦略2.0）- 簡素化版
const { produceShow } = require('../services/gemini/showProducer');
// コンテンツ保存サービス（定時配信用）
const { getContent } = require('../services/core/contentStorage');
// 信頼度スコアベースの統一品質ゲート（全方位対応）
// 見逃した機会計算ユーティリティ
const { calculateMissedOpportunities, formatMissedOpportunities } = require('../utils/missedOpportunities');

// Phase 1: イベント駆動配信システム（Strategic SSOT v4.0）
const ENABLE_EVENT_DRIVEN = process.env.ENABLE_EVENT_DRIVEN === 'true';
// Gemini画像生成の有効化（オプション）
const ENABLE_GEMINI_IMAGES = process.env.ENABLE_GEMINI_IMAGES === 'true';
// Telegram送信の有効化（デフォルト: true = Telegram配信を主要チャネルとして使用）
// COO推奨: Telegram配信に戻す（コスト最適化、運用負荷最小化、即時性の確保）
const ENABLE_TELEGRAM = process.env.ENABLE_TELEGRAM !== 'false'; // デフォルトでtrue（明示的にfalseにしない限り有効）
let stateManager, evaluateTrigger;

if (ENABLE_EVENT_DRIVEN) {
  try {
    stateManager = require('../utils/stateManager');
    evaluateTrigger = require('../logic/eventTriggers').evaluateTrigger;
    console.log('[Phase 1] Event-driven delivery system enabled');
  } catch (error) {
    console.warn('[Phase 1] Event-driven modules not found, falling back to legacy mode:', error.message);
  }
}

// 市場コードの取得（LANGから推測、または環境変数から）
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

/**
 * メール送信先リストを取得
 * 環境変数またはデータベースから取得（将来実装）
 * 
 * @param {string} lang - 言語コード
 * @returns {string[]} メールアドレスの配列
 */
function getRecipientEmails(lang) {
  // 環境変数から取得（カンマ区切り）
  const envKey = `EMAIL_RECIPIENTS_${lang.toUpperCase().replace('-', '_')}`;
  const envEmails = process.env[envKey] || process.env.EMAIL_RECIPIENTS;
  
  if (envEmails) {
    return envEmails.split(',').map(email => email.trim()).filter(email => email);
  }

  // デフォルト: CEOのメールアドレス（テスト用）
  // 本番環境ではデータベースまたはWhop APIから取得する実装が必要
  const defaultEmail = 'chibaichi.work@gmail.com'; // CEO
  console.warn(`[Email] No recipients configured for lang=${lang}. Using default: ${defaultEmail}`);
  console.warn(`[Email] Set ${envKey} or EMAIL_RECIPIENTS environment variable for production.`);
  return [defaultEmail];
}

// --- External data helpers -------------------------------------

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

// --- Watch helper (cheap trigger, no LLM) -----------------------
function shouldWatch({ score, confidence, trap, isRegularSlot }) {
  // REGULAR 時は定期配信でカバーするので WATCH を抑制
  if (isRegularSlot) return false;

  // EMERGENCY は別で処理（trap HIGH）
  if (trap?.isTrap && trap?.confidence === 'HIGH') return false;

  // “重要そう”の薄いWATCH: スコアがそこそこ偏っていて、confidenceもそれなり
  // ※しきい値は後でログ見て調整
  const s = Number(score ?? 0);
  const c = Number(confidence ?? 0);

  return (Math.abs(s) >= 22 && c >= 0.55) || (Math.abs(s) >= 28 && c >= 0.5);
}

// --- Main Cron Handler -----------------------------------------

module.exports = async function handler(req, res) {
  // trapDetectionとtrapAlertを関数スコープで定義（全ブロックで使用するため）
  var trapDetection = null;
  var trapAlert = null;
  var marketBugDetection = null; // 後方互換性のため
  var psychologicalSupport = null; // USP3: Dr. Grokの心理的サポート
  
  // Phase 3: CryptoQuant capabilities初期化（起動時に一度だけ）
  try {
    await initializeCapabilities();
  } catch (error) {
    console.warn('[Phase 3] Failed to initialize CryptoQuant capabilities:', error.message);
    // エラーが発生しても処理は続行（フォールバック動作）
  }
  
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
  logger.info('Cron job started: Whale Monitor');

  try {
    // 0. 時間スロット判定（6時間ごとデフォルト、4時間ごとに切り替え可能）- UTC固定
    const now = new Date();
    const nowUTC = zonedTimeToUtc(now, TZ_UTC);
    const utcHour = Number(formatInTimeZone(nowUTC, TZ_UTC, 'HH'));
    const utcMinute = Number(formatInTimeZone(nowUTC, TZ_UTC, 'mm'));
    // 定期配信スケジュール: 6時間ごと（0, 6, 12, 18）デフォルト、または4時間ごと（0, 4, 8, 12, 16, 20）
    const REGULAR_HOURS_6H = [0, 6, 12, 18];
    const REGULAR_HOURS_4H = [0, 4, 8, 12, 16, 20];
    // 環境変数で切り替え可能（デフォルトは6時間ごと）
    const USE_4H_SCHEDULE = process.env.REGULAR_SCHEDULE === '4h';
    const REGULAR_HOURS = USE_4H_SCHEDULE ? REGULAR_HOURS_4H : REGULAR_HOURS_6H;
    const isRegularSlot = REGULAR_HOURS.includes(utcHour) && utcMinute < 5;
    const force = req.query?.force === 'true';

    logger.info('Slot check', {
      utcHour,
      utcMinute,
      isRegularSlot,
      force,
      schedule: USE_4H_SCHEDULE ? '4h' : '6h',
    });

    // 1. On-chain (CryptoQuant) - リトライ付き
    const fetchCQData = async () => {
      return await Promise.all([
        pRetry(() => getExchangeInflow(), { retries: 2, factor: 2, minTimeout: 500 }),
        pRetry(() => getMinerPositionIndex(), { retries: 2, factor: 2, minTimeout: 500 }),
      ]);
    };

    const [inflowData, mpiData] = await fetchCQData();

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

    // 3. Base context (X Sentiment defaults)
    let xSentiment = { whaleBias: 0, retailFomo: 50, newsImpact: 0 };

    // ===== 15分ごとの緊急配信処理: GPTでCryptoQuantデータ解析（ルールベース判定追加） =====
    let gptCryptoQuantAnalysis = null;
    let gptSignalDecision = null;
    
    // ルールベース判定: GPTを呼ぶ前に閾値チェック（コスト削減）
    // 環境変数で閾値を調整可能（デフォルト値は最適化済み）
    const GPT_THRESHOLD_INFLOW = Number(process.env.GPT_THRESHOLD_INFLOW || 500);
    const GPT_THRESHOLD_MPI = Number(process.env.GPT_THRESHOLD_MPI || 1.5);
    const GPT_THRESHOLD_CHANGE24H = Number(process.env.GPT_THRESHOLD_CHANGE24H || 3.0);
    
    const shouldCallGPT = !isRegularSlot && (
      Math.abs(inflow) > GPT_THRESHOLD_INFLOW || // Exchange Netflowが大きい
      Math.abs(mpi) > GPT_THRESHOLD_MPI || // MPIが極端
      Math.abs(change24h) > GPT_THRESHOLD_CHANGE24H || // 24h変動が大きい
      force // 強制実行
    );
    
    if (shouldCallGPT) {
      // 15分ごとの緊急配信用: GPTでCryptoQuantデータを解析
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
          sentiment: sentimentLabel,
        };

        logger.info('Analyzing CryptoQuant data for emergency signal detection', {
          inflow,
          mpi,
          change24h,
        });
        
        gptCryptoQuantAnalysis = await analyzeCryptoQuantData(cryptoQuantData, marketContext, LANG);
        
        logger.info('GPT analysis result', {
          signal: gptCryptoQuantAnalysis.signal,
          confidence: gptCryptoQuantAnalysis.confidence,
          urgency: gptCryptoQuantAnalysis.urgency,
        });

        // GPT解析結果はトラップアラート生成に使用（BUY/SELLシグナル生成は削除）
        if (gptCryptoQuantAnalysis.confidence >= 0.80) {
          // GPT解析結果はトラップアラート生成に使用（BUY/SELLシグナルは生成しない）
          gptSignalDecision = {
            signal: 'NONE', // BUY/SELLシグナルは完全削除
            confidence: gptCryptoQuantAnalysis.confidence,
            reasoning: gptCryptoQuantAnalysis.reasoning,
            urgency: gptCryptoQuantAnalysis.urgency,
            keyIndicators: gptCryptoQuantAnalysis.keyIndicators || [],
            riskLevel: gptCryptoQuantAnalysis.riskLevel || 'medium',
          };
          logger.info('High-confidence trap alert detected (AVOID_SHORT/AVOID_LONG)', {
            confidence: gptSignalDecision.confidence,
            urgency: gptSignalDecision.urgency,
          });
        }
      } catch (error) {
        // エラータイプ別の処理
        if (error?.status === 429) {
          logger.warn('Rate limit hit, will retry on next run', {
            error: error?.message,
          });
        } else if (error?.status >= 500) {
          logger.error('Server error, using fallback', {
            error: error?.message,
            status: error?.status,
          });
        } else {
          logger.warn('GPT analysis error, using fallback', {
            error: error?.message,
            stack: error?.stack?.substring(0, 200),
          });
        }
        // GPT解析エラー時は既存ロジックにフォールバック
      }
    } else if (!isRegularSlot) {
      logger.info('Skipping GPT call (thresholds not met)', {
        inflow,
        mpi,
        change24h,
      });
    }

    // Binance補完データを取得（ダイバージェンス検出用）
    let binanceData = null;
    try {
      binanceData = await getComplementaryData('BTCUSDT');
      logger.info('Binance complementary data fetched', {
        fundingRate: binanceData.currentFundingRate,
        longShortRatio: binanceData.currentLongShortRatio,
      });
    } catch (error) {
      logger.warn('Failed to fetch Binance complementary data', {
        error: error.message,
      });
    }

    let ctx = buildMarketContext({
      asset: 'BTC',
      priceUsd,
      change24h,
      inflow,
      mpi,
      xSentiment,
      market: getMarketCode(LANG), // Phase 2: 市場情報追加
    });
    
    // Binanceデータをctxに追加（ダイバージェンス検出用）
    if (binanceData) {
      ctx.binanceData = {
        currentFundingRate: binanceData.currentFundingRate,
        currentLongShortRatio: binanceData.currentLongShortRatio,
      };
    }

    // Phase 2: decideSignalAdvanced使用（市場別補正）
    let coreDecision = decideSignalAdvanced ? decideSignalAdvanced(ctx) : decideSignal(ctx);
    
    // GPT解析結果はトラップアラート生成に使用（BUY/SELLシグナル生成は削除）
    if (gptSignalDecision && gptSignalDecision.confidence >= 0.80) {
      console.log('[GPT] Using GPT analysis for trap alert generation (BUY/SELL signal generation removed)');
      // GPT解析結果はトラップアラート生成に使用（BUY/SELLシグナルは生成しない）
      coreDecision = {
        ...coreDecision,
        signal: 'NONE', // BUY/SELLシグナルは完全削除
        confidence: gptSignalDecision.confidence,
      };
    }
    
    let tradeSignal = generateSignal({
      priceUsd,
      score: coreDecision.score,
      direction: coreDecision.signal,
    });

    // sideは常にFLAT（BUY/SELL/LONG/SHORTは完全削除）
    let side = 'FLAT';

    // 信頼度スコアベースの統一品質ゲート（トラップアラートのみ対応）
    // MIN_CONF_FOR_TRADE未満の信頼度のシグナルは配信しない
    let market = getMarketCode(LANG);
    let minConfForTrade = BASE?.MIN_CONF_FOR_TRADE ?? 0.45;
    if (marketProfiles) {
      try {
        const marketProfile = marketProfiles.getMarketProfile(market);
        if (marketProfile?.algorithm?.MIN_CONF_FOR_TRADE) {
          minConfForTrade = marketProfile.algorithm.MIN_CONF_FOR_TRADE;
        }
      } catch (e) {
        // エラー時はBASEを使用
      }
    }
    
    // 注: trapAlertは後で生成されるため、ここでのチェックは削除
    // 信頼度ゲートは trapAlert 生成後（832行目以降）で適用される

    let entry = priceUsd;
    let tp = tradeSignal.tp;
    let sl = tradeSignal.sl;

    // 5. Trap detect (on-chain only)
    let trap = detectTrap({
      priceChange: change24h,
      volume: 0,
      inflow,
      mpi,
    });

    // Phase 4: EMERGENCY判定（SSOT準拠）
    // Step 1: SSOT閾値統一 - trapScore>=60 に統一（品質ゲートと統一）
    // 注: trapScoreは後で取得されるため、ここでは一時的な判定のみ
    // 最終的なEMERGENCY判定は eventTriggers.js で行う
    const needsEmergency = (trap.isTrap && trap.confidence === 'HIGH' && !isRegularSlot) ||
                           (gptSignalDecision && gptSignalDecision.urgency === 'high' && !isRegularSlot);

    // WATCH (cheap) before calling Grok
    const needsWatch = shouldWatch({
      score: coreDecision.score,
      confidence: coreDecision.confidence,
      trap,
      isRegularSlot,
    });

    // ---- Grok call gates (cost valve) --------------------------
    // needsXIntel: X監視だけ（安い） = REGULAR / force / EMERGENCY / WATCH
    const needsXIntel = isRegularSlot || force || needsEmergency || needsWatch;

    // needsLongReport: 長文生成（高い） = REGULAR / force / EMERGENCY のみ
    const needsLongReport = isRegularSlot || force || needsEmergency;

    let aiAnalysis = null;
    let xIntel = null; // for debugging/telemetry

    // 高解像度データ変数を先に宣言（Phase 2とPhase 3で使用）
    let highResCQData = null;
    let highResXData = null;

    // 6. Grok (X intel only) - 高解像度解析を使用
    if (needsXIntel) {
      try {
        // 高解像度X解析を実行（複数クエリ並列実行、より詳細な構造化出力）
        const grokSent = await analyzeXSentimentHighResolutionCompat(
          'latest BTC price action, funding, liquidations, whale activity, ETF flows on X',
          LANG,
        );
        xIntel = grokSent;
        highResXData = grokSent._highResolution || null;

        if (grokSent && typeof grokSent === 'object') {
          xSentiment = {
            whaleBias: Number(grokSent.whaleBias) || 0,
            retailFomo: Number(grokSent.retailFomo) || 50,
            newsImpact: Number(grokSent.newsImpact) || 0,
          };
        }
      } catch (err) {
        console.warn(
          '⚠️ Grok High-Resolution X Analysis Error, falling back to standard analysis:',
          err?.message || err,
        );
        // フォールバック: 標準のX解析
        try {
          const fallbackGrokSent = await analyzeXSentimentLive(
            'latest BTC price action, funding, liquidations, whale activity, ETF flows on X',
          );
          xIntel = fallbackGrokSent;
          if (fallbackGrokSent && typeof fallbackGrokSent === 'object') {
            xSentiment = {
              whaleBias: Number(fallbackGrokSent.whaleBias) || 0,
              retailFomo: Number(fallbackGrokSent.retailFomo) || 50,
              newsImpact: Number(fallbackGrokSent.newsImpact) || 0,
            };
          }
        } catch (fallbackErr) {
          console.warn('⚠️ Grok Live Search Error (fallback also failed):', fallbackErr?.message || fallbackErr);
        }
      }

      // Re-evaluate with xSentiment
      // Phase 2+: Binanceデータをctxに含める（後でcqDeepから取得）
      // 高解像度データも含める
      ctx = buildMarketContext({
        asset: 'BTC',
        priceUsd,
        change24h,
        inflow,
        mpi,
        xSentiment,
        market: getMarketCode(LANG), // Phase 2: 市場情報追加
        highResCQ: highResCQData, // 高解像度CryptoQuantデータ
        highResX: highResXData, // 高解像度Xセンチメントデータ
        // binanceDataは後でcqDeepから設定
      });

      coreDecision = decideSignal(ctx);
      tradeSignal = generateSignal({
        priceUsd,
        score: coreDecision.score,
        direction: coreDecision.signal,
      });

      side = 'FLAT'; // BUY/SELL/LONG/SHORTは完全削除

      entry = priceUsd;
      tp = tradeSignal.tp;
      sl = tradeSignal.sl;

      // Re-evaluate trap with sentiment (FOMO/PANIC rules)
      const trapWithSentiment = detectTrap({
        priceChange: change24h,
        volume: 0,
        inflow,
        mpi,
        whaleBias: xSentiment.whaleBias,
        retailFomo: xSentiment.retailFomo,
      });

      if (trapWithSentiment?.isTrap) {
        trap = trapWithSentiment;
      }

    }
    
    // Phase 3: Market Snapshot生成（全言語で同一データを保証）
    // 重要: EN市場基準で統一スコアを計算（市場別補正は適用しない）
    // 高解像度データが利用可能な場合は含める
    // 注: highResCQData と highResXData は既に上で宣言済み
    
    // 高解像度データがまだ取得されていない場合は、ここで取得
    // (イベント駆動パスでは既に取得済みの場合がある)
    if (!highResCQData || !highResXData) {
      // 高解像度データの取得は後でイベント駆動パスで行われる
    }
    
    const baseCtx = buildMarketContext({
      asset: 'BTC',
      priceUsd,
      change24h,
      inflow,
      mpi,
      xSentiment,
      market: 'EN', // ベースはENで統一
      highResCQ: highResCQData, // 高解像度データ（イベント駆動パスで取得済みの場合）
      highResX: highResXData, // 高解像度データ（イベント駆動パスで取得済みの場合）
      binanceData: binanceData || null,
    });
    const baseCoreDecision = decideSignal(baseCtx);

    const snapshot = marketSnapshotService.createSnapshot({
      priceUsd,
      change24h,
      inflow,
      mpi,
      sentimentLabel,
      xSentiment,
      trap,
    });

    // スナップショットのスコアを使用（全言語で統一）
    coreDecision = {
      ...baseCoreDecision,
      score: snapshot.market_score, // スナップショットの統一スコアを使用
    };
    tradeSignal = generateSignal({
      priceUsd: snapshot.price_usd_display, // 統一価格を使用
      score: snapshot.market_score, // 統一スコアを使用
      direction: coreDecision.signal,
    });
    
    // sideは常にFLAT（BUY/SELL/LONG/SHORTは完全削除）
    side = 'FLAT';
    
    entry = priceUsd;
    tp = tradeSignal.tp;
    sl = tradeSignal.sl;

    // Phase 4: EMERGENCY判定（SSOT準拠）
    // Step 1: SSOT閾値統一 - trapScore>=60 に統一（品質ゲートと統一）
    // 注: trapScoreは cqDeep.trapScore または trapDetection.trapScore から取得
    // 最終的なEMERGENCY判定は eventTriggers.js で行う（trapScore>=60, liquidations>$500M, kimchiPremium>8%）
    // ここでは一時的な判定のみ（後方互換性のため）
    const finalNeedsEmergency =
      trap.isTrap && trap.confidence === 'HIGH' && !isRegularSlot;

    // ===== Phase 1: イベント駆動配信判定（Strategic SSOT v4.0） =====
    let shouldSend = true; // デフォルト: 既存動作維持
    let triggerType = isRegularSlot ? 'REGULAR' : (finalNeedsEmergency ? 'EMERGENCY' : 'WATCH');
    let triggerReason = 'Legacy mode';

    // Phase 2: 深掘りデータ初期化
    // 基本データで初期化し、後でイベント駆動パスまたはREGULARパスで拡張
    let cqDeep = { inflow, mpi };

    if (ENABLE_EVENT_DRIVEN && stateManager && evaluateTrigger) {
      try {
        // marketは既に上で宣言済み（392行目）、再代入のみ
        market = getMarketCode(LANG);

        // 前回状態取得
        const lastState = await stateManager.getLastState(market);

        // Step 2-4: EMERGENCY判定指標のキャッシュバイパス判定
        // 前回の状態からEMERGENCY判定が必要かどうかを事前にチェック
        // ただし、正確な判定には最新データが必要なため、常にskipCache: trueとする
        // （EMERGENCY判定は誤報を避けるため、常に最新データを使用）
        const shouldSkipCacheForEmergency = true; // EMERGENCY判定時は常にキャッシュをバイパス

        // Phase 2: CryptoQuant深掘りデータ取得（先に取得）
        // 高解像度データも並列取得
        // 注: highResCQDataは既に上で宣言済み（455行目）、再初期化
        highResCQData = null;
        try {
          // KO市場の場合のみ、実際の価格情報を取得
          let priceOptions = {};
          if (market.toLowerCase() === 'ko') {
            try {
              const [upbitPriceData, binancePriceData, usdKrwRate] = await Promise.all([
                fetchBTCKRWPrice(),
                fetch24hTicker('BTCUSDT'),
                fetchUSDKRWRate(),
              ]);
              priceOptions = {
                upbitPrice: upbitPriceData?.tradePrice ?? priceUsd, // Upbit BTC/KRW価格（フォールバック: USD価格）
                binancePrice: binancePriceData?.lastPrice ?? priceUsd, // Binance BTC/USDT価格（フォールバック: USD価格）
                usdKrwRate: usdKrwRate ?? 1300, // USD/KRW為替レート（フォールバック: 1300）
              };
              console.log('[Phase 2] Price data fetched:', {
                upbitPrice: priceOptions.upbitPrice,
                binancePrice: priceOptions.binancePrice,
                usdKrwRate: priceOptions.usdKrwRate,
              });
            } catch (priceError) {
              console.warn('[Phase 2] Error fetching price data, using fallback:', priceError.message);
              // フォールバック: 既存のハードコード値
              priceOptions = {
                upbitPrice: priceUsd,
                binancePrice: priceUsd,
                usdKrwRate: 1300,
              };
            }
          } else {
            // 非KO市場の場合は、既存の動作を維持（priceOptionsは空のまま）
            priceOptions = {
              upbitPrice: priceUsd,
              binancePrice: priceUsd,
              usdKrwRate: 1300,
            };
          }

          // Step 2-4: EMERGENCY判定指標のキャッシュバイパス
          // イベント駆動配信時は、EMERGENCY判定に使う指標（trapScore, liquidations, kimchiPremium）を
          // 常に最新データで取得（キャッシュをバイパス）
          priceOptions.skipCache = shouldSkipCacheForEmergency;

          // 標準深掘りデータと高解像度データを並列取得
          // 注意: ProfessionalプランではAPI解像度が「1日まで」のため、'day'のみを使用
          // Premiumプラン以上の場合は環境変数CRYPTOQUANT_PLAN=premiumで複数時間窓が利用可能
          const [deepData, highResCQ] = await Promise.allSettled([
            getCQDeepMetrics(market, priceOptions),
            getHighResolutionCQData({
              // windowsはgetHighResolutionCQData内でプランに応じて自動設定される
              limit: 24,
              includeWhaleRatio: true,
              includeLiquidations: true,
              // Step 2-4: EMERGENCY判定指標のキャッシュバイパス
              skipCache: shouldSkipCacheForEmergency,
            }),
          ]);
          
          if (deepData.status === 'fulfilled') {
            cqDeep = { ...cqDeep, ...deepData.value };
            
            // Phase 4: liquidationsが取得できなかった場合、Binanceから取得を試みる
            const { getLiquidationsWithFallback } = require('../services/binance/liquidations');
            if (!cqDeep.liquidations || (cqDeep.liquidations.totalLiquidations || 0) === 0) {
              try {
                const binanceLiquidations = await getLiquidationsWithFallback(cqDeep.liquidations);
                if (binanceLiquidations && binanceLiquidations.totalLiquidations > 0) {
                  cqDeep.liquidations = binanceLiquidations;
                  console.log('[Phase 4] Liquidations fetched from Binance fallback:', {
                    total: binanceLiquidations.totalLiquidations,
                    source: binanceLiquidations.source,
                  });
                }
              } catch (error) {
                console.warn('[Phase 4] Error fetching liquidations from Binance fallback:', error.message);
              }
            }
          } else {
            console.warn('[Phase 2] Error fetching deep metrics:', deepData.reason?.message);
          }
          
          if (highResCQ.status === 'fulfilled') {
            highResCQData = highResCQ.value;
            console.log('[High-Resolution CQ] Data fetched successfully, bug signals:', highResCQData.bugSignals?.overallBugScore);
          } else {
            console.warn('[High-Resolution CQ] Error fetching high-resolution data:', highResCQ.reason?.message);
          }
        } catch (error) {
          console.warn('[Phase 2] Error in data fetching, using basic data:', error.message);
        }

        // 現在状態の構築（trapScore計算が必要な場合）
        // signalの正規化: NONE/FLAT → TRAP_STANDBY
        // TRAP_STANDBY = "70%の時間、何もするな"戦略（Trap Defense Academyの差別化ポイント）
        // SSOT準拠: BUG → TRAP に統一
        let normalizedSignal = coreDecision.signal || tradeSignal.signal;
        
        // 信頼度スコアベースの統一品質ゲート（イベント駆動モード、全方位対応）
        // 注: marketは既に上で宣言済み（392行目）、再代入
        market = getMarketCode(LANG);
        let minConfForTrade = BASE?.MIN_CONF_FOR_TRADE ?? 0.45;
        if (marketProfiles) {
          try {
            const marketProfile = marketProfiles.getMarketProfile(market);
            if (marketProfile?.algorithm?.MIN_CONF_FOR_TRADE) {
              minConfForTrade = marketProfile.algorithm.MIN_CONF_FOR_TRADE;
            }
          } catch (e) {
            // エラー時はBASEを使用
          }
        }
        
        if (normalizedSignal !== 'NONE' && normalizedSignal !== 'TRAP_STANDBY' && 
            coreDecision.confidence < minConfForTrade) {
          console.log(`[Confidence Gate] Blocked in event-driven mode: confidence ${coreDecision.confidence.toFixed(2)} < ${minConfForTrade}`);
          normalizedSignal = 'TRAP_STANDBY';
        } else if (normalizedSignal !== 'NONE' && normalizedSignal !== 'TRAP_STANDBY') {
          console.log(`[Confidence Gate] Passed in event-driven mode: confidence ${coreDecision.confidence.toFixed(2)} >= ${minConfForTrade}`);
        }
        
        if (!normalizedSignal || normalizedSignal === 'NONE' || normalizedSignal === 'FLAT') {
          normalizedSignal = 'TRAP_STANDBY';
        }

        const currentState = {
          signal: normalizedSignal,
          score: coreDecision.score,
          regime: coreDecision.regime,
          confidence: coreDecision.confidence,
          trapScore: cqDeep.trapScore ?? (trap.isTrap ? (trap.confidence === 'HIGH' ? 80 : trap.confidence === 'MEDIUM' ? 50 : 30) : 0),
          kimchiPremium: cqDeep.kimchiPremium ?? 0,
          riskReward: cqDeep.riskReward ?? 1.0,
        };

        // イベントトリガー評価
        const trigger = await evaluateTrigger(market, currentState, lastState, cqDeep);

        shouldSend = trigger.shouldSend;
        triggerType = trigger.triggerType;
        triggerReason = trigger.reason;

        console.log(`[Event-Driven] Market: ${market}, Trigger: ${triggerType}, ShouldSend: ${shouldSend}, Reason: ${triggerReason}`);

        // 配信する場合のみ状態保存
        if (shouldSend) {
          await stateManager.saveState(market, {
            ...currentState,
            lastSignal: currentState.signal,
            lastScore: currentState.score,
          });
        }
      } catch (error) {
        console.error('[Event-Driven] Error in event trigger evaluation, falling back to legacy mode:', error);
        // エラー時は既存動作を維持
      }
    }
    // ===== Phase 1 End =====

    // 6-2. 定期配信時のAI解析（GPT + Grok分離）
    // イベント駆動有効時は、トリガー判定後にAI呼び出しを調整
    const shouldCallAI = shouldSend || isRegularSlot || force;
    let gptRegularAnalysis = null; // 定期配信用GPT解析
    let grokXAnalysis = null; // 定期配信用Grok X解析
    
    if (needsLongReport && shouldCallAI && isRegularSlot) {
      // 定期配信時: GPTがCryptoQuantデータを解析、GrokがXを解析
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

      try {
        // GPTでCryptoQuantデータを詳細解析
        console.log('[GPT] Generating detailed CryptoQuant analysis for regular broadcast...');
        gptRegularAnalysis = await generateCryptoQuantAnalysis(cryptoQuantData, marketContext, LANG);
        
        // エラーメッセージが含まれていないか確認
        if (gptRegularAnalysis && typeof gptRegularAnalysis === 'string') {
          const errorKeywords = ['api error', 'unavailable', 'error', 'failed', 'timeout'];
          const isError = errorKeywords.some(keyword => 
            gptRegularAnalysis.toLowerCase().includes(keyword)
          );
          if (isError) {
            console.warn('[GPT] Error message detected in analysis, setting to null');
            gptRegularAnalysis = null;
          } else {
            console.log('[GPT] Regular analysis generated:', gptRegularAnalysis.substring(0, 200) + '...');
          }
        }
      } catch (err) {
        console.warn('[GPT] Error generating regular analysis:', err?.message || err);
        gptRegularAnalysis = null; // エラー時はnullを設定（メッセージテンプレート側でフォールバック処理）
      }

      try {
        // GrokでX（Twitter）を高解像度解析
        console.log('[Grok] Analyzing X sentiment with high-resolution for regular broadcast...');
        const grokSent = await analyzeXSentimentHighResolutionCompat(
          'latest BTC price action, funding, liquidations, whale activity, ETF flows on X',
          LANG,
        );
        grokXAnalysis = grokSent;
        
        // 高解像度Xデータを取得
        if (grokSent && typeof grokSent === 'object') {
          highResXData = grokSent._highResolution || grokSent.highResolution || null;
          xSentiment = {
            whaleBias: Number(grokSent.whaleBias) || 0,
            retailFomo: Number(grokSent.retailFomo) || 50,
            newsImpact: Number(grokSent.newsImpact) || 0,
          };
        }
        console.log('[Grok] X analysis completed:', xSentiment);
      } catch (err) {
        console.warn('[Grok] Error analyzing X sentiment:', err?.message || err);
        grokXAnalysis = null;
      }

      // 後方互換性のため、aiAnalysisにGPT解析結果を設定
      aiAnalysis = gptRegularAnalysis || aiAnalysis;
      
      // ===== USP1: トラップ防御とトレンド転換先回り =====
      // trapDetectionとtrapAlertは既に広いスコープで定義済み
      try {
        console.log('[Trap Detector] Detecting traps and trend reversals...');
        trapDetection = detectTrapDetection({
          exchangeNetflow: inflow,
          minerMPI: mpi,
          whaleBias: xSentiment.whaleBias || 0,
          retailFomo: xSentiment.retailFomo || 50,
          priceChange24h: change24h,
          highResCQ: highResCQData,
          highResX: highResXData,
          binanceData: binanceData || null,
        });
        
        if (trapDetection.trapDetected) {
          console.log('[Trap Detector] Trap detected:', {
            trapType: trapDetection.trapType,
            trapSeverity: trapDetection.trapSeverity,
            trapScore: trapDetection.trapScore,
            trendReversalSignal: trapDetection.trendReversalSignal,
          });
          
          // トラップベースのアラート生成
          trapAlert = generateTrapAlert({
            exchangeNetflow: inflow,
            minerMPI: mpi,
            whaleBias: xSentiment.whaleBias || 0,
            retailFomo: xSentiment.retailFomo || 50,
            priceChange24h: change24h,
            highResCQ: highResCQData,
            highResX: highResXData,
            binanceData: binanceData || null,
          });
          
          // Phase 4: trapDetectionのtrapScoreを cqDeep に反映（EMERGENCY判定で使用）
          // Step 1: SSOT閾値統一 - trapScore>=60 に統一（品質ゲートと統一）
          if (trapDetection && trapDetection.trapScore) {
            cqDeep.trapScore = trapDetection.trapScore;
          }
          
          // トラップアラートのみ使用（BUY/SELLシグナル生成ロジックは完全削除）
          // SSOT準拠: 統一品質ゲート（trapScore>=60 & multipleDivergences>=3）が適用済み
          if (trapAlert.alert) {
            console.log('[Trap Detector] Quality-gated trap alert detected:', {
              type: trapAlert.type,
              recommendation: trapAlert.recommendation,
              confidence: trapAlert.confidence,
              trapScore: trapDetection.trapScore,
              multipleDivergences: trapDetection.divergence?.multipleDivergences || 0,
            });
            // トラップアラートの推奨のみを使用（BUY/SELLシグナルは生成しない）
          } else {
            console.log('[Trap Detector] Trap alert blocked by quality gate:', {
              trapScore: trapDetection.trapScore,
              multipleDivergences: trapDetection.divergence?.multipleDivergences || 0,
              required: 'trapScore>=60 & multipleDivergences>=3',
            });
          }
        }
      } catch (error) {
        console.warn('[Trap Detector] Error detecting traps:', error.message);
      }
      
      // 後方互換性のため、marketBugDetectionも設定（関数スコープで既に定義済み）
      marketBugDetection = trapDetection;
      
      // ===== USP3: Dr. Grokの心理的サポート =====
      // psychologicalSupportは関数スコープで既に定義済み
      try {
        console.log('[Dr. Grok] Diagnosing user sentiment and providing psychological support...');
        psychologicalSupport = await diagnoseUserSentimentCompat(
          {
            price_usd_display: priceUsd,
            change_24h: change24h,
            market_score: snapshot.market_score,
            trapDetection: trapDetection,
            marketBug: marketBugDetection, // 後方互換性
            trapAlert: trapAlert,
            divergenceSignal: divergenceSignalResult,
          },
          xSentiment,
          LANG
        );
        
        if (psychologicalSupport && psychologicalSupport.psychologicalState !== 'UNKNOWN') {
          console.log('[Dr. Grok] Psychological diagnosis completed:', {
            state: psychologicalSupport.psychologicalState,
            risk: psychologicalSupport.psychologicalRisk,
            supportLevel: psychologicalSupport.psychologicalSupportLevel || psychologicalSupport.medicalSupportLevel,
          });
        }
      } catch (error) {
        console.warn('[Dr. Grok] Error providing psychological support:', error.message);
      }
      
    } else if (needsLongReport && !isRegularSlot) {
      // 注: shouldCallGrok は未定義だったため削除（needsLongReport で十分）
      // 緊急配信時: 既存のGrok分析を維持（後方互換性）
      const marketSummaryPayload = {
        asset: 'BTC',
        inflow,
        mpi,
        sentiment: sentimentLabel,
        priceUsd,
        change24h,
        xSentiment,
        score: coreDecision.score,
        signal: tradeSignal.signal,
        tp: tradeSignal.tp,
        sl: tradeSignal.sl,
        trap,
      };

      try {
        // トラップ検出情報を準備（高リスク時に「辛口モード」を有効化）
        const trapInfo = trapDetection ? {
          trapSeverity: trapDetection.trapSeverity || 'NONE',
          trapScore: trapDetection.trapScore || 0,
          trapType: trapDetection.trapType || null,
        } : null;

        // Phase 2: 市場コードとCryptoQuant深掘りデータ、トラップ検出情報をGrokに渡す
        aiAnalysis = await analyzeMarket(
          JSON.stringify(marketSummaryPayload),
          JSON.stringify(xSentiment),
          LANG,
          getMarketCode(LANG),
          cqDeep,
          trapInfo,
        );
      } catch (err) {
        console.warn(
          '⚠️ Grok Market Analyze Error in analyzeMarket, fallback to offline analysis:',
          err?.message || err,
        );
        aiAnalysis = null;
      }
    }

    // 7. Telegram send
    let sent = 0;

    // ===== Phase 1: イベント駆動配信対応 =====
    // イベント駆動有効時は、shouldSend判定を優先
    const willSend = ENABLE_EVENT_DRIVEN ? shouldSend : true;

    if (!willSend && !force) {
      console.log(`[Event-Driven] Skipping send: ${triggerReason}`);
      return res.status(200).json({
        success: true,
        sentMessages: 0,
        skipped: true,
        trigger: { type: triggerType, reason: triggerReason },
        slot: { isRegularSlot, force },
        metrics: {
          inflow,
          mpi,
          sentiment: sentimentLabel,
          priceUsd,
          change24h,
          score: coreDecision.score,
          regime: coreDecision.regime,
          confidence: coreDecision.confidence,
          signal: tradeSignal.signal,
        },
      });
    }
    // ===== Phase 1 End =====

    // 7-A. REGULAR
    if (isRegularSlot || force || (ENABLE_EVENT_DRIVEN && triggerType === 'REGULAR')) {
      console.log('Sending REGULAR message...');

      // Phase 2: イベント駆動が無効な場合でも深掘りデータを取得
      if (!ENABLE_EVENT_DRIVEN || !stateManager) {
        try {
          // 注: marketは既に上で宣言済み（392行目）、再代入
          market = getMarketCode(LANG);
          const deepData = await getCQDeepMetrics(market, {
            upbitPrice: priceUsd,
            binancePrice: priceUsd,
            usdKrwRate: 1300,
          });
          cqDeep = { ...cqDeep, ...deepData };
        } catch (error) {
          console.warn('[Phase 2] Error fetching deep metrics:', error.message);
        }
      }

      // Phase 3: 市場別オプションデータをスナップショットに追加
      // 注: marketは既に上で宣言済み（392行目）、再代入
      market = getMarketCode(LANG);
      if (LANG === 'ko' && cqDeep?.kimchiPremium != null) {
        marketSnapshotService.addLocalOptional(snapshot.snapshot_id, 'KO', {
          kimchiPremium: cqDeep.kimchiPremium,
          upbitPrice: cqDeep.upbitPrice ?? priceUsd,
          binancePrice: cqDeep.binancePrice ?? priceUsd,
        });
      }
      if (LANG === 'en') {
        marketSnapshotService.addLocalOptional(snapshot.snapshot_id, 'EN', {
          trapScore: cqDeep?.trapScore,
          whaleFlows: cqDeep?.whaleFlows,
          liquidations: cqDeep?.liquidations,
        });
      }

      // Phase 2: A/Bテストバリアント識別（50/50分割）
      const AB_VARIANTS = ['A', 'B'];
      const variant = Math.random() < 0.5 ? 'A' : 'B';
      const messageId = `msg_${Date.now()}_${LANG}_${variant}`;

      // ===== 定期配信: サービス未利用ユーザーの悲惨な状況を報道 =====
      let nonUserImpactReport = null;
      let missedOpportunities = null;
      
      try {
        // 見逃した機会を計算
        console.log('[MissedOpportunities] Calculating missed opportunities for non-users...');
        missedOpportunities = await calculateMissedOpportunities(null, 24); // 過去24時間
        
        if (missedOpportunities.totalSignals > 0) {
          // GPTで報道コンテンツを生成
          const marketData = {
            priceUsd,
            change24h,
            score: coreDecision.score,
            signal: tradeSignal.signal,
            sentiment: sentimentLabel,
          };
          
          console.log('[GPT] Generating non-user impact report...');
          nonUserImpactReport = await generateNonUserImpactReport(
            marketData,
            missedOpportunities,
            LANG,
          );
          console.log('[GPT] Impact report generated:', nonUserImpactReport.substring(0, 200) + '...');
        }
      } catch (error) {
        console.warn('[MissedOpportunities] Error generating impact report:', error.message);
        // エラー時は続行（必須ではない）
      }

      // Phase 3: スナップショットをテンプレートに渡す（全言語で統一データ）
      // GPT解析結果（gptRegularAnalysis）を優先的に使用
      const finalAnalysis = gptRegularAnalysis || aiAnalysis;
      
      // 高解像度データとダイバージェンスシグナルを取得
      // baseCoreDecisionからダイバージェンスシグナルを取得（高解像度データが使用されている場合）
      let finalHighResCQ = highResCQData;
      let finalHighResX = highResXData;
      let divergenceSignalResult = baseCoreDecision?.divergenceSignal || coreDecision?.divergenceSignal || null;
      
      let regularText = formatRegularBriefing({
        snapshot, // Phase 3: スナップショット全体（後方互換性のため残す）
        now,
        inflow: snapshot.inflow,
        mpi: snapshot.mpi,
        sentimentLabel: snapshot.sentiment_label,
        priceUsd: snapshot.price_usd_display,
        change24h: snapshot.change_24h,
        score: snapshot.market_score,
        tradeSignal,
        trap,
        aiAnalysis: finalAnalysis, // 後方互換性のため残す
        stats: null, // reserved
        lang: LANG,
        // Phase 2: A/Bテスト識別子
        variant,
        messageId,
        // Phase 2: 市場別データ（後方互換性のため残す）
        trapScore: cqDeep?.trapScore,
        whaleFlows: cqDeep?.whaleFlows,
        liquidations: cqDeep?.liquidations,
        kimchiPremium: cqDeep?.kimchiPremium,
        upbitPrice: cqDeep?.upbitPrice ?? snapshot.price_usd_display,
        binancePrice: cqDeep?.binancePrice ?? snapshot.price_usd_display,
        riskReward: cqDeep?.riskReward,
        nupl: cqDeep?.longTerm?.nupl,
        sopr30d: cqDeep?.longTerm?.sopr30d,
        // Phase1-Product: 新機能データ
        noTradeAlert: null, // 将来の実装用
        trapRisk: null, // 将来の実装用
        exitMap: null, // 将来の実装用
        // 新規: サービス未利用ユーザーの悲惨な状況
        nonUserImpactReport,
        missedOpportunities: missedOpportunities ? formatMissedOpportunities(missedOpportunities, LANG) : null,
        // ニュース番組構造用: GPTリポーターとGrok X解析を分離
        gptReporterAnalysis: gptRegularAnalysis ?? null, // GPTリポーターのトラップニュース分析（CryptoQuantデータ解析）
        grokXAnalysis: grokXAnalysis ?? null, // Grok X解析結果（Xセンチメント分析）
        // 高解像度データ
        highResCQ: finalHighResCQ,
        highResX: finalHighResX,
        divergenceSignal: divergenceSignalResult,
        // USP1: トラップ防御結果
        trapDetection: trapDetection || null,
        marketBug: marketBugDetection || null, // 後方互換性
        trapAlert: trapAlert || null,
        // USP3: Dr. Grokの心理的サポート
        psychologicalSupport: psychologicalSupport || null,
        // USP2: Geminiコンテンツ生成（後で更新される可能性があるため、一旦false/null）
        hasGeminiContent: false,
        showContent: null, // 後でproduceShowの結果で更新される
      });

      // Phase 4: 保存されたコンテンツを読み込む（定時5分前に生成されたもの）
      let savedImageUrl = null;
      let savedVideoUrl = null;
      try {
        // 注: marketは既に上で宣言済み（392行目）、再代入
        market = getMarketCode(LANG);
        const savedContent = await getContent(market);
        
        if (savedContent) {
          console.log('[Content] Retrieved saved content from storage');
          savedImageUrl = savedContent.imageUrl;
          savedVideoUrl = savedContent.videoUrl;
          
          // 保存されたサマリーがあれば使用（より詳細な分析）
          if (savedContent.summary && !finalAnalysis) {
            aiAnalysis = savedContent.summary;
            console.log('[Content] Using saved summary for analysis');
          }
        } else {
          console.log('[Content] No saved content found, using real-time generation');
        }
      } catch (error) {
        console.warn('[Content] Error retrieving saved content:', error.message);
      }

      // ===== 定期配信: Geminiコンテンツ生成（Veo動画 + Nano Banana画像） =====
      // USP2: トラップ防御結果を画像生成に反映
      let imageUrl = savedImageUrl;
      let videoUrl = savedVideoUrl;
      
      // 削除: 画像・動画生成は不要（CEO指示により簡素化）
      // 画像生成（NanoBanana Pro）は無効化
      // if (!imageUrl && ENABLE_GEMINI_IMAGES) { ... }

      // 動画生成（Veo 3.1）は無効化
      // if (!videoUrl) { ... }

      // ===== Gemini番組プロデューサー: ストーリーブランド戦略2.0 =====
      let showContent = undefined; // produceShowが実行されたかどうかを判断するため、undefinedで初期化
      try {
        console.log('[Gemini Show Producer] Producing show with StoryBrand 2.0 framework...');
        showContent = await produceShow({
          marketData: {
            price_usd_display: snapshot.price_usd_display,
            change_24h: snapshot.change_24h,
            market_score: snapshot.market_score,
            sentiment_label: snapshot.sentiment_label,
            inflow: snapshot.inflow,
            mpi: snapshot.mpi,
          },
          cryptoQuantData: cqDeep,
          trapDetection: trapDetection,
          psychologicalSupport: psychologicalSupport,
          gptMentalTrainerAnalysis: gptRegularAnalysis,
          lang: LANG,
        });
        
        if (showContent) {
          console.log('[Gemini Show Producer] Show produced successfully (text-only version)');
          // 削除: 画像・動画生成は不要（簡素化版）
          // 番組プロデューサーはテキストベースのみ
          // if (showContent.dataPresentation && showContent.dataPresentation.image) {
          //   imageUrl = showContent.dataPresentation.image;
          // }
          // if (showContent.opening && showContent.opening.video) {
          //   videoUrl = showContent.opening.video;
          // }
        } else {
          console.log('[Gemini Show Producer] Show production returned null');
        }
      } catch (error) {
        console.warn('[Gemini Show Producer] Error producing show:', error.message);
        console.warn('[Gemini Show Producer] Error stack:', error.stack);
        showContent = null; // エラー時もnullを明示的に設定
      }

      // USP2: Geminiコンテンツが生成されたかどうかを確認し、メッセージを再生成
      const hasGeminiContent = !!(imageUrl || videoUrl);
      // showContent（テキストベース）がある場合、またはhasGeminiContent（画像・動画）がある場合にメッセージを再生成
      // 注意: showContentがnullでも、メッセージを再生成してshowContent: nullを明示的に渡す
      if (showContent || hasGeminiContent || true) { // 常に再生成してshowContentを反映
        // メッセージを再生成（USP2の表示を更新）
        const regularTextUpdated = formatRegularBriefing({
          snapshot,
          now,
          inflow: snapshot.inflow,
          mpi: snapshot.mpi,
          sentimentLabel: snapshot.sentiment_label,
          priceUsd: snapshot.price_usd_display,
          change24h: snapshot.change_24h,
          score: snapshot.market_score,
          tradeSignal,
          trap,
          aiAnalysis: finalAnalysis, // 後方互換性のため残す
          stats: null,
          lang: LANG,
          variant,
          messageId,
          trapScore: cqDeep?.trapScore,
          whaleFlows: cqDeep?.whaleFlows,
          liquidations: cqDeep?.liquidations,
          kimchiPremium: cqDeep?.kimchiPremium,
          upbitPrice: cqDeep?.upbitPrice ?? snapshot.price_usd_display,
          binancePrice: cqDeep?.binancePrice ?? snapshot.price_usd_display,
          riskReward: cqDeep?.riskReward,
          nupl: cqDeep?.longTerm?.nupl,
          sopr30d: cqDeep?.longTerm?.sopr30d,
          noTradeAlert: null,
          trapRisk: null,
          exitMap: null,
          nonUserImpactReport,
          missedOpportunities: missedOpportunities ? formatMissedOpportunities(missedOpportunities, LANG) : null,
          // ニュース番組構造用: GPTリポーターとGrok X解析を分離
          gptReporterAnalysis: gptRegularAnalysis || null, // GPTリポーターのトラップニュース分析（CryptoQuantデータ解析）
          grokXAnalysis: grokXAnalysis || null, // Grok X解析結果（Xセンチメント分析）
          highResCQ: finalHighResCQ,
          highResX: finalHighResX,
          divergenceSignal: divergenceSignalResult,
          trapDetection: trapDetection || null,
          marketBug: marketBugDetection || null, // 後方互換性
          trapAlert: trapAlert || null,
          psychologicalSupport: psychologicalSupport || null,
          hasGeminiContent: hasGeminiContent, // 画像・動画がある場合のみtrue
          showContent: showContent || null, // テキストベースのGeminiコンテンツ
        });
        regularText = regularTextUpdated;
      }

      // Phase 4: メッセージ送信とログ記録
      // メール送信（デフォルト）
      try {
        // メールHTMLを生成
        const emailHTML = formatRegularBriefingHTML({
          now,
          inflow: snapshot.inflow,
          mpi: snapshot.mpi,
          sentimentLabel: snapshot.sentiment_label,
          priceUsd: snapshot.price_usd_display,
          change24h: snapshot.change_24h,
          score: snapshot.market_score,
          tradeSignal,
          trap,
          aiAnalysis: finalAnalysis,
          stats: null,
          trapScore: cqDeep?.trapScore,
          whaleFlows: cqDeep?.whaleFlows,
          liquidations: cqDeep?.liquidations,
          noTradeAlert: null,
          trapRisk: null,
          exitMap: null,
          trapDetection: trapDetection || null,
          marketBug: marketBugDetection || null,
          trapAlert: trapAlert || null,
          divergenceSignal: divergenceSignalResult,
          psychologicalSupport: psychologicalSupport || null,
          hasGeminiContent: hasGeminiContent,
          gptReporterAnalysis: gptRegularAnalysis || null,
          grokXAnalysis: grokXAnalysis || null,
          geminiImageUrl: imageUrl || null,
          geminiVideoUrl: videoUrl || savedVideoUrl || null,
          cqDeep: cqDeep,
          showContent: showContent,
        });

        // メール件名を生成
        const trapEmoji = trapAlert && trapAlert.alert 
          ? (trapAlert.severity === 'CRITICAL' ? '🚨' : trapAlert.severity === 'HIGH' ? '⚠️' : '⚡')
          : '🛡️';
        const emailSubject = `${trapEmoji} Trap Defense BTC Report - ${now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC')}`;

        // ユーザーリストを取得（環境変数またはデータベースから）
        const recipientEmails = getRecipientEmails(LANG);
        
        if (recipientEmails && recipientEmails.length > 0) {
          console.log(`[Email] Sending regular briefing to ${recipientEmails.length} recipients (${LANG})...`);
          
          // バッチメール送信
          const emailResult = await sendBatchEmails({
            recipients: recipientEmails,
            subject: emailSubject,
            html: emailHTML,
            emailOptions: {
              lang: LANG,
              messageType: 'REGULAR',
            },
          });

          console.log(`[Email] Regular briefing sent: ${emailResult.totalSent}, Errors: ${emailResult.totalErrors}`);

          // CTAリンクを抽出
          const ctaLinkRegex = /https:\/\/cryptotradeacademy\.io\/start\?[^\s\)]+/g;
          const ctaLinks = emailHTML.match(ctaLinkRegex) || [];

          // 送信ログを記録
          messageLogger.logMessage({
            message_id: messageId,
            snapshot_id: snapshot.snapshot_id,
            lang: LANG,
            variant,
            message_type: 'REGULAR',
            sent_at: new Date().toISOString(),
            email_sent: emailResult.totalSent,
            email_errors: emailResult.totalErrors,
            cta_links: ctaLinks,
          });
        } else {
          console.warn(`[Email] No recipients found for lang=${LANG}`);
        }
      } catch (emailError) {
        console.error('[Email] Error sending regular briefing:', emailError);
        // エラー時もログを記録
        messageLogger.logMessage({
          message_id: messageId,
          snapshot_id: snapshot.snapshot_id,
          lang: LANG,
          variant,
          message_type: 'REGULAR',
          sent_at: new Date().toISOString(),
          email_error: emailError.message,
        });
      }

      // Telegram送信（オプション、環境変数で有効化）
      if (ENABLE_TELEGRAM) {
        const finalVideoUrl = videoUrl || savedVideoUrl;
        if (finalVideoUrl) {
          console.log('[Telegram] Sending video...');
          await sendVideo(finalVideoUrl, regularText.substring(0, 1024));
        }
        
        if (imageUrl) {
          await sendPhoto(imageUrl, regularText.substring(0, 1024));
        }
        
        // 市場コードとシリーズを取得して適切なチャンネルに送信
        const marketCode = getMarketCode(LANG); // 'EN', 'AR', 'KO', etc.
        const series = 'BTC'; // 現在はBTCのみ、将来的に'OTHER'なども対応可能
        
        // 複数チャンネル対応: sendMessageToChannelを使用
        let sendResult;
        const channelIdEnvVar = `TELEGRAM_CHAT_ID_${series}_${marketCode}`;
        if (process.env[channelIdEnvVar]) {
          // 新しい方式: シリーズ+市場コードでチャンネル指定
          sendResult = await sendMessageToChannel(regularText, series, marketCode);
        } else if (TELEGRAM_CHAT_ID) {
          // 後方互換性: 既存のTELEGRAM_CHAT_IDを使用
          sendResult = await sendMessage(regularText);
        } else {
          console.warn(`[Telegram] No channel ID configured for ${series}/${marketCode} (env: ${channelIdEnvVar}) or TELEGRAM_CHAT_ID`);
        }
        const telegramMessageId = sendResult?.message_id || sendResult?.raw?.result?.message_id;

        const ctaLinkRegex = /https:\/\/cryptotradeacademy\.io\/start\?[^\s\)]+/g;
        const ctaLinks = regularText.match(ctaLinkRegex) || [];

        messageLogger.logMessage({
          message_id: messageId,
          snapshot_id: snapshot.snapshot_id,
          lang: LANG,
          variant,
          message_type: 'REGULAR',
          sent_at: new Date().toISOString(),
          telegram_message_id: telegramMessageId,
          cta_links: ctaLinks,
        });
      }

      sent += 1;
    }

    // 7-A-MINIMAL. 無料版リードマグネット配信（Trap Score + 簡易分析 + Dr. Grokコメント）
    // 環境変数が設定されている場合のみ実行
    // 注意: TELEGRAM_BOT_TOKEN_MINIMALがなくても、TELEGRAM_BOT_TOKENとTELEGRAM_CHAT_ID_MINIMALがあれば動作
    const ENABLE_MINIMAL_VERSION = (process.env.TELEGRAM_BOT_TOKEN_MINIMAL || TELEGRAM_BOT_TOKEN) && process.env.TELEGRAM_CHAT_ID_MINIMAL;
    if (ENABLE_MINIMAL_VERSION && formatMinimalBriefing && shouldSend && isRegularSlot) {
      try {
        console.log('[Free Version] Sending free briefing to lead magnet users...');
        
        // Trap Scoreを取得（trapDetectionから、または計算済みの値から）
        let minimalTrapScore = null;
        if (trapDetection && trapDetection.trapScore) {
          minimalTrapScore = trapDetection.trapScore;
        } else if (cqDeep && cqDeep.trapScore) {
          minimalTrapScore = cqDeep.trapScore;
        } else if (trap && trap.isTrap) {
          // フォールバック: trapオブジェクトから推定
          minimalTrapScore = trap.confidence === 'HIGH' ? 80 : trap.confidence === 'MEDIUM' ? 50 : 30;
        }

        // Trap Dataを準備（minimal-high-quality版用）
        const trapData = {
          trapAlert: trapAlert || null,
          exchangeNetflow: inflow,
          whaleRatio: cqDeep?.whaleFlows?.whaleRatio || null,
        };

        // Market Dataを準備
        const marketData = {
          mpi: mpi,
          priceUsd: priceUsd,
          change24h: change24h,
        };

        // Sentiment Dataを準備（Grok X解析結果から）
        const sentimentData = grokXAnalysis ? {
          sentiment: grokXAnalysis.sentiment || sentimentLabel,
          risk: grokXAnalysis.risk || null,
        } : {
          sentiment: sentimentLabel,
        };

        // 無料版メッセージを生成（minimal-high-quality版を使用）
        const minimalText = formatMinimalBriefing({
          now,
          trapScore: minimalTrapScore,
          priceUsd,
          change24h,
          trapData,
          marketData,
          sentimentData,
          lang: LANG,
        });

        // 無料版チャンネルに送信
        if (ENABLE_TELEGRAM) {
          // 無料版チャンネルIDが設定されている場合
          if (process.env.TELEGRAM_CHAT_ID_MINIMAL) {
            const sendResult = await sendMessageToAsset(minimalText, 'MINIMAL');
            console.log('[Free Version] Sent successfully:', sendResult?.message_id || 'N/A');
          } else {
            console.warn('[Free Version] TELEGRAM_CHAT_ID_MINIMAL not set, skipping free version delivery');
          }
        }
      } catch (error) {
        console.error('[Free Version] Error sending free briefing:', error.message);
        console.error('[Free Version] Stack:', error.stack);
      }
    }

    // 7-B. EMERGENCY (Trap) - 15分ごとの緊急配信
    if (finalNeedsEmergency || (ENABLE_EVENT_DRIVEN && triggerType === 'EMERGENCY')) {
      // Phase 2: A/Bテストバリアント識別
      const AB_VARIANTS = ['A', 'B'];
      const variant = Math.random() < 0.5 ? 'A' : 'B';
      const messageId = `msg_${Date.now()}_${LANG}_${variant}_EMERGENCY`;

      // GPT解析結果を緊急配信に反映
      const emergencyAnalysis = gptCryptoQuantAnalysis || aiAnalysis;

      const alertText = formatTrapAlert({
        inflow,
        mpi,
        priceUsd,
        trap,
        aiAnalysis: emergencyAnalysis, // GPT解析結果を優先
      });

      // メール送信（緊急配信）
      try {
        // 緊急配信用のメールHTMLを生成（簡易版、formatRegularBriefingHTMLをベースに）
        const emergencyEmailHTML = formatRegularBriefingHTML({
          now,
          inflow,
          mpi,
          sentimentLabel: snapshot?.sentiment_label || 'Unknown',
          priceUsd,
          change24h: snapshot?.change_24h || 0,
          score: snapshot?.market_score || 0,
          tradeSignal: { signal: 'STANDBY', confidence: 0 },
          trap,
          aiAnalysis: emergencyAnalysis,
          stats: null,
          trapScore: cqDeep?.trapScore,
          whaleFlows: cqDeep?.whaleFlows,
          liquidations: cqDeep?.liquidations,
          noTradeAlert: null,
          trapRisk: null,
          exitMap: null,
          trapDetection: trapDetection || null,
          marketBug: null,
          trapAlert: trapAlert || null,
          divergenceSignal: null,
          psychologicalSupport: null,
          hasGeminiContent: false,
          gptReporterAnalysis: null,
          grokXAnalysis: null,
          geminiImageUrl: null,
          geminiVideoUrl: null,
          cqDeep: cqDeep,
          showContent: null, // 緊急配信ではshowContentは使用しない
        });

        const emergencySubject = `🚨 URGENT: Trap Alert - ${now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC')}`;
        const recipientEmails = getRecipientEmails(LANG);
        
        if (recipientEmails && recipientEmails.length > 0) {
          console.log(`[Email] Sending emergency alert to ${recipientEmails.length} recipients (${LANG})...`);
          
          const emailResult = await sendBatchEmails({
            recipients: recipientEmails,
            subject: emergencySubject,
            html: emergencyEmailHTML,
            emailOptions: {
              lang: LANG,
              messageType: 'EMERGENCY',
            },
          });

          console.log(`[Email] Emergency alert sent: ${emailResult.totalSent}, Errors: ${emailResult.totalErrors}`);

          const ctaLinkRegex = /https:\/\/cryptotradeacademy\.io\/start\?[^\s\)]+/g;
          const ctaLinks = emergencyEmailHTML.match(ctaLinkRegex) || [];

          messageLogger.logMessage({
            message_id: messageId,
            snapshot_id: snapshot?.snapshot_id,
            lang: LANG,
            variant,
            message_type: 'EMERGENCY',
            sent_at: new Date().toISOString(),
            email_sent: emailResult.totalSent,
            email_errors: emailResult.totalErrors,
            cta_links: ctaLinks,
          });
        } else {
          console.warn(`[Email] No recipients found for emergency alert (lang=${LANG})`);
        }
      } catch (emailError) {
        console.error('[Email] Error sending emergency alert:', emailError);
        messageLogger.logMessage({
          message_id: messageId,
          snapshot_id: snapshot?.snapshot_id,
          lang: LANG,
          variant,
          message_type: 'EMERGENCY',
          sent_at: new Date().toISOString(),
          email_error: emailError.message,
        });
      }

      // Telegram送信（オプション）
      if (ENABLE_TELEGRAM) {
        const sendResult = await sendMessage(alertText);
        const telegramMessageId = sendResult?.message_id || sendResult?.raw?.result?.message_id;

        const ctaLinkRegex = /https:\/\/cryptotradeacademy\.io\/start\?[^\s\)]+/g;
        const ctaLinks = alertText.match(ctaLinkRegex) || [];

        messageLogger.logMessage({
          message_id: messageId,
          snapshot_id: snapshot?.snapshot_id,
          lang: LANG,
          variant,
          message_type: 'EMERGENCY',
          sent_at: new Date().toISOString(),
          telegram_message_id: telegramMessageId,
          cta_links: ctaLinks,
        });
      }

      sent += 1;
    }

    // 7-C. WATCH (short heads-up, no long report)
    // 7-D. STANDBY_BREAK (Phase 1新規)
    if (ENABLE_EVENT_DRIVEN && triggerType === 'STANDBY_BREAK') {
      console.log('Sending STANDBY_BREAK message...');
      // Phase 2: A/Bテストバリアント識別
      const AB_VARIANTS = ['A', 'B'];
      const variant = Math.random() < 0.5 ? 'A' : 'B';
      const messageId = `msg_${Date.now()}_${LANG}_${variant}_STANDBY_BREAK`;

      // ===== USP3: Dr. Grokの心理的サポート =====
      let psychologicalSupportSTANDBY = null;
      try {
        console.log('[Dr. Grok] Diagnosing user sentiment for STANDBY_BREAK...');
        psychologicalSupportSTANDBY = await diagnoseUserSentimentCompat(
          {
            price_usd_display: priceUsd,
            change_24h: change24h,
            market_score: coreDecision.score,
            trapDetection: null, // STANDBY_BREAKではトラップ防御は不要
            marketBug: null, // 後方互換性
            trapAlert: null,
            divergenceSignal: null,
          },
          xSentiment,
          LANG
        );
      } catch (error) {
        console.warn('[Dr. Grok] Error providing psychological support for STANDBY_BREAK:', error.message);
      }

      const standbyBreakText = formatRegularBriefing({
        snapshot, // Phase 3: スナップショット
        now,
        inflow,
        mpi,
        sentimentLabel,
        priceUsd,
        change24h,
        score: coreDecision.score,
        tradeSignal,
        trap,
        aiAnalysis,
        lang: LANG,
        // Phase 2: A/Bテスト識別子
        variant,
        messageId,
        // Phase 2: 市場別データ追加
        trapScore: cqDeep?.trapScore,
        whaleFlows: cqDeep?.whaleFlows,
        liquidations: cqDeep?.liquidations,
        kimchiPremium: cqDeep?.kimchiPremium,
        upbitPrice: cqDeep?.upbitPrice ?? priceUsd,
        binancePrice: cqDeep?.binancePrice ?? priceUsd,
        riskReward: cqDeep?.riskReward,
        nupl: cqDeep?.longTerm?.nupl,
        sopr30d: cqDeep?.longTerm?.sopr30d,
        // USP1: トラップ防御結果
        trapDetection: null, // STANDBY_BREAKではトラップ防御は不要
        marketBug: null, // 後方互換性
        trapAlert: null,
        divergenceSignal: null,
        // USP3: Dr. Grokの心理的サポート
        psychologicalSupport: psychologicalSupportSTANDBY || null,
        // USP2: Geminiコンテンツ生成（STANDBY_BREAKでは生成しない）
        hasGeminiContent: false,
      });

      // Phase 2: メッセージ送信とログ記録
      const sendResult = await sendMessage(standbyBreakText);
      const telegramMessageId = sendResult?.message_id || sendResult?.raw?.result?.message_id;

      // Phase 2: CTAリンクを抽出
      const ctaLinkRegex = /https:\/\/cryptotradeacademy\.io\/start\?[^\s\)]+/g;
      const ctaLinks = standbyBreakText.match(ctaLinkRegex) || [];

      messageLogger.logMessage({
        message_id: messageId,
        snapshot_id: snapshot?.snapshot_id,
        lang: LANG,
        variant,
        message_type: 'STANDBY_BREAK',
        sent_at: new Date().toISOString(),
        telegram_message_id: telegramMessageId,
        cta_links: ctaLinks,
      });

      sent += 1;
    } else if (ENABLE_EVENT_DRIVEN && triggerType === 'WATCH') {
      // Event-driven WATCH message (多言語対応 + Phase 2データ)
      console.log('Sending WATCH message (event-driven)...');
      // Phase 2: A/Bテストバリアント識別
      const AB_VARIANTS = ['A', 'B'];
      const variant = Math.random() < 0.5 ? 'A' : 'B';
      const messageId = `msg_${Date.now()}_${LANG}_${variant}_WATCH`;

      // ===== USP3: Dr. Grokの心理的サポート =====
      let psychologicalSupportWATCH = null;
      try {
        console.log('[Dr. Grok] Diagnosing user sentiment for WATCH...');
        psychologicalSupportWATCH = await diagnoseUserSentimentCompat(
          {
            price_usd_display: priceUsd,
            change_24h: change24h,
            market_score: coreDecision.score,
            trapDetection: null, // WATCHではトラップ防御は不要
            marketBug: null, // 後方互換性
            trapAlert: null,
            divergenceSignal: null,
          },
          xSentiment,
          LANG
        );
      } catch (error) {
        console.warn('[Dr. Grok] Error providing psychological support for WATCH:', error.message);
      }

      // Phase 2: WATCHメッセージもformatRegularBriefingを使用（多言語対応）
      // ただし、aiAnalysisは不要（コスト削減のため）
      const watchText = formatRegularBriefing({
        snapshot, // Phase 3: スナップショット
        now,
        inflow,
        mpi,
        sentimentLabel,
        priceUsd,
        change24h,
        score: coreDecision.score,
        tradeSignal,
        trap,
        aiAnalysis: null, // WATCHはGrok呼び出しなし（コスト削減）
        lang: LANG,
        // Phase 2: A/Bテスト識別子
        variant,
        messageId,
        // Phase 2: 市場別データ追加
        trapScore: cqDeep?.trapScore,
        whaleFlows: cqDeep?.whaleFlows,
        liquidations: cqDeep?.liquidations,
        kimchiPremium: cqDeep?.kimchiPremium,
        upbitPrice: cqDeep?.upbitPrice ?? priceUsd,
        binancePrice: cqDeep?.binancePrice ?? priceUsd,
        riskReward: cqDeep?.riskReward,
        nupl: cqDeep?.longTerm?.nupl,
        sopr30d: cqDeep?.longTerm?.sopr30d,
        // USP1: トラップ防御結果
        trapDetection: null, // WATCHではトラップ防御は不要
        marketBug: null, // 後方互換性
        trapAlert: null,
        divergenceSignal: null,
        // USP3: Dr. Grokの心理的サポート
        psychologicalSupport: psychologicalSupportWATCH || null,
        // USP2: Geminiコンテンツ生成（WATCHでは生成しない）
        hasGeminiContent: false,
      });

      // Phase 2: メッセージ送信とログ記録
      const sendResult = await sendMessage(watchText);
      const telegramMessageId = sendResult?.message_id || sendResult?.raw?.result?.message_id;

      // Phase 2: CTAリンクを抽出
      const ctaLinkRegex = /https:\/\/cryptotradeacademy\.io\/start\?[^\s\)]+/g;
      const ctaLinks = watchText.match(ctaLinkRegex) || [];

      messageLogger.logMessage({
        message_id: messageId,
        snapshot_id: snapshot?.snapshot_id,
        lang: LANG,
        variant,
        message_type: 'WATCH',
        sent_at: new Date().toISOString(),
        telegram_message_id: telegramMessageId,
        cta_links: ctaLinks,
      });

      sent += 1;
    } else if (!ENABLE_EVENT_DRIVEN && needsWatch && !finalNeedsEmergency && !isRegularSlot && !force) {
      // Legacy WATCH logic (only when event-driven is disabled)
      console.log('Sending WATCH message (legacy)...');
      // Phase 2: A/Bテストバリアント識別
      const AB_VARIANTS = ['A', 'B'];
      const variant = Math.random() < 0.5 ? 'A' : 'B';
      const messageId = `msg_${Date.now()}_${LANG}_${variant}_WATCH_LEGACY`;

      // ===== USP3: Dr. Grokの心理的サポート =====
      let psychologicalSupportWATCHLegacy = null;
      try {
        console.log('[Dr. Grok] Diagnosing user sentiment for WATCH (legacy)...');
        psychologicalSupportWATCHLegacy = await diagnoseUserSentimentCompat(
          {
            price_usd_display: priceUsd,
            change_24h: change24h,
            market_score: coreDecision.score,
            trapDetection: null, // WATCHではトラップ防御は不要
            marketBug: null, // 後方互換性
            trapAlert: null,
            divergenceSignal: null,
          },
          xSentiment,
          LANG
        );
      } catch (error) {
        console.warn('[Dr. Grok] Error providing psychological support for WATCH (legacy):', error.message);
      }

      // Legacyモードでも多言語対応を維持
      const watchText = formatRegularBriefing({
        snapshot, // Phase 3: スナップショット
        now,
        inflow,
        mpi,
        sentimentLabel,
        priceUsd,
        change24h,
        score: coreDecision.score,
        tradeSignal,
        trap,
        aiAnalysis: null, // WATCHはGrok呼び出しなし（コスト削減）
        // Phase 2: 市場別データ追加
        trapScore: cqDeep?.trapScore,
        whaleFlows: cqDeep?.whaleFlows,
        liquidations: cqDeep?.liquidations,
        kimchiPremium: cqDeep?.kimchiPremium,
        upbitPrice: cqDeep?.upbitPrice ?? priceUsd,
        binancePrice: cqDeep?.binancePrice ?? priceUsd,
        riskReward: cqDeep?.riskReward,
        nupl: cqDeep?.longTerm?.nupl,
        sopr30d: cqDeep?.longTerm?.sopr30d,
        // USP1: トラップ防御結果
        trapDetection: null, // WATCHではトラップ防御は不要
        marketBug: null, // 後方互換性
        trapAlert: null,
        divergenceSignal: null,
        // USP3: Dr. Grokの心理的サポート
        psychologicalSupport: psychologicalSupportWATCHLegacy || null,
        // USP2: Geminiコンテンツ生成（Legacy WATCHでは生成しない）
        hasGeminiContent: false,
      });

      // Phase 2: メッセージ送信とログ記録
      const sendResult = await sendMessage(watchText);
      const telegramMessageId = sendResult?.message_id || sendResult?.raw?.result?.message_id;

      // Phase 2: CTAリンクを抽出
      const ctaLinkRegex = /https:\/\/cryptotradeacademy\.io\/start\?[^\s\)]+/g;
      const ctaLinks = watchText.match(ctaLinkRegex) || [];

      messageLogger.logMessage({
        message_id: messageId,
        snapshot_id: snapshot?.snapshot_id,
        lang: LANG,
        variant,
        message_type: 'WATCH',
        sent_at: new Date().toISOString(),
        telegram_message_id: telegramMessageId,
        cta_links: ctaLinks,
      });

      sent += 1;
    }

    return res.status(200).json({
      success: true,
      sentMessages: sent,
      slot: { isRegularSlot, force },
      flags: { needsWatch, needsXIntel, needsLongReport, finalNeedsEmergency },
      eventDriven: ENABLE_EVENT_DRIVEN ? {
        enabled: true,
        trigger: { type: triggerType, reason: triggerReason, shouldSend },
      } : { enabled: false },
      metrics: {
        inflow,
        mpi,
        sentiment: sentimentLabel,
        priceUsd,
        change24h,
        score: coreDecision.score,
        regime: coreDecision.regime,
        confidence: coreDecision.confidence,
        signal: tradeSignal.signal,
      },
      trap,
      side,
      entry,
      tp,
      sl,
      xSentiment,
      xIntel,
    });
  } catch (error) {
    console.error('❌ Cron Job Failed:', error);
    return res.status(500).json({ error: error.message });
  }
}
