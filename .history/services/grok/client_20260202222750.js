// services/grok/client.js
// ペルソナ決め打ち: 引用リポスト生成時に personaStrategy をプロンプトに注入（CVR・LTV 最大化）

const OpenAI = require("openai");
const { getMarketProfile } = require("../../api/config/marketProfiles");
const { getPersonaPromptContext } = require("../../config/personaStrategy");

// Vercel KV（キャッシュ用）
let kv = null;
try {
  const kvModule = require("@vercel/kv");
  kv = kvModule.kv;
} catch (error) {
  console.warn("[Grok] @vercel/kv not available:", error.message);
}

const XAI_API_KEY = process.env.XAI_API_KEY;
const BASE_URL = process.env.XAI_BASE_URL || "https://api.x.ai/v1";

// Phase 2: 用途別モデル環境変数の分割（SSOT準拠）
const APP_ENV = process.env.APP_ENV || process.env.NODE_ENV || "production";

// 開発環境: すべてハイエンドモデルを使用（Composer最優先）
// 本番環境: 用途別モデルを使用（コスト最適化）
const isDevelopment = APP_ENV === "development";

// 用途別モデル定義
const GROK_MODEL_MARKET =
  process.env.GROK_MODEL_MARKET || (isDevelopment ? "grok-4-1-fast-reasoning" : "grok-4-0709");
const GROK_MODEL_MARKET_EMERGENCY =
  process.env.GROK_MODEL_MARKET_EMERGENCY || "grok-4-1-fast-reasoning";
const GROK_MODEL_X_LIVE = process.env.GROK_MODEL_X_LIVE || "grok-4-1-fast-reasoning";
const GROK_MODEL_HIGH_RES = process.env.GROK_MODEL_HIGH_RES || "grok-4-1-fast-reasoning";

// 後方互換性のため、GROK_MODEL_REASONINGとGROK_MODEL_LIVEも残す
const GROK_MODEL_REASONING = process.env.GROK_MODEL_REASONING || GROK_MODEL_MARKET;
const GROK_MODEL_LIVE = process.env.GROK_MODEL_LIVE || GROK_MODEL_X_LIVE;

// ---- offline notice -------------------------------------------------
if (!XAI_API_KEY) {
  console.warn("⚠️ XAI_API_KEY is not set. Grok client will operate in offline fallback mode.");
}

// P0 FIX: 環境変数がない場合でもエラーを出さないように遅延初期化
let openai = null;

try {
  if (XAI_API_KEY) {
    openai = new OpenAI({
      apiKey: XAI_API_KEY,
      baseURL: BASE_URL
    });
  } else {
    console.warn("[Grok Client] XAI_API_KEY not set, Grok client will not be available");
  }
} catch (error) {
  console.warn("[Grok Client] Failed to initialize Grok client:", error.message);
}

// ---- utilities ------------------------------------------------------
function isRateLimitError(error) {
  const status = error?.status || error?.statusCode;
  const type = error?.error?.type || error?.type;
  return status === 429 || type === "rate_limit_error" || type === "RateLimitError";
}

function logCompactError(prefix, error) {
  const status = error?.status || error?.statusCode;
  const message = error?.message || String(error);
  console.error(`${prefix} status=${status} message=${message}`);
}

