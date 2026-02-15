/**
 * Trap Defence OS v5.0 — 言語別トーンアダプタ
 * FUD/FOMO/ATH を言語心理に合わせて調整
 */

/**
 * @param {Object} base - { hook, body, cta }
 * @param {string} lang
 * @returns {Object} { hook, body, cta }
 */
function adaptToneByLang(base, lang) {
  const out = { ...base };
  const l = (lang || "en").replace("pt-br", "pt").toLowerCase();

  switch (l) {
    case "ja":
      out.hook = (out.hook || "").replace(/\?/g, "。").replace(/!/g, "。");
      out.hook = "「気づいたときには遅い」その前に──" + (out.hook || "");
      out.body = (out.body || "").replace(/wave/g, "罠と波");
      break;

    case "ko":
      out.hook = "지금 이 순간, 놓치면 끝이다. " + (out.hook || "");
      out.cta = (out.cta || "").replace(/Join/g, "지금 바로 올라타기");
      break;

    case "es":
      out.hook = (out.hook || "").replace(/move/g, "ola").replace(/ATH/g, "máximo histórico");
      out.cta = (out.cta || "").replace(/wave/g, "ola");
      break;

    case "pt":
      out.hook = (out.hook || "").replace(/ATH/g, "topo histórico");
      break;

    case "ar":
      out.hook = (out.hook || "").slice(0, 80);
      out.body = (out.body || "").slice(0, 160);
      break;

    default:
      break;
  }

  return out;
}

module.exports = { adaptToneByLang };
