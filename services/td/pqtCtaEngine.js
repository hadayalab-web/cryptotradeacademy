/**
 * PQT CTR 最大化: テンプレ選択（簡易バンディット）＋ buildPqt ＋ 結果記録
 * Grok Secret Weapons: applySecretWeaponsFormat（link 改行・末尾句点削除・字数制限なし X Premium）、Mirror vocab
 */
const { PQT_TEMPLATES, PQT_TEMPLATES_BOT, PQT_TEMPLATES_3PATTERNS, getPatternFromDangerLabelWithJitter } = require("./pqtTemplates");
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
 * テンプレ設計: docs/PQT_DESIGN_BASED_ON_GEMINI_ANALYSIS.md に基づく。対象はすべて仕手Bot投稿へのリプライ。
 * dangerLabel あり → 3パターン集約（パターン=1メッセージ）: fear/authority/elitism のいずれか1本を選択。
 * dangerLabel なし → 従来: useBotTemplates で PQT_TEMPLATES_BOT（4本） or PQT_TEMPLATES（8本）からバンディット選択。
 */
function buildPqt(lang, context) {
  const mirrorWords = context.mirrorWords ?? (context.quotedText ? extractMirrorWords(context.quotedText, lang) : "");
  const ctx = { ...context, mirrorWords };

  if (context.dangerLabel != null && context.dangerLabel !== "") {
    const pattern = getPatternFromDangerLabelWithJitter(context.dangerLabel);
    const byPattern = PQT_TEMPLATES_3PATTERNS[lang] || PQT_TEMPLATES_3PATTERNS.en;
    const templateFn = byPattern[pattern] || byPattern.elitism;
    if (templateFn && typeof templateFn === "function") {
      let text = templateFn(ctx);
      if (context.link && text) text = applySecretWeaponsFormat(text, context.link);
      return { text, templateIndex: 0, useBotTemplates: false, pattern };
    }
  }

  const useBot = context.useBotTemplates === true;
  const templates = useBot && PQT_TEMPLATES_BOT[lang]
    ? PQT_TEMPLATES_BOT[lang]
    : PQT_TEMPLATES[lang];
  if (!templates || templates.length === 0) return null;
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
