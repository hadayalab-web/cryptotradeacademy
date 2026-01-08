// services/gpt/client.js
// GPT APIを使用したCryptoQuantデータ解析サービス（最適化版）

const OpenAI = require('openai');
const pRetry = require('p-retry');
const { z } = require('zod');
const LRUCache = require('lru-cache');
const { kv } = require('@vercel/kv');
const { recordMetric } = require('../utils/metrics');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// コスト最適化: GPT-4o-miniをデフォルトに（環境変数で上書き可能）
const GPT_MODEL = process.env.GPT_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
const GPT_CACHE_TTL_SECONDS = Number(process.env.GPT_CACHE_TTL_SECONDS || 900); // 15分
const GPT_TIMEOUT_MS = Number(process.env.GPT_TIMEOUT_MS || 25000);

// メモリキャッシュ（同一実行内の重複排除）
const memoryCache = new LRUCache({
  max: 200,
  ttl: GPT_CACHE_TTL_SECONDS * 1000,
});

// OpenAI クライアント
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// ---- utilities ------------------------------------------------------
function isRateLimitError(error) {
  const status = error?.status || error?.statusCode;
  const type = error?.error?.type || error?.type;
  return status === 429 || type === 'rate_limit_error' || type === 'RateLimitError';
}

function isRetryableError(error) {
  const status = error?.status || error?.statusCode;
  return status === 429 || (status >= 500 && status <= 599);
}

