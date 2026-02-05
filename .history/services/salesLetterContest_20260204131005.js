// services/salesLetterContest.js
// セールスレターを GPT-5-mini / Grok-4-1-fast-reasoning / Gemini-3-flash の3者で生成（同一プロンプト）
// ペルソナ + CQオンチェーン必須。無料版（Minimal Version）と有料版（Regular Briefing）のチラ見せプレゼンさせる。

const {
  getPersonaPromptContext,
  getMonthlyPriceForLang,
  TONE
} = require("../config/personaStrategy");
const { VSL_MINIMAL, VSL_REGULAR } = require("../config/vslLinks");
const {
  getMinimalVersionCheckoutUrl,
  getRegularWhopLinkOnly,
  getPromoCode
} = require("../services/telegram/whop-links");

const LANG_NAMES = {
  en: "English",
  ja: "Japanese",
  es: "Spanish",
  "pt-br": "Brazilian Portuguese",
  ar: "Arabic",
  ko: "Korean"
};

/** セールスレター対応言語（6つ・リンクが言語別のため） */
const SALES_LETTER_LANGS = ["en", "ja", "es", "pt-br", "ar", "ko"];

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
  const normalizedLang = (lang || "en").toLowerCase().replace("_", "-");
  const langName = LANG_NAMES[normalizedLang] || "English";
  const persona = getPersonaPromptContext(normalizedLang);
  const cq = buildCqContext(reportData);
  const monthlyPrice = getMonthlyPriceForLang(normalizedLang);

  return `You are a direct-response copywriter for Trap Defence (crypto trading education). Write a short sales letter in ${langName} that PRESENTS and TEASES two products. Use the persona and on-chain data below—they are mandatory.

PERSONA (use this voice and hooks):
${persona}

ON-CHAIN / MARKET DATA (use to ground the copy; reference Trap Score or market where it fits):
${cq}

PRODUCTS TO PRESENT (teaser style—hint at value, create desire; do not output URLs):

1) FREE: Minimal Version
- Free Trap Score; "gut vs data" frame; no card signup. Tease: what they see, why it matters, what they’re missing if they don’t try.

2) PAID: Regular Briefing
- 15min Alerts + Exit Map; $${monthlyPrice}/mo, 1-day trial, risk zero. Tease: what serious traders get, why real-time intel beats gut, code defend50 for 50% off (mention once).

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

/**
 * Grok専用: ヘッドライン → 思考停止ペルソナ鷲掴み → Minimal/Regular紹介 → 反論処理 → ハッシュタグ
 * リンク誘導は含めない（下に定型で付与）
 * 最適化: Grok/Gemini分析を踏まえ、変異・心理トリガー・引用トーンを強化
 */
function buildGrokOnlyPrompt({ lang, reportData }) {
  const normalizedLang = (lang || "en").toLowerCase().replace("_", "-");
  const langName = LANG_NAMES[normalizedLang] || "English";
  const persona = getPersonaPromptContext(normalizedLang);
  const cq = buildCqContext(reportData);
  const monthlyPrice = getMonthlyPriceForLang(normalizedLang);

  return `You are a direct-response copywriter for Trap Defence (crypto trading education). Write a complete X (Twitter) post in ${langName} in FIVE parts. Use the persona and on-chain data below—they are mandatory. Do NOT output any URLs or link lines; we add those below the post.

CONTEXT: This will be used as a QUOTE REPOST. Frame it as a solution to the reader's pain—empathy first, then the way out. Tone: "I get it. Here's what works."

PERSONA (use this voice and hooks):
${persona}

ON-CHAIN / MARKET DATA (use to ground the copy):
${cq}

OUTPUT FORMAT (output exactly this structure):

1) HEADLINE
One short line. Prefer a QUESTION that hooks pain or curiosity (e.g. "また利益を吐き出しましたか？" / "Still feeding the market?"). Use concrete pain words (loss, trapped, frozen, drained). Add 1 emoji (🔴 🛡️ ⚡) where natural. No hashtags. VARY expression each time—avoid repetitive phrasing.

2) PERSONA HOOK (思考停止・鷲掴み)
One short paragraph. Use "cold reading"—name the exact moment ("寝て起きたら含み益が消えていた" / "woke up to find gains gone"). Grab the "mentally frozen" persona: stuck watching, unrealized loss, can't pull the trigger. Empathy, no blame. End with a hook question if it fits. VARY the angle—different pain angles each generation.

