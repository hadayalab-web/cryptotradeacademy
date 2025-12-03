// services/grok/client.js

const OpenAI = require('openai');

// xAI Grok 用 API キーとエンドポイント
const XAI_API_KEY = process.env.XAI_API_KEY;
const BASE_URL = 'https://api.x.ai/v1';

// モデル名は env で上書き可能にしておく
const GROK_MODEL_REASONING =
  process.env.GROK_MODEL_REASONING || 'grok-4.1-fast-reasoning';

if (!XAI_API_KEY) {
  console.warn('⚠️ XAI_API_KEY is not set.');
}

// OpenAI 互換クライアント（xAI エンドポイント向け）
const openai = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: BASE_URL,
});

// 市場サマリー用（既存の Dr. Grok レポート）
async function analyzeMarket(marketData) {
  try {
    const completion = await openai.chat.completions.create({
      model: GROK_MODEL_REASONING, // 例: grok-4.1-fast-reasoning
      messages: [
        {
          role: 'system',
          content:
            "You are Dr. Grok, the world's sharpest crypto whale hunter. " +
            'Hunt whales/institutions ahead of retail traps. ' +
            'Output concise, actionable insights.',
        },
        {
          role: 'user',
          content:
            'Analyze this market context and explain what whales and ' +
            'institutions are likely doing, and how to exploit retail: ' +
            marketData,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    return completion.choices[0]?.message?.content || 'HOLD - Grok offline.';
  } catch (error) {
    console.error('❌ Grok Error (analyzeMarket):', error);
    return 'HOLD - Grok offline.';
  }
}

// Xポスト用：Structured Outputs で whaleBias / retailFomo / newsImpact を返す
async function analyzeSocial(posts) {
  if (!posts || posts.length === 0) {
    return {
      whaleBias: 0,
      retailFomo: 50,
      newsImpact: 0,
      explanation: '',
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

    // Structured Outputs: parsed オブジェクトを直接読む
    const json = resp.output[0]?.content[0]?.parsed;

    return {
      whaleBias: json?.whaleBias ?? 0,
      retailFomo: json?.retailFomo ?? 50,
      newsImpact: json?.newsImpact ?? 0,
      explanation: json?.explanation || '',
    };
  } catch (error) {
    console.error('❌ Grok Error (analyzeSocial):', error);
    // フォールバック：ニュートラル扱い
    return {
      whaleBias: 0,
      retailFomo: 50,
      newsImpact: 0,
      explanation: 'Grok social analysis failed.',
    };
  }
}

module.exports = { analyzeMarket, analyzeSocial };
