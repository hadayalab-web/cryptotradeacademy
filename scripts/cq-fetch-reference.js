#!/usr/bin/env node
/**
 * CryptoQuant リファレンス取得スクリプト
 * https://cryptoquant.com/docs と https://cryptoquant.com/catalog を
 * スクリプトで突破して参照用データとして保存する。
 *
 * 戦略:
 *  1. Playwright で docs / catalog (SPA) をレンダリングし、DOM から抽出
 *  2. userguide.cryptoquant.com を fetch で巡回し、埋め込み OpenAPI JSON からパス一覧を取得
 *
 * 出力: data/cryptoquant/docs-snapshot.json, catalog-snapshot.json, cq-openapi-paths.json
 */
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../data/cryptoquant");
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

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Playwright で cryptoquant.com/docs の内容を抽出
 */
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

      const links = Array.from(document.querySelectorAll("a[href]")).map((a) => ({
        href: a.getAttribute("href"),
        text: (a.textContent || "").trim().slice(0, 200)
      })).filter((l) => l.href && (l.href.startsWith("/") || l.href.includes("cryptoquant")));

      const codeBlocks = Array.from(document.querySelectorAll("code, pre")).map((c) => (c.textContent || "").trim());
      const allText = [body.innerText, ...codeBlocks].join(" ");
      const pathMatches = allText.match(/\/v1\/[a-z0-9/_-]+/g) || [];
      const paths = [...new Set(pathMatches)];

      const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4")).map((h) => ({
        tag: h.tagName,
        text: (h.textContent || "").trim().slice(0, 300)
      }));

      return {
        title: document.title || "CryptoQuant Docs",
        url: "https://cryptoquant.com/docs",
        fetchedAt: new Date().toISOString(),
        sections: headings,
        paths,
        links: links.slice(0, 150),
        rawText: body.innerText ? body.innerText.slice(0, 15000) : ""
      };
    });

    await browser.close();
    return extracted;
  } catch (e) {
    console.warn("[cq-fetch-reference] Playwright docs failed:", e.message);
    return null;
  }
}

/**
 * Playwright で cryptoquant.com/catalog の内容を抽出
 */
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

      const links = Array.from(document.querySelectorAll("a[href]")).map((a) => ({
        href: a.getAttribute("href"),
        text: (a.textContent || "").trim().slice(0, 200)
      })).filter((l) => l.href && l.text);

      const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4")).map((h) => (h.textContent || "").trim());
      const assets = headings.filter((t) => /Bitcoin|Ethereum|XRP|TRON|Stablecoin|ERC-20|Alt/i.test(t));

      return {
        title: document.title || "CryptoQuant Catalog",
        url: "https://cryptoquant.com/catalog",
        fetchedAt: new Date().toISOString(),
        assets: [...new Set(assets)],
        links: links.slice(0, 100),
        rawText: body.innerText ? body.innerText.slice(0, 8000) : ""
      };
    });

    await browser.close();
    return extracted;
  } catch (e) {
    console.warn("[cq-fetch-reference] Playwright catalog failed:", e.message);
    return null;
  }
}

/**
 * userguide.cryptoquant.com を fetch で巡回し、埋め込み OpenAPI からパス一覧を取得
 */
async function fetchUserguideOpenApiPaths() {
  const pathList = [];
  const pathToMeta = {};

  for (const { asset, slug, pages } of USERGUIDE_NAV) {
    for (const p of pages) {
      const url = `https://userguide.cryptoquant.com/api/${slug}-${p}`;
      try {
        const res = await fetch(url, { headers: { "Accept": "text/html,application/xhtml+xml" } });
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
              if (getOp && !pathToMeta[fullPath]) {
                pathToMeta[fullPath] = {
                  summary: getOp.summary || null,
                  description: typeof getOp.description === "string" ? getOp.description.slice(0, 500) : null,
                  asset,
                  category: p
                };
              }
            }
          } catch (_) {}
        }
        const pathRegex = /"\/[a-z]+\/[a-z0-9-]+\/[a-z0-9-]+"/g;
        const pathMatches = html.match(pathRegex) || [];
        for (const m of pathMatches) {
          const p = m.replace(/"/g, "");
          const fullPath = p.startsWith("/v1") ? p : `/v1${p}`;
          if (!pathList.includes(fullPath)) pathList.push(fullPath);
        }
        const pathInText = html.match(/\/v1\/[a-z0-9/_-]+/g) || html.match(/\/btc\/[a-z0-9/_-]+|\/eth\/[a-z0-9/_-]+|\/stablecoin\/[a-z0-9/_-]+|\/xrp\/[a-z0-9/_-]+|\/trx\/[a-z0-9/_-]+|\/alt\/[a-z0-9/_-]+|\/erc20\/[a-z0-9/_-]+/g) || [];
        for (const p of pathInText) {
          const fullPath = p.startsWith("/v1") ? p : `/v1${p}`;
          if (!pathList.includes(fullPath)) pathList.push(fullPath);
          if (!pathToMeta[fullPath]) {
            const segments = fullPath.split("/").filter(Boolean);
            const categorySlug = segments.length >= 3 ? segments[2] : (segments[1] || p);
            pathToMeta[fullPath] = { asset, category: categorySlug, source: "userguide-html" };
          }
        }
      } catch (e) {
        console.warn("[cq-fetch-reference] userguide fetch failed:", url, e.message);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return { paths: pathList, pathMeta: pathToMeta, fetchedAt: new Date().toISOString() };
}

async function main() {
  require("dotenv").config({ path: path.join(__dirname, "../.env.local") });
  require("dotenv").config({ path: path.join(__dirname, "../.env") });

  ensureDir(DATA_DIR);

  let docsSnapshot = null;
  let catalogSnapshot = null;

  if (process.env.SKIP_PLAYWRIGHT !== "1") {
    try {
      require.resolve("playwright");
      console.log("[cq-fetch-reference] Fetching docs (Playwright)...");
      docsSnapshot = await fetchDocsWithPlaywright();
      if (docsSnapshot) {
        fs.writeFileSync(path.join(DATA_DIR, "docs-snapshot.json"), JSON.stringify(docsSnapshot, null, 2), "utf8");
        console.log("[cq-fetch-reference] Wrote docs-snapshot.json");
      }
      console.log("[cq-fetch-reference] Fetching catalog (Playwright)...");
      catalogSnapshot = await fetchCatalogWithPlaywright();
      if (catalogSnapshot) {
        fs.writeFileSync(path.join(DATA_DIR, "catalog-snapshot.json"), JSON.stringify(catalogSnapshot, null, 2), "utf8");
        console.log("[cq-fetch-reference] Wrote catalog-snapshot.json");
      }
    } catch (e) {
      if (e.code !== "MODULE_NOT_FOUND") console.warn("[cq-fetch-reference] Playwright:", e.message);
    }
  }

  console.log("[cq-fetch-reference] Fetching userguide OpenAPI paths...");
  const openApiData = await fetchUserguideOpenApiPaths();
  fs.writeFileSync(
    path.join(DATA_DIR, "cq-openapi-paths.json"),
    JSON.stringify(openApiData, null, 2),
    "utf8"
  );
  console.log("[cq-fetch-reference] Wrote cq-openapi-paths.json, paths count:", openApiData.paths.length);

  if (!docsSnapshot && !catalogSnapshot && openApiData.paths.length === 0) {
    console.warn("[cq-fetch-reference] No data collected. Run without SKIP_PLAYWRIGHT=1 and ensure Playwright is installed.");
  }
}

main().catch((e) => {
  console.error("[cq-fetch-reference] Fatal:", e.message);
  process.exit(1);
});
