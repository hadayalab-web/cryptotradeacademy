#!/usr/bin/env node
// scripts/generate-sales-letter-grok-only.js
// Grok-4-1-fast-reasoning のみでセールスレター生成（ヘッドライン → 本文 → ハッシュタグ）

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { runGrokOnlySalesLetter } = require("../services/salesLetterContest");

// argv 優先。LANG が en_US.UTF-8 のときは en に正規化
const raw = process.argv[2] || process.env.LANG || "en";
const segment = raw
  .toLowerCase()
  .replace(/\.utf-8$/i, "")
  .split(/[._-]/)[0];
const supported = ["en", "ja", "es", "pt-br", "ar", "ko"];
const langFinal = segment === "pt" ? "pt-br" : supported.includes(segment) ? segment : "en";

const reportData = {
  trapScore: 28,
  priceUsd: 97200,
  change24h: -1.2,
  exchangeNetflow: "negative",
  whaleRatio: 0.42,
  mpi: 0.65,
  sentiment: "fear"
};

async function main() {
  console.log("--- Sales Letter (Grok-4-1-fast-reasoning only) ---");
  console.log(`Lang: ${langFinal}`);
  console.log(
    `CQ: Trap ${reportData.trapScore}, BTC $${reportData.priceUsd}, 24h ${reportData.change24h}%`
  );
  console.log("");

  const { prompt, text } = await runGrokOnlySalesLetter({
    lang: langFinal,
    reportData
  });

  console.log("========== PROMPT (excerpt) ==========");
  console.log(prompt.slice(0, 700) + (prompt.length > 700 ? "..." : ""));
  console.log("");

  console.log("========== OUTPUT (Headline → Body → Hashtags) ==========");
  console.log(text || "(no output)");
  console.log("");
  console.log("--- Done. Add VSL + Whop links below when posting. ---");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
