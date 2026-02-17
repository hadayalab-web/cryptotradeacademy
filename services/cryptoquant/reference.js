/**
 * CryptoQuant リファレンス — 参照 API と取得の一元化
 * - 読み: getCQDocs, getCQCatalog, listAllPaths, isPathKnown 等（data/cryptoquant/*.json から）
 * - 取得: fetchReference() で docs / catalog / OpenAPI パスを取得し同じディレクトリに保存
 *
 * 利用例:
 *   const { getCQDocs, listAllPaths, fetchReference } = require('./reference');
 *   const paths = listAllPaths();
 *   await fetchReference({ skipPlaywright: true });  // スクリプトや Cron から更新時
 */
const path = require("path");
const fs = require("fs");

const DATA_DIR = path.join(__dirname, "../../data/cryptoquant");
const DOCS_FILE = path.join(DATA_DIR, "docs-snapshot.json");
const CATALOG_FILE = path.join(DATA_DIR, "catalog-snapshot.json");
const OPENAPI_PATHS_FILE = path.join(DATA_DIR, "cq-openapi-paths.json");
const SCHEMA_FILE = path.join(DATA_DIR, "schema.json");

const DELAY_MS = 1500;
const PLAYWRIGHT_TIMEOUT = 20000;
const USERGUIDE_NAV = [
  { asset: "Bitcoin", slug: "btc", pages: ["entity-status", "network-data", "market-data", "fund-data", "exchange-flows", "miner-flows", "inter-entity-flows", "network-indicator", "market-indicator", "mempool-statistics", "lightning-network-statistics", "flow-indicator", "miner-data"] },
  { asset: "Ethereum", slug: "eth", pages: ["entity-status", "network-data", "exchange-flows", "market-data", "market-indicator", "flow-indicator", "fund-data"] },
  { asset: "Stablecoin", slug: "stablecoin", pages: ["entity-status", "exchange-flows", "network-data", "market-data", "flow-indicator"] },
  { asset: "ERC20", slug: "erc20", pages: ["entity-status", "exchange-flows", "market-data", "flow-indicator"] },
  { asset: "Xrp", slug: "xrp", pages: ["entity-flows", "flow-indicator", "market-data", "network-data", "network-indicator", "dex-data", "amm-data"] },
  { asset: "TRX", slug: "trx", pages: ["market-data", "network-data"] },
  { asset: "Alt", slug: "alt", pages: ["market-data"] }
];

let _docs = null;
let _catalog = null;
let _openApiPaths = null;
let _schema = null;

function readJsonSafe(filePath, defaultValue = null) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      return JSON.parse(raw);
    }
  } catch (e) {
    // ignore
  }
  return defaultValue;
}

/**
 * cryptoquant.com/docs のスナップショットを返す
 * @returns {object|null} { title, url, sections, paths, links, rawText, fetchedAt } または null
 */
function getCQDocs() {
  if (_docs !== null) return _docs;
  _docs = readJsonSafe(DOCS_FILE);
  return _docs;
}

/**
 * cryptoquant.com/catalog のスナップショットを返す
 * @returns {object|null} { title, url, assets, links, rawText, fetchedAt } または null
 */
function getCQCatalog() {
  if (_catalog !== null) return _catalog;
  _catalog = readJsonSafe(CATALOG_FILE);
  return _catalog;
}

/**
 * userguide から取得した OpenAPI パス一覧とメタデータを返す
 * @returns {object} { paths: string[], pathMeta: Record<string, object>, fetchedAt }
 */
function getCQOpenApiPaths() {
  if (_openApiPaths !== null) return _openApiPaths;
  _openApiPaths = readJsonSafe(OPENAPI_PATHS_FILE, { paths: [], pathMeta: {}, fetchedAt: null });
  return _openApiPaths;
}

/**
 * schema.json（discovery / cq-scrape-schema 由来）を返す
 * @returns {object|null}
 */
function getCQSchema() {
  if (_schema !== null) return _schema;
  _schema = readJsonSafe(SCHEMA_FILE);
  return _schema;
}

/**
 * 指定パス（例: /v1/btc/exchange-flows/netflow）のメタ情報を返す
 * 正規化: 先頭に /v1 が無ければ付与、末尾スラッシュは除去
 * @param {string} apiPath
 * @returns {object|null} { summary, description, asset, category } または null
 */
function getEndpointByPath(apiPath) {
  const normalized = String(apiPath || "").trim().replace(/\/+$/, "");
  const withV1 = normalized.startsWith("/v1/") || normalized.startsWith("/v1") ? normalized : `/v1${normalized.startsWith("/") ? "" : "/"}${normalized}`;
  const data = getCQOpenApiPaths();
  return data.pathMeta[withV1] || data.pathMeta[normalized] || null;
}

/**
 * 参照可能な全 API パス一覧を返す（OpenAPI パス + schema の path をマージ）
 * @returns {string[]}
 */
