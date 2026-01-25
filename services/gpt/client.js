// services/gpt/client.js
// GPT APIを使用したCryptoQuantデータ解析サービス（最適化版）

const OpenAI = require('openai');
// p-retryはES Moduleのため動的インポートを使用
let pRetry, AbortError;
const { z } = require('zod');

// Step 2-2: JSON出力のスキーマ検証（zod）
// GPTの出力形式を検証するスキーマ
const GPTAnalysisSchema = z.object({
  signal: z.enum(['AVOID_SHORT', 'AVOID_LONG', 'STANDBY', 'NONE']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  urgency: z.enum(['high', 'medium', 'low']),
  keyIndicators: z.array(z.string()),
  riskLevel: z.enum(['high', 'medium', 'low']),
});

// スキーマ検証失敗時のデフォルト値（フェイルクローズ: STANDBY）
const DEFAULT_STANDBY_RESPONSE = {
  signal: 'STANDBY',
  confidence: 0,
  reasoning: 'Schema validation failed. Falling back to STANDBY (SSOT: "70% of the time, do nothing").',
  urgency: 'low',
  keyIndicators: [],
  riskLevel: 'medium',
};
// P1修正: LRUCache require の互換修正（lru-cache v7+ は default export、v6- は named export）
const LRUCacheModule = require('lru-cache');
// lru-cache v7+ は default export、v6- は named export (LRUCache)
const LRUCache = (typeof LRUCacheModule === 'function') 
  ? LRUCacheModule 
  : (LRUCacheModule.default ?? LRUCacheModule.LRUCache ?? LRUCacheModule);
const { kv } = require('@vercel/kv');
// recordMetric はオプショナル（存在しない場合は無視）
let recordMetric;
try {
  recordMetric = require('../utils/metrics').recordMetric;
} catch (error) {
  recordMetric = () => Promise.resolve(); // 存在しない場合は何もしない
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// Phase 2: 用途別モデル環境変数の分割（SSOT準拠）
const APP_ENV = process.env.APP_ENV || process.env.NODE_ENV || 'production';

// 開発環境: すべてハイエンドモデルを使用（Composer最優先）
// 本番環境: 用途別モデルを使用（コスト最適化）
const isDevelopment = APP_ENV === 'development';

// 用途別モデル定義
// P0修正: 本番デフォルトを実在するモデル名に変更（gpt-5.2-2025-12-11は存在しない可能性があるため）
const GPT_MODEL_SUMMARY = process.env.GPT_MODEL_SUMMARY || (isDevelopment ? 'gpt-4o' : 'gpt-4o-mini');
const GPT_MODEL_ANALYSIS = process.env.GPT_MODEL_ANALYSIS || (isDevelopment ? 'gpt-4o' : 'gpt-4o');
const GPT_MODEL_GATE = process.env.GPT_MODEL_GATE || (isDevelopment ? 'gpt-4o' : 'gpt-4o'); // 最終ゲートは常にハイエンド（本番でもgpt-4o）

// 後方互換性のため、GPT_MODELも残す（デフォルトはSUMMARY）
const GPT_MODEL = process.env.GPT_MODEL || process.env.OPENAI_MODEL || GPT_MODEL_SUMMARY;

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
  } catch (error) {
    // タイムアウトエラーの場合、より詳細なエラーメッセージを提供
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      const timeoutError = new Error(`GPT API timeout after ${timeoutMs}ms: ${error.message}`);
      timeoutError.name = 'AbortError';
      timeoutError.isTimeout = true;
      throw timeoutError;
    }
    throw error;
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
  // p-retryを動的インポート（ES Module対応）
  if (!pRetry) {
    try {
      const pRetryModule = await import('p-retry');
      pRetry = pRetryModule.default || pRetryModule;
      AbortError = pRetryModule.AbortError;
    } catch (error) {
      console.error('[p-retry] Failed to import:', error);
      throw error;
    }
  }

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
Your expertise: Interpreting CryptoQuant metrics (Exchange Netflow, MPI, NUPL, SOPR) to detect early trap signals.
Your goal: Identify AVOID_SHORT/AVOID_LONG opportunities with 80%+ win rate accuracy (SSOT Trap Defense BTC: "70% of the time, do nothing. Defend until clear advantage emerges.").

Key metrics to analyze:
- Exchange Netflow: Positive = bearish (coins entering exchanges, potential selling pressure)
- MPI (Miner Position Index): High = miners selling (bearish)
- NUPL (Net Unrealized Profit/Loss): High = profit-taking risk (bearish)
- SOPR (Spent Output Profit Ratio): >1.0 = profit-taking (bearish)

IMPORTANT: If the provided data is empty, null, or insufficient, explicitly state that in your reasoning and set urgency to "low". Do not speculate or hallucinate.

Return ONLY valid JSON. No markdown. No code fences.
Schema: {
  "signal": "AVOID_SHORT" | "AVOID_LONG" | "STANDBY" | "NONE",
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

Task: Determine if an AVOID_SHORT/AVOID_LONG signal should be triggered based on on-chain data.
Focus on trap detection patterns and early warning signs (SSOT Trap Defense BTC: trapScore>=60 & multipleDivergences>=3).
Only recommend AVOID_SHORT/AVOID_LONG if multiple indicators align and confidence is high (>=0.80).
If data is missing or insufficient, set signal to "STANDBY" and urgency to "low".`;

  // Phase 2: 用途別モデルを使用（SUMMARY: 前処理・要約）
  const modelToUse = GPT_MODEL_SUMMARY;

  // キャッシュキー生成
  const cacheKey = buildCacheKey({
    model: modelToUse,
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
            model: modelToUse, // Phase 2: 用途別モデルを使用
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
        throw new AbortError(err);
      }

      const json = await completion.json();
      return json;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new AbortError(error);
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
    // タイムアウトエラーの場合は特別な処理
    const isTimeout = error?.isTimeout || error?.name === 'AbortError' || error?.message?.includes('aborted');
    
    logger.error('GPT API failed after retries', {
      error: error?.message,
      status: error?.status,
      isTimeout,
      apiKeyMasked: maskSecret(OPENAI_API_KEY),
    });
    
    // メトリクス: エラーを記録
    const errorType = isTimeout ? 'timeout_error'
      : isRateLimitError(error) ? 'rate_limit_error' 
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
      reasoning: isTimeout 
        ? `GPT API timeout: Request took longer than ${GPT_TIMEOUT_MS}ms`
        : `GPT API error: ${error?.message || 'Unknown error'}`,
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

  // Step 2-2: JSONパース + スキーマ検証
  let analysis;
  try {
    analysis = JSON.parse(text);
  } catch (parseError) {
    logger.warn('Failed to parse JSON response', {
      textPreview: text.substring(0, 200),
      error: parseError.message,
    });
    // フェイルクローズ: STANDBYを返す
    return DEFAULT_STANDBY_RESPONSE;
  }

  // Step 2-2: zodスキーマ検証
  const validationResult = GPTAnalysisSchema.safeParse(analysis);
  if (!validationResult.success) {
    logger.warn('Schema validation failed', {
      errors: validationResult.error.errors,
      receivedData: analysis,
      textPreview: text.substring(0, 200),
    });
    // フェイルクローズ: STANDBYを返す（SSOT準拠: "70%の時間、何もするな"）
    return DEFAULT_STANDBY_RESPONSE;
  }

  // 検証成功: 検証済みデータを使用
  const finalResult = validationResult.data;

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
  // p-retryを動的インポート（ES Module対応）
  if (!pRetry) {
    try {
      const pRetryModule = await import('p-retry');
      pRetry = pRetryModule.default || pRetryModule;
      AbortError = pRetryModule.AbortError;
    } catch (error) {
      console.error('[p-retry] Failed to import:', error);
      throw error;
    }
  }

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

  const systemPrompt = `You are a Mental Trainer for Crypto Traders, specializing in Trap Defence philosophy.
Your mission: "Don't fall into traps!" - Guide traders to avoid emotional trading mistakes.

Your expertise:
1. Interpreting CryptoQuant on-chain data from a psychological perspective
2. Explaining how market data relates to trader emotions (FOMO, FEAR, GREED, PANIC)
3. Teaching Trap Defence discipline: "70% of the time, do nothing. Defend until clear advantage emerges."
4. Providing actionable mental training advice based on on-chain metrics

Your style: 
- Empathetic but firm guidance
- Data-driven psychological insights
- Clear explanations of trap patterns
- Emphasis on discipline and patience

IMPORTANT: Always connect on-chain data to trader psychology. Explain WHY waiting is important, not just WHAT the data shows.
If the provided data is empty, null, or insufficient, explicitly state that in your analysis. Do not speculate or hallucinate.

Language: ${targetLang}
CRITICAL: You MUST respond ONLY in ${targetLang === 'ja' ? 'Japanese' : targetLang === 'ko' ? 'Korean' : 'English'}. 
DO NOT mix languages. DO NOT use Japanese characters if targetLang is 'en'. 
If you detect any Japanese characters in your response when targetLang is 'en', regenerate the response in English only.`;

  const userContent = `As a Mental Trainer, analyze the following CryptoQuant data and provide psychological guidance:

CryptoQuant Data:
${safeCQData}

Market Context:
${safeMCData}

Provide:
1. Psychological interpretation of on-chain metrics (How does this data relate to trader emotions?)
2. Trap patterns detected and why they are dangerous
3. Mental training advice: What should traders do/avoid based on this data?
4. Trap Defence discipline: Why waiting is important right now
5. Actionable guidance: Specific steps to avoid falling into traps

Focus on:
- "Don't fall into traps!" message
- Teaching the importance of "70% standby" strategy
- Connecting data to trader psychology (FOMO, FEAR, GREED, etc.)
- Providing clear, actionable mental training advice

Keep the analysis empathetic but firm (400-600 words).
If data is missing or insufficient, state that clearly and provide general Trap Defence wisdom.`;

  // Phase 2: 用途別モデルを使用（ANALYSIS: 統合推論）
  const modelToUse = GPT_MODEL_ANALYSIS;

  // キャッシュキー生成
  const cacheKey = buildCacheKey({
    model: modelToUse,
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
            model: modelToUse, // Phase 2: 用途別モデルを使用
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
        throw new AbortError(err);
      }

      const json = await completion.json();
      return json;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new AbortError(error);
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
    // タイムアウトエラーの場合は特別な処理
    const isTimeout = error?.isTimeout || error?.name === 'AbortError' || error?.message?.includes('aborted');
    
    logger.error('GPT API failed after retries', {
      error: error?.message,
      status: error?.status,
      isTimeout,
      apiKeyMasked: maskSecret(OPENAI_API_KEY),
    });
    
    // メトリクス: エラーを記録
    const errorType = isTimeout ? 'timeout_error'
      : isRateLimitError(error) ? 'rate_limit_error' 
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
    
    return isTimeout 
      ? `GPT analysis unavailable due to timeout (${GPT_TIMEOUT_MS}ms exceeded).`
      : 'GPT analysis unavailable due to API error.';
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
  // p-retryを動的インポート（ES Module対応）
  if (!pRetry) {
    try {
      const pRetryModule = await import('p-retry');
      pRetry = pRetryModule.default || pRetryModule;
      AbortError = pRetryModule.AbortError;
    } catch (error) {
      console.error('[p-retry] Failed to import:', error);
      throw error;
    }
  }

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

  // Phase 2: 用途別モデルを使用（SUMMARY: 前処理・要約）
  const modelToUse = GPT_MODEL_SUMMARY;

  // キャッシュキー生成
  const cacheKey = buildCacheKey({
    model: modelToUse,
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
            model: modelToUse, // Phase 2: 用途別モデルを使用
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
        throw new AbortError(err);
      }

      const json = await completion.json();
      return json;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new AbortError(error);
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
    // タイムアウトエラーの場合は特別な処理
    const isTimeout = error?.isTimeout || error?.name === 'AbortError' || error?.message?.includes('aborted');
    
    logger.error('GPT API failed after retries', {
      error: error?.message,
      status: error?.status,
      isTimeout,
      apiKeyMasked: maskSecret(OPENAI_API_KEY),
    });
    
    // メトリクス: エラーを記録
    const errorType = isTimeout ? 'timeout_error'
      : isRateLimitError(error) ? 'rate_limit_error' 
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
    
    return isTimeout 
      ? `Impact report generation failed due to timeout (${GPT_TIMEOUT_MS}ms exceeded).`
      : 'Impact report generation failed due to API error.';
  }

  const text = result?.choices?.[0]?.message?.content?.trim();
  const finalText = text || 'Impact report generation failed.';

  // キャッシュに保存
  memoryCache.set(cacheKey, finalText);
  await setKVCache(cacheKey, finalText, GPT_CACHE_TTL_SECONDS);
  await setKVCache('gpt:last_success:generateNonUserImpactReport', finalText, 24 * 60 * 60);

  return finalText;
}

/**
 * 汎用的なテキスト生成関数（スワイプなど）
 * @param {string} systemPrompt - システムプロンプト
 * @param {string} userPrompt - ユーザープロンプト
 * @param {Object} options - オプション (temperature, max_tokens)
 * @returns {Promise<string>} 生成されたテキスト
 */
async function generateText(systemPrompt, userPrompt, options = {}) {
  // p-retryを動的インポート（ES Module対応）
  if (!pRetry) {
    try {
      const pRetryModule = await import('p-retry');
      pRetry = pRetryModule.default || pRetryModule;
      AbortError = pRetryModule.AbortError;
    } catch (error) {
      console.error('[p-retry] Failed to import:', error);
      throw error;
    }
  }

  const logger = createStructuredLogger('generateText');
  
  if (!OPENAI_API_KEY) {
    return 'GPT offline - cannot generate text.';
  }

  const { temperature = 0.7, max_tokens = 1000 } = options;

  // Phase 2: 用途別モデルを使用（SUMMARY: 前処理・要約、汎用生成）
  const modelToUse = GPT_MODEL_SUMMARY;

  // キャッシュキー生成
  const cacheKey = buildCacheKey({
    model: modelToUse,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
    max_tokens,
  });

  // キャッシュチェック
  const memHit = memoryCache.get(cacheKey);
  if (memHit) {
    await recordMetric({ type: 'memory_cache_hit' }).catch(() => {});
    return memHit;
  }

  const kvHit = await getKVCache(cacheKey);
  if (kvHit) {
    memoryCache.set(cacheKey, kvHit);
    await recordMetric({ type: 'kv_cache_hit' }).catch(() => {});
    return kvHit;
  }

  // メトリクス: API呼び出しを記録
  await recordMetric({ type: 'call' }).catch(() => {});

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
            model: modelToUse,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            max_tokens,
            temperature,
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
        throw new AbortError(err);
      }

      const json = await completion.json();
      return json;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new AbortError(error);
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
    // タイムアウトエラーの場合は特別な処理
    const isTimeout = error?.isTimeout || error?.name === 'AbortError' || error?.message?.includes('aborted');
    
    logger.error('GPT API failed after retries', {
      error: error?.message,
      status: error?.status,
      isTimeout,
      apiKeyMasked: maskSecret(OPENAI_API_KEY),
    });
    
    // メトリクス: エラーを記録
    const errorType = isTimeout ? 'timeout_error'
      : isRateLimitError(error) ? 'rate_limit_error' 
      : (error?.status >= 500 && error?.status <= 599) ? 'server_error' 
      : 'error';
    await recordMetric({ type: errorType }).catch(() => {});
    
    return isTimeout 
      ? `Text generation failed due to timeout (${GPT_TIMEOUT_MS}ms exceeded).`
      : 'Text generation failed due to API error.';
  }

  const text = result?.choices?.[0]?.message?.content?.trim();
  const finalText = text || 'Text generation failed.';

  // キャッシュに保存
  memoryCache.set(cacheKey, finalText);
  await setKVCache(cacheKey, finalText, GPT_CACHE_TTL_SECONDS);

  return finalText;
}

module.exports = {
  analyzeCryptoQuantData,
  generateCryptoQuantAnalysis,
  generateNonUserImpactReport,
  generateText, // 追加
  escapeForPrompt,
  GPT_MODEL_SUMMARY,
  GPT_MODEL_ANALYSIS,
  GPT_MODEL_GATE,
};
