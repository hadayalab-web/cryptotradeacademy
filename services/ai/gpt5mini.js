/**
 * Trap Defence OS — X投稿生成（gpt-5-mini 統合）
 * Grok / GrokPool / KV版テンプレートを廃止し、Trap Defence コピー人格に一本化
 * Supabase td_* 連携: 辞書・公式アカウント org_type による文脈付与
 */

const OpenAI = require("openai");
const { insertXPost } = require("../../utils/supabase");

const MODEL = process.env.GPT_MODEL_X_POST || "gpt-4o-mini";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are the Trap Defence copywriter. All X posts MUST follow these rules.

【Trap Defence コピー人格】
- NO abstract expressions (部屋/世界/景色/視点/俯瞰)
- FIVE SENSES stimulus (赤い数字/心臓の鼓動/手汗/点滅/胃が縮む)
- CEREBELLUM stimulus (恐怖/不安/焦り/後悔/取り返したい)
- ENEMY (クジラ/アルゴ/罠/餌/吸われる)
- DEFENCE (Minimal/Regular/シールド/フル防御/機関レベル)
- Create "reflex" not persuasion
- ~150 characters
- Link at end
- #BTC exactly once
- Exactly 1 emoji

【構造テンプレ mode=minimal】
- 1行目：痛み・恐怖・五感刺激
- 2行目：敵（クジラ・アルゴ）を明示
- 3行目：無料のシールド（Minimal）を提示
- 4行目：video_url
- 5行目：#BTC + 絵文字1つ

【構造テンプレ mode=regular】
- 1行目：痛み・恐怖・破滅の映像
- 2行目：軽装備では死ぬ（構造の問題）
- 3行目：フル防御（Regular）を提示
- 4行目：video_url
- 5行目：#BTC + 絵文字1つ

【生成条件】
- You are now writing in the target language: {{LANG}}.
- You are now generating a post for mode={{MODE}}.
- Follow the exact structure template for this mode.
- Never deviate from the required line structure.
{{REGIME_NOTE}}
{{ORG_CONTEXT}}
{{DICT_NOTE}}
{{BUZZ_CONTEXT}}`;

const MODE_MINIMAL_USER = `Generate a post in {{LANG}} for mode "minimal".

Structure (strict):
1. Pain/fear/five-senses stimulus
2. Enemy explicit (whale/algo/trap/bait/sucked)
3. Free shield (Minimal) offer
4. {{VIDEO_URL}}
5. #BTC + exactly 1 emoji

Output: 3-4 lines, ~150 chars. Link at end. No abstract words.`;

const MODE_REGULAR_USER = `Generate a post in {{LANG}} for mode "regular".

Structure (strict):
1. Pain/fear/destruction imagery
2. Light armor = death (structural problem)
3. Full defence (Regular) offer
4. {{VIDEO_URL}}
5. #BTC + exactly 1 emoji

