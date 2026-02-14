require("../../utils/suppressKnownWarnings");
const { getKV } = require("../../utils/kv");
const { runKibaEngine } = require("../../core/kiba/kiba_engine");
const { getKibaLatestKey } = require("../../services/snapshot/kibaSnapshotSchema");
const { buildAndWriteKibaSnapshot } = require("../../services/snapshot/kibaSnapshotBuilder");
const { formatCriticalAlert } = require("../../services/ai/gpt5mini");
const { buildMacroContextFromAssets } = require("../../logic/macroRiskEvaluator");

const ALERT_LANGS = ["en", "ja", "es", "ko", "pt-br", "ar"];
const BTC_SNAPSHOT_KEYS = ["asset:snapshot:BTC", "btc:snapshot"];

/** /api/health 用: 最終実行時刻とステータスを KV に記録 */
async function writeKibaHealthStatus(kv, status) {
  if (!kv) return;
  try {
    await kv.set("health:kiba:lastRun", Date.now());
    await kv.set("health:kiba:lastStatus", status);
  } catch (_) {}
}

function toNumberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function getFirstSnapshot(kv, keys) {
  for (const key of keys) {
    try {
      const value = await kv.get(key);
      if (value) return { key, value };
    } catch (error) {
      console.warn("[kiba/run] Failed to load " + key + ":", error?.message);
    }
  }
  return { key: null, value: null };
}

function buildMacroSnapshot(_ref) {
  const { btcSnapshot, nasdaqSnapshot, goldSnapshot } = _ref;
  const nasdaqChange24h = toNumberOrNull(nasdaqSnapshot?.raw?.change24h);
  const goldChange24h = toNumberOrNull(goldSnapshot?.raw?.change24h);
  const fromBtc =
    btcSnapshot?.macroContext &&
    (btcSnapshot.macroContext.macroRiskOnOff != null ||
      btcSnapshot.macroContext.nasdaqRegime != null ||
      btcSnapshot.macroContext.goldWhaleBias != null);
  const macro = fromBtc
    ? {
        nasdaqRegime: btcSnapshot.macroContext.nasdaqRegime ?? null,
        goldWhaleBias:
          btcSnapshot.macroContext.goldWhaleBias == null
            ? null
            : String(btcSnapshot.macroContext.goldWhaleBias),
        macroRiskOnOff: btcSnapshot.macroContext.macroRiskOnOff ?? null
      }
    : buildMacroContextFromAssets({ nasdaqSnapshot, goldSnapshot });

  return {
    nasdaq: nasdaqSnapshot || null,
    gold: goldSnapshot || null,
    nasdaqChange24h,
    goldChange24h,
    nasdaqRegime: macro.nasdaqRegime,
    goldWhaleBias: macro.goldWhaleBias,
    macroRiskOnOff: macro.macroRiskOnOff
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers?.authorization || req.headers?.Authorization;
  const querySecret = req.query?.cron_secret;
  let bodySecret = null;
  if (req.body && typeof req.body === "object") {
    bodySecret = req.body.cron_secret ?? req.body.cronSecret;
  }
  const authOk =
    !cronSecret ||
    (auth && String(auth).trim().toLowerCase() === "bearer " + String(cronSecret).toLowerCase()) ||
    querySecret === cronSecret ||
    bodySecret === cronSecret;
  if (!authOk) {
    console.warn("[kiba/run] Unauthorized access", { status: 401, endpoint: "/api/kiba/run" });
    const kvAuth = getKV();
    if (kvAuth) writeKibaHealthStatus(kvAuth, 401).catch(() => {});
    return res.status(401).json({ error: "Unauthorized" });
  }

  const asset = String((req.query?.asset || req.body?.asset || "BTC")).toUpperCase();

  try {
    const kv = getKV();
    if (!kv) {
      return res.status(503).json({ success: false, error: "KV not available", triggered: false });
    }

    const kibaLatestKey = getKibaLatestKey(asset);
    const [btcResult, nasdaqSnapshot, goldSnapshot, lastKiba] = await Promise.all([
      getFirstSnapshot(kv, asset === "BTC" ? BTC_SNAPSHOT_KEYS : [`asset:snapshot:${asset}`]),
      kv.get("asset:snapshot:NASDAQ"),
      kv.get("asset:snapshot:GOLD"),
      kv.get(kibaLatestKey)
    ]);
    const btcSnapshot = btcResult.value;

    const macroSnapshot = buildMacroSnapshot({
      btcSnapshot,
      nasdaqSnapshot,
      goldSnapshot
    });

    const runResult = runKibaEngine({
      btcSnapshot: btcSnapshot || null,
      macroSnapshot,
      lastKibaSnapshot: lastKiba || null,
      asset
    });

    if (!runResult.triggered) {
      console.log("[kiba/run] 200 OK (triggered=false)");
      await writeKibaHealthStatus(kv, 200);
      return res.status(200).json({
        success: true,
        triggered: false,
        source: { btcSnapshotKey: btcResult.key, hasNasdaq: !!nasdaqSnapshot, hasGold: !!goldSnapshot },
        impact: runResult.impact
      });
    }

    const writeResult = await buildAndWriteKibaSnapshot(kv, {
      runResult,
      btcSnapshot,
      macroSnapshot,
      asset
    });

    const dispatchPayload = {
      type: "CRITICAL_ALERT",
      targetAudience: "REGULAR_ONLY_DEV_BENEFIT",
      snapshot: writeResult.snapshot,
      alerts: ALERT_LANGS.reduce((acc, lang) => {
        acc[lang] = formatCriticalAlert(writeResult.snapshot, lang);
        return acc;
      }, {})
    };

    console.log("[kiba/run] 200 OK (triggered=true)");
    await writeKibaHealthStatus(kv, 200);
    return res.status(200).json({
      success: true,
      triggered: true,
      source: { btcSnapshotKey: btcResult.key, hasNasdaq: !!nasdaqSnapshot, hasGold: !!goldSnapshot },
      impact: runResult.impact,
      kv: {
        latestKey: writeResult.latestKey,
        historyKey: writeResult.historyKey,
        saved: writeResult.ok
      },
      dispatchPayload
    });
  } catch (error) {
    console.error("[kiba/run] Error:", error?.message);
    const kvErr = getKV();
    if (kvErr) writeKibaHealthStatus(kvErr, 200).catch(() => {}); // 200 = レスポンスは 200 で返しているため
    return res.status(200).json({
      success: false,
      triggered: false,
      error: error?.message || "kiba_run_failed"
    });
  }
};
