// api/x-quote-repost.js
// 引用リポスト自動化（Grokがインフルエンサー発掘 + 引用リポスト）
// 24投稿/日（6言語 × 2人 × 2投稿）

const { postQuoteTweet } = require("../services/x/client");
const { getXConfigStatus } = require("../services/x/config");
const { generateQuoteRepostText } = require("../services/grok/client");
const {
  isPeakTimeWindow,
  shouldPostQuoteRepost,
  checkDailyPostLimit,
  getOptimizedHashtags
  // getDailyPostCount と incrementDailyPostCount は services/x/influencerRotation から統一実装を使用
} = require("../services/x/optimization");
const { QUOTE_REPOST_TEMPLATES } = require("./x-post-free-report");
const { getTweetMetrics } = require("../services/x/metrics");
const {
  getWhopProductUrl,
  getMinimalVersionCheckoutUrl,
  getPromoCode
} = require("../services/telegram/whop-links");
const { optimizeContentAndFunnel } = require("../services/x/contentOptimizer");

const {
  getInfluencerCountForLang,
  getImpressionTargetForLang,
  selectInfluencersForImpressionTarget
} = require("../config/influencerStrategy");

// Minimal/Regular 導線ローテーション（Grok×Gemini 分析統合）
const {
  getNextQuoteFunnelType,
  recordQuoteFunnelType,
  TYPES: FUNNEL_TYPES
} = require("../services/x/quoteFunnelRotation");
const {
  getMinimalOptinQuoteTemplate,
  MINIMAL_OPTIN_VARIANTS
} = require("../config/quoteRepostTemplatesMinimalOptin");
const {
  getRegularOptinQuoteTemplate,
  REGULAR_OPTIN_VARIANTS
} = require("../config/quoteRepostTemplatesRegularOptin");

// 8時間クールダウン関連のインポート（インフルエンサー別の日次投稿数管理）
const {
  isInCooldown,
  markLastPostedAt,
  getDailyPostCount: getDailyPostCountForInfluencer,
  incrementDailyPostCount: incrementDailyPostCountForInfluencer,
  hasReachedDailyLimit
} = require("../services/x/influencerRotation");

// グローバルな日次投稿数管理（optimization.js）
const {
  getDailyPostCount: getGlobalDailyPostCount,
  incrementDailyPostCount: incrementGlobalDailyPostCount
} = require("../services/x/optimization");

// ジッター（ランダム遅延）と言語間ウェイトのインポート（P0: 実装漏れ対応）
const { applyJitter, applyLanguageWait } = require("../utils/scheduler");

// P0 FIX: GPT-5-mini推奨 - p-limitによる並列処理制御
// p-limitはES Moduleのため動的インポートを使用（使用時にインポート）
let pLimit = null;
async function getPLimit() {
  if (!pLimit) {
    try {
      const pLimitModule = await import("p-limit");
      pLimit = pLimitModule.default || pLimitModule;
    } catch (error) {
      console.warn("[Quote Repost] p-limit import failed:", error.message);
      // フォールバック: 並列処理制限なし（全件並列実行）
      pLimit = (concurrency) => (fn) => fn;
    }
  }
  return pLimit;
}

// KV廃止: ファイルシステム方式に移行
// const { kv } = require('../utils/kv'); // KV廃止
// ただし、getMinimalVersionPostUrl関数でkvを使用しているため、安全に初期化
let kv = null;
try {
  const kvModule = require("@vercel/kv");
  kv = kvModule.kv;
} catch (error) {
  console.warn("[Quote Repost] @vercel/kv not available:", error.message);
}

const SUPPORTED_LANGS = ["en", "es", "pt-br", "ar", "ja", "ko"];

// P0 FIX: GPT-5-mini推奨 - withTimeout ヘルパー関数（全外部呼び出しにタイムアウトを付与）
/**
 * Promiseにタイムアウトを設定するヘルパー関数
 * @param {Promise} promise - タイムアウトを設定するPromise
 * @param {number|null} ms - タイムアウト時間（ミリ秒）。nullまたはInfinityの場合はタイムアウトなし
 * @param {Function|null} onTimeout - タイムアウト時のコールバック関数（オプション）
 * @returns {Promise} タイムアウト付きのPromise
 */
function withTimeout(promise, ms, onTimeout = null) {
  if (ms == null || ms === Infinity) return promise;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const timeoutId = setTimeout(() => {
        if (onTimeout) onTimeout();
        reject(new Error(`Timeout after ${ms}ms`));
      }, ms);
      // promiseが解決/拒否されたらタイマーをクリア
      promise.finally(() => clearTimeout(timeoutId)).catch(() => {});
    })
  ]);
}

// P2 FIX: normalizeLangの改善（複数のアンダースコアに対応）
// P2 FIX: 共通ユーティリティを使用
const {
  normalizeLang: normalizeLangUtil,
  parseBoolean: parseBooleanUtil
} = require("../utils/common");

function normalizeLang(value) {
  return normalizeLangUtil(value, SUPPORTED_LANGS);
}

function parseBoolean(value, defaultValue = false) {
  return parseBooleanUtil(value, defaultValue);
}

function getTelegramDeepLinkWithSource(lang, source = "x_quote", options = {}) {
  let botUsername = process.env.TELEGRAM_BOT_USERNAME || "TrapDefenceBot";
  botUsername = botUsername.replace(/^@/, "");
  const normalizedLang = normalizeLang(lang) || "en";

  const startParam = `minimal_${normalizedLang}_${source}`;
  let deepLink = `https://t.me/${botUsername}?start=${startParam}`;

  // Grok推奨: UTMパラメータ強化（ソース追跡強化）
  const utmParams = [];
  if (options.utm_source) {
    utmParams.push(`utm_source=${encodeURIComponent(options.utm_source)}`);
  } else {
    utmParams.push(`utm_source=x_quote_${normalizedLang}`);
  }

  if (options.utm_medium) {
    utmParams.push(`utm_medium=${encodeURIComponent(options.utm_medium)}`);
  } else {
    utmParams.push(`utm_medium=social`);
  }

  if (options.utm_campaign) {
    utmParams.push(`utm_campaign=${encodeURIComponent(options.utm_campaign)}`);
  } else {
    const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    utmParams.push(`utm_campaign=quote_repost_${normalizedLang}_${dateStr}`);
  }

  if (options.utm_content) {
    utmParams.push(`utm_content=${encodeURIComponent(options.utm_content)}`);
  } else if (options.influencerUsername) {
    utmParams.push(`utm_content=influencer_${options.influencerUsername}`);
  }

  if (utmParams.length > 0) {
    deepLink += `&${utmParams.join("&")}`;
  }

  return deepLink;
}

// 言語別引用リポストテンプレート（Xアルゴリズム最適化版・長文ポスト対応 最大25,000文字）
// x-post-free-report.jsからインポート、またはフォールバック用に定義
const FALLBACK_QUOTE_REPOST_TEMPLATES = {
  en: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const priceStr = priceUsd
      ? `$${priceUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : "$N/A";
    const changeStr =
      change24h != null ? `${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%` : "";
    const netflowStr = exchangeNetflow ? `Inflow +${Math.abs(exchangeNetflow).toFixed(0)} BTC` : "";
    const whaleStr = whaleRatio
      ? `${whaleRatio}% whales = $${Math.floor((whaleRatio / 100) * 89000 * 1000)}M+ ready`
      : "";

    // 現在の市況を考慮: 低リスクなのに売り圧力がある矛盾を強調
    if (
      trapScore <= 25 &&
      exchangeNetflow &&
      exchangeNetflow > 0 &&
      whaleRatio &&
      whaleRatio > 50
    ) {
      // P1 FIX: 外部リンクを1つに制限（Whop優先、freeLinkは削除）
      const question =
        "🚨 CONTRADICTION: Low risk BUT whales positioning. What's your move? Reply!";
      const whopLink = `🔥 PRO 50% OFF (${getPromoCode().toUpperCase()}): ${getWhopProductUrl("en")}?promo=${getPromoCode()}`;
      return `Agree! Trap Score 0/100 BUT ${whaleStr} to sell. ${whopLink} ${question} #BTC #TrapDefence`;
    }

    // Grok + Gemini統合: 質問CTA必須（アルゴリズム評価UP）
    // オープンエンド質問でリプライ誘導、投稿の20-30%を占めず自然配置
    const question =
      trapScore <= 25
        ? "🚀 What's your biggest fear in this market? Reply!"
        : "💥 Protecting capital or chasing? Reply!";

    // P1 FIX: 外部リンクを1つに制限（Whop優先、freeLinkは削除）
    const whopLink = `🔥 PRO 50% OFF (${getPromoCode().toUpperCase()}): ${getWhopProductUrl("en")}?promo=${getPromoCode()}`;

    // ハッシュタグ: トレンド1個+ニッチ2個（3個超はスパム判定リスク）
    // 絵文字: 3-5個（冒頭/区切り/末尾に視覚強調）
    return `Agree! TrapDefence detected this 🚀 ${whopLink} ${question} #BTC #TrapDefence`;
  },
  ja: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const priceStr = priceUsd
      ? `$${priceUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : "$N/A";
    const changeStr =
      change24h != null ? `${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%` : "";
    const whaleStr = whaleRatio
      ? `${whaleRatio}%クジラ = $${Math.floor((whaleRatio / 100) * 89000 * 1000)}M+ 準備完了`
      : "";

    // 現在の市況を考慮: 低リスクなのに売り圧力がある矛盾を強調
    if (
      trapScore <= 25 &&
      exchangeNetflow &&
      exchangeNetflow > 0 &&
      whaleRatio &&
      whaleRatio > 50
    ) {
      // P1 FIX: 外部リンクを1つに制限（Whop優先）
      const question = "🚨 矛盾: 低リスクなのにクジラがポジショニング中。どうする？リプライ！";
      const whopLink = `🔥 PRO 50%OFF (${getPromoCode().toUpperCase()}): ${getWhopProductUrl("ja")}?promo=${getPromoCode()}`;
      return `同意！Trap Score 0/100 なのに ${whaleStr} 売却準備中。${whopLink} ${question} #BTC #TrapDefence`;
    }

    // Grok + Gemini統合: 質問CTA必須（オープンエンド質問でリプライ誘導）
    const question =
      trapScore <= 25
        ? "🚀 この市場で最も大きな恐怖は何ですか？リプライ！"
        : "💥 資本保護？それとも追いかけ中？リプライ！";

    // P1 FIX: 外部リンクを1つに制限（Whop優先）
    const whopLink = `🔥 PRO 50%OFF (${getPromoCode().toUpperCase()}): ${getWhopProductUrl("ja")}?promo=${getPromoCode()}`;

    // ハッシュタグ: トレンド1個+ニッチ2個、絵文字: 3-5個
    return `同意！TrapDefenceで検知済み 🚀 ${whopLink} ${question} #BTC #TrapDefence`;
  },
  es: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const priceStr = priceUsd
      ? `$${priceUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : "$N/A";
    const changeStr =
      change24h != null ? `${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%` : "";
    const whaleStr = whaleRatio
      ? `${whaleRatio}% ballenas = $${Math.floor((whaleRatio / 100) * 89000 * 1000)}M+ listas`
      : "";

    // 現在の市況を考慮: 低リスクなのに売り圧力がある矛盾を強調
    if (
      trapScore <= 25 &&
      exchangeNetflow &&
      exchangeNetflow > 0 &&
      whaleRatio &&
      whaleRatio > 50
    ) {
      // P1 FIX: 外部リンクを1つに制限（Whop優先）
      const question =
        "🚨 CONTRADICCIÓN: Bajo riesgo PERO ballenas posicionándose. ¿Cuál es tu movimiento? ¡Responde!";
      const whopLink = `🔥 PRO 50% OFF (${getPromoCode().toUpperCase()}): ${getWhopProductUrl("es")}?promo=${getPromoCode()}`;
      return `¡De acuerdo! Trap Score 0/100 PERO ${whaleStr} para vender. ${whopLink} ${question} #BTC #TrapDefence`;
    }

    // Grok + Gemini統合: 質問CTA必須（オープンエンド質問でリプライ誘導）
    const question =
      trapScore <= 25
        ? "🚀 ¿Cuál es tu mayor miedo en este mercado? ¡Responde!"
        : "💥 ¿Protegiendo capital o persiguiendo? ¡Responde!";

    // P1 FIX: 外部リンクを1つに制限（Whop優先）
    const whopLink = `🔥 PRO 50% OFF (${getPromoCode().toUpperCase()}): ${getWhopProductUrl("es")}?promo=${getPromoCode()}`;

    // ハッシュタグ: トレンド1個+ニッチ2個、絵文字: 3-5個
    return `¡De acuerdo! TrapDefence detectó esto 🚀 ${whopLink} ${question} #BTC #TrapDefence`;
  },
  "pt-br": (
    trapScore,
    priceUsd,
    change24h,
    deepLink,
    exchangeNetflow = null,
    whaleRatio = null
  ) => {
    const priceStr = priceUsd
      ? `$${priceUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : "$N/A";
    const changeStr =
      change24h != null ? `${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%` : "";
    const whaleStr = whaleRatio
      ? `${whaleRatio}% baleias = $${Math.floor((whaleRatio / 100) * 89000 * 1000)}M+ prontas`
      : "";

    // 現在の市況を考慮: 低リスクなのに売り圧力がある矛盾を強調
    if (
      trapScore <= 25 &&
      exchangeNetflow &&
      exchangeNetflow > 0 &&
      whaleRatio &&
      whaleRatio > 50
    ) {
      // P1 FIX: 外部リンクを1つに制限（Whop優先）
      const question =
        "🚨 CONTRADIÇÃO: Baixo risco MAS baleias se posicionando. Qual é sua jogada? Responda!";
      const whopLink = `🔥 PRO 50% OFF (${getPromoCode().toUpperCase()}): ${getWhopProductUrl("pt-br")}?promo=${getPromoCode()}`;
      return `Concordo! Trap Score 0/100 MAS ${whaleStr} para vender. ${whopLink} ${question} #BTC #TrapDefence`;
    }

    // Grok + Gemini統合: 質問CTA必須（オープンエンド質問でリプライ誘導）
    const question =
      trapScore <= 25
        ? "🚀 Qual é o seu maior medo neste mercado? Responda!"
        : "💥 Protegendo capital ou perseguindo? Responda!";

    // P1 FIX: 外部リンクを1つに制限（Whop優先）
    const whopLink = `🔥 PRO 50% OFF (${getPromoCode().toUpperCase()}): ${getWhopProductUrl("pt-br")}?promo=${getPromoCode()}`;

    // ハッシュタグ: トレンド1個+ニッチ2個、絵文字: 3-5個
    return `Concordo! TrapDefence detectou isso 🚀 ${whopLink} ${question} #BTC #TrapDefence`;
  },
  ar: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const priceStr = priceUsd
      ? `$${priceUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : "$N/A";
    const changeStr =
      change24h != null ? `${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%` : "";
    const whaleStr = whaleRatio
      ? `${whaleRatio}% حيتان = $${Math.floor((whaleRatio / 100) * 89000 * 1000)}M+ جاهزة`
      : "";

    // 現在の市況を考慮: 低リスクなのに売り圧力がある矛盾を強調
    if (
      trapScore <= 25 &&
      exchangeNetflow &&
      exchangeNetflow > 0 &&
      whaleRatio &&
      whaleRatio > 50
    ) {
      const question = "🚨 تناقض: مخاطر منخفضة لكن الحيتان تتجهز. ما خطوتك؟ أجب!";
      const whopLink = `🔥 PRO 50% خصم (${getPromoCode().toUpperCase()}): ${getWhopProductUrl("ar")}?promo=${getPromoCode()}`;
      const freeLink = `(مجاني: ${deepLink})`;
      return `موافق! Trap Score 0/100 لكن ${whaleStr} للبيع. ${whopLink} ${freeLink} ${question} #BTC #TrapDefence`;
    }

    // Grok + Gemini統合: 質問CTA必須（オープンエンド質問でリプライ誘導）
    const question =
      trapScore <= 25
        ? "🚀 ما هو أكبر خوفك في هذا السوق؟ أجب!"
        : "💥 هل تحمي رأس المال أم تطارد؟ أجب!";

    // P1 FIX: 外部リンクを1つに制限（Whop優先）
    const whopLink = `🔥 PRO 50% خصم (${getPromoCode().toUpperCase()}): ${getWhopProductUrl("ar")}?promo=${getPromoCode()}`;

    // ハッシュタグ: トレンド1個+ニッチ2個、絵文字: 3-5個
    return `موافق! TrapDefence اكتشف هذا 🚀 ${whopLink} ${question} #BTC #TrapDefence`;
  },
  ko: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const priceStr = priceUsd
      ? `$${priceUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : "$N/A";
    const changeStr =
      change24h != null ? `${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%` : "";
    const whaleStr = whaleRatio
      ? `${whaleRatio}% 고래 = $${Math.floor((whaleRatio / 100) * 89000 * 1000)}M+ 준비됨`
      : "";

    // 現在の市況を考慮: 低リスクなのに売り圧力がある矛盾を強調
    if (
      trapScore <= 25 &&
      exchangeNetflow &&
      exchangeNetflow > 0 &&
      whaleRatio &&
      whaleRatio > 50
    ) {
      // P1 FIX: 外部リンクを1つに制限（Whop優先）
      const question = "🚨 모순: 낮은 리스크인데 고래가 포지셔닝 중. 어떻게 하시겠습니까? 답글!";
      const whopLink = `🔥 PRO 50% 할인 (${getPromoCode().toUpperCase()}): ${getWhopProductUrl("ko")}?promo=${getPromoCode()}`;
      return `동의! Trap Score 0/100 인데 ${whaleStr} 매도 준비 중. ${whopLink} ${question} #BTC #TrapDefence`;
    }

    // Grok + Gemini統合: 質問CTA必須（オープンエンド質問でリプライ誘導）
    const question =
      trapScore <= 25
        ? "🚀 이 시장에서 가장 큰 두려움은 무엇인가요? 답글!"
        : "💥 자본 보호 중인가요? 추격 중인가요? 답글!";

    // P1 FIX: 外部リンクを1つに制限（Whop優先）
    const whopLink = `🔥 PRO 50% 할인 (${getPromoCode().toUpperCase()}): ${getWhopProductUrl("ko")}?promo=${getPromoCode()}`;

    // ハッシュタグ: トレンド1個+ニッチ2個、絵文字: 3-5個
    return `동의! TrapDefence가 이것을 감지했습니다 🚀 ${whopLink} ${question} #BTC #TrapDefence`;
  }
};

