#!/usr/bin/env node
/**
 * KIBA をドライランで1回実行し、結果（triggered / impact / 各言語アラート文）を標準出力に表示する。
 * KV への書き込み・Telegram 送信は行わない。
 *
 * 実行: node scripts/run-kiba-dry-run.js
 * 前提: .env に KV 関連の環境変数（KV_REST_API_URL 等）が設定されていること。
 *       KV に btc snapshot が存在すること（先に /api/cron を実行済みだと確実）。
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
require("../utils/suppressKnownWarnings");

const { getKV } = require("../utils/kv");
const { runKibaOnce } = require("../api/kiba/run");

const ALERT_LANGS = ["en", "ja", "es", "ko", "pt-br", "ar"];

async function main() {
  console.log("=== KIBA Dry Run ===\n");

  const kv = getKV();
  if (!kv) {
    console.log("KV が利用できません（KV_REST_API_URL 等を .env に設定してください）。");
    console.log("本番では /api/cron 実行後に btc snapshot が KV に保存されます。");
    process.exit(1);
  }

  const result = await runKibaOnce(kv, { asset: "BTC", dryRun: true });

  console.log("triggered:", result.triggered);
  console.log("impact:", result.impact?.level ?? "NONE", result.impact?.intensity ?? "");
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
