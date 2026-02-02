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
        let text = candidate.content.parts
          .map((part) => part.text)
          .join("")
          .trim();
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
          else text = ""; // no complete sentence, discard
        }
        return text || null;
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

  const prompt = `You are a copywriter for Trap Defence (crypto trading education). Audience: traders with unrealized loss, mentally stuck. Tone: empathy, no blame. Offer "a framework" as the way out.

Task: Write exactly 2 or 3 short sentences in ${langName}. Sentence 1: name the "just watching" loop and paralysis. Sentence 2: many are in the same hole. Sentence 3 (optional): the way out is a framework. No product names, URLs, or CTAs. Each sentence must end with a period. Output only the 2-3 sentences, nothing else.`;

  return callGeminiForQuoteRepost(prompt, 512);
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

  const prompt = `You are a copywriter for Trap Defence. Audience might think: "expensive", "I'll lose again", "not now". Handle with empathy. Tone: 80% empathy, 20% logic.

Task: Write exactly 2 short sentences in ${langName}. Sentence 1: acknowledge the hesitation. Sentence 2: this intel only works in real time, or the line between edge and gamble depends on having it. No product names, URLs, or promo codes. Each sentence must end with a period. Output only the 2 sentences, nothing else.`;

  return callGeminiForQuoteRepost(prompt, 512);
}

module.exports = {
  generatePsychologyHook,
  generateObjectionHandling,
  callGeminiForQuoteRepost,
  GEMINI_QUOTE_REPOST_MODEL
};
