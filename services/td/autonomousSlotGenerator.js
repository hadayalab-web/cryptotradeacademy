/**
 * Trap Defence OS v5.5 入口 — 最適スロット 1 個を自律生成
 * cluster / narrative / CTA / lang / weight を一括で決定
 * v5.5: ナラティブは市場スナップショットから直接判定（72hローテーションを廃止）
 */

const { getGoldClusters } = require("../../utils/supabase");
const { detectNarrativeFromSnapshot } = require("../narrative/narrativeDetector");
const { getBtcSnapshot } = require("../market/getBtcSnapshot");
const { selectCTA } = require("../cta/psychDynamicCta");
const { computeQueueWeightForSlot } = require("../scheduler/peakClusterScheduler");

const CANDIDATE_LANGS = ["ko", "ja", "es", "en", "pt", "ar"];

/**
 * 最大 cluster_size の金クラスタを選択
 */
function pickBestCluster(clusters) {
  if (!clusters?.length) return null;
  return [...clusters].sort((a, b) => (b.cluster_size ?? 0) - (a.cluster_size ?? 0))[0];
}

/**
 * 各言語の weight を比較し最適言語を返す
 */
async function pickBestLangForCluster(clusterId, candidateLangs) {
  const now = new Date();
  const slots = await Promise.all(
    candidateLangs.map(async (lang) => {
      const slot = {
        lang,
        cluster_id: clusterId,
        datetime_jst: now.toISOString()
      };
      const weight = await computeQueueWeightForSlot(slot);
      return { ...slot, weight };
    })
  );
  const sorted = slots.sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1));
  return sorted[0]?.lang ?? candidateLangs[0];
}

/**
 * 最適スロット 1 個を構築（cluster / narrative / CTA / lang / weight）
 * v5.5: ナラティブは市場スナップショットから直接判定
 * @returns {Promise<Object|null>}
 */
async function buildBestSlot() {
  const snapshot = await getBtcSnapshot();
  const narrative_tag = detectNarrativeFromSnapshot(snapshot);

  const clusters = await getGoldClusters();
  const bestCluster = pickBestCluster(clusters);
  const clusterId = bestCluster?.cluster_id ? String(bestCluster.cluster_id) : null;

  const lang = clusterId
    ? await pickBestLangForCluster(clusterId, CANDIDATE_LANGS)
    : CANDIDATE_LANGS[Math.floor(Date.now() / 60000) % CANDIDATE_LANGS.length];

  const cta_type = selectCTA({
    poll_ratio: 0.5,
    narrative_tag,
    lang
  });

  const now = new Date();
  const oneMinLater = new Date(now.getTime() + 60 * 1000);
  const slot = {
    lang,
    cluster_id: clusterId,
    narrative_tag,
    cta_type,
    datetime_jst: oneMinLater.toISOString(),
    target_type: "flexible",
    mode: "regular"
  };

  const weight = await computeQueueWeightForSlot(slot);
  return { ...slot, weight };
}

module.exports = { buildBestSlot, pickBestCluster, pickBestLangForCluster };
