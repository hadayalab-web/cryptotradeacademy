#!/usr/bin/env node
/**
 * X API / KIBA 認証まわりの環境と本番エンドポイントを検証するスクリプト
 * - 環境変数が設定されているか
 * - cron が叩くのと同じ URL で /api/kiba/run に POST して 200 か 401 か確認
 *
 * 実行: node scripts/verify-x-api-and-kiba-auth.js
 */
require("../utils/suppressKnownWarnings");
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

function buildBaseUrl() {
  return (
    process.env.INTERNAL_API_BASE_URL ||
    process.env.CRON_BASE_URL ||
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  );
}

async function main() {
  console.log("[verify-x-api-and-kiba-auth] 環境変数と KIBA 認証の検証\n");

  const xBearer = process.env.X_API_BEARER_TOKEN;
  const cronSecret = process.env.CRON_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("1. X API Bearer Token (X_API_BEARER_TOKEN)");
  if (!xBearer || String(xBearer).trim() === "") {
    console.log("   ❌ 未設定または空");
  } else {
    const len = String(xBearer).length;
    console.log("   ✅ 設定済み (長さ: " + len + ")");
    if (len < 20) console.log("   ⚠ 短すぎる可能性があります。Developer Portal の Bearer Token を確認してください。");
  }

  console.log("\n2. CRON_SECRET (cron / kiba/run 認証用)");
  if (!cronSecret || String(cronSecret).trim() === "") {
    console.log("   ❌ 未設定または空 → /api/kiba/run は 401 になります");
  } else {
    console.log("   ✅ 設定済み (長さ: " + String(cronSecret).length + ")");
    const trimmed = String(cronSecret).trim();
    if (trimmed !== String(cronSecret)) console.log("   ⚠ 前後にスペースがあります。Vercel と .env で一致させてください。");
  }

  console.log("\n3. Supabase (buzzweave_status 等)");
  if (supabaseUrl && supabaseKey) {
    console.log("   ✅ URL と SERVICE_ROLE_KEY 設定済み");
  } else {
    console.log("   ❌ URL または KEY が未設定");
  }

  const baseUrl = buildBaseUrl();
  console.log("\n4. 内部 API ベース URL (cron が kiba/run を叩くときのベース)");
  if (!baseUrl) {
    console.log("   ❌ 未設定 (INTERNAL_API_BASE_URL / CRON_BASE_URL / APP_BASE_URL / NEXT_PUBLIC_SITE_URL / VERCEL_URL のいずれかを設定)");
    console.log("   → 本番では VERCEL_URL が自動で入るため、ローカル以外では問題にならないことが多いです。");
    return;
  }
  console.log("   " + baseUrl);

  if (!cronSecret) {
    console.log("\n5. /api/kiba/run の疎通確認");
    console.log("   ⏭ CRON_SECRET が無いためスキップ");
    return;
  }

  const kibaRunUrl = new URL("/api/kiba/run", baseUrl.replace(/\/$/, "")).toString();
  console.log("\n5. /api/kiba/run の疎通確認");
  console.log("   URL: " + kibaRunUrl);

  try {
    const res = await fetch(kibaRunUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + cronSecret
      },
      body: JSON.stringify({ cron_secret: cronSecret }),
      signal: AbortSignal.timeout(15000)
    });
    if (res.ok) {
      console.log("   ✅ " + res.status + " OK — 認証一致。KIBA はこの環境で 200 になります。");
    } else {
      console.log("   ❌ " + res.status + " " + (res.statusText || ""));
      if (res.status === 401) {
        console.log("   → この環境の CRON_SECRET と、上記 URL のデプロイ（Vercel 等）の CRON_SECRET が一致しているか確認してください。");
      }
    }
  } catch (e) {
    console.log("   ❌ リクエスト失敗: " + (e.message || String(e)));
    console.log("   → ネットワークまたは URL が誤っている可能性があります。");
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
