/**
 * Phase 4: Shared asset snapshot schema
 * Multi-asset: BTC, ETH, SOL, NASDAQ, GOLD
 */
const VALID_ASSETS = ["BTC", "ETH", "SOL", "XRP", "TRX", "STABLECOIN", "ERC20", "ALT", "NASDAQ", "GOLD"];

function assetSnapshotKvKey(assetCode) {
  return `asset:snapshot:${String(assetCode).toUpperCase()}`;
}

/**
 * Build asset snapshot (same shape as btcSnapshot, asset-agnostic)
 */
function buildAssetSnapshot(params) {
  const {
    asset_code,
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
    diff
  } = params;

  return {
    asset_code: asset_code || "BTC",
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
    diff: diff ?? null
  };
}

module.exports = {
  VALID_ASSETS,
  assetSnapshotKvKey,
  buildAssetSnapshot
};
