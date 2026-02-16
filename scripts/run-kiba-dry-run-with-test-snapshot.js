#!/usr/bin/env node
/**
 * テスト用スナップショットで KIBA をドライランし、発火時のアラート文を表示する。
 * KV への書き込み・Telegram 送信は行わない。
 *
 * 実行: node scripts/run-kiba-dry-run-with-test-snapshot.js
 * 前提: .env に KV 関連の環境変数（nasdaq/gold/lastKiba 取得用）。
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
require("../utils/suppressKnownWarnings");

const { getKV } = require("../utils/kv");
const { runKibaOnce } = require("../api/kiba/run");
const { createTriggeringBtcSnapshot } = require("./mock-kiba-trigger-snapshot");

const ALERT_LANGS = ["en", "ja", "es", "ko", "pt-br", "ar"];

async function main() {
  console.log("=== KIBA Dry Run (テスト用スナップショット) ===\n");

  const kv = getKV();
  if (!kv) {
    console.log("KV が利用できません（nasdaq/gold 取得用に KV_REST_API_URL 等を .env に設定してください）。");
    process.exit(1);
  }

  const testSnapshot = createTriggeringBtcSnapshot();
  const result = await runKibaOnce(kv, {
    asset: "BTC",
    dryRun: true,
    btcSnapshot: testSnapshot
  });

  console.log("triggered:", result.triggered);
  console.log("impact:", result.impact?.level ?? "NONE", result.impact?.intensity ?? "");
  if (result.impact?.level !== "NONE") {
    console.log("(テストスナップショットにより発火想定)");
  }
  console.log("source:", result.source ?? "");
  if (result.dryRun) console.log("(dryRun: true — KV 未書き込み・Telegram 未送信)\n");

  if (result.triggered && result.dispatchPayload?.alerts) {
    console.log("--- アラート文（各言語） ---");
    for (const lang of ALERT_LANGS) {
      const text = result.dispatchPayload.alerts[lang];
      if (text && typeof text === "string") {
        console.log("\n[" + lang + "]");
        console.log(text);
      }
    }
    console.log("\n--- END alerts ---");
  }

  console.log("\n--- END KIBA Dry Run ---");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
