// api/cron.js
// Trap Defence コア: Regular TG 定期配信（1日4回）。Vercel Cron は 0 0,6,12,18 * * *（UTC）。
// CQ は kiba-5min が 5 分ごとに cq:latest に書くものを参照（Regular / Minimal / KIBA 共通の 5 分データ）。緊急アラート廃止のため 15 分起動は廃止。
require("../utils/suppressKnownWarnings");

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

function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 6言語同時実行による 429 を避けるための言語間スリープ（ms）
const REGULAR_LANG_SPACING_MS = Math.max(0, Number(process.env.REGULAR_LANG_SPACING_MS || 900));

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
    // Emergency 配信廃止のため emergency テンプレートは読み込まない
    // 無料版テンプレート（Zeigarnik Edition v1.5 のみ。4-post は廃止）
    let formatMinimalBriefing = null;
    try {
      const mod = require(
        `../services/telegram/messages/user/${lang}/minimal-high-quality.${lang}`
      );
      const fn = mod.formatMinimalBriefingOSv26 || mod.formatMinimalBriefing;
      if (fn && typeof fn === "function") {
        formatMinimalBriefing = fn;
        console.log(`[TEMPLATE] Loaded minimal Zeigarnik template for ${lang}`);
      } else {
        throw new Error(`formatMinimalBriefingOSv26 is not a function for ${lang}`);
      }
    } catch (e) {
      console.warn(
        `[TEMPLATE] Failed to load minimal template for ${lang}: ${e.message}, using EN fallback`
      );
      try {
        const en = require("../services/telegram/messages/user/en/minimal-high-quality.en");
        const fn = en.formatMinimalBriefingOSv26 || en.formatMinimalBriefing;
        if (fn && typeof fn === "function") {
          formatMinimalBriefing = fn;
        }
      } catch (e2) {
        console.warn(`[TEMPLATE] Minimal EN fallback failed: ${e2.message}`);
      }
    }
    return { formatRegularBriefing, formatMinimalBriefing };
  } catch (e) {
    console.warn(`Fallback to EN templates. lang=${lang} error=${e.message}`);
    const { formatRegularBriefing } = require("../services/telegram/messages/user/en/regular.en");
    // 無料版テンプレート（EN Zeigarnik Edition）
    let formatMinimalBriefing = null;
    try {
      const en = require("../services/telegram/messages/user/en/minimal-high-quality.en");
      const fn = en.formatMinimalBriefingOSv26 || en.formatMinimalBriefing;
      if (fn && typeof fn === "function") {
        formatMinimalBriefing = fn;
        console.log("[TEMPLATE] Loaded minimal Zeigarnik template for EN fallback");
      }
    } catch (e2) {
      console.warn(`[TEMPLATE] Minimal EN fallback failed: ${e2.message}`);
    }
    return { formatRegularBriefing, formatMinimalBriefing };
  }
}

const { formatRegularBriefing, formatMinimalBriefing } = loadUserTemplates(LANG);

const {
  getExchangeInflow,
  getMinerPositionIndex
} = require("../services/cryptoquant/endpoints/btc");
// Phase 2: 市場別深掘りデータ
const { getCQDeepMetrics } = require("../services/cryptoquant/deepMetrics");
const { getCqLatest, cqLatestToCqDeep } = require("../services/snapshot/cqLatestWriter");
const { writeEarlySnapshot, writeFullSnapshot, persistSnapshotToDb } = require("../services/snapshot/btcSnapshotWriter");
const { buildFullSnapshot } = require("../services/snapshot/btcSnapshotSchema");
const { runAssetSnapshot } = require("../services/snapshot/assetSnapshotBuilder");
const { evaluateDeliveryMode } = require("../logic/deliveryModeEvaluator");
const { getLastBtcSnapshot } = require("../utils/supabase");
// 設計: 3本パイプラインは inflow/mpi/whaleRatio のみ。getHighResolutionCQData はオーバースペックのため cron では使用しない。
// Phase 3: CryptoQuant capabilities初期化
const { initializeCapabilities } = require("../services/cryptoquant/capabilities");
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

