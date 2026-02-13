/**
 * Phase 4: GOLD adapter - Polygon GLD + Alpha Vantage XAUUSD
 */
const { getGoldSnapshot } = require("../../marketdata/goldClient");

async function fetchRaw() {
  try {
    const snap = await getGoldSnapshot();
    if (!snap) return { inflow: 0, mpi: 0, priceUsd: null, change24h: null, sentimentLabel: "Unknown", fng: null };
    return {
      inflow: 0,
      mpi: 0,
      priceUsd: snap.priceUsd ?? null,
      change24h: snap.change24h ?? null,
      sentimentLabel: "Unknown",
      fng: null
    };
  } catch (e) {
    return { inflow: 0, mpi: 0, priceUsd: null, change24h: null, sentimentLabel: "Unknown", fng: null };
  }
}

async function fetchMacroSnapshot() {
  const raw = await fetchRaw();
  const snap = await getGoldSnapshot().catch(() => null);
  return {
    asset: "GOLD",
    as_of_utc: new Date().toISOString(),
    raw: { priceIndex: raw.priceUsd, change24h: raw.change24h },
    deep: {
      whaleFlows: null,
      etfFlows: snap && snap.gldFlow ? snap.gldFlow : null,
      cot: snap && snap.cot ? snap.cot : null,
      openInterest: null,
      liquidity: null
    }
  };
}

module.exports = { fetchRaw, fetchMacroSnapshot };
