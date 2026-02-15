/**
 * Trap Defence OS — Poll → CTA A/B テスト（自動勝者プロモート）
 */

const { getSupabase } = require("../../utils/supabase");

/**
 * 2 投稿の CTR を比較し勝者を返す
 * @param {string} postIdA
 * @param {string} postIdB
 * @returns {Promise<"A"|"B"|null>}
 */
async function selectWinningCTA(postIdA, postIdB) {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const [resA, resB] = await Promise.all([
      sb.from("chain_raid_post_kpi").select("ctr").eq("post_id", String(postIdA)).single(),
      sb.from("chain_raid_post_kpi").select("ctr").eq("post_id", String(postIdB)).single()
    ]);

    const ctrA = Number(resA?.data?.ctr) || 0;
    const ctrB = Number(resB?.data?.ctr) || 0;

    if (ctrA > ctrB) return "A";
    if (ctrB > ctrA) return "B";
    return null;
  } catch {
    return null;
  }
}

module.exports = { selectWinningCTA };
