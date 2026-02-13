/**
 * Phase 4: ERC20 adapter — CQ schema-based (generic ERC20 metrics)
 */
const { fetchFromCQ, extractValue } = require("./sharedAdapterUtils");

async function fetchRaw() {
  const [reserve, netflow] = await Promise.all([
    fetchFromCQ("ERC20", "Exchange-Flows", "reserve", { window: "day", limit: 1 }).catch(() => null),
    fetchFromCQ("ERC20", "Exchange-Flows", "netflow", { window: "day", limit: 1 }).catch(() => null)
  ]);

  const inflow = extractValue(netflow, "netflow", "value") ?? 0;
  return {
    inflow,
    mpi: null,
    priceUsd: null,
    change24h: null,
    sentimentLabel: "Unknown",
    fng: null
  };
}

async function fetchCQDeep() {
  const [netflow, supplyRatio] = await Promise.all([
    fetchFromCQ("ERC20", "Exchange-Flows", "netflow", { window: "day", limit: 1 }).catch(() => null),
    fetchFromCQ("ERC20", "Flow-Indicator", "exchange_supply_ratio", { window: "day", limit: 1 }).catch(() => null)
  ]);

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
    exchangeFlowsDetailed: netflow ? { netflow: extractValue(netflow, "netflow", "value") } : null
  };
}

async function fetchAssetSnapshot() {
  const [raw, cqDeep] = await Promise.all([fetchRaw(), fetchCQDeep().catch(() => ({}))]);
  return {
    asset: "ERC20",
    as_of_utc: new Date().toISOString(),
    raw,
    cqDeep: Object.keys(cqDeep || {}).length ? cqDeep : null
  };
}

module.exports = { fetchRaw, fetchCQDeep, fetchAssetSnapshot };
