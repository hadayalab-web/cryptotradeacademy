/**
 * PQT 用 proof スニペット（1〜2行）
 * trap_score_label / funding_state / netflow_state のみ。Dr.Grok セールスレターは廃止。
 */
const PHRASES_BY_LANG = {
  en: {
    trap: (label) => `Trap score: ${label}.`,
    funding: (s) => `Funding: ${s}.`,
    netflow: (s) => `Netflow: ${s}.`
  },
  ja: {
    trap: (label) => `トラップスコア: ${label}.`,
    funding: (s) => `資金調達: ${s}.`,
    netflow: (s) => `ネットフロー: ${s}.`
  },
  es: {
    trap: (label) => `Trap score: ${label}.`,
    funding: (s) => `Funding: ${s}.`,
    netflow: (s) => `Netflow: ${s}.`
  },
  pt: {
    trap: (label) => `Trap score: ${label}.`,
    funding: (s) => `Funding: ${s}.`,
    netflow: (s) => `Netflow: ${s}.`
  },
  ko: {
    trap: (label) => `트랩 스코어: ${label}.`,
    funding: (s) => `Funding: ${s}.`,
    netflow: (s) => `Netflow: ${s}.`
  },
  ar: {
    trap: (label) => `Trap score: ${label}.`,
    funding: (s) => `Funding: ${s}.`,
    netflow: (s) => `Netflow: ${s}.`
  }
};

/**
 * スナップショットから 1〜2 行の proof 文を生成
 * @param {Object} snapshot - getBtcSnapshot() 形式（trapScore, fundingRate, netflowState 等）
 * @param {string} lang
 * @param {Object} slot - 任意（coin_symbol 等あれば使う）
 */
function buildProofSnippetFromSnapshot(snapshot, lang, slot = {}) {
  const L = PHRASES_BY_LANG[lang] || PHRASES_BY_LANG.en;
  const trap_label = snapshot?.trap_score_label ?? snapshot?.trapScore ?? "—";
  const funding = snapshot?.funding_state ?? snapshot?.fundingRate ?? "—";
  const netflow = snapshot?.netflow_state ?? snapshot?.netflowState ?? "—";

  const parts = [];
  if (trap_label && trap_label !== "—") parts.push(L.trap(trap_label));
  if (funding && funding !== "—") parts.push(L.funding(funding));
  if (netflow && netflow !== "—") parts.push(L.netflow(netflow));

  return parts.slice(0, 2).join(" ") || "—";
}

module.exports = { buildProofSnippetFromSnapshot, PHRASES_BY_LANG };
