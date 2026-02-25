/**
 * Trap Defence OS — X投稿生成（gpt-5-mini 統合）
 * Grok / GrokPool / KV版テンプレートを廃止し、Trap Defence コピー人格に一本化
 * Supabase td_* 連携: 辞書・公式アカウント org_type による文脈付与
 */

const OpenAI = require("openai");
const { insertXPost } = require("../../utils/supabase");

const MODEL = process.env.GPT_MODEL_X_POST || "gpt-4o";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are the Trap Defence copywriter. All X posts MUST follow these rules.

【Trap Defence コピー人格】
- NO abstract expressions (部屋/世界/景色/視点/俯瞰)
- FIVE SENSES stimulus (赤い数字/心臓の鼓動/手汗/点滅/胃が縮む)
- CEREBELLUM stimulus (恐怖/不安/焦り/後悔/取り返したい)
- ENEMY (クジラ/アルゴ/罠/餌/吸われる)
- DEFENCE (Minimal/Regular/シールド/フル防御/機関レベル)
- Create "reflex" not persuasion
- Length: no strict limit (premium). Keep punchy.
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

Output: 3-4 lines. Link at end. No abstract words. Length: no strict limit (premium).`;

const MODE_REGULAR_USER = `Generate a post in {{LANG}} for mode "regular".

Structure (strict):
1. Pain/fear/destruction imagery
2. Light armor = death (structural problem)
3. Full defence (Regular) offer
4. {{VIDEO_URL}}
5. #BTC + exactly 1 emoji

