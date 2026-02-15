/**
 * Trap Defence OS v4.5 — poll_ratio × narrative_tag × lang で動的 CTA 選択
 * 心理タイプに応じて FOMO_RIDE / FUD_ESCAPE / ATH_SURGE を切り替え
 */

const LANG_DEFAULT_CTA = {
  ko: "FOMO_RIDE",
  ar: "FOMO_RIDE",
  ja: "FUD_ESCAPE",
  es: "ATH_SURGE",
  pt: "ATH_SURGE",
  en: "ATH_SURGE"
};

/**
 * narrative_tag と poll_ratio から CTA を選択
 * @param {Object} opts
 * @param {number} [opts.poll_ratio] - poll_yes / (poll_yes + poll_no)、0–1
 * @param {string} [opts.narrative_tag] - FOMO, FUD, ATH, CRASH 等
 * @param {string} [opts.lang]
 * @returns {string} CTA tag: FOMO_RIDE | FUD_ESCAPE | ATH_SURGE | NEUTRAL
 */
function selectCTA(opts = {}) {
  const { poll_ratio, narrative_tag, lang } = opts;
  const tag = (narrative_tag || "").toUpperCase();
  const ratio = Number(poll_ratio);

  if (tag === "FOMO" && !Number.isNaN(ratio) && ratio > 0.55) return "FOMO_RIDE";
  if (tag === "FUD" && !Number.isNaN(ratio) && ratio < 0.45) return "FUD_ESCAPE";
  if (tag === "ATH" && !Number.isNaN(ratio) && ratio > 0.5) return "FOMO_RIDE";

  const normalizedLang = (lang || "en").replace("pt-br", "pt").toLowerCase();
  return LANG_DEFAULT_CTA[normalizedLang] || "FOMO_RIDE";
}

module.exports = { selectCTA, LANG_DEFAULT_CTA };
