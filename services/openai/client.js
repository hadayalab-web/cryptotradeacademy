// services/openai/client.js
// TrapShield 1.0: OpenAI GPT API クライアント

const OpenAI = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

// OpenAI クライアント
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY || 'DUMMY_KEY_FOR_OFFLINE',
  baseURL: OPENAI_BASE_URL,
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

/**
 * 市場分析（GPT API）
 * @param {string} marketDataJson - 市場データ（JSON文字列）
 * @param {string} xSentimentJson - Xセンチメント（JSON文字列）
 * @param {string} lang - 言語コード
 * @param {string} market - 市場コード (EN/AR/KO/JA/ES/PT-BR)
 * @param {Object} cqDeep - CryptoQuant深掘りデータ（オプション）
 * @returns {Promise<string>} GPT分析結果
 */
async function analyzeMarketGPT(marketDataJson, xSentimentJson, lang = 'en', market = 'EN', cqDeep = null) {
  if (!OPENAI_API_KEY) {
    console.warn('⚠️ OPENAI_API_KEY is not set. GPT API will not be used.');
    return null; // フォールバック: Grok APIを使用
  }

  const targetLang = (lang || 'en').toLowerCase();
  const marketCode = market || 'EN';

  // システムプロンプト（Grok APIと同様の構造）
  let systemPrompt = 'You are an AI assistant analyzing BTC market data. ';
  systemPrompt += 'Provide concise, data-driven analysis. ';
  systemPrompt += 'Focus on actionable insights and risk assessment. ';
  systemPrompt += 'Be factual and avoid hype or FOMO.';

  // 言語別の文字数制限
  const lengthRequirement = marketCode === 'JA'
    ? 'Maximum 300 characters (60-second read time).'
    : 'Maximum 150 words (60-second read time).';

  systemPrompt += `\n\nYour analysis must:\n` +
    `- ${lengthRequirement}\n` +
    `- Structure: Context → Decision → What to watch\n` +
    `- Skip detailed explanations, focus on actionable insights only\n` +
    `- Reference specific metrics when relevant\n` +
    `- Explain WHY the current score/signal was generated\n` +
    `- No hype, no FOMO, just facts`;

  // ユーザーコンテンツを構築
  let userContent = `Market data: ${marketDataJson}\nSentiment: ${xSentimentJson}\nLanguage: ${targetLang}`;

  // CryptoQuant深掘りデータをコンテキストに追加（簡易版）
  if (cqDeep) {
    if (cqDeep.trapScore !== undefined) {
      userContent += `\nTrap Score: ${cqDeep.trapScore}/100`;
    }
    if (cqDeep.liquidations) {
      const totalLiq = typeof cqDeep.liquidations === 'number'
        ? cqDeep.liquidations
        : (cqDeep.liquidations?.totalLiquidations ?? 0);
      if (totalLiq > 0) {
        userContent += `\n24h Liquidations: $${(totalLiq / 1_000_000).toFixed(1)}M`;
      }
    }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
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
      max_tokens: marketCode === 'JA' ? 150 : 200, // JA市場は文字数制限が厳しいため
      temperature: 0.6,
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (error) {
    logCompactError('analyzeMarketGPT', error);
    if (isRateLimitError(error)) {
      console.warn('⚠️ OpenAI API rate limit exceeded');
      return null; // フォールバック: Grok APIを使用
    }
    // エラー時はフォールバック
    return null;
  }
}

/**
 * データ要約（GPT API）
 * @param {Object} data - 要約するデータ
 * @param {string} lang - 言語コード
 * @returns {Promise<string>} 要約結果
 */
async function summarizeData(data, lang = 'en') {
  if (!OPENAI_API_KEY) {
    return null;
  }

  const targetLang = (lang || 'en').toLowerCase();

  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a data analysis assistant. Provide concise summaries of market data.',
        },
        {
          role: 'user',
          content: `Summarize the following data in ${targetLang}:\n${JSON.stringify(data, null, 2)}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.5,
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (error) {
    logCompactError('summarizeData', error);
    return null;
  }
}

module.exports = {
  analyzeMarketGPT,
  summarizeData,
  isRateLimitError,
};

