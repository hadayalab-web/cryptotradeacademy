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
 * Grok × X広告 × Trap Defence 引用リポスト生成エンジン（完全版）
 * Cursor 指示書準拠: Grok文体・広告構造・心理誘導・必須フレーズ・品質ルールを強制。
 * リンク・VSL・Whop・社会的証明はコード側で付与するため、Grok は本文ブロック 1–5 のみ出力。
 */
function buildGrokOnlyPrompt({ lang, reportData, painAngleSeed }) {
  const normalizedLang = (lang || "en").toLowerCase().replace("_", "-");
  const langName = LANG_NAMES[normalizedLang] || "English";
  const persona = getPersonaPromptContext(normalizedLang);
  const cq = buildCqContext(reportData);
  const marketContext = getMarketContextForPrompt(reportData);
  const testimonials = getTestimonialsForPrompt(normalizedLang, painAngleSeed);
  const testimonialBlock =
    testimonials.length > 0
      ? testimonials.map((t) => `- "${t}"`).join("\n")
      : "- (optional: one short outcome-focused line in persona voice)";

  const isAsia = ["ja", "ko"].includes(normalizedLang);
  const langNote = isAsia
    ? "JA/KO: Avoid 'rekt'—use local equivalent. Avoid 'gut punch'—use 'sick feeling' or similar. CTA: 'Be safe with us' energy."
    : "EN/ES/PT-BR/AR: 'Join us' for CTA-closing.";

  const discountCode = "DEFEND50";

  const ES_EQUIVALENTS =
    normalizedLang === "es"
      ? `
## Spanish (es) — use these equivalents (same structure, same punch)
- Opener: "Trap Score X/100 — el número que dice que la estabilidad es un disfraz." or "expone la estabilidad como disfraz"
- Block 2: "Atrapado en el bucle de 'solo mirar', esperando una confirmación que nunca llega." (never leave the loop line alone)
- Block 3: "El mercado observa tu duda." (use "duda" not "hesitación" — more natural and ad-effective in Spanish). Then data: "X/100 + Whale Ratio Y + flujo negativo — la firma de distribución que solo ves después de la caída." or "que solo reconoces tarde." (short, sharp; avoid long "visible solo en retrospectiva")
- Block 4: "Regular. Alertas cada 15 min. Exit Map. DEFEND50 te da acceso. Decide antes de que el mercado decida por ti." (use "cada" for natural rhythm)
- Mandatory in ES: "No intuición — datos." / "el mercado observa tu duda" / "decide antes de que el mercado decida por ti"`
      : "";

  const PT_BR_EQUIVALENTS =
    normalizedLang === "pt-br"
      ? `
## Portuguese (pt-br) — use these equivalents (same structure, same punch)
- Opener: "Trap Score X/100 — o número que diz que a estabilidade é um disfarce." or "expõe a estabilidade como disfarce"
- Block 2: "Preso no loop de 'só assistir', esperando uma confirmação que nunca vem." (never leave the loop line alone)
- Block 3: "O mercado observa sua dúvida." (use "dúvida" — natural and ad-effective in PT-BR). Then data: "X/100 + Whale Ratio Y + fluxo negativo — a assinatura de distribuição que você só reconhece depois da queda." or "visível apenas depois da queda." (short, sharp; avoid long "visível só em retrospecto")
- Block 4: "Regular. Alertas a cada 15 min. + Exit Map. DEFEND50 te dá acesso. Decida antes que o mercado decida por você." (use "+" before Exit Map for ad rhythm)
- Mandatory in PT-BR: "Não intuição — dados." / "o mercado observa sua dúvida" / "decida antes que o mercado decida por você"`
      : "";

  const AR_EQUIVALENTS =
    normalizedLang === "ar"
      ? `
## Arabic (ar) — use these equivalents (same structure, same punch). Output in Arabic script (RTL).
- Opener: "Trap Score X/100 — الرقم الذي يكشف أن الاستقرار مجرد قناع." or "الرقم الذي يكشف أن الاستقرار تمويه." (short, cold, sharp — avoid literary "الاستقرار قناعًا")
- Block 2: "حبيس حلقة «المشاهدة فقط»، بانتظار تأكيد لا يأتي أبدًا." (never leave the loop line alone)
- Block 3: "السوق يراقب ترددك." Then data: "X/100 + Whale Ratio Y + تدفق سلبي — توقيع التوزيع الذي لا تلاحظه إلا بعد الهبوط." or "الذي لا يظهر إلا بعد الهبوط. ليست حدسًا — بيانات." (short, sharp; avoid long "الذي لا يُرى إلا بعد الهبوط")
- Block 4: "ريجولار. تنبيهات كل 15 دقيقة. + Exit Map. DEFEND50 يفتح لك الباب. قرر قبل أن يقرر السوق عنك." (use "+" before Exit Map for ad rhythm)
- Mandatory in AR: "ليست حدسًا — بيانات." / "السوق يراقب ترددك" / "قرر قبل أن يقرر السوق عنك"`
      : "";

  const KO_EQUIVALENTS =
    normalizedLang === "ko"
      ? `
## Korean (ko) — use these equivalents (same structure, same punch). JA/KO: avoid "rekt"; use calm, sharp tone.
- Opener: Use contrast that works in KO ads. Prefer "트랩 스코어 X/100 — '안정'이 사실은 위장된 분배라는 신호." or "안정처럼 보이지만 분배를 숨기는 숫자." (avoid stiff "안정이 분배를 위장한 숫자"; "보이지만 / 사실은" contrast is punchy)
- Block 2: Avoid mechanical "루프에 갇혀". Prefer "'그냥 보기'만 반복하며, 오지 않을 확인만 기다리는 사이." or "'지켜보기'만 하며 멈춰 있는 사이" — "반복 / 멈춤 / 지켜보기" punch.
- Block 3: "시장은 당신의 망설임을 지켜본다." Then data: "X/100 + Whale Ratio Y + 순유입 마이너스 — 항상 뒤늦게만 보이는 분배 신호." or "하락하고 나서야 보이는 분배 신호. 직감이 아니다 — 데이터." (short, sharp; "항상 뒤늦게만" is ad-punchy)
- Block 4: "레귤러. 15분 알림. + Exit Map. DEFEND50으로 진입하세요. 시장이 결정하기 전에 당신이 결정하라." (use "진입하세요" or "바로 접근 가능" — more action than "시작하세요")
- Mandatory in KO: "직감이 아니다 — 데이터." / "시장은 당신의 망설임을 지켜본다" / "시장이 결정하기 전에 당신이 결정하라"`
      : "";

  const JA_EQUIVALENTS =
    normalizedLang === "ja"
      ? `
## Japanese (ja) — use these equivalents (same structure, same punch). JA/KO: avoid "rekt"; use calm, sharp tone.
- Opener: Avoid explanatory "安定を装った分配のサイン". Use contrast. Prefer "トラップスコア X/100 — 「安定」が実は分配の仮面だというサイン." or "安定に見えて実は「分配」を隠す数字." ("見えて / 実は" contrast is punchy in JA ads)
- Block 2: Avoid mechanical "ループに陥り". Prefer "「見てるだけ」を繰り返し、来ない確認を待ち続ける." or "「見てるだけ」のまま固まり、来ない確認を待つ." ("固まる" is psychologically punchy)
- Block 3: "市場はあなたの躊躇を観察している." Then data: "X/100 + Whale Ratio Y + 純流入マイナス — いつも後になって気づく分配サイン." or "下落して初めて見える分配サイン. 直感ではない — データ." (short, sharp; avoid long "下落後しか見えない分配のサイン")
- Block 4: "レギュラー. 15分アラート. + Exit Map. DEFEND50で即アクセス. 市場が決める前にあなたが決めろ." (use "即アクセス" or "アクセス可能" — stronger than "参加")
- Mandatory in JA: "直感ではない — データ." / "市場はあなたの躊躇を観察している" / "市場が決める前にあなたが決めろ"`
      : "";

  const LANG_SPECIFIC =
    ES_EQUIVALENTS || PT_BR_EQUIVALENTS || AR_EQUIVALENTS || KO_EQUIVALENTS || JA_EQUIVALENTS;

  return `## Mission
Generate ONE quote-repost body for X (Twitter) in ${langName}. Grok-style tone. X Ads structure. Data-driven persuasion. Trap Defence brand. Output ONLY the tweet body (blocks 1–5). No URLs, no explanations, no markdown. We add VSL/Whop/social proof below.

## Tone Rules (MANDATORY)
- Calm, factual, slightly sarcastic. No hype. No exclamation marks.
- Short, sharp sentences. "Data > emotion" framing.
- Use contrast: hesitation vs. data. Use inversion: "the market observes you."
- Grok-style understatement. Never motivational. Never emotional.
- No emojis in the body (social proof line is added by us).
Examples of tone: "The number that says what people don't want to admit." / "Still observing the market while the market observes your hesitation." / "Not intuition. Not vibes. Data." / "Predictable behavior. Predictable outcome."
Language note: ${langNote}

## X Ads Structure (EXACT ORDER — output only blocks 1–5)

Golden rule: number → meaning → psychological implication. Never "explain"; make the reader's brain stop, then read, then act.

1. Red-flag opener (1–2 lines)
   - Golden rule: number → meaning → implication (心理的暗示). The opener must stop the reader's brain and make them think "what does that mean?" then read on.
   - Pattern: "Trap Score X/100 — the number that says \"[short implication].\"" or "the number that exposes [X] as [Y]." Use a short, punchy implication — not a long explanation. Prefer: "stability is a disguise", "stability pretending to be safety", "stability masking distribution". Avoid long phrases like "distribution disguised as stability". No emoji.

2. Human behavior pattern (short, 1–2 sentences — never a single standalone line)
   - The "just watching" loop PLUS a second punch that touches the reader's pain without stating it. Do not leave "Stuck in the 'just watching' loop." alone. Add a comma or dash and a short Grok-style line: e.g. "— telling yourself it's 'not the top.'" or ", waiting for confirmation that never comes." Let the reader feel the pain themselves. Calm, sarcastic, factual. Do NOT put "the market observes your hesitation" here.

3. Psychological inversion + Data block
   - First line: "The market observes your hesitation." (or equivalent in ${langName}) — must come AFTER block 2.
   - Then: data line. Use 28/100 (or actual score) ONCE with Whale Ratio and Netflow — do NOT repeat "Trap Score X/100" (already in block 1). Format: "X/100 + Whale Ratio Y + negative netflow — [meaning line]. Not intuition — data."
   - Meaning line: short, sharp, cold Grok tone. Prefer "visible only in hindsight" or "noticed only after the drop" (or equivalent). Avoid longer forms like "you only notice after the drop" or "everyone recognizes too late".

4. Solution block (order: value → offer → psych; rhythm: short sentences)
   - First line: "Regular. 15‑min alerts. Exit Map." (or equivalent — short beats, comma or period between items). Second: "${discountCode} gets you in. Decide before the market decides for you."
   - Do NOT put "Join us." in the body — we add it in social proof below.

5. Hashtags (exactly one line)
   #BTC #TrapDefence #TrapScore

## Mandatory phrasing (include at least 2–3 in the body)
- "Not intuition — data." (or local equivalent)
- "distribution signature" — short, sharp, cold: "visible only in hindsight" or "noticed only after the drop" (avoid "you only notice after the drop" or "everyone recognizes too late")
- "the 'just watching' loop" (or equivalent)
- "the market observes your hesitation" (or equivalent) — block 3 only, after block 2
- "decide before the market decides for you" (or equivalent)

## Variables (use actual values from ON-CHAIN DATA)
ON-CHAIN DATA: ${cq}
${marketContext ? `\nMARKET CONTEXT:\n${marketContext}` : ""}
PERSONA: ${persona}
TESTIMONIALS (optional, at most one short line): ${testimonialBlock}
${LANG_SPECIFIC}

## Quality rules (self-check before output)
- Grok tone consistent. No hype. No emojis in body. No long paragraphs.
- No more than ~12 lines total for blocks 1–5. All five blocks present. Discount code ${discountCode} in block 4.
- Output: (1) red-flag opener, blank line, (2) behavior pattern (reader infers pain), blank line, (3) "The market observes your hesitation" then data (score once) + meaning line, blank line, (4) solution ending with "Decide before the market decides for you." (no "Join us." in body), blank line, (5) hashtags. Nothing else.`;
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
