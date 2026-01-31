// services/grok/client.js

const OpenAI = require("openai");
const { getMarketProfile } = require("../../config/marketProfiles");

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

// OpenAI 互換クライアント（xAI エンドポイント向け）
const openai = new OpenAI({
  apiKey: XAI_API_KEY || "DUMMY_KEY_FOR_OFFLINE",
  baseURL: BASE_URL
});

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
  if (!XAI_API_KEY) {
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
        return cached.slice(0, maxResults).map(inf => ({
          ...inf,
          lang: inf.lang || targetLang, // langフィールドがない場合は現在の言語を設定
        }));
      }
    } catch (error) {
      console.warn("[Grok] Failed to get cached influencers:", error.message);
    }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        {
          role: "system",
          content:
            'You are "Dr. Grok", an expert at finding REAL, ACTIVE influencers on X (Twitter) for crypto/BTC content. ' +
            'You MUST find ACTUAL influencers with REAL tweet IDs that can be used for quote reposting RIGHT NOW. ' +
            'DO NOT invent or estimate data. Only return influencers you can verify exist on X. ' +
            "Return ONLY JSON. No markdown. No code fences. No explanations. " +
            'Schema: {"influencers":[{"username":string,"tweetId":string,"tweetText":string,"engagementRate":number,"followerCount":number,"recentImpressions":number}]} ' +
            "CRITICAL: tweetId MUST be a REAL numeric tweet ID (18-19 digits) from X. Without a REAL tweetId, the quote repost will FAIL. " +
            "username MUST be the actual X username (without @). " +
            "tweetText MUST be the actual tweet text from X. " +
            "engagementRate: 0-1 (e.g., 0.05 = 5%). " +
            "followerCount: Actual number or range (e.g., 50000 or '10000-50000'). " +
            "recentImpressions: Actual number or range based on tweet performance."
        },
        {
          role: "user",
          content:
            `URGENT: Find ${maxResults} HIGH-QUALITY, REAL, ACTIVE influencers on X posting about BTC/crypto in ${targetLang} language.\n\n` +
            `CRITICAL PHILOSOPHY: QUALITY OVER QUANTITY. Better to return 10 PERFECT influencers than 50 mediocre ones.\n\n` +
            `CRITICAL: These influencers will be used for quote reposting IMMEDIATELY. If tweetId is missing or invalid, the entire system fails.\n\n` +
            `MANDATORY REQUIREMENTS (ALL must be met - NO EXCEPTIONS):\n` +
            `1. REAL tweetId: Must be a REAL numeric tweet ID (18-19 digits) from an ACTUAL tweet on X\n` +
            `   - Extract from actual tweet URL: twitter.com/username/status/1234567890123456789\n` +
            `   - MUST be verifiable and accessible\n` +
            `2. REAL username: Must be the actual X username (without @ symbol)\n` +
            `   - Must be 1-15 characters\n` +
            `   - Must match the tweetId's account\n` +
            `3. REAL tweetText: Must be the actual text from the tweet (copy exactly)\n` +
            `   - Must be 1-280 characters\n` +
            `   - Must match the tweetId's content\n` +
            `4. ACTIVE account: Account must have posted in the last 7 days\n` +
            `5. CRYPTO/BTC content: Tweet must be about crypto/BTC/trading\n` +
            `6. ENGAGEMENT: Tweet must have engagement (likes, retweets, replies)\n\n` +
            `SELECTION CRITERIA (Choose influencers based on these factors):\n` +
            `1. HIGH ENGAGEMENT RATE: 7%+ preferred, 5%+ minimum\n` +
            `   - Calculation: (likes + retweets + replies) / impressions\n` +
            `   - This is the PRIMARY quality indicator\n` +
            `2. RECENT VIRAL POSTS: High impressions (100k+ preferred)\n` +
            `   - Indicates active, engaged audience\n` +
            `3. OPTIMAL FOLLOWER COUNT: 10,000-500,000\n` +
            `   - Too small (<1k): Limited reach\n` +
            `   - Too large (>500k): Lower engagement rates\n` +
            `4. ACTIVE AUDIENCE: High interaction rates\n` +
            `   - Comments, retweets, likes indicate engaged followers\n` +
            `5. CRYPTO/BTC FOCUS: Account primarily posts about crypto/BTC\n` +
            `   - Not general influencers who occasionally post about crypto\n` +
            `   - Must have consistent crypto/BTC content\n\n` +
            `HOW TO FIND REAL TWEET IDs:\n` +
            `1. Search X for "${targetLang === 'en' ? 'BTC' : targetLang === 'ja' ? 'ビットコイン' : targetLang === 'ko' ? '비트코인' : targetLang === 'es' ? 'BTC' : targetLang === 'pt-br' ? 'BTC' : targetLang === 'ar' ? 'بيتكوين' : 'BTC'} crypto trading" in ${targetLang}\n` +
            `2. Filter by: Recent (last 7 days), High engagement\n` +
            `3. Find tweets with high engagement (likes + retweets + replies > 1000)\n` +
            `4. Extract the REAL tweet ID from the tweet URL\n` +
            `   - Format: twitter.com/username/status/1234567890123456789\n` +
            `   - The number after /status/ is the tweetId\n` +
            `5. Copy the REAL username (without @) and tweet text\n` +
            `6. Calculate engagement rate: (likes + retweets + replies) / impressions\n` +
            `7. Verify follower count from the account profile\n\n` +
            `RETURN FORMAT:\n` +
            `Return EXACTLY ${maxResults} HIGH-QUALITY influencers in this format:\n` +
            `{"influencers":[{"username":"real_username","tweetId":"1234567890123456789","tweetText":"Actual tweet text here...","engagementRate":0.08,"followerCount":50000,"recentImpressions":150000}]}\n\n` +
            `VALIDATION CHECKLIST (Verify each influencer before returning):\n` +
            `✓ tweetId: 18-19 digits, numeric only, from real tweet URL\n` +
            `✓ username: 1-15 characters, no @ symbol, matches tweetId account\n` +
            `✓ tweetText: 1-280 characters, actual tweet content\n` +
            `✓ engagementRate: 0-1 (e.g., 0.08 = 8%), calculated from real data\n` +
            `✓ followerCount: > 0, actual number from account profile\n` +
            `✓ recentImpressions: > 0, actual number from tweet analytics\n\n` +
            `QUALITY OVER QUANTITY:\n` +
            `- If you can only find ${Math.floor(maxResults * 0.5)} high-quality influencers, return those ${Math.floor(maxResults * 0.5)}.\n` +
            `- DO NOT invent fake data to reach ${maxResults}.\n` +
            `- DO NOT use estimated or guessed values.\n` +
            `- Better to return 10 PERFECT influencers than 50 fake ones.\n\n` +
            `FAILURE MODE:\n` +
            `If you cannot find ${maxResults} REAL influencers with REAL tweet IDs, return fewer but VALID ones. ` +
            `DO NOT invent fake data. Quality is more important than quantity.`
        }
      ],
      max_tokens: 6000, // より多くのインフルエンサーを返すため増加
      temperature: 0.2 // より一貫性のある結果のため低く設定
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      console.warn(`[Grok] Empty response for ${targetLang} (maxResults: ${maxResults})`);
      return [];
    }

    // レスポンスの最初の500文字をログに出力（デバッグ用）
    const preview = text.length > 500 ? text.substring(0, 500) + '...' : text;
    console.log(`[Grok] Response preview for ${targetLang}: ${preview}`);

    const obj = safeJsonParse(text);
    if (!obj) {
      console.error(`[Grok] Failed to parse JSON for ${targetLang}. Response: ${preview}`);
      return [];
    }

    if (obj && obj.influencers && Array.isArray(obj.influencers)) {
      const rawCount = obj.influencers.length;
      console.log(`[Grok] Parsed ${rawCount} influencers from response for ${targetLang}`);
      
      // 🔒 言語整合性保証: すべてのインフルエンサーにlangフィールドを設定
      const influencers = obj.influencers.slice(0, maxResults).map(inf => ({
        ...inf,
        lang: targetLang, // 明示的に言語を設定
      }));

      console.log(`[Grok] Returning ${influencers.length} influencers for ${targetLang}`);

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

    console.warn(`[Grok] Invalid response structure for ${targetLang}. Expected 'influencers' array, got:`, Object.keys(obj || {}));
    return [];
  } catch (error) {
    const status = error?.status || error?.statusCode;
    const message = error?.message || String(error);
    
    console.error(`[Grok] Error discovering influencers for ${targetLang}:`, {
      status,
      message: message.substring(0, 200),
      maxResults
    });
    
    logCompactError("discoverInfluencersForQuoteRepost", error);
    
    // レート制限エラーの場合は特別なメッセージ
    if (status === 429 || message.includes('rate limit')) {
      console.warn(`[Grok] Rate limit hit for ${targetLang}. Please wait before retrying.`);
    }
    
    return [];
  }
}

