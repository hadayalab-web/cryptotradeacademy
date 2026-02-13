/**
 * TD BuzzWeave Engine — 1サイクル実行 API
 * Cron: GET /api/buzzweave-run?lang=en など（1 run で 1 言語のみ、round-robin で lang を渡す）
 *
 * 緊急停止: BUZZWEAVE_EMERGENCY_STOP=true で即 return
 * ロック: 多重実行防止のため buzzweave_locks で排他
 *
 * Runtime: Node.js を強制（Edge では console.log 等が期待どおり動かないため）
 */

const { runBuzzWeaveCycle } = require("../services/td/buzzWeaveEngine");
const { loadEnv } = require("../utils/loadEnv");
const { getKV } = require("../utils/kv");
const { BTC_SNAPSHOT_KV_KEY, BTC_SNAPSHOT_MAX_AGE_MS } = require("../services/snapshot/btcSnapshotSchema");
const { assetSnapshotKvKey } = require("../services/snapshot/assetSnapshotSchema");
const {
  acquireBuzzweaveLock,
  releaseBuzzweaveLock,
  upsertBuzzweaveStatusEmergencyStop,
  getBuzzweaveStatus
} = require("../utils/supabase");
loadEnv();

const BUZZWEAVE_LANGS = ["en", "es", "pt", "ja", "ko", "ar"];

async function handler(req, res) {
  console.log("[buzzweave-run] handler start");

  if (req.method !== "GET" && req.method !== "POST") {
    console.log("[buzzweave-run] early return: method not allowed");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const querySecret = req.query?.cron_secret;
  const authOk = !cronSecret || authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret;
  if (!authOk) {
    console.log("[buzzweave-run] early return: 401 Unauthorized (cronSecret set, Bearer or cron_secret mismatch)");
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  if (process.env.BUZZWEAVE_EMERGENCY_STOP === "true" || process.env.BUZZWEAVE_EMERGENCY_STOP === "1") {
    console.log("[buzzweave-run] early return: Emergency stop active");
    await upsertBuzzweaveStatusEmergencyStop("env_flag");
    return res.status(200).json({ ok: true, message: "Emergency stop active", posted: 0 });
  }

  const status = await getBuzzweaveStatus();
  if (status.x_api_blocked) {
    console.log("[buzzweave-run] early return: X API blocked flag active");
    return res.status(200).json({ ok: true, message: "X API blocked flag active", posted: 0 });
  }

  const acquired = await acquireBuzzweaveLock();
  if (!acquired) {
    console.log("[buzzweave-run] early return: Locked (another run in progress)");
    return res.status(200).json({ ok: true, message: "Locked (another run in progress)", posted: 0 });
  }

  const dryRun = req.query?.dry_run === "true" || req.query?.dry_run === "1";
  const assetParam = (req.query?.asset || "BTC").toUpperCase();
  const langParam = req.query?.lang;
  const langFilter = langParam && BUZZWEAVE_LANGS.includes(langParam)
    ? langParam
    : BUZZWEAVE_LANGS[Math.floor(Date.now() / 60000) % BUZZWEAVE_LANGS.length];

  let btcSnapshot = null;
  let kv = null;
  try {
    kv = getKV();
    if (kv) {
      const assetKey = assetSnapshotKvKey(assetParam);
      let raw = await kv.get(assetKey);
      if (!raw && assetParam === "BTC") raw = await kv.get(BTC_SNAPSHOT_KV_KEY);
      if (raw && raw.as_of_utc) {
        const age = Date.now() - new Date(raw.as_of_utc).getTime();
        if (age <= BTC_SNAPSHOT_MAX_AGE_MS) btcSnapshot = raw;
        else console.warn("[buzzweave-run] snapshot too old, age_ms=" + age);
      } else {
        console.warn("[buzzweave-run] no snapshot in KV for asset=" + assetParam + " (run /api/cron first)");
      }
    }
  } catch (e) {
    console.warn("[buzzweave-run] KV get snapshot failed:", e.message);
  }

  if (!btcSnapshot) {
    console.log("[buzzweave-run] early return: SKIP_NO_SNAPSHOT (no btcSnapshot in KV)");
    console.warn("[BWE] No btcSnapshot available, skipping BuzzWeave cycle.");
    await releaseBuzzweaveLock();
    return res.status(200).json({ ok: true, status: "SKIP_NO_SNAPSHOT", message: "No btcSnapshot in KV (run /api/cron first)", posted: 0 });
  }

  if (kv && !btcSnapshot.macroContext) {
    try {
      const [nasdaq, gold] = await Promise.all([
        kv.get(assetSnapshotKvKey("NASDAQ")),
        kv.get(assetSnapshotKvKey("GOLD"))
      ]);
      if (nasdaq || gold) {
        const { buildMacroContextFromAssets } = require("../logic/criticalShift/macroRiskEvaluator");
        const macroContext = buildMacroContextFromAssets({
          nasdaqSnapshot: nasdaq || null,
          goldSnapshot: gold || null
        });
        btcSnapshot = { ...btcSnapshot, macroContext };
      }
    } catch (_) {}
  }

  try {
    console.log("[buzzweave-run] calling runBuzzWeaveCycle", { dryRun, langFilter });
    const result = await runBuzzWeaveCycle({ dryRun, langFilter, btcSnapshot });
    return res.status(200).json(result);
  } catch (e) {
    console.error("[buzzweave-run] error:", e.message);
    return res
      .status(500)
      .setHeader("x-vercel-no-retry", "1")
      .json({ ok: false, message: "Internal error", posted: 0 });
  } finally {
    await releaseBuzzweaveLock();
  }
}

module.exports = handler;
module.exports.config = { runtime: "nodejs" };