function maskSecret(value) {
  if (!value || typeof value !== 'string') return value;
  if (value.length <= 8) return '***';
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

function createStructuredLogger(prefix) {
  return {
    info: (msg, extra = {}) => {
      console.log(JSON.stringify({
        level: 'info',
        service: 'gpt-client',
        prefix,
        msg,
        time: new Date().toISOString(),
        ...extra,
      }));
    },
    warn: (msg, extra = {}) => {
      console.warn(JSON.stringify({
        level: 'warn',
        service: 'gpt-client',
        prefix,
        msg,
        time: new Date().toISOString(),
        ...extra,
      }));
    },
    error: (msg, extra = {}) => {
      console.error(JSON.stringify({
        level: 'error',
        service: 'gpt-client',
        prefix,
        msg,
        time: new Date().toISOString(),
        ...extra,
      }));
    },
  };
}

/**
 * プロンプトインジェクション対策: 外部データを安全にエスケープ
 * @param {any} input - エスケープするデータ
 * @returns {string} エスケープされた文字列
 */
function escapeForPrompt(input) {
  if (input == null) return '';
  const s = String(input);
  return s
    .replace(/```/g, '``\\`')
    .replace(/<\s*\/?\s*system\s*>/gi, '<system>')
    .replace(/<\s*\/?\s*assistant\s*>/gi, '<assistant>')
    .replace(/<\s*\/?\s*user\s*>/gi, '<user>')
    .replace(/\u0000/g, '')
    .slice(0, 50000); // ハードキャップ
}

/**
 * キャッシュキーを生成（決定論的）
 */
function buildCacheKey(input) {
  const normalized = {
    model: input.model || GPT_MODEL,
    messages: input.messages,
    temperature: input.temperature ?? 0.3,
    max_tokens: input.max_tokens ?? 1000,
    response_format: input.response_format,
  };
  return `gpt:cache:${Buffer.from(JSON.stringify(normalized)).toString('base64url')}`;
}

/**
 * KVからキャッシュを取得
 */
async function getKVCache(key) {
  try {
    if (!kv) return null;
    return await kv.get(key);
  } catch (error) {
    return null;
  }
}

/**
 * KVにキャッシュを保存
 */
async function setKVCache(key, value, ttlSeconds) {
  try {
    if (!kv) return false;
    await kv.set(key, value, { ex: ttlSeconds });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * タイムアウト付きfetch
 */
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// 入力スキーマ検証
const CryptoQuantDataSchema = z.object({
  inflow: z.number().optional(),
  mpi: z.number().optional(),
  priceUsd: z.number().optional(),
  change24h: z.number().optional(),
  sentiment: z.string().optional(),
}).passthrough();

const MarketContextSchema = z.object({
  priceUsd: z.number().optional(),
  change24h: z.number().optional(),
  score: z.number().optional(),
  signal: z.string().optional(),
  sentiment: z.string().optional(),
  trap: z.any().optional(),
}).passthrough();

/**
 * CryptoQuantデータをGPTで解析（15分ごとの緊急配信用）
 * @param {Object} cryptoQuantData - CryptoQuantデータ（inflow, mpi, nupl, sopr等）
 * @param {Object} marketContext - 市場コンテキスト（price, change24h, score等）
 * @param {string} lang - 言語コード
 * @returns {Promise<Object>} GPT解析結果 {signal, confidence, reasoning, urgency}
 */
async function analyzeCryptoQuantData(cryptoQuantData, marketContext, lang = 'en') {
  const logger = createStructuredLogger('analyzeCryptoQuantData');
  
  if (!OPENAI_API_KEY) {
    logger.warn('OPENAI_API_KEY not set, returning fallback analysis', {
      apiKeyMasked: maskSecret(OPENAI_API_KEY),
    });
    return {
      signal: 'NONE',
      confidence: 0,
      reasoning: 'GPT offline - API key not configured',
      urgency: 'low',
      keyIndicators: [],
      riskLevel: 'medium',
    };
  }

  // 入力検証
  const validatedCQ = CryptoQuantDataSchema.safeParse(cryptoQuantData);
  const validatedMC = MarketContextSchema.safeParse(marketContext);
  
  if (!validatedCQ.success || !validatedMC.success) {
    logger.warn('Invalid input data', {
      cqError: validatedCQ.error?.message,
      mcError: validatedMC.error?.message,
    });
    return {
      signal: 'NONE',
      confidence: 0,
      reasoning: 'Invalid input data',
      urgency: 'low',
      keyIndicators: [],
      riskLevel: 'medium',
    };
  }

  const targetLang = (lang || 'en').toLowerCase();

  // プロンプトインジェクション対策: データをエスケープ
  const safeCQData = escapeForPrompt(JSON.stringify(validatedCQ.data, null, 2));
  const safeMCData = escapeForPrompt(JSON.stringify(validatedMC.data, null, 2));

  const systemPrompt = `You are a quantitative crypto market analyst specializing in on-chain data analysis.
Your expertise: Interpreting CryptoQuant metrics (Exchange Netflow, MPI, NUPL, SOPR) to detect early trend reversal signals.
Your goal: Identify SELL/SHORT opportunities with 80%+ win rate accuracy.

Key metrics to analyze:
- Exchange Netflow: Positive = bearish (coins entering exchanges, potential selling pressure)
- MPI (Miner Position Index): High = miners selling (bearish)
- NUPL (Net Unrealized Profit/Loss): High = profit-taking risk (bearish)
- SOPR (Spent Output Profit Ratio): >1.0 = profit-taking (bearish)

IMPORTANT: If the provided data is empty, null, or insufficient, explicitly state that in your reasoning and set urgency to "low". Do not speculate or hallucinate.

Return ONLY valid JSON. No markdown. No code fences.
Schema: {
  "signal": "SELL" | "NONE",
  "confidence": number (0-1),
  "reasoning": string,
  "urgency": "high" | "medium" | "low",
  "keyIndicators": string[],
  "riskLevel": "high" | "medium" | "low"
}`;

  const userContent = `Analyze the following CryptoQuant data and market context:

CryptoQuant Data:
${safeCQData}

Market Context:
${safeMCData}

Language: ${targetLang}

Task: Determine if a SELL/SHORT signal should be triggered based on on-chain data.
Focus on trend reversal patterns and early warning signs.
Only recommend SELL if multiple indicators align and confidence is high (>=0.80).
If data is missing or insufficient, set signal to "NONE" and urgency to "low".`;

  // キャッシュキー生成
  const cacheKey = buildCacheKey({
    model: GPT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.3,
    max_tokens: 1000,
    response_format: { type: 'json_object' },
  });

  // 1. メモリキャッシュチェック
  const memHit = memoryCache.get(cacheKey);
  if (memHit) {
    logger.info('Memory cache hit', { cacheKey: cacheKey.substring(0, 50) });
    await recordMetric({ type: 'memory_cache_hit' }).catch(() => {}); // メトリクス記録（エラーは無視）
    return memHit;
  }

  // 2. KVキャッシュチェック
  const kvHit = await getKVCache(cacheKey);
  if (kvHit) {
    logger.info('KV cache hit', { cacheKey: cacheKey.substring(0, 50) });
    memoryCache.set(cacheKey, kvHit);
    await recordMetric({ type: 'kv_cache_hit' }).catch(() => {}); // メトリクス記録（エラーは無視）
    return kvHit;
  }

  // 3. GPT API呼び出し（リトライ付き）
  const attempt = async () => {
    try {
      const completion = await fetchWithTimeout(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: GPT_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userContent },
            ],
            response_format: { type: 'json_object' },
            max_tokens: 1000,
            temperature: 0.3,
          }),
        },
        GPT_TIMEOUT_MS
      );

      if (!completion.ok) {
        const text = await completion.text().catch(() => '');
        const status = completion.status;
        const err = new Error(`OpenAI API error: ${status}`);
        err.status = status;
        err.response = text;
        
        if (isRetryableError(err)) {
          throw err;
        }
        throw pRetry.AbortError(err);
      }

      const json = await completion.json();
      return json;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw pRetry.AbortError(error);
      }
      throw error;
    }
  };

  // メトリクス: API呼び出しを記録
  await recordMetric({ type: 'call' }).catch(() => {}); // エラーは無視

  let result;
  try {
    result = await pRetry(attempt, {
      retries: 3,
      factor: 2,
      minTimeout: 800,
      maxTimeout: 4000,
      onFailedAttempt: (error) => {
        logger.warn('GPT API retry', {
          attemptNumber: error.attemptNumber,
          retriesLeft: error.retriesLeft,
          status: error?.status,
          message: error?.message?.substring(0, 200),
          apiKeyMasked: maskSecret(OPENAI_API_KEY),
        });
      },
    });
  } catch (error) {
    logger.error('GPT API failed after retries', {
      error: error?.message,
      status: error?.status,
      apiKeyMasked: maskSecret(OPENAI_API_KEY),
    });
    
    // メトリクス: エラーを記録
    const errorType = isRateLimitError(error) ? 'rate_limit_error' 
      : (error?.status >= 500 && error?.status <= 599) ? 'server_error' 
      : 'error';
    await recordMetric({ type: errorType }).catch(() => {}); // エラーは無視
    
    // フォールバック: KVから最後の成功結果を取得
    const lastSuccessKey = 'gpt:last_success:analyzeCryptoQuantData';
    const lastSuccess = await getKVCache(lastSuccessKey);
    if (lastSuccess) {
      logger.info('Using fallback from last success', {});
      return lastSuccess;
    }
    
    // 最終フォールバック
    return {
      signal: 'NONE',
      confidence: 0,
      reasoning: `GPT API error: ${error?.message || 'Unknown error'}`,
      urgency: 'low',
      keyIndicators: [],
      riskLevel: 'medium',
    };
  }

  const text = result?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    return {
      signal: 'NONE',
      confidence: 0,
      reasoning: 'GPT returned empty response',
      urgency: 'low',
      keyIndicators: [],
      riskLevel: 'medium',
    };
  }

  // JSONパース
  let analysis;
  try {
    analysis = JSON.parse(text);
  } catch (parseError) {
    logger.warn('Failed to parse JSON response', {
      textPreview: text.substring(0, 200),
      error: parseError.message,
    });
    return {
      signal: 'NONE',
      confidence: 0,
      reasoning: `GPT response parse error: ${text.substring(0, 200)}`,
      urgency: 'low',
      keyIndicators: [],
      riskLevel: 'medium',
    };
  }

  const finalResult = {
    signal: analysis.signal || 'NONE',
    confidence: Number(analysis.confidence) || 0,
    reasoning: analysis.reasoning || 'No reasoning provided',
    urgency: analysis.urgency || 'low',
    keyIndicators: Array.isArray(analysis.keyIndicators) ? analysis.keyIndicators : [],
    riskLevel: analysis.riskLevel || 'medium',
  };

  // キャッシュに保存
  memoryCache.set(cacheKey, finalResult);
  await setKVCache(cacheKey, finalResult, GPT_CACHE_TTL_SECONDS);
  
  // 最後の成功結果も保存（フォールバック用）
  await setKVCache('gpt:last_success:analyzeCryptoQuantData', finalResult, 24 * 60 * 60);

  return finalResult;
}

