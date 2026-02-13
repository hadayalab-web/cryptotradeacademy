/**
 * Phase 4: Stablecoin adapter - CQ schema-based
 */
const { fetchFromCQ, extractValue } = require("./sharedAdapterUtils");

async function fetchRaw() {
  const [reserve, netflow] = await Promise.all([
    fetchFromCQ("Stablecoin", "Exchange-Flows", "reserve", { window: "day", limit: 1 }).catch(() => null),
    fetchFromCQ("Stablecoin", "Exchange-Flows", "netflow", { window: "day", limit: 1 }).catch(() => null)
  ]);

  const inflow = extractValue(netflow, "netflow", "value") ?? 0;
  return {
    inflow,
    mpi: null,
    priceUsd: 1,
    change24h: 0,
    sentimentLabel: "Stable",
    fng: null,
    reserve: extractValue(reserve, "reserve", "value")
  };
}

async function fetchCQDeep() {
  const [reserve, netflow, supplyRatio] = await Promise.all([
    fetchFromCQ("Stablecoin", "Exchange-Flows", "reserve", { window: "day", limit: 1 }).catch(() => null),
    fetchFromCQ("Stablecoin", "Exchange-Flows", "netflow", { window: "day", limit: 1 }).catch(() => null),
    fetchFromCQ("Stablecoin", "Flow-Indicator", "exchange_supply_ratio", { window: "day", limit: 1 }).catch(() => null)
  ]);

  return {
    whaleRatio: null,
    sopr: null,
    nupl: null,
    funding: null,
    openInterest: null,
    liquidity: null,
    minerFlows: null,
    stablecoinMetrics: {
      reserve: extractValue(reserve, "reserve", "value"),
      netflow: extractValue(netflow, "netflow", "value"),
      exchangeSupplyRatio: extractValue(supplyRatio, "exchange_supply_ratio", "value")
    },
    etfFlows: null,
    exchangeFlowsDetailed: null
  };
}

async function fetchAssetSnapshot() {
  const [raw, cqDeep] = await Promise.all([fetchRaw(), fetchCQDeep().catch(() => ({}))]);
  return {
    asset: "STABLECOIN",
    as_of_utc: new Date().toISOString(),
    raw,
    cqDeep: Object.keys(cqDeep || {}).length ? cqDeep : null
  };
}

module.exports = { fetchRaw, fetchCQDeep, fetchAssetSnapshot };
