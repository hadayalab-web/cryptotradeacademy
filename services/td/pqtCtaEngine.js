/**
 * PQT CTR 最大化: テンプレ選択（簡易バンディット）＋ buildPqt ＋ 結果記録
 */
const { PQT_TEMPLATES } = require("./pqtTemplates");

const templateStats = {};

function getOrInitStats(lang) {
  if (!templateStats[lang]) templateStats[lang] = [];
  return templateStats[lang];
}

function pickTemplateIndex(lang) {
  const stats = getOrInitStats(lang);
  const templates = PQT_TEMPLATES[lang] || [];
  if (templates.length === 0) return 0;
  if (templates.length === 1) return 0;
  if (stats.length < templates.length) return stats.length;
  let bestIdx = 0;
  let bestCtr = 0;
  for (let idx = 0; idx < templates.length; idx++) {
    const s = stats[idx] || { uses: 0, clicks: 0 };
    const ctr = s.uses > 0 ? s.clicks / s.uses : 0;
    if (ctr > bestCtr) {
      bestCtr = ctr;
      bestIdx = idx;
    }
  }
  return bestIdx;
}

function buildPqt(lang, context) {
  const templates = PQT_TEMPLATES[lang];
  if (!templates || templates.length === 0) return null;
  const idx = pickTemplateIndex(lang);
  const text = templates[idx](context);
  return { text, templateIndex: idx };
}

function recordPqtResult(lang, templateIndex, clicks) {
  const stats = getOrInitStats(lang);
  while (stats.length <= templateIndex) stats.push({ uses: 0, clicks: 0 });
  stats[templateIndex].uses += 1;
  stats[templateIndex].clicks += clicks || 0;
}

function recordPqtUse(lang, templateIndex) {
  recordPqtResult(lang, templateIndex, 0);
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
