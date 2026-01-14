// services/grok/client.js

const OpenAI = require('openai');
const { getMarketProfile } = require('../../api/config/marketProfiles');

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

module.exports = {
  analyzeMarket,
  analyzeXSentimentLive,
  isRateLimitError,
  // Phase 2: 用途別モデルをエクスポート（他のファイルで使用可能）
  GROK_MODEL_MARKET,
  GROK_MODEL_MARKET_EMERGENCY,
  GROK_MODEL_X_LIVE,
  GROK_MODEL_HIGH_RES,
};