Output: 3-4 lines, ~150 chars. Link at end. No abstract words.`;

// 公式アカウント org_type 別の文脈（指示書準拠）
const ORG_CONTEXT_BY_TYPE = {
  media: "Target: media accounts. Emphasize: AI trends, market structure shifts.",
  ai: "Target: AI/crypto projects. Emphasize: model optimization, automation, multilingual AI.",
  finance: "Target: finance/exchange accounts. Emphasize: market traps, whales, algos.",
  corporate: "Target: corporate accounts. Emphasize: safety, efficiency, automation.",
  government: "Target: institutional. Emphasize: structure, regulation, compliance."
};

const LANGS = ["ja", "en", "es", "pt", "ko", "ar"];
const DEFAULT_EMOJI = "🚨";

/**
 * Phase 4: Regime-specific tone for BWE copywriting
 * @param {string} regime - marketRegime label
 * @returns {string} tone instruction
 */
function regimeTone(regime) {
  const map = {
    "whale-driven": "analytical, cautious",
    "retail-fomo": "contrarian, warning",
    "high-volatility": "short, urgent",
    "liquidity-vacuum": "defensive",
    "miner-capitulation": "long-term perspective",
    "neutral": "balanced"
  };
  const key = String(regime || "").toLowerCase().replace(/_/g, "-");
  return map[key] || map.neutral;
}
// Unicode Emoji 簡易検出（一般的な絵文字範囲）
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u2600-\u26FF\u2700-\u27BF]/gu;

const MAX_LEN_BY_LANG = {
  ja: 150,
  ko: 150,
  ar: 150,
  en: 180,
  es: 180,
  pt: 180
};

function trimToMax(text, lang = "ja") {
  if (!text || typeof text !== "string") return "";
  const t = text.trim();
  const max = MAX_LEN_BY_LANG[lang] ?? MAX_LEN_BY_LANG.ja;
  const margin = Math.min(20, max - 10);
  if (t.length <= max + margin) return t;
  const cut = t.substring(0, max - 3);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = lastSpace > max * 0.6 ? cut.substring(0, lastSpace) : cut;
  return trimmed.trim() + "...";
}

/**
 * #BTC をちょうど1回、絵文字をちょうど1つに厳格化。
 * 最終形: <本文> <video_url> #BTC 🚨
 */
function ensureHashtagAndEmoji(text) {
  let t = text.trim();

  // 絵文字: 2つ以上なら先頭1つだけ残し、0個なら🚨を使用
  const emojiMatches = t.match(EMOJI_REGEX) || [];
  const emojiToUse = emojiMatches.length >= 1 ? emojiMatches[0] : DEFAULT_EMOJI;

  // #BTC と絵文字を除去して本文のみ取得
  let body = t.replace(/#BTC/gi, "").replace(EMOJI_REGEX, "").replace(/\s+/g, " ").trim();

  // 末尾の " #BTC" や " 🚨" の余分なスペースを除去
  body = body.replace(/\s+$/, "");

  // 最終形: <本文> #BTC <絵文字>
  return (body + " #BTC " + emojiToUse).replace(/\s+/g, " ").trim();
}

/**
 * X投稿文を生成
 * @param {Object} opts
 * @param {string} opts.mode - "minimal" | "regular"
 * @param {string} opts.language - "ja" | "en" | "es" | "pt" | "ko" | "ar"
 * @param {string} opts.video_url - Vidalytics URL
 * @param {string} [opts.variant] - A/B variant (optional)
 * @param {string} [opts.orgType] - "media"|"ai"|"finance"|"corporate"|"government" (公式向け文脈)
 * @param {string[]} [opts.dictionaryPhrases] - 感情辞書からの参考素材（必須ではない）
 * @param {Object} [opts.btcSnapshot] - Trap Defence btcSnapshot（BWE 必須: 同一市場状態で投稿）
 * @returns {Promise<{body: string, variant: string}>}
 */
async function generateXPost(opts = {}) {
  const { mode = "minimal", language = "ja", video_url = "", variant, orgType, dictionaryPhrases, buzzContext, usedMode, btcSnapshot } = opts;
  const lang = LANGS.includes(language) ? language : "ja";
  const vidUrl = String(video_url || "").trim();
  const assignedVariant = variant || (Math.random() < 0.5 ? "A" : "B");

  if (!vidUrl) {
    throw new Error("video_url is required");
  }

  const orgContext = orgType && ORG_CONTEXT_BY_TYPE[orgType]
    ? "- Target context: " + ORG_CONTEXT_BY_TYPE[orgType]
    : "";
  const dictNote = Array.isArray(dictionaryPhrases) && dictionaryPhrases.length > 0
    ? "- The following phrases are REFERENCE material only. Use only if natural. Do NOT force: " + dictionaryPhrases.slice(0, 10).join(" | ")
    : "";
  let buzzNote = "";
  const effectiveUsedMode = usedMode || buzzContext?.usedMode || "neutral_insight";
  if (buzzContext) {
    const parts = [];
    if (buzzContext.quotedText) {
      parts.push("- This is a QUOTE REPOST. Parasitically attach to the buzz post context. Quoted post excerpt: \"" + String(buzzContext.quotedText).slice(0, 150) + "\". Topic: " + (buzzContext.topic || "crypto") + ", Tone: " + (buzzContext.tone || "neutral") + ". Be natural, do NOT copy the quoted text. Never reference past copies.");
    }
    if (buzzContext.buzzSummary) parts.push("- Why buzzing: " + buzzContext.buzzSummary);
    if (buzzContext.clusterPsych) parts.push("- Cluster market psychology: " + buzzContext.clusterPsych);
    if (buzzContext.trapDefenceInsight) parts.push("- Trap Defence insight: " + buzzContext.trapDefenceInsight);
    if (buzzContext.dangerWhyRetail) parts.push("- Why this trend is dangerous for retail traders: " + buzzContext.dangerWhyRetail);
    if (buzzContext.whaleTrapHow) parts.push("- How whales are trapping retail: " + buzzContext.whaleTrapHow);
    if (buzzContext.doNotDoActions) parts.push("- Typical actions NOT to do now: " + buzzContext.doNotDoActions);
    buzzNote = parts.length ? parts.join(" ") : "";
  }
  const usedModeNote = effectiveUsedMode === "trap_defence_warning"
    ? " IMPORTANT: This is TRAP DEFENCE mode. Emphasize WARNING, structure explanation, and what NOT to do. Save retail from whale traps."
    : effectiveUsedMode === "educational_boost"
    ? " IMPORTANT: This is EDUCATIONAL BOOST mode. Reinforce the original post's awareness message. Add depth to the educational content."
    : " IMPORTANT: This is NEUTRAL INSIGHT mode. Explain current market structure. Balanced perspective.";
  if (buzzNote) buzzNote += usedModeNote;

  // Task 11 + Phase 4: BWE deep alignment — regimeTone, marketRegime, divergenceLevel, trapSeverity, whaleBias, retailFomo
  let marketStateNote = "";
  let regimeNote = "";
  if (btcSnapshot && typeof btcSnapshot === "object") {
    const trapScore = btcSnapshot.trapDetection?.trapScore ?? btcSnapshot.cqDeep?.trapScore ?? null;
    const marketScore = btcSnapshot.market_score ?? null;
    const priceUsd = btcSnapshot.raw?.priceUsd ?? null;
    const change24h = btcSnapshot.raw?.change24h ?? null;
    const whaleRatio = btcSnapshot.cqDeep?.whaleFlows?.whaleRatio ?? btcSnapshot.cqDeep?.whaleRatio ?? null;
    const sentimentLabel = btcSnapshot.raw?.sentimentLabel ?? null;
    const change = Number(change24h) || 0;
    const regimeLabel =
      btcSnapshot.marketRegime ??
      (change > 5 ? "high_volatility" : Number(whaleRatio) > 0.85 ? "whale_driven" : btcSnapshot.xSentiment?.retailFomo > 70 ? "retail_fomo" : "neutral");
    const divergenceLevel = btcSnapshot.divergenceSignal?.divergenceLevel ?? null;
    const trapSeverity = btcSnapshot.trapDetection?.trapSeverity ?? null;
    const whaleBias = btcSnapshot.xSentiment?.whaleBias ?? null;
    const retailFomo = btcSnapshot.xSentiment?.retailFomo ?? null;
    regimeNote = [
      `Regime: ${regimeLabel}`,
      `Tone rule: ${regimeTone(regimeLabel)}`,
      divergenceLevel ? `Divergence: ${divergenceLevel}` : "",
      trapSeverity ? `Trap severity: ${trapSeverity}` : "",
      whaleBias != null ? `Whale bias: ${Number(whaleBias).toFixed(0)}` : "",
      retailFomo != null ? `Retail FOMO: ${Number(retailFomo).toFixed(0)}` : ""
    ].filter(Boolean).join(". ");
    const parts = [];
    if (trapScore != null) parts.push(`Trap Score ${trapScore}/100`);
    if (marketScore != null) parts.push(`Market Score ${marketScore}/100`);
    if (priceUsd != null) parts.push(`BTC $${Number(priceUsd).toFixed(0)}`);
    if (change24h != null) parts.push(`24h ${change >= 0 ? "+" : ""}${Number(change24h).toFixed(2)}%`);
    if (whaleRatio != null) parts.push(`Whale Ratio ${(Number(whaleRatio) * 100).toFixed(0)}%`);
    if (sentimentLabel) parts.push(`Sentiment ${String(sentimentLabel)}`);
    parts.push(`Regime ${regimeLabel}`);
    if (divergenceLevel) parts.push(`Divergence ${String(divergenceLevel)}`);
    if (trapSeverity) parts.push(`Trap Severity ${String(trapSeverity)}`);
    if (whaleBias != null) parts.push(`Whale Bias ${Number(whaleBias).toFixed(0)}`);
    if (retailFomo != null) parts.push(`Retail FOMO ${Number(retailFomo).toFixed(0)}`);
    const diffSummary = btcSnapshot.diff?.summaryText;
    if (diffSummary) parts.push(`Diff: ${diffSummary}`);
    const macro = btcSnapshot.macroContext ?? btcSnapshot.meta?.macroContext;
    if (macro) {
      if (macro.nasdaqRegime) parts.push(`NASDAQ ${macro.nasdaqRegime}`);
      if (macro.goldWhaleBias != null) parts.push(`Gold bias ${macro.goldWhaleBias}`);
      if (macro.macroRiskOnOff) parts.push(`Macro ${macro.macroRiskOnOff}`);
    }
    if (parts.length) marketStateNote = "- Current Trap Defence market state (align your tone): " + parts.join(", ");
  }

  const userTpl = mode === "regular" ? MODE_REGULAR_USER : MODE_MINIMAL_USER;
  const userPrompt = userTpl
    .replace(/\{\{LANG\}\}/g, lang)
    .replace(/\{\{VIDEO_URL\}\}/g, vidUrl);

  if (!OPENAI_API_KEY) {
    const fallback = `ダッシュボード真っ赤。クジラが吸う前にシールド。${vidUrl} #BTC 🔥`;
    return { body: trimToMax(ensureHashtagAndEmoji(fallback), lang), variant: assignedVariant };
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const systemPrompt = SYSTEM_PROMPT
    .replace(/\{\{LANG\}\}/g, lang)
    .replace(/\{\{MODE\}\}/g, mode)
    .replace("{{REGIME_NOTE}}", regimeNote ? "- " + regimeNote + "\n" : "")
    .replace("{{ORG_CONTEXT}}", orgContext)
    .replace("{{DICT_NOTE}}", dictNote)
    .replace("{{BUZZ_CONTEXT}}", buzzNote + (marketStateNote ? " " + marketStateNote : ""));

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_completion_tokens: 200,
      temperature: 0.7,
      top_p: 1,
      presence_penalty: 0,
      frequency_penalty: 0
    });

    let body = completion?.choices?.[0]?.message?.content?.trim() || "";
    if (!body) {
      body = `ダッシュボード真っ赤。クジラが吸う前にシールド。${vidUrl} #BTC 🔥`;
    }
    if (!body.includes(vidUrl)) {
      body = (body.trim() + " " + vidUrl).replace(/\s+/g, " ");
    }
    body = ensureHashtagAndEmoji(body);
    body = trimToMax(body, lang);
    return { body, variant: assignedVariant };
  } catch (e) {
    console.warn("[gpt5mini] generateXPost error:", e.message);
    const fallback = `ダッシュボード真っ赤。クジラが吸う前にシールド。${vidUrl} #BTC 🔥`;
    return { body: trimToMax(ensureHashtagAndEmoji(fallback), lang), variant: assignedVariant };
  }
}

