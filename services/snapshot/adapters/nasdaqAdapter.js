/**
 * Phase 4: NASDAQ adapter - Polygon.io
 */
const { getIndexSnapshot } = require("../../marketdata/polygonClient");

async function fetchRaw() {
  try {
    const snap = await getIndexSnapshot("QQQ");
    if (!snap) return { inflow: 0, mpi: 0, priceUsd: null, change24h: null, sentimentLabel: "Unknown", fng: null };
    return {
      inflow: 0,
      mpi: 0,
      priceUsd: snap.price ?? null,
      change24h: snap.change24h ?? null,
      sentimentLabel: "Unknown",
      fng: null,
      volume: snap.volume ?? null
    };
  } catch (e) {
    return { inflow: 0, mpi: 0, priceUsd: null, change24h: null, sentimentLabel: "Unknown", fng: null };
  }
}

async function fetchMacroSnapshot() {
  const raw = await fetchRaw();
  return {
    asset: "NASDAQ",
    as_of_utc: new Date().toISOString(),
    raw: { priceIndex: raw.priceUsd, change24h: raw.change24h },
    deep: { whaleFlows: null, etfFlows: null, cot: null, openInterest: null, liquidity: null }
  };
}

module.exports = { fetchRaw, fetchMacroSnapshot };
