#!/usr/bin/env node
/**
 * Trap Defence X Repost OS — 12リンク統合の動作確認
 * Usage: node scripts/verify-vid-links-stateless.js
 * または .env 読込後: node -r dotenv/config scripts/verify-vid-links-stateless.js
 */
const { pickVidalyticsLink } = require("../config/buzzweaveLinks");

const LANGS = ["en", "es", "pt", "pt-br", "ja", "ko", "ar"];
const TIERS = ["regular", "minimal", "mixed"];

console.log("=== Trap Defence X Repost OS — Vidalytics リンク確認 ===\n");

for (const lang of LANGS) {
  console.log(`[${lang.toUpperCase()}]`);
  for (const tier of TIERS) {
    const link = pickVidalyticsLink(lang, tier);
    const vid = link.match(/vid\/([A-Za-z0-9_-]+)/)?.[1] || "?";
    console.log(`  tier=${tier.padEnd(8)} → ${vid}`);
  }
  console.log("");
}

console.log("=== 6言語 × pickVidalyticsLink 確認完了 ===\n");

// buildBodyWithMode の link 差し込み確認
const { buildBodyWithMode } = require("../config/buzzweaveLinks");
for (const lang of ["en", "ja"]) {
  const text = buildBodyWithMode(lang, 0, "mixed", "template", []);
  const hasLink = text.includes("vidalytics") || text.includes("preview.vidalytics");
  console.log(`buildBodyWithMode(${lang}, template): hasLink=${hasLink} len=${text.length}`);
}
console.log("\n12リンク統合完了");
