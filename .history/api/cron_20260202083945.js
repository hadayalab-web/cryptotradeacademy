// api/cron.js

// --- Imports ----------------------------------------------------

// p-retryはES Moduleのため動的インポートを使用
let pRetry;
const { zonedTimeToUtc, formatInTimeZone } = require("date-fns-tz");
const { createLogger, TZ_UTC } = require("../utils/logger");

// LANG を正規化（en, es, pt-br, ar, ja, ko だけ許可）
const rawLang = process.env.LANG || "en";
const baseLang = rawLang.toLowerCase().split(".")[0].split("_")[0];
const SUPPORTED_LANGS = ["en", "es", "pt-br", "ar", "ja", "ko"];
const LANG = SUPPORTED_LANGS.includes(baseLang) ? baseLang : "en";

// 多言語配信の設定（デフォルト: 6言語すべてに配信）
function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const normalizedValue = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalizedValue)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalizedValue)) return false;
  return defaultValue;
}
const REGULAR_MULTI_LANG = parseBoolean(process.env.REGULAR_MULTI_LANG, true); // デフォルト: true（6言語すべてに配信）
const MINIMAL_MULTI_LANG = parseBoolean(process.env.MINIMAL_MULTI_LANG, true); // デフォルト: true（6言語すべてに配信）

// 配信対象言語を取得
function getTargetLanguagesForRegular() {
  if (REGULAR_MULTI_LANG) return SUPPORTED_LANGS;
  return [LANG];
}

function getTargetLanguagesForMinimal() {
  if (MINIMAL_MULTI_LANG) return SUPPORTED_LANGS;
  return [LANG];
}

// 言語別テンプレートを lang-suffixed ファイルから読み込む
function loadUserTemplates(lang) {
  try {
    // 例: services/telegram/messages/user/en/regular.en.js
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const { formatRegularBriefing } = require(
      `../services/telegram/messages/user/${lang}/regular.${lang}`
    );
    const { formatTrapAlert } = require(
      `../services/telegram/messages/user/${lang}/emergency.${lang}`
    );
    // 無料版テンプレート（minimal-high-quality版を優先、なければminimal版）
    let formatMinimalBriefing = null;
    try {
      const { formatMinimalHighQualityBriefing } = require(
        `../services/telegram/messages/user/${lang}/minimal-high-quality.${lang}`
      );
      if (
        formatMinimalHighQualityBriefing &&
        typeof formatMinimalHighQualityBriefing === "function"
      ) {
        formatMinimalBriefing = formatMinimalHighQualityBriefing;
        console.log(`[TEMPLATE] Loaded minimal-high-quality template for ${lang}`);
      } else {
        throw new Error(`formatMinimalHighQualityBriefing is not a function for ${lang}`);
      }
    } catch (e) {
      console.warn(
        `[TEMPLATE] Failed to load minimal-high-quality template for ${lang}: ${e.message}`
      );
      try {
        const { formatMinimalBriefing: minimalFn } = require(
          `../services/telegram/messages/user/${lang}/minimal.${lang}`
        );
        if (minimalFn && typeof minimalFn === "function") {
          formatMinimalBriefing = minimalFn;
          console.warn(`[TEMPLATE] Fallback to minimal template for ${lang}`);
        } else {
          throw new Error(`formatMinimalBriefing is not a function for ${lang}`);
        }
      } catch (e2) {
        console.warn(
          `[TEMPLATE] Minimal template not found for ${lang}, will use EN fallback: ${e2.message}`
        );
      }
    }
    return { formatRegularBriefing, formatTrapAlert, formatMinimalBriefing };
  } catch (e) {
    console.warn(`Fallback to EN templates. lang=${lang} error=${e.message}`);
    const { formatRegularBriefing } = require("../services/telegram/messages/user/en/regular.en");
    const { formatTrapAlert } = require("../services/telegram/messages/user/en/emergency.en");
    // 無料版テンプレート（EN版をフォールバック）
    let formatMinimalBriefing = null;
    try {
      const {
        formatMinimalHighQualityBriefing
      } = require("../services/telegram/messages/user/en/minimal-high-quality.en");
      if (
        formatMinimalHighQualityBriefing &&
        typeof formatMinimalHighQualityBriefing === "function"
      ) {
        formatMinimalBriefing = formatMinimalHighQualityBriefing;
        console.log("[TEMPLATE] Loaded minimal-high-quality template for EN fallback");
      } else {
        throw new Error("formatMinimalHighQualityBriefing is not a function for EN");
      }
    } catch (e2) {
      console.warn(
        `[TEMPLATE] Failed to load minimal-high-quality template for EN fallback: ${e2.message}`
      );
      try {
        const {
          formatMinimalBriefing: minimalFn
        } = require("../services/telegram/messages/user/en/minimal.en");
        if (minimalFn && typeof minimalFn === "function") {
          formatMinimalBriefing = minimalFn;
          console.warn("[TEMPLATE] Fallback to minimal template for EN");
        } else {
          throw new Error("formatMinimalBriefing is not a function for EN");
        }
      } catch (e3) {
        console.warn(`[TEMPLATE] Minimal template not found even in EN fallback: ${e3.message}`);
      }
    }
    return { formatRegularBriefing, formatTrapAlert, formatMinimalBriefing };
  }
}

const { formatRegularBriefing, formatTrapAlert, formatMinimalBriefing } = loadUserTemplates(LANG);
// メールHTMLフォーマット関数（英語版をデフォルトとして使用）
const { formatRegularBriefingHTML } = require("../services/email/messages/user/en/regular.en");

const {
  getExchangeInflow,
  getMinerPositionIndex
} = require("../services/cryptoquant/endpoints/btc");
// Phase 2: 市場別深掘りデータ
const { getCQDeepMetrics } = require("../services/cryptoquant/deepMetrics");
// 高解像度CryptoQuantデータ取得
const { getHighResolutionCQData } = require("../services/cryptoquant/highResolution");
// Phase 3: CryptoQuant capabilities初期化
const { initializeCapabilities } = require("../services/cryptoquant/capabilities");
// Grok Xアルゴリズム解析 × Gemini深層心理分析統合サービス
const { integrateGrokGeminiOptimization } = require("../services/integrated/grokGeminiOptimizer");
// 価格取得サービス（KO市場用）
const { fetchBTCKRWPrice } = require("../services/upbit/client");
const { fetchUSDKRWRate } = require("../services/exchange/rate");

const {
  buildMarketContext,
  decideSignal,
  decideSignalAdvanced
} = require("../logic/core/marketCore");
const { generateSignal } = require("../logic/tier1_btc/signalGen");
const { BASE } = require("../config/thresholds");
// 市場別プロファイル（MIN_CONF_FOR_TRADE取得用）
let marketProfiles = null;
try {
  marketProfiles = require("../config/marketProfiles");
} catch (e) {
  // marketProfiles.jsがない場合は無視
}
const { detectTrap } = require("../logic/tier1_btc/trapDetector");
const { normalizeSentiment } = require("../logic/tier1_btc/sentiment");
// Phase 3: Market Snapshot Service (リアルタイム検証対応)
const marketSnapshotService = require("../services/core/marketSnapshot");
// Phase 2: Message Logger Service (A/Bテスト・計測用)
const messageLogger = require("../services/core/messageLogger");

const { analyzeMarket, analyzeXSentimentLive } = require("../services/grok/client");
// 高解像度Grok X解析
const { analyzeXSentimentHighResolutionCompat } = require("../services/grok/highResolution");
// USP3: Dr. Grokの心理的サポート機能
const { diagnoseUserSentimentCompat } = require("../services/grok/psychologicalSupport");
// USP1: トラップ防御エンジン
const {
  detectTrapDetection,
  generateTrapAlert,
  detectMarketBug,
  evaluateMarketBugSignal
} = require("../logic/core/trapDetector");
// GPT解析サービス（CryptoQuantデータ解析用）
const {
  analyzeCryptoQuantData,
  generateCryptoQuantAnalysis,
  generateNonUserImpactReport
} = require("../services/gpt/client");
const {
  sendMessage,
  sendPhoto,
  sendVideo,
  sendMessageMinimal,
  sendMessageToChannel,
  sendMessageToAsset
} = require("../services/telegram/bot");
const { getSocialProofText } = require("../services/telegram/reaction-counter");
// Resend Email送信サービス
const { sendBatchEmails } = require("../services/email/resendClient");
const { postProofToX } = require("../services/x/proof-post");
// Gemini番組プロデューサー（ストーリーブランド戦略2.0）- 簡素化版
const { produceShow } = require("../services/gemini/showProducer");
// コンテンツ保存サービス（定時配信用）
const { getContent } = require("../services/core/contentStorage");
// 信頼度スコアベースの統一品質ゲート（全方位対応）
// 見逃した機会計算ユーティリティ
const {
  calculateMissedOpportunities,
  formatMissedOpportunities
} = require("../utils/missedOpportunities");

// Phase 1: イベント駆動配信システム（Strategic SSOT v4.0）
const ENABLE_EVENT_DRIVEN = process.env.ENABLE_EVENT_DRIVEN === "true";
// Telegram送信の有効化（デフォルト: true = Telegram配信を主要チャネルとして使用）
// COO推奨: Telegram配信に戻す（コスト最適化、運用負荷最小化、即時性の確保）
const ENABLE_TELEGRAM = process.env.ENABLE_TELEGRAM !== "false"; // デフォルトでtrue（明示的にfalseにしない限り有効）
const ENABLE_X_PROOF_POST = process.env.ENABLE_X_PROOF_POST === "true";
const X_PROOF_USE_CARTOON = process.env.X_PROOF_USE_CARTOON === "true"; // 風刺画を追加するか
const CTA_LINK_REGEX = /https:\/\/cryptotradeacademy\.io\/start\?[^\s\)]+/g;
// 言語別のソーシャルプルーフボタンテキスト
function getSocialProofButton(lang = "en") {
  const buttonTexts = {
    en: "🔥 I'm Safe (Trap Avoided)",
    es: "🔥 Estoy Seguro (Trampa Evitada)",
    "pt-br": "🔥 Estou Seguro (Armadilha Evitada)",
    ar: "🔥 أنا آمن (تم تجنب الفخ)",
    ja: "🔥 安全です（トラップ回避済み）",
    ko: "🔥 안전합니다 (함정 회피됨)"
  };

  const buttonText = buttonTexts[lang] || buttonTexts["en"];

  return {
    inline_keyboard: [[{ text: buttonText, callback_data: "action_saved" }]]
  };
}
let stateManager, evaluateTrigger;

if (ENABLE_EVENT_DRIVEN) {
  try {
    stateManager = require("../utils/stateManager");
    evaluateTrigger = require("../logic/eventTriggers").evaluateTrigger;
    console.log("[Phase 1] Event-driven delivery system enabled");
  } catch (error) {
    console.warn(
      "[Phase 1] Event-driven modules not found, falling back to legacy mode:",
      error.message
    );
  }
}

function extractCtaLinks(text) {
  if (!text) return [];
  return text.match(CTA_LINK_REGEX) || [];
}