function listAllPaths() {
  const openApi = getCQOpenApiPaths();
  const pathsSet = new Set(openApi.paths || []);
  const schema = getCQSchema();
  if (schema && typeof schema === "object") {
    for (const asset of Object.values(schema)) {
      if (asset && typeof asset === "object") {
        for (const endpoints of Object.values(asset)) {
          if (Array.isArray(endpoints)) {
            for (const ep of endpoints) {
              if (ep.path) pathsSet.add(ep.path);
            }
          }
        }
      }
    }
  }
  const docs = getCQDocs();
  if (docs && Array.isArray(docs.paths)) docs.paths.forEach((p) => pathsSet.add(p.startsWith("/v1") ? p : `/v1${p.startsWith("/") ? "" : "/"}${p}`));
  return [...pathsSet].sort();
}

/**
 * パスが公式リファレンスに存在するか確認する
 * @param {string} apiPath
 * @returns {boolean}
 */
function isPathKnown(apiPath) {
  const normalized = String(apiPath || "").trim().replace(/\/+$/, "");
  const withV1 = normalized.startsWith("/v1") ? normalized : `/v1${normalized.startsWith("/") ? "" : "/"}${normalized}`;
  const all = listAllPaths();
  return all.some((p) => p === withV1 || p === normalized);
}

/**
 * キャッシュをクリア（主にテスト用）
 */
