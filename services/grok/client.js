// services/grok/client.js

const OpenAI = require('openai');

// xAI Grok 用 API キーとエンドポイント
const XAI_API_KEY = process.env.XAI_API_KEY;
const BASE_URL = 'https://api.x.ai/v1';

// モデル名は env で上書き可能にしておく（デフォルトは grok-4-0709）
const GROK_MODEL_REASONING =
  process.env.GROK_MODEL_REASONING || 'grok-4-0709';

if (!XAI_API_KEY) {
  console.warn('⚠️ XAI_API_KEY is not set. Grok client will operate in offline fallback mode.');
}

// OpenAI 互換クライアント（xAI エンドポイント向け）
const openai = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: BASE_URL,
});

// ---- 共通ユーティリティ ---------------------------------------

function isRateLimitError(error) {
  // xAI(OpenAI互換)のRateLimitは status 429 / error.type === 'rate_limit_error' など
  const status = error?.status || error?.statusCode;
  const type = error?.error?.type || error?.type;
  return status === 429 || type === 'rate_limit_error' || type === 'RateLimitError';
}

function logCompactError(prefix, error) {
  const status = error?.status || error?.statusCode;
  const message = error?.message || String(error);
  console.error(`${prefix} status=${status} message=${message}`);
}

// ---- 市場サマリー用（Dr. Grok レポート） ------------------------
async function analyzeMarket(marketData, lang = 'en') {
  if (!XAI_API_KEY) {
    return 'HOLD - Grok offline.';
  }

  const language = (lang || 'en').toLowerCase();

  try {
    const completion = await openai.chat.completions.create({
      model: GROK_MODEL_REASONING,
      messages: [
        {
          role: 'system',
          content:
            "You are Dr. Grok, the world's sharpest crypto whale hunter. " +
            'You speak like an experienced X (Twitter) crypto trader, not like a generic analyst. ' +
            `Always respond in ${language}. ` +
            'Target audience: active BTC day/swing traders looking for asymmetric risk/reward. ' +
            'You will receive JSON describing the market context (price, netflow, MPI, sentiment, score, signal, trap, whaleBias, retailFomo, newsImpact). ' +
            'Do NOT contradict the given score, signal, or trap fields. If signal is NONE, you MUST avoid giving hard entry signals and focus on scenarios and risk. ' +
            'First output a 3-line summary (each line short): ' +
            'Line1: environment (fear/greed, short description of trend, whale bias, retail FOMO). ' +
            'Line2: base stance (e.g., BUG STANDBY / defense, BULL STANDBY, ATTACK / accumulation). ' +
            'Line3: next trigger conditions and rough plan (what to watch, basic idea of how to act when triggered). ' +
            'Then provide a short narrative explanation (2–4 short paragraphs or bullets) about what whales/institutions and retail are likely doing, and how to exploit that behavior. ' +
            'Use consistent netflow wording like "Netflow: Inflow 3,214 BTC (buying pressure)" or "Netflow: Outflow 2,290 BTC (selling pressure)". ' +
            'Be concise, actionable, and avoid repetition across sentences. Maximum length: 1400 characters. ' +
            'Finish with a complete, self-contained thought.',
        },
        {
          role: 'user',
          content:
            'Analyze this BTC market context and explain what whales and ' +
            'institutions are likely doing, how retail is positioned, and how to exploit the situation as an active trader: ' +
            marketData,
        },
      ],
      temperature: 0.3,
      max_tokens: 600, // ≒1500文字クラス想定
    });

    return completion.choices[0]?.message?.content || 'HOLD - Grok offline.';
  } catch (error) {
    if (isRateLimitError(error)) {
      logCompactError('❌ Grok RateLimit (analyzeMarket):', error);
    } else {
      logCompactError('❌ Grok Error (analyzeMarket):', error);
    }

    // 429 を含め、どのエラーでも安全なフォールバックを返す
    return 'HOLD - Grok offline.';
  }
}

// ---- Grok Live Search で X センチメント推定 --------------------

