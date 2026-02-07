// services/salesLetterContest.js
// Grok セールスレター（引用リポスト用）。Grok-4-1-fast-reasoning で生成。ペルソナ + CQオンチェーン必須。

const {
  getPersonaPromptContext,
  getMonthlyPriceForLang,
  TONE
} = require("../config/personaStrategy");
const {
  isDrawdown,
  isSupportTest70k,
  INTEGRATED_STRATEGY_FOR_PROMPT,
  SUPPORT_70K_PROMPT
} = require("../config/drawdownStrategy");
const { getTestimonialsForPrompt } = require("../config/personaTestimonials");
const vslLinks = require("../config/vslLinks");
const VSL_MINIMAL =
  vslLinks.VSL_MINIMAL || {
    url: "https://youtu.be/OqvqngJOiXc",
    titleEn: "Stop Being the Prey — Free Trap Score | Trap Defence BTC"
  };
const VSL_REGULAR =
  vslLinks.VSL_REGULAR || {
    url: "https://youtu.be/fXgVsKhqDjI",
    titleEn: "Upgrade Trap Defence: 50% Off — Code DEFEND50 | Next 50 Only"
  };
const {
  getMinimalVersionCheckoutUrl,
  getRegularWhopLinkOnly
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

/** 市況に応じた追加プロンプト（ドローダウン or 70k支持線テスト時のみ） */
function getMarketContextForPrompt(reportData) {
  if (!reportData) return "";
  if (isDrawdown(reportData)) return INTEGRATED_STRATEGY_FOR_PROMPT;
  if (isSupportTest70k(reportData)) return SUPPORT_70K_PROMPT;
  return "";
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
 * 痛みパターン（HEADLINE/HOOKの変異用）
 * ローテーションで感覚順応を防ぎ、毎回違う角度で刺さる
 */
const PAIN_ANGLES = [
  {
    id: "loss_loop",
    headline: "loss loop / 損失ループ（毎回同じパターンで損）",
    hook: "stuck in the same loss pattern, repeating the mistake"
  },
  {
    id: "opportunity_missed",
    headline: "opportunity missed / 機会逃し（動けなかった好機）",
    hook: "the moment you couldn't pull the trigger, the move you watched pass"
  },
  {
    id: "fear_of_cutting",
    headline: "fear of cutting / 損切り恐怖（切れない・伸ばせない）",
    hook: "can't cut the loss, can't let it run—paralyzed between both"
  },
  {
    id: "cant_walk_away",
    headline: "can't walk away / 離れられない（相場から抜け出せない）",
    hook: "stuck watching the chart, unable to leave even when you know you should"
  },
  {
    id: "woke_up_gains_gone",
    headline: "woke up gains gone / 朝起きたら含み益消失",
    hook: "woke up to find your gains gone—that sinking feeling"
  }
];

function getPainAngleForSeed(seed) {
  const idx = Math.abs(seed) % PAIN_ANGLES.length;
  return PAIN_ANGLES[idx];
}

/**
 * Grok専用: ヘッドライン → 思考停止ペルソナ鷲掴み → Minimal/Regular紹介 → 反論処理 → ハッシュタグ
 * リンク誘導は含めない（下に定型で付与）
 * 最適化: Grok/Gemini分析を踏まえ、変異・心理トリガー・引用トーンを強化
 */
function buildGrokOnlyPrompt({ lang, reportData, painAngleSeed }) {
  const normalizedLang = (lang || "en").toLowerCase().replace("_", "-");
  const langName = LANG_NAMES[normalizedLang] || "English";
  const persona = getPersonaPromptContext(normalizedLang);
  const cq = buildCqContext(reportData);
  const monthlyPrice = getMonthlyPriceForLang(normalizedLang);
  const angle = painAngleSeed != null ? getPainAngleForSeed(painAngleSeed) : PAIN_ANGLES[0];
  const marketContext = getMarketContextForPrompt(reportData);
  const testimonials = getTestimonialsForPrompt(normalizedLang, painAngleSeed);
  const testimonialBlock =
    testimonials.length > 0
      ? testimonials.map((t) => `- "${t}"`).join("\n")
      : "- (use a short outcome-focused quote in the persona voice)";

  const isAsia = ["ja", "ko"].includes(normalizedLang);
  const langNote = isAsia
    ? "JA/KO: Avoid 'rekt'—use local equivalent (e.g. 'would've been crushed', 'account wiped'). Avoid 'gut punch'—use 'sick feeling' or similar. Use 'Be safe with us' for CTA-closing energy."
    : "EN/ES/PT-BR/AR: 'rekt' and 'gut punch' OK. Non-Asia: 'Join us' for CTA-closing.";

  return `You are a direct-response copywriter for Trap Defence (crypto trading education). Write a complete X (Twitter) post in ${langName}. Do NOT output any URLs or link lines; we add those below the post.

6-LANGUAGE QUOTE REPOST TEMPLATE (structure identical in all languages—X algorithm learns faster):

RULES:
- Short paragraphs. Fact over emotion. No hype, no \$10k–\$80k loss figures.
- Freeze → Data → Pattern. Same structure in ${langName}.
- Hashtags: exactly 3. Links: we add 2 VSLs + 2 CTAs below.

CONTEXT: QUOTE REPOST, 6 languages (EN, JA, ES, PT-BR, AR, KO). Trap Defence = distribution before dump; Score = defense.
6-LANGUAGE NOTE: ${langNote}

PERSONA: ${persona}
ON-CHAIN DATA: ${cq}
${marketContext ? `\nMARKET CONTEXT:\n${marketContext}` : ""}
TESTIMONIALS (optional, use ONE only if you add a single short line): ${testimonialBlock}

OUTPUT FORMAT (4 blocks + hashtags—match this structure in ${langName}):

1) HEADLINE
"Trap Score X/100 is the pattern you already know." (Use actual Trap Score from data. No emoji in headline.)

2) FREEZE (2–3 short sentences)
That moment when BTC slips, the screen turns red, and hesitation hits. Everyone has lived that loop. Write in ${langName}. No dollar amounts.

3) DATA BLOCK
"X/100 + Whale Ratio Y + negative netflow" then line break. "A classic distribution setup. Not instinct — data." Use actual numbers from ON-CHAIN DATA.

4) REGULAR OFFER (1–2 short sentences)
"Regular gives you 15‑min alerts + Exit Map. Use DEFEND50 for reduced access." (Or equivalent in ${langName}. No price in body.)

5) HASHTAGS
Exactly 3, one line: #BTC #TrapDefence #TrapScore

STYLE: Short sentences. Same structure in every language. Ad-safe. No section labels. No URLs.

Output: (1) headline, blank line, (2) freeze, blank line, (3) data block, blank line, (4) Regular offer, blank line, (5) hashtags.`;
}

/**
 * 6言語引用リポスト最適化テンプレ（完全統一構造）
 * 短い段落 / Freeze→Data→Pattern / VSL下部2本 / CTA2本のみ / ハッシュタグ3つ
 */
const LINK_BLOCK_GROK_STYLE = {
  en: {
    mainFree: "👇 Free defense (no card)",
    mainPaid: "▼ Upgrade — DEFEND50",
    vslMinimal: "▶ Minimal VSL",
    vslUpgrade: "▶ Full Protocol VSL"
  },
  ja: {
    mainFree: "👇 無料ディフェンス（カード不要）",
    mainPaid: "▼ アップグレード — DEFEND50",
    vslMinimal: "▶ ミニマル版VSL",
    vslUpgrade: "▶ フルプロトコルVSL"
  },
  ko: {
    mainFree: "👇 무료 디펜스",
    mainPaid: "▼ 업그레이드 — DEFEND50",
    vslMinimal: "▶ 미니멀 VSL",
    vslUpgrade: "▶ 풀 프로토콜 VSL"
  },
  es: {
    mainFree: "👇 Defensa gratis",
    mainPaid: "▼ Actualizar — DEFEND50",
    vslMinimal: "▶ VSL Minimal",
    vslUpgrade: "▶ VSL Full Protocol"
  },
  "pt-br": {
    mainFree: "👇 Defesa gratuita",
    mainPaid: "▼ Upgrade — DEFEND50",
    vslMinimal: "▶ VSL Minimal",
    vslUpgrade: "▶ VSL Full Protocol"
  },
  ar: {
    mainFree: "👇 دفاع مجاني",
    mainPaid: "▼ ترقية — DEFEND50",
    vslMinimal: "▶ فيديو النسخة المصغرة",
    vslUpgrade: "▶ فيديو البروتوكول الكامل"
  }
};

/** 区切り線（VSLとCTAを視覚分離） */
const LINK_SEPARATOR = "─────";

function getLinkBlockGrokStyle(lang, options = {}) {
  const normalizedLang = (lang || "en").toLowerCase().replace("_", "-");
  const labels = LINK_BLOCK_GROK_STYLE[normalizedLang] || LINK_BLOCK_GROK_STYLE.en;
  const minimalUrl =
    getMinimalVersionCheckoutUrl(normalizedLang, {
      utm_content: options.influencerUsername
        ? `influencer_${options.influencerUsername}`
        : "grok_sales"
    }) || getMinimalVersionCheckoutUrl("en", options);
  const regularUrl = getRegularWhopLinkOnly(normalizedLang);

  const vslBlock = [
    labels.vslMinimal,
    VSL_MINIMAL.url,
    labels.vslUpgrade,
    VSL_REGULAR.url
  ].join("\n");

  const ctaBlock = [labels.mainFree, minimalUrl, labels.mainPaid, regularUrl].join("\n");

  return [vslBlock, LINK_SEPARATOR, ctaBlock].join("\n\n");
}

/** コメント欄用: VSLリンク（投稿本文にVSLを含める場合は getLinkBlockGrokStyle を使用） */
function getVslLinksForComment(lang) {
  const normalizedLang = (lang || "en").toLowerCase().replace("_", "-");
  const labels = LINK_BLOCK_GROK_STYLE[normalizedLang] || LINK_BLOCK_GROK_STYLE.en;
  return [labels.vslMinimal, VSL_MINIMAL.url, labels.vslUpgrade, VSL_REGULAR.url].join("\n");
}

/** 簡易ハッシュ（username→seed用） */
function simpleHash(str) {
  if (!str || typeof str !== "string") return 0;
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return h >>> 0;
}

/**
 * Grok-4-1-fast-reasoning のみでセールスレター生成（ヘッドライン → 鷲掴み → 紹介 → 反論 → ハッシュタグ）
 * painAngleSeed: 痛みパターンローテーション用。未指定時は influencerUsername のハッシュを使用
 */
async function runGrokOnlySalesLetter(options = {}) {
  const lang = (options.lang || "en").toLowerCase().replace("_", "-");
  const reportData = options.reportData || null;
  const painAngleSeed =
    options.painAngleSeed != null
      ? options.painAngleSeed
      : simpleHash(options.influencerUsername || "") + Date.now();
  const prompt = buildGrokOnlyPrompt({ lang, reportData, painAngleSeed });
  const text = await generateWithGrok({ lang, prompt });
  const linkBlock = getLinkBlockGrokStyle(lang, options);
  const fullText = text ? `${text}\n\n${linkBlock}` : null;
  return { prompt, text, fullText, linkBlock };
}

/** 1言語あたりの変異数（痛みパターンローテーション） */
const VARIANTS_PER_LANG = 3;

/**
 * 6言語分を1バッチで事前生成（投稿時はキャッシュから取得→XAI破綻を防ぐ）
 * 各言語で3変異を生成し、投稿時にランダム選択して感覚順応を防ぐ
 * @param {Object} options - { reportData, influencerUsername, delayMs }
 * @returns {Promise<Record<string, { fullText: string|null, texts: string[], linkBlock: string }>>}
 */
async function runGrokOnlySalesLetterAllLangs(options = {}) {
  const reportData = options.reportData || null;
  const influencerUsername = options.influencerUsername || null;
  const delayMs = options.delayMs ?? 2000;

  const out = {};
  for (const lang of SALES_LETTER_LANGS) {
    const texts = [];
    for (let seed = 0; seed < VARIANTS_PER_LANG; seed++) {
      const result = await runGrokOnlySalesLetter({
        lang,
        reportData,
        influencerUsername,
        painAngleSeed: seed
      });
      if (result.text) texts.push(result.text);
      if (
        delayMs > 0 &&
        (seed < VARIANTS_PER_LANG - 1 || lang !== SALES_LETTER_LANGS[SALES_LETTER_LANGS.length - 1])
      ) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    const linkBlock = getLinkBlockGrokStyle(lang, { influencerUsername });
    const primaryText = texts[0] || null;
    out[lang] = {
      fullText: primaryText ? `${primaryText}\n\n${linkBlock}` : null,
      texts,
      linkBlock
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
    const texts = results[lang]?.texts;
    const text = results[lang]?.text;
    const toSave = Array.isArray(texts) && texts.length > 0 ? texts : text ? [text] : null;
    if (toSave) {
      await kv.set(`${SALES_LETTER_GROK_CACHE_PREFIX}${lang}`, JSON.stringify(toSave), {
        ex: ttlSeconds
      });
    }
  }
}

/**
 * キャッシュから言語別セールスレター本文（Grok部分のみ）を取得。未設定なら null。
 * 複数変異がある場合はランダムに1つ返す（感覚順応防止）。
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
  const raw = await kv.get(`${SALES_LETTER_GROK_CACHE_PREFIX}${normalized}`);
  if (!raw) return null;
  if (typeof raw === "string" && raw.startsWith("[")) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) {
        return arr[Math.floor(Math.random() * arr.length)];
      }
    } catch {
      return raw;
    }
  }
  return typeof raw === "string" ? raw : null;
}

module.exports = {
  SALES_LETTER_LANGS,
  buildGrokOnlyPrompt,
  buildCqContext,
  getLinkBlockGrokStyle,
  getVslLinksForComment,
  runGrokOnlySalesLetter,
  runGrokOnlySalesLetterAllLangs,
  saveSalesLetterGrokCache,
  getSalesLetterGrokFromCache,
  SALES_LETTER_GROK_CACHE_PREFIX,
  generateWithGrok
};
