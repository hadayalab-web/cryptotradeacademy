/**
 * CryptoQuant リファレンス参照モジュール
 * scripts/cq-fetch-reference.js で取得した docs / catalog / OpenAPI パスを
 * スクリプトから参照するための API を提供する。
 *
 * 利用例:
 *   const { getCQDocs, getCQCatalog, getEndpointByPath, listAllPaths } = require('./reference');
 *   const docs = getCQDocs();
 *   const catalog = getCQCatalog();
 *   const meta = getEndpointByPath('/v1/btc/exchange-flows/netflow');
 *   const paths = listAllPaths();
 */
const path = require("path");
const fs = require("fs");

const DATA_DIR = path.join(__dirname, "../../data/cryptoquant");
const DOCS_FILE = path.join(DATA_DIR, "docs-snapshot.json");
const CATALOG_FILE = path.join(DATA_DIR, "catalog-snapshot.json");
const OPENAPI_PATHS_FILE = path.join(DATA_DIR, "cq-openapi-paths.json");
const SCHEMA_FILE = path.join(DATA_DIR, "schema.json");

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

module.exports = {
  getCQDocs,
  getCQCatalog,
  getCQOpenApiPaths,
  getCQSchema,
  getEndpointByPath,
  listAllPaths,
  isPathKnown,
  clearCache
};
