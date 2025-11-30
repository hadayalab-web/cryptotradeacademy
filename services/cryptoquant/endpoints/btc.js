// services/cryptoquant/endpoints/btc.js
// WhaleShield 本番実績ベース + CryptoQuant MPI 正式エンドポイント対応版

const { fetchCryptoQuant } = require("../client");

/**
 * BTC Exchange Netflow (All Exchanges, 1D)
 * /v1/btc/exchange-flows/netflow?exchange=all_exchange&window=day&limit=1
 */
async function getExchangeInflow() {
  const data = await fetchCryptoQuant("/btc/exchange-flows/netflow", {
    exchange: "all_exchange",
    window: "day",
    limit: 1,
  });

  const point = data?.result?.data?.[0];
  if (!point) {
    console.warn("⚠️ getExchangeInflow: No data returned from CryptoQuant.");
    return null;
  }

  const rawValue =
    point.netflow_total ??
    point.netflow ??
    point.value ??
    point.netflowTotal ??
    null;

  const value =
    typeof rawValue === "number" ? rawValue : rawValue != null ? parseFloat(rawValue) : null;

  console.log("📊 Exchange Netflow (BTC):", value, "raw:", JSON.stringify(point));
  return { value, raw: point };
}

/**
 * Miners' Position Index (MPI)
 * 正式エンドポイント: /v1/btc/flow-indicator/mpi [window=day, limit=1]
 */
async function getMinerPositionIndex() {
  const data = await fetchCryptoQuant("/btc/flow-indicator/mpi", {
    window: "day",
    limit: 1,
  });

  const point = data?.result?.data?.[0];
  if (!point) {
    console.warn("⚠️ getMinerPositionIndex: No data returned from CryptoQuant.");
    return null;
  }

  const rawValue =
    point.mpi ??
    point.value ??
    null;

  const value =
    typeof rawValue === "number" ? rawValue : rawValue != null ? parseFloat(rawValue) : null;

  console.log("📊 Miner Position Index (BTC):", value, "raw:", JSON.stringify(point));
  return { value, raw: point };
}

module.exports = { getExchangeInflow, getMinerPositionIndex };