const { analyzeXSentimentLive } = require("../services/grok/client");
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
const { buildBenefitBlock, injectBenefitBlock } = require("../services/telegram/benefitBlock");
const { getSocialProofText } = require("../services/telegram/reaction-counter");
const { postProofToX } = require("../services/x/proof-post");
// コンテンツ保存サービス（定時配信用）
const { getContent } = require("../services/core/contentStorage");
// Phase 3: snapshotBuilder (Stage 5 Gemini + Stage 6 Dr.Grok base)
const { runStages5And6 } = require("../services/snapshot/snapshotBuilder");
const { computeDivergenceSignal } = require("../logic/divergence/computeDivergenceSignal");
const { computeMarketRegime } = require("../logic/regime/computeMarketRegime");
const { computeSnapshotDiff } = require("../logic/diff/computeSnapshotDiff");
// 信頼度スコアベースの統一品質ゲート（全方位対応）
// 見逃した機会計算ユーティリティ
const {
  calculateMissedOpportunities,
  formatMissedOpportunities
} = require("../utils/missedOpportunities");

// Phase 1: イベント駆動配信システム（Strategic SSOT v4.0）
const ENABLE_EVENT_DRIVEN = process.env.ENABLE_EVENT_DRIVEN === "false" ? false : true;
const ENABLE_KIBA = process.env.ENABLE_KIBA === "false" ? false : true;
// Telegram送信の有効化（デフォルト: true = Telegram配信を主要チャネルとして使用）
// COO推奨: Telegram配信に戻す（コスト最適化、運用負荷最小化、即時性の確保）
const ENABLE_TELEGRAM = process.env.ENABLE_TELEGRAM !== "false"; // デフォルトでtrue（明示的にfalseにしない限り有効）
const ENABLE_X_PROOF_POST = process.env.ENABLE_X_PROOF_POST === "true";
const X_PROOF_USE_CARTOON = process.env.X_PROOF_USE_CARTOON === "true"; // 風刺画を追加するか
const CTA_LINK_REGEX = /https:\/\/cryptotradeacademy\.io\/start\?[^\s\)]+/g;
const { getLandingPageUrl } = require("../services/telegram/lp-links");
// 言語別のソーシャルプルーフ＋CTA（Minimal 配信用: I'm Safe タップでカウント、Get the edge で Whop 誘導）
function getSocialProofButton(lang = "en") {
  const buttonTexts = {
    en: "🔥 I'm Safe (Trap Avoided)",
    es: "🔥 Estoy Seguro (Trampa Evitada)",
    "pt-br": "🔥 Estou Seguro (Armadilha Evitada)",
    ar: "🔥 أنا آمن (تم تجنب الفخ)",
    ja: "🔥 安全です（トラップ回避済み）",
    ko: "🔥 안전합니다 (함정 회피됨)"
  };
  const ctaTexts = {
    en: "Get the edge →",
    es: "Consigue la ventaja →",
    "pt-br": "Garanta o edge →",
    ar: "احصل على الميزة →",
    ja: "エッジを取る →",
    ko: "엣지 받기 →"
  };
  const buttonText = buttonTexts[lang] || buttonTexts["en"];
  const ctaText = ctaTexts[lang] || ctaTexts["en"];
  const ctaUrl = getLandingPageUrl(lang);

  return {
    inline_keyboard: [
      [{ text: buttonText, callback_data: "action_saved" }, { text: ctaText, url: ctaUrl }]
    ]
  };
}

