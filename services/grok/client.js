// services/grok/client.js

const OpenAI = require('openai');
const { getMarketProfile } = require('../../api/config/marketProfiles');

// Vercel KV（キャッシュ用）
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[Grok] @vercel/kv not available:', error.message);
}

const XAI_API_KEY = process.env.XAI_API_KEY;
const BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

// Phase 2: 用途別モデル環境変数の分割（SSOT準拠）
const APP_ENV = process.env.APP_ENV || process.env.NODE_ENV || 'production';

// 開発環境: すべてハイエンドモデルを使用（Composer最優先）
// 本番環境: 用途別モデルを使用（コスト最適化）
const isDevelopment = APP_ENV === 'development';

// 用途別モデル定義
const GROK_MODEL_MARKET = process.env.GROK_MODEL_MARKET || (isDevelopment ? 'grok-4-1-fast-reasoning' : 'grok-4-0709');
const GROK_MODEL_MARKET_EMERGENCY = process.env.GROK_MODEL_MARKET_EMERGENCY || 'grok-4-1-fast-reasoning';
const GROK_MODEL_X_LIVE = process.env.GROK_MODEL_X_LIVE || 'grok-4-1-fast-reasoning';
const GROK_MODEL_HIGH_RES = process.env.GROK_MODEL_HIGH_RES || 'grok-4-1-fast-reasoning';

// 後方互換性のため、GROK_MODEL_REASONINGとGROK_MODEL_LIVEも残す
const GROK_MODEL_REASONING = process.env.GROK_MODEL_REASONING || GROK_MODEL_MARKET;
const GROK_MODEL_LIVE = process.env.GROK_MODEL_LIVE || GROK_MODEL_X_LIVE;

// ---- offline notice -------------------------------------------------
if (!XAI_API_KEY) {
  console.warn('⚠️ XAI_API_KEY is not set. Grok client will operate in offline fallback mode.');
}

// OpenAI 互換クライアント（xAI エンドポイント向け）
const openai = new OpenAI({
  apiKey: XAI_API_KEY || 'DUMMY_KEY_FOR_OFFLINE',
  baseURL: BASE_URL,
});

// ---- utilities ------------------------------------------------------
function isRateLimitError(error) {
  const status = error?.status || error?.statusCode;
  const type = error?.error?.type || error?.type;
  return status === 429 || type === 'rate_limit_error' || type === 'RateLimitError';
}

function logCompactError(prefix, error) {
  const status = error?.status || error?.statusCode;
  const message = error?.message || String(error);
  console.error(`${prefix} status=${status} message=${message}`);
}

