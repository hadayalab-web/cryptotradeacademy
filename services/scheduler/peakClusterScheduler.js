/**
 * Trap Defence OS v4.2+ — peak_hours × 金クラスタ × langPenalty スケジューラ
 * 言語別ピーク時間・金クラスタ・低CTR抑制で queue weight を計算
 */

const { PEAK_HOURS_BY_LANG, isPeakHourForLang } = require("../snapshot/fishermenClusterSchema");
const { getGoldClusters } = require("../../utils/supabase");
const { getPenaltyForLang, getLangPenalty } = require("../../utils/langPenalty");

/**
 * UTC で現在がピーク時間か
 */
function isPeakHour(lang) {
  const utcHour = new Date().getUTCHours();
  return isPeakHourForLang(lang, utcHour);
}

/**
 * 指定日の datetime_jst から UTC hour を取得（スロット用）
 */
function getUtcHourFromSlot(slot) {
  if (!slot?.datetime_jst) return new Date().getUTCHours();
  return new Date(slot.datetime_jst).getUTCHours();
}

/**
 * スロットがピーク時間か（datetime_jst ベース）
 */
function isPeakHourForSlot(slot) {
  const lang = slot?.lang || "en";
  const utcHour = getUtcHourFromSlot(slot);
  return isPeakHourForLang(lang, utcHour);
}

/**
 * 金クラスタ ID 一覧を取得（cluster_id の Set）
 */
async function getGoldClusterIds() {
  const clusters = await getGoldClusters();
  const ids = new Set((clusters || []).map((r) => String(r.cluster_id || "")).filter(Boolean));
  return ids;
}

/**
 * 投稿の queue weight を計算（peak × gold × penalty）
 * @param {string} lang
 * @param {string} [clusterId] - botnet_cluster_id or cluster_id
 * @returns {Promise<number>} 0.5 | 1 | 2 | 4（penalty により 0.5 倍もあり得る）
 */
async function computeQueueWeight(lang, clusterId) {
  const peak = isPeakHour(lang);
  const goldIds = await getGoldClusterIds();
  const isGold = clusterId && goldIds.has(String(clusterId));

  let base = 1;
  if (peak && isGold) base = 4;
  else if (peak || isGold) base = 2;

  const penalty = await getPenaltyForLang(lang);
  return base * penalty;
}

/**
 * スロット一覧を weight 降順でソート（buzzweave-slots 統合用）
 * clusterId はスロットに含まれないため peak × penalty のみ
 * @param {Array<{id?, datetime_jst, lang, target_type?, mode?}>} slots
 * @returns {Promise<Array<{...slot, _weight: number}>>}
 */
async function sortSlotsByWeight(slots) {
  if (!slots?.length) return [];
  const penaltyMap = await getLangPenalty();
  const goldIds = await getGoldClusterIds();

  const withWeight = slots.map((s) => {
    const peak = isPeakHourForSlot(s);
    const isGold = s.cluster_id && goldIds.has(String(s.cluster_id));
    let base = 1;
    if (peak && isGold) base = 4;
    else if (peak || isGold) base = 2;
    const penalty = penaltyMap[s.lang] ?? 1.0;
    return { ...s, _weight: base * penalty };
  });

  return withWeight.sort((a, b) => (b._weight ?? 0) - (a._weight ?? 0));
}

/**
 * スロット 1 件の weight を計算（自律化用）
 * @param {{ lang, datetime_jst?, cluster_id? }} slot
 * @returns {Promise<number>}
 */
async function computeQueueWeightForSlot(slot) {
  if (!slot) return 1;
  return computeQueueWeight(slot.lang || "en", slot.cluster_id ?? null);
}

/**
 * 同期版（金クラスタ事前取得済み）
 * @param {string} lang
 * @param {string} [clusterId]
 * @param {Set<string>} goldClusterIds
 * @param {number} [penalty]
 */
function computeQueueWeightSync(lang, clusterId, goldClusterIds, penalty = 1.0) {
  const peak = isPeakHour(lang);
  const isGold = clusterId && goldClusterIds && goldClusterIds.has(String(clusterId));
  const base = peak && isGold ? 4 : peak || isGold ? 2 : 1;
  return base * penalty;
}

module.exports = {
  PEAK_HOURS_BY_LANG,
  isPeakHour,
  isPeakHourForSlot,
  getGoldClusterIds,
  computeQueueWeight,
  computeQueueWeightForSlot,
  computeQueueWeightSync,
  sortSlotsByWeight
};
