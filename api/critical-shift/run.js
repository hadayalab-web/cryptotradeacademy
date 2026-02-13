const { getKV } = require("../../utils/kv");
const { evaluateCriticalShift } = require("../../logic/criticalShift/evaluator");
const {
  CRITICAL_SHIFT_LATEST_KV_KEY
} = require("../../services/snapshot/criticalShiftSnapshotSchema");
const {
  buildAndWriteCriticalShiftSnapshot
} = require("../../services/snapshot/criticalShiftSnapshotBuilder");
const { formatCriticalShiftAlert } = require("../../services/ai/gpt5mini");

const CRITICAL_SHIFT_LANGS = ["en", "ja", "es", "ko", "pt-br", "ar"];
const BTC_SNAPSHOT_KEYS = ["btc:snapshot:full:latest", "asset:snapshot:BTC", "btc:snapshot"];

function toNumberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeMacroRiskOnOff(value) {
  if (!value) return null;
  const upper = String(value).toUpperCase();
  if (upper === "RISK_ON") return "RISK_ON";
  if (upper === "RISK_OFF") return "RISK_OFF";
  if (upper === "NEUTRAL" || upper === "MIXED") return "NEUTRAL";
  return null;
}

function inferMacroRiskOnOffFromChanges(nasdaqChange24h, goldChange24h) {
  if (nasdaqChange24h == null && goldChange24h == null) return null;
  if ((nasdaqChange24h != null && nasdaqChange24h >= 1.0) && (goldChange24h == null || goldChange24h <= -0.3)) {
    return "RISK_ON";
  }
  if ((nasdaqChange24h != null && nasdaqChange24h <= -1.0) && (goldChange24h == null || goldChange24h >= 0.3)) {
    return "RISK_OFF";
  }
  return "NEUTRAL";
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

  const macroRiskOnOff =
    normalizeMacroRiskOnOff(btcSnapshot?.macroContext?.macroRiskOnOff) ??
    inferMacroRiskOnOffFromChanges(nasdaqChange24h, goldChange24h);

  const nasdaqRegime =
    btcSnapshot?.macroContext?.nasdaqRegime ??
    (nasdaqChange24h == null ? null : nasdaqChange24h > 1 ? "RISK_ON" : nasdaqChange24h < -1 ? "RISK_OFF" : "NEUTRAL");

  const goldWhaleBiasRaw =
    btcSnapshot?.macroContext?.goldWhaleBias ??
    (goldChange24h == null ? null : goldChange24h > 0 ? "BULLISH" : goldChange24h < 0 ? "BEARISH" : "NEUTRAL");

  return {
    nasdaq: nasdaqSnapshot || null,
    gold: goldSnapshot || null,
    nasdaqChange24h,
    goldChange24h,
    nasdaqRegime,
    goldWhaleBias: goldWhaleBiasRaw == null ? null : String(goldWhaleBiasRaw),
    macroRiskOnOff
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers?.authorization || req.headers?.Authorization;
  const querySecret = req.query?.cron_secret;
  if (cronSecret && auth !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
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
