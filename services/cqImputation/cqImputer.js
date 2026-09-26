// services/cqImputation/cqImputer.js
// CryptoQuant欠損時に Exchange Netflow (inflow) / Miner Position Index (mpi) をAIで穴埋めし、
// Trap Score / シナリオ生成にも反映されるようにする。

let OpenAI = null;
try { OpenAI = require("openai"); } catch {}
const { kv } = require("../../utils/kv");
let generateChatCompletion = null;
try { generateChatCompletion = require("../grok/client").generateChatCompletion; } catch {}
let GoogleGenerativeAI = null;
try { GoogleGenerativeAI = require("@google/generative-ai").GoogleGenerativeAI; } catch {}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GPT_MODEL_GLOBAL = process.env.GPT_MODEL || process.env.OPENAI_MODEL || "gpt-5.2-2025-12-11";
const GPT_TIMEOUT_MS = Number(process.env.CQ_IMPUTE_GPT_TIMEOUT_MS || 25000);
const CQ_IMPUTE_TTL_SECONDS = Number(process.env.CQ_IMPUTE_CACHE_TTL_SECONDS || 1200); // 20m

function safeJsonParse(text) {
  if (typeof text !== "string") return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function clamp(n, min, max) {
  if (!Number.isFinite(n)) return n;
  return Math.max(min, Math.min(max, n));
}

function bucket(n, step) {
  if (!Number.isFinite(n)) return null;
  return Math.round(n / step) * step;
}

function isMissingValue(v) {
  return v == null || !Number.isFinite(Number(v));
}

function buildCacheKey({
  market,
  lang,
  priceUsd,
  change24h,
  sentimentLabel,
  missing,
  knownInflow,
  knownMpi
}) {
  const p = bucket(priceUsd, 100); // coarse
  const c = bucket(change24h, 0.5); // coarse (%)
  const m = missing ? JSON.stringify(missing) : "unknown";
  const ki = missing?.inflow ? "na" : bucket(knownInflow, 50);
  const km = missing?.mpi ? "na" : bucket(knownMpi, 0.1);
  return `cq-impute:${market}:${lang}:${p ?? "na"}:${c ?? "na"}:${sentimentLabel ?? "na"}:${m}:${ki ?? "na"}:${km ?? "na"}`;
}

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

async function callGptImputer({ market, lang, priceUsd, change24h, sentimentLabel, missing }) {
  if (!OPENAI_API_KEY || !OpenAI) return null;

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  // NOTE:
  // - inflowは「Exchange Netflow」想定の符号（正=弱気/売り圧、負=強気/買い圧）
  // - mpiは Miner Position Index 想定。多くの場合非負で、値が高いほど弱気傾向。
  const systemPrompt =
    "You are a quantitative CryptoQuant metric imputer. " +
    "When some metrics are missing, you estimate plausible values consistent with price change and sentiment. " +
    "Return ONLY valid JSON. No markdown. No code fences.";

  const userPrompt = {
    market,
    language: lang,
    priceUsd,
    change24hPct: change24h,
    sentiment: sentimentLabel,
    missing,
    requirements: [
      "Estimate exchange inflow (in BTC-k units as used internally) and mpi (Miner Position Index) when missing.",
      "Use sign intuition: price down + fear -> inflow positive (selling pressure). price up + greed -> inflow negative (accumulation).",
      "Keep mpi non-negative and plausible (typical range ~0 to 3).",
      "If you cannot infer, still output numbers but set confidence low.",
      "Provide a short basis string; do not mention uncertainty as refusal."
    ],
    outputSchema: {
      inflow: "number",
      mpi: "number",
      confidence: "number 0..1",
      basis: "string"
    }
  };

  const res = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: GPT_MODEL_GLOBAL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(userPrompt) }
        ],
        temperature: 0.3,
        max_completion_tokens: 350,
        response_format: { type: "json_object" }
      })
    },
    GPT_TIMEOUT_MS
  );

  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const text = json?.choices?.[0]?.message?.content;
  const parsed = safeJsonParse(text);
  if (!parsed) return null;

  const inflow = Number(parsed.inflow);
  const mpi = Number(parsed.mpi);
  const confidence = clamp(Number(parsed.confidence), 0, 1);

  if (!Number.isFinite(inflow) || !Number.isFinite(mpi)) return null;

  return {
    inflow: clamp(inflow, -50000, 50000),
    mpi: clamp(mpi, 0, 10),
    confidence,
    basis: parsed.basis || "gpt-impute"
  };
}

