/**
 * Phase 4: Alt adapter — CQ schema-based (alt market aggregate)
 */
const { fetchFromCQ, extractValue } = require("./sharedAdapterUtils");

async function fetchRaw() {
  const supplyPoint = await fetchFromCQ("Alt", "Market-Data", "supply", { window: "day", limit: 1 }).catch(() => null);
  return {
    inflow: 0,
    mpi: null,
    priceUsd: null,
    change24h: null,
    sentimentLabel: "Unknown",
    fng: null
  };
}

async function fetchCQDeep() {
  const supply = await fetchFromCQ("Alt", "Market-Data", "supply", { window: "day", limit: 1 }).catch(() => null);
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
    asset: "ALT",
    as_of_utc: new Date().toISOString(),
    raw,
    cqDeep: Object.keys(cqDeep || {}).length ? cqDeep : null
  };
}

module.exports = { fetchRaw, fetchCQDeep, fetchAssetSnapshot };
