#!/usr/bin/env node
// scripts/run-discover-and-stock-from-targets.js
// 公式リスト + Grok + Gemini でリスト取得 → X API 実在確認 → KV ストック。即実行用。
//
// 使い方:
//   node scripts/run-discover-and-stock-from-targets.js
//   node scripts/run-discover-and-stock-from-targets.js --lang=ja
//   node scripts/run-discover-and-stock-from-targets.js --lang=en --no-merge
//   node scripts/run-discover-and-stock-from-targets.js --lang=en --maxPerModel=15
//
// 前提: .env に XAI_API_KEY, GEMINI_API_KEY, X API 認証, KV が設定されていること

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { discoverAndStockFromTargets } = require("../services/x/discoverAndStockFromTargets");

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { lang: "en", merge: true, includeOfficial: true, maxPerModel: 25 };
  for (const a of args) {
    if (a === "--no-merge") out.merge = false;
    else if (a === "--no-official") out.includeOfficial = false;
    else if (a.startsWith("--lang=")) out.lang = a.replace(/^--lang=/, "").trim() || "en";
    else if (a.startsWith("--maxPerModel=")) out.maxPerModel = parseInt(a.replace(/^--maxPerModel=/, ""), 10) || 25;
  }
  out.maxPerModel = Math.min(50, Math.max(0, out.maxPerModel));
  return out;
}

function checkEnv() {
  const hasXai = !!process.env.XAI_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasX =
    !!process.env.X_API_CONSUMER_KEY &&
    !!process.env.X_API_CONSUMER_KEY_SECRET &&
    !!process.env.X_API_ACCESS_TOKEN &&
    !!process.env.X_API_ACCESS_TOKEN_SECRET;
  const hasKv = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) || !!process.env.KV_URL;
  console.log("");
  console.log("=== 環境チェック ===");
  console.log("  XAI_API_KEY (Grok):     ", hasXai ? "OK" : "NG");
  console.log("  GEMINI_API_KEY:         ", hasGemini ? "OK" : "NG");
  console.log("  X API (OAuth 1.0a):     ", hasX ? "OK" : "NG");
  console.log("  KV:                     ", hasKv ? "OK" : "NG");
  console.log("");
  if (!hasX) {
    console.error("X API 認証が必須です。.env を確認してください。");
    process.exit(1);
  }
  if (!hasKv) {
    console.error("KV が必須です。.env または Vercel の KV 設定を確認してください。");
    process.exit(1);
  }
  if (!hasXai && !hasGemini) {
    console.error("Grok または Gemini のいずれかが必須です。");
    process.exit(1);
  }
}

async function main() {
  const opts = parseArgs();
  console.log("=== リスト取得 → X 実在確認 → KV ストック ===");
  console.log("  lang:", opts.lang);
  console.log("  mergeWithExisting:", opts.merge);
  console.log("  includeOfficial:", opts.includeOfficial);
  console.log("  maxPerModel:", opts.maxPerModel);
  checkEnv();

  const start = Date.now();
  const result = await discoverAndStockFromTargets(opts.lang, {
    maxPerModel: opts.maxPerModel,
    mergeWithExisting: opts.merge,
    includeOfficial: opts.includeOfficial
  });
  const elapsed = Date.now() - start;

  console.log("");
  console.log("=== 結果 ===");
  console.log("  verified:       ", result.verified);
  console.log("  officialVerified:", result.officialVerified ?? "-");
  console.log("  saved:          ", result.saved);
  console.log("  success:        ", result.success);
  console.log("  elapsed:        ", elapsed, "ms");
  console.log("");
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
