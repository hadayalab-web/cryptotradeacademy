/**
 * Trap Defence Unified OS — btcSnapshot schema and constants
 * Single source of truth for the shared data object consumed by Minimal, Regular, BWE. (Emergency は廃止)
 */

const BTC_SNAPSHOT_KV_KEY = "btc:snapshot";
const BTC_SNAPSHOT_EARLY_KV_KEY = "btc:snapshot:early";
const BTC_SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h for BWE freshness

/**
 * Assemble a minimal btcSnapshot from raw stage (for early KV write).
 * @param {Object} raw - { inflow, mpi, priceUsd, change24h, sentimentLabel, fng? }
 * @param {number} market_score - derived score (e.g. from buildMarketContext + decideSignal)
 * @param {Object} trap - basic trap from detectTrap
 * @returns {Object} btcSnapshot (early)
 */
function buildEarlySnapshot(raw, market_score, trap = null) {
  const snapshot_id = `snapshot_${Date.now()}`;
  const as_of_utc = new Date().toISOString();
  return {
    snapshot_id,
    as_of_utc,
    raw: raw || {},
    market_score: market_score ?? 0,
    trapDetection: trap ? { trapScore: trap.confidence === "HIGH" ? 80 : trap.confidence === "MEDIUM" ? 50 : 30, isTrap: trap.isTrap } : null
  };
}

/**
 * Build full btcSnapshot from all stages (for KV full write and DB history).
 * @param {Object} params - all stage outputs
 * @returns {Object} btcSnapshot
 */
function buildFullSnapshot(params) {
  const {
    snapshot_id,
    as_of_utc,
    raw,
    cqDeep,
    xSentiment,
    highResX,
    gptStructureReasoning,
    gptScenarioMap,
    gptTrapInterpretation,
    sosovalueArticle,
    drGrok,
    trapDetection,
    trapAlert,
    divergenceSignal,
    market_score,
    tradeSignal,
    meta,
    marketRegime,
    diff,
    macroContext
  } = params;

  return {
    snapshot_id: snapshot_id || `snapshot_${Date.now()}`,
    as_of_utc: as_of_utc || new Date().toISOString(),
    raw: raw || {},
    cqDeep: cqDeep || null,
    xSentiment: xSentiment || null,
    highResX: highResX || null,
    gptStructureReasoning: gptStructureReasoning ?? null,
    gptScenarioMap: gptScenarioMap ?? null,
    gptTrapInterpretation: gptTrapInterpretation ?? null,
    sosovalueArticle: sosovalueArticle ?? null,
    drGrok: drGrok ?? null,
    trapDetection: trapDetection || null,
    trapAlert: trapAlert || null,
    divergenceSignal: divergenceSignal || null,
    market_score: market_score ?? 0,
    tradeSignal: tradeSignal || null,
    meta: meta || null,
    marketRegime: marketRegime ?? null,
    diff: diff ?? null,
    macroContext: macroContext ?? null
  };
}

/**
 * Convert btcSnapshot to DB row shape for insertBtcSnapshot.
 * @param {Object} snapshot - btcSnapshot
 * @returns {Object} row for Supabase
 */
/**
 * btc_snapshots テーブルに diff カラムがないため insert からは除外。
 * 将来カラムを追加したら diff: snapshot.diff ?? null を戻す。
 */
function snapshotToDbRow(snapshot) {
  return {
    snapshot_id: snapshot.snapshot_id,
    as_of_utc: snapshot.as_of_utc,
    raw: snapshot.raw,
    cq_deep: snapshot.cqDeep ?? null,
    x_sentiment: snapshot.xSentiment ?? null,
    high_res_x: snapshot.highResX ?? null,
    gpt_structure_reasoning: snapshot.gptStructureReasoning ?? null,
    gpt_scenario_map: snapshot.gptScenarioMap ?? null,
    gpt_trap_interpretation: snapshot.gptTrapInterpretation ?? null,
    sosovalue_article: snapshot.sosovalueArticle ?? null,
    dr_grok: snapshot.drGrok ?? null,
    trap_detection: snapshot.trapDetection ?? null,
    trap_alert: snapshot.trapAlert ?? null,
    divergence_signal: snapshot.divergenceSignal ?? null,
    market_score: snapshot.market_score ?? null,
    trade_signal: snapshot.tradeSignal ?? null,
    meta: snapshot.meta ?? null,
    market_regime: snapshot.marketRegime ?? null
  };
}

module.exports = {
  BTC_SNAPSHOT_KV_KEY,
  BTC_SNAPSHOT_EARLY_KV_KEY,
  BTC_SNAPSHOT_MAX_AGE_MS,
  buildEarlySnapshot,
  buildFullSnapshot,
  snapshotToDbRow
};