function safeJsonParse(text) {
  if (typeof text !== "string") return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * 市場別ペルソナプロンプトを生成
 * @param {string} market - 市場コード (EN/AR/KO/JA/ES/PT-BR)
 * @param {string} riskMode - リスクモード ('normal' | 'critical' | 'high')
 * @returns {string} システムプロンプト
 */
function getMarketPersonaPrompt(market = "EN", riskMode = "normal") {
  const profile = getMarketProfile(market);
  const persona = profile?.persona || "PRECISION_SNIPER";
  const tagline = profile?.tagline || "Market Referee - Spot traps before you fall";

  const personaPrompts = {
    // EN
    PRECISION_SNIPER:
      'You are "Dr. Grok", a Precision Sniper for active BTC traders. ' +
      "You think like a veteran X (Twitter) crypto trader, not a generic analyst. " +
      "Be concise, tactical, data-driven, and risk-first. " +
      "Provide decisive analysis with clear entry/exit signals when the edge is clear.",
    // AR
    SHIELD_WALL:
      'You are "Dr. Grok", a Shield Wall protector for conservative BTC traders. ' +
      "Your primary role is capital protection. " +
      "Be ultra-conservative, emphasize waiting for perfect setups, and prioritize safety over opportunity. " +
      "Most of the time (70%), you recommend waiting. This is a feature, not a bug.",
    // KO
    KIMCHI_SNIPER:
      'You are "Dr. Grok", a Kimchi Sniper specializing in Korean market dynamics (Kimchi Premium, Upbit flows). ' +
      "Be fast, precise, and alert to Korean exchange-specific signals. " +
      "Think like a Korean crypto trader who watches Upbit/Binance spreads closely.",
    // JA
    KAIZEN_OPTIMIZER:
      'You are "Dr. Grok", a Kaizen Optimizer for improvement-focused BTC traders. ' +
      "Emphasize continuous improvement, risk-reward optimization, and daily 1% gains. " +
      "Be methodical, detail-oriented, and focus on long-term consistency over quick wins.",
    // ES
    VOZ_COMUN:
      'You are "Dr. Grok", representing the "Voz Común" (Common Voice) for Spanish-speaking BTC traders. ' +
      "Think like a collective of 5,000 traders protecting each other. " +
      "Be community-focused, practical, and emphasize shared wisdom.",
    // PT-BR
    VOZ_COMUM:
      'You are "Dr. Grok", representing the "Voz Comum" (Common Voice) for Portuguese-speaking BTC traders. ' +
      "Think like a collective of 5,000 traders protecting each other. " +
      "Be community-focused, practical, and emphasize shared wisdom."
  };

  const basePrompt = personaPrompts[persona] || personaPrompts.PRECISION_SNIPER;

  // 高リスク時に「辛口モード」プロンプトを追加
  if (riskMode === "critical" || riskMode === "high") {
    const criticalModePrompt =
      "⚠️ CRITICAL MODE ACTIVATED: A high-risk trap has been detected. " +
      "Be brutally honest and direct. No sugar-coating. " +
      "Point out specific risks and flaws in the current market analysis without hesitation. " +
      "Your role is to prevent traders from making costly mistakes. " +
      "If you see a trap, call it out clearly and forcefully. " +
      "Explain WHY this is dangerous, WHAT could go wrong, and WHAT to avoid. " +
      "Prioritize capital protection over opportunity.";
    return `${basePrompt} Tagline: "${tagline}".\n\n${criticalModePrompt}`;
  }

  return `${basePrompt} Tagline: "${tagline}".`;
}

/**
 * CryptoQuant深掘りデータをGrokコンテキスト用にフォーマット
 * @param {Object} cqDeep - CryptoQuant深掘りデータ
 * @param {string} market - 市場コード
 * @returns {string} フォーマットされたコンテキスト文字列
 */
function formatCryptoQuantContext(cqDeep = {}, market = "EN") {
  const contextParts = [];

  // EN市場: trapScore, whaleFlows, liquidations
  if (market === "EN") {
    if (cqDeep.trapScore !== undefined) {
      contextParts.push(`Trap Score: ${cqDeep.trapScore}/100 (higher = more trap risk)`);
    }
    if (cqDeep.whaleFlows) {
      const whaleRatio = cqDeep.whaleFlows.whaleRatio ?? 0;
      const isHighPressure = cqDeep.whaleFlows.isHighPressure ?? false;
      contextParts.push(
        `Whale Ratio: ${(whaleRatio * 100).toFixed(1)}% ${isHighPressure ? "(High Selling Pressure)" : "(Normal)"}`
      );
    }
    if (cqDeep.liquidations && cqDeep.liquidations.totalLiquidations > 0) {
      const totalLiq = cqDeep.liquidations.totalLiquidations;
      contextParts.push(
        `24h Liquidations: $${(totalLiq / 1_000_000).toFixed(1)}M (high liquidations = potential volatility)`
      );
    }
  }

  // KO市場: Kimchi Premium
  if (market === "KO" && cqDeep.kimchiPremium !== undefined) {
    contextParts.push(
      `Kimchi Premium: ${(cqDeep.kimchiPremium * 100).toFixed(2)}% (Upbit premium, >5% = high risk)`
    );
  }

  // JA市場: NUPL, SOPR, riskReward
  if (market === "JA") {
    if (cqDeep.longTerm) {
      if (cqDeep.longTerm.nupl !== undefined && cqDeep.longTerm.nupl !== 0) {
        contextParts.push(
          `NUPL: ${cqDeep.longTerm.nupl.toFixed(3)} (Network Unrealized Profit/Loss, negative = oversold)`
        );
      }
      if (cqDeep.longTerm.sopr !== undefined) {
        contextParts.push(
          `SOPR: ${cqDeep.longTerm.sopr.toFixed(3)} (Spent Output Profit Ratio, <1.0 = selling at loss)`
        );
      }
      if (cqDeep.longTerm.sopr30d !== undefined) {
        contextParts.push(
          `SOPR 30d MA: ${cqDeep.longTerm.sopr30d.toFixed(3)} (30-day moving average, <1.0 = potential bottom)`
        );
      }
    }
    if (cqDeep.riskReward !== undefined) {
      contextParts.push(
        `Risk/Reward Ratio: ${cqDeep.riskReward.toFixed(2)} (higher = better risk-adjusted opportunity)`
      );
    }
  }

  return contextParts.length > 0
    ? `\n\nDeep Metrics Context:\n${contextParts.join("\n")}\n\nUse these metrics to explain WHY the current score and signal were generated. Reference specific values when relevant.`
    : "";
}

// ---- Market summary (Regular / Emergency) --------------------------
/**
 * 市場分析（Grok AI）
 * @param {string} marketDataJson - 市場データ（JSON文字列）
 * @param {string} xSentimentJson - Xセンチメント（JSON文字列）
 * @param {string} lang - 言語コード
 * @param {string} market - 市場コード (EN/AR/KO/JA/ES/PT-BR)
 * @param {Object} cqDeep - CryptoQuant深掘りデータ（オプション）
 * @param {Object} trapInfo - トラップ検出情報（オプション）{trapSeverity: 'NONE'|'LOW'|'MEDIUM'|'HIGH'|'CRITICAL', trapScore: number}
 * @returns {Promise<string>} Grok分析結果
 */
async function analyzeMarket(
  marketDataJson,
  xSentimentJson,
  lang = "en",
  market = "EN",
  cqDeep = null,
  trapInfo = null
) {
  if (!XAI_API_KEY) return "HOLD - Grok offline.";

  const targetLang = (lang || "en").toLowerCase();
  const marketCode = market || "EN";

  // トラップ検出情報からリスクモードを決定
  let riskMode = "normal";
  if (trapInfo) {
    const severity = trapInfo.trapSeverity || trapInfo.severity || "NONE";
    const trapScore = trapInfo.trapScore || trapInfo.score || 0;
    if (severity === "CRITICAL" || trapScore >= 70) {
      riskMode = "critical";
    } else if (severity === "HIGH" || trapScore >= 50) {
      riskMode = "high";
    }
  }

  // リスクモードに応じてペルソナプロンプトを取得（高リスク時は「辛口モード」を適用）
  const systemPrompt = getMarketPersonaPrompt(marketCode, riskMode);

  // ユーザーコンテンツを構築
  let userContent = `Market data: ${marketDataJson}\nSentiment: ${xSentimentJson}\nLanguage: ${targetLang}`;

  // トラップ検出情報をコンテキストに追加（高リスク時）
  if (trapInfo && riskMode !== "normal") {
    const trapContext =
      `\n\n⚠️ TRAP DETECTION ALERT:\n` +
      `Trap Severity: ${trapInfo.trapSeverity || trapInfo.severity || "UNKNOWN"}\n` +
      `Trap Score: ${(trapInfo.trapScore || trapInfo.score || 0).toFixed(0)}/100 (higher = more risk)\n` +
      `Trap Type: ${trapInfo.trapType || trapInfo.type || "UNKNOWN"}\n` +
      `This is a high-risk situation. Provide direct, critical analysis focused on risk avoidance.`;
    userContent += trapContext;
  }

  // CryptoQuant深掘りデータをコンテキストに追加
  if (cqDeep) {
    const cqContext = formatCryptoQuantContext(cqDeep, marketCode);
    if (cqContext) {
      userContent += cqContext;
    }
  }

  // Phase 2: 用途別モデルを使用（MARKET: 定期市場分析）
  // 緊急配信時は MARKET_EMERGENCY を使用（trapInfo が存在する場合）
  const modelToUse =
    trapInfo &&
    (trapInfo.trapSeverity === "CRITICAL" ||
      trapInfo.trapSeverity === "HIGH" ||
      (trapInfo.trapScore || 0) >= 50)
      ? GROK_MODEL_MARKET_EMERGENCY
      : GROK_MODEL_MARKET;

  // P0 FIX: openaiクライアントが初期化されていない場合のチェック
  if (!openai || !XAI_API_KEY) {
    return "HOLD - Grok offline (API key not configured).";
  }

  try {
    const completion = await openai.chat.completions.create({
      model: modelToUse, // Phase 2: 用途別モデルを使用
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userContent
        }
      ],
      max_tokens: 800,
      temperature: 0.6
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    return text || "HOLD - Grok offline.";
  } catch (error) {
    logCompactError("analyzeMarket", error);
    if (isRateLimitError(error)) return "HOLD - rate limited";
    // ここはcron側が catch して aiAnalysis=null に落とす想定でもOK
    throw error;
  }
}

// ---- X sentiment Live Search ---------------------------------------
// 目的：X上の雰囲気を「構造化JSON」で返す（後方互換：文字列でもOK）
async function analyzeXSentimentLive(prompt, lang = "en") {
  if (!XAI_API_KEY || !openai) {
    // 後方互換：cron.js は object なら採用、string なら無視してデフォ値
    return "Grok offline";
  }

  const targetLang = (lang || "en").toLowerCase();

  // Phase 2: 用途別モデルを使用（X_LIVE: Xリアルタイム）
  const modelToUse = GROK_MODEL_X_LIVE;

  try {
    const completion = await openai.chat.completions.create({
      model: modelToUse, // Phase 2: 用途別モデルを使用
      messages: [
        {
          role: "system",
          content:
            'You are "Dr. Grok", a spicy psychological counselor and mental coach for crypto traders. ' +
            "You scan X (Twitter) for BTC trader chatter and analyze it from a psychological perspective. " +
            'Your role is to detect mental blocks (FOMO/FEAR/GREED, "always needing to trade", "waiting is weakness") and provide coaching advice. ' +
            "Return ONLY JSON. No markdown. No code fences. " +
            'Schema: {"whaleBias":number,"retailFomo":number,"newsImpact":number,"summary":string,"sources":[{"handle":string,"note":string}],"mentalBlocks":["FOMO"|"FEAR"|"GREED"|"ALWAYS_TRADING"|"WAITING_IS_WEAKNESS"],"psychologicalPattern":string,"coachingAdvice":string} ' +
            "Numbers: whaleBias [-100..100], retailFomo [0..100], newsImpact [-100..100]. " +
            "mentalBlocks: Array of detected mental blocks. " +
            "psychologicalPattern: Description of typical trader psychological patterns observed. " +
            "coachingAdvice: Mental coach advice to unlock potential and remove mental blocks (strict but encouraging tone)."
        },
        {
          role: "user",
          content:
            `Task: Live X sentiment scan + Mental Block Detection.\n` +
            `Language: ${targetLang}\n` +
            `Query: ${prompt}\n` +
            `Analyze trader psychology: Detect mental blocks (FOMO/FEAR/GREED, "always needing to trade", "waiting is weakness"). ` +
            `Identify psychological patterns. Provide coaching advice (strict but encouraging tone). ` +
            `If you cannot access live data, return JSON with summary="Live Search unavailable" and empty sources.`
        }
      ],
      max_tokens: 600,
      temperature: 0.4
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    if (!text) return "Live Search unavailable";

    // 後方互換：JSONならobject、崩れてたらstring返し（cron側で握りつぶせる）
    const obj = safeJsonParse(text);
    return obj || text;
  } catch (error) {
    logCompactError("analyzeXSentimentLive", error);
    if (isRateLimitError(error)) return "Live Search unavailable";
    return "Live Search unavailable";
  }
}

/**
 * Grokがインフルエンサーを発掘（引用リポスト用）
 * @param {string} lang - 言語コード
 * @param {Object} options - オプション
 * @param {number} options.maxResults - 最大結果数（デフォルト: 10）
 * @returns {Promise<Array>} インフルエンサー情報の配列
 */
async function discoverInfluencersForQuoteRepost(lang = "en", options = {}) {
  if (!XAI_API_KEY) {
    return [];
  }

  const { maxResults = 10 } = options;
  const targetLang = (lang || "en").toLowerCase();
  const modelToUse = GROK_MODEL_X_LIVE;

  // キャッシュキーを生成（5分単位でキャッシュ）
  const now = new Date();
  const cacheMinute = Math.floor(now.getMinutes() / 5) * 5; // 5分単位
  const cacheKey = `grok:influencers:${targetLang}:${now.toISOString().split("T")[0]}:${now.getHours()}:${cacheMinute}`;
  const cacheTTL = 600; // 10分（秒）

  // キャッシュから取得を試みる
  if (kv) {
    try {
      const cached = await kv.get(cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        console.log(`[Grok] Using cached influencers for ${targetLang} (${cached.length} results)`);
        // 🔒 キャッシュから取得した場合もlangフィールドを設定
        return cached.slice(0, maxResults).map((inf) => ({
          ...inf,
          lang: inf.lang || targetLang // langフィールドがない場合は現在の言語を設定
        }));
      }
    } catch (error) {
      console.warn("[Grok] Failed to get cached influencers:", error.message);
    }
  }

  // P0 FIX: openaiクライアントが初期化されていない場合のチェック
  if (!openai) {
    return [];
  }

  try {
    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        {
          role: "system",
          content:
            'You are "Dr. Grok", an expert at finding hot influencers on X (Twitter) for crypto/BTC content. ' +
            "Find influencers with high engagement rates, recent viral posts, and active audiences. " +
            "Return ONLY JSON. No markdown. No code fences. " +
            'Schema: {"influencers":[{"username":string,"tweetId":string,"tweetText":string,"engagementRate":number,"followerCount":number,"recentImpressions":number}]} ' +
            "influencers: Array of influencer accounts with their recent hot tweets. " +
            "engagementRate: Estimated engagement rate (0-1, e.g., 0.05 = 5%). " +
            "followerCount: Estimated follower count (use ranges: 10000-50000, 50000-100000, 100000-500000, 500000+). " +
            "recentImpressions: Estimated recent impressions for their tweets (use ranges: 10000-50000, 50000-100000, 100000+). " +
            "CRITICAL: Include tweetId for EVERY influencer tweet. Without tweetId, we cannot quote repost."
        },
        {
          role: "user",
          content:
            `Task: Find ${maxResults} HIGH-ENGAGEMENT influencers on X posting about BTC/crypto in ${targetLang} language.\n` +
            `PRIORITY: Focus on accounts with EXCEPTIONAL engagement rates and viral potential.\n\n` +
            `CRITICAL CRITERIA (in order of importance):\n` +
            `1. ENGAGEMENT RATE: Prioritize accounts with 7%+ engagement rate (higher is better)\n` +
            `2. RECENT VIRAL POSTS: Look for tweets with HIGH impressions:\n` +
            `   - English (EN): 100,000-300,000+ impressions\n` +
            `   - Other languages: 50,000-200,000+ impressions\n` +
            `3. ACTIVE AUDIENCES: Accounts with high interaction rates (likes, retweets, replies)\n` +
            `4. CRYPTO/BTC FOCUS: Accounts that consistently post about crypto/BTC\n` +
            `5. OPTIMAL FOLLOWER COUNT: 10,000-500,000 followers (sweet spot for engagement)\n\n` +
            `ENGAGEMENT RATE TARGETS:\n` +
            `- Excellent: 8%+ engagement rate\n` +
            `- Very Good: 6-8% engagement rate\n` +
            `- Good: 5-6% engagement rate\n` +
            `- Minimum: 4%+ engagement rate\n\n` +
            `Return ${maxResults} influencers with their recent hot tweets.\n` +
            `CRITICAL REQUIREMENTS:\n` +
            `1. Include tweetId for EVERY tweet (numeric tweet ID, required for quote reposting)\n` +
            `2. Prioritize tweets WITH tweet IDs AND high engagement rates (7%+ preferred)\n` +
            `3. Focus on accounts with EXCEPTIONAL engagement rates (7%+ is ideal, 5%+ minimum)\n` +
            `4. Include actual tweet text in tweetText field\n` +
            `5. Use username without @ symbol\n` +
            `6. recentImpressions should reflect actual viral tweet performance (not follower count)\n` +
            `7. engagementRate should be accurate (likes + retweets + replies) / impressions\n` +
            `8. Prioritize accounts that consistently get high engagement on crypto/BTC content\n\n` +
            `Example (EXCELLENT): {"username":"cryptotrader","tweetId":"1234567890123456789","tweetText":"BTC analysis...","engagementRate":0.09,"followerCount":50000,"recentImpressions":180000}\n` +
            `Example (VERY GOOD): {"username":"btc_analyst","tweetId":"9876543210987654321","tweetText":"Market update...","engagementRate":0.07,"followerCount":120000,"recentImpressions":150000}`
        }
      ],
      max_tokens: 6000, // より多くのインフルエンサーを返すため増加
      temperature: 0.2 // より一貫性のある結果のため低く設定
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    if (!text) return [];

    const obj = safeJsonParse(text);
    if (obj && obj.influencers && Array.isArray(obj.influencers)) {
      // 🔒 言語整合性保証: すべてのインフルエンサーにlangフィールドを設定
      const influencers = obj.influencers.slice(0, maxResults).map((inf) => ({
        ...inf,
        lang: targetLang // 明示的に言語を設定
      }));

      // キャッシュに保存
      if (kv && influencers.length > 0) {
        try {
          await kv.set(cacheKey, influencers, { ex: cacheTTL });
          console.log(`[Grok] Cached influencers for ${targetLang} (TTL: ${cacheTTL}s)`);
        } catch (error) {
          console.warn("[Grok] Failed to cache influencers:", error.message);
        }
      }

      return influencers;
    }

    return [];
  } catch (error) {
    logCompactError("discoverInfluencersForQuoteRepost", error);
    return [];
  }
}

/**
 * Grokが引用リポスト用のテキストを生成
 * @param {string} lang - 言語コード
 * @param {Object} influencerTweet - インフルエンサーのツイート情報
 * @param {Object} reportData - レポートデータ（Trap Score、価格など）
 * @param {string} deepLink - Telegram Deep Link
 * @param {string} minimalVersionPostUrl - 無料版（Minimal Version）ポストのURL（オプション）
 * @param {Object} minimalContent - 無料版メッセージのキーポイント（オプション）
 * @param {Object} optimizationStrategy - Grok×Gemini最適化戦略（オプション）
 * @returns {Promise<string>} 引用リポスト用のテキスト
 */
async function generateQuoteRepostText(
  lang = "en",
  influencerTweet,
  reportData = null,
  deepLink,
  minimalVersionPostUrl = null,
  minimalContent = null,
  optimizationStrategy = null
) {
  if (!XAI_API_KEY) {
    // フォールバック: テンプレートを使用
    const baseText = `🚨 This is exactly what we predicted!\n\nOur Trap Score analysis caught this. Get the FREE report:\n\n${deepLink}`;
    if (minimalVersionPostUrl) {
      return `${baseText}\n\n📊 Full analysis: ${minimalVersionPostUrl}\n\n#BTC #TrapDefence`;
    }
    return `${baseText}\n\n#BTC #TrapDefence`;
  }

  const targetLang = (lang || "en").toLowerCase();
  const modelToUse = GROK_MODEL_X_LIVE;

  try {
    // 無料版（Minimal Version）ポストへのリンクをプロンプトに追加
    const minimalVersionContext = minimalVersionPostUrl
      ? `\n\nIMPORTANT: There is a detailed Minimal Version post available at: ${minimalVersionPostUrl}\n` +
        `You can reference this post to drive traffic to the full analysis. Use phrases like "See full analysis" or "Check detailed report" with the link.`
      : "";

    // CRITICAL: Grok×Gemini最適化戦略をコンテキストに追加
    let optimizationContext = "";
    if (optimizationStrategy) {
      const opt = optimizationStrategy.optimization;
      optimizationContext =
        `\n\n=== OPTIMIZATION STRATEGY (Grok X Algorithm × Gemini Psychology) ===\n` +
        `CONTENT OPTIMIZATION:\n` +
        `- Question CTA: ${opt?.content?.questionCTA || "N/A"}\n` +
        `- Links: ${opt?.content?.links || "N/A"}\n` +
        `- Hashtags: ${opt?.content?.hashtags || "N/A"}\n` +
        `- Emoji: ${opt?.content?.emoji || "N/A"}\n` +
        `- Psychological Triggers: ${opt?.content?.psychologicalTriggers?.join(", ") || "N/A"}\n` +
        `- Cognitive Biases: ${opt?.content?.cognitiveBiases?.join(", ") || "N/A"}\n` +
        `TIMING: ${opt?.timing || "N/A"}\n` +
        `FORMAT: ${opt?.format || "N/A"}\n` +
        `FUNNEL OPTIMIZATION:\n` +
        `- Telegram Opt-In: ${opt?.funnel?.telegramOptIn || "N/A"}\n` +
        `- Whop Conversion: ${opt?.funnel?.whopConversion || "N/A"}\n` +
        `- Funnel Psychological Triggers: ${opt?.funnel?.psychologicalTriggers?.join(", ") || "N/A"}\n` +
        `PRIORITY ORDER: ${opt?.priorityOrder?.join(" → ") || "N/A"}\n` +
        `\nCRITICAL: Apply these optimization strategies to maximize engagement rate and CVR!\n`;
      if (opt?.persona) {
        optimizationContext += `\n\n${opt.persona}\n`;
      }
      // ドローダウン時は統合戦略（Grok＋Gemini＋仕掛け）を追加 → 投稿が回るほど渇望・売上に直結
      if (optimizationStrategy.drawdownPrompt) {
        optimizationContext += `\n\n${optimizationStrategy.drawdownPrompt}\n`;
      }
    } else {
      optimizationContext = `\n\n${getPersonaPromptContext()}\n`;
    }

    // 無料版メッセージのキーポイントをコンテキストに追加（Xアルゴリズム最適化用）
    let minimalContentContext = "";
    if (minimalContent) {
      const contentParts = [];

      if (minimalContent.hook) {
        contentParts.push(`Hook Message: "${minimalContent.hook}"`);
      }

      if (minimalContent.trapScore !== null) {
        contentParts.push(`Trap Score: ${minimalContent.trapScore}/100`);
      }

      if (minimalContent.dataPoints && minimalContent.dataPoints.length > 0) {
        contentParts.push(
          `Key Data Points:\n${minimalContent.dataPoints.map((dp) => `- ${dp}`).join("\n")}`
        );
      }

      if (minimalContent.drGrokInsight) {
        contentParts.push(`Dr. Grok's Insight: "${minimalContent.drGrokInsight}"`);
      }

      if (minimalContent.mentalNote) {
        contentParts.push(`Mental Note: "${minimalContent.mentalNote}"`);
      }

      if (minimalContent.whatToAvoid && minimalContent.whatToAvoid.length > 0) {
        contentParts.push(
          `What to Avoid:\n${minimalContent.whatToAvoid.map((item) => `- ${item}`).join("\n")}`
        );
      }

      if (contentParts.length > 0) {
        minimalContentContext = `\n\n🎯 HIGH-QUALITY MINIMAL VERSION CONTENT (Use these powerful elements to maximize engagement):\n${contentParts.join("\n\n")}\n\nCRITICAL: Incorporate these high-quality elements naturally into your quote repost. Use the hook message, Dr. Grok's insight, or mental note to create compelling, algorithm-optimized content that drives clicks.`;
      }
    }

    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        {
          role: "system",
          content:
            'You are "Dr. Grok", an expert at creating engaging quote reposts on X (Twitter) that maximize impressions and engagement rate. ' +
            "You have integrated knowledge from Grok X Algorithm Analysis and Gemini High Engagement + High CVR Algorithm Analysis. " +
            "Create compelling, attention-grabbing quote repost text that drives clicks to Telegram and maximizes engagement. " +
            "Be concise, engaging, and use psychological triggers (urgency, FOMO, curiosity, social proof, scarcity). " +
            "Long posts supported (up to 25,000 characters). Include the Telegram Deep Link. " +
            "CRITICAL ALGORITHM OPTIMIZATION (2026 X Algorithm - Grok×Gemini Optimized): " +
            '1. INTERACTIVE CTA/QUESTION (PRIORITY 1): MUST include an open-ended question CTA at the end (e.g., "これ試した人いる？結果教えて！", "What do you think?", "How do you trade?", "You joining the pump? Reply Y/N") to maximize engagement. Question CTA should be 20-30% of the post, naturally placed. End 70-80% of posts with open questions to spike replies 3-5x. ' +
            "2. LINK OPTIMIZATION (PRIORITY 2): External links should be limited to 1 per post. Use shortened URLs (t.co, bit.ly) with UTM parameters. Place links in thread Post 2/3 (not first) or in poll options to avoid suppression. Deep Link priority (Telegram/Whop). " +
            "3. HASHTAG OPTIMIZATION (PRIORITY 3): Use 2-3 max: 1 trending (#BTC), 1-2 niche (#TrapDefence, #CryptoFOMO). More than 3-5 hashtags risks spam detection. Front-load hashtags for mobile scans. " +
            "4. EMOJI OPTIMIZATION: Use 3-5 relevant emojis (🚀📈🔥💎) for 20-25% visual lift. Cluster at start/end, avoid overuse. High-contrast emojis for mobile scroll-stop. " +
            '5. PSYCHOLOGICAL TRIGGERS: Use Loss Aversion ("機会を逃す恐怖"), Reciprocity (先に価値を提供), Authority Bias (実績・数字), Confirmation Bias (既存の信念を肯定). ' +
            '6. COGNITIVE BIASES: Leverage Bandwagon Effect ("みんなが注目している"), Scarcity Principle ("残り枠わずか"), In-Group Bias ("勝者側への所属"). ' +
            "CRITICAL: MUST include the Telegram Deep Link to drive opt-ins to the free Minimal Version. " +
            "CRITICAL: Do NOT include any Whop.com or checkout links in your output. We append Whop links separately as link-only (policy: Whop = link only on X). " +
            'FUNNEL OPTIMIZATION: Use "Velvet Rope Strategy" - frame Telegram as exclusive "inner circle" for chosen information elites, not just a notification tool. ' +
            "If high-quality Minimal Version content is provided (hook message, Dr. Grok insight, mental note, data points), incorporate these powerful elements naturally to maximize algorithm engagement. " +
            'If a Minimal Version post URL is provided, include a reference to it (e.g., "See full analysis" or "Check detailed report") to drive cross-pollination. ' +
            "Format: [Hook/Agreement] [Unique Value] [Question CTA] [Telegram Deep Link] [Hashtags]. " +
            "TIMING: Post during peak retail FOMO windows (UTC 8-11 AM, 12-16, 20-24 for crypto volatility). Align with sentiment score >40. " +
            "Make it irresistible to click and maximize engagement rate."
        },
        {
          role: "user",
          content:
            `Task: Generate a compelling quote repost text in ${targetLang} language.\n\n` +
            `Original tweet: "${influencerTweet.tweetText?.substring(0, 200) || "N/A"}"\n` +
            `Trap Score: ${reportData?.trapScore || "N/A"}/100\n` +
            `BTC Price: $${reportData?.priceUsd?.toLocaleString("en-US", { maximumFractionDigits: 0 }) || "N/A"}\n` +
            `Telegram Deep Link: ${deepLink}${minimalVersionContext}${optimizationContext}\n\n` +
            `Requirements (2026 X Algorithm + High Engagement CVR Optimization - Grok×Gemini Optimized):\n` +
            `- Maximum 140 characters (quote repost limit)\n` +
            `- Engaging and attention-grabbing\n` +
            `- PRIORITY 1: MUST include an open-ended question CTA at the end (e.g., "これ試した人いる？結果教えて！", "What do you think?", "You joining the pump? Reply Y/N") - REQUIRED for algorithm optimization. Question CTA should be 20-30% of the post, naturally placed. End 70-80% of posts with open questions to spike replies 3-5x.\n` +
            `- PRIORITY 2: MUST include Telegram Deep Link - REQUIRED for opt-in funnel (users must be able to click to join free Minimal Version). Do NOT include Whop.com or checkout URLs; we append them as link-only after your text.\n` +
            `- PRIORITY 3: Use 2-3 max hashtags: 1 trending (#BTC), 1-2 niche (#TrapDefence, #CryptoFOMO). More than 3-5 hashtags risks spam detection. Front-load for mobile scans.\n` +
            `- Use 3-5 relevant emojis (🚀📈🔥💎) for 20-25% visual lift. Cluster at start/end, avoid overuse. High-contrast emojis for mobile scroll-stop.\n` +
            `- PSYCHOLOGICAL TRIGGERS: Use Loss Aversion ("機会を逃す恐怖"), Reciprocity (先に価値を提供), Authority Bias (実績・数字), Confirmation Bias (既存の信念を肯定), Scarcity Principle ("残り枠わずか").\n` +
            `- COGNITIVE BIASES: Leverage Bandwagon Effect ("みんなが注目している"), In-Group Bias ("勝者側への所属"), Immediate Gratification (即時報酬).\n` +
            `- FUNNEL OPTIMIZATION: Use "Velvet Rope Strategy" - frame Telegram as exclusive "inner circle" for chosen information elites. Use "Risk Reversal" - present Whop as "shortcut to results" for lazy brain.\n` +
            `- If Minimal Version post URL is provided, include a reference to it (e.g., "See full analysis: [URL]" or "Check detailed report: [URL]") - OPTIONAL but recommended for cross-pollination\n` +
            `- Format: [Hook/Agreement] [Unique Value] [Question CTA] [Telegram Deep Link] [Hashtags]\n` +
            `- Example (with Minimal Version content): "Agree! ${minimalContent?.drGrokInsight ? `"${minimalContent.drGrokInsight.substring(0, 40)}..."` : "TrapDefence detected this signal"} 🚀 これ試した人いる？結果教えて！ Free: t.me/... #BTC #TrapDefence"\n` +
            `- Example (without Minimal Version content): "Agree! TrapDefence detected this signal 🚀 You joining the pump? Reply Y/N Free: t.me/... #BTC #TrapDefence"\n` +
            `- Make it irresistible to click and maximize engagement rate (target: 0.003% → 1.0%+)\n\n` +
            `Generate the quote repost text:`
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    if (text && text.length <= 25000) {
      return text;
    }

    // フォールバック: テンプレートを使用
    const baseText = `🚨 This is exactly what we predicted!\n\nOur Trap Score analysis caught this. Get the FREE report:\n\n${deepLink}`;
    if (minimalVersionPostUrl) {
      return `${baseText}\n\n📊 Full analysis: ${minimalVersionPostUrl}\n\n#BTC #TrapDefence`;
    }
    return `${baseText}\n\n#BTC #TrapDefence`;
  } catch (error) {
    logCompactError("generateQuoteRepostText", error);
    // フォールバック: テンプレートを使用
    const baseText = `🚨 This is exactly what we predicted!\n\nOur Trap Score analysis caught this. Get the FREE report:\n\n${deepLink}`;
    let resultText = baseText;

    if (minimalVersionPostUrl) {
      resultText += `\n\n📊 Full analysis: ${minimalVersionPostUrl}`;
    }

    return `${resultText}\n\n#BTC #TrapDefence`;
  }
}

/**
 * Grokがトレンドハッシュタグを発見（Xアルゴリズム最適化用）
 * @param {string} lang - 言語コード
 * @param {string} topic - トピック（例: 'BTC'）
 * @returns {Promise<Array>} トレンドハッシュタグ配列（ボリューム中10k-100k投稿で競合低）
 */
async function discoverTrendingHashtags(lang = "en", topic = "BTC") {
  if (!XAI_API_KEY || !openai) {
    return ["#Bitcoin"]; // フォールバック
  }

  const targetLang = (lang || "en").toLowerCase();
  const modelToUse = GROK_MODEL_X_LIVE;

  try {
    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        {
          role: "system",
          content:
            'You are "Dr. Grok", an expert at finding trending hashtags on X (Twitter) for crypto/BTC content. ' +
            "Find hashtags with medium volume (10k-100k posts) and low competition to maximize algorithm visibility. " +
            "Return ONLY JSON. No markdown. No code fences. " +
            'Schema: {"hashtags":[{"tag":string,"volume":string,"competition":"low|medium|high"}]} ' +
            "hashtags: Array of trending hashtags related to the topic. " +
            'volume: Estimated post volume (e.g., "10k-50k", "50k-100k"). ' +
            'competition: Competition level (prefer "low" or "medium"). ' +
            "Return 1-3 hashtags maximum."
        },
        {
          role: "user",
          content:
            `Task: Find trending hashtags on X for ${topic} content in ${targetLang} language.\n` +
            `Requirements:\n` +
            `- Medium volume (10k-100k posts) - not too popular, not too niche\n` +
            `- Low to medium competition\n` +
            `- Related to ${topic} and crypto trading\n` +
            `- Return 1-3 hashtags maximum\n` +
            `- Format: #HashtagName (with # symbol)\n\n` +
            `Find trending hashtags:`
        }
      ],
      max_tokens: 200,
      temperature: 0.3
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    if (!text) return ["#Bitcoin"];

    const obj = safeJsonParse(text);
    if (obj && obj.hashtags && Array.isArray(obj.hashtags)) {
      // 競合低・中を優先し、ボリューム中（10k-100k）のものを選択
      const filtered = obj.hashtags
        .filter((h) => h.competition === "low" || h.competition === "medium")
        .filter((h) => {
          const vol = h.volume || "";
          return vol.includes("10k") || vol.includes("50k") || vol.includes("100k");
        })
        .slice(0, 3);

      if (filtered.length > 0) {
        return filtered.map((h) => (h.tag.startsWith("#") ? h.tag : `#${h.tag}`));
      }
    }

    return ["#Bitcoin"]; // フォールバック
  } catch (error) {
    logCompactError("discoverTrendingHashtags", error);
    return ["#Bitcoin"]; // フォールバック
  }
}

/**
 * 汎用チャット完了（セールスレターコンテスト等）
 * @param {Object} opts - { model, messages, max_tokens, temperature }
 * @returns {Promise<string|null>}
 */
async function generateChatCompletion(opts = {}) {
  const model = opts.model || GROK_MODEL_X_LIVE;
  const messages = opts.messages || [];
  const max_tokens = opts.max_tokens ?? 800;
  const temperature = opts.temperature ?? 0.8;
  if (!XAI_API_KEY || !openai) return null;
  try {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens,
      temperature
    });
    return completion?.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    logCompactError("generateChatCompletion", error);
    return null;
  }
}

module.exports = {
  analyzeMarket,
  analyzeXSentimentLive,
  discoverInfluencersForQuoteRepost, // インフルエンサー発掘（引用リポスト用）
  generateQuoteRepostText, // 引用リポスト用テキスト生成
  discoverTrendingHashtags, // トレンドハッシュタグ発見（Xアルゴリズム最適化用）
  generateChatCompletion, // 汎用チャット（セールスレターコンテスト等）
  isRateLimitError,
  // Phase 2: 用途別モデルをエクスポート（他のファイルで使用可能）
  GROK_MODEL_MARKET,
  GROK_MODEL_MARKET_EMERGENCY,
  GROK_MODEL_X_LIVE,
  GROK_MODEL_HIGH_RES
};