function clearCache() {
  _docs = null;
  _catalog = null;
  _openApiPaths = null;
  _schema = null;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function fetchDocsWithPlaywright() {
  try {
    const { chromium } = require("playwright");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.setDefaultTimeout(PLAYWRIGHT_TIMEOUT);
    await page.goto("https://cryptoquant.com/docs", { waitUntil: "networkidle", timeout: PLAYWRIGHT_TIMEOUT });
    await new Promise((r) => setTimeout(r, DELAY_MS));
    const extracted = await page.evaluate(() => {
      const body = document.body;
      if (!body) return { title: document.title || "CryptoQuant Docs", sections: [], paths: [], links: [], rawText: "" };
      const links = Array.from(document.querySelectorAll("a[href]")).map((a) => ({ href: a.getAttribute("href"), text: (a.textContent || "").trim().slice(0, 200) })).filter((l) => l.href && (l.href.startsWith("/") || l.href.includes("cryptoquant")));
      const codeBlocks = Array.from(document.querySelectorAll("code, pre")).map((c) => (c.textContent || "").trim());
      const allText = [body.innerText, ...codeBlocks].join(" ");
      const pathMatches = allText.match(/\/v1\/[a-z0-9/_-]+/g) || [];
      const paths = [...new Set(pathMatches)];
      const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4")).map((h) => ({ tag: h.tagName, text: (h.textContent || "").trim().slice(0, 300) }));
      return { title: document.title || "CryptoQuant Docs", url: "https://cryptoquant.com/docs", fetchedAt: new Date().toISOString(), sections: headings, paths, links: links.slice(0, 150), rawText: body.innerText ? body.innerText.slice(0, 15000) : "" };
    });
    await browser.close();
    return extracted;
  } catch (e) {
    console.warn("[CQ reference] Playwright docs failed:", e.message);
    return null;
  }
}

async function fetchCatalogWithPlaywright() {
  try {
    const { chromium } = require("playwright");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.setDefaultTimeout(PLAYWRIGHT_TIMEOUT);
    await page.goto("https://cryptoquant.com/catalog", { waitUntil: "networkidle", timeout: PLAYWRIGHT_TIMEOUT });
    await new Promise((r) => setTimeout(r, DELAY_MS));
    const extracted = await page.evaluate(() => {
      const body = document.body;
      if (!body) return { title: document.title || "CryptoQuant Catalog", assets: [], links: [], rawText: "" };
      const links = Array.from(document.querySelectorAll("a[href]")).map((a) => ({ href: a.getAttribute("href"), text: (a.textContent || "").trim().slice(0, 200) })).filter((l) => l.href && l.text);
      const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4")).map((h) => (h.textContent || "").trim());
      const assets = headings.filter((t) => /Bitcoin|Ethereum|XRP|TRON|Stablecoin|ERC-20|Alt/i.test(t));
      return { title: document.title || "CryptoQuant Catalog", url: "https://cryptoquant.com/catalog", fetchedAt: new Date().toISOString(), assets: [...new Set(assets)], links: links.slice(0, 100), rawText: body.innerText ? body.innerText.slice(0, 8000) : "" };
    });
    await browser.close();
    return extracted;
  } catch (e) {
    console.warn("[CQ reference] Playwright catalog failed:", e.message);
    return null;
  }
}

async function fetchUserguideOpenApiPaths() {
  const pathList = [];
  const pathToMeta = {};
  for (const { asset, slug, pages } of USERGUIDE_NAV) {
    for (const p of pages) {
      const url = `https://userguide.cryptoquant.com/api/${slug}-${p}`;
      try {
        const res = await fetch(url, { headers: { Accept: "text/html,application/xhtml+xml" } });
        if (!res.ok) continue;
        const html = await res.text();
        const scriptJson = html.match(/<script[^>]*type\s*=\s*["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
        const codeJson = html.match(/```json\s*([\s\S]*?)```/g) || [];
        const preCode = html.match(/<pre[^>]*>[\s\S]*?<code[^>]*>([\s\S]*?)<\/code>/gi) || [];
        const allBlocks = [...scriptJson, ...codeJson, ...preCode];
        for (const block of allBlocks) {
          let raw = block;
          if (raw.startsWith("```")) raw = raw.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
          else if (raw.includes("<script")) raw = raw.replace(/<script[^>]*>[\s\S]*?([\s\S]*?)<\/script>/i, "$1").trim();
          else if (raw.includes("<code")) raw = raw.replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>/i, "$1").trim();
          raw = raw.replace(/\\n/g, "\n").trim();
          try {
            const spec = JSON.parse(raw);
            const paths = spec.paths || {};
            for (const [pathKey, methods] of Object.entries(paths)) {
              const fullPath = pathKey.startsWith("/") ? `/v1${pathKey}` : `/v1/${pathKey}`;
              if (!pathList.includes(fullPath)) pathList.push(fullPath);
              const getOp = methods.get || methods.GET;
              if (getOp && !pathToMeta[fullPath]) pathToMeta[fullPath] = { summary: getOp.summary || null, description: typeof getOp.description === "string" ? getOp.description.slice(0, 500) : null, asset, category: p };
            }
          } catch (_) {}
        }
        const pathInText = html.match(/\/v1\/[a-z0-9/_-]+/g) || html.match(/\/btc\/[a-z0-9/_-]+|\/eth\/[a-z0-9/_-]+|\/stablecoin\/[a-z0-9/_-]+|\/xrp\/[a-z0-9/_-]+|\/trx\/[a-z0-9/_-]+|\/alt\/[a-z0-9/_-]+|\/erc20\/[a-z0-9/_-]+/g) || [];
        for (const p of pathInText) {
          const fullPath = p.startsWith("/v1") ? p : `/v1${p}`;
          if (!pathList.includes(fullPath)) pathList.push(fullPath);
          if (!pathToMeta[fullPath]) {
            const segments = fullPath.split("/").filter(Boolean);
            pathToMeta[fullPath] = { asset, category: segments.length >= 3 ? segments[2] : (segments[1] || p), source: "userguide-html" };
          }
        }
      } catch (e) {
        console.warn("[CQ reference] userguide fetch failed:", url, e.message);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return { paths: pathList, pathMeta: pathToMeta, fetchedAt: new Date().toISOString() };
}

/**
 * CQ 公式リファレンスを取得し data/cryptoquant/ に保存する
 * @param {Object} options
 * @param {boolean} options.skipPlaywright - true のとき Playwright による docs/catalog 取得をスキップ（userguide のみ）
 * @param {string} options.dataDir - 保存先（未指定時は DATA_DIR）
 * @returns {Promise<{ docsSnapshot: object|null, catalogSnapshot: object|null, openApiPaths: object }>}
 */
async function fetchReference(options = {}) {
  const skipPlaywright = options.skipPlaywright === true || process.env.SKIP_PLAYWRIGHT === "1";
  const dataDir = options.dataDir || DATA_DIR;
  ensureDir(dataDir);

  let docsSnapshot = null;
  let catalogSnapshot = null;

  if (!skipPlaywright) {
    try {
      require.resolve("playwright");
      console.log("[CQ reference] Fetching docs (Playwright)...");
      docsSnapshot = await fetchDocsWithPlaywright();
      if (docsSnapshot) {
        fs.writeFileSync(path.join(dataDir, "docs-snapshot.json"), JSON.stringify(docsSnapshot, null, 2), "utf8");
        console.log("[CQ reference] Wrote docs-snapshot.json");
      }
      console.log("[CQ reference] Fetching catalog (Playwright)...");
      catalogSnapshot = await fetchCatalogWithPlaywright();
      if (catalogSnapshot) {
        fs.writeFileSync(path.join(dataDir, "catalog-snapshot.json"), JSON.stringify(catalogSnapshot, null, 2), "utf8");
        console.log("[CQ reference] Wrote catalog-snapshot.json");
      }
    } catch (e) {
      if (e.code !== "MODULE_NOT_FOUND") console.warn("[CQ reference] Playwright:", e.message);
    }
  }

  console.log("[CQ reference] Fetching userguide OpenAPI paths...");
  const openApiData = await fetchUserguideOpenApiPaths();
  fs.writeFileSync(path.join(dataDir, "cq-openapi-paths.json"), JSON.stringify(openApiData, null, 2), "utf8");
  console.log("[CQ reference] Wrote cq-openapi-paths.json, paths count:", openApiData.paths.length);

  clearCache();
  return { docsSnapshot, catalogSnapshot, openApiPaths: openApiData };
}

module.exports = {
  getCQDocs,
  getCQCatalog,
  getCQOpenApiPaths,
  getCQSchema,
  getEndpointByPath,
  listAllPaths,
  isPathKnown,
  clearCache,
  fetchReference,
  DATA_DIR
};
