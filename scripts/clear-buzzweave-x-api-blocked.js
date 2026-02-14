#!/usr/bin/env node
/**
 * X API blocked フラグを手動解除するスクリプト
 * Token 修正後や 402 解消後に実行し、BuzzWeave の run を再開する
 *
 * 実行: node scripts/clear-buzzweave-x-api-blocked.js
 * 前提: .env に NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY が設定されていること
 */
require("../utils/suppressKnownWarnings");
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { clearBuzzweaveStatusXApiBlocked, getBuzzweaveStatus } = require("../utils/supabase");

async function main() {
  const before = await getBuzzweaveStatus();
  console.log("[clear-buzzweave-x-api-blocked] Current x_api_blocked:", before.x_api_blocked);

  const result = await clearBuzzweaveStatusXApiBlocked();
  if (!result.ok) {
    throw new Error(result.error || "Failed to clear");
  }

  const after = await getBuzzweaveStatus();
  console.log("[clear-buzzweave-x-api-blocked] Cleared. x_api_blocked:", after.x_api_blocked);
  console.log("[clear-buzzweave-x-api-blocked] Done. Next buzzweave-run will attempt X API again.");
}

main().catch((e) => {
  console.error("[clear-buzzweave-x-api-blocked] Error:", e.message);
  process.exit(1);
});