/**
 * Grokが引用リポスト用のテキストを生成
 * @param {string} lang - 言語コード
 * @param {Object} influencerTweet - インフルエンサーのツイート情報
 * @param {Object} reportData - レポートデータ（Trap Score、価格など）
 * @param {string} deepLink - Telegram Deep Linkまたはチェックアウトリンク
 * @param {string} minimalVersionPostUrl - 無料版（Minimal Version）ポストのURL（オプション）
 * @param {Object} minimalContent - 無料版メッセージのキーポイント（オプション）
 * @param {Object} optimizationStrategy - Grok×Gemini最適化戦略（オプション）
 * @param {string} regularBriefingWhopUrl - Funnel 2用: 有料版（Regular Briefing）Whop URL（オプション）
 * @param {string} minimalCheckoutUrl - 無料版（Minimal Version）チェックアウトリンク（オプション）
 * @returns {Promise<string>} 引用リポスト用のテキスト
 */
async function generateQuoteRepostText(
  lang = "en",
  influencerTweet,
  reportData = null,
  deepLink,
  minimalVersionPostUrl = null,
  minimalContent = null,
  optimizationStrategy = null,
  regularBriefingWhopUrl = null, // Funnel 2用: 有料版（Regular Briefing）Whop URL
  minimalCheckoutUrl = null // 無料版（Minimal Version）チェックアウトリンク（オプション）
) {
  if (!XAI_API_KEY) {
    // フォールバック: テンプレートを使用
    const baseText = `🚨 This is exactly what we predicted!\n\nOur Trap Score analysis caught this. Get the FREE report:\n\n${deepLink}`;
    if (minimalVersionPostUrl) {
      return `${baseText}\n\n📊 Full analysis: ${minimalVersionPostUrl}\n\n#BTC #TrapDefence`;
    }
    // Funnel 2用: 有料版クーポンコードPRを追加
    if (regularBriefingWhopUrl) {
      const { getWhopProductUrl } = require('../telegram/whop-links');
      const whopUrl = regularBriefingWhopUrl || getWhopProductUrl(lang);
      const promoLink = `${whopUrl}?promo=DEFEND50`;
      const promoTexts = {
        en: `🔥 PRO 50% OFF (DEFEND50): ${promoLink}`,
        ja: `🔥 PRO 50%OFF (DEFEND50): ${promoLink}`,
        es: `🔥 PRO 50% OFF (DEFEND50): ${promoLink}`,
        'pt-br': `🔥 PRO 50% OFF (DEFEND50): ${promoLink}`,
        ar: `🔥 PRO 50% خصم (DEFEND50): ${promoLink}`,
        ko: `🔥 PRO 50% 할인 (DEFEND50): ${promoLink}`,
      };
      const promoText = promoTexts[lang] || promoTexts.en;
      return `${baseText}\n\n${promoText}\n\n#BTC #TrapDefence`;
    }
    return `${baseText}\n\n#BTC #TrapDefence`;
  }

  const targetLang = (lang || "en").toLowerCase();
  const modelToUse = GROK_MODEL_X_LIVE;

  try {
    // 無料版（Minimal Version）チェックアウトリンクまたはポストへのリンクをプロンプトに追加
    // 🚀 WhopページのCTAボタン表示バグ回避: チェックアウトリンクを優先使用
    const minimalVersionLink = minimalCheckoutUrl || minimalVersionPostUrl;
    const minimalVersionContext = minimalVersionLink
      ? `\n\nIMPORTANT: FREE MINIMAL VERSION available. ${minimalCheckoutUrl ? 'Use checkout link' : 'Post available'} at: ${minimalVersionLink}\n` +
        `${minimalCheckoutUrl ? 'This is a FREE checkout link (no payment required). Use phrases like "Get free access", "Free checkout", or "Sign up for free" with the link. ' : 'You can reference this post to drive traffic to the full analysis. Use phrases like "See full analysis" or "Check detailed report" with the link. '}` +
        `CRITICAL: Emphasize that this is FREE and NO CREDIT CARD REQUIRED. This is Funnel 1 - free version opt-in.`
      : "";

    // Funnel 2用: 有料版（Regular Briefing）クーポンコードPRをプロンプトに追加
    const regularBriefingContext = regularBriefingWhopUrl
      ? `\n\nCRITICAL FUNNEL 2 (Direct Regular Briefing Conversion): There is a direct paid version (Regular Briefing) available with 50% OFF coupon code DEFEND50 at: ${regularBriefingWhopUrl}?promo=DEFEND50\n` +
        `You MUST include this coupon promotion in your quote repost text. Use phrases like "🔥 PRO 50% OFF (DEFEND50)" or similar promotional language in the target language. ` +
        `This is Funnel 2 - direct conversion to paid version, skipping the free version. The coupon code DEFEND50 is REQUIRED.`
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

    // P0 FIX: タイムアウト設定を追加（30秒以内）- Vercel Functionsの60秒制限を考慮
    const GROK_TIMEOUT_MS = 30000; // 30秒（60秒制限の半分）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GROK_TIMEOUT_MS);
    
    let completion;
    try {
      completion = await Promise.race([
        openai.chat.completions.create({
          model: modelToUse,
          messages: [
            {
              role: "system",
              content:
                'You are "Dr. Grok", an expert at creating engaging quote reposts on X (Twitter) that maximize impressions and engagement rate. ' +
                "You have integrated knowledge from Grok X Algorithm Analysis and Gemini High Engagement + High CVR Algorithm Analysis. " +
                "Create compelling, attention-grabbing quote repost text that drives clicks to Telegram and maximizes engagement. " +
                "Be concise, engaging, and use psychological triggers (urgency, FOMO, curiosity, social proof, scarcity). " +
                "Maximum 140 characters (quote repost limit). Include the Telegram Deep Link. " +
                "CRITICAL ALGORITHM OPTIMIZATION (2026 X Algorithm - Grok×Gemini Optimized): " +
                '1. INTERACTIVE CTA/QUESTION (PRIORITY 1): MUST include an open-ended question CTA OR standard CTA at the end. Use one of these CTA types based on funnel stage:\n' +
                '   - Funnel 1 (Free/Minimal Version): "Get access", "Sign up", "Join" (e.g., "Get access → [link]", "Sign up for free → [link]", "Join now → [link]")\n' +
                '   - Funnel 2 (Paid/Regular Briefing): "Subscribe", "Get offer", "Purchase" (e.g., "Subscribe now → [link]", "Get offer → [link]", "Purchase → [link]")\n' +
                '   - Engagement boost: Question CTA (e.g., "これ試した人いる？結果教えて！", "What do you think?", "How do you trade?", "You joining the pump? Reply Y/N")\n' +
                '   CTA should be 20-30% of the post, naturally placed. End 70-80% of posts with CTAs to maximize engagement and conversions. ' +
                "2. LINK OPTIMIZATION (PRIORITY 2): External links should be limited to 1 per post. Use shortened URLs (t.co, bit.ly) with UTM parameters. Place links in thread Post 2/3 (not first) or in poll options to avoid suppression. Deep Link priority (Telegram/Whop). " +
                "3. HASHTAG OPTIMIZATION (PRIORITY 3): Use 2-3 max: 1 trending (#BTC), 1-2 niche (#TrapDefence, #CryptoFOMO). More than 3-5 hashtags risks spam detection. Front-load hashtags for mobile scans. " +
                "4. EMOJI OPTIMIZATION: Use 3-5 relevant emojis (🚀📈🔥💎) for 20-25% visual lift. Cluster at start/end, avoid overuse. High-contrast emojis for mobile scroll-stop. " +
                '5. PSYCHOLOGICAL TRIGGERS: Use Loss Aversion ("機会を逃す恐怖"), Reciprocity (先に価値を提供), Authority Bias (実績・数字), Confirmation Bias (既存の信念を肯定). ' +
                '6. COGNITIVE BIASES: Leverage Bandwagon Effect ("みんなが注目している"), Scarcity Principle ("残り枠わずか"), In-Group Bias ("勝者側への所属"). ' +
                "CRITICAL: MUST include the Telegram Deep Link to drive opt-ins to the free Minimal Version. " +
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
                `Minimal Version Link: ${deepLink}${minimalCheckoutUrl ? ' (FREE checkout link - no payment required)' : ' (Telegram Deep Link)'}${minimalVersionContext}${regularBriefingContext}${optimizationContext}\n\n` +
                `Requirements (2026 X Algorithm + High Engagement CVR Optimization - Grok×Gemini Optimized):\n` +
                `- Maximum 140 characters (quote repost limit)\n` +
                `- Engaging and attention-grabbing\n` +
                        `- PRIORITY 1: MUST include a CTA at the end. Choose based on funnel stage:\n` +
                        `  * Funnel 1 (Free/Minimal Version): Use "Get access", "Sign up", or "Join" (e.g., "Get access → [Telegram Deep Link]", "Sign up for free → [link]", "Join now → [link]")\n` +
                        `  * Funnel 2 (Paid/Regular Briefing): Use "Subscribe", "Get offer", or "Purchase" (e.g., "Subscribe now → [Whop URL]", "Get offer → [Whop URL]", "Purchase → [Whop URL]")\n` +
                        `  * Engagement boost: Use question CTA (e.g., "これ試した人いる？結果教えて！", "What do you think?", "You joining the pump? Reply Y/N")\n` +
                        `  CTA should be 20-30% of the post, naturally placed. End 70-80% of posts with CTAs to maximize engagement and conversions.\n` +
                `- PRIORITY 2: MUST include Minimal Version link (checkout link preferred, or Telegram Deep Link as fallback) - REQUIRED for opt-in funnel (users must be able to click to join free Minimal Version). ${minimalCheckoutUrl ? 'Use checkout link with clear "FREE" and "NO CREDIT CARD REQUIRED" messaging. ' : 'Use Telegram Deep Link. '}Limit to 1 external link per post. Use shortened URLs with UTM parameters.\n` +
                `- PRIORITY 2.5: CRITICAL FUNNEL 2 - MUST include Regular Briefing Whop URL with 50% OFF coupon code DEFEND50 if provided. Use promotional language like "🔥 PRO 50% OFF (DEFEND50): [URL]?promo=DEFEND50" in the target language. This is for direct conversion to paid version, skipping the free version. The coupon code DEFEND50 is REQUIRED.\n` +
                `- PRIORITY 3: Use 2-3 max hashtags: 1 trending (#BTC), 1-2 niche (#TrapDefence, #CryptoFOMO). More than 3-5 hashtags risks spam detection. Front-load for mobile scans.\n` +
                `- Use 3-5 relevant emojis (🚀📈🔥💎) for 20-25% visual lift. Cluster at start/end, avoid overuse. High-contrast emojis for mobile scroll-stop.\n` +
                `- PSYCHOLOGICAL TRIGGERS: Use Loss Aversion ("機会を逃す恐怖"), Reciprocity (先に価値を提供), Authority Bias (実績・数字), Confirmation Bias (既存の信念を肯定), Scarcity Principle ("残り枠わずか").\n` +
                `- COGNITIVE BIASES: Leverage Bandwagon Effect ("みんなが注目している"), In-Group Bias ("勝者側への所属"), Immediate Gratification (即時報酬).\n` +
                `- FUNNEL OPTIMIZATION: Use "Velvet Rope Strategy" - frame Telegram as exclusive "inner circle" for chosen information elites. Use "Risk Reversal" - present Whop as "shortcut to results" for lazy brain.\n` +
                `- FUNNEL 2 (Direct Regular Briefing Conversion): If Regular Briefing Whop URL is provided, MUST include the 50% OFF coupon code promotion (DEFEND50) in your quote repost. This is for direct conversion to paid version, skipping the free version. Example: "🔥 PRO 50% OFF (DEFEND50): [URL]?promo=DEFEND50" in the target language.\n` +
                `- If Minimal Version post URL is provided, include a reference to it (e.g., "See full analysis: [URL]" or "Check detailed report: [URL]") - OPTIONAL but recommended for cross-pollination\n` +
                `- Format: [Hook/Agreement] [Unique Value] [Question CTA] [Telegram Deep Link] [Hashtags]\n` +
                `- Example (with Minimal Version checkout link): "Agree! ${minimalContent?.drGrokInsight ? `"${minimalContent.drGrokInsight.substring(0, 40)}..."` : "TrapDefence detected this signal"} 🚀 Get free access (no card): ${minimalCheckoutUrl ? '[checkout-link]' : 't.me/...'} #BTC #TrapDefence"\n` +
                `- Example (with Telegram Deep Link fallback): "Agree! TrapDefence detected this signal 🚀 You joining the pump? Reply Y/N Free: t.me/... #BTC #TrapDefence"\n` +
                `- Make it irresistible to click and maximize engagement rate (target: 0.003% → 1.0%+)\n\n` +
                `Generate the quote repost text:`
            }
          ],
          max_tokens: 300,
          temperature: 0.7
        }),
        new Promise((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error(`Grok API timeout after ${GROK_TIMEOUT_MS}ms`));
          });
        })
      ]);
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.message?.includes('timeout')) {
        console.warn(`[Grok] Quote repost text generation timeout after ${GROK_TIMEOUT_MS}ms, using fallback template`);
        throw error; // フォールバック処理に委譲
      }
      throw error;
    }

    const text = completion?.choices?.[0]?.message?.content?.trim();
    if (text && text.length <= 280) {
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

    // Minimal Version URLを追加（クロスポリネーション）
    if (minimalVersionPostUrl && resultText.length + minimalVersionPostUrl.length + 30 <= 280) {
      resultText += `\n\n📊 Full analysis: ${minimalVersionPostUrl}`;
    }

    // Funnel 2用: 有料版クーポンコードPRを追加
    if (regularBriefingWhopUrl && resultText.length + 100 <= 280) {
      const { getWhopProductUrl } = require('../telegram/whop-links');
      const whopUrl = regularBriefingWhopUrl || getWhopProductUrl(lang);
      const promoLink = `${whopUrl}?promo=DEFEND50`;
      const promoTexts = {
        en: `\n\n🔥 PRO 50% OFF (DEFEND50): ${promoLink}`,
        ja: `\n\n🔥 PRO 50%OFF (DEFEND50): ${promoLink}`,
        es: `\n\n🔥 PRO 50% OFF (DEFEND50): ${promoLink}`,
        'pt-br': `\n\n🔥 PRO 50% OFF (DEFEND50): ${promoLink}`,
        ar: `\n\n🔥 PRO 50% خصم (DEFEND50): ${promoLink}`,
        ko: `\n\n🔥 PRO 50% 할인 (DEFEND50): ${promoLink}`,
      };
      const promoText = promoTexts[lang] || promoTexts.en;
      if (resultText.length + promoText.length <= 280) {
        resultText += promoText;
      }
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
  if (!XAI_API_KEY) {
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

module.exports = {
  analyzeMarket,
  analyzeXSentimentLive,
  discoverInfluencersForQuoteRepost, // インフルエンサー発掘（引用リポスト用）
  generateQuoteRepostText, // 引用リポスト用テキスト生成
  discoverTrendingHashtags, // トレンドハッシュタグ発見（Xアルゴリズム最適化用）
  isRateLimitError,
  // Phase 2: 用途別モデルをエクスポート（他のファイルで使用可能）
  GROK_MODEL_MARKET,
  GROK_MODEL_MARKET_EMERGENCY,
  GROK_MODEL_X_LIVE,
  GROK_MODEL_HIGH_RES
};