/** 有料版（Regular Briefing）配信専用: ボタン設置を無料版と統一 — 1ボタンのみ・Xで仲間と共有する・intent/tweet */
const X_SHARE_HASHTAG = "#TrapDefence";
const X_SHARE_TEMPLATES = {
  en: "Trap Defence BTC is helping me avoid traps. @trapdefence " + X_SHARE_HASHTAG,
  es: "Trap Defence BTC me está ayudando a evitar trampas. @trapdefence " + X_SHARE_HASHTAG,
  "pt-br": "Trap Defence BTC está me ajudando a evitar armadilhas. @trapdefence " + X_SHARE_HASHTAG,
  ar: "Trap Defence BTC يساعدني على تجنب الفخاخ. @trapdefence " + X_SHARE_HASHTAG,
  ja: "Trap Defence BTC、トラップ回避の視点が役に立っています。@trapdefence " + X_SHARE_HASHTAG,
  ko: "Trap Defence BTC 덕분에 함정 피해가고 있어요. @trapdefence " + X_SHARE_HASHTAG
};
const X_SHARE_BUTTON_LABELS = {
  en: "Share with the community on X →",
  es: "Comparte con la comunidad en X →",
  "pt-br": "Compartilhe com a comunidade no X →",
  ar: "شارك مع المجتمع على X →",
  ja: "Xで仲間と共有する →",
  ko: "X에서 커뮤니티와 공유하기 →"
};
function getRegularBriefingButton(lang = "en") {
  const label = X_SHARE_BUTTON_LABELS[lang] || X_SHARE_BUTTON_LABELS.en;
  const tweetText = X_SHARE_TEMPLATES[lang] || X_SHARE_TEMPLATES.en;
  const intentUrl = "https://x.com/intent/tweet?text=" + encodeURIComponent(tweetText);
  return {
    inline_keyboard: [[{ text: label, url: intentUrl }]]
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
    // W+ 購入の「失敗＝実害」をゼロに寄せるため、未送達/リンク不足のリトライを先に捌く
    try {
      const { processWarriorPlusPendingOnce } = require("../services/warriorplus/pendingProcessor");
      const result = await processWarriorPlusPendingOnce({ limit: 6 });
      if (result?.processed) {
        logger.info(`[W+] Pending retry processed: ${result.processed}`);
      }
    } catch (e) {
      logger.warn(`[W+] Pending retry skipped: ${e?.message || e}`);
    }

    // /api/health 用: 最終実行時刻を記録（毎回）
    try {
      const { getKV } = require("../utils/kv");
      const kvHealth = getKV();
      if (kvHealth) await kvHealth.set("health:cron:lastExecution", Date.now());
    } catch (_) {}

    // 0. 時間スロット判定（6時間ごとデフォルト、4時間ごとに切り替え可能）- UTC固定
    const now = new Date();
    const nowUTC = zonedTimeToUtc(now, TZ_UTC);
    const utcHour = Number(formatInTimeZone(nowUTC, TZ_UTC, "HH"));
    const utcMinute = Number(formatInTimeZone(nowUTC, TZ_UTC, "mm"));
    // 定期配信スケジュール: UTC で最適化。デフォルト 0,6,12,18 時の :00。REGULAR_DELIVERY_HOURS_UTC / REGULAR_DELIVERY_MINUTE で上書き可
    const REGULAR_HOURS_6H = [0, 6, 12, 18];
    const REGULAR_HOURS_4H = [0, 4, 8, 12, 16, 18, 20];
    let REGULAR_HOURS = REGULAR_HOURS_6H;
    const customHours = process.env.REGULAR_DELIVERY_HOURS_UTC;
    if (customHours && /^[\d,]+$/.test(customHours)) {
      REGULAR_HOURS = customHours.split(",").map((h) => parseInt(h, 10)).filter((h) => h >= 0 && h <= 23).sort((a, b) => a - b);
      if (REGULAR_HOURS.length === 0) REGULAR_HOURS = REGULAR_HOURS_6H;
    } else if (process.env.REGULAR_SCHEDULE === "4h") {
      REGULAR_HOURS = REGULAR_HOURS_4H;
    }
    let REGULAR_DELIVERY_MINUTE = parseInt(process.env.REGULAR_DELIVERY_MINUTE, 10);
    if (Number.isNaN(REGULAR_DELIVERY_MINUTE) || REGULAR_DELIVERY_MINUTE < 0 || REGULAR_DELIVERY_MINUTE > 59) {
      REGULAR_DELIVERY_MINUTE = 0;
    }
    // 定期配信は「指定時」の「指定分」のみ（デフォルト :00）。Cron にその分を含めること（例: 0,7,22,37,52）
    const isRegularSlot = REGULAR_HOURS.includes(utcHour) && utcMinute === REGULAR_DELIVERY_MINUTE;
    const force = req.query?.force === "true";

    logger.info("Slot check", {
      utcHour,
      utcMinute,
      isRegularSlot,
      force,
      schedule: process.env.REGULAR_SCHEDULE === "4h" ? "4h" : "6h",
      regularHours: REGULAR_HOURS,
      regularDeliveryMinute: REGULAR_DELIVERY_MINUTE,
      isInRegularHours: REGULAR_HOURS.includes(utcHour)
    });

    // 1. On-chain (CryptoQuant) - リトライ付き。
    // 404/失敗時は一旦 null を保持し、必要なら後段の AI 穴埋めで数値に差し替える。
    let inflowData = null;
    let mpiData = null;
    try {
      [inflowData, mpiData] = await Promise.all([
        pRetry(() => getExchangeInflow(), { retries: 2, factor: 2, minTimeout: 500 }),
        pRetry(() => getMinerPositionIndex(), { retries: 2, factor: 2, minTimeout: 500 })
      ]);
    } catch (e) {
      logger.warn("CryptoQuant fetch failed after retry:", e?.message, "— inflow/mpi will be imputed (if enabled).");
    }

    const inflowValue = inflowData?.value;
    const mpiValue = mpiData?.value;

    // CryptoQuant欠損時は value=0, raw={} で返るため「raw空」を欠損扱いにする
    const inflowRaw = inflowData?.raw;
    const mpiRaw = mpiData?.raw;

    const inflowRawEmpty = !inflowRaw || (typeof inflowRaw === "object" && Object.keys(inflowRaw).length === 0);
    const mpiRawEmpty = !mpiRaw || (typeof mpiRaw === "object" && Object.keys(mpiRaw).length === 0);

    const inflowMissing =
      inflowValue == null || !Number.isFinite(Number(inflowValue)) || inflowRawEmpty;
    const mpiMissing = mpiValue == null || !Number.isFinite(Number(mpiValue)) || mpiRawEmpty;

    let inflow = inflowMissing ? null : Number(inflowValue);
    let mpi = mpiMissing ? null : Number(mpiValue);

    let cqImputationMeta = null;

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

    // 3. CryptoQuant欠損のAI穴埋め（表示だけでなく Trap Score / シナリオ生成にも反映する）
    const cqImputationEnabled = parseBoolean(
      process.env.CQ_IMPUTATION_ENABLED ?? process.env.CQ_AI_IMPUTATION_ENABLED,
      true
    );
    if (cqImputationEnabled && (inflowMissing || mpiMissing)) {
      try {
        logger.info("CQ imputation start", {
          inflowMissing,
          mpiMissing,
          cqImputationEnabled,
          hasOpenAI: !!process.env.OPENAI_API_KEY,
          hasGemini: !!process.env.GEMINI_API_KEY,
        });
        const { imputeCqMetrics } = require("../services/cqImputation/cqImputer");
        const marketCode = getMarketCode(LANG);

        const result = await imputeCqMetrics({
          market: marketCode,
          lang: LANG,
          priceUsd,
          change24h,
          sentimentLabel,
          inflow,
          mpi
        });

        if (result && Number.isFinite(result.inflow) && Number.isFinite(result.mpi)) {
          inflow = result.inflow;
          mpi = result.mpi;
          cqImputationMeta = result;
          logger.info("CQ imputation applied", {
            confidence: result.confidence,
            inflow: result.inflow,
            mpi: result.mpi,
            basis: result.basis,
            missing: result.meta?.input?.missing
          });
        } else {
          logger.warn("CQ imputation returned null/invalid result; keep inflow/mpi as null");
        }
      } catch (e) {
        logger.warn("CQ imputation failed; keep inflow/mpi as null", e?.message);
      }
    }

    // Phase 2: 早期 Minimal 書き込みは Stage 1 完了後（market_score, trap 取得後）に writeEarlySnapshot で実行

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

    // 配信スロット時のみGPT呼び出し（Grok/Geminiと同様にコスト節約）
    const shouldCallGPT =
      (isRegularSlot || force) &&
      (Math.abs(inflow) > GPT_THRESHOLD_INFLOW ||
        Math.abs(mpi) > GPT_THRESHOLD_MPI ||
        Math.abs(change24h) > GPT_THRESHOLD_CHANGE24H ||
        force);

    if (shouldCallGPT) {
      // 15分ごとの緊急配信用: GPTでCryptoQuantデータを解析
      try {
        const cryptoQuantData = {
          inflow: inflow == null ? 0 : inflow,
          mpi: mpi == null ? 0 : mpi,
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
        // 運用: GPT失敗時もcronは継続。gptCryptoQuantAnalysisはnullのまま、後段で emergencyAnalysis = gptCryptoQuantAnalysis || aiAnalysis により aiAnalysis にフォールバック。
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
      }
    } else if (isRegularSlot || force) {
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
    // needsXIntel: 配信スロット時のみ（Grok/GPT/Gemini と揃えてコスト節約）
    const needsXIntel = isRegularSlot || force;

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

    // Phase 2: writeEarlySnapshot (btc:snapshot:early) — Stage 1 完了直後に毎回実行（憲法準拠）
    try {
      const { getKV } = require("../utils/kv");
      const kv = getKV();
      const raw = { inflow, mpi, priceUsd, change24h, sentimentLabel, fng, cqImputation: cqImputationMeta };
      if (kv) {
        await writeEarlySnapshot(kv, raw, snapshot.market_score, trap);
        console.log("[Phase 2] Early snapshot written to btc:snapshot:early");
      }
    } catch (e) {
      console.warn("[Phase 2] writeEarlySnapshot failed:", e?.message);
    }

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

    // Phase 2: 深掘りデータ初期化
    // 基本データで初期化し、後でイベント駆動パスまたはREGULARパスで拡張
    let cqDeep = { inflow, mpi };

    if (ENABLE_EVENT_DRIVEN && stateManager && evaluateTrigger) {
      try {
        // marketは既に上で宣言済み（392行目）、再代入のみ
        market = getMarketCode(LANG);

        // 前回状態取得
        const lastState = await stateManager.getLastState(market);

        // CQ 一本化: kiba-5min が 5 分ごとに書く cq:latest を優先。無い or 古いときだけ getCQDeepMetrics
        let cqFromCache = false;
        try {
          const { getKV } = require("../utils/kv");
          const kv = getKV();
          if (kv) {
            const cqLatest = await getCqLatest(kv, 15 * 60 * 1000);
            if (cqLatest) {
              const deepFromCache = cqLatestToCqDeep(cqLatest);
              if (deepFromCache && (deepFromCache.trapScore != null || deepFromCache.whaleRatio != null)) {
                cqDeep = { ...cqDeep, ...deepFromCache };
                cqFromCache = true;
                console.log("[CQDeep] Using cq:latest from kiba-5min (single source for CQ).");
              }
            }
          }
        } catch (_) {}

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

          // 設計: CQ は kiba-5min が 5 分ごとに cq:latest に書くのを優先。未取得時のみ getCQDeepMetrics（API 二重取得を廃止）
          if (isRegularSlot || force) {
            if (!cqFromCache) {
              console.log("[CQDeep] Regular slot: no cq:latest, fetching deep metrics.");
              highResCQData = null;
              try {
                const deepResult = await getCQDeepMetrics(market, priceOptions);
                cqDeep = { ...cqDeep, ...deepResult };
                console.log("[CQDeep] Deep metrics fetched:", {
                  trapScore: deepResult?.trapScore,
                  whaleRatio: deepResult?.whaleFlows?.whaleRatio
                });
              } catch (deepErr) {
                console.warn("[Phase 2] Error in getCQDeepMetrics:", deepErr?.message);
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
              highResCQData = null;
            }
          } else {
            console.log(
              "[CQDeep] Non-regular slot (15min monitoring): skipping deep metrics for speed"
            );
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

    // Phase 2: getCQDeepMetrics を常時取得（CQ Pro 100% 受け皿）
    if (!cqDeep.sopr && !cqDeep.trapScore) {
      try {
        const priceOptions = { usdPrice: priceUsd };
        if (getMarketCode(LANG) === "KO") {
          try {
            const [upbitPriceData, usdKrwRate] = await Promise.all([
              fetchBTCKRWPrice(),
              fetchUSDKRWRate()
            ]);
            priceOptions.upbitPrice = upbitPriceData?.tradePrice ?? priceUsd;
            priceOptions.usdKrwRate = usdKrwRate ?? 1300;
          } catch (_) {
            priceOptions.upbitPrice = priceUsd;
            priceOptions.usdKrwRate = 1300;
          }
        }
        const deep = await getCQDeepMetrics(getMarketCode(LANG), priceOptions);
        cqDeep = { ...cqDeep, ...deep };
      } catch (e) {
        console.warn("[Phase 2] getCQDeepMetrics fallback failed:", e?.message);
      }
    }

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

        // エラーメッセージが含まれていないか確認（「error」単体は除外＝通常の分析で使う表現に反応しすぎるため）
        if (gptRegularAnalysis && typeof gptRegularAnalysis === "string") {
          const errorPatterns = [
            "api error",
            "service unavailable",
            "request failed",
            "timed out",
            "timeout",
            "openai error",
            "rate limit"
          ];
          const lower = gptRegularAnalysis.toLowerCase();
          const isError = errorPatterns.some((p) => lower.includes(p));
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
          highResX: highResXData,
          // Professional (CQ Pro) 指標も Trap Score に反映
          // （CQ_PRO_FULL_SPEC_ENABLED=true のときに効く）
          cqDeep: cqDeep || { inflow, mpi }
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
      // divergenceSignal は computeDivergenceSignal を唯一のソースとする（Task 10 で計算）
      // P0 FIX: 言語ごとにpsychologicalSupportを計算するため、ここでは計算しない
      // 各言語ループ内で計算する（targetLangを正しく渡すため）
      psychologicalSupport = null; // 各言語ループ内で計算される

      // P0 FIX: GrokとGeminiの統合最適化は各言語ループ内で実行する（言語ごとのpsychologicalSupportを使用するため）
      // integratedOptimizationは各言語ループ内で計算される（後で定義）
      integratedOptimization = null; // 各言語ループ内で計算される
    } else if (needsLongReport && !isRegularSlot) {
      // divergenceSignal は computeDivergenceSignal を唯一のソースとする（Task 10 で計算）
      // Task 9: aiAnalysis 単体呼び出し削除。Stage 6 (Dr.Grok base) は snapshotBuilder で実行。
    }

    // 7. Telegram send
    let sent = 0;

    // Phase 2: btcSnapshot 構築・配信モード評価（早期 return の前に実行）
    const raw = { inflow, mpi, priceUsd, change24h, sentimentLabel, fng, cqImputation: cqImputationMeta };
    const derivedTrapDetection = trapDetection || (trap && {
      trapScore: trap.confidence === "HIGH" ? 80 : trap.confidence === "MEDIUM" ? 50 : 30,
      trapDetected: trap.isTrap,
      trapSeverity: trap.confidence,
      trapType: null
    }) || null;

    // Task 8/9: Stage 5 (Gemini) + Stage 6 (Dr.Grok base) — 配信スロット時のみ実行（Gemini/コスト節約）
    let stage56 = { sosovalueArticle: null, drGrok: null };
    if (isRegularSlot || force) {
      try {
        const partial = {
          raw,
          cqDeep: cqDeep || { inflow, mpi },
          xSentiment: xSentiment || { whaleBias: 0, retailFomo: 50 },
          trapDetection: derivedTrapDetection,
          trap: trap || {},
          tradeSignal: tradeSignal || null,
          market_score: snapshot?.market_score ?? coreDecision?.score ?? 0
        };
        stage56 = await runStages5And6(partial, getMarketCode);
      } catch (e) {
        console.warn("[snapshotBuilder] Stage 5/6 failed:", e?.message);
      }
    }

    // Task 10: computeDivergenceSignal / computeMarketRegime（lastSnapshot を事前取得）
    const lastSnapshot = await getLastBtcSnapshot();
    const preSnapshot = {
      raw,
      cqDeep: cqDeep || { inflow, mpi },
      xSentiment: xSentiment || null,
      market_score: snapshot?.market_score ?? coreDecision?.score ?? 0
    };
    const divergenceSignal = computeDivergenceSignal(preSnapshot, lastSnapshot);
    const marketRegime = computeMarketRegime(preSnapshot);
    const preSnapshotForDiff = { ...preSnapshot, cqDeep: cqDeep || { inflow, mpi }, trapDetection: derivedTrapDetection, divergenceSignal, marketRegime };
    const diff = computeSnapshotDiff(preSnapshotForDiff, lastSnapshot);

    let nasdaqSnapshot = null;
    let goldSnapshot = null;
    if (isRegularSlot || force) {
      try {
        [nasdaqSnapshot, goldSnapshot] = await Promise.all([
          runAssetSnapshot("NASDAQ"),
          runAssetSnapshot("GOLD")
        ]);
      } catch (e) {
        console.warn("[Phase 2] runAssetSnapshot NASDAQ/GOLD failed:", e?.message);
      }
      if (process.env.ENABLE_ETH === "true") {
        try {
          await runAssetSnapshot("ETH");
        } catch (e) {
          console.warn("[Phase 2] runAssetSnapshot ETH failed:", e?.message);
        }
      }
    }
    const { buildMacroContextFromAssets } = require("../logic/macroRiskEvaluator");
    const macroContext =
      nasdaqSnapshot || goldSnapshot
        ? buildMacroContextFromAssets({ nasdaqSnapshot, goldSnapshot })
        : null;

    const btcSnapshot = buildFullSnapshot({
      raw,
      cqDeep: cqDeep || { inflow, mpi },
      xSentiment: xSentiment || null,
      highResX: highResXData || null,
      gptStructureReasoning: gptRegularAnalysis || gptCryptoQuantAnalysis || null,
      gptScenarioMap: null,
      gptTrapInterpretation: null,
      sosovalueArticle: stage56.sosovalueArticle,
      drGrok: stage56.drGrok,
      trapDetection: derivedTrapDetection,
      trapAlert: trapAlert || null,
      divergenceSignal,
      marketRegime,
      market_score: snapshot?.market_score ?? coreDecision?.score ?? 0,
      tradeSignal: tradeSignal || null,
      diff,
      macroContext
    });

    if (isRegularSlot || force) {
      try {
        const { getKV } = require("../utils/kv");
        const kv = getKV();
        if (kv) {
          await writeFullSnapshot(kv, btcSnapshot);
          await persistSnapshotToDb(btcSnapshot);
          await runAssetSnapshot("BTC", btcSnapshot);
          console.log("[Phase 2] btcSnapshot written to KV (btc:snapshot, asset:snapshot:BTC) and persisted to DB");
        }
      } catch (e) {
        console.warn("[Phase 2] writeFullSnapshot/persistSnapshotToDb failed:", e?.message);
      }
    }

    const deliveryResult = evaluateDeliveryMode(btcSnapshot, {
      isRegularSlot,
      force,
      lastSnapshot: lastSnapshot && lastSnapshot.snapshot_id !== btcSnapshot.snapshot_id ? lastSnapshot : null
    });
    const deliveryMode = deliveryResult.mode;
    const deliveryMeta = deliveryResult.meta || {};
    // KIBA 実行・アラートは /api/kiba-5min（5分周期）に一本化。cron では実行しない（二重アラート防止）
    const kibaResult = { delegated: "kiba-5min", impact: { level: "NONE", intensity: "none" } };

    // 早期 return: minimal かつ定期枠外かつ force なし → 送信は minimal 用クローン（minimal-tg-delivery）に任せる
    if (!force && !isRegularSlot && deliveryMode === "minimal") {
      return res.status(200).json({
        success: true,
        sentMessages: 0,
        skipped: true,
        deliveryMode,
        reason: deliveryResult.reason,
        slot: { isRegularSlot, force },
        kiba: kibaResult
      });
    }

    // 7-A. REGULAR（有料版 - 6言語すべてに配信）
    // Phase 2: deliveryMode を主とする（evaluateDeliveryMode の結果）
    // meta.standbyBreak は regular の亜種としてテンプレートで文言調整
    if (deliveryMode === "regular") {
      console.log(
        "[REGULAR] ✅✅✅ DELIVERY START: Sending REGULAR message (paid version) to all languages..."
      );
      console.log("[REGULAR] Conditions:", {
        isRegularSlot,
        force,
        ENABLE_EVENT_DRIVEN,
        triggerType,
        shouldSend,
        willSend: ENABLE_EVENT_DRIVEN ? shouldSend : true
      });

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
        console.warn(
          `[REGULAR] ⚠️ Missing channel IDs for languages: ${missingChannelIds.join(", ")}`
        );
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

      // Phase 2: イベント駆動が無効な場合でも深掘りデータを取得（cq:latest 優先）
      if (!ENABLE_EVENT_DRIVEN || !stateManager) {
        try {
          const { getKV } = require("../utils/kv");
          const kv = getKV();
          const cqLatest = kv ? await getCqLatest(kv, 15 * 60 * 1000) : null;
          if (cqLatest) {
            cqDeep = { ...cqDeep, ...cqLatestToCqDeep(cqLatest) };
            console.log("[CQDeep] Using cq:latest (event-driven off path).");
          } else {
            const firstLangMarket = getMarketCode(targetLangsForRegular[0]);
            const deepData = await getCQDeepMetrics(firstLangMarket, {
              upbitPrice: priceUsd,
              usdKrwRate: 1300
            });
            cqDeep = { ...cqDeep, ...deepData };
          }
        } catch (error) {
          console.warn("[Phase 2] Error fetching deep metrics:", error.message);
        }
      }

      // Task 8: SoSoValue風記事は snapshotBuilder Stage 5 で生成済み（btcSnapshot.sosovalueArticle）

      // 各言語ごとに配信
      for (let i = 0; i < targetLangsForRegular.length; i += 1) {
        const targetLang = targetLangsForRegular[i];
        try {
          if (i > 0 && REGULAR_LANG_SPACING_MS > 0) {
            await sleepMs(REGULAR_LANG_SPACING_MS);
          }
          if (i === 0) {
            console.log("[REGULAR] Model config:", {
              GPT_MODEL: process.env.GPT_MODEL || null,
              GROK_MODEL: process.env.GROK_MODEL || null,
              GEMINI_MODEL: process.env.GEMINI_MODEL || null,
              REGULAR_LANG_SPACING_MS
            });
          }
          console.log(`[REGULAR] Processing language: ${targetLang}`);

          // Task 10: diagnoseUserSentimentCompat(snapshot, lang) オーバーロード
          let langPsychologicalSupport = null;
          try {
            console.log(`[Dr. Grok] Diagnosing user sentiment for ${targetLang}...`);
            langPsychologicalSupport = await diagnoseUserSentimentCompat(btcSnapshot, targetLang);

            if (
              langPsychologicalSupport &&
              langPsychologicalSupport.psychologicalState !== "UNKNOWN"
            ) {
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
            console.warn(
              `[Dr. Grok] Error providing psychological support for ${targetLang}:`,
              errorMsg
            );
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

          // 言語別のmissedOpportunitiesフォーマット
          const langMissedOpportunitiesFormatted = missedOpportunities
            ? formatMissedOpportunities(missedOpportunities, targetLang)
            : null;

          // Task 10: formatRegularBriefing(snapshot, lang, opts) — snapshot-native
          const snapshotForRegular = {
            ...btcSnapshot,
            cqDeep: cqDeep || btcSnapshot.cqDeep, // REGULARブロックでマージ済みのdeepDataを使用
            highResX: highResXData || btcSnapshot.highResX
          };
          const regularOpts = {
            psychologicalSupport: langPsychologicalSupport || null,
            nonUserImpactReport: langNonUserImpactReport,
            missedOpportunities: langMissedOpportunitiesFormatted,
            grokXAnalysis: grokXAnalysis ?? null,
            marketBug: marketBugDetection || null,
            internalImpact: kibaResult?.impact || { level: "NONE", intensity: "none" }
          };
          const regularTextRaw = langFormatRegularBriefing(snapshotForRegular, targetLang, regularOpts);
          const regularBenefitBlock = buildBenefitBlock({
            kind: "regular",
            lang: targetLang,
            snapshot: snapshotForRegular
          });
          const regularText = injectBenefitBlock(regularTextRaw, regularBenefitBlock);

          // Telegram送信（オプション、環境変数で有効化）
          let regularActuallySent = false;
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
              // 有料版配信は Whop/I'm Safe なし・X にツイート誘導のみ
              const regularButton = getRegularBriefingButton(targetLang);
              regularSendResult = await sendMessageToChannel(regularText, series, marketCode, {
                reply_markup: regularButton
              });
              console.log(
                `[Telegram] REGULAR message sent to ${series}/${marketCode} (${targetLang})`
              );
            } else if (process.env.TELEGRAM_CHAT_ID) {
              // 後方互換性: 既存のTELEGRAM_CHAT_IDを使用
              // 有料版配信は Whop/I'm Safe なし・X にツイート誘導のみ
              const regularButton = getRegularBriefingButton(targetLang);
              regularSendResult = await sendMessage(regularText, {
                reply_markup: regularButton
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
            regularActuallySent = Boolean(telegramMessageId || (regularSendResult && regularSendResult.ok));

            if (regularActuallySent) {
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

          if (regularActuallySent) {
            sent += 1;
            console.log(`[REGULAR] ✅ Successfully sent to ${targetLang}`);
          } else if (ENABLE_TELEGRAM) {
            console.warn(`[REGULAR] ⚠️ Skipped (not delivered) for ${targetLang}`);
          }
        } catch (langError) {
          console.error(`[REGULAR] ❌ Error processing language ${targetLang}:`, langError.message);
          console.error(`[REGULAR] ❌ Stack trace for ${targetLang}:`, langError.stack);
          // エラーが発生しても他の言語の配信を続行
        }
      }
    }

    // 7-B. EMERGENCY は廃止（内部エンジンと役割が被るため外部通知ゼロに統一）

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
        psychologicalSupportSTANDBY = await diagnoseUserSentimentCompat(btcSnapshot, LANG);
      } catch (error) {
        console.warn(
          "[Dr. Grok] Error providing psychological support for STANDBY_BREAK:",
          error.message
        );
      }

      // Snapshot-native: formatRegularBriefing(snapshot, lang, opts)
      const standbyBreakText = formatRegularBriefing(btcSnapshot, LANG, {
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
        psychologicalSupportWATCH = await diagnoseUserSentimentCompat(btcSnapshot, LANG);
      } catch (error) {
        console.warn("[Dr. Grok] Error providing psychological support for WATCH:", error.message);
      }

      // Snapshot-native: formatRegularBriefing(snapshot, lang, opts)
      const watchText = formatRegularBriefing(btcSnapshot, LANG, {
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
        psychologicalSupportWATCHLegacy = await diagnoseUserSentimentCompat(btcSnapshot, LANG);
      } catch (error) {
        console.warn(
          "[Dr. Grok] Error providing psychological support for WATCH (legacy):",
          error.message
        );
      }

      // Snapshot-native: formatRegularBriefing(snapshot, lang, opts)
      const watchText = formatRegularBriefing(btcSnapshot, LANG, {
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
      xIntel,
      kiba: kibaResult
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
