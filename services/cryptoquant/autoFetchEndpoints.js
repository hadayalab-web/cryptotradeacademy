/**
 * CQ リファレンス一覧からエンドポイントを自動取得（KIBA 自律拡張用）
 * listAllPaths() で取得したパスに対し、デフォルトパラメータで API を叩き結果をまとめる。
 * 403/404/400 はスキップし、成功分だけ byPath に格納する。
 */
const { listAllPaths } = require("./reference");
const { fetchCryptoQuant } = require("./client");

const DELAY_MS = Number(process.env.KIBA_CQ_AUTO_DELAY_MS) || 400;
const MAX_ENDPOINTS_PER_RUN = Number(process.env.KIBA_CQ_AUTO_MAX_PER_RUN) || 80;

/**
 * パスに応じたデフォルトクエリパラメータ
 * CQ API は window, limit のほか miner / symbol / token 等が必須のことがある
 */
function getDefaultParamsForPath(apiPath) {
  const p = String(apiPath || "").toLowerCase();
  const base = { exchange: "all_exchange", window: "day", limit: 1 };
  if (p.includes("/stablecoin/")) {
    return { ...base, token: "usdt" };
  }
  if (p.includes("funding-rates")) {
    return { exchange: "all_exchange", window: "8hour", limit: 1 };
  }
  if (p.includes("miner-flows") || p.includes("miner-supply-ratio") || p.includes("miner-data/")) {
    return { ...base, miner: "all_miner" };
  }
  if (p.includes("fund-data/")) {
    return { ...base, symbol: "btc" };
  }
  if (p.includes("/alt/")) {
    return { ...base, token: "btc" };
  }
  return base;
}

/**
 * /v1/btc/... または /v1//btc/... → /btc/... に正規化（クライアントは BASE_URL に /v1 を含むため endpoint は /btc/...）
 */
function toClientEndpoint(path) {
  const s = String(path || "").replace(/^\/v1\/?/, "").replace(/\/+/g, "/").trim() || "";
  return s.startsWith("/") ? s : `/${s}`;
}

/** リファレンスにはあるが 404 または必須パラメータが複雑でスキップするパス */
const SKIP_PATHS = [
  "/btc/lightning-network/stats-in-total",
  "/btc/lightning-network-statistics/stats-in-total",
  "/btc/inter-entity-flows/exchange-to-exchange",
  "/btc/inter-entity-flows/exchange-to-miner",
  "/btc/inter-entity-flows/miner-to-exchange",
  "/btc/inter-entity-flows/miner-to-miner",
  "/btc/mempool/stats-by-relative-fee",
  "/btc/mempool/stats-in-total"
];
function shouldSkipPath(endpoint) {
  const p = String(endpoint || "").toLowerCase();
  return SKIP_PATHS.some((skip) => p.includes(skip.replace(/^\//, "").toLowerCase()));
}

/**
 * リファレンス一覧から CQ エンドポイントを一括取得
 * @param {Object} options
 * @param {number} options.maxEndpoints - 1 run あたりの最大取得数（デフォルト MAX_ENDPOINTS_PER_RUN）
 * @param {number} options.delayMs - リクエスト間隔（ms）
 * @param {boolean} options.skipCache - キャッシュを使わず取得
 * @returns {Promise<{ byPath: Record<string, object>, errors: Array<{ path: string, error: string }>, fetched: number }>}
 */
async function fetchAllEndpointsFromReference(options = {}) {
  const maxEndpoints = options.maxEndpoints ?? MAX_ENDPOINTS_PER_RUN;
  const delayMs = options.delayMs ?? DELAY_MS;
  const skipCache = options.skipCache === true;

  let paths = [];
  try {
    paths = listAllPaths();
  } catch (e) {
    console.warn("[CQ autoFetch] listAllPaths failed:", e?.message);
    return { byPath: {}, errors: [{ path: "", error: e?.message || "listAllPaths failed" }], fetched: 0 };
  }

  const assetPrefixes = ["/btc/", "/eth/", "/stablecoin/", "/xrp/", "/trx/", "/alt/", "/erc20/"];
  const normalized = [...new Set(paths.map(toClientEndpoint))].filter(
    (p) => p && p !== "/" && assetPrefixes.some((pref) => p.startsWith(pref)) && !shouldSkipPath(p)
  );
  const toFetch = normalized.slice(0, maxEndpoints);
  const byPath = {};
  const errors = [];

  for (let i = 0; i < toFetch.length; i++) {
    const endpoint = toFetch[i];
    const fullPath = endpoint.startsWith("/v1") ? endpoint : `/v1${endpoint}`;
    const params = getDefaultParamsForPath(fullPath);
    try {
      const data = await fetchCryptoQuant(endpoint, params, { skipCache });
      if (data?.result?.data != null) {
        const point = Array.isArray(data.result.data) ? data.result.data[0] : data.result.data;
        if (point != null && typeof point === "object") {
          byPath[fullPath] = point;
        }
      }
    } catch (e) {
      errors.push({ path: fullPath, error: e?.message || String(e) });
    }
    if (i < toFetch.length - 1 && delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  const fetched = Object.keys(byPath).length;
  if (fetched > 0 || errors.length > 0) {
    console.log("[CQ autoFetch] done", "fetched=" + fetched, "errors=" + errors.length, "requested=" + toFetch.length);
  }
  return { byPath, errors, fetched };
}

module.exports = {
  fetchAllEndpointsFromReference,
  getDefaultParamsForPath,
  toClientEndpoint,
  MAX_ENDPOINTS_PER_RUN,
  DELAY_MS
};
