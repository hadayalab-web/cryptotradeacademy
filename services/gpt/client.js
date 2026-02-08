// services/gpt/client.js
// GPT API: CQデータを基に「次に何が起こるか」を解析する（Trapアラート・市況予測）

const OpenAI = require("openai");
// p-retryはES Moduleのため動的インポートを使用
let pRetry, AbortError;
const { z } = require("zod");

// Step 2-2: JSON出力のスキーマ検証（zod）
// GPTの出力形式を検証するスキーマ
const GPTAnalysisSchema = z.object({
  signal: z.enum(["AVOID_SHORT", "AVOID_LONG", "STANDBY", "NONE"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  urgency: z.enum(["high", "medium", "low"]),
  keyIndicators: z.array(z.string()),
  riskLevel: z.enum(["high", "medium", "low"])
});

// スキーマ検証失敗時のデフォルト値（フェイルクローズ: STANDBY）
const DEFAULT_STANDBY_RESPONSE = {
  signal: "STANDBY",
  confidence: 0,
  reasoning:
    'Schema validation failed. Falling back to STANDBY (SSOT: "70% of the time, do nothing").',
  urgency: "low",
  keyIndicators: [],
  riskLevel: "medium"
};
// P1修正: LRUCache require の互換修正（lru-cache v7+ は default export、v6- は named export）
const LRUCacheModule = require("lru-cache");
// lru-cache v7+ は default export、v6- は named export (LRUCache)
const LRUCache =
  typeof LRUCacheModule === "function"
    ? LRUCacheModule
    : (LRUCacheModule.default ?? LRUCacheModule.LRUCache ?? LRUCacheModule);
// 🚀 シームレスなKVアクセス（utils/kv.js経由）
const { kv } = require("../../utils/kv");
// recordMetric はオプショナル（存在しない場合は無視）
let recordMetric;
try {
  recordMetric = require("../utils/metrics").recordMetric;
} catch (error) {
  recordMetric = () => Promise.resolve(); // 存在しない場合は何もしない
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// Phase 2: 用途別モデル環境変数の分割（SSOT準拠）
const APP_ENV = process.env.APP_ENV || process.env.NODE_ENV || "production";

// 開発環境: すべてハイエンドモデルを使用（Composer最優先）
// 本番環境: 用途別モデルを使用（コスト最適化）
const isDevelopment = APP_ENV === "development";

// 用途別モデル定義
// P0 FIX: タイムアウト対策 - 本番環境では軽量モデルを使用（60秒制限を考慮）
// CRITICAL: 最終ゲートと統合推論にはgpt-5.2-2025-12-11を使用（最高品質を保証）
const GPT_MODEL_SUMMARY =
  process.env.GPT_MODEL_SUMMARY || (isDevelopment ? "gpt-5.2-2025-12-11" : "gpt-4o-mini");
const GPT_MODEL_ANALYSIS =
  process.env.GPT_MODEL_ANALYSIS || (isDevelopment ? "gpt-5.2-2025-12-11" : "gpt-4o"); // 本番環境ではgpt-4oを使用（タイムアウト対策）
const GPT_MODEL_GATE = process.env.GPT_MODEL_GATE || "gpt-5.2-2025-12-11"; // 最終ゲートは常にgpt-5.2-2025-12-11（最高品質）

// 後方互換性のため、GPT_MODELも残す（デフォルトはSUMMARY）
const GPT_MODEL = process.env.GPT_MODEL || process.env.OPENAI_MODEL || GPT_MODEL_SUMMARY;

// 引用リポスト 反論処理用。本番で変更する場合は環境変数で上書き
const GPT_MODEL_QUOTE_REPOST_OBJECTION =
  process.env.GPT_MODEL_QUOTE_REPOST_OBJECTION || "gpt-5-mini-2025-08-07";

const GPT_CACHE_TTL_SECONDS = Number(process.env.GPT_CACHE_TTL_SECONDS || 900); // 15分
const GPT_TIMEOUT_MS = Number(process.env.GPT_TIMEOUT_MS || 25000);

// メモリキャッシュ（同一実行内の重複排除）
const memoryCache = new LRUCache({
  max: 200,
  ttl: GPT_CACHE_TTL_SECONDS * 1000
});

// P0 FIX: 環境変数がない場合でもエラーを出さないように遅延初期化
let openai = null;

try {
  if (OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: OPENAI_API_KEY
    });
  } else {
    console.warn("[GPT Client] OPENAI_API_KEY not set, GPT client will not be available");
  }
} catch (error) {
  console.warn("[GPT Client] Failed to initialize OpenAI client:", error.message);
}

// ---- utilities ------------------------------------------------------
function isRateLimitError(error) {
  const status = error?.status || error?.statusCode;
  const type = error?.error?.type || error?.type;
  return status === 429 || type === "rate_limit_error" || type === "RateLimitError";
}

function isRetryableError(error) {
  const status = error?.status || error?.statusCode;
  return status === 429 || (status >= 500 && status <= 599);
}

function maskSecret(value) {
  if (!value || typeof value !== "string") return value;
  if (value.length <= 8) return "***";
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

function createStructuredLogger(prefix) {
  return {
    info: (msg, extra = {}) => {
      console.log(
        JSON.stringify({
          level: "info",
          service: "gpt-client",
          prefix,
          msg,
          time: new Date().toISOString(),
          ...extra
        })
      );
    },
    warn: (msg, extra = {}) => {
      console.warn(
        JSON.stringify({
          level: "warn",
          service: "gpt-client",
          prefix,
          msg,
          time: new Date().toISOString(),
          ...extra
        })
      );
    },
    error: (msg, extra = {}) => {
      console.error(
        JSON.stringify({
          level: "error",
          service: "gpt-client",
          prefix,
          msg,
          time: new Date().toISOString(),
          ...extra
        })
      );
    }
  };
}

/**
 * プロンプトインジェクション対策: 外部データを安全にエスケープ
 * @param {any} input - エスケープするデータ
 * @returns {string} エスケープされた文字列
 */
function escapeForPrompt(input) {
  if (input == null) return "";
  const s = String(input);
  return s
    .replace(/```/g, "``\\`")
    .replace(/<\s*\/?\s*system\s*>/gi, "<system>")
    .replace(/<\s*\/?\s*assistant\s*>/gi, "<assistant>")
    .replace(/<\s*\/?\s*user\s*>/gi, "<user>")
    .replace(/\u0000/g, "")
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
    response_format: input.response_format
  };
  return `gpt:cache:${Buffer.from(JSON.stringify(normalized)).toString("base64url")}`;
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
    if (error.name === "AbortError" || error.message?.includes("aborted")) {
      const timeoutError = new Error(`GPT API timeout after ${timeoutMs}ms: ${error.message}`);
      timeoutError.name = "AbortError";
      timeoutError.isTimeout = true;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}

// 入力スキーマ検証
const CryptoQuantDataSchema = z
  .object({
    inflow: z.number().optional(),
    mpi: z.number().optional(),
    priceUsd: z.number().optional(),
    change24h: z.number().optional(),
    sentiment: z.string().optional()
  })
  .passthrough();

const MarketContextSchema = z
  .object({
    priceUsd: z.number().optional(),
    change24h: z.number().optional(),
    score: z.number().optional(),
    signal: z.string().optional(),
    sentiment: z.string().optional(),
    trap: z.any().optional()
  })
  .passthrough();

/**
 * CQデータを基に「次に何が起こるか」を解析（GPT役割: 15分緊急配信用・Trapシグナル）
 * @param {Object} cryptoQuantData - CryptoQuantデータ（inflow, mpi, nupl, sopr等）
 * @param {Object} marketContext - 市場コンテキスト（price, change24h, score等）
 * @param {string} lang - 言語コード
 * @returns {Promise<Object>} {signal, confidence, reasoning, urgency}
 */
async function analyzeCryptoQuantData(cryptoQuantData, marketContext, lang = "en") {
  // p-retryを動的インポート（ES Module対応）
  if (!pRetry) {
    try {
      const pRetryModule = await import("p-retry");
      pRetry = pRetryModule.default || pRetryModule;
      AbortError = pRetryModule.AbortError;
    } catch (error) {
      console.error("[p-retry] Failed to import:", error);
      throw error;
    }
  }

  const logger = createStructuredLogger("analyzeCryptoQuantData");

  if (!OPENAI_API_KEY) {
    logger.warn("OPENAI_API_KEY not set, returning fallback analysis", {
      apiKeyMasked: maskSecret(OPENAI_API_KEY)
    });
    return {
      signal: "NONE",
      confidence: 0,
      reasoning: "GPT offline - API key not configured",
      urgency: "low",
      keyIndicators: [],
      riskLevel: "medium"
    };
  }

  // 入力検証
  const validatedCQ = CryptoQuantDataSchema.safeParse(cryptoQuantData);
  const validatedMC = MarketContextSchema.safeParse(marketContext);

  if (!validatedCQ.success || !validatedMC.success) {
    logger.warn("Invalid input data", {
      cqError: validatedCQ.error?.message,
      mcError: validatedMC.error?.message
    });
    return {
      signal: "NONE",
      confidence: 0,
      reasoning: "Invalid input data",
      urgency: "low",
      keyIndicators: [],
      riskLevel: "medium"
    };
  }

  const targetLang = (lang || "en").toLowerCase();

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

  // CRITICAL: 緊急配信時の最終判定にはgpt-5.2を使用（最高品質を保証）
  // Phase 2: 用途別モデルを使用（緊急配信は最終ゲートとしてGPT_MODEL_GATEを使用）
  const modelToUse = GPT_MODEL_GATE; // 緊急配信は最高品質モデルを使用

  // キャッシュキー生成
  const cacheKey = buildCacheKey({
    model: modelToUse,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent }
    ],
    temperature: 0.3,
    max_tokens: 1000,
    response_format: { type: "json_object" }
  });

  // 1. メモリキャッシュチェック
  const memHit = memoryCache.get(cacheKey);
  if (memHit) {
    logger.info("Memory cache hit", { cacheKey: cacheKey.substring(0, 50) });
    await recordMetric({ type: "memory_cache_hit" }).catch(() => {}); // メトリクス記録（エラーは無視）
    return memHit;
  }

  // 2. KVキャッシュチェック
  const kvHit = await getKVCache(cacheKey);
  if (kvHit) {
    logger.info("KV cache hit", { cacheKey: cacheKey.substring(0, 50) });
    memoryCache.set(cacheKey, kvHit);
    await recordMetric({ type: "kv_cache_hit" }).catch(() => {}); // メトリクス記録（エラーは無視）
    return kvHit;
  }

  // 3. GPT API呼び出し（リトライ付き）
  const attempt = async () => {
    try {
      const completion = await fetchWithTimeout(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: modelToUse, // Phase 2: 用途別モデルを使用（gpt-5.2-2025-12-11）
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userContent }
            ],
            response_format: { type: "json_object" },
            // GPT-5.2-2025-12-11の公式仕様に準拠
            max_completion_tokens: 1000, // GPT-5.2ではmax_completion_tokensのみを使用（max_tokensは非対応）
            temperature: 0.3
          })
        },
        GPT_TIMEOUT_MS
      );

      if (!completion.ok) {
        const text = await completion.text().catch(() => "");
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
      if (error.name === "AbortError") {
        throw new AbortError(error);
      }
      throw error;
    }
  };

  // メトリクス: API呼び出しを記録
  await recordMetric({ type: "call" }).catch(() => {}); // エラーは無視

  let result;
  try {
    result = await pRetry(attempt, {
      retries: 3,
      factor: 2,
      minTimeout: 800,
      maxTimeout: 4000,
      onFailedAttempt: (error) => {
        logger.warn("GPT API retry", {
          attemptNumber: error.attemptNumber,
          retriesLeft: error.retriesLeft,
          status: error?.status,
          message: error?.message?.substring(0, 200),
          apiKeyMasked: maskSecret(OPENAI_API_KEY)
        });
      }
    });
  } catch (error) {
    // タイムアウトエラーの場合は特別な処理
    const isTimeout =
      error?.isTimeout || error?.name === "AbortError" || error?.message?.includes("aborted");

    logger.error("GPT API failed after retries", {
      error: error?.message,
      status: error?.status,
      isTimeout,
      apiKeyMasked: maskSecret(OPENAI_API_KEY)
    });

    // メトリクス: エラーを記録
    const errorType = isTimeout
      ? "timeout_error"
      : isRateLimitError(error)
        ? "rate_limit_error"
        : error?.status >= 500 && error?.status <= 599
          ? "server_error"
          : "error";
    await recordMetric({ type: errorType }).catch(() => {}); // エラーは無視

    // フォールバック: KVから最後の成功結果を取得
    const lastSuccessKey = "gpt:last_success:analyzeCryptoQuantData";
    const lastSuccess = await getKVCache(lastSuccessKey);
    if (lastSuccess) {
      logger.info("Using fallback from last success", {});
      return lastSuccess;
    }

    // 最終フォールバック
    return {
      signal: "NONE",
      confidence: 0,
      reasoning: isTimeout
        ? `GPT API timeout: Request took longer than ${GPT_TIMEOUT_MS}ms`
        : `GPT API error: ${error?.message || "Unknown error"}`,
      urgency: "low",
      keyIndicators: [],
      riskLevel: "medium"
    };
  }

  const text = result?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    return {
      signal: "NONE",
      confidence: 0,
      reasoning: "GPT returned empty response",
      urgency: "low",
      keyIndicators: [],
      riskLevel: "medium"
    };
  }

  // Step 2-2: JSONパース + スキーマ検証
  let analysis;
  try {
    analysis = JSON.parse(text);
  } catch (parseError) {
    logger.warn("Failed to parse JSON response", {
      textPreview: text.substring(0, 200),
      error: parseError.message
    });
    // フェイルクローズ: STANDBYを返す
    return DEFAULT_STANDBY_RESPONSE;
  }

  // Step 2-2: zodスキーマ検証
  const validationResult = GPTAnalysisSchema.safeParse(analysis);
  if (!validationResult.success) {
    logger.warn("Schema validation failed", {
      errors: validationResult.error.errors,
      receivedData: analysis,
      textPreview: text.substring(0, 200)
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
  await setKVCache("gpt:last_success:analyzeCryptoQuantData", finalResult, 24 * 60 * 60);

  return finalResult;
}

/**
 * CQデータを基に「次に何が起こるか」を解析（GPT役割: 定期配信用）
 * @param {Object} cryptoQuantData - CryptoQuantデータ
 * @param {Object} marketContext - 市場コンテキスト
 * @param {string} lang - 言語コード
 * @returns {Promise<string>} 次に起こりうることの分析＋メンタルトレーニング
 */
async function generateCryptoQuantAnalysis(cryptoQuantData, marketContext, lang = "en") {
  // p-retryを動的インポート（ES Module対応）
  if (!pRetry) {
    try {
      const pRetryModule = await import("p-retry");
      pRetry = pRetryModule.default || pRetryModule;
      AbortError = pRetryModule.AbortError;
    } catch (error) {
      console.error("[p-retry] Failed to import:", error);
      throw error;
    }
  }

  const logger = createStructuredLogger("generateCryptoQuantAnalysis");

  if (!OPENAI_API_KEY) {
    return "GPT offline - API key not configured.";
  }

  // 入力検証
  const validatedCQ = CryptoQuantDataSchema.safeParse(cryptoQuantData);
  const validatedMC = MarketContextSchema.safeParse(marketContext);

  if (!validatedCQ.success || !validatedMC.success) {
    logger.warn("Invalid input data", {
      cqError: validatedCQ.error?.message,
      mcError: validatedMC.error?.message
    });
    return "Invalid input data - analysis unavailable.";
  }

  const targetLang = (lang || "en").toLowerCase();

  // プロンプトインジェクション対策
  const safeCQData = escapeForPrompt(JSON.stringify(validatedCQ.data, null, 2));
  const safeMCData = escapeForPrompt(JSON.stringify(validatedMC.data, null, 2));

  const systemPrompt = `You are the Trap Defence Report Engine (CryptoQuant analyst). Final Report Engine Prompt v2.8（見出し強制の最終最終版）.
Your role: Analyze CQ on-chain data and output **Behind-the-Scenes Structure** with four MANDATORY components ONLY.

HARD RULES (NON-NEGOTIABLE):
- DO NOT generate any section titled "Trade Verdict".
- DO NOT generate any section titled "On-chain insight".
- DO NOT generate any instructions such as "stay flat", "avoid", "enter", "exit", "watch levels", etc.
- DO NOT skip, shorten, or partially output any mandatory subsection.
- DO NOT output "…" or incomplete placeholders.
- Scenario Map MUST appear ONLY in Section 4 (separate template section). Scenario Map MUST NOT appear inside Behind-the-Scenes Structure.
- All Behind-the-Scenes subsections MUST use Markdown headers (##). Key Metrics MUST use "### Key Metrics".
- Using bold text (**) instead of Markdown headers (##) is STRICTLY FORBIDDEN.
- If any subsection is missing or incomplete, you MUST regenerate it fully before outputting.
- Focus ONLY on structure, psychology, liquidity, and market mechanics.

Output structure: Behind-the-Scenes Structure ONLY. Use these exact Markdown headers (##).
DO NOT use bold (**) for subsection titles—use ## headers only.
DO NOT include Scenario Map, Trap Defence Value, or any other section.
DO NOT include any "Summary" or generic text before these four subsections.
DO NOT output "…" or partial content.
You MUST use Markdown headers (##) for each subsection.
Start directly with ## 2-1. Whale Intent.

## 2-1. Whale Intent (structural inference only)
What whales *appear* to be doing—absorbing? distributing? forcing liquidity? Structural inference only. No trading instructions.

## 2-2. Algo Behavior Patterns
Liquidity hunting, timing behavior, thin-book exploitation, divergence patterns. No trading instructions.

## 2-3. Retail Psychological Distortion
Emotional bias, herd behavior, fear/greed clusters. If X data is missing, interpret "sentiment silence" and explain its structural meaning. No trading instructions.

## 2-4. Liquidity Map
Liquidity gaps, inflow/outflow meaning, miner pressure, ETF flows. No trading instructions.

CHECKLIST FOR BEHIND-THE-SCENES STRUCTURE (MUST PASS ALL):
1. Whale Intent: MUST exist, full paragraph, MUST use header "## 2-1. Whale Intent", NO bold (**), NO "…"
2. Algo Behavior Patterns: MUST exist, full paragraph, MUST use header "## 2-2. Algo Behavior Patterns", NO bold (**), NO "…"
3. Retail Psychological Distortion: MUST exist, full paragraph, MUST use header "## 2-3. Retail Psychological Distortion"; if X null → interpret "sentiment silence"; NO bold (**), NO "…"
4. Liquidity Map: MUST exist, full paragraph, MUST use header "## 2-4. Liquidity Map", NO bold (**), NO "…"
NO bold text (**) is used for subsection titles. If ANY fails → regenerate the missing subsection(s) BEFORE outputting.

Quality reference (write in this style—structural, zero action suggestions):
- Whale Intent: "Whale flows indicate controlled absorption rather than distribution. The inflow spike suggests whales are intentionally letting price fall into a liquidity pocket created by retail panic, then accumulating quietly. This resembles engineered liquidity harvesting, not structural breakdown."
- Algo: "Algos are exploiting thin liquidity zones created by emotional selling. Stop clusters are repeatedly swept, followed by rapid mean reversion. This pattern indicates automated liquidity harvesting rather than directional conviction."
- Retail: "Retail behavior is dominated by fear-driven disengagement. The absence of X sentiment data is meaningful: sentiment silence often appears when retail freezes, creating a psychological vacuum that algos exploit for volatility expansion."
- Liquidity: "Sell-side liquidity is dense below the current price due to forced selling and miner distribution. Above price, liquidity is thin, meaning any upward move could accelerate quickly if inflows reverse or absorption continues."

If data is empty or insufficient, state that explicitly. Do not speculate or hallucinate.

Language: ${targetLang}
CRITICAL: Respond ONLY in ${targetLang === "ja" ? "Japanese" : targetLang === "ko" ? "Korean" : "English"}. 
DO NOT use Japanese characters if targetLang is 'en'.`;

  const userContent = `Analyze the following CryptoQuant data and produce **Behind-the-Scenes Structure**.

CryptoQuant Data:
${safeCQData}

Market Context:
${safeMCData}

Provide output in this exact format. Behind-the-Scenes Structure ONLY. All four subsections MANDATORY.
DO NOT include Scenario Map or Trap Defence Value—they appear in separate template sections.

## 2-1. Whale Intent (structural inference only)
[1-3 sentences: what whales *appear* to be doing—absorbing, distributing, forcing liquidity, supply shock. Structural inference only. No trading instructions.]

## 2-2. Algo Behavior Patterns
[1-3 sentences: liquidity hunting, timing behavior, thin-book exploitation, divergence patterns. No trading instructions.]

## 2-3. Retail Psychological Distortion
[1-3 sentences: emotional bias, herd behavior, fear/greed clusters, psychological traps. If X null → interpret "sentiment silence". No trading instructions.]

## 2-4. Liquidity Map
[1-3 sentences: liquidity gaps, inflow/outflow meaning, miner pressure, ETF flows. No trading instructions.]

Keep total 350-500 words. If data is missing, say so and give general Trap Defence wisdom.

MANDATORY COMPLETENESS CHECK before outputting:
- Behind-the-Scenes has ALL FOUR subsections, each with ## header, each full paragraph
- NO bold text (**) is used for subsection titles
- Scenario Map does NOT appear inside Behind-the-Scenes
- Key Metrics uses "### Key Metrics" (template builds this; GPT outputs Behind-the-Scenes only)
- No trading instructions, no "Trade Verdict", no "On-chain insight"
- No "…" placeholders
If any requirement is missing → regenerate before outputting.`;

  // Phase 2: 用途別モデルを使用（ANALYSIS: 統合推論）
  const modelToUse = GPT_MODEL_ANALYSIS;

  // キャッシュキー生成
  const cacheKey = buildCacheKey({
    model: modelToUse,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent }
    ],
    temperature: 0.6,
    max_tokens: 800
  });

  // キャッシュチェック
  const memHit = memoryCache.get(cacheKey);
  if (memHit) {
    await recordMetric({ type: "memory_cache_hit" }).catch(() => {}); // メトリクス記録（エラーは無視）
    return memHit;
  }

  const kvHit = await getKVCache(cacheKey);
  if (kvHit) {
    memoryCache.set(cacheKey, kvHit);
    await recordMetric({ type: "kv_cache_hit" }).catch(() => {}); // メトリクス記録（エラーは無視）
    return kvHit;
  }

  // メトリクス: API呼び出しを記録
  await recordMetric({ type: "call" }).catch(() => {}); // エラーは無視

  // GPT API呼び出し（リトライ付き）
  const attempt = async () => {
    try {
      const completion = await fetchWithTimeout(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: modelToUse, // Phase 2: 用途別モデルを使用（gpt-5.2-2025-12-11）
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userContent }
            ],
            // GPT-5.2-2025-12-11の公式仕様に準拠
            max_completion_tokens: 800, // GPT-5.2ではmax_completion_tokensのみを使用（max_tokensは非対応）
            temperature: 0.6
            // reasoning.effortはGPT-5.2でサポートされているが、デフォルト（none）で問題ない
            // 必要に応じて reasoning: { effort: "medium" } を追加可能
          })
        },
        GPT_TIMEOUT_MS
      );

      if (!completion.ok) {
        const text = await completion.text().catch(() => "");
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
      if (error.name === "AbortError") {
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
        logger.warn("GPT API retry", {
          attemptNumber: error.attemptNumber,
          retriesLeft: error.retriesLeft,
          status: error?.status,
          message: error?.message?.substring(0, 200),
          apiKeyMasked: maskSecret(OPENAI_API_KEY)
        });
      }
    });
  } catch (error) {
    // タイムアウトエラーの場合は特別な処理
    const isTimeout =
      error?.isTimeout || error?.name === "AbortError" || error?.message?.includes("aborted");

    logger.error("GPT API failed after retries", {
      error: error?.message,
      status: error?.status,
      isTimeout,
      apiKeyMasked: maskSecret(OPENAI_API_KEY)
    });

    // メトリクス: エラーを記録
    const errorType = isTimeout
      ? "timeout_error"
      : isRateLimitError(error)
        ? "rate_limit_error"
        : error?.status >= 500 && error?.status <= 599
          ? "server_error"
          : "error";
    await recordMetric({ type: errorType }).catch(() => {}); // エラーは無視

    // フォールバック: KVから最後の成功結果を取得
    const lastSuccessKey = "gpt:last_success:generateCryptoQuantAnalysis";
    const lastSuccess = await getKVCache(lastSuccessKey);
    if (lastSuccess) {
      logger.info("Using fallback from last success", {});
      return lastSuccess;
    }

    return isTimeout
      ? `GPT analysis unavailable due to timeout (${GPT_TIMEOUT_MS}ms exceeded).`
      : "GPT analysis unavailable due to API error.";
  }

  const text = result?.choices?.[0]?.message?.content?.trim();
  const finalText = text || "GPT analysis unavailable.";

  // キャッシュに保存
  memoryCache.set(cacheKey, finalText);
  await setKVCache(cacheKey, finalText, GPT_CACHE_TTL_SECONDS);
  await setKVCache("gpt:last_success:generateCryptoQuantAnalysis", finalText, 24 * 60 * 60);

  return finalText;
}