async function callGrokImputer({ market, lang, priceUsd, change24h, sentimentLabel, missing, gptCandidate }) {
  const text = await generateChatCompletion({
    model: process.env.GROK_MODEL || "grok-4-1-fast-reasoning",
    temperature: 0.4,
    max_tokens: 350,
    messages: [
      {
        role: "system",
        content:
          'You are a quantitative reviewer (Dr. Grok). ' +
          "Review and possibly adjust imputed CryptoQuant metrics. " +
          "Return ONLY valid JSON. No markdown. No code fences."
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "Review GPT candidate for inflow and mpi consistency with price change and sentiment.",
          market,
          language: lang,
          priceUsd,
          change24hPct: change24h,
          sentiment: sentimentLabel,
          missing,
          gptCandidate,
          rules: [
            "Keep mpi non-negative and plausible (~0..3).",
            "Keep inflow sign consistent with price+sentiment intuition.",
            "If inconsistent, adjust slightly rather than wildly.",
            "Return adjusted numbers and confidence."
          ],
          outputSchema: {
            inflow: "number",
            mpi: "number",
            confidence: "number 0..1",
            notes: "string"
          }
        })
      }
    ]
  });

  if (!text) return null;
  const parsed = safeJsonParse(text);
  if (!parsed) return null;

  const inflow = Number(parsed.inflow);
  const mpi = Number(parsed.mpi);
  const confidence = clamp(Number(parsed.confidence), 0, 1);
  if (!Number.isFinite(inflow) || !Number.isFinite(mpi)) return null;

  return {
    inflow: clamp(inflow, -50000, 50000),
    mpi: clamp(mpi, 0, 10),
    confidence,
    basis: parsed.notes || "grok-adjust"
  };
}

const fs = require("fs");
const path = require("path");

function getLocalThoughtSignature(market) {
  try {
    const dir = path.join(process.cwd(), "data", ".cache");
    const file = path.join(dir, "thought_signatures.json");
    if (!fs.existsSync(file)) return null;
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return data[market] || null;
  } catch {
    return null;
  }
}

function saveLocalThoughtSignature(market, sig) {
  try {
    const dir = path.join(process.cwd(), "data", ".cache");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, "thought_signatures.json");
    const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8") || "{}") : {};
    data[market] = { signature: sig, updatedAt: new Date().toISOString() };
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.warn("[ThoughtSignature] Failed to save local cache:", err.message);
  }
}