/**
 * CryptoQuantデータをGPTで詳細解析（定期配信用）
 * @param {Object} cryptoQuantData - CryptoQuantデータ
 * @param {Object} marketContext - 市場コンテキスト
 * @param {string} lang - 言語コード
 * @returns {Promise<string>} GPTによる詳細分析テキスト
 */
async function generateCryptoQuantAnalysis(cryptoQuantData, marketContext, lang = 'en') {
  const logger = createStructuredLogger('generateCryptoQuantAnalysis');
  
  if (!OPENAI_API_KEY) {
    return 'GPT offline - API key not configured.';
  }

  // 入力検証
  const validatedCQ = CryptoQuantDataSchema.safeParse(cryptoQuantData);
  const validatedMC = MarketContextSchema.safeParse(marketContext);
  
  if (!validatedCQ.success || !validatedMC.success) {
    logger.warn('Invalid input data', {
      cqError: validatedCQ.error?.message,
      mcError: validatedMC.error?.message,
    });
    return 'Invalid input data - analysis unavailable.';
  }

  const targetLang = (lang || 'en').toLowerCase();

  // プロンプトインジェクション対策
  const safeCQData = escapeForPrompt(JSON.stringify(validatedCQ.data, null, 2));
  const safeMCData = escapeForPrompt(JSON.stringify(validatedMC.data, null, 2));

  const systemPrompt = `You are a quantitative crypto market analyst providing detailed on-chain data analysis.
Your expertise: Interpreting CryptoQuant metrics to explain market dynamics and trend reversals.
Your style: Professional, data-driven, clear explanations.

IMPORTANT: If the provided data is empty, null, or insufficient, explicitly state that in your analysis. Do not speculate or hallucinate.

Language: ${targetLang}
Format your response in ${targetLang === 'ja' ? 'Japanese' : targetLang === 'ko' ? 'Korean' : 'English'}.`;

  const userContent = `Analyze the following CryptoQuant data and provide a detailed market analysis:

CryptoQuant Data:
${safeCQData}

Market Context:
${safeMCData}

Provide:
1. Key insights from on-chain metrics
2. Trend reversal signals (if any)
3. Risk assessment
4. Market outlook (next 24-48 hours)

Keep the analysis concise but informative (300-500 words).
If data is missing or insufficient, state that clearly.`;

  // キャッシュキー生成
  const cacheKey = buildCacheKey({
    model: GPT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.6,
    max_tokens: 800,
  });

  // キャッシュチェック
  const memHit = memoryCache.get(cacheKey);
  if (memHit) {
    await recordMetric({ type: 'memory_cache_hit' }).catch(() => {}); // メトリクス記録（エラーは無視）
    return memHit;
  }

  const kvHit = await getKVCache(cacheKey);
  if (kvHit) {
    memoryCache.set(cacheKey, kvHit);
    await recordMetric({ type: 'kv_cache_hit' }).catch(() => {}); // メトリクス記録（エラーは無視）
    return kvHit;
  }

  // メトリクス: API呼び出しを記録
  await recordMetric({ type: 'call' }).catch(() => {}); // エラーは無視

  // GPT API呼び出し（リトライ付き）
  const attempt = async () => {
    try {
      const completion = await fetchWithTimeout(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: GPT_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userContent },
            ],
            max_tokens: 800,
            temperature: 0.6,
          }),
        },
        GPT_TIMEOUT_MS
      );

      if (!completion.ok) {
        const text = await completion.text().catch(() => '');
        const status = completion.status;
        const err = new Error(`OpenAI API error: ${status}`);
        err.status = status;
        err.response = text;
        
        if (isRetryableError(err)) {
          throw err;
        }
        throw pRetry.AbortError(err);
      }

      const json = await completion.json();
      return json;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw pRetry.AbortError(error);
      }
      throw error;
    }
  };

  let result;
  try {
    result = await pRetry(attempt, {
      retries: 3,
      factor: 2,
      minTimeout: 800,
      maxTimeout: 4000,
      onFailedAttempt: (error) => {
        logger.warn('GPT API retry', {
          attemptNumber: error.attemptNumber,
          retriesLeft: error.retriesLeft,
          status: error?.status,
          message: error?.message?.substring(0, 200),
          apiKeyMasked: maskSecret(OPENAI_API_KEY),
        });
      },
    });
  } catch (error) {
    logger.error('GPT API failed after retries', {
      error: error?.message,
      status: error?.status,
      apiKeyMasked: maskSecret(OPENAI_API_KEY),
    });
    
    // メトリクス: エラーを記録
    const errorType = isRateLimitError(error) ? 'rate_limit_error' 
      : (error?.status >= 500 && error?.status <= 599) ? 'server_error' 
      : 'error';
    await recordMetric({ type: errorType }).catch(() => {}); // エラーは無視
    
    // フォールバック: KVから最後の成功結果を取得
    const lastSuccessKey = 'gpt:last_success:generateCryptoQuantAnalysis';
    const lastSuccess = await getKVCache(lastSuccessKey);
    if (lastSuccess) {
      logger.info('Using fallback from last success', {});
      return lastSuccess;
    }
    
    return 'GPT analysis unavailable due to API error.';
  }

  const text = result?.choices?.[0]?.message?.content?.trim();
  const finalText = text || 'GPT analysis unavailable.';

  // キャッシュに保存
  memoryCache.set(cacheKey, finalText);
  await setKVCache(cacheKey, finalText, GPT_CACHE_TTL_SECONDS);
  await setKVCache('gpt:last_success:generateCryptoQuantAnalysis', finalText, 24 * 60 * 60);

  return finalText;
}