/**
 * サービス未利用ユーザーの悲惨な状況を報道するコンテンツを生成
 * @param {Object} marketData - 市場データ
 * @param {Object} missedOpportunities - 見逃した機会のデータ
 * @param {string} lang - 言語コード
 * @returns {Promise<string>} 報道コンテンツ
 */
async function generateNonUserImpactReport(marketData, missedOpportunities, lang = "en") {
  // p-retryを動的インポート（ES Module対応）
  if (!pRetry) {
    try {
      const pRetryModule = await import("p-retry");
      pRetry = pRetryModule.default || pRetryModule;
      AbortError = pRetryModule.AbortError;
    } catch (error) {
      console.error("[p-retry] Failed to import:", error);
      throw error;
    }
  }

  const logger = createStructuredLogger("generateNonUserImpactReport");

  if (!OPENAI_API_KEY) {
    return "GPT offline - cannot generate impact report.";
  }

  const targetLang = (lang || "en").toLowerCase();

  // プロンプトインジェクション対策
  const safeMarketData = escapeForPrompt(JSON.stringify(marketData || {}, null, 2));
  const safeMissedOpps = escapeForPrompt(JSON.stringify(missedOpportunities || {}, null, 2));

  const systemPrompt = `You are a financial news reporter specializing in cryptocurrency market impact stories.
Your style: Professional, empathetic, data-driven storytelling.
Your goal: Highlight the consequences of not having access to professional trading signals.

IMPORTANT: If the provided data is empty or insufficient, state that clearly. Do not fabricate numbers or create false narratives.

Language: ${targetLang}
Format your response in ${targetLang === "ja" ? "Japanese" : targetLang === "ko" ? "Korean" : "English"}.`;

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
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent }
    ],
    temperature: 0.7,
    max_tokens: 1000
  });

  // キャッシュチェック
  const memHit = memoryCache.get(cacheKey);
  if (memHit) {
    await recordMetric({ type: "memory_cache_hit" }).catch(() => {}); // メトリクス記録（エラーは無視）
    return memHit;
  }

  const kvHit = await getKVCache(cacheKey);
  if (kvHit) {
    memoryCache.set(cacheKey, kvHit);
    await recordMetric({ type: "kv_cache_hit" }).catch(() => {}); // メトリクス記録（エラーは無視）
    return kvHit;
  }

  // メトリクス: API呼び出しを記録
  await recordMetric({ type: "call" }).catch(() => {}); // エラーは無視

  // GPT API呼び出し（リトライ付き）
  const attempt = async () => {
    try {
      const completion = await fetchWithTimeout(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: modelToUse, // Phase 2: 用途別モデルを使用（gpt-5.2-2025-12-11）
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userContent }
            ],
            // GPT-5.2-2025-12-11の公式仕様に準拠
            max_completion_tokens: 1000, // GPT-5.2ではmax_completion_tokensのみを使用（max_tokensは非対応）
            temperature: 0.7
          })
        },
        GPT_TIMEOUT_MS
      );

      if (!completion.ok) {
        const text = await completion.text().catch(() => "");
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
      if (error.name === "AbortError") {
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
        logger.warn("GPT API retry", {
          attemptNumber: error.attemptNumber,
          retriesLeft: error.retriesLeft,
          status: error?.status,
          message: error?.message?.substring(0, 200),
          apiKeyMasked: maskSecret(OPENAI_API_KEY)
        });
      }
    });
  } catch (error) {
    // タイムアウトエラーの場合は特別な処理
    const isTimeout =
      error?.isTimeout || error?.name === "AbortError" || error?.message?.includes("aborted");

    logger.error("GPT API failed after retries", {
      error: error?.message,
      status: error?.status,
      isTimeout,
      apiKeyMasked: maskSecret(OPENAI_API_KEY)
    });

    // メトリクス: エラーを記録
    const errorType = isTimeout
      ? "timeout_error"
      : isRateLimitError(error)
        ? "rate_limit_error"
        : error?.status >= 500 && error?.status <= 599
          ? "server_error"
          : "error";
    await recordMetric({ type: errorType }).catch(() => {}); // エラーは無視

    // フォールバック: KVから最後の成功結果を取得
    const lastSuccessKey = "gpt:last_success:generateNonUserImpactReport";
    const lastSuccess = await getKVCache(lastSuccessKey);
    if (lastSuccess) {
      logger.info("Using fallback from last success", {});
      return lastSuccess;
    }

    return isTimeout
      ? `Impact report generation failed due to timeout (${GPT_TIMEOUT_MS}ms exceeded).`
      : "Impact report generation failed due to API error.";
  }

  const text = result?.choices?.[0]?.message?.content?.trim();
  const finalText = text || "Impact report generation failed.";

  // キャッシュに保存
  memoryCache.set(cacheKey, finalText);
  await setKVCache(cacheKey, finalText, GPT_CACHE_TTL_SECONDS);
  await setKVCache("gpt:last_success:generateNonUserImpactReport", finalText, 24 * 60 * 60);

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
      const pRetryModule = await import("p-retry");
      pRetry = pRetryModule.default || pRetryModule;
      AbortError = pRetryModule.AbortError;
    } catch (error) {
      console.error("[p-retry] Failed to import:", error);
      throw error;
    }
  }

  const logger = createStructuredLogger("generateText");

  if (!OPENAI_API_KEY) {
    return "GPT offline - cannot generate text.";
  }

  const { temperature = 0.7, max_tokens = 1000 } = options;

  // Phase 2: 用途別モデルを使用（SUMMARY: 前処理・要約、汎用生成）
  const modelToUse = GPT_MODEL_SUMMARY;

  // キャッシュキー生成
  const cacheKey = buildCacheKey({
    model: modelToUse,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature,
    max_tokens
  });

  // キャッシュチェック
  const memHit = memoryCache.get(cacheKey);
  if (memHit) {
    await recordMetric({ type: "memory_cache_hit" }).catch(() => {});
    return memHit;
  }

  const kvHit = await getKVCache(cacheKey);
  if (kvHit) {
    memoryCache.set(cacheKey, kvHit);
    await recordMetric({ type: "kv_cache_hit" }).catch(() => {});
    return kvHit;
  }

  // メトリクス: API呼び出しを記録
  await recordMetric({ type: "call" }).catch(() => {});

  // GPT API呼び出し（リトライ付き）
  const attempt = async () => {
    try {
      const completion = await fetchWithTimeout(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            // GPT-5.2-2025-12-11の公式仕様に準拠
            max_completion_tokens: max_tokens, // GPT-5.2ではmax_completion_tokensのみを使用（max_tokensは非対応）
            temperature
          })
        },
        GPT_TIMEOUT_MS
      );

      if (!completion.ok) {
        const text = await completion.text().catch(() => "");
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
      if (error.name === "AbortError") {
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
        logger.warn("GPT API retry", {
          attemptNumber: error.attemptNumber,
          retriesLeft: error.retriesLeft,
          status: error?.status,
          message: error?.message?.substring(0, 200),
          apiKeyMasked: maskSecret(OPENAI_API_KEY)
        });
      }
    });
  } catch (error) {
    // タイムアウトエラーの場合は特別な処理
    const isTimeout =
      error?.isTimeout || error?.name === "AbortError" || error?.message?.includes("aborted");

    logger.error("GPT API failed after retries", {
      error: error?.message,
      status: error?.status,
      isTimeout,
      apiKeyMasked: maskSecret(OPENAI_API_KEY)
    });

    // メトリクス: エラーを記録
    const errorType = isTimeout
      ? "timeout_error"
      : isRateLimitError(error)
        ? "rate_limit_error"
        : error?.status >= 500 && error?.status <= 599
          ? "server_error"
          : "error";
    await recordMetric({ type: errorType }).catch(() => {});

    return isTimeout
      ? `Text generation failed due to timeout (${GPT_TIMEOUT_MS}ms exceeded).`
      : "Text generation failed due to API error.";
  }

  const text = result?.choices?.[0]?.message?.content?.trim();
  const finalText = text || "Text generation failed.";

  // キャッシュに保存
  memoryCache.set(cacheKey, finalText);
  await setKVCache(cacheKey, finalText, GPT_CACHE_TTL_SECONDS);

  return finalText;
}