3) PRODUCT INTRO (Minimal + Regular)
- FREE Minimal: Trap Score, gut vs data, no card. Emphasize "防衛" (defend)—stop losses before they grow.
- PAID Regular: 15min Alerts + Exit Map, $${monthlyPrice}/mo, 1-day trial, risk zero. Code defend50 for 50% off (once). Frame as "資産を守る" (protect assets), not just "儲ける" (earn).

4) OBJECTION HANDLING (反論処理)
Exactly 2 short sentences. Acknowledge hesitation (expensive? lose again? not now?), then reframe with social proof or risk reversal. Concise.

5) HASHTAGS
One line. Exactly 3: #BTC #TrapDefence and 1 more (e.g. #Crypto #Bitcoin). No more than 3.

STYLE (clean copy—読みやすい文章):
- Proper punctuation. In Japanese use 、。 consistently.
- Format numbers: "BTC \$97,200" or "BTC 97,200ドル" (space before numbers).
- One thought per sentence. No run-on. No stray/double spaces.

VARIATION: Each generation must differ in HEADLINE and HOOK phrasing. Rotate pain angles (loss loop / opportunity missed / fear of cutting / can't walk away). Avoid templated repetition.

Output: headline, blank line, persona hook, blank line, product intro (Minimal then Regular), blank line, objection handling, blank line, hashtags. No section labels. No URLs. Tone: ${TONE}. Every sentence ends with a period (or 。 in Japanese).`;
}

/**
 * 引用リポスト用リンク誘導の定型文
 * 視覚的2チャンク: メインCTA2本（無料Minimal→有料Regular）を目立たせ、VSLはサブとして控えめに配置
 */
const LINK_BLOCK_GROK_STYLE = {
  ja: {
    mainFree: "👇 まずは無料で防御力を手に入れる（カード不要）",
    mainPaid: "▼ 本気で資産を守るなら",
    videoSecret: "▼ 無料ビデオ（全体像）",
    upgradeVideo: "▼ 有料版ビデオ"
  },
  en: {
    mainFree: "👇 Get free defense first (no card)",
    mainPaid: "▼ Protect your assets seriously",
    videoSecret: "▼ Free video (full story)",
    upgradeVideo: "▼ Upgrade video"
  },
  es: {
    mainFree: "👇 Empieza gratis (sin tarjeta)",
    mainPaid: "▼ Protege tus activos en serio",
    videoSecret: "▼ Vídeo gratis",
    upgradeVideo: "▼ Vídeo upgrade"
  },
  "pt-br": {
    mainFree: "👇 Comece grátis (sem cartão)",
    mainPaid: "▼ Proteja seus ativos de verdade",
    videoSecret: "▼ Vídeo grátis",
    upgradeVideo: "▼ Vídeo upgrade"
  },
  ar: {
    mainFree: "👇 ابدأ مجاناً (بدون بطاقة)",
    mainPaid: "▼ احمِ أصولك بجدية",
    videoSecret: "▼ فيديو مجاني",
    upgradeVideo: "▼ فيديو الترقية"
  },
  ko: {
    mainFree: "👇 무료로 먼저 시작 (카드 불필요)",
    mainPaid: "▼ 자산 제대로 지키려면",
    videoSecret: "▼ 무료 영상",
    upgradeVideo: "▼ 업그레이드 영상"
  }
};

/** 区切り線（メインCTAとサブ情報を視覚分離） */
const LINK_BLOCK_SEPARATOR = "─────";

function getLinkBlockGrokStyle(lang, options = {}) {
  const normalizedLang = (lang || "en").toLowerCase().replace("_", "-");
  const labels = LINK_BLOCK_GROK_STYLE[normalizedLang] || LINK_BLOCK_GROK_STYLE.en;
  const promoCode = (getPromoCode && getPromoCode() ? getPromoCode() : "defend50").toUpperCase();
  const minimalUrl =
    getMinimalVersionCheckoutUrl(normalizedLang, {
      utm_content: options.influencerUsername
        ? `influencer_${options.influencerUsername}`
        : "grok_sales"
    }) || getMinimalVersionCheckoutUrl("en", options);
  const regularUrl = getRegularWhopLinkOnly(normalizedLang);

  const mainBlock = [
    labels.mainFree,
    minimalUrl,
    `${labels.mainPaid} (${promoCode} 50% off)`,
    regularUrl
  ].join("\n");

  const subBlock = [labels.videoSecret, VSL_MINIMAL.url, labels.upgradeVideo, VSL_REGULAR.url].join(
    "\n"
  );

  return [mainBlock, LINK_BLOCK_SEPARATOR, subBlock].join("\n");
}

/**
 * Grok-4-1-fast-reasoning のみでセールスレター生成（ヘッドライン → 鷲掴み → 紹介 → 反論 → ハッシュタグ）
 * リンク誘導はGrok風定型文を直下に付与
 * @param {Object} options - { lang, reportData, influencerUsername }
 * @returns {Promise<{ prompt: string, text: string|null, fullText: string|null }>}
 */
async function runGrokOnlySalesLetter(options = {}) {
  const lang = (options.lang || "en").toLowerCase().replace("_", "-");
  const reportData = options.reportData || null;
  const prompt = buildGrokOnlyPrompt({ lang, reportData });
  const text = await generateWithGrok({ lang, prompt });
  const linkBlock = getLinkBlockGrokStyle(lang, options);
  const fullText = text ? `${text}\n\n${linkBlock}` : null;
  return { prompt, text, fullText, linkBlock };
}

/**
 * 6言語分を1バッチで事前生成（投稿時はキャッシュから取得→XAI破綻を防ぐ）
 * 各言語でリンクが違うため6つ生成。呼び出し間に delayMs を入れてレート制限を緩和。
 * @param {Object} options - { reportData, influencerUsername, delayMs }
 * @returns {Promise<Record<string, { fullText: string|null, text: string|null, linkBlock: string }>>}
 */
async function runGrokOnlySalesLetterAllLangs(options = {}) {
  const reportData = options.reportData || null;
  const influencerUsername = options.influencerUsername || null;
  const delayMs = options.delayMs ?? 2000; // 連続呼び出しでXAIレート制限を避ける

  const out = {};
  for (const lang of SALES_LETTER_LANGS) {
    const result = await runGrokOnlySalesLetter({
      lang,
      reportData,
      influencerUsername
    });
    out[lang] = {
      fullText: result.fullText,
      text: result.text,
      linkBlock: result.linkBlock
    };
    if (delayMs > 0 && lang !== SALES_LETTER_LANGS[SALES_LETTER_LANGS.length - 1]) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return out;
}

const SALES_LETTER_GROK_CACHE_PREFIX = "sales_letter_grok:";

async function saveSalesLetterGrokCache(results, ttlSeconds = 14400) {
  let kv;
  try {
    const { getKV } = require("../utils/kv");
    kv = getKV();
    if (!kv) return;
  } catch {
    return;
  }
  for (const lang of SALES_LETTER_LANGS) {
    const text = results[lang]?.text;
    if (text) {
      await kv.set(`${SALES_LETTER_GROK_CACHE_PREFIX}${lang}`, text, { ex: ttlSeconds });
    }
  }
}

/**
 * キャッシュから言語別セールスレター本文（Grok部分のみ）を取得。未設定なら null。
 * 投稿時に getLinkBlockGrokStyle(lang, { influencerUsername }) を付与すること。
 */
async function getSalesLetterGrokFromCache(lang) {
  const normalized = (lang || "en").toLowerCase().replace("_", "-");
  if (!SALES_LETTER_LANGS.includes(normalized)) return null;
  let kv;
  try {
    const { getKV } = require("../utils/kv");
    kv = getKV();
    if (!kv) return null;
  } catch {
    return null;
  }
  return (await kv.get(`${SALES_LETTER_GROK_CACHE_PREFIX}${normalized}`)) || null;
}

module.exports = {
  SALES_LETTER_LANGS,
  buildSalesLetterPrompt,
  buildGrokOnlyPrompt,
  buildCqContext,
  getLinkBlockGrokStyle,
  runSalesLetterContest,
  runGrokOnlySalesLetter,
  runGrokOnlySalesLetterAllLangs,
  saveSalesLetterGrokCache,
  getSalesLetterGrokFromCache,
  SALES_LETTER_GROK_CACHE_PREFIX,
  generateWithGpt,
  generateWithGrok,
  generateWithGemini
};
