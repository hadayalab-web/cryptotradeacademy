/**
 * Shared utilities for CQ Multi-Asset Adapters
 */
const { fetchCryptoQuant, callCQ } = require("../../cryptoquant/client");

const COINGECKO_IDS = {
  BTC: "bitcoin",
  ETH: "ethereum",
  XRP: "ripple",
  TRX: "tron",
  SOL: "solana"
};

async function fetchPriceFromCoinGecko(assetCode) {
  const id = COINGECKO_IDS[assetCode] || assetCode.toLowerCase();
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url);
  if (!res.ok) return { priceUsd: null, change24h: null };
  const json = await res.json();
  const data = json[id] || {};
  return {
    priceUsd: Number(data.usd) || null,
    change24h: data.usd_24h_change != null ? Number(data.usd_24h_change) : null
  };
}

async function fetchFromCQ(asset, group, endpoint, params = { window: "day", limit: 1 }) {
  try {
    const data = await callCQ(asset, group, endpoint, params);
    if (!data) return null;
    const point = data?.result?.data?.[0];
    return point;
  } catch (e) {
    if (e?.message?.includes("404")) return null;
    throw e;
  }
}

function extractValue(point, ...keys) {
  if (!point || typeof point !== "object") return null;
  for (const k of keys) {
    const v = point[k];
    if (v != null && (typeof v === "number" || !isNaN(parseFloat(v)))) return Number(v);
  }
  return null;
}

module.exports = {
  fetchPriceFromCoinGecko,
  fetchFromCQ,
  extractValue,
  fetchCryptoQuant,
  callCQ
};