const CRITICAL_SHIFT_I18N = {
  en: {
    title: "CRITICAL SHIFT detected",
    kind: "Type",
    confidence: "Confidence",
    mainReasons: "Main reasons",
    marketContext: "Market context",
    btcLine: (price, change, regime) =>
      `• BTC ${price != null ? `$${Number(price).toFixed(0)}` : "N/A"} / 24h ${change != null ? `${Number(change).toFixed(2)}%` : "N/A"} / Regime ${regime || "N/A"}`,
    macroLine: (nasdaqRegime, goldWhaleBias, macroRiskOnOff) =>
      `• NASDAQ ${nasdaqRegime || "N/A"} / GOLD ${goldWhaleBias || "N/A"} / Macro ${macroRiskOnOff || "N/A"}`,
    note:
      "Use this as directional positioning context, not as a direct buy/sell signal."
  },
  ja: {
    title: "CRITICAL SHIFT 検知",
    kind: "種別",
    confidence: "信頼度",
    mainReasons: "主な理由",
    marketContext: "市場の文脈",
    btcLine: (price, change, regime) =>
      `• BTC ${price != null ? `$${Number(price).toFixed(0)}` : "N/A"} / 24h ${change != null ? `${Number(change).toFixed(2)}%` : "N/A"} / レジーム ${regime || "N/A"}`,
    macroLine: (nasdaqRegime, goldWhaleBias, macroRiskOnOff) =>
      `• NASDAQ ${nasdaqRegime || "N/A"} / GOLD ${goldWhaleBias || "N/A"} / マクロ ${macroRiskOnOff || "N/A"}`,
    note:
      "具体的な売買シグナルではなく、どちら側に立つべきかを決める材料として使ってください。"
  },
  es: {
    title: "CRITICAL SHIFT detectado",
    kind: "Tipo",
    confidence: "Confianza",
    mainReasons: "Razones principales",
    marketContext: "Contexto de mercado",
    btcLine: (price, change, regime) =>
      `• BTC ${price != null ? `$${Number(price).toFixed(0)}` : "N/A"} / 24h ${change != null ? `${Number(change).toFixed(2)}%` : "N/A"} / Régimen ${regime || "N/A"}`,
    macroLine: (nasdaqRegime, goldWhaleBias, macroRiskOnOff) =>
      `• NASDAQ ${nasdaqRegime || "N/A"} / ORO ${goldWhaleBias || "N/A"} / Macro ${macroRiskOnOff || "N/A"}`,
    note:
      "Úsalo como contexto de sesgo direccional, no como señal directa de compra/venta."
  },
  "pt-br": {
    title: "CRITICAL SHIFT detectado",
    kind: "Tipo",
    confidence: "Confianca",
    mainReasons: "Principais motivos",
    marketContext: "Contexto de mercado",
    btcLine: (price, change, regime) =>
      `• BTC ${price != null ? `$${Number(price).toFixed(0)}` : "N/A"} / 24h ${change != null ? `${Number(change).toFixed(2)}%` : "N/A"} / Regime ${regime || "N/A"}`,
    macroLine: (nasdaqRegime, goldWhaleBias, macroRiskOnOff) =>
      `• NASDAQ ${nasdaqRegime || "N/A"} / OURO ${goldWhaleBias || "N/A"} / Macro ${macroRiskOnOff || "N/A"}`,
    note:
      "Use como contexto de direcao, nao como sinal direto de compra/venda."
  },
  ko: {
    title: "CRITICAL SHIFT 감지",
    kind: "유형",
    confidence: "신뢰도",
    mainReasons: "주요 이유",
    marketContext: "시장 맥락",
    btcLine: (price, change, regime) =>
      `• BTC ${price != null ? `$${Number(price).toFixed(0)}` : "N/A"} / 24h ${change != null ? `${Number(change).toFixed(2)}%` : "N/A"} / 레짐 ${regime || "N/A"}`,
    macroLine: (nasdaqRegime, goldWhaleBias, macroRiskOnOff) =>
      `• NASDAQ ${nasdaqRegime || "N/A"} / GOLD ${goldWhaleBias || "N/A"} / 매크로 ${macroRiskOnOff || "N/A"}`,
    note:
      "직접 매수/매도 신호가 아니라, 어느 방향에 설지 판단하는 재료로 사용하세요."
  },
  ar: {
    title: "تم اكتشاف CRITICAL SHIFT",
    kind: "النوع",
    confidence: "الثقة",
    mainReasons: "الاسباب الرئيسية",
    marketContext: "سياق السوق",
    btcLine: (price, change, regime) =>
      `• BTC ${price != null ? `$${Number(price).toFixed(0)}` : "N/A"} / 24h ${change != null ? `${Number(change).toFixed(2)}%` : "N/A"} / النظام ${regime || "N/A"}`,
    macroLine: (nasdaqRegime, goldWhaleBias, macroRiskOnOff) =>
      `• NASDAQ ${nasdaqRegime || "N/A"} / GOLD ${goldWhaleBias || "N/A"} / الماكرو ${macroRiskOnOff || "N/A"}`,
    note:
      "استخدمه كسياق لاتجاه التموضع وليس كاشارة شراء/بيع مباشرة."
  }
};

