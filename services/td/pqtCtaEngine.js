/**
 * PQT CTR 最大化: テンプレ選択（簡易バンディット）＋ buildPqt ＋ 結果記録
 * Grok Secret Weapons: applySecretWeaponsFormat（link 改行・末尾句点削除・字数制限なし X Premium）、Mirror vocab
 */
const { PQT_TEMPLATES, PQT_TEMPLATES_BOT } = require("./pqtTemplates");
const { extractMirrorWords, applySecretWeaponsFormat } = require("./pqtSecretWeapons");

const templateStats = {};

function getOrInitStats(lang, statsKey) {
  const key = statsKey != null ? statsKey : lang;
  if (!templateStats[key]) templateStats[key] = [];
  return templateStats[key];
}

function pickTemplateIndex(lang, templates, statsKey) {
  const key = statsKey != null ? statsKey : lang;
  const stats = getOrInitStats(lang, key);
  const set = templates || PQT_TEMPLATES[lang] || [];
  if (set.length === 0) return 0;
  if (set.length === 1) return 0;
  if (stats.length < set.length) return stats.length;
  let bestIdx = 0;
  let bestCtr = 0;
  for (let idx = 0; idx < set.length; idx++) {
    const s = stats[idx] || { uses: 0, clicks: 0 };
    const ctr = s.uses > 0 ? s.clicks / s.uses : 0;
    if (ctr > bestCtr) {
      bestCtr = ctr;
      bestIdx = idx;
    }
  }
  return bestIdx;
}

/**
 * テンプレは手書きのため、本文を切り詰めずそのまま投稿する（X Premium・字数制限なし）。
 * applySecretWeaponsFormat はリンク改行・末尾句点削除のみで、文字数制限は行わない。
 * context.useBotTemplates === true のときは仕手Bot攻略用テンプレ（同意フック＋短い本文）を使用。
 */
function buildPqt(lang, context) {
  const useBot = context.useBotTemplates === true;
  const templates = useBot && PQT_TEMPLATES_BOT[lang]
    ? PQT_TEMPLATES_BOT[lang]
    : PQT_TEMPLATES[lang];
  if (!templates || templates.length === 0) return null;
  const mirrorWords = context.mirrorWords ?? (context.quotedText ? extractMirrorWords(context.quotedText, lang) : "");
  const ctx = { ...context, mirrorWords };
  const statsKey = useBot ? lang + "_bot" : undefined;
  const idx = pickTemplateIndex(lang, templates, statsKey);
  let text = templates[idx](ctx);
  if (context.link && text) text = applySecretWeaponsFormat(text, context.link);
  return { text, templateIndex: idx, useBotTemplates: useBot };
}

function recordPqtResult(lang, templateIndex, clicks, statsKey) {
  const key = statsKey != null ? statsKey : lang;
  const stats = getOrInitStats(lang, key);
  while (stats.length <= templateIndex) stats.push({ uses: 0, clicks: 0 });
  stats[templateIndex].uses += 1;
  stats[templateIndex].clicks += clicks || 0;
}

function recordPqtUse(lang, templateIndex, statsKey) {
  recordPqtResult(lang, templateIndex, 0, statsKey);
}

function getTemplateStats() {
  return { ...templateStats };
}

module.exports = {
  buildPqt,
  recordPqtResult,
  recordPqtUse,
  pickTemplateIndex,
  getTemplateStats
};
