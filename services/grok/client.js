// services/grok/client.js

const OpenAI = require('openai');

const XAI_API_KEY = process.env.XAI_API_KEY;
const BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

// モデル名は env で上書き可能（デフォルトは reasoning ）
const GROK_MODEL_REASONING = process.env.GROK_MODEL_REASONING || 'grok-4-0709';
const GROK_MODEL_LIVE = process.env.GROK_MODEL_LIVE || GROK_MODEL_REASONING;

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

// ---- Market summary (Regular / Emergency) --------------------------
async function analyzeMarket(marketDataJson, xSentimentJson, lang = 'en') {
  if (!XAI_API_KEY) return 'HOLD - Grok offline.';

  const targetLang = (lang || 'en').toLowerCase();
  try {
    const completion = await openai.chat.completions.create({
      model: GROK_MODEL_REASONING,
      messages: [
        {
          role: 'system',
          content:
            'You are "Dr. Grok", a crypto trading coach for active BTC traders. ' +
            'You think like a veteran X (Twitter) crypto trader, not a generic analyst. ' +
            'Be concise, tactical, and risk-first.',
        },
        {
          role: 'user',
          content: `Market data: ${marketDataJson}\nSentiment: ${xSentimentJson}\nLanguage: ${targetLang}`,
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

  try {
    const completion = await openai.chat.completions.create({
      model: GROK_MODEL_LIVE,
      messages: [
        {
          role: 'system',
          content:
            'You are "Dr. Grok". You scan X (Twitter) for BTC trader chatter and summarize it. ' +
            'Return ONLY JSON. No markdown. No code fences. ' +
            'Schema: {"whaleBias":number,"retailFomo":number,"newsImpact":number,"summary":string,"sources":[{"handle":string,"note":string}]} ' +
            'Numbers: whaleBias [-100..100], retailFomo [0..100], newsImpact [-100..100].',
        },
        {
          role: 'user',
          content:
            `Task: Live X sentiment scan.\n` +
            `Language: ${targetLang}\n` +
            `Query: ${prompt}\n` +
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
};
