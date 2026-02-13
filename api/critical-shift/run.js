const { getKV } = require("../../utils/kv");
const { evaluateCriticalShift } = require("../../logic/criticalShift/evaluator");
const {
  CRITICAL_SHIFT_LATEST_KV_KEY
} = require("../../services/snapshot/criticalShiftSnapshotSchema");
const {
  buildAndWriteCriticalShiftSnapshot
} = require("../../services/snapshot/criticalShiftSnapshotBuilder");
const { formatCriticalShiftAlert } = require("../../services/ai/gpt5mini");

const { buildMacroContextFromAssets } = require("../../logic/criticalShift/macroRiskEvaluator");

const CRITICAL_SHIFT_LANGS = ["en", "ja", "es", "ko", "pt-br", "ar"];
const BTC_SNAPSHOT_KEYS = ["asset:snapshot:BTC", "btc:snapshot"];

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
      console.warn(`[critical-shift/run] Failed to load ${key}:`, error?.message);
    }
  }
  return { key: null, value: null };
}

function buildMacroSnapshot({ btcSnapshot, nasdaqSnapshot, goldSnapshot }) {
  const nasdaqChange24h = toNumberOrNull(nasdaqSnapshot?.raw?.change24h);
  const goldChange24h = toNumberOrNull(goldSnapshot?.raw?.change24h);

  const fromBtc =
    btcSnapshot?.macroContext &&
    (btcSnapshot.macroContext.macroRiskOnOff != null ||
      btcSnapshot.macroContext.nasdaqRegime != null ||
      btcSnapshot.macroContext.goldWhaleBias != null);
  const macro =
    fromBtc
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
  const authOk =
    !cronSecret ||
    (auth && String(auth).trim().toLowerCase() === `bearer ${cronSecret}`.toLowerCase()) ||
    querySecret === cronSecret;
  if (!authOk) {
    console.warn("[critical-shift/run] 401 Unauthorized — cronSecret set, Bearer or cron_secret mismatch.");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const kv = getKV();
    if (!kv) {
      return res.status(503).json({ success: false, error: "KV not available", triggered: false });
    }

    const [btcResult, nasdaqSnapshot, goldSnapshot, lastCriticalShift] = await Promise.all([
      getFirstSnapshot(kv, BTC_SNAPSHOT_KEYS),
      kv.get("asset:snapshot:NASDAQ"),
      kv.get("asset:snapshot:GOLD"),
      kv.get(CRITICAL_SHIFT_LATEST_KV_KEY)
    ]);
    const btcSnapshot = btcResult.value;

    const macroSnapshot = buildMacroSnapshot({ btcSnapshot, nasdaqSnapshot, goldSnapshot });

    const evaluation = await evaluateCriticalShift({
      btcSnapshot: btcSnapshot || null,
      macroSnapshot,
      lastCriticalShift: lastCriticalShift || null
    });

    if (!evaluation.triggered) {
      console.log("[critical-shift/run] 200 OK (triggered=false)");
      return res.status(200).json({
        success: true,
        triggered: false,
        source: { btcSnapshotKey: btcResult.key, hasNasdaq: !!nasdaqSnapshot, hasGold: !!goldSnapshot },
        evaluation
      });
    }

    const writeResult = await buildAndWriteCriticalShiftSnapshot(kv, {
      evaluation,
      btcSnapshot,
      macroSnapshot
    });

    const dispatchPayload = {
      type: "CRITICAL_SHIFT",
      targetAudience: "REGULAR_ONLY_DEV_BENEFIT",
      canUpgradeToStandalonePro: true,
      snapshot: writeResult.snapshot,
      alerts: CRITICAL_SHIFT_LANGS.reduce((acc, lang) => {
        acc[lang] = formatCriticalShiftAlert(writeResult.snapshot, lang);
        return acc;
      }, {})
    };

    console.log("[critical-shift/run] 200 OK (triggered=true)");
    return res.status(200).json({
      success: true,
      triggered: true,
      source: { btcSnapshotKey: btcResult.key, hasNasdaq: !!nasdaqSnapshot, hasGold: !!goldSnapshot },
      evaluation,
      kv: {
        latestKey: writeResult.latestKey,
        historyKey: writeResult.historyKey,
        saved: writeResult.ok
      },
      dispatchPayload
    });
  } catch (error) {
    console.error("[critical-shift/run] Error:", error?.message);
    return res.status(200).json({
      success: false,
      triggered: false,
      error: error?.message || "critical_shift_run_failed"
    });
  }
};
