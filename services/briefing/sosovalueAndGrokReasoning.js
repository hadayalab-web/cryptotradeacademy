// services/briefing/sosovalueAndGrokReasoning.js
// 有料版（Regular Briefing）用: SoSoValue風記事（Gemini 3 Flash）＋ Grok 4.1 推論チェーン

const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_BASE_URL = process.env.XAI_BASE_URL || "https://api.x.ai/v1";
const GROK_MODEL = process.env.GROK_MODEL_MARKET || "grok-4-1-fast-reasoning";

let genAI = null;
let grokClient = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}
if (XAI_API_KEY) {
  grokClient = new OpenAI({ apiKey: XAI_API_KEY, baseURL: XAI_BASE_URL });
}

/**
 * 有料版用: CryptoQuant＋市場コンテキストから SoSoValue 風記事を生成（Gemini 3 Flash）
 * @param {Object} cryptoQuantData - { inflow, mpi, priceUsd, change24h, sentiment, ...cqDeep }
 * @param {Object} marketContext - { priceUsd, change24h, score, signal, sentiment, trap }
 * @param {string} lang - 言語（記事は英語で生成し、多言語は後続で要約翻訳する想定）
 * @returns {Promise<string|null>} 記事本文 or null
 */
async function generateSoSoValueArticle(cryptoQuantData, marketContext, lang) {
  if (!genAI || !GEMINI_API_KEY) return null;
  const inflow = cryptoQuantData?.inflow ?? 0;
  const mpi = cryptoQuantData?.mpi ?? 0;
  const priceUsd = marketContext?.priceUsd ?? cryptoQuantData?.priceUsd ?? 0;
  const change24h = marketContext?.change24h ?? cryptoQuantData?.change24h ?? 0;
  const sentiment = marketContext?.sentiment ?? cryptoQuantData?.sentiment ?? "Unknown";
  const whaleRatio = cryptoQuantData?.whaleFlows?.whaleRatio ?? cryptoQuantData?.whaleRatio ?? null;
  const trapScore = cryptoQuantData?.trapScore ?? null;

  const lines = [
    "## Current on-chain data (CryptoQuant, real-time)",
    "",
    `- **Exchange Netflow (1D)**: ${inflow != null ? inflow.toFixed(0) : "N/A"} BTC`,
    `- **Miners' Position Index (MPI)**: ${mpi != null ? mpi : "N/A"}`,
    `- **Sentiment**: ${sentiment}`,
  ];
  if (whaleRatio != null) lines.push(`- **Exchange Whale Ratio**: ${(whaleRatio * 100).toFixed(1)}%`);
  if (trapScore != null) lines.push(`- **Trap Score (EN)**: ${trapScore}`);
  lines.push("");
  lines.push("## Market context");
  lines.push(`- **BTC/USD**: $${Number(priceUsd).toLocaleString("en-US", { maximumFractionDigits: 0 })} (24h: ${change24h != null ? (change24h >= 0 ? "+" : "") + change24h.toFixed(2) + "%" : "N/A"})`);
  const onChainSummary = lines.join("\n");

  const systemPrompt = `You are an on-chain analyst writing for a SoSoValue-style crypto research platform. Your style is:
- Data-driven and narrative: explain what the metrics mean and how they have behaved in the past.
- Historical parallels: when similar on-chain setups occurred (exchange netflow, MPI, SOPR, whale ratio), describe how the market typically moved in the following days/weeks.
- No trading signals: do NOT generate buy/sell/hold signals. Focus on context and education.
- Structure: short intro, then "Current setup", then "Historical parallels", then "What to watch". Use clear headings and bullet points.
- Tone: professional, analytical. Avoid hype and fear. Length: 400–600 words.`;

  const userPrompt = `Using the following real-time CryptoQuant on-chain data and market context, write a SoSoValue-style analytical article. No trading signals—only context and historical parallels.

${onChainSummary}`;

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { temperature: 0.6, maxOutputTokens: 4096 },
    });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }] }],
    });
    const text = result?.response?.text?.();
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch (e) {
    console.warn("[SoSoValue] generateSoSoValueArticle failed:", e?.message || e);
    return null;
  }
}

