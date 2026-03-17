require("../../utils/suppressKnownWarnings");
const { getKV } = require("../../utils/kv");
const { runKibaEngine } = require("../../core/kiba/kiba_engine");
const { getKibaLatestKey } = require("../../services/snapshot/kibaSnapshotSchema");
const { buildAndWriteKibaSnapshot } = require("../../services/snapshot/kibaSnapshotBuilder");
const { formatCriticalAlert } = require("../../services/ai/gpt5mini");
const { buildMacroContextFromAssets } = require("../../logic/macroRiskEvaluator");

const ALERT_LANGS = ["en", "ja", "es", "ko", "pt-br", "ar"];
// early を優先（KIBA がフル更新時刻に偏らないようにする）
const BTC_SNAPSHOT_KEYS = ["btc:snapshot:early", "asset:snapshot:BTC", "btc:snapshot"];

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

/**
 * kiba を1回実行する共通ロジック（cron からの直接呼び出し / HTTP ハンドラの両方で使用）
 * @param {object} kv - KV クライアント
 * @param {object} options - { btcSnapshot?, nasdaqSnapshot?, goldSnapshot?, asset? }
 * @returns {Promise<object>} { success, triggered, impact, dispatchPayload?, error?, source?, kv? }
 */
async function runKibaOnce(kv, options = {}) {
  const asset = String(options.asset || "BTC").toUpperCase();
  const kibaLatestKey = getKibaLatestKey(asset);
  const snapshotKeys = asset === "BTC" ? BTC_SNAPSHOT_KEYS : [`asset:snapshot:${asset}`];

  let btcSnapshot = options.btcSnapshot;
  let nasdaqSnapshot = options.nasdaqSnapshot;
  let goldSnapshot = options.goldSnapshot;
  let btcResultKey = null;

  if (!btcSnapshot) {
    const btcResult = await getFirstSnapshot(kv, snapshotKeys);
    btcSnapshot = btcResult.value;
    btcResultKey = btcResult.key;
  }
  if (nasdaqSnapshot === undefined) nasdaqSnapshot = await kv.get("asset:snapshot:NASDAQ");
  if (goldSnapshot === undefined) goldSnapshot = await kv.get("asset:snapshot:GOLD");

  const lastKiba = await kv.get(kibaLatestKey);
  const macroSnapshot = buildMacroSnapshot({ btcSnapshot, nasdaqSnapshot, goldSnapshot });

  const runResult = runKibaEngine({
    btcSnapshot: btcSnapshot || null,
    macroSnapshot,
    lastKibaSnapshot: lastKiba || null,
    asset
  });

  const source = {
    btcSnapshotKey: btcResultKey ?? (options.btcSnapshot ? "in-memory" : null),
    hasNasdaq: !!nasdaqSnapshot,
    hasGold: !!goldSnapshot
  };

  if (!runResult.triggered) {
    return {
      success: true,
      triggered: false,
      source,
      impact: runResult.impact
    };
  }

  const writeKv = options.dryRun ? null : kv;
  const writeResult = await buildAndWriteKibaSnapshot(writeKv, {
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

  return {
    success: true,
    triggered: true,
    dryRun: Boolean(options.dryRun),
    source,
    impact: runResult.impact,
    kv: options.dryRun ? undefined : {
      latestKey: writeResult.latestKey,
      historyKey: writeResult.historyKey,
      saved: writeResult.ok
    },
    dispatchPayload
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

    const result = await runKibaOnce(kv, { asset });
    if (!result.triggered) {
      console.log("[kiba/run] 200 OK (triggered=false)");
      await writeKibaHealthStatus(kv, 200);
      return res.status(200).json(result);
    }
    console.log("[kiba/run] 200 OK (triggered=true)");
    await writeKibaHealthStatus(kv, 200);
    return res.status(200).json(result);
  } catch (error) {
    console.error("[kiba/run] Error:", error?.message);
    const kvErr = getKV();
    if (kvErr) writeKibaHealthStatus(kvErr, 200).catch(() => {});
    return res.status(200).json({
      success: false,
      triggered: false,
      error: error?.message || "kiba_run_failed"
    });
  }
};

module.exports.runKibaOnce = runKibaOnce;