// 市場コードの取得（LANGから推測、または環境変数から）
function getMarketCode(lang) {
  const langToMarket = {
    en: "EN",
    ar: "AR",
    ko: "KO",
    ja: "JA",
    es: "ES",
    "pt-br": "PT-BR"
  };
  return langToMarket[lang] || "EN";
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
  const envKey = `EMAIL_RECIPIENTS_${lang.toUpperCase().replace("-", "_")}`;
  const envEmails = process.env[envKey] || process.env.EMAIL_RECIPIENTS;

  if (envEmails) {
    return envEmails
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email);
  }

  // デフォルト: CEOのメールアドレス（テスト用）
  // 本番環境ではデータベースまたはWhop APIから取得する実装が必要
  const defaultEmail = "chibaichi.work@gmail.com"; // CEO
  console.warn(`[Email] No recipients configured for lang=${lang}. Using default: ${defaultEmail}`);
  console.warn(`[Email] Set ${envKey} or EMAIL_RECIPIENTS environment variable for production.`);
  return [defaultEmail];
}

// --- External data helpers -------------------------------------

async function fetchBtcPrice() {
  const url = new URL(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true"
  );
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Price API Error: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  const data = json.bitcoin || {};
  return {
    priceUsd: Number(data.usd) || 0,
    change24h: Number(data.usd_24h_change) || 0
  };
}

