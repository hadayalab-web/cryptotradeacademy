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
async function analyzeMarket(marketDataJson, xSentimentJson, lang = 'en') {
  if (!XAI_API_KEY) {
    return 'HOLD - Grok offline.';
  }

  const targetLang = (lang || 'en').toLowerCase();

  try {
    // ① まず英語で Dr. Grok に丸投げ
    const completion = await openai.chat.completions.create({
      model: GROK_MODEL_REASONING,
      messages: [
        {
          role: 'system',
          content:
            'You are "Dr. Grok", a crypto trading coach for active BTC traders. ' +
            'You think like a veteran X (Twitter) crypto trader, not a generic analyst. ' +
            'You receive two JSON blobs: (1) structured BTC market context from on-chain/price data, ' +
            '(2) a live X sentiment snapshot (whaleBias, retailFomo, newsImpact, example topics). ' +
            'First, infer what traders on X are currently afraid of, confused about, or chasing. ' +
            'From that, decide whether they mainly need CLARITY, RISK WARNINGS, ENTRY IDEAS, or PATIENCE coaching. ' +
            'Then read the market JSON and use those numbers only as factual evidence to answer that need. ' +
            'Do NOT contradict the given score, signal, tp, sl, or trap fields. ' +
            'If signal is NONE, you MUST avoid giving hard entries and focus on scenarios and risk. ' +
            'Keep key trading terms in English (BUY, SELL, Stop Loss, Take Profit, liquidations, etc.). ' +
            'Write the full briefing in English, structured for Telegram with: ' +
            '- short header/title; ' +
            '- compact market snapshot; ' +
            '- trade verdict section using the existing signal/tp/sl; ' +
            '- 1–2 scenarios to watch; ' +
            '- a short coaching note about mindset and risk. ' +
            'Return ONLY the final message text.',
        },
        {
          role: 'user',
          content:
            'Here is the BTC market context JSON, followed by the X sentiment JSON:\n\n' +
            '[Market JSON]\n' +
            marketDataJson +
            '\n\n[X Sentiment JSON]\n' +
            xSentimentJson,
        },
      ],
      temperature: 0.3,
      max_tokens: 600,
    });

    const englishText =
      completion.choices[0]?.message?.content || 'HOLD - Grok offline.';

    // EN はそのまま返す
    if (targetLang === 'en') {
      return englishText;
    }

    // ② 出力だけ各言語に翻訳
    const translationPrompt = `
You are a professional financial translator.
Translate the following BTC trading briefing into ${targetLang},
keeping trading terms like BUY, SELL, Stop Loss, Take Profit, support, resistance in English.
Make the rest sound natural and clear for active BTC traders.

[Text to translate]
${englishText}
    `.trim();

    const translated = await openai.chat.completions.create({
      model: GROK_MODEL_REASONING,
      messages: [
        { role: 'system', content: translationPrompt },
      ],
      temperature: 0.2,
      max_tokens: 800,
    });


    return translated.choices[0]?.message?.content || englishText;
  } catch (error) {
    if (isRateLimitError(error)) {
      logCompactError('❌ Grok RateLimit (analyzeMarket):', error);
    } else {
      logCompactError('❌ Grok Error (analyzeMarket):', error);
    }
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