async function callGeminiImputer({ market, lang, priceUsd, change24h, sentimentLabel, missing }) {
  if (!GEMINI_API_KEY || !GoogleGenerativeAI) return null;
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const modelName = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const model = genAI.getGenerativeModel({ model: modelName });

  const enableThoughtSignatures = process.env.ENABLE_THOUGHT_SIGNATURES === "true";
  let previousSignature = null;

  if (enableThoughtSignatures) {
    try {
      if (kv && typeof kv.get === "function") {
        previousSignature = await kv.get(`gemini:thought_sig:${market}`);
      }
    } catch {
      // ignore kv read error
    }
    if (!previousSignature) {
      previousSignature = getLocalThoughtSignature(market)?.signature || null;
    }
  }

  const systemPrompt =
    "You are a quantitative CryptoQuant metric imputer and stateful market defense analyst. " +
    "Estimate missing Exchange Netflow (inflow) and Miner Position Index (mpi) from price change and sentiment. " +
    (enableThoughtSignatures
      ? "Maintain reasoning continuity across market intervals using Thought Signature circulation. "
      : "") +
    "Return ONLY valid JSON. No markdown. No code fences.";

  const userPrompt = {
    market,
    language: lang,
    priceUsd,
    change24hPct: change24h,
    sentiment: sentimentLabel,
    missing,
    previousThoughtSignature: previousSignature,
    outputSchema: {
      inflow: "number",
      mpi: "number",
      confidence: "number 0..1",
      basis: "string",
      thoughtSignature: "string (concise summary of continuous trap & flow hypothesis)"
    },
    constraints: [
      "mpi should be non-negative and plausible (~0..3).",
      "Use sign intuition: price down + fear -> inflow positive; price up + greed -> inflow negative.",
      "If unsure, still estimate but lower confidence.",
      "Output a new thoughtSignature capturing current reasoning state for follow-up market ticks."
    ]
  };

  const apiResult = await model.generateContent(`${systemPrompt}\n\n${JSON.stringify(userPrompt)}`);
  const text = apiResult?.response?.text?.() || "";
  const parsed = safeJsonParse(text.trim()) || safeJsonParse(text.match(/\{[\s\S]*\}/)?.[0]);
  if (!parsed) return null;

  const inflow = Number(parsed.inflow);
  const mpi = Number(parsed.mpi);
  const confidence = clamp(Number(parsed.confidence), 0, 1);
  if (!Number.isFinite(inflow) || !Number.isFinite(mpi)) return null;

  if (enableThoughtSignatures && parsed.thoughtSignature) {
    try {
      if (kv && typeof kv.set === "function") {
        await kv.set(`gemini:thought_sig:${market}`, parsed.thoughtSignature, { ex: 86400 });
      }
    } catch {
      // ignore kv write error
    }
    saveLocalThoughtSignature(market, parsed.thoughtSignature);
  }

  return {
    inflow: clamp(inflow, -50000, 50000),
    mpi: clamp(mpi, 0, 10),
    confidence,
    basis: parsed.basis || "gemini-3.8-flash-stateful",
    thoughtSignature: parsed.thoughtSignature || null
  };
}

function blendCandidates(candidates) {
  const valid = candidates.filter(Boolean);
  if (valid.length === 0) return null;

  const totalW = valid.reduce((s, c) => s + Math.max(0.001, Number(c.confidence) || 0), 0);
  if (totalW <= 0) return valid[0];

  let inflow = 0;
  let mpi = 0;
  for (const c of valid) {
    const w = Math.max(0.001, Number(c.confidence) || 0) / totalW;
    inflow += c.inflow * w;
    mpi += c.mpi * w;
  }

  const confidence = clamp(valid.reduce((s, c) => s + (c.confidence || 0), 0) / valid.length, 0, 1);
  const bases = valid.map((c) => c.basis).filter(Boolean);
  return { inflow, mpi, confidence, basis: bases.slice(0, 3).join(" + ") };
}

function deterministicFallbackImpute({ change24h, sentimentLabel, inflowMissing, mpiMissing }) {
  // AIが落ちても「数値が空にならない」ことを最優先する簡易推定。
  // 目的: Trap Score / シナリオ生成が欠損で無効化されるのを防ぐ。
  const s = String(sentimentLabel || "Neutral");
  const isFear = s.includes("Fear");
  const isGreed = s.includes("Greed");
  const dir = change24h >= 0 ? "up" : "down";

  // inflow scale (internal rules use ~2000-4000 ranges for typical patterns)
  let inflow = 0;
  if (inflowMissing) {
    if (dir === "up") {
      // 上昇 +（恐れ/中立/強欲）: 売り圧寄せ（AVOID_SHORT方向になりやすい）
      inflow = isFear || s === "Neutral" ? 2200 : 3200;
    } else {
      // 下落: 買い圧寄せ（AVOID_LONG方向になりやすい）
      inflow = isGreed || s === "Neutral" ? -1800 : -2600;
    }
  }

  // mpi: 非負を前提にしつつ「トラップっぽい」レンジに寄せる
  // （テンプレ表示改善の既存運用に合わせる）
  let mpi = 0;
  if (mpiMissing) {
    if (dir === "up") {
      mpi = isFear || s === "Neutral" ? 1.7 : 2.1;
    } else {
      // 下落局面は売り圧が弱まりやすい、ただし内部ルールとの整合を優先して下げすぎない
      mpi = isGreed || s === "Neutral" ? 1.1 : 0.9;
    }
  }

  const confidence = 0.25; // deterministic => low confidence
  const basis = "deterministic-fallback";
  return { inflow, mpi, confidence, basis };
}