async function fetchFearGreed() {
  const url = new URL("https://api.alternative.me/fng/?limit=1");
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`FNG API Error: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  const point = json?.data?.[0];
  if (!point) return { value: null, label: "Unknown" };
  return {
    value: Number(point.value) || null,
    label: point.value_classification || "Unknown"
  };
}

// --- Watch helper (cheap trigger, no LLM) -----------------------
function shouldWatch({ score, confidence, trap, isRegularSlot }) {
  // REGULAR 時は定期配信でカバーするので WATCH を抑制
  if (isRegularSlot) return false;

  // EMERGENCY は別で処理（trap HIGH）
  if (trap?.isTrap && trap?.confidence === "HIGH") return false;

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
    console.warn("[Phase 3] Failed to initialize CryptoQuant capabilities:", error.message);
    // エラーが発生しても処理は続行（フォールバック動作）
  }

  // p-retryを動的インポート（ES Module対応）
  if (!pRetry) {
    try {
      const pRetryModule = await import("p-retry");
      pRetry = pRetryModule.default || pRetryModule;
    } catch (error) {
      console.error("[p-retry] Failed to import:", error);
    }
  }

  // P0 FIX: integratedOptimizationを関数スコープの最初で定義（スコープ問題の修正）
  // これにより、isRegularSlotブロックが実行されない場合でも、言語ループ内で使用可能
  let integratedOptimization = null;

  const debugBypass = req.query?.debug === "local";
  const authHeader = req.headers.authorization;

  if (
    !debugBypass &&
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const logger = createLogger("handler");
  logger.info("Cron job started: Whale Monitor");

  try {
    // 0. 時間スロット判定（6時間ごとデフォルト、4時間ごとに切り替え可能）- UTC固定
    const now = new Date();
    const nowUTC = zonedTimeToUtc(now, TZ_UTC);
    const utcHour = Number(formatInTimeZone(nowUTC, TZ_UTC, "HH"));
    const utcMinute = Number(formatInTimeZone(nowUTC, TZ_UTC, "mm"));
    // 定期配信スケジュール: UTC 6時間ごと（0, 6, 12, 18）デフォルト、または4時間ごと（0, 4, 8, 12, 16, 18, 20）
    const REGULAR_HOURS_6H = [0, 6, 12, 18];
    const REGULAR_HOURS_4H = [0, 4, 8, 12, 16, 18, 20];
    // 環境変数で切り替え可能（デフォルトは6時間ごと）
    const USE_4H_SCHEDULE = process.env.REGULAR_SCHEDULE === "4h";
    const REGULAR_HOURS = USE_4H_SCHEDULE ? REGULAR_HOURS_4H : REGULAR_HOURS_6H;
    // Cronジョブは15分ごとに実行されるため、定期配信スロットは0-14分の間で判定（実行タイミングの誤差を考慮）
    const isRegularSlot = REGULAR_HOURS.includes(utcHour) && utcMinute < 15;
    const force = req.query?.force === "true";

    logger.info("Slot check", {
      utcHour,
      utcMinute,
      isRegularSlot,
      force,
      schedule: USE_4H_SCHEDULE ? "4h" : "6h",
      regularHours: REGULAR_HOURS,
      isInRegularHours: REGULAR_HOURS.includes(utcHour)
    });

    // 1. On-chain (CryptoQuant) - リトライ付き
    const fetchCQData = async () => {
      return await Promise.all([
        pRetry(() => getExchangeInflow(), { retries: 2, factor: 2, minTimeout: 500 }),
        pRetry(() => getMinerPositionIndex(), { retries: 2, factor: 2, minTimeout: 500 })
      ]);
    };

    const [inflowData, mpiData] = await fetchCQData();

    if (!inflowData || !mpiData) {
      logger.warn("No data from CryptoQuant");
      return res.status(200).json({ message: "No on-chain data, skipped." });
    }

    const inflow = Number(inflowData.value) || 0;
    const mpi = Number(mpiData.value) || 0;

    // 2. Price & Fear&Greed - リトライ付き
    const fetchPriceData = async () => {
      return await Promise.all([
        pRetry(() => fetchBtcPrice(), { retries: 2, factor: 2, minTimeout: 500 }),
        pRetry(() => fetchFearGreed(), { retries: 2, factor: 2, minTimeout: 500 })
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

    const shouldCallGPT =
      !isRegularSlot &&
      (Math.abs(inflow) > GPT_THRESHOLD_INFLOW || // Exchange Netflowが大きい
        Math.abs(mpi) > GPT_THRESHOLD_MPI || // MPIが極端
        Math.abs(change24h) > GPT_THRESHOLD_CHANGE24H || // 24h変動が大きい
        force); // 強制実行

    if (shouldCallGPT) {
      // 15分ごとの緊急配信用: GPTでCryptoQuantデータを解析
      try {
        const cryptoQuantData = {
          inflow,
          mpi,
          priceUsd,
          change24h,
          sentiment: sentimentLabel
        };

        const marketContext = {
          priceUsd,
          change24h,
          sentiment: sentimentLabel
        };

        logger.info("Analyzing CryptoQuant data for emergency signal detection", {
          inflow,
          mpi,
          change24h
        });

        gptCryptoQuantAnalysis = await analyzeCryptoQuantData(cryptoQuantData, marketContext, LANG);

        logger.info("GPT analysis result", {
          signal: gptCryptoQuantAnalysis.signal,
          confidence: gptCryptoQuantAnalysis.confidence,
          urgency: gptCryptoQuantAnalysis.urgency
        });

        // GPT解析結果はトラップアラート生成に使用（BUY/SELLシグナル生成は削除）
        if (gptCryptoQuantAnalysis.confidence >= 0.8) {
          // GPT解析結果はトラップアラート生成に使用（BUY/SELLシグナルは生成しない）
          gptSignalDecision = {
            signal: "NONE", // BUY/SELLシグナルは完全削除
            confidence: gptCryptoQuantAnalysis.confidence,
            reasoning: gptCryptoQuantAnalysis.reasoning,
            urgency: gptCryptoQuantAnalysis.urgency,
            keyIndicators: gptCryptoQuantAnalysis.keyIndicators || [],
            riskLevel: gptCryptoQuantAnalysis.riskLevel || "medium"
          };
          logger.info("High-confidence trap alert detected (AVOID_SHORT/AVOID_LONG)", {
            confidence: gptSignalDecision.confidence,
            urgency: gptSignalDecision.urgency
          });
        }
      } catch (error) {
        // エラータイプ別の処理
        if (error?.status === 429) {
          logger.warn("Rate limit hit, will retry on next run", {
            error: error?.message
          });
        } else if (error?.status >= 500) {
          logger.error("Server error, using fallback", {
            error: error?.message,
            status: error?.status
          });
        } else {
          logger.warn("GPT analysis error, using fallback", {
            error: error?.message,
            stack: error?.stack?.substring(0, 200)
          });
        }
        // GPT解析エラー時は既存ロジックにフォールバック
      }
    } else if (!isRegularSlot) {
      logger.info("Skipping GPT call (thresholds not met)", {
        inflow,
        mpi,
        change24h
      });
    }

    let ctx = buildMarketContext({
      asset: "BTC",
      priceUsd,
      change24h,
      inflow,
      mpi,
      xSentiment,
      market: getMarketCode(LANG) // Phase 2: 市場情報追加
    });

    // Phase 2: decideSignalAdvanced使用（市場別補正）
    let coreDecision = decideSignalAdvanced ? decideSignalAdvanced(ctx) : decideSignal(ctx);

    // GPT解析結果はトラップアラート生成に使用（BUY/SELLシグナル生成は削除）
    if (gptSignalDecision && gptSignalDecision.confidence >= 0.8) {
      console.log(
        "[GPT] Using GPT analysis for trap alert generation (BUY/SELL signal generation removed)"
      );
      // GPT解析結果はトラップアラート生成に使用（BUY/SELLシグナルは生成しない）
      coreDecision = {
        ...coreDecision,
        signal: "NONE", // BUY/SELLシグナルは完全削除
        confidence: gptSignalDecision.confidence
      };
    }

    let tradeSignal = generateSignal({
      priceUsd,
      score: coreDecision.score,
      direction: coreDecision.signal
    });

    // sideは常にFLAT（BUY/SELL/LONG/SHORTは完全削除）
    let side = "FLAT";

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
      mpi
    });

    // Phase 4: EMERGENCY判定（SSOT準拠）
    // Step 1: SSOT閾値統一 - trapScore>=60 に統一（品質ゲートと統一）
    // 注: trapScoreは後で取得されるため、ここでは一時的な判定のみ
    // 最終的なEMERGENCY判定は eventTriggers.js で行う
    const needsEmergency =
      (trap.isTrap && trap.confidence === "HIGH" && !isRegularSlot) ||
      (gptSignalDecision && gptSignalDecision.urgency === "high" && !isRegularSlot);

    // WATCH (cheap) before calling Grok
    const needsWatch = shouldWatch({
      score: coreDecision.score,
      confidence: coreDecision.confidence,
      trap,
      isRegularSlot
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
          "latest BTC price action, funding, liquidations, whale activity, ETF flows on X",
          LANG
        );
        xIntel = grokSent;
        highResXData = grokSent._highResolution || null;

        if (grokSent && typeof grokSent === "object") {
          xSentiment = {
            whaleBias: Number(grokSent.whaleBias) || 0,
            retailFomo: Number(grokSent.retailFomo) || 50,
            newsImpact: Number(grokSent.newsImpact) || 0
          };
        }
      } catch (err) {
        console.warn(
          "⚠️ Grok High-Resolution X Analysis Error, falling back to standard analysis:",
          err?.message || err
        );
        // フォールバック: 標準のX解析
        try {
          const fallbackGrokSent = await analyzeXSentimentLive(
            "latest BTC price action, funding, liquidations, whale activity, ETF flows on X"
          );
          xIntel = fallbackGrokSent;
          if (fallbackGrokSent && typeof fallbackGrokSent === "object") {
            xSentiment = {
              whaleBias: Number(fallbackGrokSent.whaleBias) || 0,
              retailFomo: Number(fallbackGrokSent.retailFomo) || 50,
              newsImpact: Number(fallbackGrokSent.newsImpact) || 0
            };
          }
        } catch (fallbackErr) {
          console.warn(
            "⚠️ Grok Live Search Error (fallback also failed):",
            fallbackErr?.message || fallbackErr
          );
        }
      }

      // Re-evaluate with xSentiment
      // 高解像度データも含める
      ctx = buildMarketContext({
        asset: "BTC",
        priceUsd,
        change24h,
        inflow,
        mpi,
        xSentiment,
        market: getMarketCode(LANG), // Phase 2: 市場情報追加
        highResCQ: highResCQData, // 高解像度CryptoQuantデータ
        highResX: highResXData // 高解像度Xセンチメントデータ
      });

      coreDecision = decideSignal(ctx);
      tradeSignal = generateSignal({
        priceUsd,
        score: coreDecision.score,
        direction: coreDecision.signal
      });

      side = "FLAT"; // BUY/SELL/LONG/SHORTは完全削除

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
        retailFomo: xSentiment.retailFomo
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
      asset: "BTC",
      priceUsd,
      change24h,
      inflow,
      mpi,
      xSentiment,
      market: "EN", // ベースはENで統一
      highResCQ: highResCQData, // 高解像度データ（イベント駆動パスで取得済みの場合）
      highResX: highResXData // 高解像度データ（イベント駆動パスで取得済みの場合）
    });
    const baseCoreDecision = decideSignal(baseCtx);

    const snapshot = marketSnapshotService.createSnapshot({
      priceUsd,
      change24h,
      inflow,
      mpi,
      sentimentLabel,
      xSentiment,
      trap
    });

    // スナップショットのスコアを使用（全言語で統一）
    coreDecision = {
      ...baseCoreDecision,
      score: snapshot.market_score // スナップショットの統一スコアを使用
    };
    tradeSignal = generateSignal({
      priceUsd: snapshot.price_usd_display, // 統一価格を使用
      score: snapshot.market_score, // 統一スコアを使用
      direction: coreDecision.signal
    });

    // sideは常にFLAT（BUY/SELL/LONG/SHORTは完全削除）
    side = "FLAT";

    entry = priceUsd;
    tp = tradeSignal.tp;
    sl = tradeSignal.sl;

    // Phase 4: EMERGENCY判定（SSOT準拠）
    // Step 1: SSOT閾値統一 - trapScore>=60 に統一（品質ゲートと統一）
    // 注: trapScoreは cqDeep.trapScore または trapDetection.trapScore から取得
    // 最終的なEMERGENCY判定は eventTriggers.js で行う（trapScore>=60, liquidations>$500M, kimchiPremium>8%）
    // ここでは一時的な判定のみ（後方互換性のため）
    const finalNeedsEmergency = trap.isTrap && trap.confidence === "HIGH" && !isRegularSlot;

    // ===== Phase 1: イベント駆動配信判定（Strategic SSOT v4.0） =====
    let shouldSend = true; // デフォルト: 既存動作維持
    let triggerType = isRegularSlot ? "REGULAR" : finalNeedsEmergency ? "EMERGENCY" : "WATCH";
    let triggerReason = "Legacy mode";

    // divergenceSignalResultを関数スコープの最初で定義（すべてのブロックで使用可能にする）
    let divergenceSignalResult = null;

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
          if (market.toLowerCase() === "ko") {
            try {
              const [upbitPriceData, usdKrwRate] = await Promise.all([
                fetchBTCKRWPrice(),
                fetchUSDKRWRate()
              ]);
              priceOptions = {
                upbitPrice: upbitPriceData?.tradePrice ?? priceUsd, // Upbit BTC/KRW価格（フォールバック: USD価格）
                usdKrwRate: usdKrwRate ?? 1300 // USD/KRW為替レート（フォールバック: 1300）
              };
              console.log("[Phase 2] Price data fetched:", {
                upbitPrice: priceOptions.upbitPrice,
                usdKrwRate: priceOptions.usdKrwRate
              });
            } catch (priceError) {
              console.warn(
                "[Phase 2] Error fetching price data, using fallback:",
                priceError.message
              );
              // フォールバック: 既存のハードコード値
              priceOptions = {
                upbitPrice: priceUsd,
                usdKrwRate: 1300
              };
            }
          } else {
            // 非KO市場の場合は、既存の動作を維持（priceOptionsは空のまま）
            priceOptions = {
              upbitPrice: priceUsd,
              usdKrwRate: 1300
            };
          }

          // Step 2-4: EMERGENCY判定指標のキャッシュバイパス
          // イベント駆動配信時は、EMERGENCY判定に使う指標（trapScore, liquidations, kimchiPremium）を
          // 常に最新データで取得（キャッシュをバイパス）
          priceOptions.skipCache = shouldSkipCacheForEmergency;

          // 高解像度を先に取得し、getCQDeepMetrics で再利用（同一エンドポイントの重複呼び出し回避）
          // タイムアウト対策: 定期枠以外（15分監視）では簡易データのみ取得してスキップ
          if (isRegularSlot || force) {
            console.log("[CQDeep] Regular slot: fetching high-res first, then deep (reuse)...");
            try {
              const highResResult = await getHighResolutionCQData({
                includeWhaleRatio: true,
                includeLiquidations: true,
                skipCache: shouldSkipCacheForEmergency
              });
              highResCQData = highResResult;
              console.log(
                "[High-Resolution CQ] Data fetched, bug signals:",
                highResCQData?.bugSignals?.overallBugScore
              );
              const deepResult = await getCQDeepMetrics(market, {
                ...priceOptions,
                highResCQ: highResResult
              });
              cqDeep = { ...cqDeep, ...deepResult };
            } catch (deepErr) {
              console.warn("[Phase 2] Error in CQ fetch (highRes or deep):", deepErr?.message);
              if (!highResCQData) highResCQData = null;
              if (Object.keys(cqDeep).length <= 2) {
                try {
                  const fallbackDeep = await getCQDeepMetrics(market, priceOptions);
                  cqDeep = { ...cqDeep, ...fallbackDeep };
                } catch (e2) {
                  console.warn("[Phase 2] Fallback getCQDeepMetrics failed:", e2?.message);
                }
              }
            }
          } else {
            console.log("[CQDeep] Non-regular slot (15min monitoring): skipping deep metrics for speed");
            highResCQData = null;
          }
        } catch (error) {
          console.warn("[Phase 2] Error in data fetching, using basic data:", error.message);
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

        if (
          normalizedSignal !== "NONE" &&
          normalizedSignal !== "TRAP_STANDBY" &&
          coreDecision.confidence < minConfForTrade
        ) {
          console.log(
            `[Confidence Gate] Blocked in event-driven mode: confidence ${coreDecision.confidence.toFixed(2)} < ${minConfForTrade}`
          );
          normalizedSignal = "TRAP_STANDBY";
        } else if (normalizedSignal !== "NONE" && normalizedSignal !== "TRAP_STANDBY") {
          console.log(
            `[Confidence Gate] Passed in event-driven mode: confidence ${coreDecision.confidence.toFixed(2)} >= ${minConfForTrade}`
          );
        }

        if (!normalizedSignal || normalizedSignal === "NONE" || normalizedSignal === "FLAT") {
          normalizedSignal = "TRAP_STANDBY";
        }

        const currentState = {
          signal: normalizedSignal,
          score: coreDecision.score,
          regime: coreDecision.regime,
          confidence: coreDecision.confidence,
          trapScore:
            cqDeep.trapScore ??
            (trap.isTrap
              ? trap.confidence === "HIGH"
                ? 80
                : trap.confidence === "MEDIUM"
                  ? 50
                  : 30
              : 0),
          kimchiPremium: cqDeep.kimchiPremium ?? 0,
          riskReward: cqDeep.riskReward ?? 1.0
        };

        // イベントトリガー評価
        const trigger = await evaluateTrigger(market, currentState, lastState, cqDeep);

        // P0 FIX: isRegularSlotがtrueの場合は、イベント駆動の判定に関係なく必ず配信
        if (isRegularSlot) {
          shouldSend = true;
          triggerType = "REGULAR";
          triggerReason = "Regular slot (forced)";
          console.log(
            `[Event-Driven] Regular slot detected, forcing shouldSend=true regardless of trigger evaluation`
          );
        } else {
          shouldSend = trigger.shouldSend;
          triggerType = trigger.triggerType;
          triggerReason = trigger.reason;
        }

        console.log(
          `[Event-Driven] Market: ${market}, Trigger: ${triggerType}, ShouldSend: ${shouldSend}, Reason: ${triggerReason}`
        );

        // 配信する場合のみ状態保存
        if (shouldSend) {
          await stateManager.saveState(market, {
            ...currentState,
            lastSignal: currentState.signal,
            lastScore: currentState.score
          });
        }
      } catch (error) {
        console.error(
          "[Event-Driven] Error in event trigger evaluation, falling back to legacy mode:",
          error
        );
        console.error("[Event-Driven] Error stack:", error.stack);
        // エラー時は既存動作を維持（isRegularSlotの場合は必ず送信）
        if (isRegularSlot) {
          shouldSend = true;
          triggerType = "REGULAR";
          triggerReason = "Fallback due to event-driven error";
          console.log("[Event-Driven] Fallback: isRegularSlot=true, forcing shouldSend=true");
        }
      }
    } else {
      // イベント駆動が無効な場合、isRegularSlotがtrueの場合は必ず送信
      if (isRegularSlot) {
        shouldSend = true;
        triggerType = "REGULAR";
        triggerReason = "Regular slot (event-driven disabled)";
      }
    }
    // ===== Phase 1 End =====

    // 6-2. 定期配信時のAI解析（GPT + Grok分離）
    // イベント駆動有効時は、トリガー判定後にAI呼び出しを調整
    // P0 FIX: isRegularSlotの場合は必ずAI解析を実行（エラー時も配信を継続）
    const shouldCallAI = shouldSend || isRegularSlot || force;
    let gptRegularAnalysis = null; // 定期配信用GPT解析
    let grokXAnalysis = null; // 定期配信用Grok X解析

    // P0 FIX: isRegularSlotの場合は必ずAI解析を実行（エラー時も配信を継続）
    if (needsLongReport && shouldCallAI && isRegularSlot) {
      console.log(
        "[AI Analysis] Starting AI analysis for regular briefing (GPT + Grok + Gemini)..."
      );
      // 定期配信時: GPTがCryptoQuantデータを解析、GrokがXを解析
      const cryptoQuantData = {
        inflow,
        mpi,
        priceUsd,
        change24h,
        sentiment: sentimentLabel,
        ...cqDeep // 深掘りデータも含める
      };

      const marketContext = {
        priceUsd,
        change24h,
        score: coreDecision.score,
        signal: tradeSignal.signal,
        sentiment: sentimentLabel,
        trap
      };

      // GPT分析は各言語ごとに呼び出す（言語ごとに異なる分析を生成）
      // ただし、最初の言語で一度だけ呼び出し、他の言語では同じ結果を使用する（コスト削減）
      // 注意: 多言語配信の場合、最初の言語でGPT分析を生成し、他の言語では同じ結果を使用
      // ただし、各言語ごとに異なる分析が必要な場合は、各言語ごとに呼び出す
      // 現在は最初の言語（通常は'en'）でGPT分析を生成
      const firstTargetLang = getTargetLanguagesForRegular()[0] || "en";
      try {
        // GPTでCryptoQuantデータを詳細解析（最初の言語で生成）
        console.log(
          `[GPT] Generating detailed CryptoQuant analysis for regular broadcast (lang: ${firstTargetLang})...`
        );
        gptRegularAnalysis = await generateCryptoQuantAnalysis(
          cryptoQuantData,
          marketContext,
          firstTargetLang
        );

        // エラーメッセージが含まれていないか確認
        if (gptRegularAnalysis && typeof gptRegularAnalysis === "string") {
          const errorKeywords = ["api error", "unavailable", "error", "failed", "timeout"];
          const isError = errorKeywords.some((keyword) =>
            gptRegularAnalysis.toLowerCase().includes(keyword)
          );
          if (isError) {
            console.warn("[GPT] Error message detected in analysis, setting to null");
            gptRegularAnalysis = null;
          } else {
            // 日本語が混在していないか確認（EN版の場合）
            // 重要: キャッシュから古い日本語の結果が返ってくる可能性があるため、必ずチェック
            if (
              firstTargetLang === "en" &&
              /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(gptRegularAnalysis)
            ) {
              console.warn(
                "[GPT] Japanese characters detected in English analysis, forcing null to use fallback"
              );
              // 日本語が含まれている場合は即座にnullにしてフォールバック処理に任せる
              // 再生成は行わない（キャッシュから同じ結果が返ってくる可能性があるため）
              gptRegularAnalysis = null;
            }
            console.log(
              "[GPT] Regular analysis generated:",
              gptRegularAnalysis.substring(0, 200) + "..."
            );
          }
        }
      } catch (err) {
        console.warn("[GPT] Error generating regular analysis:", err?.message || err);
        gptRegularAnalysis = null; // エラー時はnullを設定（メッセージテンプレート側でフォールバック処理）
      }

      try {
        // GrokでX（Twitter）を高解像度解析
        console.log("[Grok] Analyzing X sentiment with high-resolution for regular broadcast...");
        const grokSent = await analyzeXSentimentHighResolutionCompat(
          "latest BTC price action, funding, liquidations, whale activity, ETF flows on X",
          LANG
        );
        grokXAnalysis = grokSent;

        // 高解像度Xデータを取得
        if (grokSent && typeof grokSent === "object") {
          highResXData = grokSent._highResolution || grokSent.highResolution || null;
          xSentiment = {
            whaleBias: Number(grokSent.whaleBias) || 0,
            retailFomo: Number(grokSent.retailFomo) || 50,
            newsImpact: Number(grokSent.newsImpact) || 0
          };
        }
        console.log("[Grok] X analysis completed:", xSentiment);
      } catch (err) {
        console.warn("[Grok] Error analyzing X sentiment:", err?.message || err);
        grokXAnalysis = null;
      }

      // 後方互換性のため、aiAnalysisにGPT解析結果を設定
      aiAnalysis = gptRegularAnalysis || aiAnalysis;

      // ===== USP1: トラップ防御とトレンド転換先回り =====
      // trapDetectionとtrapAlertは既に広いスコープで定義済み
      try {
        console.log("[Trap Detector] Detecting traps and trend reversals...");
        trapDetection = detectTrapDetection({
          exchangeNetflow: inflow,
          minerMPI: mpi,
          whaleBias: xSentiment.whaleBias || 0,
          retailFomo: xSentiment.retailFomo || 50,
          priceChange24h: change24h,
          highResCQ: highResCQData,
          highResX: highResXData
        });

        if (trapDetection.trapDetected) {
          console.log("[Trap Detector] Trap detected:", {
            trapType: trapDetection.trapType,
            trapSeverity: trapDetection.trapSeverity,
            trapScore: trapDetection.trapScore,
            trendReversalSignal: trapDetection.trendReversalSignal
          });

          // トラップベースのアラート生成
          trapAlert = generateTrapAlert({
            exchangeNetflow: inflow,
            minerMPI: mpi,
            whaleBias: xSentiment.whaleBias || 0,
            retailFomo: xSentiment.retailFomo || 50,
            priceChange24h: change24h,
            highResCQ: highResCQData,
            highResX: highResXData
          });

          // Phase 4: trapDetectionのtrapScoreを cqDeep に反映（EMERGENCY判定で使用）
          // Step 1: SSOT閾値統一 - trapScore>=60 に統一（品質ゲートと統一）
          if (trapDetection && trapDetection.trapScore) {
            cqDeep.trapScore = trapDetection.trapScore;
          }

          // トラップアラートのみ使用（BUY/SELLシグナル生成ロジックは完全削除）
          // SSOT準拠: 統一品質ゲート（trapScore>=60 & multipleDivergences>=3）が適用済み
          if (trapAlert.alert) {
            console.log("[Trap Detector] Quality-gated trap alert detected:", {
              type: trapAlert.type,
              recommendation: trapAlert.recommendation,
              confidence: trapAlert.confidence,
              trapScore: trapDetection.trapScore,
              multipleDivergences: trapDetection.divergence?.multipleDivergences || 0
            });
            // トラップアラートの推奨のみを使用（BUY/SELLシグナルは生成しない）
          } else {
            console.log("[Trap Detector] Trap alert blocked by quality gate:", {
              trapScore: trapDetection.trapScore,
              multipleDivergences: trapDetection.divergence?.multipleDivergences || 0,
              required: "trapScore>=60 & multipleDivergences>=3"
            });
          }
        }
      } catch (error) {
        console.warn("[Trap Detector] Error detecting traps:", error.message);
      }

      // 後方互換性のため、marketBugDetectionも設定（関数スコープで既に定義済み）
      marketBugDetection = trapDetection;

      // ===== USP3: Dr. Grokの心理的サポート =====
      // P0 FIX: 各言語ループ内で計算するように変更（言語ごとに正しいアドバイスを返すため）
      // psychologicalSupportは各言語ループ内で計算される（後で定義）
      // divergenceSignalResultは関数スコープの最初で定義済み（700行目付近）
      // 値がnullの場合は更新を試みる
      if (!divergenceSignalResult) {
        try {
          // baseCoreDecisionまたはcoreDecisionからダイバージェンスシグナルを取得
          divergenceSignalResult =
            baseCoreDecision?.divergenceSignal || coreDecision?.divergenceSignal || null;
        } catch (error) {
          console.warn("[Dr. Grok] Error getting divergence signal:", error.message);
          divergenceSignalResult = null; // エラー時はnullを明示的に設定
        }
      }

      // P0 FIX: 言語ごとにpsychologicalSupportを計算するため、ここでは計算しない
      // 各言語ループ内で計算する（targetLangを正しく渡すため）
      psychologicalSupport = null; // 各言語ループ内で計算される

      // P0 FIX: GrokとGeminiの統合最適化は各言語ループ内で実行する（言語ごとのpsychologicalSupportを使用するため）
      // integratedOptimizationは各言語ループ内で計算される（後で定義）
      integratedOptimization = null; // 各言語ループ内で計算される
    } else if (needsLongReport && !isRegularSlot) {
      // 緊急配信時: divergenceSignalResultを取得（isRegularSlotブロック外でも使用可能にする）
      if (typeof divergenceSignalResult === "undefined") {
        divergenceSignalResult = null;
        try {
          divergenceSignalResult =
            baseCoreDecision?.divergenceSignal || coreDecision?.divergenceSignal || null;
        } catch (error) {
          console.warn("[Dr. Grok] Error getting divergence signal (emergency):", error.message);
          divergenceSignalResult = null;
        }
      }
      // 注: shouldCallGrok は未定義だったため削除（needsLongReport で十分）
      // 緊急配信時: 既存のGrok分析を維持（後方互換性）
      const marketSummaryPayload = {
        asset: "BTC",
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
        trap
      };

      try {
        // トラップ検出情報を準備（高リスク時に「辛口モード」を有効化）
        const trapInfo = trapDetection
          ? {
              trapSeverity: trapDetection.trapSeverity || "NONE",
              trapScore: trapDetection.trapScore || 0,
              trapType: trapDetection.trapType || null
            }
          : null;

        // Phase 2: 市場コードとCryptoQuant深掘りデータ、トラップ検出情報をGrokに渡す
        aiAnalysis = await analyzeMarket(
          JSON.stringify(marketSummaryPayload),
          JSON.stringify(xSentiment),
          LANG,
          getMarketCode(LANG),
          cqDeep,
          trapInfo
        );
      } catch (err) {
        console.warn(
          "⚠️ Grok Market Analyze Error in analyzeMarket, fallback to offline analysis:",
          err?.message || err
        );
        aiAnalysis = null;
      }
    }

    // 7. Telegram send
    let sent = 0;

    // ===== Phase 1: イベント駆動配信対応 =====
    // イベント駆動有効時は、shouldSend判定を優先
    const willSend = ENABLE_EVENT_DRIVEN ? shouldSend : true;

    // P0 FIX: 早期returnを「定期枠以外」に限定（GPT-5.2推奨案A）
    // 定期枠(isRegularSlot)は shouldSend=false でも送る（forceも同様）
    // これにより「isRegularSlot=true なのに止まる」が解消される
    if (!force && !isRegularSlot && !willSend) {
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
          signal: tradeSignal.signal
        }
      });
    }
    // ===== Phase 1 End =====

    // 7-A. REGULAR（有料版 - 6言語すべてに配信）
    // P0 FIX: 早期return条件を修正したため、isRegularSlotがtrueの場合は必ず到達する
    // 定期配信（isRegularSlot）と強制配信（force）は必ず送信
    // イベント駆動のREGULARトリガーも送信（早期returnで既にフィルタリング済み）
    // 重要: isRegularSlotがtrueの場合は、イベント駆動の判定に関係なく必ず配信
    if (isRegularSlot || force || (ENABLE_EVENT_DRIVEN && triggerType === "REGULAR" && !isRegularSlot)) {
      console.log("[REGULAR] ✅✅✅ DELIVERY START: Sending REGULAR message (paid version) to all languages...");
      console.log(
        "[REGULAR] Conditions:",
        {
          isRegularSlot,
          force,
          ENABLE_EVENT_DRIVEN,
          triggerType,
          shouldSend,
          willSend: ENABLE_EVENT_DRIVEN ? shouldSend : true
        }
      );

      // 配信対象言語を取得（デフォルト: 6言語すべて）
      const targetLangsForRegular = getTargetLanguagesForRegular();
      console.log(
        `[REGULAR] Target languages: ${targetLangsForRegular.join(", ")} (${targetLangsForRegular.length} languages)`
      );
      
      // P0 FIX: チャンネルIDの設定状況を確認してログに出力
      const series = "BTC";
      const missingChannelIds = [];
      for (const lang of targetLangsForRegular) {
        const marketCode = getMarketCode(lang);
        const marketCodeEnv = marketCode.replace("-", "_");
        const channelIdEnvVar = `TELEGRAM_CHAT_ID_${series}_${marketCodeEnv}`;
        if (!process.env[channelIdEnvVar] && !process.env.TELEGRAM_CHAT_ID) {
          missingChannelIds.push(`${lang} (${channelIdEnvVar} or TELEGRAM_CHAT_ID)`);
        }
      }
      if (missingChannelIds.length > 0) {
        console.warn(`[REGULAR] ⚠️ Missing channel IDs for languages: ${missingChannelIds.join(", ")}`);
      } else {
        console.log(`[REGULAR] ✅ All channel IDs configured for target languages`);
      }

      // P0 FIX: 言語リストが空でないことを確認
      if (!targetLangsForRegular || targetLangsForRegular.length === 0) {
        console.error(
          "[REGULAR] ERROR: No target languages found! REGULAR_MULTI_LANG:",
          REGULAR_MULTI_LANG,
          "LANG:",
          LANG
        );
        return res.status(500).json({
          error: "No target languages configured for Regular Briefing",
          REGULAR_MULTI_LANG,
          LANG
        });
      }

      // ===== 定期配信: サービス未利用ユーザーの悲惨な状況を報道 =====
      // 一度だけ計算して、各言語で使用
      let missedOpportunities = null;
      try {
        // 見逃した機会を計算（一度だけ）
        console.log("[MissedOpportunities] Calculating missed opportunities for non-users...");
        missedOpportunities = await calculateMissedOpportunities(null, 24); // 過去24時間
      } catch (error) {
        console.warn(
          "[MissedOpportunities] Error calculating missed opportunities:",
          error.message
        );
        // エラー時は続行（必須ではない）
      }

      // Phase 2: イベント駆動が無効な場合でも深掘りデータを取得（一度だけ）
      if (!ENABLE_EVENT_DRIVEN || !stateManager) {
        try {
          // 最初の言語の市場コードを使用（深掘りデータは全言語で共通）
          const firstLangMarket = getMarketCode(targetLangsForRegular[0]);
          const deepData = await getCQDeepMetrics(firstLangMarket, {
            upbitPrice: priceUsd,
            usdKrwRate: 1300
          });
          cqDeep = { ...cqDeep, ...deepData };
        } catch (error) {
          console.warn("[Phase 2] Error fetching deep metrics:", error.message);
        }
      }

      // 各言語ごとに配信
      for (const targetLang of targetLangsForRegular) {
        try {
          console.log(`[REGULAR] Processing language: ${targetLang}`);

          // P0 FIX: 各言語ごとにpsychologicalSupportを計算（targetLangを正しく渡すため）
          let langPsychologicalSupport = null;
          try {
            console.log(`[Dr. Grok] Diagnosing user sentiment for ${targetLang}...`);
            langPsychologicalSupport = await diagnoseUserSentimentCompat(
              {
                price_usd_display: priceUsd,
                change_24h: change24h,
                market_score: snapshot.market_score,
                trapDetection: trapDetection,
                marketBug: marketBugDetection, // 後方互換性
                trapAlert: trapAlert,
                divergenceSignal: divergenceSignalResult || null // nullを明示的に設定
              },
              xSentiment,
              targetLang // P0 FIX: LANGではなくtargetLangを渡す
            );

            if (langPsychologicalSupport && langPsychologicalSupport.psychologicalState !== "UNKNOWN") {
              console.log(`[Dr. Grok] Psychological diagnosis completed for ${targetLang}:`, {
                state: langPsychologicalSupport.psychologicalState,
                risk: langPsychologicalSupport.psychologicalRisk,
                supportLevel:
                  langPsychologicalSupport.psychologicalSupportLevel ||
                  langPsychologicalSupport.medicalSupportLevel
              });
            }
          } catch (error) {
            // エラーメッセージを詳細化
            const errorMsg = error.message || String(error);
            console.warn(`[Dr. Grok] Error providing psychological support for ${targetLang}:`, errorMsg);
            langPsychologicalSupport = null; // エラー時はnullを設定
          }

          // 言語別テンプレートを読み込む
          const langTemplates = loadUserTemplates(targetLang);
          const langFormatRegularBriefing = langTemplates.formatRegularBriefing;
          if (!langFormatRegularBriefing) {
            console.warn(`[REGULAR] Template not found for ${targetLang}, skipping`);
            continue;
          }

          // Phase 3: 市場別オプションデータをスナップショットに追加
          const targetMarket = getMarketCode(targetLang);
          if (targetLang === "ko" && cqDeep?.kimchiPremium != null) {
            marketSnapshotService.addLocalOptional(snapshot.snapshot_id, "KO", {
              kimchiPremium: cqDeep.kimchiPremium,
              upbitPrice: cqDeep.upbitPrice ?? priceUsd
            });
          }
          if (targetLang === "en") {
            marketSnapshotService.addLocalOptional(snapshot.snapshot_id, "EN", {
              trapScore: cqDeep?.trapScore,
              whaleFlows: cqDeep?.whaleFlows,
              liquidations: cqDeep?.liquidations
            });
          }

          // P0 FIX: GrokとGeminiの統合最適化（各言語ごとに実行）
          let langIntegratedOptimization = null;
          if (isRegularSlot && grokXAnalysis && langPsychologicalSupport) {
            try {
              console.log(
                `[GrokGeminiOptimizer] Integrating Grok X algorithm analysis and Gemini deep psychology analysis for ${targetLang}...`
              );
              langIntegratedOptimization = await integrateGrokGeminiOptimization({
                marketData: {
                  priceUsd,
                  change24h,
                  score: coreDecision.score,
                  signal: tradeSignal.signal,
                  sentiment: sentimentLabel
                },
                trapScore: cqDeep?.trapScore || trapDetection?.trapScore || null,
                sentimentData: {
                  sentiment: sentimentLabel,
                  whaleBias: xSentiment?.whaleBias || 0,
                  retailFomo: xSentiment?.retailFomo || 50
                },
                xSentiment,
                trapDetection,
                psychologicalSupport: langPsychologicalSupport, // P0 FIX: 言語ごとのpsychologicalSupportを使用
                lang: targetLang // P0 FIX: LANGではなくtargetLangを渡す
              });

              if (langIntegratedOptimization && langIntegratedOptimization.integrated) {
                console.log(`[GrokGeminiOptimizer] Integration completed successfully for ${targetLang}`);
              } else {
                console.warn(`[GrokGeminiOptimizer] Integration failed or returned null for ${targetLang}`);
              }
            } catch (error) {
              console.warn(`[GrokGeminiOptimizer] Error integrating optimization for ${targetLang}:`, error.message);
              langIntegratedOptimization = null;
            }
          }

          // Phase 2: A/Bテストバリアント識別（50/50分割）
          const AB_VARIANTS = ["A", "B"];
          const variant = Math.random() < 0.5 ? "A" : "B";
          const messageId = `msg_${Date.now()}_${targetLang}_${variant}`;

          // ===== 定期配信: サービス未利用ユーザーの悲惨な状況を報道 =====
          // 各言語ごとにGPTで報道コンテンツを生成
          let langNonUserImpactReport = null;

          try {
            if (missedOpportunities && missedOpportunities.totalSignals > 0) {
              // GPTで報道コンテンツを生成（各言語ごとに異なる内容）
              const impactMarketData = {
                priceUsd,
                change24h,
                score: coreDecision.score,
                signal: tradeSignal.signal,
                sentiment: sentimentLabel
              };

              console.log(`[GPT] Generating non-user impact report for ${targetLang}...`);
              langNonUserImpactReport = await generateNonUserImpactReport(
                impactMarketData,
                missedOpportunities,
                targetLang
              );
              console.log(
                `[GPT] Impact report generated for ${targetLang}:`,
                langNonUserImpactReport.substring(0, 200) + "..."
              );
            }
          } catch (error) {
            console.warn(
              `[MissedOpportunities] Error generating impact report for ${targetLang}:`,
              error.message
            );
            // エラー時は続行（必須ではない）
          }

          // Phase 3: スナップショットをテンプレートに渡す（全言語で統一データ）
          // GPT解析結果（gptRegularAnalysis）を優先的に使用
          const finalAnalysis = gptRegularAnalysis || aiAnalysis;

          // 高解像度データとダイバージェンスシグナルを取得
          // baseCoreDecisionからダイバージェンスシグナルを取得（高解像度データが使用されている場合）
          // 注意: divergenceSignalResultは関数スコープの最初で定義済み（700行目付近）
          let finalHighResCQ = highResCQData;
          let finalHighResX = highResXData;
          // divergenceSignalResultは既に定義済みのため、値がnullの場合は更新を試みる
          if (!divergenceSignalResult) {
            try {
              divergenceSignalResult =
                baseCoreDecision?.divergenceSignal || coreDecision?.divergenceSignal || null;
            } catch (error) {
              console.warn(
                "[Dr. Grok] Error getting divergence signal (regular slot):",
                error.message
              );
              divergenceSignalResult = null;
            }
          }

          // 言語別のmissedOpportunitiesフォーマット
          const langMissedOpportunitiesFormatted = missedOpportunities
            ? formatMissedOpportunities(missedOpportunities, targetLang)
            : null;

          let regularText = langFormatRegularBriefing({
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
            lang: targetLang,
            // Phase 2: A/Bテスト識別子
            variant,
            messageId,
            // Phase 2: 市場別データ（後方互換性のため残す）
            trapScore: cqDeep?.trapScore,
            whaleFlows: cqDeep?.whaleFlows,
            liquidations: cqDeep?.liquidations,
            kimchiPremium: cqDeep?.kimchiPremium,
            upbitPrice: cqDeep?.upbitPrice ?? snapshot.price_usd_display,
            riskReward: cqDeep?.riskReward,
            nupl: cqDeep?.longTerm?.nupl,
            sopr30d: cqDeep?.longTerm?.sopr30d,
            // Phase1-Product: 新機能データ
            noTradeAlert: null, // 将来の実装用
            trapRisk: null, // 将来の実装用
            exitMap: null, // 将来の実装用
            // 新規: サービス未利用ユーザーの悲惨な状況
            nonUserImpactReport: langNonUserImpactReport,
            missedOpportunities: langMissedOpportunitiesFormatted,
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
            // USP3: Dr. Grokの心理的サポート（言語ごとに計算）
            psychologicalSupport: langPsychologicalSupport || null, // P0 FIX: 言語ごとのpsychologicalSupportを使用
            // GrokとGeminiの統合最適化結果（言語ごとに計算）
            integratedOptimization: langIntegratedOptimization || null, // P0 FIX: 言語ごとのintegratedOptimizationを使用
            showContent: null // 後でproduceShowの結果で更新される
          });

          // 保存されたサマリーがあれば使用（より詳細な分析）
          // 注: savedContentは既にループの外で取得済み

          // ===== Gemini番組プロデューサー: ストーリーブランド戦略2.0 =====
          let showContent = undefined; // produceShowが実行されたかどうかを判断するため、undefinedで初期化
          try {
            console.log(
              `[Gemini Show Producer] Producing show with StoryBrand 2.0 framework for ${targetLang}...`
            );
            showContent = await produceShow({
              marketData: {
                price_usd_display: snapshot.price_usd_display,
                change_24h: snapshot.change_24h,
                market_score: snapshot.market_score,
                sentiment_label: snapshot.sentiment_label,
                inflow: snapshot.inflow,
                mpi: snapshot.mpi
              },
              cryptoQuantData: cqDeep,
              trapDetection: trapDetection,
              psychologicalSupport: langPsychologicalSupport || null, // P0 FIX: 言語ごとのpsychologicalSupportを使用
              gptMentalTrainerAnalysis: gptRegularAnalysis,
              lang: targetLang
            });

            if (showContent) {
              console.log(
                `[Gemini Show Producer] Show produced successfully for ${targetLang} (text-only version)`
              );
              // 削除: 画像・動画生成は不要（簡素化版）
              // 番組プロデューサーはテキストベースのみ
            } else {
              console.log(`[Gemini Show Producer] Show production returned null for ${targetLang}`);
            }
          } catch (error) {
            console.warn(
              `[Gemini Show Producer] Error producing show for ${targetLang}:`,
              error.message
            );
            console.warn(`[Gemini Show Producer] Error stack:`, error.stack);
            showContent = null; // エラー時もnullを明示的に設定
          }

          // showContent（テキストベース）がある場合にメッセージを再生成
          // 注意: showContentがnullでも、メッセージを再生成してshowContent: nullを明示的に渡す
          if (showContent || true) {
            // 常に再生成してshowContentを反映
            // メッセージを再生成（USP2の表示を更新）
            const regularTextUpdated = langFormatRegularBriefing({
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
              lang: targetLang,
              variant,
              messageId,
              trapScore: cqDeep?.trapScore,
              whaleFlows: cqDeep?.whaleFlows,
              liquidations: cqDeep?.liquidations,
              kimchiPremium: cqDeep?.kimchiPremium,
              upbitPrice: cqDeep?.upbitPrice ?? snapshot.price_usd_display,
              riskReward: cqDeep?.riskReward,
              nupl: cqDeep?.longTerm?.nupl,
              sopr30d: cqDeep?.longTerm?.sopr30d,
              noTradeAlert: null,
              trapRisk: null,
              exitMap: null,
              nonUserImpactReport: langNonUserImpactReport,
              missedOpportunities: langMissedOpportunitiesFormatted,
              // ニュース番組構造用: GPTリポーターとGrok X解析を分離
              gptReporterAnalysis: gptRegularAnalysis || null, // GPTリポーターのトラップニュース分析（CryptoQuantデータ解析）
              grokXAnalysis: grokXAnalysis || null, // Grok X解析結果（Xセンチメント分析）
              // Grok Xアルゴリズム解析 × Gemini深層心理分析統合最適化結果
              integratedOptimization: integratedOptimization || null,
              highResCQ: finalHighResCQ,
              highResX: finalHighResX,
              divergenceSignal: divergenceSignalResult,
              trapDetection: trapDetection || null,
              marketBug: marketBugDetection || null, // 後方互換性
              trapAlert: trapAlert || null,
              psychologicalSupport: psychologicalSupport || null,
              showContent: showContent || null // テキストベースのGeminiコンテンツ
            });
            regularText = regularTextUpdated;
          }

          // Phase 4: メッセージ送信とログ記録
          // メール送信は廃止（Telegramのみ配信）
          // メール送信コードは削除されました - Telegram配信のみ

          // Telegram送信（オプション、環境変数で有効化）
          if (ENABLE_TELEGRAM) {
            // 市場コードとシリーズを取得して適切なチャンネルに送信
            const marketCode = getMarketCode(targetLang); // 'EN', 'AR', 'KO', etc.
            const series = "BTC"; // 現在はBTCのみ、将来的に'OTHER'なども対応可能

            // 複数チャンネル対応: sendMessageToChannelを使用
            let regularSendResult;
            // 環境変数名はハイフンをアンダースコアに変換（PT-BR → PT_BR）
            const marketCodeEnv = marketCode.replace("-", "_");
            const channelIdEnvVar = `TELEGRAM_CHAT_ID_${series}_${marketCodeEnv}`;
            if (process.env[channelIdEnvVar]) {
              // 新しい方式: シリーズ+市場コードでチャンネル指定
              // 言語別のボタンテキストを使用
              const socialProofButton = getSocialProofButton(targetLang);
              regularSendResult = await sendMessageToChannel(regularText, series, marketCode, {
                reply_markup: socialProofButton
              });
              console.log(
                `[Telegram] REGULAR message sent to ${series}/${marketCode} (${targetLang})`
              );
            } else if (process.env.TELEGRAM_CHAT_ID) {
              // 後方互換性: 既存のTELEGRAM_CHAT_IDを使用
              // 言語別のボタンテキストを使用
              const socialProofButton = getSocialProofButton(targetLang);
              regularSendResult = await sendMessage(regularText, {
                reply_markup: socialProofButton
              });
              console.log(`[Telegram] REGULAR message sent to default channel (${targetLang})`);
            } else {
              console.error(
                `[Telegram] ❌ CRITICAL: No channel ID configured for ${series}/${marketCode} (env: ${channelIdEnvVar}) or TELEGRAM_CHAT_ID. Language: ${targetLang} will NOT be delivered.`
              );
              // エラーを記録して続行（他の言語の配信を継続）
            }
            const telegramMessageId =
              regularSendResult?.message_id || regularSendResult?.raw?.result?.message_id;

            messageLogger.logMessage({
              message_id: messageId,
              snapshot_id: snapshot.snapshot_id,
              lang: targetLang,
              variant,
              message_type: "REGULAR",
              sent_at: new Date().toISOString(),
              telegram_message_id: telegramMessageId,
              cta_links: extractCtaLinks(regularText)
            });
          }

          // X Proof Post（英語版のみ）
          if (ENABLE_X_PROOF_POST && targetLang === "en") {
            try {
              const proofTrapScore = cqDeep?.trapScore ?? trapDetection?.trapScore ?? null;
              const socialProofText = await getSocialProofText(); // 非同期関数に変更
              await postProofToX(regularText, {
                trapScore: proofTrapScore,
                trapDetection,
                trapAlert,
                lang: targetLang,
                socialProofText,
                useCartoon: X_PROOF_USE_CARTOON // 風刺画を追加（環境変数で制御）
              });
            } catch (error) {
              console.error("[X Proof Post] Failed to post proof:", error.message);
            }
          }

          sent += 1;
          console.log(`[REGULAR] ✅ Successfully sent to ${targetLang}`);
        } catch (langError) {
          console.error(`[REGULAR] ❌ Error processing language ${targetLang}:`, langError.message);
          console.error(`[REGULAR] ❌ Stack trace for ${targetLang}:`, langError.stack);
          // エラーが発生しても他の言語の配信を続行
        }
      }
    }

    // 7-A-MINIMAL. 無料版リードマグネット配信（Trap Score + 簡易分析 + Dr. Grokコメント）
    // 環境変数が設定されている場合のみ実行
    // 注意: TELEGRAM_BOT_TOKEN_MINIMALがなくても、TELEGRAM_BOT_TOKENとTELEGRAM_CHAT_ID_MINIMALがあれば動作
    // 無料版は有料版と同じスケジュールで配信（isRegularSlotがtrueの場合のみ、またはforce=trueの場合）
    // 注意: UTC 21時（JST 6時）は定期配信スロットではないため、無料版も配信されない
    // ただし、force=trueの場合は強制配信
    // 6言語すべてに配信（デフォルト: MINIMAL_MULTI_LANG=true）
    // 無料版チャンネルIDの解決関数（vsl2-post.jsと同様のロジック）
    function resolveMinimalChatId(lang) {
      const normalizedLangCode = lang.toUpperCase().replace("-", "_");
      const variants = [normalizedLangCode];
      if (normalizedLangCode === "PT_BR") variants.push("PTBR");
      if (normalizedLangCode === "JA") variants.push("JP");
      if (normalizedLangCode === "KO") variants.push("KR");

      // 1. 言語別チャンネルIDを優先
      for (const variant of variants) {
        const envVarName = `TELEGRAM_CHAT_ID_MINIMAL_${variant}`;
        const resolvedChatId = process.env[envVarName];
        if (resolvedChatId) return resolvedChatId;
      }

      // 2. ENチャンネルにフォールバック
      const enChatId = process.env.TELEGRAM_CHAT_ID_MINIMAL_EN;
      if (enChatId) return enChatId;

      // 3. デフォルトチャンネルにフォールバック
      return process.env.TELEGRAM_CHAT_ID_MINIMAL || null;
    }

    const hasMinimalBotToken = !!(
      process.env.TELEGRAM_BOT_TOKEN_MINIMAL || process.env.TELEGRAM_BOT_TOKEN
    );
    // 配信対象言語のいずれかにチャンネルIDがあれば有効化
    const targetLangsForMinimal = getTargetLanguagesForMinimal();
    const hasAnyMinimalChatId = targetLangsForMinimal.some(
      (lang) => resolveMinimalChatId(lang) !== null
    );
    const ENABLE_MINIMAL_VERSION = hasMinimalBotToken && hasAnyMinimalChatId;

    // 7-A-MINIMAL. 無料版（Minimal Version）配信
    // P0 FIX: 無料版も定期枠（isRegularSlot）は必ず送るように修正（有料版と統一）
    // 早期return条件を修正したため、isRegularSlotがtrueの場合は必ず到達する
    // 定期配信（isRegularSlot）と強制配信（force）は必ず送信
    // イベント駆動の判定（shouldSend）は定期枠以外の場合のみ適用
    // 重要: isRegularSlotがtrueの場合は、イベント駆動の判定に関係なく必ず配信
    if (ENABLE_MINIMAL_VERSION && (isRegularSlot || force || (ENABLE_EVENT_DRIVEN && shouldSend && !isRegularSlot))) {
      console.log("[MINIMAL] ✅✅✅ DELIVERY START: Sending free briefing (Minimal Version) to all languages...");
      console.log(
        "[MINIMAL] Conditions:",
        {
          isRegularSlot,
          force,
          ENABLE_EVENT_DRIVEN,
          shouldSend,
          ENABLE_MINIMAL_VERSION
        }
      );

      // 配信対象言語を取得（デフォルト: 6言語すべて）
      const targetLangsForMinimal = getTargetLanguagesForMinimal();
      console.log(`[MINIMAL] Target languages: ${targetLangsForMinimal.join(", ")}`);
      
      // P0 FIX: チャンネルIDの設定状況を確認してログに出力
      const missingMinimalChannelIds = [];
      for (const lang of targetLangsForMinimal) {
        const minimalChatId = resolveMinimalChatId(lang);
        if (!minimalChatId) {
          missingMinimalChannelIds.push(`${lang} (TELEGRAM_CHAT_ID_MINIMAL_${lang.toUpperCase().replace("-", "_")} or TELEGRAM_CHAT_ID_MINIMAL_EN or TELEGRAM_CHAT_ID_MINIMAL)`);
        }
      }
      if (missingMinimalChannelIds.length > 0) {
        console.warn(`[MINIMAL] ⚠️ Missing channel IDs for languages: ${missingMinimalChannelIds.join(", ")}`);
      } else {
        console.log(`[MINIMAL] ✅ All channel IDs configured for target languages`);
      }

      // Trap Scoreを取得（複数のソースから優先順位で取得）
      let minimalTrapScore = null;
      if (trapDetection && trapDetection.trapScore != null) {
        minimalTrapScore = trapDetection.trapScore;
      } else if (cqDeep && cqDeep.trapScore != null) {
        minimalTrapScore = cqDeep.trapScore;
      } else if (trap && trap.isTrap) {
        // フォールバック: trapオブジェクトから推定
        minimalTrapScore = trap.confidence === "HIGH" ? 80 : trap.confidence === "MEDIUM" ? 50 : 30;
      } else if (trap && !trap.isTrap) {
        // トラップが検出されていない場合、低リスクスコアを設定
        minimalTrapScore = 15; // 低リスクのデフォルト値
      }

      // Whale Ratioを取得（複数のソースから優先順位で取得）
      let whaleRatioValue = null;
      if (cqDeep?.whaleFlows?.whaleRatio != null) {
        whaleRatioValue = cqDeep.whaleFlows.whaleRatio;
      } else if (highResCQData?.whaleRatio != null) {
        whaleRatioValue = highResCQData.whaleRatio;
      } else if (cqDeep?.whaleRatio != null) {
        whaleRatioValue = cqDeep.whaleRatio;
      }

      // Trap Dataを準備（minimal-high-quality版用）
      const trapData = {
        trapAlert: trapAlert || null,
        exchangeNetflow: inflow,
        whaleRatio: whaleRatioValue
      };

      // Market Dataを準備
      const minimalMarketData = {
        mpi: mpi,
        priceUsd: priceUsd,
        change24h: change24h,
        score: snapshot.market_score // Market Scoreを追加（状況に応じたメッセージ生成のため）
      };

      // Sentiment Dataを準備（Grok X解析結果から）
      const sentimentData = grokXAnalysis
        ? {
            sentiment: grokXAnalysis.sentiment || sentimentLabel,
            risk: grokXAnalysis.risk || null
          }
        : {
            sentiment: sentimentLabel
          };

      // 各言語ごとに配信
      for (const targetLang of targetLangsForMinimal) {
        try {
          console.log(`[MINIMAL] Processing language: ${targetLang}`);

          // Grok Xアルゴリズム解析 × Gemini深層心理分析統合最適化（無料版）
          let grokGeminiOptimizationMinimal = null;
          try {
            console.log(
              `[Grok+Gemini Optimizer] Starting optimization for MINIMAL version (lang: ${targetLang})...`
            );
            grokGeminiOptimizationMinimal = await integrateGrokGeminiOptimization({
              marketData: {
                priceUsd,
                change24h,
                score: snapshot.market_score,
                signal: "NONE", // MINIMALバージョンではシグナルなし
                sentiment: sentimentLabel
              },
              trapScore: minimalTrapScore,
              sentimentData,
              xSentiment: grokXAnalysis,
              trapDetection: null, // MINIMALバージョンではトラップ検出なし
              psychologicalSupport: null, // MINIMALバージョンでは心理的サポートなし
              lang: targetLang
            });

            if (grokGeminiOptimizationMinimal) {
              console.log(
                `[Grok+Gemini Optimizer] Optimization completed for MINIMAL version (lang: ${targetLang})`
              );
            } else {
              console.log(`[Grok+Gemini Optimizer] Optimization returned null for ${targetLang}`);
            }
          } catch (error) {
            console.warn(
              `[Grok+Gemini Optimizer] Error optimizing MINIMAL for ${targetLang}:`,
              error.message
            );
            grokGeminiOptimizationMinimal = null; // エラー時もnullを明示的に設定
          }

          // 言語別テンプレートを読み込む
          const langTemplates = loadUserTemplates(targetLang);
          const langFormatMinimalBriefing = langTemplates.formatMinimalBriefing;
          if (!langFormatMinimalBriefing) {
            console.warn(`[MINIMAL] Template not found for ${targetLang}, skipping`);
            continue;
          }

          // minimal-high-quality版が読み込まれていることを確認
          if (typeof langFormatMinimalBriefing !== "function") {
            console.error(
              `[MINIMAL] formatMinimalBriefing is not a function for ${targetLang}, skipping`
            );
            continue;
          }

          // 無料版メッセージを生成（minimal-high-quality版を使用）
          // 注意: minimal-high-quality版は4-post thread形式で、trapData, marketData, sentimentData, score, grokGeminiOptimizationパラメータを必要とします
          const minimalText = langFormatMinimalBriefing({
            now,
            trapScore: minimalTrapScore,
            priceUsd,
            change24h,
            trapData,
            marketData: minimalMarketData,
            sentimentData,
            lang: targetLang,
            score: snapshot.market_score, // Market Scoreを追加（状況に応じたメッセージ生成のため）
            // Grok Xアルゴリズム解析 × Gemini深層心理分析統合最適化結果
            grokGeminiOptimization: grokGeminiOptimizationMinimal || null
          });

          // 生成されたメッセージが4-post thread形式（[1/4], [2/4], [3/4], [4/4]を含む）であることを確認
          if (minimalText && typeof minimalText === "string") {
            const isHighQualityFormat = /\[1\/4\]|\[2\/4\]|\[3\/4\]|\[4\/4\]/.test(minimalText);
            if (!isHighQualityFormat) {
              console.warn(
                `[MINIMAL] Generated message for ${targetLang} does not appear to be in high-quality format (4-post thread). Message preview: ${minimalText.substring(0, 100)}...`
              );
            } else {
              console.log(
                `[MINIMAL] Successfully generated high-quality format message for ${targetLang}`
              );
            }
          }

          // 無料版チャンネルに送信
          if (ENABLE_TELEGRAM) {
            // 言語コードを環境変数形式に変換（en -> EN, pt-br -> PT_BR）
            const langCodeForEnv = targetLang.toUpperCase().replace("-", "_");

            // 無料版チャンネルIDを解決
            const minimalChatId = resolveMinimalChatId(targetLang);

            if (minimalChatId) {
              // 言語別のボタンテキストを使用
              const socialProofButton = getSocialProofButton(targetLang);
              const minimalSendResult = await sendMessageToAsset(
                minimalText,
                "MINIMAL",
                langCodeForEnv,
                { reply_markup: socialProofButton }
              );
              console.log(
                `[Free Version] Sent successfully to ${targetLang} (${langCodeForEnv}):`,
                minimalSendResult?.message_id || "N/A"
              );
            } else {
              console.error(
                `[Free Version] ❌ CRITICAL: No chat ID found for ${targetLang}, skipping free version delivery. Check TELEGRAM_CHAT_ID_MINIMAL_${targetLang.toUpperCase().replace("-", "_")} or TELEGRAM_CHAT_ID_MINIMAL_EN or TELEGRAM_CHAT_ID_MINIMAL`
              );
              // エラーを記録して続行（他の言語の配信を継続）
            }
          }

          console.log(`[MINIMAL] ✅ Successfully sent to ${targetLang}`);
        } catch (langError) {
          console.error(`[MINIMAL] ❌ Error processing language ${targetLang}:`, langError.message);
          console.error(`[MINIMAL] ❌ Stack trace for ${targetLang}:`, langError.stack);
          // エラーが発生しても他の言語の配信を続行
        }
      }

      // 無料版X投稿: Vercel Cron で /api/x-post-minimal-version が直接呼ばれる（vercel.json）。二重実行防止のためここでは force 時のみ実行。
      if (ENABLE_MINIMAL_VERSION && shouldSend && force) {
        try {
          const xPostMinimalModule = require("./x-post-minimal-version");
          const postMinimalVersionToX =
            xPostMinimalModule.postMinimalVersionToX || xPostMinimalModule;

          if (typeof postMinimalVersionToX === "function") {
            const reportData = {
              trapScore: minimalTrapScore,
              priceUsd,
              change24h,
              trapData: {
                trapAlert: trapAlert || null,
                exchangeNetflow: inflow,
                whaleRatio: whaleRatioValue
              },
              marketData: minimalMarketData,
              sentimentData
            };

            postMinimalVersionToX(targetLangsForMinimal, reportData).catch((error) => {
              console.warn("[MINIMAL] Failed to post minimal version to X:", error.message);
            });
          } else {
            console.warn(
              "[MINIMAL] postMinimalVersionToX function not found in x-post-minimal-version module"
            );
          }
        } catch (error) {
          console.warn("[MINIMAL] Failed to import x-post-minimal-version:", error.message);
        }
      }

      // 無料版レポートX投稿: Vercel Cron で /api/x-post-free-report が直接呼ばれる（vercel.json）。ここでは force 時のみ実行。
      if (ENABLE_MINIMAL_VERSION && shouldSend && force) {
        try {
          const { postFreeReportToX } = require("./x-post-free-report");
          const reportData = {
            trapScore: minimalTrapScore,
            priceUsd,
            change24h,
            exchangeNetflow: inflow,
            whaleRatio: whaleRatioValue
          };

          // 非同期で実行（エラーは無視）
          postFreeReportToX(reportData).catch((error) => {
            console.error("[X Post Free Report] Failed:", error.message);
          });

          console.log("[X Post Free Report] Triggered after free report delivery (force mode)");
        } catch (error) {
          console.error("[X Post Free Report] Failed to trigger:", error.message);
        }
    }

    // 7-B. EMERGENCY (Trap) - 15分ごとの緊急配信
    if (finalNeedsEmergency || (ENABLE_EVENT_DRIVEN && triggerType === "EMERGENCY")) {
      // Phase 2: A/Bテストバリアント識別
      const AB_VARIANTS = ["A", "B"];
      const variant = Math.random() < 0.5 ? "A" : "B";
      const messageId = `msg_${Date.now()}_${LANG}_${variant}_EMERGENCY`;

      // GPT解析結果を緊急配信に反映
      const emergencyAnalysis = gptCryptoQuantAnalysis || aiAnalysis;

      const alertText = formatTrapAlert({
        inflow,
        mpi,
        priceUsd,
        trap,
        aiAnalysis: emergencyAnalysis // GPT解析結果を優先
      });

      // メール送信（緊急配信）
      try {
        // 緊急配信用のメールHTMLを生成（簡易版、formatRegularBriefingHTMLをベースに）
        const emergencyEmailHTML = formatRegularBriefingHTML({
          now,
          inflow,
          mpi,
          sentimentLabel: snapshot?.sentiment_label || "Unknown",
          priceUsd,
          change24h: snapshot?.change_24h || 0,
          score: snapshot?.market_score || 0,
          tradeSignal: { signal: "STANDBY", confidence: 0 },
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
          gptReporterAnalysis: null,
          grokXAnalysis: null,
          cqDeep: cqDeep,
          showContent: null // 緊急配信ではshowContentは使用しない
        });

        const emergencySubject = `🚨 URGENT: Trap Alert - ${now
          .toISOString()
          .replace("T", " ")
          .replace(/\.\d+Z$/, " UTC")}`;
        const recipientEmails = getRecipientEmails(LANG);

        if (recipientEmails && recipientEmails.length > 0) {
          console.log(
            `[Email] Sending emergency alert to ${recipientEmails.length} recipients (${LANG})...`
          );

          const emailResult = await sendBatchEmails({
            recipients: recipientEmails,
            subject: emergencySubject,
            html: emergencyEmailHTML,
            emailOptions: {
              lang: LANG,
              messageType: "EMERGENCY"
            }
          });

          console.log(
            `[Email] Emergency alert sent: ${emailResult.totalSent}, Errors: ${emailResult.totalErrors}`
          );

          messageLogger.logMessage({
            message_id: messageId,
            snapshot_id: snapshot?.snapshot_id,
            lang: LANG,
            variant,
            message_type: "EMERGENCY",
            sent_at: new Date().toISOString(),
            email_sent: emailResult.totalSent,
            email_errors: emailResult.totalErrors,
            cta_links: extractCtaLinks(emergencyEmailHTML)
          });
        } else {
          console.warn(`[Email] No recipients found for emergency alert (lang=${LANG})`);
        }
      } catch (emailError) {
        console.error("[Email] Error sending emergency alert:", emailError);
        messageLogger.logMessage({
          message_id: messageId,
          snapshot_id: snapshot?.snapshot_id,
          lang: LANG,
          variant,
          message_type: "EMERGENCY",
          sent_at: new Date().toISOString(),
          email_error: emailError.message
        });
      }

      // Telegram送信（オプション）
      if (ENABLE_TELEGRAM) {
        const emergencySendResult = await sendMessage(alertText);
        const telegramMessageId =
          emergencySendResult?.message_id || emergencySendResult?.raw?.result?.message_id;

        messageLogger.logMessage({
          message_id: messageId,
          snapshot_id: snapshot?.snapshot_id,
          lang: LANG,
          variant,
          message_type: "EMERGENCY",
          sent_at: new Date().toISOString(),
          telegram_message_id: telegramMessageId,
          cta_links: extractCtaLinks(alertText)
        });
      }

      sent += 1;
    }

    // 7-C. WATCH (short heads-up, no long report)
    // 7-D. STANDBY_BREAK (Phase 1新規)
    if (ENABLE_EVENT_DRIVEN && triggerType === "STANDBY_BREAK") {
      console.log("Sending STANDBY_BREAK message...");
      // Phase 2: A/Bテストバリアント識別
      const AB_VARIANTS = ["A", "B"];
      const variant = Math.random() < 0.5 ? "A" : "B";
      const messageId = `msg_${Date.now()}_${LANG}_${variant}_STANDBY_BREAK`;

      // ===== USP3: Dr. Grokの心理的サポート =====
      let psychologicalSupportSTANDBY = null;
      try {
        console.log("[Dr. Grok] Diagnosing user sentiment for STANDBY_BREAK...");
        psychologicalSupportSTANDBY = await diagnoseUserSentimentCompat(
          {
            price_usd_display: priceUsd,
            change_24h: change24h,
            market_score: coreDecision.score,
            trapDetection: null, // STANDBY_BREAKではトラップ防御は不要
            marketBug: null, // 後方互換性
            trapAlert: null,
            divergenceSignal: null
          },
          xSentiment,
          LANG
        );
      } catch (error) {
        console.warn(
          "[Dr. Grok] Error providing psychological support for STANDBY_BREAK:",
          error.message
        );
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
        riskReward: cqDeep?.riskReward,
        nupl: cqDeep?.longTerm?.nupl,
        sopr30d: cqDeep?.longTerm?.sopr30d,
        // USP1: トラップ防御結果
        trapDetection: null, // STANDBY_BREAKではトラップ防御は不要
        marketBug: null, // 後方互換性
        trapAlert: null,
        divergenceSignal: null,
        // USP3: Dr. Grokの心理的サポート
        psychologicalSupport: psychologicalSupportSTANDBY || null
      });

      // Phase 2: メッセージ送信とログ記録
      const standbySendResult = await sendMessage(standbyBreakText);
      const telegramMessageId =
        standbySendResult?.message_id || standbySendResult?.raw?.result?.message_id;

      messageLogger.logMessage({
        message_id: messageId,
        snapshot_id: snapshot?.snapshot_id,
        lang: LANG,
        variant,
        message_type: "STANDBY_BREAK",
        sent_at: new Date().toISOString(),
        telegram_message_id: telegramMessageId,
        cta_links: extractCtaLinks(standbyBreakText)
      });

      sent += 1;
    } else if (ENABLE_EVENT_DRIVEN && triggerType === "WATCH") {
      // Event-driven WATCH message (多言語対応 + Phase 2データ)
      console.log("Sending WATCH message (event-driven)...");
      // Phase 2: A/Bテストバリアント識別
      const AB_VARIANTS = ["A", "B"];
      const variant = Math.random() < 0.5 ? "A" : "B";
      const messageId = `msg_${Date.now()}_${LANG}_${variant}_WATCH`;

      // ===== USP3: Dr. Grokの心理的サポート =====
      let psychologicalSupportWATCH = null;
      try {
        console.log("[Dr. Grok] Diagnosing user sentiment for WATCH...");
        psychologicalSupportWATCH = await diagnoseUserSentimentCompat(
          {
            price_usd_display: priceUsd,
            change_24h: change24h,
            market_score: coreDecision.score,
            trapDetection: null, // WATCHではトラップ防御は不要
            marketBug: null, // 後方互換性
            trapAlert: null,
            divergenceSignal: null
          },
          xSentiment,
          LANG
        );
      } catch (error) {
        console.warn("[Dr. Grok] Error providing psychological support for WATCH:", error.message);
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
        riskReward: cqDeep?.riskReward,
        nupl: cqDeep?.longTerm?.nupl,
        sopr30d: cqDeep?.longTerm?.sopr30d,
        // USP1: トラップ防御結果
        trapDetection: null, // WATCHではトラップ防御は不要
        marketBug: null, // 後方互換性
        trapAlert: null,
        divergenceSignal: null,
        // USP3: Dr. Grokの心理的サポート
        psychologicalSupport: psychologicalSupportWATCH || null
      });

      // Phase 2: メッセージ送信とログ記録
      const watchSendResult = await sendMessage(watchText);
      const telegramMessageId =
        watchSendResult?.message_id || watchSendResult?.raw?.result?.message_id;

      messageLogger.logMessage({
        message_id: messageId,
        snapshot_id: snapshot?.snapshot_id,
        lang: LANG,
        variant,
        message_type: "WATCH",
        sent_at: new Date().toISOString(),
        telegram_message_id: telegramMessageId,
        cta_links: extractCtaLinks(watchText)
      });

      sent += 1;
    } else if (
      !ENABLE_EVENT_DRIVEN &&
      needsWatch &&
      !finalNeedsEmergency &&
      !isRegularSlot &&
      !force
    ) {
      // Legacy WATCH logic (only when event-driven is disabled)
      console.log("Sending WATCH message (legacy)...");
      // Phase 2: A/Bテストバリアント識別
      const AB_VARIANTS = ["A", "B"];
      const variant = Math.random() < 0.5 ? "A" : "B";
      const messageId = `msg_${Date.now()}_${LANG}_${variant}_WATCH_LEGACY`;

      // ===== USP3: Dr. Grokの心理的サポート =====
      let psychologicalSupportWATCHLegacy = null;
      try {
        console.log("[Dr. Grok] Diagnosing user sentiment for WATCH (legacy)...");
        psychologicalSupportWATCHLegacy = await diagnoseUserSentimentCompat(
          {
            price_usd_display: priceUsd,
            change_24h: change24h,
            market_score: coreDecision.score,
            trapDetection: null, // WATCHではトラップ防御は不要
            marketBug: null, // 後方互換性
            trapAlert: null,
            divergenceSignal: null
          },
          xSentiment,
          LANG
        );
      } catch (error) {
        console.warn(
          "[Dr. Grok] Error providing psychological support for WATCH (legacy):",
          error.message
        );
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
        riskReward: cqDeep?.riskReward,
        nupl: cqDeep?.longTerm?.nupl,
        sopr30d: cqDeep?.longTerm?.sopr30d,
        // USP1: トラップ防御結果
        trapDetection: null, // WATCHではトラップ防御は不要
        marketBug: null, // 後方互換性
        trapAlert: null,
        divergenceSignal: null,
        // USP3: Dr. Grokの心理的サポート
        psychologicalSupport: psychologicalSupportWATCHLegacy || null
      });

      // Phase 2: メッセージ送信とログ記録
      const watchLegacySendResult = await sendMessage(watchText);
      const telegramMessageId =
        watchLegacySendResult?.message_id || watchLegacySendResult?.raw?.result?.message_id;

      messageLogger.logMessage({
        message_id: messageId,
        snapshot_id: snapshot?.snapshot_id,
        lang: LANG,
        variant,
        message_type: "WATCH",
        sent_at: new Date().toISOString(),
        telegram_message_id: telegramMessageId,
        cta_links: extractCtaLinks(watchText)
      });

      sent += 1;
    }

    return res.status(200).json({
      success: true,
      sentMessages: sent,
      slot: { isRegularSlot, force },
      flags: { needsWatch, needsXIntel, needsLongReport, finalNeedsEmergency },
      eventDriven: ENABLE_EVENT_DRIVEN
        ? {
            enabled: true,
            trigger: { type: triggerType, reason: triggerReason, shouldSend }
          }
        : { enabled: false },
      metrics: {
        inflow,
        mpi,
        sentiment: sentimentLabel,
        priceUsd,
        change24h,
        score: coreDecision.score,
        regime: coreDecision.regime,
        confidence: coreDecision.confidence,
        signal: tradeSignal.signal
      },
      trap,
      side,
      entry,
      tp,
      sl,
      xSentiment,
      xIntel
    });
  } catch (error) {
    console.error("❌ Cron Job Failed:", error);
    console.error("❌ Error Stack:", error.stack);
    console.error("❌ Error Details:", {
      message: error.message,
      name: error.name,
      code: error.code,
      cause: error.cause
    });
    return res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
};
