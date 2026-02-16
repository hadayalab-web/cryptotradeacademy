/**
 * TD BuzzWeave Engine — 1サイクル実行 API
 * Cron: GET /api/buzzweave-run?lang=en など（1 run で 1 言語のみ、round-robin で lang を渡す）
 *
 * 常に PQT-only（テンプレ）: runBuzzWeaveCycle は runBuzzWeaveCyclePqtOnly に委譲。旧 GPT 寄生コピー経路は廃止。
 * 緊急停止: BUZZWEAVE_EMERGENCY_STOP=true で即 return
 *
 * Runtime: Node.js を強制（Edge では console.log 等が期待どおり動かないため）
 */
require("../utils/suppressKnownWarnings");

const { runBuzzWeaveCycle } = require("../services/td/buzzWeaveEngine");
const { loadEnv } = require("../utils/loadEnv");
const { getKV } = require("../utils/kv");
const { BTC_SNAPSHOT_KV_KEY, BTC_SNAPSHOT_MAX_AGE_MS } = require("../services/snapshot/btcSnapshotSchema");
const { assetSnapshotKvKey } = require("../services/snapshot/assetSnapshotSchema");
const {
  upsertBuzzweaveStatusEmergencyStop,
  isSupabaseConfigured,
  getTodayRunCount,
  getLastRunTimestamp,
  recordBuzzWeaveRun
} = require("../utils/supabase");
const { determineDailyRunTarget } = require("../services/td/autonomousSlotGenerator");
loadEnv();

const BUZZWEAVE_LANGS = ["en", "es", "pt", "ja", "ko", "ar"];
// 6言語圏の時間に合わせる: UTC 時刻で言語を切り替え（0-3→ja, 4-7→ko, 8-11→en, 12-15→es, 16-19→pt, 20-23→ar）。BUZZWEAVE_LANG_BY_UTC=false で従来の分単位 round-robin に戻す。
const LANGS_BY_UTC_HOUR_BLOCK = ["ja", "ko", "en", "es", "pt", "ar"];
function getLangByUtcHour() {
  const utcHour = new Date().getUTCHours();
  const index = Math.floor(utcHour / 4) % LANGS_BY_UTC_HOUR_BLOCK.length;
  return LANGS_BY_UTC_HOUR_BLOCK[index];
}
const MIN_RUN_INTERVAL_HOURS = Number(process.env.BUZZWEAVE_MIN_RUN_INTERVAL_HOURS) || 3;
const MIN_RUN_INTERVAL_MS = MIN_RUN_INTERVAL_HOURS * 60 * 60 * 1000;

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

  if (!isSupabaseConfigured()) {
    console.error("[buzzweave-run] early return: Supabase NOT configured (NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY missing on Vercel)");
    return res.status(503).json({ ok: false, message: "Supabase not configured", posted: 0 });
  }

  // クエリで明示されていればそれを使う。未指定なら X_POSTING_DRY_RUN を参照（本番で投稿止めたいときは env で true にできる）
  const dryRun =
    req.query?.dry_run === "true" ||
    req.query?.dry_run === "1" ||
    process.env.X_POSTING_DRY_RUN === "true" ||
    process.env.X_POSTING_DRY_RUN === "1";
  const assetParam = (req.query?.asset || "BTC").toUpperCase();
  const langParam = req.query?.lang;
  const useLangByUtc = process.env.BUZZWEAVE_LANG_BY_UTC !== "false" && process.env.BUZZWEAVE_LANG_BY_UTC !== "0";
  const langFilter = langParam && BUZZWEAVE_LANGS.includes(langParam)
    ? langParam
    : useLangByUtc
      ? getLangByUtcHour()
      : BUZZWEAVE_LANGS[Math.floor(Date.now() / 60000) % BUZZWEAVE_LANGS.length];

  try {
    if (dryRun) {
      console.log("[buzzweave-run] dry_run=true — 投稿は行わず候補取得・スロット選定・サンプル生成まで実行");
    }
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
      return res.status(200).json({ ok: true, status: "SKIP_NO_SNAPSHOT", message: "No btcSnapshot in KV (run /api/cron first)", posted: 0 });
    }

    const dailyLimit = determineDailyRunTarget(btcSnapshot);
    const todayRuns = await getTodayRunCount();
    if (todayRuns >= dailyLimit) {
      console.log("[buzzweave-run] early return: daily_limit_reached", { todayRuns, dailyLimit });
      return res.status(200).json({ ok: true, skipped: "daily_limit_reached", todayRuns, dailyLimit, posted: 0 });
    }

    const lastRunAt = await getLastRunTimestamp();
    if (lastRunAt > 0 && Date.now() - lastRunAt < MIN_RUN_INTERVAL_MS) {
      const waitMs = MIN_RUN_INTERVAL_MS - (Date.now() - lastRunAt);
      console.log("[buzzweave-run] early return: interval_not_reached", { lastRunAt, waitMs });
      return res.status(200).json({ ok: true, skipped: "interval_not_reached", posted: 0 });
    }

    if (kv && !btcSnapshot.macroContext) {
      try {
        const [nasdaq, gold] = await Promise.all([
          kv.get(assetSnapshotKvKey("NASDAQ")),
          kv.get(assetSnapshotKvKey("GOLD"))
        ]);
        if (nasdaq || gold) {
          const { buildMacroContextFromAssets } = require("../logic/macroRiskEvaluator");
          const macroContext = buildMacroContextFromAssets({
            nasdaqSnapshot: nasdaq || null,
            goldSnapshot: gold || null
          });
          btcSnapshot = { ...btcSnapshot, macroContext };
        }
      } catch (_) {}
    }

    console.log("[buzzweave-run] run started");
    const result = await runBuzzWeaveCycle({ dryRun, langFilter, btcSnapshot });
    const posted = result && typeof result.posted === "number" ? result.posted : 0;
    console.log("[buzzweave-run] run completed", "posted=" + posted, "runId=" + (result?.runId || ""), result?.message ? "message=" + result.message : "");
    if (result?.shortReport) {
      const s = result.shortReport;
      console.log(
        "[buzzweave-run] short_report",
        "run_id=" + (s.run_id || ""),
        "lang=" + (s.lang || ""),
        "posts_fetched=" + (s.posts_fetched ?? ""),
        "candidates=" + (s.candidates ?? ""),
        "slots=" + (s.slots ?? ""),
        "cap=" + (s.cap ?? ""),
        "posted=" + (s.posted ?? ""),
        "fill_rate=" + (s.fill_rate ?? "")
      );
    }
    await recordBuzzWeaveRun();
    return res.status(200).json(result);
  } catch (e) {
    console.error("[buzzweave-run] ❌ Error in runBuzzWeave", e.message);
    console.error("[buzzweave-run] Stack trace:", e.stack);
    return res
      .status(500)
      .setHeader("x-vercel-no-retry", "1")
      .json({ ok: false, message: "Internal error", posted: 0 });
  }
}

module.exports = handler;
module.exports.config = { runtime: "nodejs" };
