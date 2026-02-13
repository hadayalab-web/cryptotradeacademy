#!/usr/bin/env node
/**
 * CryptoQuant API Schema Extractor
 * Trap Defence — CQ Pro 100% Integration
 *
 * Extracts all CQ API endpoints into data/cryptoquant/schema.json.
 * Strategies (in order):
 *  1. Discovery API: GET /v1/discovery/endpoints (requires CRYPTOQUANT_API_KEY)
 *  2. Playwright: Scrape userguide.cryptoquant.com (fallback)
 *  3. Baseline: Known structure from codebase + docs
 */
const fs = require("fs");
const path = require("path");

const OUTPUT_PATH = path.join(__dirname, "../data/cryptoquant/schema.json");
const DELAY_MS = 800;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const CATEGORY_MAP = {
  status: "Status",
  "entity-status": "Status",
  "network-data": "Network-Data",
  "market-data": "Market-Data",
  "fund-data": "Fund-Data",
  "exchange-flows": "Exchange-Flows",
  "miner-flows": "Miner-Flows",
  "inter-entity-flows": "Inter-Entity-Flows",
  "network-indicator": "Network-Indicator",
  "market-indicator": "Market-Indicator",
  "mempool": "Mempool",
  "lightning-network": "Lightning-Network",
  "flow-indicator": "Flow-Indicator",
  "miner-data": "Miner-Data",
  "entity-flows": "Entity-Flows",
  "dex-data": "Dex-Data",
  "amm-data": "AMM-Data",
  "eth-2": "ETH-2.0",
  derivatives: "Derivatives",
  liquidity: "Liquidity",
  discovery: "Discovery"
};

const ASSET_MAP = {
  btc: "Bitcoin",
  eth: "Ethereum",
  stablecoin: "Stablecoin",
  erc20: "ERC20",
  xrp: "Xrp",
  trx: "TRX",
  alt: "Alt"
};

function parsePathToAssetAndCategory(apiPath) {
  const p = String(apiPath || "").replace(/^\/v1\//, "").trim();
  const parts = p.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const [assetRaw, categoryRaw, ...rest] = parts;
  const endpoint = rest.join("_") || "index";
  const assetKey = ASSET_MAP[assetRaw.toLowerCase()] || (assetRaw.charAt(0).toUpperCase() + assetRaw.slice(1).toLowerCase());
  const categoryKey = CATEGORY_MAP[categoryRaw.toLowerCase()] || categoryRaw.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("-");
  return { assetKey, categoryKey, endpoint };
}

function buildBaselineSchema() {
  const userguideStructure = {
    Bitcoin: [
      "Entity Status",
      "Network Data",
      "Market Data",
      "Fund Data",
      "Exchange Flows",
      "Miner Flows",
      "Inter Entity Flows",
      "Network Indicator",
      "Market Indicator",
      "Mempool Statistics",
      "Lightning Network Statistics",
      "Flow Indicator",
      "Miner Data"
    ],
    Ethereum: [
      "Entity Status",
      "Network Data",
      "Exchange Flows",
      "Market Data",
      "Market Indicator",
      "Flow Indicator",
      "Fund Data",
      "ETH 2.0"
    ],
    Stablecoin: [
      "Entity Status",
      "Exchange Flows",
      "Network Data",
      "Market Data",
      "Flow Indicator"
    ],
    ERC20: ["Entity Status", "Exchange Flows", "Market Data", "Flow Indicator"],
    Xrp: [
      "Entity Flows",
      "Flow Indicator",
      "Market Data",
      "Network Data",
      "Network Indicator",
      "Dex Data",
      "AMM Data"
    ],
    TRX: ["Market Data", "Network Data"],
    Alt: ["Market Data"]
  };

  const schema = {};
  for (const [asset, categories] of Object.entries(userguideStructure)) {
    schema[asset] = {};
    for (const cat of categories) {
      const key = cat.replace(/\s+/g, "-");
      schema[asset][key] = [
        {
          name: "placeholder",
          method: "GET",
          path: `/v1/${asset.toLowerCase()}/${key.toLowerCase().replace(/-/g, "-")}/placeholder`,
          params: { window: "day", limit: 100 },
          responseExample: null,
          source: "baseline"
        }
      ];
    }
  }
  return schema;
}

function transformDiscoveryToSchema(discoveryData) {
  const items = discoveryData?.result?.data ?? discoveryData?.data ?? [];
  if (!Array.isArray(items) || items.length === 0) return null;

  const schema = {};
  for (const item of items) {
    const p = item.path || item.endpoint || "";
    if (p.includes("/discovery/")) continue;
    const parsed = parsePathToAssetAndCategory(p);
    if (!parsed) continue;

    const { assetKey, categoryKey, endpoint } = parsed;
    if (!schema[assetKey]) schema[assetKey] = {};
    if (!schema[assetKey][categoryKey]) schema[assetKey][categoryKey] = [];

    const paramList = Array.isArray(item.parameters) ? item.parameters : [];
    const params = paramList.reduce((acc, param) => {
      const name = param.name || (Array.isArray(param.type) ? param.type[0] : null) || "window";
      const def = Array.isArray(param.type) ? (param.type.includes("exchange") ? "all_exchange" : "day") : "day";
      acc[name] = param.default ?? def;
      return acc;
    }, { window: "day", limit: 100 });
    if (Object.keys(params).length === 2 && !params.exchange) params.exchange = "all_exchange";

    schema[assetKey][categoryKey].push({
      name: endpoint.replace(/-/g, "_") || "index",
      method: (item.method || "GET").toUpperCase(),
      path: p.startsWith("/") ? p : `/v1/${p}`,
      params,
      responseExample: item.responseExample ?? null,
      source: "discovery"
    });
  }
  return schema;
}

async function fetchDiscoveryEndpoints() {
  const apiKey = process.env.CRYPTOQUANT_API_KEY;
  if (!apiKey) {
    console.log("[cq-scrape-schema] CRYPTOQUANT_API_KEY not set, skipping discovery API");
    return null;
  }

  const url = "https://api.cryptoquant.com/v1/discovery/endpoints";
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" }
    });
    if (!res.ok) throw new Error(`Discovery API ${res.status}`);
    const data = await res.json();
    return data;
  } catch (e) {
    console.warn("[cq-scrape-schema] Discovery API failed:", e.message);
    return null;
  }
}

