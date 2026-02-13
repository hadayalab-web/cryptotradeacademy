// services/cryptoquant/endpoints/btc.js
// WhaleShield 本番実績ベース + CryptoQuant MPI 正式エンドポイント対応版

const { fetchCryptoQuant } = require("../client");

const FALLBACK_INFLOW = { value: 0, raw: {} };
const FALLBACK_MPI = { value: 0, raw: {} };

/**
 * BTC Exchange Netflow (All Exchanges, 1D)
 * /v1/btc/exchange-flows/netflow?exchange=all_exchange&window=day&limit=1
 * 404 or error → fallback { value: 0, raw: {} } so Stage1 never null.
 */
async function getExchangeInflow() {
  try {
    const data = await fetchCryptoQuant("/btc/exchange-flows/netflow", {
      exchange: "all_exchange",
      window: "day",
      limit: 1,
    });

    const point = data?.result?.data?.[0];
    if (!point) {
      console.warn("⚠️ getExchangeInflow: No data (404 or empty) — using fallback 0.");
      return FALLBACK_INFLOW;
    }

    const rawValue =
      point.netflow_total ??
      point.netflow ??
      point.value ??
      point.netflowTotal ??
      null;

    const value =
      typeof rawValue === "number" ? rawValue : rawValue != null ? parseFloat(rawValue) : 0;

    console.log("📊 Exchange Netflow (BTC):", value, "raw:", JSON.stringify(point));
    return { value, raw: point };
  } catch (e) {
    console.warn("⚠️ getExchangeInflow failed:", e?.message, "— using fallback 0.");
    return FALLBACK_INFLOW;
  }
}

/**
 * Miners' Position Index (MPI)
 * 正式エンドポイント: /v1/btc/flow-indicator/mpi [window=day, limit=1]
 * 404 or error → fallback { value: 0, raw: {} } so Stage1 never null.
 */
async function getMinerPositionIndex() {
  try {
    const data = await fetchCryptoQuant("/btc/flow-indicator/mpi", {
      window: "day",
      limit: 1,
    });

    const point = data?.result?.data?.[0];
    if (!point) {
      console.warn("⚠️ getMinerPositionIndex: No data (404 or empty) — using fallback 0.");
      return FALLBACK_MPI;
    }

    const rawValue =
      point.mpi ??
      point.value ??
      null;

    const value =
      typeof rawValue === "number" ? rawValue : rawValue != null ? parseFloat(rawValue) : 0;

    console.log("📊 Miner Position Index (BTC):", value, "raw:", JSON.stringify(point));
    return { value, raw: point };
  } catch (e) {
    console.warn("⚠️ getMinerPositionIndex failed:", e?.message, "— using fallback 0.");
    return FALLBACK_MPI;
  }
}

module.exports = { getExchangeInflow, getMinerPositionIndex };
