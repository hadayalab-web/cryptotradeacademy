/**
 * Polygon.io (Stocks / NASDAQ) client
 */
const API_KEY = process.env.POLYGON_API_KEY;
const BASE = "https://api.polygon.io";

async function fetchPolygon(path, params) {
  if (!API_KEY) return null;
  const url = new URL(path.startsWith("/") ? path : `/${path}`, BASE);
  url.searchParams.set("apiKey", API_KEY);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Polygon " + res.status);
  return res.json();
}

async function getAggregates(ticker, from, to, timespan, multiplier) {
  const t = timespan || "day";
  const m = multiplier || 1;
  const data = await fetchPolygon(`/v2/aggs/ticker/${ticker}/range/${m}/${t}/${from}/${to}`);
  return data && data.results ? data.results : [];
}

async function getPreviousClose(ticker) {
  const data = await fetchPolygon(`/v2/aggs/ticker/${ticker}/prev`);
  const r = data && data.results ? data.results[0] : null;
  if (!r) return null;
  return { open: r.o, high: r.h, low: r.l, close: r.c, volume: r.v, vwap: r.vw };
}

async function getSnapshot(ticker) {
  const data = await fetchPolygon(`/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`);
  const t = data && data.ticker ? data.ticker : null;
  if (!t) return null;
  const day = t.day || t.prevDay || {};
  const prev = t.prevDay || {};
  const changePct = prev.c && day.c ? ((day.c - prev.c) / prev.c) * 100 : null;
  return { price: day.c || prev.c, volume: day.v || prev.v || 0, change24h: changePct };
}

async function getIndexSnapshot(symbol) {
  return getSnapshot(symbol || "QQQ");
}

module.exports = { fetchPolygon, getAggregates, getPreviousClose, getSnapshot, getIndexSnapshot };
