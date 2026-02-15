/**
 * Trap Defence OS — 72h ナラティブローテ（FOMO → ATH → CRASH）
 * 6h ごとに次のナラティブへ
 */

const CYCLE = ["FOMO", "ATH", "CRASH"];

/**
 * 次のナラティブを取得
 * @param {number} currentIndex - 0-based
 * @returns {string}
 */
function nextNarrative(currentIndex = 0) {
  return CYCLE[(currentIndex + 1) % CYCLE.length];
}

/**
 * 現在インデックスからナラティブ名を取得
 */
function getNarrativeByIndex(index) {
  return CYCLE[Number(index) % CYCLE.length] || CYCLE[0];
}

/** getNarrativeFromIndex: getNarrativeByIndex のエイリアス */
const getNarrativeFromIndex = getNarrativeByIndex;

module.exports = { nextNarrative, getNarrativeByIndex, getNarrativeFromIndex, CYCLE };
