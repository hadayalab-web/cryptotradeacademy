#!/usr/bin/env node
/**
 * BuzzWeave ロックを手動解除するスクリプト
 * ロックが残り続けて BWE が一度も走らない場合に実行
 *
 * 実行: node scripts/release-buzzweave-lock.js
 * 前提: .env に SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY が設定されていること
 */
require("../utils/suppressKnownWarnings");
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { releaseBuzzweaveLock } = require("../utils/supabase");

async function main() {
  console.log("[release-buzzweave-lock] Releasing buzzweave_main lock...");
  await releaseBuzzweaveLock();
  console.log("[release-buzzweave-lock] Done. Lock released.");
}

main().catch((e) => {
  console.error("[release-buzzweave-lock] Error:", e.message);
  process.exit(1);
});
