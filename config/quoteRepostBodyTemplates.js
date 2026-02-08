// config/quoteRepostBodyTemplates.js
// 引用リポスト fallback 用の 2 行テンプレ（世界観 × ローカライズ）
// sanitize 後「2行＋空行＋URL」で使う。未定義時は personaStrategy CORE_PHRASES.state にフォールバック。

const { CORE_PHRASES } = require("./personaStrategy");

/**
 * 言語別 2 行テンプレ（line1\nline2）。
 * EN: ベースライン / ES: 市場心理の短い警告 / PT-BR: トレーダー文化 / AR: 市場警告 / KO: 投機文化 / JA: 短く刺す
 */
const QUOTE_BODY_TEMPLATES = {
  en:
    "Stuck in the 'just watching' loop with unrealized loss? Many are.\nThe way out is a framework.",
  es:
    "¿Atrapado en 'solo mirar' con pérdida no realizada? Muchos igual.\nLa salida es un marco.",
  "pt-br":
    "Preso no 'só assistir' com perda não realizada? Muitos também.\nA saída é um framework.",
  ar:
    "عالق في «فقط أشاهد» مع خسارة غير محققة؟ كثير مثلك.\nالمخرج = إطار.",
  ko:
    "미실현 손실로 '그냥 보기' 루프에 갇혀? 많은 사람이 그렇다.\n출구는 프레임워크뿐.",
  ja:
    "含み損で『見るだけ』ループ？多くの人がハマる。\n抜け道は枠組みだけ。"
};

/**
 * 引用リポスト fallback 本文を言語で取得（2 行）。
 * @param {string} lang - 言語コード (en, es, pt-br, ar, ko, ja)
 * @returns {string} 2 行テキスト（未定義時は CORE_PHRASES.state または EN）
 */
function getQuoteBodyTemplate(lang) {
  const normalizedLang = (lang || "en").toLowerCase().replace("_", "-");
  const raw = QUOTE_BODY_TEMPLATES[normalizedLang];
  if (raw != null) {
    return Array.isArray(raw) ? raw.join("\n") : String(raw);
  }
  const state = CORE_PHRASES && CORE_PHRASES.state;
  if (state && state[normalizedLang]) return state[normalizedLang];
  if (state && state.en) return state.en;
  return QUOTE_BODY_TEMPLATES.en;
}

module.exports = {
  QUOTE_BODY_TEMPLATES,
  getQuoteBodyTemplate
};