async function scrapeWithPlaywright() {
  try {
    const { chromium } = require("playwright");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const schema = {};

    const navLinks = [
      { asset: "Bitcoin", slug: "btc", pages: ["entity-status", "network-data", "market-data", "fund-data", "exchange-flows", "miner-flows", "inter-entity-flows", "network-indicator", "market-indicator", "mempool-statistics", "lightning-network-statistics", "flow-indicator", "miner-data"] },
      { asset: "Ethereum", slug: "eth", pages: ["entity-status", "network-data", "exchange-flows", "market-data", "market-indicator", "flow-indicator", "fund-data"] },
      { asset: "Stablecoin", slug: "stablecoin", pages: ["entity-status", "exchange-flows", "network-data", "market-data", "flow-indicator"] },
      { asset: "ERC20", slug: "erc20", pages: ["entity-status", "exchange-flows", "market-data", "flow-indicator"] },
      { asset: "Xrp", slug: "xrp", pages: ["entity-flows", "flow-indicator", "market-data", "network-data", "network-indicator", "dex-data", "amm-data"] },
      { asset: "TRX", slug: "trx", pages: ["market-data", "network-data"] },
      { asset: "Alt", slug: "alt", pages: ["market-data"] }
    ];

    for (const { asset, slug, pages } of navLinks) {
      schema[asset] = schema[asset] || {};
      for (const p of pages) {
        const categoryKey = p.replace(/-/g, "_");
        const url = `https://userguide.cryptoquant.com/api/${slug}-${p}`;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
        await new Promise((r) => setTimeout(r, DELAY_MS));

        const paths = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href*="api.cryptoquant.com"]'));
          const codeBlocks = Array.from(document.querySelectorAll("code, pre"));
          const texts = [...links.map((a) => a.textContent), ...codeBlocks.map((c) => c.textContent)].join(" ");
          const matches = texts.match(/\/v1\/[a-z0-9/_-]+/g) || [];
          return [...new Set(matches)];
        });

        const endpoints = (paths || []).slice(0, 20).map((p) => ({
          name: p.split("/").pop() || "unknown",
          method: "GET",
          path: p.startsWith("/") ? p : `/${p}`,
          params: { window: "day", limit: 100 },
          responseExample: null,
          source: "playwright"
        }));

        if (endpoints.length > 0) schema[asset][categoryKey] = endpoints;
      }
    }

    await browser.close();
    return Object.keys(schema).length > 0 ? schema : null;
  } catch (e) {
    console.warn("[cq-scrape-schema] Playwright scrape failed:", e.message);
    return null;
  }
}

async function main() {
  require("dotenv").config({ path: path.join(__dirname, "../.env.local") });
  require("dotenv").config({ path: path.join(__dirname, "../.env") });

  ensureDir(path.dirname(OUTPUT_PATH));

  let schema = null;

  const discovery = await fetchDiscoveryEndpoints();
  if (discovery) {
    schema = transformDiscoveryToSchema(discovery);
    if (schema) console.log("[cq-scrape-schema] Using discovery API");
  }

  if (!schema && process.env.SKIP_PLAYWRIGHT !== "1") {
    try {
      require.resolve("playwright");
      schema = await scrapeWithPlaywright();
      if (schema) console.log("[cq-scrape-schema] Using Playwright scrape");
    } catch (e) {
      if (e.code !== "MODULE_NOT_FOUND") console.warn("[cq-scrape-schema] Playwright:", e.message);
    }
  }

  if (!schema) {
    schema = buildBaselineSchema();
    console.log("[cq-scrape-schema] Using baseline schema");
  }

  const json = JSON.stringify(schema, null, 2);
  fs.writeFileSync(OUTPUT_PATH, json, "utf8");
  console.log("[cq-scrape-schema] Wrote", OUTPUT_PATH);
}

main().catch((e) => {
  console.error("[cq-scrape-schema] Fatal:", e.message);
  process.exit(1);
});
