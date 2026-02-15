/**
 * Trap Defence OS — 自律投稿の実弾投入
 * AUTONOMOUS_SLOT_MODE=true で generateDailySlots → runBuzzWeaveCycle（dryRun=false）
 *
 * 実行: node scripts/fire-autonomous-post.js
 * dryRun: node scripts/fire-autonomous-post.js --dry-run
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

process.env.AUTONOMOUS_SLOT_MODE = "true";

const { getKV } = require("../utils/kv");
const { BTC_SNAPSHOT_KV_KEY, BTC_SNAPSHOT_MAX_AGE_MS } = require("../services/snapshot/btcSnapshotSchema");
const { assetSnapshotKvKey } = require("../services/snapshot/assetSnapshotSchema");
const { generateDailySlots, runBuzzWeaveCycle } = require("../services/td/buzzWeaveEngine");

const dryRun = process.argv.includes("--dry-run");

async function main() {
  console.log("[fire-autonomous-post] AUTONOMOUS_SLOT_MODE=true で実弾投入");
  console.log("[fire-autonomous-post] dryRun:", dryRun);

  const kv = getKV();
  if (!kv) {
    console.error("❌ KV not available. Run /api/cron first or check KV env.");
    process.exit(1);
  }

  let btcSnapshot = null;
  try {
    let raw = await kv.get(assetSnapshotKvKey("BTC"));
    if (!raw) raw = await kv.get(BTC_SNAPSHOT_KV_KEY);
    if (raw?.as_of_utc) {
      const age = Date.now() - new Date(raw.as_of_utc).getTime();
      if (age <= BTC_SNAPSHOT_MAX_AGE_MS) btcSnapshot = raw;
    }
  } catch (e) {
    console.warn("[fire-autonomous-post] KV get snapshot failed:", e?.message);
  }

  if (!btcSnapshot) {
    console.error("❌ No btcSnapshot in KV (run /api/cron first).");
    process.exit(1);
  }

  console.log("[fire-autonomous-post] 1. generateDailySlots (autonomous 1 slot)...");
  const slotResult = await generateDailySlots();
  console.log("[fire-autonomous-post] generateDailySlots:", JSON.stringify(slotResult, null, 2));

  if (!slotResult.ok || !slotResult.count) {
    console.warn("[fire-autonomous-post] No slots inserted. Continuing anyway (may use existing slot)...");
  }

  console.log("[fire-autonomous-post] 2. runBuzzWeaveCycle (dryRun=" + dryRun + ")...");
  const result = await runBuzzWeaveCycle({
    dryRun,
    langFilter: null,
    btcSnapshot
  });

  console.log("\n✅ 完了:");
  console.log(JSON.stringify(result, null, 2));

  if (result.posted > 0) {
    console.log("\n🚀 posted:", result.posted, result.tweetId ? `tweetId: ${result.tweetId}` : "");
  }
}

main().catch((e) => {
  console.error("❌ Error:", e?.message);
  process.exit(1);
});
