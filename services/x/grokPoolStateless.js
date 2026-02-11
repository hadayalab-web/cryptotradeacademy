/**
 * Trap Defence X Repost OS — Grok プール（Run 内 1 回生成）
 * KV 禁止・完全 stateless
 */

const { generateChatCompletion } = require("../grok/client");

const PERSONA = {
  en: "You are a burned-out crypto trader whose PnL is bleeding despite the market pumping. You speak in short, sharp, emotionally charged lines. You never sound like an ad. You sound like someone who has been through the pain.",
  ja: "含み損でダッシュボード真っ赤の思考停止トレード依存症。市場は上がっているのに損切り続き。短文で、感情的で、広告っぽくない。痛みを経験した人の声で話す。",
  es: "Eres un trader de cripto quemado cuyo PnL sangra a pesar del bombeo del mercado. Hablas en líneas cortas, afiladas y cargadas de emoción. Nunca suenas como un anuncio. Suenas como alguien que ha pasado por el dolor.",
  pt: "Você é um trader de crypto esgotado cujo PnL sangra apesar do pump do mercado. Fala em linhas curtas, afiadas e carregadas de emoção. Nunca soa como anúncio. Soa como alguém que passou pela dor.",
  ko: "시장이 펌핑되는데도 PnL이 피를 흘리는 번아웃된 크립토 트레이더. 짧고 날카롭고 감정적으로 말한다. 광고처럼 들리지 않는다. 고통을 겪은 사람의 목소리로 말한다.",
  ar: "تاجر كريبتو منهك، ربحه ينزف رغم ضخ السوق. تتحدث بجمل قصيرة وحادة ومشحونة عاطفياً. لا تبدو كإعلان. تبدو كمن مر بالألم."
};

const CONSTRAINTS = {
  en: "40–70 characters. 0–1 hashtags. 1 link placeholder {link}. No emojis. No hype. No promises. No financial advice. Must trigger curiosity or pain.",
  ja: "40–70文字。ハッシュタグ0〜1。リンク1つ {link}。絵文字禁止。煽り禁止。約束禁止。投資助言禁止。好奇心または痛みを喚起すること。",
  es: "40–70 caracteres. 0–1 hashtags. 1 enlace {link}. Sin emojis. Sin hype. Sin promesas. Sin consejos financieros. Debe provocar curiosidad o dolor.",
  pt: "40–70 caracteres. 0–1 hashtags. 1 link {link}. Sem emojis. Sem hype. Sem promessas. Sem aconselhamento financeiro. Deve despertar curiosidade ou dor.",
  ko: "40–70자. 해시태그 0–1. 링크 1개 {link}. 이모지 금지. 과장 금지. 약속 금지. 투자 조언 금지. 호기심 또는 고통을 유발해야 함.",
  ar: "40–70 حرفاً. 0–1 هاشتاغ. رابط واحد {link}. بدون إيموجي. بدون ضجيج. بدون وعود. بدون نصيحة مالية. يجب إثارة الفضول أو الألم."
};

const DEFAULT_CONSTRAINTS = CONSTRAINTS.en;

function safeJsonParse(text) {
  if (typeof text !== "string") return null;
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    // Try to extract JSON array from markdown code block
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        return Array.isArray(parsed) ? parsed : null;
      } catch {}
    }
    return null;
  }
}

/**
 * 1 Run につき 1 回だけ Grok API を叩き、短文 n 本の配列を返す
 * @param {Object} opts
 * @param {string} opts.lang - en | es | pt | pt-br | ja | ko | ar
 * @param {string} opts.link - Vidalytics リンク（各文に1つ含める）
 * @param {number} opts.n - 生成する短文数（デフォルト: 3）
 * @param {string} [opts.persona] - ペルソナ説明（未指定なら言語別デフォルト）
 * @param {string} [opts.constraints] - 制約（未指定ならデフォルト）
 * @returns {Promise<string[]>} ["text1", "text2", "text3"] または []
 */
async function tryGenerateGrokPool(opts = {}) {
  const { lang, link, n = 3, persona, constraints } = opts;
  if (!link) return [];

  const normalLang = lang === "pt-br" ? "pt" : (lang || "en");
  const personaText = persona || PERSONA[normalLang] || PERSONA.en;
  const constraintsText = constraints || CONSTRAINTS[normalLang] || CONSTRAINTS.en;

  const systemPrompt = `You are a short-form copy generator for quote reposts on X.
Persona: ${personaText}
Constraints: ${constraintsText}
Output format: JSON array only. No markdown. No code fences. Example: ["text1", "text2", "text3"]`;

  const userPrompt = `Write ${n} short quote repost texts in ${normalLang}.
- Each text: 40–70 characters
- Include exactly one link in each: ${link}
- Start with condition/context words (If/When/Still/Market for EN; equivalent for other langs)
- Single sentence only
- No emojis, no hype, no promises
- Must trigger curiosity or pain
- Stay within Crypto/BTC context
Return ONLY a JSON array of ${n} strings.`;

  try {
    const text = await generateChatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 400,
      temperature: 0.6
    });

    if (!text) return [];

    const arr = safeJsonParse(text);
    if (!arr || !Array.isArray(arr)) return [];

    const cleaned = arr
      .filter((s) => typeof s === "string" && s.trim().length > 0)
      .map((s) => String(s).trim())
      .slice(0, n);

    return cleaned;
  } catch (e) {
    console.warn(`[GrokPool] Failed to generate pool for ${lang}:`, e.message);
    return [];
  }
}

module.exports = {
  tryGenerateGrokPool,
  PERSONA,
  DEFAULT_CONSTRAINTS
};