/**
 * 有料版用: Grok 4.1 Fast Reasoning で「なぜ STANDBY/AVOID か」を 2〜4 文の推論チェーンで返す
 * @param {Object} cryptoQuantData - inflow, mpi, priceUsd, change24h, ...
 * @param {Object} marketContext - score, signal, sentiment, trap
 * @param {string} signal - STANDBY | AVOID_LONG | AVOID_SHORT
 * @param {Object} trapDetection - trapDetected, trapType, trapScore, ...
 * @param {Object} xSentiment - whaleBias, retailFomo, newsImpact
 * @param {string} lang - 言語（出力は英語で統一し、表示側で翻訳する想定）
 * @returns {Promise<string|null>} 推論テキスト or null
 */
async function generateGrokReasoning(cryptoQuantData, marketContext, signal, trapDetection, xSentiment, lang) {
  if (!grokClient || !XAI_API_KEY) return null;
  const inflow = cryptoQuantData?.inflow ?? 0;
  const mpi = cryptoQuantData?.mpi ?? 0;
  const priceUsd = marketContext?.priceUsd ?? cryptoQuantData?.priceUsd ?? 0;
  const change24h = marketContext?.change24h ?? 0;
  const score = marketContext?.score ?? 0;
  const trapScore = trapDetection?.trapScore ?? cryptoQuantData?.trapScore ?? 0;
  const whaleBias = xSentiment?.whaleBias ?? 0;
  const retailFomo = xSentiment?.retailFomo ?? 50;

  const systemPrompt = `You are "Dr. Grok", an expert at explaining WHY a trading verdict (STANDBY / AVOID_LONG / AVOID_SHORT) is chosen based on on-chain data and X sentiment. Your output must be a short reasoning chain: 2–4 bullet points or numbered sentences. No fluff. No buy/sell advice. Focus on: (1) exchange netflow vs price action, (2) miner behavior (MPI), (3) any divergence between on-chain and X sentiment. Output in English only. Max 400 characters.`;

  const userContent = `Current verdict: ${signal || "STANDBY"}.
Data: Exchange netflow ${inflow?.toFixed(0) ?? "N/A"} BTC, MPI ${mpi != null ? mpi : "N/A"}, price 24h ${change24h != null ? change24h.toFixed(2) + "%" : "N/A"}, market score ${score}, trap score ${trapScore}. X: whaleBias ${whaleBias}, retailFomo ${retailFomo}.
Output 2–4 short reasoning bullets explaining WHY this verdict (no signals, only reasoning).`;

  try {
    const completion = await grokClient.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: 500,
      temperature: 0.4,
    });
    const text = completion?.choices?.[0]?.message?.content?.trim();
    return typeof text === "string" && text.length > 0 ? text : null;
  } catch (e) {
    console.warn("[Grok] generateGrokReasoning failed:", e?.message || e);
    return null;
  }
}

/**
 * 無料版（Minimal）用: Grok 4.1 で「なぜこの Trap Scoreか・何を見るか」を 2 バレットで返す
 */
async function generateMinimalGrokReasoning(trapData, marketData, sentimentData, lang) {
  if (!grokClient || !XAI_API_KEY) return null;
  const trapScore = trapData?.trapScore ?? trapData?.trapScore ?? 0;
  const netflow = trapData?.exchangeNetflow ?? marketData?.inflow ?? 0;
  const mpi = marketData?.mpi ?? 0;
  const sentiment = sentimentData?.sentiment ?? "Unknown";

  const systemPrompt = `You are Dr. Grok. Output exactly 2 short bullet points for free-tier traders: (1) why this Trap Score given netflow/MPI, (2) what to watch next (one metric). No fluff. English only. Max 80 words.`;

  const userContent = `Trap Score: ${trapScore}. Exchange netflow: ${netflow?.toFixed?.(0) ?? netflow} BTC. MPI: ${mpi != null ? mpi : "N/A"}. Sentiment: ${sentiment}. Output 2 bullets only.`;

  try {
    const completion = await grokClient.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: 200,
      temperature: 0.3,
    });
    const text = completion?.choices?.[0]?.message?.content?.trim();
    return typeof text === "string" && text.length > 0 ? text : null;
  } catch (e) {
    console.warn("[Grok] generateMinimalGrokReasoning failed:", e?.message || e);
    return null;
  }
}