function safeJsonParse(text) {
  if (typeof text !== 'string') return null;
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
function getMarketPersonaPrompt(market = 'EN', riskMode = 'normal') {
  const profile = getMarketProfile(market);
  const persona = profile?.persona || 'PRECISION_SNIPER';
  const tagline = profile?.tagline || 'Market Referee - Spot traps before you fall';

  const personaPrompts = {
    PRECISION_SNIPER: // EN
      'You are "Dr. Grok", a Precision Sniper for active BTC traders. ' +
      'You think like a veteran X (Twitter) crypto trader, not a generic analyst. ' +
      'Be concise, tactical, data-driven, and risk-first. ' +
      'Provide decisive analysis with clear entry/exit signals when the edge is clear.',
    SHIELD_WALL: // AR
      'You are "Dr. Grok", a Shield Wall protector for conservative BTC traders. ' +
      'Your primary role is capital protection. ' +
      'Be ultra-conservative, emphasize waiting for perfect setups, and prioritize safety over opportunity. ' +
      'Most of the time (70%), you recommend waiting. This is a feature, not a bug.',
    KIMCHI_SNIPER: // KO
      'You are "Dr. Grok", a Kimchi Sniper specializing in Korean market dynamics (Kimchi Premium, Upbit flows). ' +
      'Be fast, precise, and alert to Korean exchange-specific signals. ' +
      'Think like a Korean crypto trader who watches Upbit/Binance spreads closely.',
    KAIZEN_OPTIMIZER: // JA
      'You are "Dr. Grok", a Kaizen Optimizer for improvement-focused BTC traders. ' +
      'Emphasize continuous improvement, risk-reward optimization, and daily 1% gains. ' +
      'Be methodical, detail-oriented, and focus on long-term consistency over quick wins.',
    VOZ_COMUN: // ES
      'You are "Dr. Grok", representing the "Voz Común" (Common Voice) for Spanish-speaking BTC traders. ' +
      'Think like a collective of 5,000 traders protecting each other. ' +
      'Be community-focused, practical, and emphasize shared wisdom.',
    VOZ_COMUM: // PT-BR
      'You are "Dr. Grok", representing the "Voz Comum" (Common Voice) for Portuguese-speaking BTC traders. ' +
      'Think like a collective of 5,000 traders protecting each other. ' +
      'Be community-focused, practical, and emphasize shared wisdom.',
  };

  const basePrompt = personaPrompts[persona] || personaPrompts.PRECISION_SNIPER;

  // 高リスク時に「辛口モード」プロンプトを追加
  if (riskMode === 'critical' || riskMode === 'high') {
    const criticalModePrompt = 
      '⚠️ CRITICAL MODE ACTIVATED: A high-risk trap has been detected. ' +
      'Be brutally honest and direct. No sugar-coating. ' +
      'Point out specific risks and flaws in the current market analysis without hesitation. ' +
      'Your role is to prevent traders from making costly mistakes. ' +
      'If you see a trap, call it out clearly and forcefully. ' +
      'Explain WHY this is dangerous, WHAT could go wrong, and WHAT to avoid. ' +
      'Prioritize capital protection over opportunity.';
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
function formatCryptoQuantContext(cqDeep = {}, market = 'EN') {
  const contextParts = [];

  // EN市場: trapScore, whaleFlows, liquidations
  if (market === 'EN') {
    if (cqDeep.trapScore !== undefined) {
      contextParts.push(`Trap Score: ${cqDeep.trapScore}/100 (higher = more trap risk)`);
    }
    if (cqDeep.whaleFlows) {
      const whaleRatio = cqDeep.whaleFlows.whaleRatio ?? 0;
      const isHighPressure = cqDeep.whaleFlows.isHighPressure ?? false;
      contextParts.push(`Whale Ratio: ${(whaleRatio * 100).toFixed(1)}% ${isHighPressure ? '(High Selling Pressure)' : '(Normal)'}`);
    }
    if (cqDeep.liquidations && cqDeep.liquidations.totalLiquidations > 0) {
      const totalLiq = cqDeep.liquidations.totalLiquidations;
      contextParts.push(`24h Liquidations: $${(totalLiq / 1_000_000).toFixed(1)}M (high liquidations = potential volatility)`);
    }
    if (cqDeep.binance) {
      if (cqDeep.binance.currentFundingRate !== undefined) {
        contextParts.push(`Funding Rate: ${(cqDeep.binance.currentFundingRate * 100).toFixed(4)}%`);
      }
      if (cqDeep.binance.currentLongShortRatio !== undefined) {
        contextParts.push(`Long/Short Ratio: ${cqDeep.binance.currentLongShortRatio.toFixed(2)}`);
      }
    }
  }

  // KO市場: Kimchi Premium
  if (market === 'KO' && cqDeep.kimchiPremium !== undefined) {
    contextParts.push(`Kimchi Premium: ${(cqDeep.kimchiPremium * 100).toFixed(2)}% (Upbit premium over Binance, >5% = high risk)`);
  }

  // JA市場: NUPL, SOPR, riskReward
  if (market === 'JA') {
    if (cqDeep.longTerm) {
      if (cqDeep.longTerm.nupl !== undefined && cqDeep.longTerm.nupl !== 0) {
        contextParts.push(`NUPL: ${cqDeep.longTerm.nupl.toFixed(3)} (Network Unrealized Profit/Loss, negative = oversold)`);
      }
      if (cqDeep.longTerm.sopr !== undefined) {
        contextParts.push(`SOPR: ${cqDeep.longTerm.sopr.toFixed(3)} (Spent Output Profit Ratio, <1.0 = selling at loss)`);
      }
      if (cqDeep.longTerm.sopr30d !== undefined) {
        contextParts.push(`SOPR 30d MA: ${cqDeep.longTerm.sopr30d.toFixed(3)} (30-day moving average, <1.0 = potential bottom)`);
      }
    }
    if (cqDeep.riskReward !== undefined) {
      contextParts.push(`Risk/Reward Ratio: ${cqDeep.riskReward.toFixed(2)} (higher = better risk-adjusted opportunity)`);
    }
  }

  return contextParts.length > 0 ? `\n\nDeep Metrics Context:\n${contextParts.join('\n')}\n\nUse these metrics to explain WHY the current score and signal were generated. Reference specific values when relevant.` : '';
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
async function analyzeMarket(marketDataJson, xSentimentJson, lang = 'en', market = 'EN', cqDeep = null, trapInfo = null) {
  if (!XAI_API_KEY) return 'HOLD - Grok offline.';

  const targetLang = (lang || 'en').toLowerCase();
  const marketCode = market || 'EN';

  // トラップ検出情報からリスクモードを決定
  let riskMode = 'normal';
  if (trapInfo) {
    const severity = trapInfo.trapSeverity || trapInfo.severity || 'NONE';
    const trapScore = trapInfo.trapScore || trapInfo.score || 0;
    if (severity === 'CRITICAL' || trapScore >= 70) {
      riskMode = 'critical';
    } else if (severity === 'HIGH' || trapScore >= 50) {
      riskMode = 'high';
    }
  }

  // リスクモードに応じてペルソナプロンプトを取得（高リスク時は「辛口モード」を適用）
  const systemPrompt = getMarketPersonaPrompt(marketCode, riskMode);

  // ユーザーコンテンツを構築
  let userContent = `Market data: ${marketDataJson}\nSentiment: ${xSentimentJson}\nLanguage: ${targetLang}`;

  // トラップ検出情報をコンテキストに追加（高リスク時）
  if (trapInfo && riskMode !== 'normal') {
    const trapContext = `\n\n⚠️ TRAP DETECTION ALERT:\n` +
      `Trap Severity: ${trapInfo.trapSeverity || trapInfo.severity || 'UNKNOWN'}\n` +
      `Trap Score: ${(trapInfo.trapScore || trapInfo.score || 0).toFixed(0)}/100 (higher = more risk)\n` +
      `Trap Type: ${trapInfo.trapType || trapInfo.type || 'UNKNOWN'}\n` +
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
  const modelToUse = (trapInfo && (trapInfo.trapSeverity === 'CRITICAL' || trapInfo.trapSeverity === 'HIGH' || (trapInfo.trapScore || 0) >= 50))
    ? GROK_MODEL_MARKET_EMERGENCY
    : GROK_MODEL_MARKET;

  try {
    const completion = await openai.chat.completions.create({
      model: modelToUse, // Phase 2: 用途別モデルを使用
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userContent,
        },
      ],
      max_tokens: 800,
      temperature: 0.6,
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    return text || 'HOLD - Grok offline.';
  } catch (error) {
    logCompactError('analyzeMarket', error);
    if (isRateLimitError(error)) return 'HOLD - rate limited';
    // ここはcron側が catch して aiAnalysis=null に落とす想定でもOK
    throw error;
  }
}

/**
 * GrokでXからリードを発見（リード発見専用）
 * @param {string} prompt - リード発見クエリ
 * @param {string} lang - 言語コード
 * @returns {Promise<Object>} リード情報を含むJSON
 */
async function discoverLeadsOnX(prompt, lang = 'en') {
  if (!XAI_API_KEY) {
    return { sources: [], summary: 'Grok offline' };
  }

  const targetLang = (lang || 'en').toLowerCase();
  const modelToUse = GROK_MODEL_X_LIVE;

  try {
    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        {
          role: 'system',
          content:
            'You are "Dr. Grok", scanning X (Twitter) to find BTC traders who need help. ' +
            'Find as many traders as possible who have lost money, been hacked, or are experiencing FOMO/fear. ' +
            'Return ONLY JSON. No markdown. No code fences. ' +
            'Schema: {"sources":[{"handle":string,"note":string,"tweetId":string}],"summary":string} ' +
            'sources: Array of X handles (@username), tweet content (note), and tweet IDs. ' +
            'Return AT LEAST 50-100 sources if possible. More is better. ' +
            'tweetId: The numeric tweet ID (REQUIRED for replying - MUST be included). ' +
            'If tweet ID is not available, use null, but prioritize tweets WITH tweet IDs. ' +
            'Focus on finding traders who mention: lost BTC, stolen wallet, hack attack, lost everything, afraid to trade, lost money trading, liquidation, margin call, trapped, FOMO, fear, panic, scam, fraud, rug pull. ' +
            'CRITICAL: Include tweetId for EVERY source. Without tweetId, we cannot reply to the tweet.',
        },
        {
          role: 'user',
          content:
            `Task: Find HIGH-QUALITY BTC traders on X who need protection/help.\n` +
            `Language: ${targetLang}\n` +
            `Query: ${prompt}\n` +
            `Focus on PERFECT MATCH leads: traders who have lost BTC, been hacked, or are in distress. ` +
            `Return 50-100 HIGH-QUALITY X handles (@username), tweet content, and tweet IDs. ` +
            `CRITICAL REQUIREMENTS:\n` +
            `1. Include tweetId for EVERY source (numeric tweet ID, required for replying)\n` +
            `2. Prioritize tweets WITH tweet IDs over those without\n` +
            `3. Return as many sources as possible (aim for 50-100)\n` +
            `4. Only return leads that are clearly experiencing losses, hacks, or FOMO/fear\n` +
            `5. Include the actual tweet text in the "note" field\n` +
            `6. Use the format: @username (without @ symbol in handle field)\n` +
            `Example: {"handle":"username","note":"I lost all my BTC in a hack attack","tweetId":"1234567890123456789"}`,
        },
      ],
      max_tokens: 8000, // 最大限のリードを取得するため増加（50-100 sources対応）
      temperature: 0.3, // より一貫性のある結果のため温度を下げる
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    if (!text) return { sources: [], summary: 'No results' };

    const obj = safeJsonParse(text);
    return obj || { sources: [], summary: text };
  } catch (error) {
    logCompactError('discoverLeadsOnX', error);
    return { sources: [], summary: 'Error: ' + error.message };
  }
}

// ---- X sentiment Live Search ---------------------------------------
// 目的：X上の雰囲気を「構造化JSON」で返す（後方互換：文字列でもOK）
async function analyzeXSentimentLive(prompt, lang = 'en') {
  if (!XAI_API_KEY) {
    // 後方互換：cron.js は object なら採用、string なら無視してデフォ値
    return 'Grok offline';
  }

  const targetLang = (lang || 'en').toLowerCase();

  // Phase 2: 用途別モデルを使用（X_LIVE: Xリアルタイム）
  const modelToUse = GROK_MODEL_X_LIVE;

  try {
    const completion = await openai.chat.completions.create({
      model: modelToUse, // Phase 2: 用途別モデルを使用
      messages: [
        {
          role: 'system',
          content:
            'You are "Dr. Grok", a spicy psychological counselor and mental coach for crypto traders. ' +
            'You scan X (Twitter) for BTC trader chatter and analyze it from a psychological perspective. ' +
            'Your role is to detect mental blocks (FOMO/FEAR/GREED, "always needing to trade", "waiting is weakness") and provide coaching advice. ' +
            'Return ONLY JSON. No markdown. No code fences. ' +
            'Schema: {"whaleBias":number,"retailFomo":number,"newsImpact":number,"summary":string,"sources":[{"handle":string,"note":string}],"mentalBlocks":["FOMO"|"FEAR"|"GREED"|"ALWAYS_TRADING"|"WAITING_IS_WEAKNESS"],"psychologicalPattern":string,"coachingAdvice":string} ' +
            'Numbers: whaleBias [-100..100], retailFomo [0..100], newsImpact [-100..100]. ' +
            'mentalBlocks: Array of detected mental blocks. ' +
            'psychologicalPattern: Description of typical trader psychological patterns observed. ' +
            'coachingAdvice: Mental coach advice to unlock potential and remove mental blocks (strict but encouraging tone).',
        },
        {
          role: 'user',
          content:
            `Task: Live X sentiment scan + Mental Block Detection.\n` +
            `Language: ${targetLang}\n` +
            `Query: ${prompt}\n` +
            `Analyze trader psychology: Detect mental blocks (FOMO/FEAR/GREED, "always needing to trade", "waiting is weakness"). ` +
            `Identify psychological patterns. Provide coaching advice (strict but encouraging tone). ` +
            `If you cannot access live data, return JSON with summary="Live Search unavailable" and empty sources.`,
        },
      ],
      max_tokens: 600,
      temperature: 0.4,
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    if (!text) return 'Live Search unavailable';

    // 後方互換：JSONならobject、崩れてたらstring返し（cron側で握りつぶせる）
    const obj = safeJsonParse(text);
    return obj || text;
  } catch (error) {
    logCompactError('analyzeXSentimentLive', error);
    if (isRateLimitError(error)) return 'Live Search unavailable';
    return 'Live Search unavailable';
  }
}

/**
 * Grokがインフルエンサーを発掘（引用リポスト用）
 * @param {string} lang - 言語コード
 * @param {Object} options - オプション
 * @param {number} options.maxResults - 最大結果数（デフォルト: 10）
 * @returns {Promise<Array>} インフルエンサー情報の配列
 */
async function discoverInfluencersForQuoteRepost(lang = 'en', options = {}) {
  if (!XAI_API_KEY) {
    return [];
  }

  const { maxResults = 10 } = options;
  const targetLang = (lang || 'en').toLowerCase();
  const modelToUse = GROK_MODEL_X_LIVE;
  
  // キャッシュキーを生成（5分単位でキャッシュ）
  const now = new Date();
  const cacheMinute = Math.floor(now.getMinutes() / 5) * 5; // 5分単位
  const cacheKey = `grok:influencers:${targetLang}:${now.toISOString().split('T')[0]}:${now.getHours()}:${cacheMinute}`;
  const cacheTTL = 600; // 10分（秒）
  
  // キャッシュから取得を試みる
  if (kv) {
    try {
      const cached = await kv.get(cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        console.log(`[Grok] Using cached influencers for ${targetLang} (${cached.length} results)`);
        return cached.slice(0, maxResults);
      }
    } catch (error) {
      console.warn('[Grok] Failed to get cached influencers:', error.message);
    }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        {
          role: 'system',
          content:
            'You are "Dr. Grok", an expert at finding hot influencers on X (Twitter) for crypto/BTC content. ' +
            'Find influencers with high engagement rates, recent viral posts, and active audiences. ' +
            'Return ONLY JSON. No markdown. No code fences. ' +
            'Schema: {"influencers":[{"username":string,"tweetId":string,"tweetText":string,"engagementRate":number,"followerCount":number,"recentImpressions":number}]} ' +
            'influencers: Array of influencer accounts with their recent hot tweets. ' +
            'engagementRate: Estimated engagement rate (0-1, e.g., 0.05 = 5%). ' +
            'followerCount: Estimated follower count (use ranges: 10000-50000, 50000-100000, 100000-500000, 500000+). ' +
            'recentImpressions: Estimated recent impressions for their tweets (use ranges: 10000-50000, 50000-100000, 100000+). ' +
            'CRITICAL: Include tweetId for EVERY influencer tweet. Without tweetId, we cannot quote repost.',
        },
        {
          role: 'user',
          content:
            `Task: Find ${maxResults} hot influencers on X posting about BTC/crypto in ${targetLang} language.\n` +
            `Focus on accounts with:\n` +
            `- High engagement rates (5%+)\n` +
            `- Recent viral posts (high impressions)\n` +
            `- Active audiences\n` +
            `- Crypto/BTC related content\n\n` +
            `Return ${maxResults} influencers with their recent hot tweets.\n` +
            `CRITICAL REQUIREMENTS:\n` +
            `1. Include tweetId for EVERY tweet (numeric tweet ID, required for quote reposting)\n` +
            `2. Prioritize tweets WITH tweet IDs\n` +
            `3. Focus on accounts with high engagement rates\n` +
            `4. Include actual tweet text in tweetText field\n` +
            `5. Use username without @ symbol\n` +
            `Example: {"username":"cryptotrader","tweetId":"1234567890123456789","tweetText":"BTC analysis...","engagementRate":0.08,"followerCount":50000,"recentImpressions":50000}`,
        },
      ],
      max_tokens: 4000,
      temperature: 0.3,
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    if (!text) return [];

    const obj = safeJsonParse(text);
    if (obj && obj.influencers && Array.isArray(obj.influencers)) {
      const influencers = obj.influencers.slice(0, maxResults);
      
      // キャッシュに保存
      if (kv && influencers.length > 0) {
        try {
          await kv.set(cacheKey, influencers, { ex: cacheTTL });
          console.log(`[Grok] Cached influencers for ${targetLang} (TTL: ${cacheTTL}s)`);
        } catch (error) {
          console.warn('[Grok] Failed to cache influencers:', error.message);
        }
      }
      
      return influencers;
    }

    return [];
  } catch (error) {
    logCompactError('discoverInfluencersForQuoteRepost', error);
    return [];
  }
}

/**
 * Grokが引用リポスト用のテキストを生成
 * @param {string} lang - 言語コード
 * @param {Object} influencerTweet - インフルエンサーのツイート情報
 * @param {Object} reportData - レポートデータ（Trap Score、価格など）
 * @param {string} deepLink - Telegram Deep Link
 * @returns {Promise<string>} 引用リポスト用のテキスト
 */
async function generateQuoteRepostText(lang = 'en', influencerTweet, reportData = null, deepLink) {
  if (!XAI_API_KEY) {
    // フォールバック: テンプレートを使用
    return `🚨 This is exactly what we predicted!\n\nOur Trap Score analysis caught this. Get the FREE report:\n\n${deepLink}\n\n#BTC #TrapDefence`;
  }

  const targetLang = (lang || 'en').toLowerCase();
  const modelToUse = GROK_MODEL_X_LIVE;

  try {
    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        {
          role: 'system',
          content:
            'You are "Dr. Grok", an expert at creating engaging quote reposts on X (Twitter) that maximize impressions. ' +
            'Create compelling, attention-grabbing quote repost text that drives clicks to Telegram. ' +
            'Be concise, engaging, and use psychological triggers (urgency, FOMO, curiosity). ' +
            'Maximum 200 characters. Include the Telegram Deep Link. ' +
            'Use relevant hashtags. Make it irresistible to click.',
        },
        {
          role: 'user',
          content:
            `Task: Generate a compelling quote repost text in ${targetLang} language.\n\n` +
            `Original tweet: "${influencerTweet.tweetText?.substring(0, 200) || 'N/A'}"\n` +
            `Trap Score: ${reportData?.trapScore || 'N/A'}/100\n` +
            `BTC Price: $${reportData?.priceUsd?.toLocaleString('en-US', { maximumFractionDigits: 0 }) || 'N/A'}\n` +
            `Telegram Deep Link: ${deepLink}\n\n` +
            `Requirements:\n` +
            `- Maximum 200 characters\n` +
            `- Engaging and attention-grabbing\n` +
            `- Include Telegram Deep Link\n` +
            `- Use psychological triggers (urgency, FOMO, curiosity)\n` +
            `- Use relevant hashtags\n` +
            `- Make it irresistible to click\n\n` +
            `Generate the quote repost text:`,
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    if (text && text.length <= 280) {
      return text;
    }

    // フォールバック: テンプレートを使用
    return `🚨 This is exactly what we predicted!\n\nOur Trap Score analysis caught this. Get the FREE report:\n\n${deepLink}\n\n#BTC #TrapDefence`;
  } catch (error) {
    logCompactError('generateQuoteRepostText', error);
    // フォールバック: テンプレートを使用
    return `🚨 This is exactly what we predicted!\n\nOur Trap Score analysis caught this. Get the FREE report:\n\n${deepLink}\n\n#BTC #TrapDefence`;
  }
}

module.exports = {
  analyzeMarket,
  analyzeXSentimentLive,
  discoverLeadsOnX, // リード発見専用（Grok X AI API）
  discoverInfluencersForQuoteRepost, // インフルエンサー発掘（引用リポスト用）
  generateQuoteRepostText, // 引用リポスト用テキスト生成
  isRateLimitError,
  // Phase 2: 用途別モデルをエクスポート（他のファイルで使用可能）
  GROK_MODEL_MARKET,
  GROK_MODEL_MARKET_EMERGENCY,
  GROK_MODEL_X_LIVE,
  GROK_MODEL_HIGH_RES,
};
