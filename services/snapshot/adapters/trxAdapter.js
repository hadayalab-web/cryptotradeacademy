/**
 * Phase 4: TRX adapter - CQ schema-based, snapshot-native
 */
const { fetchPriceFromCoinGecko, fetchFromCQ } = require("./sharedAdapterUtils");

async function fetchRaw() {
  const priceMeta = await fetchPriceFromCoinGecko("TRX");
  return {
    inflow: 0,
    mpi: null,
    priceUsd: priceMeta?.priceUsd ?? null,
    change24h: priceMeta?.change24h ?? null,
    sentimentLabel: "Unknown",
    fng: null
  };
}

async function fetchCQDeep() {
  return {
    whaleRatio: null,
    sopr: null,
    nupl: null,
    funding: null,
    openInterest: null,
    liquidity: null,
    minerFlows: null,
    stablecoinMetrics: null,
    etfFlows: null,
    exchangeFlowsDetailed: null
  };
}

async function fetchAssetSnapshot() {
  const [raw, cqDeep] = await Promise.all([fetchRaw(), fetchCQDeep().catch(() => ({}))]);
  return {
    asset: "TRX",
    as_of_utc: new Date().toISOString(),
    raw,
    cqDeep: Object.keys(cqDeep || {}).length ? cqDeep : null
  };
}

module.exports = { fetchRaw, fetchCQDeep, fetchAssetSnapshot };
