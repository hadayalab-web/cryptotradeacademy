/**
 * BuzzDefence Engine v4.1 — KIBA + CQ Chain Integration
 * v4 を拡張し、CHAIN_RAID（chain_data / fusion_score）をサポート。
 * runBuzzDefenceV41Cycle は runBuzzDefenceV4Cycle の alias（v4 が mode=v4_chain でログ済み）。
 */

const v4 = require("./buzzDefenceEngineV4");

/**
 * runBuzzDefenceV41Cycle: v4.1 パイプライン（chain モード用エントリ）
 * v4.runBuzzDefenceV4Cycle を呼び、chain_data / fusion_score を結果に付与。
 */
async function runBuzzDefenceV41Cycle(structuredPost, quotedTweetId, options = {}) {
  const result = await v4.runBuzzDefenceV4Cycle(structuredPost, quotedTweetId, options);
  return {
    ...result,
    chain_data: structuredPost.chain_data || null,
    fusion_score: structuredPost.fusion_score ?? null
  };
}

module.exports = {
  ...v4,
  runBuzzDefenceV41Cycle
};