async function analyzeXSentimentLive(
  query = 'latest BTC price top, whales, funding, liquidations on X',
) {
  const fallback = {
    whaleBias: 0,
    retailFomo: 50,
    newsImpact: 0,
    explanation: 'Live Search unavailable.',
  };

  if (!XAI_API_KEY) {
    return {
      ...fallback,
      explanation: 'Live Search unavailable (no API key).',
    };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: GROK_MODEL_REASONING,
      messages: [
        {
          role: 'system',
          content:
            'Use Live Search to fetch the latest BTC-related X (Twitter) posts and news. ' +
            'From all information, output JSON with fields: whaleBias (-1 to 1), ' +
            'retailFomo (0-100), newsImpact (0-100), explanation (string). ' +
            'Be contrarian: high retail FOMO with weak whale support is bearish.',
        },
        { role: 'user', content: query },
      ],
      temperature: 0.2,
      max_tokens: 400,
      // Live Search を search_parameters で有効化
      search_parameters: {
        mode: 'on', // 常に検索させたいなら 'on'、モデル任せなら 'auto'
        sources: [{ type: 'x' }, { type: 'web' }],
        return_citations: false,
      },
    });

    const text = completion.choices[0]?.message?.content || '';

    // いったん簡易パース: JSON が含まれていれば使い、なければデフォルト
    let parsed = null;
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch (_) {
      // ignore parse error
    }

    return {
      whaleBias: Number(parsed?.whaleBias) || 0,
      retailFomo: Number(parsed?.retailFomo) || 50,
      newsImpact: Number(parsed?.newsImpact) || 0,
      explanation: parsed?.explanation || text.slice(0, 200),
    };
  } catch (error) {
    if (isRateLimitError(error)) {
      logCompactError('❌ Grok RateLimit (analyzeXSentimentLive):', error);
      return {
        ...fallback,
        explanation: 'Live Search rate limited; using neutral sentiment.',
      };
    }

    logCompactError('❌ Grok Live Search Error (analyzeXSentimentLive):', error);
    return fallback;
  }
}

// ---- 旧 X API 用：Structured Outputs（将来用に保持） ------------

async function analyzeSocial(posts) {
  const neutral = {
    whaleBias: 0,
    retailFomo: 50,
    newsImpact: 0,
    explanation: '',
  };

  if (!posts || posts.length === 0) {
    return neutral;
  }

  if (!XAI_API_KEY) {
    return {
      ...neutral,
      explanation: 'Grok social analysis unavailable (no API key).',
    };
  }

  const text = posts
    .map(
      (p, idx) =>
        `#${idx + 1} (${p.likes} likes / ${p.rts} RT)\n${p.text}`,
    )
    .join('\n\n');

  const schema = {
    type: 'object',
    properties: {
      whaleBias: { type: 'number', minimum: -1, maximum: 1 },
      retailFomo: { type: 'integer', minimum: 0, maximum: 100 },
      newsImpact: { type: 'integer', minimum: 0, maximum: 100 },
      explanation: { type: 'string' },
    },
    required: ['whaleBias', 'retailFomo', 'newsImpact'],
    additionalProperties: false,
  };

  try {
    const resp = await openai.responses.create({
      model: GROK_MODEL_REASONING,
      input: [
        {
          role: 'system',
          content:
            'You analyze crypto-related X (Twitter) posts. ' +
            'Estimate: (1) whale/institutional bias (-1 sell to +1 buy), ' +
            '(2) retail FOMO level (0-100), (3) overall news impact (0-100). ' +
            'Be contrarian: high retail FOMO with weak whale support is bearish.',
        },
        { role: 'user', content: text },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'SocialSentiment',
          schema,
          strict: true,
        },
      },
    });

    const json = resp.output?.[0]?.content?.[0]?.parsed;

    return {
      whaleBias: json?.whaleBias ?? 0,
      retailFomo: json?.retailFomo ?? 50,
      newsImpact: json?.newsImpact ?? 0,
      explanation: json?.explanation || '',
    };
  } catch (error) {
    if (isRateLimitError(error)) {
      logCompactError('❌ Grok RateLimit (analyzeSocial):', error);
    } else {
      logCompactError('❌ Grok Error (analyzeSocial):', error);
    }

    // フォールバック：ニュートラル扱い
    return {
      ...neutral,
      explanation: 'Grok social analysis failed.',
    };
  }
}

module.exports = {
  analyzeMarket,
  analyzeSocial,
  analyzeXSentimentLive,
};