const CRITICAL_SHIFT_LABELS = {
  en: { UP: "Up Shift", DOWN: "Down Shift", TOP: "Top Risk", BOTTOM: "Bottom Opportunity", ACCEL: "Acceleration", REVERSAL: "Reversal", NONE: "None" },
  ja: { UP: "上昇転換", DOWN: "下落転換", TOP: "天井警戒", BOTTOM: "底打ち候補", ACCEL: "加速", REVERSAL: "反転", NONE: "なし" },
  es: { UP: "Giro alcista", DOWN: "Giro bajista", TOP: "Riesgo de techo", BOTTOM: "Zona de suelo", ACCEL: "Aceleracion", REVERSAL: "Reversion", NONE: "Ninguno" },
  "pt-br": { UP: "Virada de alta", DOWN: "Virada de baixa", TOP: "Risco de topo", BOTTOM: "Possivel fundo", ACCEL: "Aceleracao", REVERSAL: "Reversao", NONE: "Nenhum" },
  ko: { UP: "상승 전환", DOWN: "하락 전환", TOP: "상단 경계", BOTTOM: "바닥 후보", ACCEL: "가속", REVERSAL: "반전", NONE: "없음" },
  ar: { UP: "تحول صاعد", DOWN: "تحول هابط", TOP: "خطر القمة", BOTTOM: "فرصة قاع", ACCEL: "تسارع", REVERSAL: "انعكاس", NONE: "لا شيء" }
};