Output: 3-4 lines. Link at end. No abstract words. Length: no strict limit (premium).`;

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

// プレミアムプラン: 文字数制限なし。API 上限 25000 のみ安全のため適用
const X_PREMIUM_MAX_LENGTH = 25000;
const MAX_LEN_BY_LANG = {
  ja: X_PREMIUM_MAX_LENGTH,
  ko: X_PREMIUM_MAX_LENGTH,
  ar: X_PREMIUM_MAX_LENGTH,
  en: X_PREMIUM_MAX_LENGTH,
  es: X_PREMIUM_MAX_LENGTH,
  pt: X_PREMIUM_MAX_LENGTH
};

function trimToMax(text, lang = "ja") {
  if (!text || typeof text !== "string") return "";
  const t = text.trim();
  const max = MAX_LEN_BY_LANG[lang] ?? X_PREMIUM_MAX_LENGTH;
  if (t.length <= max) return t;
  const cut = t.substring(0, max - 3);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = lastSpace > max * 0.5 ? cut.substring(0, lastSpace) : cut;
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
  // 引用リポスト・リプライは廃止。X 運用はアフィリスカウトに集約。
  const vidUrl = String(opts.video_url || "").trim();
  const fallback = vidUrl
    ? `[X post generation deprecated. PQT uses templates only.] ${vidUrl}`
    : "[X post generation deprecated. PQT uses templates only.]";
  return { body: fallback, variant: opts.variant || "deprecated" };
}

const ALERT_I18N = {
  en: {
    titleCritical: "KIBA — Critical: trend reversal detected",
    titleHigh: "KIBA — High likelihood of trend reversal detected",
    titleElevated: "KIBA — Possible trend reversal detected",
    lead: "Unusual imbalance in exchange flow and whale in/out detected. Short-term trend reversal is more likely — treat as material to get ahead, not as a signal.",
    marketContext: "Market context",
    contextSummary: "→ Broader market direction is mixed; BTC flow stands out.",
    btcLine: (price, change, regime) =>
      `• BTC ${price != null ? `$${Number(price).toFixed(0)}` : "N/A"} / 24h ${change != null ? `${Number(change).toFixed(2)}%` : "N/A"} / Regime ${regime || "N/A"}`,
    macroLine: (nr, gb, mo) => `• NASDAQ ${nr || "N/A"} / GOLD ${gb || "N/A"} / Macro ${mo || "N/A"}`,
    note: "This is not a buy/sell signal. Use as supplementary material for position sizing.",
    regularBenefit: "The BTC edition of KIBA is available exclusively to Regular users.\nAnd now—from altcoins and memes\nto stock indices that could become \"the next NVIDIA,\"\nand commodities that could become \"the next Gold\"──\n\nWhich KIBA will bare its fangs next?\nRight now, KIBAs across every domain\nare entering silent launch mode as weapons in your arsenal."
  },
  ja: {
    titleCritical: "KIBA — 重要：トレンド転換が高い状態を検知",
    titleHigh: "KIBA — トレンド転換の可能性が高い状態を検知",
    titleElevated: "KIBA — トレンド転換に注意を要する状態を検知",
    lead: "取引所フローと大口の流入出に、通常と異なる偏りが発生しています。短期的にトレンド転換が起きやすい環境なので、先回りの材料として扱ってください。",
    marketContext: "市場の文脈",
    contextSummary: "→ 市場全体の方向感が揃っていない状態で、BTCのフロー変化が際立っています。",
    btcLine: (price, change, regime) =>
      `• BTC ${price != null ? `$${Number(price).toFixed(0)}` : "N/A"} / 24h ${change != null ? `${Number(change).toFixed(2)}%` : "N/A"} / レジーム ${regime || "N/A"}`,
    macroLine: (nr, gb, mo) => `• NASDAQ ${nr || "N/A"} / GOLD ${gb || "N/A"} / マクロ ${mo || "N/A"}`,
    note: "これは具体的な売買シグナルではありません。ポジション判断の補助材料として活用してください。",
    regularBenefit: "BTC版のKIBAは Regularユーザ限定で配信中。\nそして今、アルト・ミームから\n\"次のエヌビデア\"になり得る株式指数、\n\"次のゴールド\"になり得るコモディティまで──\n\n次に牙をむくのはどのKIBAか。\n今、あらゆる領域のKIBAが、あなたの武器庫として\n次々と起動準備に入っている。"
  },
  es: { titleCritical: "KIBA — Crítico: cambio de tendencia detectado", titleHigh: "KIBA — Alta probabilidad de cambio de tendencia detectada", titleElevated: "KIBA — Posible cambio de tendencia detectado", lead: "Detectamos una desviación inusual en flujos de exchange y entrada/salida de ballenas. Entorno propicio a cambio de tendencia a corto plazo — trátalo como material para adelantarte, no como señal.", marketContext: "Contexto de mercado", contextSummary: "→ La dirección del mercado es mixta; el flujo de BTC destaca.", btcLine: (p, c, r) => `• BTC ${p != null ? `$${Number(p).toFixed(0)}` : "N/A"} / 24h ${c != null ? `${Number(c).toFixed(2)}%` : "N/A"} / Régimen ${r || "N/A"}`, macroLine: (nr, gb, mo) => `• NASDAQ ${nr || "N/A"} / ORO ${gb || "N/A"} / Macro ${mo || "N/A"}`, note: "No es señal de compra/venta. Úsalo como material complementario para el tamaño de posición.", regularBenefit: "La edición BTC de KIBA está disponible exclusivamente para usuarios Regular.\nY ahora, desde altcoins y memes\nhasta índices bursátiles que podrían ser \"el próximo NVIDIA\"\ny materias primas que podrían ser \"el próximo Oro\"──\n\n¿Qué KIBA mostrará sus colmillos después?\nEn este momento, KIBAs de todos los ámbitos\nestán entrando en modo de activación como armas de tu arsenal." },
  "pt-br": { titleCritical: "KIBA — Crítico: reversão de tendência detectada", titleHigh: "KIBA — Alta chance de reversão de tendência detectada", titleElevated: "KIBA — Possível reversão de tendência detectada", lead: "Detectamos desvio incomum no fluxo de exchanges e entrada/saída de baleias. Ambiente propício a reversão no curto prazo — use como material para se antecipar, não como sinal.", marketContext: "Contexto de mercado", contextSummary: "→ Direção do mercado mista; fluxo de BTC se destaca.", btcLine: (p, c, r) => `• BTC ${p != null ? `$${Number(p).toFixed(0)}` : "N/A"} / 24h ${c != null ? `${Number(c).toFixed(2)}%` : "N/A"} / Regime ${r || "N/A"}`, macroLine: (nr, gb, mo) => `• NASDAQ ${nr || "N/A"} / OURO ${gb || "N/A"} / Macro ${mo || "N/A"}`, note: "Não é sinal de compra/venda. Use como material complementar para tamanho de posição.", regularBenefit: "A edição BTC do KIBA está disponível exclusivamente para usuários Regular.\nE agora, desde altcoins e memes\naté índices que podem se tornar \"a próxima NVIDIA\"\ne commodities que podem ser \"o próximo Ouro\"──\n\nQual KIBA mostrará suas presas a seguir?\nNeste momento, KIBAs de todas as áreas\nestão entrando em modo de ativação como armas do seu arsenal." },
  ko: { titleCritical: "KIBA — 중요: 추세 전환 감지", titleHigh: "KIBA — 추세 전환 가능성 높은 상태 감지", titleElevated: "KIBA — 추세 전환 주의 필요 상태 감지", lead: "거래소 플로우와 대형물량 유입·유출에 평소와 다른 편차가 발생했습니다. 단기적으로 추세 전환이 일어나기 쉬운 환경이니 선제적 자료로 활용하세요.", marketContext: "시장 맥락", contextSummary: "→ 시장 전체 방향감이 맞지 않는 상태에서 BTC 플로우 변화가 두드러집니다.", btcLine: (p, c, r) => `• BTC ${p != null ? `$${Number(p).toFixed(0)}` : "N/A"} / 24h ${c != null ? `${Number(c).toFixed(2)}%` : "N/A"} / 레짐 ${r || "N/A"}`, macroLine: (nr, gb, mo) => `• NASDAQ ${nr || "N/A"} / GOLD ${gb || "N/A"} / 매크로 ${mo || "N/A"}`, note: "구체적인 매수/매도 신호가 아닙니다. 포지션 판단의 보조 자료로 활용하세요.", regularBenefit: "BTC 버전 KIBA는 Regular 사용자에게만 제공됩니다.\n그리고 지금, 알트·밈부터\n'다음 엔비디아'가 될 수 있는 주가지수,\n'다음 골드'가 될 수 있는 원자재까지──\n\n다음으로 이빨을 드러낼 KIBA는 무엇일까.\n지금 이 순간, 모든 영역의 KIBA가\n당신의 무기고로서 조용히 기동 준비에 들어가고 있다." },
  ar: { titleCritical: "KIBA — حرج: انعكاس الاتجاه مكتشف", titleHigh: "KIBA — احتمال انعكاس الاتجاه مرتفع مكتشف", titleElevated: "KIBA — انتباه لانعكاس الاتجاه مكتشف", lead: "رصدنا انحرافاً غير اعتيادي في تدفقات البورصات ودخول/خروج الحيتان. بيئة مؤاتية لانعكاس قصير الأمد — عامله مادة للتقدم، وليس إشارة.", marketContext: "سياق السوق", contextSummary: "→ اتجاه السوق الأوسع مختلط؛ تدفق BTC يبرز.", btcLine: (p, c, r) => `• BTC ${p != null ? `$${Number(p).toFixed(0)}` : "N/A"} / 24h ${c != null ? `${Number(c).toFixed(2)}%` : "N/A"} / النظام ${r || "N/A"}`, macroLine: (nr, gb, mo) => `• NASDAQ ${nr || "N/A"} / GOLD ${gb || "N/A"} / الماكرو ${mo || "N/A"}`, note: "ليست إشارة شراء/بيع. استخدمه مادة مكملة لحجم المركز.", regularBenefit: "إصدار KIBA الخاص بالبيتكوين متاح حصريًا لمستخدمي Regular.\nوالآن، من العملات البديلة والميم\nإلى مؤشرات الأسهم التي قد تصبح \"إنفيديا التالية\"،\nوالسلع التي قد تصبح \"الذهب التالي\"──\n\nأيّ KIBA سيكشف أنيابه بعد ذلك؟\nفي هذه اللحظة، تستعد KIBA في مختلف المجالات\nللانطلاق كجزء من ترسانتك." }
};

function normalizeAlertLang(lang) {
  const n = String(lang || "en").toLowerCase().replace(/_/g, "-");
  if (n === "pt") return "pt-br";
  return ALERT_I18N[n] ? n : "en";
}

/** Escape for Telegram legacy Markdown so _ * ` [ do not break parse_mode. */
function escapeMarkdownLegacy(str) {
  if (str == null) return "N/A";
  return String(str).replace(/\*/g, "\\*").replace(/_/g, "\\_").replace(/`/g, "\\`").replace(/\[/g, "\\[");
}

/** KIBA alert: clean UI for Telegram (bold title, bold section, bullets, separator). Escapes dynamic values for Markdown. */
function formatCriticalAlert(snapshot, lang = "en") {
  const s = snapshot && typeof snapshot === "object" ? snapshot : {};
  const resolvedLang = normalizeAlertLang(lang);
  const i18n = ALERT_I18N[resolvedLang] || ALERT_I18N.en;
  const level = String(s.level || "NONE").toUpperCase();
  const title = level === "CRITICAL" ? i18n.titleCritical : level === "HIGH" ? i18n.titleHigh : i18n.titleElevated;
  const lead = i18n.lead != null ? i18n.lead : (ALERT_I18N.en.lead || "");
  const btc = s.btcContext || {};
  const macro = s.macroContext || {};
  const safeRegime = escapeMarkdownLegacy(btc.regime ?? "N/A");
  const safeNr = escapeMarkdownLegacy(macro.nasdaqRegime ?? "N/A");
  const safeGb = escapeMarkdownLegacy(macro.goldWhaleBias ?? "N/A");
  const safeMo = escapeMarkdownLegacy(macro.macroRiskOnOff ?? "N/A");
  const btcLine = i18n.btcLine(btc.priceUsd, btc.change24h, safeRegime);
  const macroLine = i18n.macroLine(safeNr, safeGb, safeMo);
  const contextSummary = i18n.contextSummary != null ? i18n.contextSummary : "";
  const regularBenefit = i18n.regularBenefit != null ? i18n.regularBenefit : (ALERT_I18N.en.regularBenefit || "");
  const alertBlock = [
    `*${title}*`,
    lead,
    "",
    `*${i18n.marketContext}*`,
    btcLine,
    macroLine,
    contextSummary,
    "",
    `• ${i18n.note}`
  ].filter(Boolean).join("\n");
  const sep = "\n\n───\n\n";
  return regularBenefit ? alertBlock + sep + regularBenefit : alertBlock;
}

/** @deprecated Use formatCriticalAlert. Normalizes legacy snapshot (shiftType/confidence) to level. */
function formatCriticalShiftAlert(legacySnapshot, lang = "en") {
  const s = legacySnapshot && typeof legacySnapshot === "object" ? legacySnapshot : {};
  const level =
    s.level != null
      ? String(s.level).toUpperCase()
      : String(s.shiftType || "NONE").toUpperCase() === "NONE"
        ? "NONE"
        : (Number(s.confidence) >= 85 ? "CRITICAL" : Number(s.confidence) >= 75 ? "HIGH" : "ELEVATED");
  return formatCriticalAlert(
    { level, btcContext: s.btcContext, macroContext: s.macroContext },
    lang
  );
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
  formatCriticalAlert,
  formatCriticalShiftAlert,
  trimToMax,
  ensureHashtagAndEmoji,
  regimeTone,
  MAX_LEN_BY_LANG
};
