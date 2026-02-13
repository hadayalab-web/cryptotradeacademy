/**
 * Gold market data client
 * CFTC COT, GLD ETF, Alpha Vantage XAUUSD
 */
const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * GLD ETF snapshot via Polygon (if available)
 */
async function getGLDSnapshot() {
  if (!POLYGON_API_KEY) return null;
  try {
    const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/GLD?apiKey=${POLYGON_API_KEY}`;
    const data = await fetchJson(url);
    const ticker = data?.ticker;
    if (!ticker) return null;
    const day = ticker?.day ?? ticker?.prevDay ?? {};
    return {
      price: day.c ?? day.close,
      volume: day.v ?? day.volume ?? 0,
      changePct: null
    };
  } catch (e) {
    return null;
  }
}

/**
 * XAUUSD / Gold price via Alpha Vantage
 */
async function getGoldPriceAlphaVantage() {
  if (!ALPHA_VANTAGE_KEY) return null;
  try {
    const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=XAU&to_currency=USD&apikey=${ALPHA_VANTAGE_KEY}`;
    const data = await fetchJson(url);
    const rate = data?.Realtime?.["Currency Exchange Rate"];
    if (!rate) return null;
    const bid = parseFloat(rate["8. Bid Price"]);
    const change = rate["9. Last Refreshed"];
    return { priceUsd: bid, lastRefreshed: change };
  } catch (e) {
    return null;
  }
}

/**
 * CFTC COT — CFTC publishes weekly XML/CSV. No official REST API.
 * Use data.gov or third-party. Placeholder for future integration.
 */
async function getCOTGold() {
  return null;
}

/**
 * Combined gold snapshot
 */
async function getGoldSnapshot() {
  const [gld, xau] = await Promise.all([
    getGLDSnapshot(),
    getGoldPriceAlphaVantage()
  ]);

  const priceUsd = xau?.priceUsd ?? gld?.price ?? null;
  const change24h = gld?.changePct ?? null;

  return {
    priceUsd,
    change24h,
    gldFlow: gld,
    cot: await getCOTGold()
  };
}

module.exports = {
  getGLDSnapshot,
  getGoldPriceAlphaVantage,
  getCOTGold,
  getGoldSnapshot
};
