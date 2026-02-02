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
        // 文末が .!?。で終わっていないとき: 長文は最後の文末で切るだけ。短文で文末なしなら破棄
        if (text && !/[\\.!?。]$/.test(text)) {
          const lastEnd = Math.max(
            text.lastIndexOf(". "),
            text.lastIndexOf("."),
            text.lastIndexOf("! "),
            text.lastIndexOf("!"),
            text.lastIndexOf("? "),
            text.lastIndexOf("?"),
            text.lastIndexOf("。 "),
            text.lastIndexOf("。")
          );
          if (lastEnd >= 0) text = text.slice(0, lastEnd + 1);
          else if (text.length < 80) text = ""; // 短文かつ文末なしなら破棄
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
 * reportData（CryptoQuant/市況）からプロンプト用の短い市況文を組み立てる
 */
function buildMarketContext(reportData) {
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
 * ペルソナの深層心理を鷲掴みにするメッセージを生成（gemini-3-flash-preview）
 * CryptoQuant/市況データを渡し、市況を把握した上で「無様なペルソナ」に言及させる。
 * ターゲット: 含み損・思考停止・トレード依存。責めない・共感＋枠組みの提示。
 * @param {Object} options - { lang, reportData }
 * @returns {Promise<string|null>}
 */
async function generatePsychologyHook(options = {}) {
  const lang = (options.lang || "en").toLowerCase().replace("_", "-");
  const langName = LANG_NAMES[lang] || "English";
  const marketContext = buildMarketContext(options.reportData || null);

  const prompt = `You are a copywriter for Trap Defence (crypto trading education). We use CryptoQuant-style data for the Trap Score.

CURRENT MARKET DATA (use this to ground your hook):
${marketContext}

PERSONA (speak to this pathetic state): Traders stuck with unrealized loss, mentally frozen, trade-addicted—the "just watching" loop: can't pull the trigger, can't walk away. Many are in the same hole. The way out is a framework, not more gut calls.

Task: Write exactly 2 or 3 short sentences in ${langName}. Reference the current market or Trap Score where it fits (e.g. "With the score where it is..." or "In this market, sitting in the 'just watching' loop..."). Name the pathetic loop and hint that the way out is a framework. Tone: empathy, no blame. No product names, URLs, or CTAs. Each sentence must end with a period. Output only the 2-3 sentences, nothing else.`;

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

/**
 * テーマを渡してセールスレター本文を1回で生成（簡易フロー用）
 * リンク・ハッシュタグは含めない。下部にCTAを別途設置する想定。
 * @param {Object} options - { lang, theme, reportData }
 * @param {string} options.theme - 例: "drawdown", "whale_accumulation", "trap_score", "fear_greed"
 * @returns {Promise<string|null>}
 */
async function generateSalesLetterFromTheme(options = {}) {
  const lang = (options.lang || "en").toLowerCase().replace("_", "-");
  const langName = LANG_NAMES[lang] || "English";
  const theme = options.theme || "trap_score";
  const marketContext = buildMarketContext(options.reportData || null);

  const prompt = `You are a copywriter for Trap Defence (crypto trading education). We show Trap Score and exit maps.

THEME for this post: ${theme}
MARKET CONTEXT (use where relevant): ${marketContext}

Task: Write a short sales letter body in ${langName}. 2–4 short paragraphs. Hook the reader with the theme (e.g. drawdown pain, whale moves, trap score urgency). Mention that we offer free score and paid briefing; do NOT output URLs, links, hashtags, or promo codes—those go below. Tone: direct, empathetic, no blame. End each sentence with a period. Output only the letter body, nothing else.`;

  const text = await callGeminiForQuoteRepost(prompt, 600);
  if (text && !/[\\.!?]$/.test(text.trim())) {
    const lastEnd = Math.max(
      text.trim().lastIndexOf(". "),
      text.trim().lastIndexOf("."),
      text.trim().lastIndexOf("! "),
      text.trim().lastIndexOf("!"),
      text.trim().lastIndexOf("? "),
      text.trim().lastIndexOf("?")
    );
    if (lastEnd >= 0) return text.trim().slice(0, lastEnd + 1);
  }
  return text;
}

module.exports = {
  generatePsychologyHook,
  generateObjectionHandling,
  generateSalesLetterFromTheme,
  callGeminiForQuoteRepost,
  GEMINI_QUOTE_REPOST_MODEL
};
