#!/usr/bin/env node
// scripts/generate-sales-letters-all-langs.js
// 6言語分を1バッチで事前生成。リンクは言語別。delay で XAI レート制限を緩和。
// オプションで KV に保存 → 投稿時は getSalesLetterGrokFromCache(lang) で取得（XAI を叩かず数百投稿対応）

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const {
  runGrokOnlySalesLetterAllLangs,
  saveSalesLetterGrokCache,
  SALES_LETTER_LANGS
} = require("../services/salesLetterContest");

const reportData = {
  trapScore: 28,
  priceUsd: 97200,
  change24h: -1.2,
  exchangeNetflow: "negative",
  whaleRatio: 0.42,
  mpi: 0.65,
  sentiment: "fear"
};

const SAVE_TO_KV =
  process.env.SALES_LETTER_SAVE_KV !== "0" && process.env.SALES_LETTER_SAVE_KV !== "false";
const CACHE_TTL = Number(process.env.SALES_LETTER_CACHE_TTL_SECONDS || 14400); // 4h default
const DELAY_MS = Number(process.env.SALES_LETTER_DELAY_MS || 2000);

async function main() {
  console.log("--- Sales Letter All Langs (6 languages, 1 batch) ---");
  console.log(`Delay between calls: ${DELAY_MS}ms`);
  console.log(`Save to KV: ${SAVE_TO_KV} (TTL ${CACHE_TTL}s)`);
  console.log("");

  const results = await runGrokOnlySalesLetterAllLangs({
    reportData,
    delayMs: DELAY_MS
  });

  for (const lang of SALES_LETTER_LANGS) {
    const r = results[lang];
    console.log(`========== ${lang.toUpperCase()} ==========`);
    console.log(r?.fullText || "(no output)");
    console.log("");
  }

  if (SAVE_TO_KV) {
    await saveSalesLetterGrokCache(results, CACHE_TTL);
    console.log("--- Saved to KV. Posting cron can use getSalesLetterGrokFromCache(lang). ---");
  } else {
    console.log("--- Set SALES_LETTER_SAVE_KV=1 to save to KV for posting. ---");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
