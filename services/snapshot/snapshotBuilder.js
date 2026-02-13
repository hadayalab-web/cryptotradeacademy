/**
 * Phase 3: Trap Defence snapshotBuilder — Stage 5 (Gemini) & Stage 6 (Dr.Grok base)
 * Runs ALWAYS (deliveryMode-independent). Stage 5/6 outputs are merged into btcSnapshot.
 */

const { generateSosovalueStyleArticle } = require("../gemini/sosovalueArticle");
const { analyzeMarket } = require("../grok/client");

/**
 * Stage 5: Gemini SoSoValue-style article (EN fixed, 1 call)
 * @param {Object} partial - { raw, cqDeep }
 * @returns {Promise<string|null>}
 */
async function runStage5(partial) {
  if (!partial?.raw) return null;
  const raw = partial.raw || {};
  const cqDeep = partial.cqDeep || {};
  const cqData = {
    priceUsd: raw.priceUsd,
    change24h: raw.change24h,
    inflow: raw.inflow ?? cqDeep.exchangeNetflow,
    mpi: raw.mpi ?? cqDeep.minerMPI ?? cqDeep.mpi,
    trapScore: cqDeep.trapScore ?? null
  };
  try {
    const article = await generateSosovalueStyleArticle({
      cqData,
      lang: "en" // Q3: EN fixed
    });
    return article;
  } catch (e) {
    console.warn("[snapshotBuilder] Stage 5 (Gemini) failed:", e?.message);
    return null;
  }
}

/**
 * Stage 6: Dr.Grok base analysis (EN fixed, 1 call)
 * @param {Object} partial - { raw, cqDeep, xSentiment, trapDetection, trap, tradeSignal, market_score }
 * @param {Function} getMarketCode - (lang) => marketCode
 * @returns {Promise<{ base: string }|null>}
 */
async function runStage6(partial, getMarketCode) {
  if (!partial?.raw) return null;
  const raw = partial.raw || {};
  const cqDeep = partial.cqDeep || {};
  const xSentiment = partial.xSentiment || { whaleBias: 0, retailFomo: 50 };
  const trap = partial.trap || {};
  const trapDetection = partial.trapDetection || null;
  const marketSummaryPayload = {
    asset: "BTC",
    inflow: raw.inflow ?? cqDeep.exchangeNetflow ?? 0,
    mpi: raw.mpi ?? cqDeep.minerMPI ?? cqDeep.mpi ?? 0,
    sentiment: raw.sentimentLabel ?? "Unknown",
    priceUsd: raw.priceUsd,
    change24h: raw.change24h,
    xSentiment,
    score: partial.market_score ?? 0,
    signal: partial.tradeSignal?.signal ?? "STANDBY",
    tp: partial.tradeSignal?.tp,
    sl: partial.tradeSignal?.sl,
    trap
  };
  const trapInfo = trapDetection
    ? {
        trapSeverity: trapDetection.trapSeverity || "NONE",
        trapScore: trapDetection.trapScore || 0,
        trapType: trapDetection.trapType || null
      }
    : null;
  try {
    const base = await analyzeMarket(
      JSON.stringify(marketSummaryPayload),
      JSON.stringify(xSentiment),
      "en", // Q4: EN fixed
      getMarketCode ? getMarketCode("en") : "EN",
      cqDeep,
      trapInfo
    );
    return base != null ? { base } : null;
  } catch (e) {
    console.warn("[snapshotBuilder] Stage 6 (Dr.Grok base) failed:", e?.message);
    return null;
  }
}

/**
 * Run Stage 5 and 6 (always, deliveryMode-independent)
 * @param {Object} partial - partial snapshot with raw, cqDeep, xSentiment, trapDetection, trap, tradeSignal, market_score
 * @param {Function} [getMarketCode] - (lang) => marketCode
 * @returns {Promise<{ sosovalueArticle: string|null, drGrok: { base: string }|null }>}
 */
async function runStages5And6(partial, getMarketCode) {
  const [sosovalueArticle, drGrok] = await Promise.all([
    runStage5(partial),
    runStage6(partial, getMarketCode)
  ]);
  return { sosovalueArticle: sosovalueArticle || null, drGrok: drGrok || null };
}

module.exports = {
  runStage5,
  runStage6,
  runStages5And6
};
