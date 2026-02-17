#!/usr/bin/env node
/**
 * CryptoQuant リファレンス取得 — reference.js の fetchReference を実行する薄いラッパー
 * 出力: data/cryptoquant/docs-snapshot.json, catalog-snapshot.json, cq-openapi-paths.json
 *
 * 使い方:
 *   node scripts/cq-fetch-reference.js
 *   SKIP_PLAYWRIGHT=1 node scripts/cq-fetch-reference.js   # userguide のみ（Playwright なし）
 */
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env.local") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { fetchReference } = require("../services/cryptoquant/reference");

fetchReference({ skipPlaywright: process.env.SKIP_PLAYWRIGHT === "1" })
  .then((out) => {
    if (!out.docsSnapshot && !out.catalogSnapshot && (!out.openApiPaths || out.openApiPaths.paths.length === 0)) {
      console.warn("[cq-fetch-reference] No data collected. Run without SKIP_PLAYWRIGHT=1 and ensure Playwright is installed.");
    }
  })
  .catch((e) => {
    console.error("[cq-fetch-reference] Fatal:", e.message);
    process.exit(1);
  });