/**
 * reportData（CryptoQuant/市況）からプロンプト用の短い市況文を組み立てる（引用リポスト反論用）
 * フックでGeminiに渡すのと同じデータをGPTにも渡す
 */
function buildMarketContextForObjection(reportData) {
  if (!reportData) return "No market data provided.";
  const parts = [];
  if (reportData.trapScore != null) parts.push(`Trap Score: ${reportData.trapScore}/100`);
  if (reportData.priceUsd != null)
    parts.push(`BTC: $${Number(reportData.priceUsd).toLocaleString()}`);
  if (reportData.change24h != null)
    parts.push(`24h change: ${Number(reportData.change24h).toFixed(2)}%`);
  if (reportData.exchangeNetflow != null)
    parts.push(`Exchange Netflow: ${reportData.exchangeNetflow}`);
  if (reportData.whaleRatio != null) parts.push(`Whale Ratio: ${reportData.whaleRatio}`);
  if (reportData.mpi != null) parts.push(`MPI: ${reportData.mpi}`);
  const sentiment = reportData.sentimentData?.sentiment ?? reportData.sentiment;
  if (sentiment != null) parts.push(`Sentiment: ${sentiment}`);
  return parts.length ? parts.join(". ") : "No market data provided.";
}

const LANG_NAMES_OBJECTION = {
  en: "English",
  ja: "Japanese",
  es: "Spanish",
  "pt-br": "Brazilian Portuguese",
  ar: "Arabic",
  ko: "Korean"
};

