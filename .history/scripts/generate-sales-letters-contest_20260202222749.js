#!/usr/bin/env node
// scripts/generate-sales-letters-contest.js
// セールスレターを3者（GPT-5-mini / Grok-4-1-fast-reasoning / Gemini-3-flash）で生成。
// ペルソナ + CQオンチェーン必須。無料版・有料版のチラ見せプレゼンさせる。
// 使い方: node scripts/generate-sales-letters-contest.js [lang]
// 例: node scripts/generate-sales-letters-contest.js en
//     node scripts/generate-sales-letters-contest.js ja

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { runSalesLetterContest } = require("../services/salesLetterContest");

const lang = process.argv[2] || process.env.LANG || "en";

// CQオンチェーンデータ（サンプル。本番は reportData を API/cron から渡す）
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
  console.log("--- Sales Letter Contest ---");
  console.log(`Lang: ${lang}`);
  console.log(
    `CQ: Trap ${reportData.trapScore}, BTC $${reportData.priceUsd}, 24h ${reportData.change24h}%`
  );
  console.log("");

  const { prompt, gpt, grok, gemini } = await runSalesLetterContest({ lang, reportData });

  console.log("========== PROMPT (excerpt) ==========");
  console.log(prompt.slice(0, 600) + (prompt.length > 600 ? "..." : ""));
  console.log("");

  console.log("========== GPT-5-mini-2025-08-07 ==========");
  console.log(gpt || "(no output)");
  console.log("");

  console.log("========== Grok-4-1-fast-reasoning ==========");
  console.log(grok || "(no output)");
  console.log("");

  console.log("========== Gemini-3-flash-preview ==========");
  console.log(gemini || "(no output)");
  console.log("");

  console.log("--- Done. Add VSL + Whop links below each letter when posting. ---");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