function normalizeCriticalShiftLang(lang) {
  const normalized = String(lang || "en").toLowerCase().replace(/_/g, "-");
  if (normalized === "pt") return "pt-br";
  if (CRITICAL_SHIFT_I18N[normalized]) return normalized;
  return "en";
}

/**
 * CRITICAL SHIFT alert formatter (template-based).
 * @param {Object} criticalShiftSnapshot
 * @param {string} lang
 * @returns {string}
 */
function formatCriticalShiftAlert(criticalShiftSnapshot, lang = "en") {
  const snapshot = criticalShiftSnapshot && typeof criticalShiftSnapshot === "object"
    ? criticalShiftSnapshot
    : {};
  const resolvedLang = normalizeCriticalShiftLang(lang);
  const i18n = CRITICAL_SHIFT_I18N[resolvedLang] || CRITICAL_SHIFT_I18N.en;
  const labels = CRITICAL_SHIFT_LABELS[resolvedLang] || CRITICAL_SHIFT_LABELS.en;

  const shiftType = String(snapshot.shiftType || "NONE").toUpperCase();
  const shiftLabel = labels[shiftType] || labels.NONE;
  const confidence = Number(snapshot.confidence);
  const confidenceValue = Number.isFinite(confidence) ? Math.max(0, Math.min(100, Math.round(confidence))) : 0;

  const reasons = Array.isArray(snapshot.reasons)
    ? snapshot.reasons.filter((x) => typeof x === "string" && x.trim()).slice(0, 3)
    : [];
  if (reasons.length === 0) {
    reasons.push("Cross-market structure suggests a possible transition.");
  }

  const btc = snapshot.btcContext || {};
  const macro = snapshot.macroContext || {};

  return [
    i18n.title,
    `${i18n.kind}: ${shiftLabel} (${i18n.confidence} ${confidenceValue}%)`,
    `${i18n.mainReasons}:`,
    ...reasons.map((r) => `• ${r}`),
    `${i18n.marketContext}:`,
    i18n.btcLine(btc.priceUsd, btc.change24h, btc.regime),
    i18n.macroLine(macro.nasdaqRegime, macro.goldWhaleBias, macro.macroRiskOnOff),
    i18n.note
  ].join("\n");
}

/**
 * X投稿を生成し、Supabase x_posts に保存
 * @param {Object} opts - generateXPost と同じ + 保存
 * @returns {Promise<{body: string, variant: string, saved: boolean}>}
 */
async function generateAndSaveXPost(opts = {}) {
  const { body, variant } = await generateXPost(opts);
  const { mode = "minimal", language = "ja", video_url = "" } = opts;
  const saved = await insertXPost({
    lang: language,
    mode,
    variant,
    body,
    video_url
  });
  return { body, variant, saved };
}

module.exports = {
  MODEL,
  SYSTEM_PROMPT,
  generateXPost,
  generateAndSaveXPost,
  formatCriticalShiftAlert,
  trimToMax,
  ensureHashtagAndEmoji,
  regimeTone,
  MAX_LEN_BY_LANG
};
