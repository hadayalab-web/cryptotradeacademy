/**
 * Phase 4: BTC adapter for asset snapshot
 * Wraps existing CQ + price + FNG services
 */
const { getExchangeInflow, getMinerPositionIndex } = require("../../cryptoquant/endpoints/btc");
const { normalizeSentiment } = require("../../../logic/tier1_btc/sentiment");

async function fetchBtcPrice() {
  const url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Price API Error: ${res.status}`);
  const json = await res.json();
  const data = json.bitcoin || {};
  return { priceUsd: Number(data.usd) || 0, change24h: Number(data.usd_24h_change) || 0 };
}
async function fetchFearGreed() {
  const res = await fetch("https://api.alternative.me/fng/?limit=1");
  if (!res.ok) throw new Error(`FNG API Error: ${res.status}`);
  const json = await res.json();
  const point = json?.data?.[0];
  if (!point) return { value: null, label: "Unknown" };
  return { value: Number(point.value) || null, label: point.value_classification || "Unknown" };
}

async function fetchRaw() {
  const [inflowData, mpiData, priceMeta, fng] = await Promise.all([
    getExchangeInflow(),
    getMinerPositionIndex(),
    fetchBtcPrice(),
    fetchFearGreed()
  ]);
  const inflow = Number(inflowData?.value) || 0;
  const mpi = Number(mpiData?.value) || 0;
  const priceUsd = priceMeta?.priceUsd ?? null;
  const change24h = priceMeta?.change24h ?? null;
  const sentimentLabel = normalizeSentiment(fng?.label ?? fng?.value);
  return {
    inflow,
    mpi,
    priceUsd,
    change24h,
    sentimentLabel,
    fng: fng || null
  };
}

module.exports = { fetchRaw };
