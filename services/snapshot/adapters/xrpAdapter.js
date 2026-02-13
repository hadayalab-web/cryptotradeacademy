/**
 * Phase 4: XRP adapter - CQ schema-based, snapshot-native
 */
const { fetchPriceFromCoinGecko, fetchFromCQ, extractValue } = require("./sharedAdapterUtils");

async function fetchRaw() {
  const [priceMeta, netflowPoint] = await Promise.all([
    fetchPriceFromCoinGecko("XRP"),
    fetchFromCQ("XRP", "Entity-Flows", "inflow", { window: "day", limit: 1 }).catch(() => null)
  ]);

  const inflow = extractValue(netflowPoint, "inflow", "value") ?? 0;
  return {
    inflow,
    mpi: null,
    priceUsd: priceMeta?.priceUsd ?? null,
    change24h: priceMeta?.change24h ?? null,
    sentimentLabel: "Unknown",
    fng: null
  };
}

async function fetchCQDeep() {
  const supplyRatio = await fetchFromCQ("XRP", "Flow-Indicator", "exchange_supply_ratio", { window: "day", limit: 1 }).catch(() => null);
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
    exchangeFlowsDetailed: supplyRatio ? { exchangeSupplyRatio: extractValue(supplyRatio, "exchange_supply_ratio", "value") } : null
  };
}

async function fetchAssetSnapshot() {
  const [raw, cqDeep] = await Promise.all([fetchRaw(), fetchCQDeep().catch(() => ({}))]);
  return {
    asset: "XRP",
    as_of_utc: new Date().toISOString(),
    raw,
    cqDeep: Object.keys(cqDeep || {}).length ? cqDeep : null
  };
}

module.exports = { fetchRaw, fetchCQDeep, fetchAssetSnapshot };