/**
 * 無料版（Minimal）用: Gemini 3 Flash で「心理の罠＋1アクション」を 1–2 文で返す
 */
async function generateMinimalGeminiInsight(trapScore, sentimentData, lang) {
  if (!genAI || !GEMINI_API_KEY) return null;
  const sentiment = sentimentData?.sentiment ?? "Unknown";
  const score = trapScore != null ? Number(trapScore) : null;

  const prompt = `You are a psychological coach for crypto traders. In 1–2 sentences total: (1) name the psychological trap of the day (e.g. FOMO, fear of missing the dip), (2) one concrete action (e.g. "Wait for Trap Score to confirm"). Max 50 words. English only. Sentiment: ${sentiment}. Trap Score: ${score ?? "N/A"}.`;

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { temperature: 0.5, maxOutputTokens: 150 },
    });
    const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
    const text = result?.response?.text?.();
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch (e) {
    console.warn("[Gemini] generateMinimalGeminiInsight failed:", e?.message || e);
    return null;
  }
}

/**
 * 緊急配信用: Grok 4.1 で「今なぜ危険か」を1文で返す（面白く・刺さる）
 */
async function generateEmergencyGrokOneLiner(trap, trapDetection, inflow, mpi, priceUsd, change24h, lang) {
  if (!grokClient || !XAI_API_KEY) return null;
  const trapScore = trapDetection?.trapScore ?? (trap?.confidence === "HIGH" ? 80 : 50);
  const trapLabel = trap?.label || trapDetection?.trapType || "Whale trap";

  const systemPrompt = `You are "Dr. Grok" in trap-alert mode. Output exactly ONE punchy sentence (max 25 words) explaining why THIS moment is dangerous for traders. Be specific (netflow/MPI/price), no fluff. Tone: urgent but not hysterical. English only. No buy/sell advice.`;

  const userContent = `Trap: ${trapLabel}. Trap Score: ${trapScore}. Netflow: ${inflow?.toFixed?.(0) ?? inflow} BTC. MPI: ${mpi != null ? mpi : "N/A"}. Price 24h: ${change24h != null ? change24h.toFixed(2) + "%" : "N/A"}. One sentence only.`;

  try {
    const completion = await grokClient.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: 80,
      temperature: 0.5,
    });
    const text = completion?.choices?.[0]?.message?.content?.trim();
    return typeof text === "string" && text.length > 0 ? text : null;
  } catch (e) {
    console.warn("[Grok] generateEmergencyGrokOneLiner failed:", e?.message || e);
    return null;
  }
}

/**
 * 緊急配信用: Gemini 3 Flash で「心理の罠＋今やる1こと」を1文で返す（刺さる）
 */
async function generateEmergencyGeminiOneLiner(trapScore, trapType, sentiment, lang) {
  if (!genAI || !GEMINI_API_KEY) return null;

  const prompt = `You are a psychological coach for crypto traders. Emergency alert context: Trap Score ${trapScore ?? "N/A"}, type ${trapType || "trap"}, sentiment ${sentiment || "Unknown"}. Output exactly ONE short sentence (max 20 words): name the psychological trap right now (e.g. "FOMO to chase" or "panic to sell") + one action (e.g. "Stay on sidelines"). English only. Punchy.`;

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { temperature: 0.5, maxOutputTokens: 80 },
    });
    const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
    const text = result?.response?.text?.();
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch (e) {
    console.warn("[Gemini] generateEmergencyGeminiOneLiner failed:", e?.message || e);
    return null;
  }
}

module.exports = {
  generateSoSoValueArticle,
  generateGrokReasoning,
  generateMinimalGrokReasoning,
  generateMinimalGeminiInsight,
  generateEmergencyGrokOneLiner,
  generateEmergencyGeminiOneLiner,
};