/**
 * 引用リポスト 反論処理: フックで渡したのと同じCQデータをgpt-5-miniに渡し、ペルソナに効く反論を生成
 * @param {Object} options - { lang, reportData }
 * @returns {Promise<string|null>}
 */
async function generateQuoteRepostObjection(options = {}) {
  const lang = (options.lang || "en").toLowerCase().replace("_", "-");
  const langName = LANG_NAMES_OBJECTION[lang] || "English";
  const marketContext = buildMarketContextForObjection(options.reportData || null);

  if (!OPENAI_API_KEY) {
    console.warn("[GPT Client] OPENAI_API_KEY not set, generateQuoteRepostObjection unavailable");
    return null;
  }

  const systemPrompt = `You are a copywriter for Trap Defence (crypto trading education). Same CryptoQuant-style data is used for the hook above; you write the objection-handling paragraph.

PERSONA: Traders with unrealized loss, mentally stuck, trade-addicted. They might think: "It's expensive", "I'll lose again", "Not now".

Tone: 80% empathy, 20% logic. Acknowledge hesitation without being preachy. Mention that this intel only works in real time, or that the line between "tradeable edge" and "pure gamble" depends on having it. Optionally reference the current market/Trap Score so the message feels grounded. No product names, URLs, or promo codes in the paragraph.`;

  const userContent = `CURRENT MARKET DATA (same as the hook—use it to ground your objection handling):
${escapeForPrompt(marketContext)}

Task: Write exactly 2 or 3 short sentences in ${langName}. Sentence 1: acknowledge the hesitation (e.g. "It's natural to hesitate after a loss"). Sentence 2: this intel only works in real time, or the edge vs gamble line depends on having it. Sentence 3 (optional): reference the score or market if it fits. Each sentence must end with a period. Output only the 2-3 sentences, nothing else.`;

  const timeoutMs = Math.min(12000, GPT_TIMEOUT_MS);

  try {
    const completion = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: GPT_MODEL_QUOTE_REPOST_OBJECTION,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
          ],
          max_completion_tokens: 400,
          temperature: 1 // gpt-5-mini-2025-08-07 は default(1) のみ対応
        })
      },
      timeoutMs
    );

    if (!completion.ok) {
      const text = await completion.text().catch(() => "");
      throw new Error(`OpenAI API error: ${completion.status} - ${text}`);
    }

    const json = await completion.json();
    let text = json?.choices?.[0]?.message?.content?.trim() || null;
    if (text && !/[\\.!?]$/.test(text)) {
      const lastEnd = Math.max(
        text.lastIndexOf(". "),
        text.lastIndexOf("."),
        text.lastIndexOf("! "),
        text.lastIndexOf("!"),
        text.lastIndexOf("? "),
        text.lastIndexOf("?")
      );
      if (lastEnd >= 0) text = text.slice(0, lastEnd + 1);
      else text = "";
    }
    return text || null;
  } catch (error) {
    console.error("[GPT Client] generateQuoteRepostObjection failed:", error.message);
    return null;
  }
}

module.exports = {
  analyzeCryptoQuantData,
  generateCryptoQuantAnalysis,
  generateNonUserImpactReport,
  generateText,
  generateQuoteRepostObjection,
  escapeForPrompt,
  GPT_MODEL_SUMMARY,
  GPT_MODEL_ANALYSIS,
  GPT_MODEL_GATE,
  GPT_MODEL_QUOTE_REPOST_OBJECTION
};