/**
 * @returns {Promise<null|{inflow:number, mpi:number, confidence:number, basis:string, meta?:any}>}
 */
async function imputeCqMetrics({ market, lang, priceUsd, change24h, sentimentLabel, inflow, mpi }) {
  const inflowMissing = isMissingValue(inflow);
  const mpiMissing = isMissingValue(mpi);
  if (!inflowMissing && !mpiMissing) return null;

  const missing = { inflow: inflowMissing, mpi: mpiMissing };

  if (!OPENAI_API_KEY && !GEMINI_API_KEY) {
    // どちらのAPIも無い場合は、即フォールバック（下流ロジックが欠損で停止するのを防ぐ）
    const fallback = deterministicFallbackImpute({
      change24h,
      sentimentLabel,
      inflowMissing,
      mpiMissing
    });
    return { ...fallback, meta: { input: { change24h, sentimentLabel, missing }, candidates: null }, imputedAt: new Date().toISOString() };
  }

  const cacheKey = buildCacheKey({
    market,
    lang,
    priceUsd,
    change24h,
    sentimentLabel,
    missing,
    knownInflow: inflowMissing ? null : inflow,
    knownMpi: mpiMissing ? null : mpi
  });

  if (kv) {
    try {
      const cached = await kv.get(cacheKey);
      if (cached && Number.isFinite(cached.inflow) && Number.isFinite(cached.mpi)) {
        return cached;
      }
    } catch {
      // ignore
    }
  }

  // まず GPT/Gemini は並列取得し、その後に Grok を「GPT案を踏まえたレビュー」で取得する
  const [gptCand, gemCand] = await Promise.all([
    callGptImputer({ market, lang, priceUsd, change24h, sentimentLabel, missing }),
    callGeminiImputer({ market, lang, priceUsd, change24h, sentimentLabel, missing })
  ]);

  let grokCand = null;
  try {
    grokCand = await callGrokImputer({
      market,
      lang,
      priceUsd,
      change24h,
      sentimentLabel,
      missing,
      gptCandidate: gptCand
    });
  } catch {
    // ignore
  }

  const blended = blendCandidates([gptCand, grokCand, gemCand]);
  if (!blended) {
    // AIが全部落ちても「欠損を数値に確定」して下流（Trap Score/シナリオ）を無効化しない
    return deterministicFallbackImpute({
      change24h,
      sentimentLabel,
      inflowMissing,
      mpiMissing
    });
  }

  const meta = {
    input: {
      priceUsd,
      change24h,
      sentimentLabel,
      missing
    },
    candidates: {
      gpt: gptCand,
      grok: grokCand,
      gemini: gemCand
    }
  };

  // 欠損していないフィールドは「原値優先」で上書きしない。
  //（AIが両方数値を出してしまう可能性があるため）
  const finalInflow = inflowMissing ? blended.inflow : Number(inflow);
  const finalMpi = mpiMissing ? blended.mpi : Number(mpi);

  const result = {
    inflow: finalInflow,
    mpi: finalMpi,
    confidence: blended.confidence,
    basis: blended.basis,
    meta,
    imputedAt: new Date().toISOString()
  };

  if (kv) {
    try {
      await kv.set(cacheKey, result, { ex: CQ_IMPUTE_TTL_SECONDS });
    } catch {
      // ignore
    }
  }

  return result;
}

module.exports = {
  imputeCqMetrics
};

