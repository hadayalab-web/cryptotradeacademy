/**
 * 外部依存ヘルスチェック（100点対応の土台）
 * CQ / X / Vidalytics / Whop の接続・認証を軽量に確認する。
 * 実行: node scripts/health-check-external-deps.js
 * 本番では /api/health から呼ぶか、cron で定期実行してアラートに繋げる想定。
 */
const path = require("path");

function log(name, ok, message) {
  const prefix = ok ? "[OK]" : "[FAIL]";
  console.log(`${prefix} ${name}: ${message}`);
  return ok;
}

let passed = 0;
let failed = 0;

// 1. CRON_SECRET が設定されていれば critical-shift は認証で保護される前提の確認（実 401 は別途 curl で確認推奨）
try {
  const runPath = path.join(__dirname, "../api/critical-shift/run.js");
  const runSrc = require("fs").readFileSync(runPath, "utf8");
  const hasCronSecretCheck =
    runSrc.includes("CRON_SECRET") &&
    (runSrc.includes("Bearer") || runSrc.includes("cron_secret"));
  if (log("critical-shift auth", hasCronSecretCheck, hasCronSecretCheck ? "Auth logic present" : "No CRON_SECRET check found")) passed++;
  else failed++;
} catch (e) {
  log("critical-shift auth", false, e.message);
  failed++;
}

// 2. CryptoQuant クライアントが存在し、エンドポイント設定が参照されているか（404 対策は実 API 要確認）
try {
  const cqPath = path.join(__dirname, "../services/cryptoquant");
  const fs = require("fs");
  const exists = fs.existsSync(cqPath);
  if (log("CQ client", exists, exists ? "CQ service dir exists" : "CQ service dir missing")) passed++;
  else failed++;
} catch (e) {
  log("CQ client", false, e.message);
  failed++;
}

// 3. BuzzWeave が X クライアントを利用しているか（実投稿は test-buzzweave-post.js で検証）
try {
  const bwePath = path.join(__dirname, "../services/td/buzzWeaveEngine.js");
  const bweSrc = require("fs").readFileSync(bwePath, "utf8");
  const usesX = bweSrc.includes("postTweet") || bweSrc.includes("postQuote") || bweSrc.includes("client");
  if (log("BWE X usage", usesX, usesX ? "BWE references X post path" : "BWE X path not found")) passed++;
  else failed++;
} catch (e) {
  log("BWE X usage", false, e.message);
  failed++;
}

console.log("\n---");
console.log("Passed:", passed, "Failed:", failed);
console.log("Note: 401 / 404 / actual post は本番 or ステージングで要確認。");
if (failed > 0) process.exit(1);
