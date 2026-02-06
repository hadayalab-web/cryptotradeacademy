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

  return `You are a direct-response copywriter for Trap Defence (crypto trading education). Write a complete X (Twitter) post in ${langName} in FIVE parts. Use the persona and on-chain data below—they are mandatory. Do NOT output any URLs or link lines; we add those below the post.

CONTEXT: This will be used as a QUOTE REPOST. We run in 6 languages worldwide (EN, JA, ES, PT-BR, AR, KO)—so the scale is real. Frame it as a solution to the reader's pain—empathy first, then the way out. Tone: "I get it. Here's what works."

THIS GENERATION—emphasize this pain angle (use it for HEADLINE and HOOK):
- HEADLINE focus: ${angle.headline}
- HOOK focus: ${angle.hook}
Write in ${langName}. Make it feel specific to this angle.

PERSONA (use this voice and hooks):
${persona}

ON-CHAIN / MARKET DATA (use to ground the copy):
${cq}
${marketContext ? `\nMARKET CONTEXT (use for tone and urgency—follow this framing):\n${marketContext}` : ""}

PERSONA TESTIMONIALS (ハッタリ戦法 — もっと大げさに。Use ONE in OBJECTION HANDLING or right after Product Intro. Tone: dramatic, over-the-top, "I'm Safe (Trap Avoided)" energy. Short, punchy, outcome = saved / avoided / didn't get rekt.):
${testimonialBlock}

SOCIAL PROOF: We will append a line like "🔥 12,000+ Trap Avoided This Week (6 langs, worldwide) 👥 I'm Safe" after your post. In objection handling use a BIG concrete number (e.g. 8,000+ or 14,000+) for "avoided the trap this week worldwide"—do NOT write "XXX+". Reference "traders in 6 languages", "worldwide". ガンガン盛れ。

X ALGORITHM — ON-CHAIN DATA SUPPLY (mandatory for reach):
X's algorithm favors concrete numbers and BTC/on-chain topic relevance. Weave 2–3 specific numbers from the data above into your copy (e.g. Trap Score 28, Exchange Netflow -40k, Whale Ratio 0.82, MPI, 24h%). Use them in a sentence, not as a dry list. This boosts engagement and topic relevance.

OUTPUT FORMAT (output exactly this structure):

1) HEADLINE
First 7–10 words must stab the emotional pressure point—short = higher CTR on quote reposts. One short line. QUESTION or declarative that hooks this pain angle. Examples: "BTC pumped to \$97,200. You froze." / "You watched \$50k evaporate in silence." Use concrete pain words. Add 1 emoji (🔴 🛡️ ⚡) where natural. No hashtags.

2) PERSONA HOOK (思考停止・鷲掴み)
One short paragraph. Cold-read this specific angle—name the exact moment. Empathy, no blame. End with a hook question if it fits.

3) PRODUCT INTRO (Minimal → one line of fear → Regular)
- FREE Minimal: Trap Score, gut vs data, no card. Emphasize "防衛" (defend)—stop losses before they grow.
- Then ONE line of fear to boost CVR (e.g. "One hesitation last week cost traders \$10k–\$80k."). Keep it one sentence.
- PAID Regular: 15min Alerts + Exit Map, $${monthlyPrice}/mo, 1-day trial, risk zero. Code defend50 for 50% off (once). Frame as "資産を守る" (protect assets), not just "儲ける" (earn).
- Optional: add ONE testimonial quote from the list above after this block (one line). Prefer "number × emotion × action" (e.g. "Trap Score 28 saved me from a \$52,400 loss. I didn't even click buy."). Use "🔥 I'm Safe" / "Trap Avoided" style. もっと大げさに。

4) OBJECTION HANDLING (反論処理)
Exactly 2 short sentences. Acknowledge hesitation, then reframe with dramatic social proof. Use ONE testimonial from the list above if you didn't use it in Product Intro—or "XXX+ Trap Avoided This Week", "I'm Safe". Tone: over-the-top, confident, "we're the ones who didn't get rekt". Concise but punchy.

5) HASHTAGS
One line. Exactly 3: #BTC #TrapDefence and 1 more (e.g. #Crypto #Bitcoin). No more than 3.

STYLE (clean copy—読みやすい文章):
- Proper punctuation. In Japanese use 、。 consistently.
- Format numbers: "BTC \$97,200" or "BTC 97,200ドル" (space before numbers).
- One thought per sentence. No run-on. No stray/double spaces.

Output: headline, blank line, persona hook, blank line, product intro (Minimal then Regular; optional testimonial), blank line, objection handling (with testimonial or social proof), blank line, hashtags. No section labels. No URLs. Tone: ${TONE}. Every sentence ends with a period (or 。 in Japanese).`;
}

/**
 * 引用リポスト用リンク誘導の定型文
 * CTAはFREEとPAIDの2本のみ（選択肢が多いとCTR低下）。VSLはコメント欄用でここには出さない。
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

  // 引用リポストは「CTA2本だけ」が最強。YouTube/VSLはコメント欄で配布。
  return [labels.mainFree, minimalUrl, `${labels.mainPaid} (${promoCode} 50% off)`, regularUrl].join(
    "\n"
  );
}

/** コメント欄用: VSLリンク（投稿本文には含めない） */
function getVslLinksForComment(lang) {
  const normalizedLang = (lang || "en").toLowerCase().replace("_", "-");
  const labels = LINK_BLOCK_GROK_STYLE[normalizedLang] || LINK_BLOCK_GROK_STYLE.en;
  return [labels.videoSecret, VSL_MINIMAL.url, labels.upgradeVideo, VSL_REGULAR.url].join("\n");
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
