#!/usr/bin/env node
/** KIBA 配信文のサンプルを標準出力に表示（formatCriticalAlert のみ、送信なし） */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { formatCriticalAlert } = require("../services/ai/gpt5mini.js");

const snapshot = {
  level: "HIGH",
  btcContext: { priceUsd: 97200, change24h: -1.2, regime: "Risk_Off" },
  macroContext: { nasdaqRegime: "Risk_On", goldWhaleBias: "neutral", macroRiskOnOff: "Off" }
};

console.log("=== KIBA 配信文サンプル (JA) ===\n");
console.log(formatCriticalAlert(snapshot, "ja"));
console.log("\n=== KIBA 配信文サンプル (EN) ===\n");
console.log(formatCriticalAlert(snapshot, "en"));