/**
 * 無料版（Minimal Version）ポストのURLを取得（Vercel KV）
 */
async function getMinimalVersionPostUrl(lang, dateString) {
  if (!kv) return null;
  try {
    const key = `x:minimal-version:url:${lang}:${dateString}`;
    const url = await kv.get(key);
    return url || null;
  } catch (error) {
    console.warn("[Quote Repost] Failed to get minimal version post URL:", error.message);
    return null;
  }
}

/**
 * 無料版メッセージのキーポイントを抽出（引用リポスト生成用）
 */
async function getMinimalVersionContent(lang, reportData = null) {
  try {
    // 無料版メッセージ生成関数を読み込む
    const loadUserTemplates = (lang) => {
      try {
        const normalizedLang = lang.toLowerCase().replace("-", "");
        const templatePath = `../services/telegram/messages/user/${normalizedLang}/minimal-high-quality.${normalizedLang}`;
        return require(templatePath);
      } catch (error) {
        return require("../services/telegram/messages/user/en/minimal-high-quality.en");
      }
    };

    const langTemplates = loadUserTemplates(lang);
    const formatMinimalBriefing =
      langTemplates.formatMinimalHighQualityBriefing || langTemplates.formatMinimalBriefing;

    if (!formatMinimalBriefing) {
      return null;
    }

    // reportDataから必要なデータを構築
    const trapData = reportData?.trapData || {
      trapAlert: null,
      exchangeNetflow: reportData?.exchangeNetflow || null,
      whaleRatio: reportData?.whaleRatio || null
    };

    const marketData = reportData?.marketData || {
      mpi: reportData?.mpi || null,
      priceUsd: reportData?.priceUsd || null,
      change24h: reportData?.change24h || null
    };

    const sentimentData = reportData?.sentimentData || {
      sentiment: reportData?.sentiment || null,
      risk: reportData?.risk || null
    };

    // 無料版メッセージを生成
    const minimalText = formatMinimalBriefing({
      now: new Date(),
      trapScore: reportData?.trapScore || null,
      priceUsd: reportData?.priceUsd || null,
      change24h: reportData?.change24h || null,
      trapData: trapData,
      marketData: marketData,
      sentimentData: sentimentData,
      lang: lang
    });

    if (!minimalText) return null;

    // キーポイントを抽出
    const keyPoints = {
      hook: null,
      trapScore: null,
      dataPoints: [],
      drGrokInsight: null,
      mentalNote: null,
      whatToAvoid: []
    };

    // フックメッセージを抽出（BREAKING: TRAP DEFENCE BRIEFING）
    const hookMatch = minimalText.match(/🚨\s*BREAKING[^\n]*/i) || minimalText.match(/🚨[^\n]*/);
    if (hookMatch) {
      keyPoints.hook = hookMatch[0].trim();
    }

    // Trap Scoreを抽出
    const trapScoreMatch = minimalText.match(/Trap Score[:\s]*(\d+)\/100/i);
    if (trapScoreMatch) {
      keyPoints.trapScore = parseInt(trapScoreMatch[1]);
    }

    // データポイントを抽出（Exchange Netflow, Whale Ratioなど）
    const dataMatch = minimalText.match(/Exchange Netflow[^\n]*/i);
    if (dataMatch) {
      keyPoints.dataPoints.push(dataMatch[0].trim());
    }
    const whaleMatch = minimalText.match(/Whale Ratio[^\n]*/i);
    if (whaleMatch) {
      keyPoints.dataPoints.push(whaleMatch[0].trim());
    }

    // Dr. Grok's Quick Insightを抽出
    const insightMatch = minimalText.match(
      /Dr\. Grok['"]?s Quick Insight[^\n]*\n([^\n]+(?:\n[^\n]+)*?)(?=\n━━|$)/is
    );
    if (insightMatch) {
      keyPoints.drGrokInsight = insightMatch[1].trim().replace(/^["']|["']$/g, "");
    }

    // Mental Noteを抽出
    const mentalNoteMatch = minimalText.match(
      /Mental Note[^\n]*\n([^\n]+(?:\n[^\n]+)*?)(?=\n━━|$)/is
    );
    if (mentalNoteMatch) {
      keyPoints.mentalNote = mentalNoteMatch[1].trim().replace(/^["']|["']$/g, "");
    }

    // What to Avoidを抽出
    const whatToAvoidMatch = minimalText.match(/What to Avoid[^\n]*\n((?:•[^\n]+\n?)+)/i);
    if (whatToAvoidMatch) {
      const items = whatToAvoidMatch[1].split("\n").filter((line) => line.trim().startsWith("•"));
      keyPoints.whatToAvoid = items.map((item) => item.replace(/^•\s*/, "").trim());
    }

    return keyPoints;
  } catch (error) {
    console.warn(
      `[Quote Repost] Failed to get minimal version content for ${lang}:`,
      error.message
    );
    return null;
  }
}

/**
 * Grokが引用リポスト用のテキストを生成（Grok APIを使用）
 * CRITICAL: GrokのXアルゴリズムハッキング × Geminiの心理ハッキングで最適化
 */
async function generateQuoteRepostTextWithGrok(
  lang,
  influencerTweet,
  reportData = null,
  deadlineMs = null,
  langRunId = null
) {
  // 🔒 言語整合性チェック: テキスト生成前に言語不一致を検証
  if (influencerTweet.lang && influencerTweet.lang.toLowerCase() !== lang.toLowerCase()) {
    console.error(
      `[Quote Repost] ⚠️⚠️⚠️ LANGUAGE MISMATCH in text generation: influencer lang (${influencerTweet.lang}) does not match post lang (${lang})`
    );
    throw new Error(
      `Language mismatch in text generation: influencer lang (${influencerTweet.lang}) does not match post lang (${lang})`
    );
  }

  try {
    // Grok推奨: UTMパラメータ強化（インフルエンサー追跡）
    const deepLink = getTelegramDeepLinkWithSource(lang, "x_quote", {
      influencerUsername: influencerTweet.username,
      utm_content: `influencer_${influencerTweet.username}`
    });

    // P0 FIX: GPT-5-mini推奨 - 本番環境でのパフォーマンス最適化
    // getMinimalVersionPostUrlとgetMinimalVersionContentはオプションとして扱い、タイムアウトを避ける
    const dateString = new Date().toISOString().split("T")[0];
    let minimalVersionPostUrl = null;
    let minimalContent = null;

    // P0 FIX: GPT-5-mini推奨 - 環境変数フラグによる強制スキップ（本番環境で即座に有効化可能）
    const SKIP_MINIMAL_FETCH = process.env.SKIP_MINIMAL_FETCH === "1" || false;

    // P0 FIX: タイムアウトリスクが高い場合はスキップ（Grok-Code-Fast-1推奨 + GPT-5-mini推奨: より短い閾値）
    const remainingTimeForMinimal = deadlineMs ? deadlineMs - Date.now() : Infinity;
    const MIN_REMAINING_TIME_FOR_MINIMAL_DATA = 10000; // GPT-5-mini推奨: 10秒以上残っていれば実行（30秒→10秒に短縮）

    if (!SKIP_MINIMAL_FETCH && remainingTimeForMinimal >= MIN_REMAINING_TIME_FOR_MINIMAL_DATA) {
      // P0 FIX: GPT-5-mini推奨 - withTimeoutで各呼び出しにタイムアウトを付与
      try {
        const timeoutPerMinimalCall = Math.min(
          5000,
          Math.max(1000, Math.floor(remainingTimeForMinimal / 4))
        );
        const results = await Promise.allSettled([
          withTimeout(
            getMinimalVersionPostUrl(lang, dateString).catch(() => null),
            timeoutPerMinimalCall
          ).catch(() => null),
          withTimeout(
            getMinimalVersionContent(lang, reportData).catch(() => null),
            timeoutPerMinimalCall
          ).catch(() => null)
        ]);
        minimalVersionPostUrl = results[0]?.status === "fulfilled" ? results[0].value : null;
        minimalContent = results[1]?.status === "fulfilled" ? results[1].value : null;
      } catch (error) {
        console.warn(
          `[Quote Repost] ⚠️ Failed to fetch minimal version data (non-fatal):`,
          error.message
        );
        // エラー時はnullのまま続行（フォールバック処理）
      }
    } else {
      // 明示的にスキップ
      if (SKIP_MINIMAL_FETCH) {
        console.warn(
          `[Quote Repost] SKIP_MINIMAL_FETCH is enabled — skipping minimal version fetch [runId: ${langRunId}]`
        );
      } else {
        console.warn(
          `[Quote Repost] ⏰ Skipping minimal version data fetch (insufficient time remaining: ${Math.round(remainingTimeForMinimal / 1000)}s) [runId: ${langRunId}]`
        );
      }
      // タイムアウトリスクが高い場合はスキップして続行
    }

    // CRITICAL: GrokのXアルゴリズムハッキング × Geminiの心理ハッキングで最適化
    let optimizationStrategy = null;
    try {
      // 現在のメトリクスを取得（過去のエンゲージメントデータから）
      // engagementRateは0〜1の範囲であることを確認
      const rawEngagementRate = influencerTweet.engagementRate || 0;
      const normalizedEngagementRate =
        rawEngagementRate > 1 ? rawEngagementRate / 100 : rawEngagementRate;

      const currentMetrics = {
        impressions: influencerTweet.recentImpressions || 0,
        engagements: Math.floor(
          (influencerTweet.recentImpressions || 0) * normalizedEngagementRate
        ),
        engagementRate: normalizedEngagementRate
      };

      // 市場データとXセンチメントを準備
      const marketData = {
        trapScore: reportData?.trapScore || null,
        priceUsd: reportData?.priceUsd || null,
        change24h: reportData?.change24h || null,
        exchangeNetflow: reportData?.exchangeNetflow || null,
        whaleRatio: reportData?.whaleRatio || null
      };

      const xSentiment = {
        retailFomo: reportData?.sentimentData?.retail?.fomo || 50,
        whaleBias: reportData?.sentimentData?.whale?.bias || 0
      };

      // P0 FIX: GrokとGeminiの分析を統合して最適化戦略を生成（タイムアウト対策: 条件付き実行）
      // Grok-Code-Fast-1推奨: タイムアウトリスクが高い場合は最適化処理をスキップ（60秒→30秒に短縮）
      const remainingTime = deadlineMs ? deadlineMs - Date.now() : Infinity;
      const OPTIMIZATION_TIMEOUT_MS = 15000; // 15秒
      const MIN_REMAINING_TIME_FOR_OPTIMIZATION = 30000; // P0 FIX: 30秒以上残っていれば実行（Grok推奨）

      // デフォルトでnull（最適化なし）- フォールバック処理で続行
      optimizationStrategy = null;

      if (remainingTime >= MIN_REMAINING_TIME_FOR_OPTIMIZATION) {
        // 残り時間が十分な場合のみ最適化を実行
        // P0 FIX: GPT-5-mini推奨 - optimizeContentAndFunnelにwithTimeoutを適用（既存のPromise.raceをwithTimeoutに統一）
        try {
          optimizationStrategy = await withTimeout(
            optimizeContentAndFunnel({
              currentMetrics,
              marketData,
              xSentiment,
              lang
            }),
            OPTIMIZATION_TIMEOUT_MS, // 15秒タイムアウト（既存の設定を維持）
            () =>
              console.warn(
                `[Quote Repost] ⏰ Optimization timeout after ${OPTIMIZATION_TIMEOUT_MS}ms [runId: ${langRunId}]`
              )
          );
        } catch (error) {
          console.warn(
            `[Quote Repost] ⚠️ Optimization skipped due to timeout risk: ${error.message} [runId: ${langRunId}]`
          );
          // フォールバック: optimizationStrategyをnullのままにして続行
          optimizationStrategy = null;
        }
      } else {
        // 残り時間が不足している場合は最適化をスキップ
        console.warn(
          `[Quote Repost] ⏰ Skipping optimization for ${lang} (insufficient time remaining: ${Math.round(remainingTime / 1000)}s) [runId: ${langRunId}]`
        );
        optimizationStrategy = null;
      }

      // 以降の処理でoptimizationStrategyがnullの場合、デフォルトのテンプレートを使用（FALLBACK_QUOTE_REPOST_TEMPLATES）

      if (optimizationStrategy) {
        console.log(`[Quote Repost] ✅ Content optimization strategy generated for ${lang}`);
      }
    } catch (error) {
      console.warn(
        `[Quote Repost] ⚠️ Failed to generate optimization strategy for ${lang}:`,
        error.message
      );
      // 最適化失敗時も続行（フォールバック）
      optimizationStrategy = null;
    }

    // 最適化戦略をプロンプトに反映（generateQuoteRepostTextに渡す）
    const quoteText = await generateQuoteRepostText(
      lang,
      influencerTweet,
      reportData,
      deepLink, // チェックアウトリンクまたはTelegram Deep Link
      minimalVersionPostUrl,
      minimalContent,
      optimizationStrategy, // 最適化戦略を追加
      regularBriefingWhopUrl, // Funnel 2用: 有料版（Regular Briefing）Whop URL
      minimalCheckoutUrl // 無料版（Minimal Version）チェックアウトリンク（オプション）
    );
    return quoteText;
  } catch (error) {
    console.error(`[Quote Repost] Failed to generate text with Grok for ${lang}:`, error.message);
    // フォールバック: テンプレートを使用（FALLBACK_QUOTE_REPOST_TEMPLATESを使用）
    // 重要: Minimal Version URLも取得してフォールバックテンプレートに渡す
    const dateString = new Date().toISOString().split("T")[0];
    const minimalVersionPostUrl = await getMinimalVersionPostUrl(lang, dateString).catch(
      () => null
    );

    const template =
      QUOTE_REPOST_TEMPLATES?.[lang] ||
      FALLBACK_QUOTE_REPOST_TEMPLATES[lang] ||
      FALLBACK_QUOTE_REPOST_TEMPLATES.en;
    const baseText = template(
      reportData?.trapScore || 25,
      reportData?.priceUsd || null,
      reportData?.change24h || null,
      getTelegramDeepLinkWithSource(lang, "x_quote", {
        influencerUsername: influencerTweet.username
      }),
      reportData?.exchangeNetflow || null,
      reportData?.whaleRatio || null
    );

    // Minimal Version URLが存在する場合は追加（クロスポリネーション・長文ポスト対応）
    if (minimalVersionPostUrl) {
      const minimalLinkTexts = {
        en: ` See full analysis: ${minimalVersionPostUrl}`,
        ja: ` 詳細分析: ${minimalVersionPostUrl}`,
        es: ` Ver análisis completo: ${minimalVersionPostUrl}`,
        "pt-br": ` Ver análise completa: ${minimalVersionPostUrl}`,
        ar: ` راجع التحليل الكامل: ${minimalVersionPostUrl}`,
        ko: ` 전체 분석 보기: ${minimalVersionPostUrl}`
      };
      const minimalLinkText = minimalLinkTexts[lang] || minimalLinkTexts.en;
      return baseText + minimalLinkText;
    }

    return baseText;
  }
}

/**
 * 1日の投稿数を取得（Vercel KV）
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {Promise<number>} 投稿数
 */
// getDailyPostCount と incrementDailyPostCount は services/x/optimization.js から統一実装を使用

/**
 * インフルエンサーを発掘して引用リポスト（最適化版）
 * Grok推奨: 12投稿/日、ピーク時間のみ、投稿後15-60分以内
 */
async function postQuoteRepostsForLang(
  lang,
  reportData = null,
  dailyPostCount = null,
  runId = null,
  deadlineMs = null
) {
  // P0: 言語単位で例外を握りつぶさず、どのステップで落ちたかをログに残す
  const langRunId = runId || `qr-lang-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  let currentStep = "start";

  try {
    currentStep = "initialization";
    console.log(
      `[Quote Repost] 🔵 Processing language: ${lang} [runId: ${langRunId}, step: ${currentStep}]`
    );

    const currentHour = new Date().getUTCHours();
    const dateString = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // 1日の投稿数を取得（Vercel KV）- グローバルな日次投稿数
    currentStep = "get_daily_post_count";
    if (dailyPostCount === null) {
      dailyPostCount = await getGlobalDailyPostCount(dateString);
    }

    // 🚀 数撃て作戦: 引用リポストのピーク時間を拡大（UTC 0-23の全時間帯で可能に）
    // 元のピーク時間: UTC 0,1,20,21
    // 拡大: UTC 0-23の全時間帯で投稿可能（ただし、優先度は元のピーク時間が高い）
    currentStep = "peak_time_check";
    const originalPeakHours = [0, 1, 20, 21]; // 元の優先ピーク時間
    const isOriginalPeakTime = originalPeakHours.includes(currentHour);

    // 🚀 数撃て作戦: 全時間帯で投稿可能（ただし、日次制限内で）
    // 🚀 チート級戦略: 日次上限を撤廃（Cronスケジュールで制御されているため不要）
    // 制御は以下で行う:
    // 1. Cronスケジュール（vercel.json）: 12回/日（0,2,4,6,8,10,12,14,16,18,20,22 UTC）
    // 2. インフルエンサー1人あたりの日次上限（X_MAX_DAILY_POSTS_PER_INFLUENCER）: デフォルト4回/日
    // 3. 1時間あたりの投稿数制限（X_MAX_HOURLY_POSTS）: デフォルト100/時間
    // 4. X APIレート制限（技術的制約）: Per App 10,000/24hrs
    if (!isOriginalPeakTime) {
      console.log(
        `ℹ️ Posting quote reposts for ${lang} outside original peak time (${currentHour} UTC, daily count: ${dailyPostCount}) for impression maximization [runId: ${langRunId}]`
      );
    }

    // 日次上限チェックを削除（Cronスケジュールで制御されているため不要）
    // ログ出力のみ残す（モニタリング用）
    console.log(
      `[Quote Repost] Daily post count: ${dailyPostCount} (no limit, controlled by Cron schedule) [runId: ${langRunId}]`
    );

    // 🚀 数撃て作戦: 時価配分を考慮してインフルエンサー数を取得
    currentStep = "get_influencer_count";
    const targetCount = getInfluencerCountForLang(lang, currentHour);
    const impressionTarget = getImpressionTargetForLang(lang);

    console.log(`[Quote Repost] 🔵 Step: ${currentStep} [runId: ${langRunId}]:`, {
      lang,
      currentHour,
      targetCount,
      impressionTarget: {
        min: impressionTarget.min.toLocaleString(),
        max: impressionTarget.max.toLocaleString()
      },
      isOriginalPeakTime
    });

    // ストックからインフルエンサーを取得（既存の70人ホットリストのみ使用）
    // 🔥 改善: スコアリング機能を有効にして、Webhookデータからエンゲージメント統計を取得
    currentStep = "get_influencers_from_stock";
    console.log(
      `[Quote Repost] 🔵 Step: ${currentStep} [runId: ${langRunId}]: Getting influencers from STOCK for ${lang}...`
    );

    // インフルエンサー取得は1か所に統一: KV（influencerStock.js）
    // influencerStockFromFile は廃止。ストックは /api/x-update-influencer-stock または discover-and-stock で補充
    const { getInfluencersFromStock } = require("../services/x/influencerStock");
    let influencers = await getInfluencersFromStock(lang, {
      enableScoring: false // 必要なら true でスコアリング有効
    });

    if (!influencers || influencers.length === 0) {
      console.error(
        `[Quote Repost] ❌❌❌ CRITICAL: No influencers in stock for ${lang} - ZERO DELIVERIES [runId: ${langRunId}, step: ${currentStep}]`
      );
      console.error(
        `[Quote Repost] 💡 ACTION REQUIRED: Run /api/x-update-influencer-stock?lang=${lang} or execute discover-and-stock-influencers-840.js`
      );
      return [];
    }

    // CRITICAL: tweetIdの検証（引用リポストに必須）
    const validInfluencers = influencers.filter((inf) => {
      if (!inf.tweetId) {
        console.error(
          `[Quote Repost] ❌ CRITICAL: Influencer @${inf.username || "unknown"} has no tweetId - cannot quote repost`
        );
        return false;
      }
      const tweetIdStr = String(inf.tweetId).trim();
      if (!/^\d{18,19}$/.test(tweetIdStr)) {
        console.error(
          `[Quote Repost] ❌ CRITICAL: Invalid tweetId format: ${tweetIdStr} for @${inf.username || "unknown"}`
        );
        return false;
      }
      return true;
    });

    if (validInfluencers.length === 0) {
      console.error(
        `[Quote Repost] ❌❌❌ CRITICAL: All influencers in stock for ${lang} have invalid tweetIds - ZERO DELIVERIES [runId: ${langRunId}, step: ${currentStep}]`
      );
      console.error(
        `[Quote Repost] 💡 ACTION REQUIRED: Rebuild stock with valid tweetIds using discover-and-stock-influencers-840.js`
      );
      return [];
    }

    if (validInfluencers.length < influencers.length) {
      console.warn(
        `[Quote Repost] ⚠️ Filtered out ${influencers.length - validInfluencers.length} influencers with invalid tweetIds [runId: ${langRunId}]`
      );
    }

    console.log(
      `[Quote Repost] ✅ Retrieved ${validInfluencers.length} VALID influencers from STOCK for ${lang} (with valid tweetIds) [runId: ${langRunId}, step: ${currentStep}]`
    );

    // 検証済みインフルエンサーを使用
    influencers = validInfluencers;

    // 🔒 追加の言語整合性チェック: ストックから取得したインフルエンサーの言語を検証
    const langMismatched = influencers.filter(
      (inf) => inf.lang && inf.lang.toLowerCase() !== lang.toLowerCase()
    );
    if (langMismatched.length > 0) {
      console.error(
        `[Quote Repost] ⚠️⚠️⚠️ Found ${langMismatched.length} influencers with language mismatch in stock for ${lang}:`,
        langMismatched.map((inf) => `@${inf.username} (lang: ${inf.lang})`)
      );
      // 言語不一致のインフルエンサーを除外
      influencers = influencers.filter(
        (inf) => !inf.lang || inf.lang.toLowerCase() === lang.toLowerCase()
      );
      console.log(
        `[Quote Repost] ✅ Filtered to ${influencers.length} influencers with correct language (${lang})`
      );
    }

    // langフィールドがないインフルエンサーにlangを設定
    influencers = influencers.map((inf) => ({
      ...inf,
      lang: inf.lang || lang // langフィールドがない場合は現在の言語を設定
    }));

    // スコアリングが有効な場合、スコア情報をログに出力
    if (influencers[0]?.score !== undefined) {
      const topScorers = influencers.slice(0, 5).map((inf) => ({
        username: inf.username,
        score: inf.score?.toFixed(2),
        engagementRate: ((inf.engagementRate || 0) * 100).toFixed(2) + "%",
        impressions: (inf.recentImpressions || 0).toLocaleString()
      }));
      console.log(`[Quote Repost] 📊 Top 5 influencers by score:`, topScorers);
    }

    // 🚀 数撃て作戦: ローテーション機能を使用してインフルエンサーを選択
    // 今日既に投稿した人を除外し、ローテーション順に選択
    currentStep = "rotation_selection";

    // P1: ローテーション選択の直前で候補数・除外内訳をログ化
    console.log(
      `[Quote Repost] 🔵 Step: ${currentStep} [runId: ${langRunId}]: Before rotation selection:`,
      {
        lang,
        candidateCount: influencers.length,
        targetCount,
        timestamp: new Date().toISOString()
      }
    );

    const { selectInfluencersWithRotation } = require("../services/x/influencerRotation");
    let selectedInfluencers = await selectInfluencersWithRotation(
      influencers,
      lang,
      targetCount,
      dateString
    );

    // P1: ローテーション選択の直後で選定数をログ化
    console.log(
      `[Quote Repost] 🔵 Step: ${currentStep} [runId: ${langRunId}]: Rotation selection result:`,
      {
        lang,
        selectedCount: selectedInfluencers?.length || 0,
        targetCount,
        excludedCount: influencers.length - (selectedInfluencers?.length || 0),
        timestamp: new Date().toISOString()
      }
    );

    // ローテーションで選択できなかった場合、フォールバックとして従来の方法を使用
    if (!selectedInfluencers || selectedInfluencers.length === 0) {
      console.warn(
        `[Quote Repost] ⚠️ Rotation selection failed, falling back to impression target selection [runId: ${langRunId}, step: ${currentStep}]`
      );
      currentStep = "fallback_selection";

      // 🔒 言語整合性チェック: フォールバック選択前に言語不一致のインフルエンサーを除外
      const langFiltered = influencers.filter(
        (inf) => !inf.lang || inf.lang.toLowerCase() === lang.toLowerCase()
      );
      if (langFiltered.length < influencers.length) {
        const filteredCount = influencers.length - langFiltered.length;
        console.warn(
          `[Quote Repost] ⚠️ Filtered out ${filteredCount} influencers with language mismatch before fallback selection [runId: ${langRunId}]`
        );
      }

      const fallbackSelected = selectInfluencersForImpressionTarget(langFiltered, lang);
      // 🔧 修正: selectedInfluencersがnullまたはundefinedの場合、空配列で初期化
      selectedInfluencers = fallbackSelected.slice(0, targetCount);

      console.log(
        `[Quote Repost] 🔵 Step: ${currentStep} [runId: ${langRunId}]: Fallback selection result:`,
        {
          lang,
          selectedCount: selectedInfluencers.length,
          targetCount,
          filteredCount: influencers.length - langFiltered.length,
          timestamp: new Date().toISOString()
        }
      );
    }

    console.log(
      `[Quote Repost] ✅ Selected ${selectedInfluencers.length} influencers for ${lang} (target: ${targetCount})`
    );
    console.log(`[Quote Repost] 📋 Source: STOCK LIST (高品質リストから選択)`);
    const totalImpressions = selectedInfluencers.reduce(
      (sum, inf) => sum + (inf.recentImpressions || 0),
      0
    );
    console.log(
      `[Quote Repost] 📊 Total estimated impressions: ${totalImpressions.toLocaleString()} (target: ${impressionTarget.min.toLocaleString()}-${impressionTarget.max.toLocaleString()})`
    );

    selectedInfluencers.forEach((inf, idx) => {
      console.log(
        `[Quote Repost]   [${idx + 1}] @${inf.username} - tweetId: ${inf.tweetId || "MISSING"}, impressions: ${(inf.recentImpressions || 0).toLocaleString()}, engagement: ${((inf.engagementRate || 0) * 100).toFixed(2)}%`
      );
    });

    // CRITICAL: ストックリストからの選択をログに記録
    try {
      const { logPostSuccess } = require("../services/core/postLogger");
      await logPostSuccess({
        postType: "quote_repost_selection",
        lang,
        selectedCount: selectedInfluencers.length,
        targetCount,
        totalEstimatedImpressions: totalImpressions,
        source: "stock_list",
        influencers: selectedInfluencers.map((inf) => ({
          username: inf.username,
          tweetId: inf.tweetId,
          impressions: inf.recentImpressions || 0,
          engagementRate: inf.engagementRate || 0
        })),
        dateString: dateString
      });
    } catch (logError) {
      console.warn(`[Quote Repost] ⚠️ Failed to log selection to KV:`, logError.message);
    }

    // 🔍 デバッグ: influencers変数の代入前にログを記録
    currentStep = "assign_influencers";
    console.log(
      `[Quote Repost] 🔵 Step: ${currentStep} [runId: ${langRunId}]: About to assign selectedInfluencers to influencers:`,
      {
        lang,
        influencersLength: influencers.length,
        selectedInfluencersLength: selectedInfluencers.length,
        timestamp: new Date().toISOString()
      }
    );

    // 選択されたインフルエンサーを使用
    influencers = selectedInfluencers;

    // 🔍 デバッグ: influencers変数の代入後にログを記録
    console.log(
      `[Quote Repost] 🔵 Step: ${currentStep} [runId: ${langRunId}]: Successfully assigned influencers:`,
      {
        lang,
        influencersLength: influencers.length,
        timestamp: new Date().toISOString()
      }
    );

    // P0: 8時間クールダウンチェック + 日次上限チェック（Grok + Gemini + GPT-5.2推奨）
    currentStep = "cooldown_filter";
    const filteredInfluencers = [];

    // 日次上限設定（環境変数から取得、デフォルト: 4回/日）
    // 🚀 298投稿/日達成のため: 70人で平均4.3回/日が必要
    // 8時間クールダウンにより実質的には最大3回/日が上限だが、ローテーションにより平均4.3回/日を達成可能
    const maxDailyPostsPerInfluencer = parseInt(
      process.env.X_MAX_DAILY_POSTS_PER_INFLUENCER || "4",
      10
    );

    for (const inf of influencers) {
      const username = (inf.username || inf.userId || inf.id || "").replace(/^@/, "");
      if (!username) {
        console.warn(`[Quote Repost] ⚠️ Influencer missing username, skipping:`, inf);
        continue;
      }

      // クールダウンチェック（言語別に調整: ENは6時間、その他は8時間）
      // 🚀 824人ストックを最大限活用するため、ENのクールダウンを短縮
      const cooldownHours = lang.toLowerCase() === "en" ? 6 : 8;
      const inCooldown = await isInCooldown(lang, username, cooldownHours);
      if (inCooldown) {
        console.log(
          `[Quote Repost] ⏰ Skipping @${username} (${lang}): in ${cooldownHours}h cooldown [runId: ${langRunId}]`
        );
        continue;
      }

      // 日次上限チェック（298投稿/日達成のため: 1人あたり最大4回/日）
      // 8時間クールダウンにより実質的には最大3回/日が上限だが、ローテーションにより平均4.3回/日を達成可能
      // インフルエンサー別の日次投稿数を取得
      const currentInfluencerDailyCount = await getDailyPostCountForInfluencer(
        lang,
        username,
        dateString
      );
      const reachedLimit = currentInfluencerDailyCount >= maxDailyPostsPerInfluencer;
      if (reachedLimit) {
        console.log(
          `[Quote Repost] ⚠️ Skipping @${username} (${lang}): reached daily limit (${maxDailyPostsPerInfluencer} posts/day) [runId: ${langRunId}]`
        );
        continue;
      }

      filteredInfluencers.push(inf);
    }

    // フィルタで0件なら、その言語はスキップ（=条件付き実行）
    if (filteredInfluencers.length === 0) {
      console.log(
        `[Quote Repost] ⏰ All influencers for ${lang} are in cooldown, skipping [runId: ${langRunId}]`
      );
      return []; // continueはループ内でのみ使用可能。関数内ではreturnを使用
    }

    // フィルタ後のインフルエンサーを使用
    influencers = filteredInfluencers;
    console.log(
      `[Quote Repost] ✅ After cooldown filter: ${influencers.length} influencers available for ${lang} [runId: ${langRunId}]`
    );

    // インフルエンサーをリストに追加（リスト管理）
    for (const influencer of influencers) {
      // 注意: influencerList機能は削除されました（エンドユーザー追跡機能の削除のため）
      // try {
      //   await addInfluencerToList({
      //     ...influencer,
      //     lang,
      //   });
      // } catch (error) {
      //   console.warn(`[Quote Repost] Failed to add influencer to list:`, error.message);
      // }
    }

    const results = [];

    // P1 FIX: 重複投稿防止の最適化（言語処理の最初に1回だけ取得）
    currentStep = "duplicate_check_prep";
    let recentPostsSet = null;
    try {
      const { getPostsForLastNDays } = require("../services/x/postTracker");
      const recentPosts = await getPostsForLastNDays(1); // 過去24時間の投稿を取得
      // Setで高速検索可能にする
      recentPostsSet = new Set(
        recentPosts
          .filter((post) => post.postType === "quote_repost" && post.lang === lang)
          .map((post) => `${post.influencerTweetId || post.tweetId}`)
      );
      console.log(
        `[Quote Repost] 🔵 Step: ${currentStep} [runId: ${langRunId}]: Loaded ${recentPostsSet.size} recent posts for duplicate check`
      );
    } catch (dedupeError) {
      console.warn(
        `[Quote Repost] ⚠️ Failed to load recent posts for duplicate check (non-fatal):`,
        dedupeError.message
      );
      recentPostsSet = null; // エラー時は重複チェックをスキップ
    }

    // 🔍 デバッグ: ループ開始前にログを記録
    currentStep = "influencer_loop_start";
    console.log(
      `[Quote Repost] 🔵 Step: ${currentStep} [runId: ${langRunId}]: Starting influencer loop:`,
      {
        lang,
        influencersCount: influencers.length,
        maxInfluencers: targetCount,
        timestamp: new Date().toISOString()
      }
    );

    // Grok推奨: ENは4本/日、その他は2本/日（言語別インフルエンサー数に基づく）
    // P0 FIX: タイムアウト対策 - ENの処理数を制限（35人 → 最大10人に制限）
    // これにより、処理時間を35人 × 10秒 = 350秒 → 10人 × 10秒 = 100秒に短縮
    // さらに早期リターンで実際の処理数をさらに減らす（60秒制限を考慮）
    let maxInfluencers = targetCount; // EN: 35, その他: 2-20
    if (lang.toLowerCase() === "en" && maxInfluencers > 10) {
      console.warn(
        `[Quote Repost] ⚠️ Limiting EN influencers from ${maxInfluencers} to 10 to prevent timeout [runId: ${langRunId}]`
      );
      maxInfluencers = 10; // ENは最大10人に制限（タイムアウト対策）
    }

    for (const influencer of influencers.slice(0, maxInfluencers)) {
      // P0 FIX: 各インフルエンサー処理の開始時にタイムアウトチェック（残り15秒未満の場合は早期リターン）
      // ENの処理数が多いため、より早めにリターンしてタイムアウトを防ぐ
      if (deadlineMs && Date.now() >= deadlineMs - 15000) {
        const remainingTime = Math.round((deadlineMs - Date.now()) / 1000);
        console.warn(
          `[Quote Repost] ⏰ Early return: insufficient time remaining (${remainingTime}s) for remaining influencers [runId: ${langRunId}]`
        );
        console.log(
          `[Quote Repost] 📊 Processed ${results.length} influencers before timeout [runId: ${langRunId}]`
        );
        break; // ループを抜けて既存の結果を返す
      }

      // 🔍 デバッグ: 各インフルエンサーの処理開始時にログを記録
      currentStep = "processing_influencer";
      console.log(
        `[Quote Repost] 🔵 Step: ${currentStep} [runId: ${langRunId}]: Processing influencer:`,
        {
          lang,
          influencer: influencer.username,
          tweetId: influencer.tweetId,
          remainingTime: deadlineMs ? Math.round((deadlineMs - Date.now()) / 1000) : "unlimited",
          timestamp: new Date().toISOString()
        }
      );
      try {
        // 🔒 言語整合性検証: インフルエンサーの言語が投稿言語と一致しているか確認
        currentStep = "language_verification";

        // langフィールドがない場合の警告
        if (!influencer.lang) {
          console.warn(
            `[Quote Repost] ⚠️ WARNING: @${influencer.username} has no lang field, assuming lang=${lang} from KV key [runId: ${langRunId}, step: ${currentStep}]`
          );
          // langフィールドを設定（後続処理で使用）
          influencer.lang = lang;
        }

        // 言語不一致のチェック（厳格）
        if (influencer.lang && influencer.lang.toLowerCase() !== lang.toLowerCase()) {
          console.error(
            `[Quote Repost] ⚠️⚠️⚠️ LANGUAGE MISMATCH: Skipping @${influencer.username} - influencer lang (${influencer.lang}) does not match post lang (${lang}) [runId: ${langRunId}, step: ${currentStep}]`
          );
          continue;
        }

        // 最終確認: langフィールドを確実に設定
        influencer.lang = lang;

        // CRITICAL: tweetIdが必須（引用リポストに必要）
        currentStep = "tweet_id_check";
        if (!influencer.tweetId) {
          console.error(
            `[Quote Repost] ❌ CRITICAL: Skipping influencer @${influencer.username}: no tweetId - CANNOT QUOTE REPOST [runId: ${langRunId}, step: ${currentStep}]`
          );
          continue;
        }

        // tweetIdの形式検証（18-19桁の数値）
        const tweetIdStr = String(influencer.tweetId).trim();
        if (!/^\d{18,19}$/.test(tweetIdStr)) {
          console.error(
            `[Quote Repost] ❌ CRITICAL: Invalid tweetId format: ${tweetIdStr} for @${influencer.username} - CANNOT QUOTE REPOST [runId: ${langRunId}, step: ${currentStep}]`
          );
          continue;
        }

        // tweetIdを正規化
        influencer.tweetId = tweetIdStr;

        // P1 FIX: 重複投稿防止の最適化（メモリ上のSetで高速チェック）
        currentStep = "duplicate_check";
        if (recentPostsSet && recentPostsSet.has(String(influencer.tweetId))) {
          console.log(
            `⏰ Skipping quote repost for @${influencer.username} (already posted tweetId: ${influencer.tweetId} in last 24h) [runId: ${langRunId}, step: ${currentStep}]`
          );
          continue;
        }

        // インフルエンサーの投稿時刻を取得（tweetTextから推測、またはAPIから取得）
        // 注意: Grok APIから返されるinfluencerオブジェクトにはcreatedAtが含まれていない可能性がある
        // その場合、shouldPostQuoteRepost関数内で適切に処理される（ピーク時間であれば投稿を許可）
        currentStep = "timing_check";
        const influencerTweetTime =
          influencer.createdAt || new Date(Date.now() - 15 * 60 * 1000).toISOString(); // デフォルト: 15分前（10-20分の範囲内）

        // 最適なタイミングかチェック（修正: タイミングチェックを緩和）
        // 重要: インフルエンサーへの投稿ロジックを変更して回数を増やしたため、
        // タイミングチェックを緩和してX APIのクレジットが実際に使用されるようにする
        const shouldPost = shouldPostQuoteRepost(influencerTweetTime);
        if (!shouldPost) {
          console.log(
            `⏰ Skipping quote repost for @${influencer.username} (not optimal timing: ${influencerTweetTime}, current hour: ${new Date().getUTCHours()}) [runId: ${langRunId}, step: ${currentStep}]`
          );
          continue;
        }
        console.log(
          `[Quote Repost] ✅ Timing check passed for @${influencer.username} (tweet time: ${influencerTweetTime}) [runId: ${langRunId}, step: ${currentStep}]`
        );

        // インプレッション規模チェック（言語別の目標を考慮）
        // 重要: impressions が 0 のときは「メトリクス未取得」とみなし投稿を許可する。0 でスキップしない。
        currentStep = "impression_check";
        const impressions = Number(influencer.recentImpressions) || 0;
        const minImpressions = Math.max(impressionTarget.min * 0.3, 10000);

        if (impressions === 0) {
          console.log(
            `[Quote Repost] ⚠️ @${influencer.username} has no impression data (0) - allowing post [runId: ${langRunId}]`
          );
        } else if (impressions < minImpressions) {
          console.log(
            `⏰ Skipping quote repost for @${influencer.username} (low impressions: ${impressions.toLocaleString()}, min: ${minImpressions.toLocaleString()}) [runId: ${langRunId}, step: ${currentStep}]`
          );
          continue;
        }

        console.log(
          `[Quote Repost] ✅ @${influencer.username} meets impression target: ${impressions.toLocaleString()} (target: ${impressionTarget.min.toLocaleString()}-${impressionTarget.max.toLocaleString()}) [runId: ${langRunId}, step: ${currentStep}]`
        );

        // P0 FIX: タイムアウトチェック（残り時間が10秒未満の場合はスキップ）- 早期リターンを強化
        if (deadlineMs && Date.now() >= deadlineMs - 10000) {
          console.warn(
            `[Quote Repost] ⏰ Skipping quote repost for @${influencer.username} (insufficient time remaining, deadline: ${new Date(deadlineMs).toISOString()}) [runId: ${langRunId}, step: ${currentStep}]`
          );
          results.push({
            lang,
            influencer: influencer.username,
            tweetId: influencer.tweetId,
            success: false,
            actuallyPosted: false,
            error: "Timeout: insufficient time remaining",
            skipped: true
          });
          continue;
        }

        // Grokが引用リポスト用のテキストを生成（Xアルゴリズム最適化版）
        currentStep = "text_generation";

        // P0 FIX: dry-runモードの場合はGrok APIを呼ばずにテンプレートを使用（タイムアウト回避）
        const xStatusForTextGen = getXConfigStatus();
        const isDryRun = xStatusForTextGen.dryRun;
        const useMinimalRegularTemplates = parseBoolean(
          process.env.QUOTE_REPOST_USE_MINIMAL_REGULAR_TEMPLATES,
          false
        );

        let quoteText;
        let funnelTypeUsed = null;
        if (useMinimalRegularTemplates) {
          // Minimal/Regular 交互ローテーション（Grok×Gemini 分析統合）
          const { nextType } = await getNextQuoteFunnelType(lang, influencer.username);
          funnelTypeUsed = nextType;
          const variants =
            nextType === FUNNEL_TYPES.MINIMAL_OPTIN
              ? MINIMAL_OPTIN_VARIANTS
              : REGULAR_OPTIN_VARIANTS;
          const variant = variants[Math.floor(Math.random() * variants.length)];
          if (nextType === FUNNEL_TYPES.MINIMAL_OPTIN) {
            quoteText = getMinimalOptinQuoteTemplate(lang, {
              variant,
              influencerUsername: influencer.username
            });
          } else {
            quoteText = getRegularOptinQuoteTemplate(lang, {
              variant,
              influencerUsername: influencer.username
            });
          }
          // Xプレミアム長文ポスト対応のため 280 文字トリムは廃止（最大25,000文字まで可）
          console.log(
            `[Quote Repost] 📌 Minimal/Regular rotation: @${influencer.username} -> ${nextType} (variant ${variant}) [runId: ${langRunId}]`
          );
        } else if (isDryRun) {
          // P0 FIX: dry-runモード: 超高速フォールバックテキストを使用（すべてのAPI呼び出しをスキップ）
          console.log(
            `[Quote Repost] 🧪 Dry-run mode: Using ultra-fast fallback text for @${influencer.username} (skipping all API calls) [runId: ${langRunId}]`
          );
          // 最小限のテキストを生成（API呼び出しなし、KVアクセスなし）
          const deepLink = getTelegramDeepLinkWithSource(lang, "x_quote", {
            influencerUsername: influencer.username,
            utm_content: `influencer_${influencer.username}`
          });
          const trapScore = reportData?.trapScore || 25;
          const priceUsd = reportData?.priceUsd || 89000;

          // 言語別の超シンプルなテキスト（dry-run用・長文ポスト対応）
          const dryRunTexts = {
            en: `🚨 Trap Score: ${trapScore}/100\n\nBTC: $${Math.floor(priceUsd).toLocaleString()}\n\nGet FREE analysis:\n${deepLink}\n\n#BTC #TrapDefence`,
            ja: `🚨 トラップスコア: ${trapScore}/100\n\nBTC: $${Math.floor(priceUsd).toLocaleString()}\n\n無料分析を取得:\n${deepLink}\n\n#BTC #TrapDefence`,
            es: `🚨 Trap Score: ${trapScore}/100\n\nBTC: $${Math.floor(priceUsd).toLocaleString()}\n\nObtén análisis GRATIS:\n${deepLink}\n\n#BTC #TrapDefence`,
            "pt-br": `🚨 Trap Score: ${trapScore}/100\n\nBTC: $${Math.floor(priceUsd).toLocaleString()}\n\nObtenha análise GRÁTIS:\n${deepLink}\n\n#BTC #TrapDefence`,
            ar: `🚨 Trap Score: ${trapScore}/100\n\nBTC: $${Math.floor(priceUsd).toLocaleString()}\n\nاحصل على تحليل مجاني:\n${deepLink}\n\n#BTC #TrapDefence`,
            ko: `🚨 Trap Score: ${trapScore}/100\n\nBTC: $${Math.floor(priceUsd).toLocaleString()}\n\n무료 분석 받기:\n${deepLink}\n\n#BTC #TrapDefence`
          };
          quoteText = dryRunTexts[lang] || dryRunTexts.en;
        } else {
          // 通常モード: Grok APIを使用
          // P0 FIX: テキスト生成前にタイムアウトチェック（Grok API呼び出しは最大20秒かかるため、残り25秒以上必要）
          if (deadlineMs && Date.now() >= deadlineMs - 25000) {
            console.warn(
              `[Quote Repost] ⏰ Skipping text generation for @${influencer.username} (insufficient time remaining for Grok API, deadline: ${new Date(deadlineMs).toISOString()}) [runId: ${langRunId}, step: ${currentStep}]`
            );
            results.push({
              lang,
              influencer: influencer.username,
              tweetId: influencer.tweetId,
              success: false,
              actuallyPosted: false,
              error: "Timeout: insufficient time remaining for text generation",
              skipped: true
            });
            continue;
          }

          try {
            // P0 FIX: GPT-5-mini推奨 - generateQuoteRepostTextWithGrokに10秒のタイムアウトを設定
            quoteText = await withTimeout(
              generateQuoteRepostTextWithGrok(lang, influencer, reportData, deadlineMs, langRunId),
              10000, // 10秒タイムアウト（GPT-5-mini推奨: テキスト生成は最大10s待つ）
              () =>
                console.warn(
                  `[Quote Repost] ⏰ generateQuoteRepostTextWithGrok timeout after 10s for @${influencer.username} [runId: ${langRunId}]`
                )
            );
          } catch (error) {
            // フォールバック: Xアルゴリズム最適化版テンプレートを使用
            // 重要: Minimal Version URLも取得してフォールバックテンプレートに渡す
            const dateString = new Date().toISOString().split("T")[0];
            const minimalVersionPostUrl = await getMinimalVersionPostUrl(lang, dateString).catch(
              () => null
            );

            const template =
              QUOTE_REPOST_TEMPLATES?.[lang] ||
              FALLBACK_QUOTE_REPOST_TEMPLATES[lang] ||
              FALLBACK_QUOTE_REPOST_TEMPLATES.en;
            const {
              trapScore = 25,
              priceUsd = null,
              change24h = null,
              exchangeNetflow = null,
              whaleRatio = null
            } = reportData || {};
            const baseText = template(
              trapScore,
              priceUsd,
              change24h,
              getTelegramDeepLinkWithSource(lang, "x_quote", {
                influencerUsername: influencer.username,
                utm_content: `influencer_${influencer.username}`
              }),
              exchangeNetflow,
              whaleRatio
            );

            // Minimal Version URLが存在する場合は追加（クロスポリネーション・長文ポスト対応）
            if (minimalVersionPostUrl) {
              const minimalLinkTexts = {
                en: ` See full analysis: ${minimalVersionPostUrl}`,
                ja: ` 詳細分析: ${minimalVersionPostUrl}`,
                es: ` Ver análisis completo: ${minimalVersionPostUrl}`,
                "pt-br": ` Ver análise completa: ${minimalVersionPostUrl}`,
                ar: ` راجع التحليل الكامل: ${minimalVersionPostUrl}`,
                ko: ` 전체 분석 보기: ${minimalVersionPostUrl}`
              };
              const minimalLinkText = minimalLinkTexts[lang] || minimalLinkTexts.en;
              quoteText = baseText + minimalLinkText;
            } else {
              quoteText = baseText;
            }
          }
        }

        // P0 FIX: dry-runモードではソーシャルプルーフとハッシュタグ取得をスキップ（高速化）
        // Minimal/Regular テンプレ使用時はソーシャルプルーフを追加しない（テンプレ本文をそのまま使用）
        if (!isDryRun && !funnelTypeUsed) {
          // Phase 1: ソーシャルプルーフを追加（インプレッション最大化）
          try {
            const { getSocialProofText } = require("../services/telegram/reaction-counter");
            const socialProofText = await getSocialProofText(lang);
            const shortSocialProof = socialProofText.replace(" Traders Saved Today", " Saved");
            quoteText = `${quoteText} ${shortSocialProof}`;
            console.log(`[Quote Repost] ✅ Added social proof: ${shortSocialProof}`);
          } catch (error) {
            console.warn(`[Quote Repost] Failed to add social proof for ${lang}:`, error.message);
            // エラー時はソーシャルプルーフなしで続行
          }

          // Grok推奨: ハッシュタグを動的取得（トレンド1+ニッチ2）
          // P0 FIX: タイムアウト対策 - 残り時間が10秒未満の場合はスキップ
          if (deadlineMs && Date.now() >= deadlineMs - 10000) {
            console.warn(
              `[Quote Repost] ⏰ Skipping hashtag optimization (insufficient time remaining) [runId: ${langRunId}]`
            );
          } else {
            try {
              const { getTrendyHashtags } = require("../services/x/optimization");
              const optimizedHashtags = await getTrendyHashtags(lang, "BTC").catch(() =>
                getOptimizedHashtags(lang)
              );
              if (quoteText.includes("#BTC") || quoteText.includes("#Bitcoin")) {
                // 動的ハッシュタグで置換
                const hashtagStr = Array.isArray(optimizedHashtags)
                  ? optimizedHashtags.join(" ")
                  : optimizedHashtags;
                quoteText = quoteText.replace(/#(?:BTC|Bitcoin).*#TrapDefence/g, hashtagStr);
              }
            } catch (error) {
              console.warn(
                `[Quote Repost] Failed to get trendy hashtags for ${lang}:`,
                error.message
              );
              // エラー時はハッシュタグなしで続行
            }
          }
        } else {
          console.log(
            `[Quote Repost] 🧪 Dry-run mode: Skipping social proof and hashtag optimization for speed [runId: ${langRunId}]`
          );
        }

        // 前担当者による 140/280 文字制限は廃止。長文ポスト（最大25,000文字）対応のためトリムしない。

        // 引用リポストを投稿
        console.log(
          `[Quote Repost] 🚀 ACTUALLY POSTING quote repost for @${influencer.username} (tweetId: ${influencer.tweetId})...`
        );
        console.log(`[Quote Repost] Quote text preview: ${quoteText.substring(0, 100)}...`);
        console.log(`[Quote Repost] Quote text full length: ${quoteText.length} characters`);
        console.log(`[Quote Repost] Quote text full content: ${quoteText}`);

        // P1 FIX: X APIの呼び出し前にログを完璧化
        // 重要: X API設定を再確認（dryRunやpostingEnabledが変更されている可能性がある）
        currentStep = "before_x_api_call";
        const xStatusBeforePost = getXConfigStatus();
        console.log(
          `[Quote Repost] 🔵 Step: ${currentStep} [runId: ${langRunId}]: About to call postQuoteTweet:`,
          {
            lang,
            influencer: influencer.username,
            tweetId: influencer.tweetId,
            textLength: quoteText.length,
            postingEnabled: xStatusBeforePost.postingEnabled,
            dryRun: xStatusBeforePost.dryRun,
            configured: xStatusBeforePost.configured,
            timestamp: new Date().toISOString(),
            xApiConfigured: xStatusBeforePost.configured,
            xApiPostingEnabled: xStatusBeforePost.postingEnabled,
            xApiDryRun: xStatusBeforePost.dryRun
          }
        );

        // X API設定の最終チェック（dryRunやpostingEnabledが変更されている可能性がある）
        if (!xStatusBeforePost.postingEnabled) {
          console.error(
            `[Quote Repost] ❌ X posting disabled before postQuoteTweet call (X_POSTING_ENABLED=${process.env.X_POSTING_ENABLED})`
          );
          continue;
        }

        if (xStatusBeforePost.dryRun) {
          console.log(
            `[Quote Repost] 🧪 X dry-run enabled, skipping actual post for @${influencer.username}`
          );
          // ドライランの場合は、成功として扱うが実際には投稿しない
          results.push({
            success: true,
            dryRun: true,
            lang,
            influencer: influencer.username,
            tweetId: influencer.tweetId
          });
          continue;
        }

        if (!xStatusBeforePost.configured) {
          console.error(
            `[Quote Repost] ❌ X API not configured before postQuoteTweet call (missing: ${xStatusBeforePost.missing.join(", ")})`
          );
          continue;
        }

        let result;
        try {
          // 長文ポスト対応: 引用リポストも25,000文字まで可能（client側でAPI上限のみトリム）

          // 🔒 投稿前の最終言語整合性チェック（二重チェック）
          currentStep = "final_language_check";
          const finalLang = influencer.lang || lang;
          if (finalLang.toLowerCase() !== lang.toLowerCase()) {
            console.error(
              `[Quote Repost] ⚠️⚠️⚠️ FINAL LANGUAGE MISMATCH: Aborting post for @${influencer.username} - influencer lang (${finalLang}) does not match post lang (${lang}) [runId: ${langRunId}, step: ${currentStep}]`
            );
            throw new Error(
              `Language mismatch: influencer lang (${finalLang}) does not match post lang (${lang})`
            );
          }

          currentStep = "x_api_call";
          console.log(
            `[Quote Repost] 🚀 Step: ${currentStep} [runId: ${langRunId}]: CALLING postQuoteTweet for @${influencer.username} (lang=${lang}, verified)...`
          );
          // P0 FIX: GPT-5-mini推奨 - postQuoteTweetに8秒のタイムアウトを設定
          try {
            result = await withTimeout(
              postQuoteTweet(quoteText, influencer.tweetId),
              8000, // 8秒タイムアウト（GPT-5-mini推奨）
              () =>
                console.warn(
                  `[Quote Repost] ⏰ postQuoteTweet timeout after 8s for @${influencer.username} [runId: ${langRunId}]`
                )
            );
          } catch (err) {
            console.error(
              `[Quote Repost] ❌ postQuoteTweet failed or timed out for @${influencer.username}:`,
              err.message
            );
            // フォールバック戦略: エラーでも次の投稿を試みる（重要: エラーを投げて全体停止させない）
            continue;
          }

          // P1 FIX: 投稿成功後のログを完璧化（tweet IDを必ず記録）
          currentStep = "post_success";
          if (!result || !result.id) {
            throw new Error(`Invalid response from postQuoteTweet: ${JSON.stringify(result)}`);
          }

          // P1-2対応: 投稿成功（X API成功レスポンス取得）後にのみ記録を実行
          console.log(
            `[Quote Repost] ✅✅✅ SUCCESSFULLY POSTED quote repost [runId: ${langRunId}, step: ${currentStep}]:`,
            {
              lang,
              influencer: influencer.username,
              quoteTweetId: result.id,
              originalTweetId: influencer.tweetId,
              textLength: quoteText.length,
              utcHour: new Date().getUTCHours(),
              timestamp: new Date().toISOString(),
              xApiCreditUsed: true // X APIクレジットが使用されたことを明示
            }
          );

          // 🔒 X APIコストを記録（KVストレージ）
          try {
            const { recordCost } = require("../services/x/costTracker");
            await recordCost("post", 1, {
              lang,
              jobId: "x-quote-repost",
              influencer: influencer.username,
              quoteTweetId: result.id,
              originalTweetId: influencer.tweetId
            });
          } catch (costError) {
            console.warn(`[Quote Repost] ⚠️ Failed to record cost:`, costError.message);
            // コスト記録の失敗は投稿成功に影響しない
          }

          // P1-2対応: 投稿成功後にのみローテーション管理とクールダウン記録を実行
          // 🚀 数撃て作戦: ローテーション管理 - 投稿済みとしてマーク
          try {
            const { markInfluencerPosted } = require("../services/x/influencerRotation");
            await markInfluencerPosted(lang, influencer.username, dateString);
          } catch (rotationError) {
            console.warn(
              `[Quote Repost] ⚠️ Failed to mark influencer as posted (non-fatal):`,
              rotationError.message
            );
          }

          // P0: 8時間クールダウン用の最終投稿時刻を記録（Grok + Gemini + GPT-5.2推奨）
          // P1-2対応: 投稿成功後にのみ記録（失敗時は記録しない）
          try {
            await markLastPostedAt(lang, influencer.username, new Date());
          } catch (cooldownError) {
            console.warn(
              `[Quote Repost] ⚠️ Failed to mark last posted at (non-fatal):`,
              cooldownError.message
            );
            // エラーでも投稿は成功扱い（可用性優先）
          }

          // P0: インフルエンサー別の日次投稿数をインクリメント（Grok + Gemini + GPT-5.2推奨: 1人あたり4回/日上限）
          try {
            await incrementDailyPostCountForInfluencer(lang, influencer.username, dateString);
          } catch (dailyLimitError) {
            console.warn(
              `[Quote Repost] ⚠️ Failed to increment influencer daily post count (non-fatal):`,
              dailyLimitError.message
            );
            // エラーでも投稿は成功扱い（可用性優先）
          }

          // 🔥 改善: ツイートIDとインフルエンサーIDの関連を保存（WebhookでインフルエンサーID別の集計に使用）
          // P1推奨実装: influencerPerformanceモジュールのsetInfluencerMappingを使用
          try {
            if (result.id) {
              const { setInfluencerMapping } = require("../services/x/influencerPerformance");
              await setInfluencerMapping(result.id, {
                username: influencer.username,
                influencerUsername: influencer.username,
                lang,
                postType: "quote_repost",
                postedAt: new Date().toISOString()
              });
              console.log(
                `[Quote Repost] ✅ Saved influencer mapping: tweetId=${result.id} -> @${influencer.username}`
              );
            }
          } catch (mappingError) {
            console.warn(
              `[Quote Repost] ⚠️ Failed to save influencer mapping:`,
              mappingError.message
            );
          }

          // CRITICAL: KVストレージに構造化ログを記録（確実な証拠）
          try {
            const { logPostSuccess } = require("../services/core/postLogger");
            await logPostSuccess({
              postType: "quote_repost",
              quoteTweetId: result.id,
              originalTweetId: influencer.tweetId,
              lang,
              influencerUsername: influencer.username,
              influencerTweetId: influencer.tweetId,
              estimatedImpressions: influencer.recentImpressions || 0,
              engagementRate: influencer.engagementRate || 0,
              quoteText: quoteText.substring(0, 200), // 最初の200文字のみ保存
              quoteTextLength: quoteText.length,
              utcHour: new Date().getUTCHours(),
              dateString: dateString
            });
          } catch (logError) {
            // ログ記録の失敗は警告のみ（投稿は成功しているため）
            console.warn(`[Quote Repost] ⚠️ Failed to log post success to KV:`, logError.message);
          }
        } catch (postError) {
          // P1 FIX: 投稿エラーを完璧化（runIdとstepを含める）
          currentStep = "post_error";
          console.error(
            `[Quote Repost] ❌❌❌ FAILED TO POST quote repost [runId: ${langRunId}, step: ${currentStep}]:`,
            {
              lang,
              influencer: influencer.username,
              tweetId: influencer.tweetId,
              error: postError.message,
              stack: postError.stack?.substring(0, 500),
              xApiConfig: {
                configured: xStatusBeforePost?.configured,
                postingEnabled: xStatusBeforePost?.postingEnabled,
                dryRun: xStatusBeforePost?.dryRun,
                missing: xStatusBeforePost?.missing
              },
              timestamp: new Date().toISOString()
            }
          );

          // X APIエラーの詳細をログに記録（クレジット不足の可能性を確認）
          if (postError.message?.includes("X API Error") || postError.message?.includes("X_API")) {
            console.error(`[Quote Repost] ⚠️ X API Error detected [runId: ${langRunId}]:`, {
              errorMessage: postError.message,
              possibleCauses: [
                "X API credit shortage",
                "Invalid request parameters",
                "Rate limit exceeded",
                "Authentication failure",
                "Network timeout",
                "OAuth signature mismatch (P0 fix applied)"
              ]
            });
          }

          // CRITICAL: KVストレージに失敗ログを記録
          try {
            const { logPostFailure } = require("../services/core/postLogger");
            await logPostFailure({
              postType: "quote_repost",
              lang,
              influencerUsername: influencer.username,
              influencerTweetId: influencer.tweetId,
              error: postError.message,
              errorStack: postError.stack?.substring(0, 500),
              quoteText: quoteText.substring(0, 200),
              utcHour: new Date().getUTCHours(),
              dateString: dateString,
              xApiConfigured: xStatusBeforePost?.configured,
              xApiPostingEnabled: xStatusBeforePost?.postingEnabled,
              xApiDryRun: xStatusBeforePost?.dryRun
            });
          } catch (logError) {
            console.warn(`[Quote Repost] ⚠️ Failed to log post failure to KV:`, logError.message);
          }

          throw postError; // エラーを再スローして、下のcatchブロックで処理
        }

        // 注意: influencerList機能は削除されました（エンドユーザー追跡機能の削除のため）
        // 引用リポストをリストに記録（メトリクスは後でCron Jobで追跡）
        // const influencerId = generateInfluencerId(influencer);
        // await recordQuoteRepost(influencerId, result.id);

        // P1 FIX: savePostIdの失敗は非致命的（投稿成功と分離）
        const { savePostId } = require("../services/x/postTracker");
        const trackingSuccess = await savePostId(result.id, "quote_repost", lang, {
          influencerUsername: influencer.username,
          influencerTweetId: influencer.tweetId,
          funnelType: funnelTypeUsed || undefined
        });

        // Minimal/Regular ローテーション: 使用した導線タイプを記録（次回逆を出す）
        if (funnelTypeUsed) {
          await recordQuoteFunnelType(lang, influencer.username, funnelTypeUsed);
        }

        // グローバルな日次投稿数をインクリメント（投稿成功時）
        if (trackingSuccess) {
          try {
            await incrementGlobalDailyPostCount(dateString, 1);
            console.log(
              `[Quote Repost] ✅ Global daily post count incremented after successful save [runId: ${langRunId}, step: ${currentStep}]`
            );
          } catch (countError) {
            console.warn(
              `[Quote Repost] ⚠️ Failed to increment global daily post count:`,
              countError.message
            );
          }
        } else {
          // P1 FIX: トラッキング失敗は警告に落として継続（投稿は成功している）
          console.warn(
            `[Quote Repost] ⚠️ Post tracking failed (non-fatal), but post succeeded: tweetId=${result.id} [runId: ${langRunId}, step: ${currentStep}]`
          );
          // トラッキングは後で再試行可能（投稿は成功している）
          // グローバルな日次投稿数はインクリメントする（投稿は成功しているため）
          try {
            await incrementGlobalDailyPostCount(dateString, 1);
            console.log(
              `[Quote Repost] ✅ Global daily post count incremented despite tracking failure [runId: ${langRunId}, step: ${currentStep}]`
            );
          } catch (countError) {
            console.warn(
              `[Quote Repost] ⚠️ Failed to increment global daily post count:`,
              countError.message
            );
          }
        }

        // Grok推奨: EN実測ダッシュボード用メトリクス記録
        // CRITICAL FIX: 投稿直後はインプレッション数が0の可能性があるため、メトリクス記録はCron Jobに任せる
        // ただし、投稿成功の確認と初期メトリクス（0でも）は記録する
        let engagementMetrics = null;
        try {
          const { recordEngagementMetrics } = require("./x-engagement-metrics");

          // CRITICAL FIX: 投稿直後のメトリクス取得（インプレッション数は0の可能性がある）
          // Grok推奨: 10-20分後に再取得するため、ここでは初期値（0）を記録
          const quoteMetrics = await getTweetMetrics(result.id, true, { maxRetries: 2 }); // 自分のツイートなのでnon_public_metrics取得可能

          if (!quoteMetrics) {
            throw new Error(`Failed to get metrics for tweet ${result.id}`);
          }

          // CRITICAL FIX: インプレッション数の取得優先順位を明確化（GPT推奨）
          // 優先順位: 1. non_public_metrics (最も正確) → 2. organic_metrics (過去30日以内のツイートのみ) → 3. 0 (フォールバック)
          // 注意: non_public_metricsは自分のツイートのみ取得可能（OAuth 1.0a User Context認証が必要）
          const impressions =
            quoteMetrics.nonPublicMetrics?.impression_count ??
            quoteMetrics.organicMetrics?.impression_count ??
            0;
          const clicks =
            quoteMetrics.nonPublicMetrics?.url_link_clicks ??
            quoteMetrics.organicMetrics?.url_link_clicks ??
            0;

          engagementMetrics = {
            impressions,
            engagements:
              (quoteMetrics.publicMetrics?.like_count || 0) +
              (quoteMetrics.publicMetrics?.retweet_count || 0) +
              (quoteMetrics.publicMetrics?.reply_count || 0) +
              (quoteMetrics.publicMetrics?.quote_count || 0),
            clicks,
            replies: quoteMetrics.publicMetrics?.reply_count || 0,
            retweets: quoteMetrics.publicMetrics?.retweet_count || 0,
            likes: quoteMetrics.publicMetrics?.like_count || 0,
            quoteTweets: quoteMetrics.publicMetrics?.quote_count || 0
          };

          // データソースのログ出力（デバッグ用）
          if (quoteMetrics.nonPublicMetrics?.impression_count !== undefined) {
            console.log(
              `[Quote Repost] Using non_public_metrics for tweet ${result.id} (impressions: ${impressions})`
            );
          } else if (quoteMetrics.organicMetrics?.impression_count !== undefined) {
            console.log(
              `[Quote Repost] Using organic_metrics for tweet ${result.id} (impressions: ${impressions})`
            );
          } else {
            console.warn(
              `[Quote Repost] ⚠️ No impression data available for tweet ${result.id} (using 0 as fallback - normal for immediate post)`
            );
          }

          // CRITICAL FIX: 推定値と実測値を明確に区別
          // 注意: 投稿直後はインプレッション数が0の可能性があるため、isInitialRecordフラグを設定
          const recordSuccess = await recordEngagementMetrics(result.id, {
            ...engagementMetrics,
            lang,
            source: "quote_repost",
            influencerUsername: influencer.username,
            // データソースを明確に区別
            dataSource: {
              impressions: "x_api_actual", // X APIから取得した実測値（投稿直後は0の可能性あり）
              engagements: "x_api_actual", // X APIから取得した実測値
              estimatedImpressions: influencer.recentImpressions || 0, // Grokの推定値（インフルエンサーの過去のツイート用）
              estimatedSource: "grok_analysis" // 推定値のソース
            },
            isInitialRecord: true, // 投稿直後の初期記録であることを明示
            recordedAt: new Date().toISOString()
          });

          if (!recordSuccess) {
            throw new Error(`Failed to record engagement metrics for tweet ${result.id}`);
          }

          // インプレッション数が0の場合の警告（投稿直後は正常）
          if (engagementMetrics.impressions === 0) {
            console.log(
              `[Quote Repost] ⚠️ Initial impressions is 0 for tweet ${result.id} (normal for immediate post, will be updated by Cron Job)`
            );
          }

          // 最適化案: インフルエンサー別メトリクスを記録（インフルエンサー分析）
          try {
            const { recordInfluencerMetrics } = require("../services/x/influencerAnalyzer");
            await recordInfluencerMetrics(influencer.username, result.id, engagementMetrics);
          } catch (error) {
            console.warn("[Quote Repost] Failed to record influencer metrics:", error.message);
          }
        } catch (error) {
          // CRITICAL: メトリクス記録の失敗は警告のみ（投稿は成功しているため）
          // ただし、Cron Jobで再試行されるため、致命的エラーにはしない
          console.warn(
            `[Quote Repost] ⚠️ Failed to record initial engagement metrics for tweet ${result.id}:`,
            error.message
          );
          console.warn(
            `[Quote Repost] Metrics will be updated by Cron Job (api/x-engagement-metrics.js)`
          );
        }

        // インフルエンサーのツイートのpublic_metricsを取得（正確なエンゲージメント数）
        let influencerMetrics = null;
        try {
          // P0 FIX: GPT-5-mini推奨 - getTweetMetricsに5秒のタイムアウトを設定
          const metrics = await withTimeout(
            getTweetMetrics(influencer.tweetId, false), // 他人のツイートなのでnon_public_metricsは取得不可
            5000, // 5秒タイムアウト（GPT-5-mini推奨）
            () =>
              console.warn(
                `[Quote Repost] ⏰ getTweetMetrics timeout after 5s for influencer tweet ${influencer.tweetId} [runId: ${langRunId}]`
              )
          );
          if (metrics) {
            influencerMetrics = {
              likes: metrics.publicMetrics.like_count || 0,
              retweets: metrics.publicMetrics.retweet_count || 0,
              replies: metrics.publicMetrics.reply_count || 0,
              quotes: metrics.publicMetrics.quote_count || 0
              // 注意: インプレッション数は取得不可能（プライバシー保護）
              // Grokの推定値（recentImpressions）を使用
            };
          }
        } catch (error) {
          console.warn(`[Quote Repost] Failed to get influencer metrics:`, error.message);
        }

        // エンゲージメント数を計算（自分の引用リポスト用）
        const quoteEngagement = engagementMetrics?.engagements || 0;
        const quoteImpressions = engagementMetrics?.impressions || 0;

        // 注意: 自分の投稿した引用リポスト（result.id）のメトリクスは、
        // Cron Job（api/x-quote-repost-metrics.js）で定期的に追跡される
        // インプレッション数とエンゲージメント数は正確に取得可能

        results.push({
          lang,
          influencer: influencer.username,
          tweetId: influencer.tweetId,
          quoteTweetId: result.id,
          success: true,
          actuallyPosted: true, // 実際に投稿されたことを明示
          engagement: quoteEngagement,
          impressions: quoteImpressions,
          // Grokの推定値（正確ではない - インフルエンサーのツイート用）
          estimatedImpressions: influencer.recentImpressions || 0,
          // 正確なエンゲージメント数（インフルエンサーのツイート - X APIから取得）
          influencerMetrics: influencerMetrics
          // 自分の引用リポストのメトリクスはCron Jobで追跡（正確なインプレッション数 + エンゲージメント数）
        });
        console.log(
          `[Quote Repost] ✅✅✅ CONFIRMED: Quote repost ACTUALLY POSTED for ${lang} (@${influencer.username}): ${result.id}`
        );
        console.log(
          `[Quote Repost] 📊 Metrics tracking: Quote repost ${result.id} will be tracked by Cron Job (accurate impressions + engagement)`
        );

        // CRITICAL: 最終確認ログをKVに記録（二重チェック）
        try {
          const { logPostSuccess } = require("../services/core/postLogger");
          await logPostSuccess({
            postType: "quote_repost_confirmed",
            quoteTweetId: result.id,
            originalTweetId: influencer.tweetId,
            lang,
            influencerUsername: influencer.username,
            confirmedAt: new Date().toISOString(),
            metricsTracked: true,
            impressions: quoteImpressions,
            engagements: quoteEngagement
          });
        } catch (logError) {
          console.warn(`[Quote Repost] ⚠️ Failed to log confirmation to KV:`, logError.message);
        }

        // レート制限対策（1時間あたり3-4投稿まで）
        // P0 FIX: 固定待機をジッター（ランダム遅延）に置き換え（maxDuration=60秒制約を考慮）
        // 15分待機はmaxDuration=60秒を超えるため、3-10秒のジッターに変更
        // P0 FIX: dry-runモードではジッターをスキップ（高速化）
        if (!isDryRun) {
          // 実際のレート制限はCronスケジュール（2時間ごと）で担保
          // P0 FIX: deadlineMsを関数パラメータから取得（GPT-5.2レビュー対応）
          await applyJitter({
            label: `quote-repost ${lang} @${influencer.username} [runId: ${langRunId}]`,
            minMs: 3000,
            maxMs: 10000,
            deadlineMs: deadlineMs
          });
        }
      } catch (error) {
        console.error(
          `[Quote Repost] ❌❌❌ FAILED TO POST quote repost for ${lang} (@${influencer.username}):`
        );
        console.error(`[Quote Repost]    - Error: ${error.message}`);
        console.error(`[Quote Repost]    - Stack: ${error.stack?.substring(0, 500)}`);

        // CRITICAL: エラー時のログ記録
        try {
          const { logPostFailure } = require("../services/core/postLogger");
          await logPostFailure({
            postType: "quote_repost",
            lang,
            influencerUsername: influencer.username,
            influencerTweetId: influencer.tweetId,
            error: error.message,
            errorStack: error.stack?.substring(0, 500),
            utcHour: new Date().getUTCHours(),
            dateString: dateString
          });
        } catch (logError) {
          console.warn(`[Quote Repost] ⚠️ Failed to log error to KV:`, logError.message);
        }

        results.push({
          lang,
          influencer: influencer.username,
          tweetId: influencer.tweetId,
          success: false,
          actuallyPosted: false, // 実際に投稿されなかったことを明示
          error: error.message
        });
      }
    }

    return results;
  } catch (error) {
    // P0: 言語単位で例外を握りつぶさず、どのステップで落ちたかをログに残す
    console.error(
      `[Quote Repost] ❌ Failed to post quote reposts for ${lang} [runId: ${langRunId}, step: ${currentStep}]:`,
      {
        error: error.message,
        stack: error.stack,
        lang,
        step: currentStep,
        timestamp: new Date().toISOString()
      }
    );
    // エラーを再スローして、呼び出し側で処理できるようにする
    throw error;
  }
}

/**
 * 引用リポストを実行（全言語）
 */
async function postQuoteReposts(reportData = null) {
  try {
    const xStatus = getXConfigStatus();

    if (!xStatus.postingEnabled) {
      console.log("ℹ️ X posting disabled by X_POSTING_ENABLED");
      return { success: false, skipped: true, error: "X posting disabled" };
    }

    if (!xStatus.configured) {
      console.log(`ℹ️ X API not configured, missing: ${xStatus.missing.join(", ")}`);
      return { success: false, error: "X API credentials missing", missing: xStatus.missing };
    }

    if (xStatus.dryRun) {
      console.log("🧪 X dry-run enabled, skipping quote reposts");
      return { success: true, dryRun: true };
    }

    const targetLangs = SUPPORTED_LANGS;
    const allResults = [];

    // 各言語ごとに引用リポスト（1時間に1言語 = 6時間で完了）
    // 実際の実装では、スケジューラーで1時間ごとに1言語ずつ実行
    // P0 FIX: deadlineMsを統一生成して渡す（GPT-5.2レビュー対応）
    const MAX_DURATION_MS = 60_000;
    const deadlineMs = Date.now() + MAX_DURATION_MS - 1500;
    for (const lang of targetLangs) {
      const langResults = await postQuoteRepostsForLang(
        lang,
        reportData,
        null,
        null,
        null,
        deadlineMs
      );
      allResults.push(...langResults);
    }

    const successCount = allResults.filter((r) => r.success).length;
    const totalCount = allResults.length;

    return {
      success: successCount > 0,
      sent: successCount,
      total: totalCount,
      byLang: allResults
    };
  } catch (error) {
    console.error("❌ Quote repost failed:", error.message);
    throw error;
  }
}

// Vercel Cron実行時（1時間ごと）
const handler = async (req, res) => {
  // P0: フロー観測可能なログ設計 - runIdを生成
  const runId = `qr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // P0: 本番デプロイの確認 - GIT_SHAをログ出力
  const gitSha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_SHA || "unknown";
  const buildTime = process.env.VERCEL_BUILD_TIME || "unknown";

  // P0 FIX: 認証チェックのデバッグログを追加（401エラー原因特定のため）
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const cronSecret = process.env.CRON_SECRET;

  // デバッグログ: 認証情報を確認（CRON_SECRETの値は表示しない）
  console.log("[Quote Repost] 🔵 Auth Debug:", {
    hasAuthHeader: !!authHeader,
    authHeaderPrefix: authHeader ? authHeader.substring(0, 20) + "..." : "undefined",
    hasCronSecret: !!cronSecret,
    cronSecretLength: cronSecret ? cronSecret.length : 0,
    userAgent: req.headers["user-agent"],
    runId
  });

  // タイムアウト対策: 開始時刻を記録
  const startTime = Date.now();
  const TIMEOUT_MS = 50000; // 50秒（60秒制限の前に終了）

  // P0 FIX: エントリポイントでdeadlineMsを統一生成（GPT-5.2レビュー対応）
  // すべての下位関数に渡すことで、タイムアウト処理を統一
  const MAX_DURATION_MS = 60_000; // Vercel FunctionsのmaxDuration=60秒
  const deadlineMs = Date.now() + MAX_DURATION_MS - 1500; // 1.5秒の安全マージン

  console.log("[Quote Repost] ========================================");
  console.log("[Quote Repost] Cron job triggered at", new Date().toISOString());
  console.log("[Quote Repost] 🔵 RunId:", runId);
  console.log("[Quote Repost] 🔵 Git SHA:", gitSha);
  console.log("[Quote Repost] 🔵 Build Time:", buildTime);
  console.log("[Quote Repost] ========================================");

  // P0 FIX: 認証チェックの改善（authHeaderがundefinedの場合も考慮）
  // Vercel Cronジョブから呼び出される場合は、Authorizationヘッダーが自動的に設定される
  // 手動テストの場合は、Authorizationヘッダーを明示的に設定する必要がある
  if (cronSecret) {
    const expectedAuth = `Bearer ${cronSecret}`;
    if (!authHeader || authHeader !== expectedAuth) {
      console.error(`[Quote Repost] ❌ Unauthorized: Invalid CRON_SECRET [runId: ${runId}]`, {
        hasAuthHeader: !!authHeader,
        authHeaderValue: authHeader ? authHeader.substring(0, 30) + "..." : "undefined",
        expectedPrefix: expectedAuth.substring(0, 30) + "...",
        runId
      });
      return res
        .status(401)
        .json({ error: "Unauthorized", runId, message: "Invalid or missing Authorization header" });
    }
  }

  // タイムアウトチェック関数
  const checkTimeout = () => {
    const elapsed = Date.now() - startTime;
    if (elapsed > TIMEOUT_MS) {
      throw new Error(`Timeout: Execution time exceeded ${TIMEOUT_MS}ms`);
    }
  };

  try {
    // P1: スキップ理由のログを追加（GPT-5.2推奨）
    const skipReasons = {
      cronAuth: false,
      kvAvailable: false,
      xApiConfigured: false,
      xApiPostingEnabled: false,
      xApiDryRun: false,
      timeWindow: false,
      dailyLimit: false,
      hourlyLimit: false
    };

    // KVストレージ接続確認
    if (!kv) {
      console.warn(
        `[Quote Repost] ⚠️ KV storage not available - post count tracking may not work [runId: ${runId}]`
      );
      skipReasons.kvAvailable = false;
    } else {
      console.log(`[Quote Repost] ✅ KV storage available [runId: ${runId}]`);
      skipReasons.kvAvailable = true;
    }

    // X API設定状況を確認
    const xStatus = getXConfigStatus();
    console.log(`[Quote Repost] 🔵 X API Status [runId: ${runId}]:`, {
      configured: xStatus.configured,
      postingEnabled: xStatus.postingEnabled,
      dryRun: xStatus.dryRun,
      missing: xStatus.missing
    });

    skipReasons.xApiConfigured = xStatus.configured;
    skipReasons.xApiPostingEnabled = xStatus.postingEnabled;
    skipReasons.xApiDryRun = xStatus.dryRun;

    if (!xStatus.postingEnabled) {
      console.log(
        `[Quote Repost] ⏰ SKIPPED: X posting disabled by X_POSTING_ENABLED [runId: ${runId}, step: x_api_check]`
      );
      return res.status(200).json({
        success: false,
        skipped: true,
        reason: "x_posting_disabled",
        runId,
        gitSha,
        skipReasons,
        metrics: {
          invoked: 1,
          skipped: 1,
          processed_langs: 0,
          posted_count: 0
        }
      });
    }

    if (!xStatus.configured) {
      console.error(
        `[Quote Repost] ⏰ SKIPPED: X API not configured, missing: ${xStatus.missing.join(", ")} [runId: ${runId}, step: x_api_check]`
      );
      return res.status(200).json({
        success: false,
        skipped: true,
        reason: "x_api_not_configured",
        error: "X API credentials missing",
        missing: xStatus.missing,
        runId,
        gitSha,
        skipReasons,
        metrics: {
          invoked: 1,
          skipped: 1,
          processed_langs: 0,
          posted_count: 0
        }
      });
    }

    // Gemini推奨: ジッター（揺らぎ）の実装（1-15分のランダム遅延）
    // ボット判定を回避するため、機械的な投稿タイミングを排除
    const jitterMs = Math.random() * 15 * 60 * 1000; // 0〜15分のランダム遅延（ミリ秒）
    console.log(
      `[Quote Repost] 🎲 Applying jitter: ${(jitterMs / 1000 / 60).toFixed(2)} minutes delay [runId: ${runId}]`
    );
    await new Promise((resolve) => setTimeout(resolve, jitterMs));

    // Grok推奨: UTC時刻に基づいて処理する言語を決定（dry-runチェックの前に取得）
    const { getLanguagesForCurrentHour } = require("../services/x/optimization");
    const currentHour = new Date().getUTCHours();
    const {
      langs: targetLangsForDryRun,
      type: typeForDryRun,
      count: countForDryRun
    } = getLanguagesForCurrentHour(currentHour);

    if (xStatus.dryRun) {
      console.log(
        `[Quote Repost] 🧪 DRY RUN MODE - No actual posts will be made [runId: ${runId}]`
      );
      return res.status(200).json({
        success: true,
        dryRun: true,
        message: "Dry run mode enabled - no posts will be made",
        currentHour,
        targetLangs: targetLangsForDryRun || [],
        runId,
        gitSha,
        skipReasons,
        metrics: {
          invoked: 1,
          skipped: 0,
          processed_langs: targetLangsForDryRun?.length || 0,
          posted_count: 0
        }
      });
    }

    // Grok API設定確認
    const xaiApiKey = process.env.XAI_API_KEY;
    if (!xaiApiKey) {
      console.warn("[Quote Repost] ⚠️ XAI_API_KEY not set - influencer discovery may fail");
    } else {
      console.log("[Quote Repost] ✅ XAI_API_KEY configured");
    }

    // リクエストボディからレポートデータを取得
    let reportData = req.body?.reportData || null;

    // レポートデータが提供されていない場合、最新の市場データを取得
    if (!reportData || !reportData.trapScore || !reportData.priceUsd) {
      console.log("[Quote Repost] Fetching latest market data...");
      try {
        // モジュールを動的にrequire（循環依存を避けるため）
        const xPostFreeReportModule = require("./x-post-free-report");
        // 複数のエクスポート方法に対応
        let fetchLatestMarketData = null;
        if (typeof xPostFreeReportModule === "function") {
          // デフォルトエクスポートが関数の場合
          fetchLatestMarketData = xPostFreeReportModule.fetchLatestMarketData;
        } else if (xPostFreeReportModule.fetchLatestMarketData) {
          // 名前付きエクスポート
          fetchLatestMarketData = xPostFreeReportModule.fetchLatestMarketData;
        } else if (xPostFreeReportModule.default?.fetchLatestMarketData) {
          // デフォルトオブジェクトのプロパティ
          fetchLatestMarketData = xPostFreeReportModule.default.fetchLatestMarketData;
        }

        if (!fetchLatestMarketData || typeof fetchLatestMarketData !== "function") {
          console.error("[Quote Repost] ❌ fetchLatestMarketData is not available");
          console.error("[Quote Repost] Module exports:", Object.keys(xPostFreeReportModule || {}));
          // フォールバック: marketSnapshotServiceから最新スナップショットを取得
          const marketSnapshotService = require("../services/core/marketSnapshot");
          const snapshot = marketSnapshotService.getLatestSnapshot();
          if (snapshot) {
            reportData = {
              trapScore: snapshot.trap_score || 0,
              priceUsd: snapshot.price_usd_raw || 0,
              change24h: snapshot.change_24h || 0,
              exchangeNetflow: snapshot.exchange_netflow || snapshot.inflow || null,
              whaleRatio: snapshot.whale_ratio || snapshot.whaleRatio || null
            };
            console.log("[Quote Repost] Using fallback market data from marketSnapshotService");
          } else {
            // 最後のフォールバック: デフォルト値を使用（現在の市況を反映）
            console.warn("[Quote Repost] ⚠️ No snapshot available, using default values");
            reportData = {
              trapScore: 0,
              priceUsd: 89077,
              change24h: -0.84,
              exchangeNetflow: 1252, // 現在の市況を反映
              whaleRatio: 56 // 現在の市況を反映
            };
          }
        } else {
          reportData = await fetchLatestMarketData();
        }
      } catch (fetchError) {
        console.error("[Quote Repost] ❌ Error fetching market data:", fetchError.message);
        // フォールバック: marketSnapshotServiceから最新スナップショットを取得
        try {
          const marketSnapshotService = require("../services/core/marketSnapshot");
          const snapshot = marketSnapshotService.getLatestSnapshot();
          if (snapshot) {
            reportData = {
              trapScore: snapshot.trap_score || 0,
              priceUsd: snapshot.price_usd_raw || 0,
              change24h: snapshot.change_24h || 0,
              exchangeNetflow: snapshot.exchange_netflow || snapshot.inflow || null,
              whaleRatio: snapshot.whale_ratio || snapshot.whaleRatio || null
            };
            console.log("[Quote Repost] Using fallback market data from marketSnapshotService");
          } else {
            // 最後のフォールバック: デフォルト値を使用（現在の市況を反映）
            console.warn("[Quote Repost] ⚠️ No snapshot available, using default values");
            reportData = {
              trapScore: 0,
              priceUsd: 89077,
              change24h: -0.84,
              exchangeNetflow: 1252, // 現在の市況を反映
              whaleRatio: 56 // 現在の市況を反映
            };
          }
        } catch (fallbackError) {
          console.error("[Quote Repost] ❌ Fallback also failed:", fallbackError.message);
          // デフォルト値を使用して続行（完全に失敗させない、現在の市況を反映）
          reportData = {
            trapScore: 0,
            priceUsd: 89077,
            change24h: -0.84,
            exchangeNetflow: 1252, // 現在の市況を反映
            whaleRatio: 56 // 現在の市況を反映
          };
          console.warn("[Quote Repost] ⚠️ Using default values due to all fallbacks failing");
        }
      }
      console.log("[Quote Repost] Market data fetched:", {
        trapScore: reportData.trapScore,
        priceUsd: reportData.priceUsd,
        change24h: reportData.change24h
      });
    }

    // 1日の投稿数を取得（Vercel KV）- グローバルな日次投稿数
    const dateString = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const currentDailyPostCount = await getGlobalDailyPostCount(dateString);

    const { langs: targetLangs, type, count } = getLanguagesForCurrentHour(currentHour);

    // P1: スキップ理由のログを追加
    console.log(`[Quote Repost] 🔵 Execution context [runId: ${runId}]:`, {
      step: "language_selection",
      currentHour,
      targetLangs: targetLangs || [],
      targetLangsCount: targetLangs?.length || 0,
      type: type || "none",
      count: count || 0,
      timestamp: new Date().toISOString()
    });

    // 引用リポストのピーク時間でない場合はスキップ
    // 注意: getPeakMapForHour()で定義された時刻（UTC 0,1,20,21）を信頼し、isPeakTimeWindowチェックは削除
    // UTC 0:00と1:00はisPeakTimeWindowの範囲外（10-23）だが、引用リポストのピーク時間として定義されている
    if (!targetLangs || targetLangs.length === 0 || type !== "quote") {
      skipReasons.timeWindow = true;
      console.log(
        `[Quote Repost] ⏰ SKIPPED: Not quote repost peak time [runId: ${runId}, step: time_window_check, currentHour: ${currentHour} UTC, type: ${type || "none"}]`
      );
      return res.status(200).json({
        success: true,
        skipped: true,
        reason: "not_quote_repost_peak_time",
        currentHour,
        type,
        results: [],
        dailyPostCount: currentDailyPostCount,
        runId,
        gitSha,
        skipReasons,
        metrics: {
          invoked: 1,
          skipped: 1,
          processed_langs: 0,
          posted_count: 0
        }
      });
    }

    skipReasons.timeWindow = false;

    console.log(
      `[Quote Repost] Processing ${targetLangs.join(", ")} at peak time (${currentHour}:00 UTC, type: ${type}, count: ${count} per lang)`
    );
    // 🚀 チート級戦略: 日次上限を撤廃（Cronスケジュールで制御されているため不要）
    // ログ出力のみ残す（モニタリング用）
    console.log(
      `[Quote Repost] Daily post count: ${currentDailyPostCount} (no limit, controlled by Cron schedule)`
    );

    // ⚖️ バランスアプローチ: X APIレート制限に基づく1時間あたりの投稿数制限
    const hourKey = `${dateString}T${String(currentHour).padStart(2, "0")}`;
    const {
      checkHourlyPostLimit,
      getHourlyPostCount,
      incrementHourlyPostCount
    } = require("../services/x/optimization");
    const currentHourlyPostCount = await getHourlyPostCount(hourKey);
    // 環境変数から取得、デフォルトは100（X APIレート制限: 100/15min = 理論上400/時間、安全のため100/時間）
    const maxPostsPerHour = parseInt(process.env.X_MAX_HOURLY_POSTS || "100", 10);
    console.log(`[Quote Repost] Hourly post count: ${currentHourlyPostCount}/${maxPostsPerHour}`);

    if (!checkHourlyPostLimit(currentHourlyPostCount, maxPostsPerHour)) {
      skipReasons.hourlyLimit = true;
      console.log(
        `[Quote Repost] ⏰ SKIPPED: Hourly post limit reached [runId: ${runId}, step: hourly_limit_check, current: ${currentHourlyPostCount}, max: ${maxPostsPerHour}]`
      );
      return res.status(200).json({
        success: true,
        skipped: true,
        reason: "hourly_limit_reached",
        currentHourlyPostCount,
        maxPostsPerHour,
        results: [],
        dailyPostCount: currentDailyPostCount,
        runId,
        gitSha,
        skipReasons,
        metrics: {
          invoked: 1,
          skipped: 1,
          processed_langs: 0,
          posted_count: 0
        }
      });
    }

    skipReasons.hourlyLimit = false;

    // Grok推奨: 1日6言語すべてを時間帯別で回す（各言語count回）
    const allResults = [];
    let updatedDailyPostCount = currentDailyPostCount;
    let updatedHourlyPostCount = currentHourlyPostCount;

    // P1: スキップを成功に埋めない - 指標を分ける
    const metrics = {
      invoked: 1,
      skipped: 0,
      processed_langs: 0,
      posted_count: 0,
      failed_langs: []
    };

    console.log(`[Quote Repost] 🔵 Starting language processing loop [runId: ${runId}]:`, {
      step: "language_loop_start",
      targetLangs: targetLangs,
      targetLangsCount: targetLangs.length,
      countPerLang: count,
      timestamp: new Date().toISOString()
    });

    // P0 FIX: 言語処理を並列化（タイムアウト対策）
    // 順次処理による累積遅延を防止するため、言語ごとの処理を並列実行
    // ただし、X APIへの投稿は順次実行（レート制限対策）
    const langProcessingPromises = targetLangs.map(async (targetLang, langIndex) => {
      // タイムアウトチェック
      checkTimeout();

      // P0: 言語単位で例外を握りつぶさず、どのステップで落ちたかをログに残す
      let langProcessed = false;
      let langError = null;
      let langStep = "start";
      const langResults = [];

      try {
        console.log(
          `[Quote Repost] 🔵 Processing language: ${targetLang} [runId: ${runId}, step: language_processing_start]`
        );

        // 各言語でcount回の引用リポストを実行
        for (let i = 0; i < count; i++) {
          // タイムアウトチェック
          checkTimeout();

          // 1時間あたりの投稿数制限をチェック
          if (!checkHourlyPostLimit(updatedHourlyPostCount, maxPostsPerHour)) {
            console.log(
              `[Quote Repost] ⏰ Hourly post limit reached during processing (${updatedHourlyPostCount}/${maxPostsPerHour}), stopping [runId: ${runId}]`
            );
            break;
          }
          console.log(
            `[Quote Repost] 🔵 Starting influencer discovery for ${targetLang} (${i + 1}/${count}) [runId: ${runId}, step: influencer_discovery_start]`
          );

          try {
            langStep = "postQuoteRepostsForLang";
            // P0 FIX: deadlineMsはhandler関数で統一生成済み（GPT-5.2レビュー対応）
            const results = await postQuoteRepostsForLang(
              targetLang,
              reportData,
              updatedDailyPostCount,
              runId,
              deadlineMs
            );
            langResults.push(...results);

            langProcessed = true;
          } catch (langError) {
            console.error(
              `[Quote Repost] ❌ Error processing ${targetLang} [runId: ${runId}, step: ${langStep}]:`,
              {
                error: langError.message,
                stack: langError.stack,
                lang: targetLang,
                iteration: i + 1
              }
            );
            // 次のイテレーションに進む（1回失敗しても全体を止めない）
            continue;
          }

          // P0 FIX: レート制限対策（同一言語内でジッター適用）- forループ内に配置
          // タイムアウト対策: 残り実行時間を考慮したジッター（ランダム遅延）
          // P0 FIX: deadlineMsはhandler関数で統一生成済み（GPT-5.2レビュー対応）
          if (i < count - 1) {
            await applyJitter({
              label: `quote-repost ${targetLang} next-post [runId: ${runId}]`,
              minMs: 3000,
              maxMs: 10000,
              deadlineMs: deadlineMs
            });
          }
        }

        return {
          lang: targetLang,
          langProcessed,
          langResults,
          langError: null,
          langStep: null
        };
      } catch (error) {
        langError = error;
        langStep = "language_loop";
        console.error(
          `[Quote Repost] ❌ Fatal error processing language ${targetLang} [runId: ${runId}, step: ${langStep}]:`,
          {
            error: error.message,
            stack: error.stack,
            lang: targetLang
          }
        );
        return {
          lang: targetLang,
          langProcessed: false,
          langResults: [],
          langError: error.message,
          langStep: "language_loop"
        };
      }
    });

    // 並列処理の結果を待機
    const langProcessingResults = await Promise.allSettled(langProcessingPromises);

    // 結果を集約
    for (const result of langProcessingResults) {
      if (result.status === "fulfilled") {
        const { lang, langProcessed, langResults: results, langError, langStep } = result.value;
        allResults.push(...results);

        if (langProcessed) {
          metrics.processed_langs++;
          const successCount = results.filter((r) => r.success && !r.dryRun).length;
          metrics.posted_count += successCount;
        } else if (langError) {
          metrics.failed_langs.push({ lang, step: langStep, error: langError });
        }
      } else {
        // Promise.allSettledでrejectedになった場合
        console.error(`[Quote Repost] ❌ Language processing promise rejected:`, result.reason);
        metrics.failed_langs.push({
          lang: "unknown",
          step: "promise_rejected",
          error: result.reason?.message || "Unknown error"
        });
      }
    }

    const totalElapsed = Date.now() - startTime;
    console.log(`[Quote Repost] ✅ Completed in ${totalElapsed}ms [runId: ${runId}]`);

    const langResults = allResults;

    // 更新後の投稿数を取得 - グローバルな日次投稿数
    const finalDailyPostCount = await getGlobalDailyPostCount(dateString);

    const successCount = langResults.filter((r) => r.success && !r.dryRun).length;
    console.log(`[Quote Repost] ========================================`);
    console.log(
      `[Quote Repost] Completed for ${targetLangs.join(", ")}: ${successCount}/${langResults.length} successful [runId: ${runId}]`
    );
    console.log(`[Quote Repost] Metrics:`, JSON.stringify(metrics, null, 2));
    console.log(`[Quote Repost] Results:`, JSON.stringify(langResults, null, 2));
    console.log(`[Quote Repost] ========================================`);

    // P1: スキップを成功に埋めない - 指標を分ける
    // P0 FIX: dryRunも成功とみなす（dryRun=trueの場合は処理自体は成功している）
    const dryRunCount = langResults.filter((r) => r.success && r.dryRun).length;
    const overallSuccess =
      metrics.posted_count > 0 || dryRunCount > 0 || metrics.processed_langs > 0;

    return res.status(200).json({
      success: overallSuccess,
      langs: targetLangs,
      type,
      count,
      results: langResults,
      dailyPostCount: finalDailyPostCount,
      runId,
      gitSha,
      skipReasons,
      metrics: {
        ...metrics,
        success_count: successCount,
        total_results: langResults.length
      }
    });
  } catch (error) {
    console.error(`[Quote Repost] ======================================== [runId: ${runId}]`);
    console.error(`[Quote Repost] ❌ Handler error [runId: ${runId}]:`, error.message);
    console.error(`[Quote Repost] Stack:`, error.stack);
    console.error(`[Quote Repost] ========================================`);
    return res.status(500).json({
      error: error.message,
      stack: error.stack,
      runId,
      gitSha,
      metrics: {
        invoked: 1,
        skipped: 0,
        processed_langs: 0,
        posted_count: 0,
        failed_langs: [{ lang: "handler", step: "handler_error", error: error.message }]
      }
    });
  }
};

module.exports = handler;
module.exports.postQuoteReposts = postQuoteReposts;
module.exports.postQuoteRepostsForLang = postQuoteRepostsForLang;
