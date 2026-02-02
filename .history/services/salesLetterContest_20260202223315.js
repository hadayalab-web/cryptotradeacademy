// services/salesLetterContest.js
// セールスレターを GPT-5-mini / Grok-4-1-fast-reasoning / Gemini-3-flash の3者で生成（同一プロンプト）
// ペルソナ + CQオンチェーン必須。無料版（Minimal Version）と有料版（Regular Briefing）のチラ見せプレゼンさせる。

const { getPersonaPromptContext, TONE } = require("../config/personaStrategy");

const LANG_NAMES = {
  en: "English",
  ja: "Japanese",
  es: "Spanish",
  "pt-br": "Brazilian Portuguese",
  ar: "Arabic",
  ko: "Korean"
};

/** CQオンチェーンデータをプロンプト用1ブロックに */
function buildCqContext(reportData) {
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

/**
 * 共通プロンプト組み立て: ペルソナ + CQ必須。無料版・有料版のチラ見せプレゼンさせる。
 * あなたのプロンプト次第で3者の出来が決まる。
 */
function buildSalesLetterPrompt({ lang, reportData }) {
  const langName = LANG_NAMES[(lang || "en").toLowerCase().replace("_", "-")] || "English";
  const persona = getPersonaPromptContext();
  const cq = buildCqContext(reportData);

  return `You are a direct-response copywriter for Trap Defence (crypto trading education). Write a short sales letter in ${langName} that PRESENTS and TEASES two products. Use the persona and on-chain data below—they are mandatory.

PERSONA (use this voice and hooks):
${persona}

ON-CHAIN / MARKET DATA (use to ground the copy; reference Trap Score or market where it fits):
${cq}

PRODUCTS TO PRESENT (teaser style—hint at value, create desire; do not output URLs):

1) FREE: Minimal Version
- Free Trap Score; "gut vs data" frame; no card signup. Tease: what they see, why it matters, what they’re missing if they don’t try.

2) PAID: Regular Briefing
- 15min Alerts + Exit Map; $99/mo, 1-day trial, risk zero. Tease: what serious traders get, why real-time intel beats gut, code DEFEND50 for 50% off (mention once).

RULES:
- Output ONLY the sales letter body. No URLs, no hashtags (we add links below).
- Write exactly 3–5 short paragraphs. Do NOT stop after one sentence. Paragraph 1: hook (persona + market). 2: tease Minimal. 3: tease Regular. 4–5: soft close.
- Tone: ${TONE}
- Every sentence must end with a period (or 。 in Japanese).`;
}

/**
 * GPT-5-mini-2025-08-07 でセールスレター本文を1本生成
 */
async function generateWithGpt({ lang, prompt }) {
  try {
    const { generateSalesLetterBody } = require("./gpt/client");
    return await generateSalesLetterBody({ prompt });
  } catch (err) {
    console.error("[SalesLetterContest] GPT failed:", err.message);
    return null;
  }
}

/**
 * Grok-4-1-fast-reasoning でセールスレター本文を1本生成
 */
async function generateWithGrok({ lang, prompt }) {
  try {
    const { generateChatCompletion } = require("./grok/client");
    const model = process.env.GROK_MODEL_SALES_LETTER || "grok-4-1-fast-reasoning";
    return await generateChatCompletion({
      model,
      messages: [
        {
          role: "system",
          content:
            "You write short sales letters. Output only the requested text, no meta or explanations."
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 800,
      temperature: 0.8
    });
  } catch (err) {
    console.error("[SalesLetterContest] Grok failed:", err.message);
    return null;
  }
}

/**
 * Gemini-3-flash-preview でセールスレター本文を1本生成
 */
async function generateWithGemini({ lang, prompt }) {
  const { callGeminiForQuoteRepost } = require("./gemini/quoteRepostCopy");
  // Gemini は1文で止まりがちなので、末尾に段落数の指示を追加
  const geminiPrompt =
    prompt +
    "\n\n[Critical] You MUST output 3–5 complete paragraphs. Do not stop after one sentence. Write the full sales letter.";
  try {
    const text = await callGeminiForQuoteRepost(geminiPrompt, 800);
    return text || null;
  } catch (err) {
    console.error("[SalesLetterContest] Gemini failed:", err.message);
    return null;
  }
}

/**
 * 3者でセールスレターを生成。同一プロンプト（ペルソナ + CQ必須、無料/有料チラ見せ）。
 * @param {Object} options - { lang, reportData }
 * @returns {Promise<{ prompt: string, gpt: string|null, grok: string|null, gemini: string|null }>}
 */
async function runSalesLetterContest(options = {}) {
  const lang = (options.lang || "en").toLowerCase().replace("_", "-");
  const reportData = options.reportData || null;
  const prompt = buildSalesLetterPrompt({ lang, reportData });

  const [gpt, grok, gemini] = await Promise.all([
    generateWithGpt({ lang, prompt }),
    generateWithGrok({ lang, prompt }),
    generateWithGemini({ lang, prompt })
  ]);

  return { prompt, gpt, grok, gemini };
}

module.exports = {
  buildSalesLetterPrompt,
  buildCqContext,
  runSalesLetterContest,
  generateWithGpt,
  generateWithGrok,
  generateWithGemini
};
