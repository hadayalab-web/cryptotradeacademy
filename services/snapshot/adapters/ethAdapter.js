/**
 * Phase 4: ETH adapter - CQ schema-based, snapshot-native
 */
const { fetchPriceFromCoinGecko, fetchFromCQ, extractValue } = require("./sharedAdapterUtils");

async function fetchRaw() {
  const [priceMeta, netflowPoint] = await Promise.all([
    fetchPriceFromCoinGecko("ETH"),
    fetchFromCQ("ETH", "Exchange-Flows", "netflow", { window: "day", limit: 1 })
  ]);

  const inflow = extractValue(netflowPoint, "netflow", "netflow_total", "value") ?? 0;
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
  const [sopr, netflow, reserve] = await Promise.all([
    fetchFromCQ("ETH", "Market-Indicator", "sopr", { window: "day", limit: 1 }),
    fetchFromCQ("ETH", "Exchange-Flows", "netflow", { window: "day", limit: 1 }),
    fetchFromCQ("ETH", "Exchange-Flows", "reserve", { window: "day", limit: 1 })
  ]);

  return {
    whaleRatio: null,
    sopr: extractValue(sopr, "sopr", "value"),
    nupl: null,
    funding: null,
    openInterest: null,
    liquidity: null,
    minerFlows: null,
    stablecoinMetrics: null,
    etfFlows: null,
    exchangeFlowsDetailed: netflow || reserve ? { netflow: extractValue(netflow, "netflow", "value"), reserve: extractValue(reserve, "reserve", "value") } : null
  };
}

async function fetchAssetSnapshot() {
  const [raw, cqDeep] = await Promise.all([fetchRaw(), fetchCQDeep().catch(() => ({}))]);
  return {
    asset: "ETH",
    as_of_utc: new Date().toISOString(),
    raw,
    cqDeep: Object.keys(cqDeep || {}).length ? cqDeep : null
  };
}

module.exports = { fetchRaw, fetchCQDeep, fetchAssetSnapshot };
