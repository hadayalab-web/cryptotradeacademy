#!/usr/bin/env node
/**
 * buzzweave-run を1回実行する（Vercel 本番 URL に CRON_SECRET でリクエスト）。
 * 使い方: node scripts/buzzweave-unblock-and-run.js
 * 環境変数: CRON_SECRET, BUZZWEAVE_BASE_URL（未設定時は https://cryptotradeacademy.vercel.app）
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const BASE = process.env.BUZZWEAVE_BASE_URL || "https://cryptotradeacademy.vercel.app";
const SECRET = process.env.CRON_SECRET;

if (!SECRET) {
  console.error("CRON_SECRET が未設定です。.env を確認してください。");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${SECRET}` };

async function main() {
  console.log("buzzweave-run を実行しています...");
  const runRes = await fetch(`${BASE}/api/buzzweave-run`, { method: "GET", headers });
  const runJson = await runRes.json().catch(() => ({}));
  if (!runRes.ok) {
    console.error("run 失敗:", runJson.error || runRes.statusText);
    process.exit(1);
  }
  console.log("run 完了:", "posted=" + (runJson.posted ?? 0), runJson.message || "");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
