// services/gemini/quoteRepostCopy.js
// 引用リポスト用: ペルソナの深層心理フック・反論処理メッセージを gemini-3-flash-preview で生成

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_QUOTE_REPOST_MODEL = process.env.GEMINI_QUOTE_REPOST_MODEL || "gemini-3-flash-preview";

const SUPPORTED_LANGS = ["en", "es", "pt-br", "ar", "ja", "ko"];

function getApiUrl() {
  const model = GEMINI_QUOTE_REPOST_MODEL;
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

/**
 * Gemini API を呼び出してテキストを1段落で生成（短め・タイムアウト対策）
 * @param {string} prompt
 * @param {number} maxTokens
 * @returns {Promise<string|null>}
 */
async function callGeminiForQuoteRepost(prompt, maxTokens = 256) {
  try {
    if (!GEMINI_API_KEY) {
      console.warn("[Gemini QuoteRepostCopy] GEMINI_API_KEY not set");
      return null;
    }

    const response = await fetch(`${getApiUrl()}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: maxTokens
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.content && candidate.content.parts) {
        const text = candidate.content.parts.map((part) => part.text).join("");
        return text.trim();
      }
    }
    return null;
  } catch (error) {
    console.error("[Gemini QuoteRepostCopy] API call failed:", error.message);
    return null;
  }
}

/** 言語名（プロンプト用） */
const LANG_NAMES = {
  en: "English",
  ja: "Japanese",
  es: "Spanish",
  "pt-br": "Brazilian Portuguese",
  ar: "Arabic",
  ko: "Korean"
};

/**
 * ペルソナの深層心理を鷲掴みにするメッセージを1段落で生成（gemini-3-flash-preview）
 * ターゲット: 含み損・思考停止・トレード依存の自覚がある層。責めない・共感＋枠組みの提示。
 * @param {Object} options - { lang, trapScore, marketContext }
 * @returns {Promise<string|null>}
 */
async function generatePsychologyHook(options = {}) {
  const lang = (options.lang || "en").toLowerCase().replace("_", "-");
  const langName = LANG_NAMES[lang] || "English";
  const trapScore = options.trapScore != null ? options.trapScore : 25;

  const prompt = `You are a copywriter for a crypto trading education product (Trap Defence). The audience is traders with unrealized loss, mentally stuck, often trade-addicted. Tone: 80% empathy, 20% logic. Do not blame. Offer "a framework" as the way out.

Write exactly ONE short paragraph (2-4 sentences, under 120 words) that grabs their deep psychology: name the "just watching" loop, the inability to pull the trigger or walk away, and hint that many are in the same hole and the way out is a framework—not more analysis. Do NOT include product names, URLs, or CTAs.

Output in ${langName} only. No quotes or labels, just the paragraph.`;

  return callGeminiForQuoteRepost(prompt, 200);
}

/**
 * ペルソナの反論処理をするメッセージを1段落で生成（gemini-3-flash-preview）
 * 「高い」「また負ける」「今はいい」などの反論を優しく受け止め、リアルタイムの価値・リスクゼロを匂わせる。
 * @param {Object} options - { lang }
 * @returns {Promise<string|null>}
 */
async function generateObjectionHandling(options = {}) {
  const lang = (options.lang || "en").toLowerCase().replace("_", "-");
  const langName = LANG_NAMES[lang] || "English";

  const prompt = `You are a copywriter for a crypto trading education product (Trap Defence). The audience might think: "It's expensive", "I'll lose again", "Not now". Handle these objections with empathy. Tone: 80% empathy, 20% logic. Mention that this intel only works in real time, or that the line between "tradeable edge" and "pure gamble" depends on having it—without being preachy. One short paragraph (2-4 sentences, under 100 words). No product names, URLs, or promo codes in the paragraph.

Output in ${langName} only. No quotes or labels, just the paragraph.`;

  return callGeminiForQuoteRepost(prompt, 180);
}

module.exports = {
  generatePsychologyHook,
  generateObjectionHandling,
  callGeminiForQuoteRepost,
  GEMINI_QUOTE_REPOST_MODEL
};
