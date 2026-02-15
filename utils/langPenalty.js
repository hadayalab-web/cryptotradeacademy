/**
 * Trap Defence OS — 低CTR言語の投稿頻度抑制（chain_raid:lang_penalty）
 * refresh-chain-raid-mv が 5 分ごとに KV に書き込み
 */

const { getKV } = require("./kv");

const LANG_PENALTY_KV_KEY = "chain_raid:lang_penalty";

/**
 * 言語別 penalty を取得（0.5 = 50% 抑制、1.0 = 通常）
 * @returns {Promise<Record<string, number>>}
 */
async function getLangPenalty() {
  const kv = getKV();
  if (!kv) return {};
  try {
    const raw = await kv.get(LANG_PENALTY_KV_KEY);
    if (!raw) return {};
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}

/**
 * 指定言語の penalty（1.0 = 通常、0.5 = 50% 抑制）
 */
async function getPenaltyForLang(lang) {
  const penalty = await getLangPenalty();
  return penalty[lang] ?? 1.0;
}

/** getLangPenaltyMap: getLangPenalty のエイリアス */
const getLangPenaltyMap = getLangPenalty;

module.exports = { getLangPenalty, getLangPenaltyMap, getPenaltyForLang };