/**
 * サービス未利用ユーザーの悲惨な状況を報道するコンテンツを生成
 * @param {Object} marketData - 市場データ
 * @param {Object} missedOpportunities - 見逃した機会のデータ
 * @param {string} lang - 言語コード
 * @returns {Promise<string>} 報道コンテンツ
 */
async function generateNonUserImpactReport(marketData, missedOpportunities, lang = 'en') {
  const logger = createStructuredLogger('generateNonUserImpactReport');
  
  if (!OPENAI_API_KEY) {
    return 'GPT offline - cannot generate impact report.';
  }

  const targetLang = (lang || 'en').toLowerCase();

  // プロンプトインジェクション対策
  const safeMarketData = escapeForPrompt(JSON.stringify(marketData || {}, null, 2));
  const safeMissedOpps = escapeForPrompt(JSON.stringify(missedOpportunities || {}, null, 2));

  const systemPrompt = `You are a financial news reporter specializing in cryptocurrency market impact stories.
Your style: Professional, empathetic, data-driven storytelling.
Your goal: Highlight the consequences of not having access to professional trading signals.

IMPORTANT: If the provided data is empty or insufficient, state that clearly. Do not fabricate numbers or create false narratives.

Language: ${targetLang}
Format your response in ${targetLang === 'ja' ? 'Japanese' : targetLang === 'ko' ? 'Korean' : 'English'}.`;

  const userContent = `Create a news-style report about traders who missed critical market signals:

Market Data:
${safeMarketData}

Missed Opportunities:
${safeMissedOpps}

Create a compelling narrative that:
1. Describes the market conditions
2. Explains what signals were missed
3. Quantifies the potential impact (losses, missed profits)
4. Emphasizes the value of professional signal services

Tone: Professional but impactful. Use data to support the narrative.
Length: 400-600 words.
If data is missing or insufficient, state that clearly.`;

  // キャッシュキー生成
  const cacheKey = buildCacheKey({
    model: GPT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  // キャッシュチェック
  const memHit = memoryCache.get(cacheKey);
  if (memHit) {
    await recordMetric({ type: 'memory_cache_hit' }).catch(() => {}); // メトリクス記録（エラーは無視）
    return memHit;
  }

  const kvHit = await getKVCache(cacheKey);
  if (kvHit) {
    memoryCache.set(cacheKey, kvHit);
    await recordMetric({ type: 'kv_cache_hit' }).catch(() => {}); // メトリクス記録（エラーは無視）
    return kvHit;
  }

  // メトリクス: API呼び出しを記録
  await recordMetric({ type: 'call' }).catch(() => {}); // エラーは無視

  // GPT API呼び出し（リトライ付き）
  const attempt = async () => {
    try {
      const completion = await fetchWithTimeout(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: GPT_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userContent },
            ],
            max_tokens: 1000,
            temperature: 0.7,
          }),
        },
        GPT_TIMEOUT_MS
      );

      if (!completion.ok) {
        const text = await completion.text().catch(() => '');
        const status = completion.status;
        const err = new Error(`OpenAI API error: ${status}`);
        err.status = status;
        err.response = text;
        
        if (isRetryableError(err)) {
          throw err;
        }
        throw pRetry.AbortError(err);
      }

      const json = await completion.json();
      return json;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw pRetry.AbortError(error);
      }
      throw error;
    }
  };

  let result;
  try {
    result = await pRetry(attempt, {
      retries: 3,
      factor: 2,
      minTimeout: 800,
      maxTimeout: 4000,
      onFailedAttempt: (error) => {
        logger.warn('GPT API retry', {
          attemptNumber: error.attemptNumber,
          retriesLeft: error.retriesLeft,
          status: error?.status,
          message: error?.message?.substring(0, 200),
          apiKeyMasked: maskSecret(OPENAI_API_KEY),
        });
      },
    });
  } catch (error) {
    logger.error('GPT API failed after retries', {
      error: error?.message,
      status: error?.status,
      apiKeyMasked: maskSecret(OPENAI_API_KEY),
    });
    
    // メトリクス: エラーを記録
    const errorType = isRateLimitError(error) ? 'rate_limit_error' 
      : (error?.status >= 500 && error?.status <= 599) ? 'server_error' 
      : 'error';
    await recordMetric({ type: errorType }).catch(() => {}); // エラーは無視
    
    // フォールバック: KVから最後の成功結果を取得
    const lastSuccessKey = 'gpt:last_success:generateNonUserImpactReport';
    const lastSuccess = await getKVCache(lastSuccessKey);
    if (lastSuccess) {
      logger.info('Using fallback from last success', {});
      return lastSuccess;
    }
    
    return 'Impact report generation failed due to API error.';
  }

  const text = result?.choices?.[0]?.message?.content?.trim();
  const finalText = text || 'Impact report generation failed.';

  // キャッシュに保存
  memoryCache.set(cacheKey, finalText);
  await setKVCache(cacheKey, finalText, GPT_CACHE_TTL_SECONDS);
  await setKVCache('gpt:last_success:generateNonUserImpactReport', finalText, 24 * 60 * 60);

  return finalText;
}

module.exports = {
  analyzeCryptoQuantData,
  generateCryptoQuantAnalysis,
  generateNonUserImpactReport,
  escapeForPrompt, // エクスポート（他のファイルで使用可能）
};
