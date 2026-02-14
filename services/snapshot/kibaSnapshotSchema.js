/**
 * Internal engine snapshot schema. No user-facing names exposed.
 */

const KIBA_LATEST_KV_KEY = "kiba:snapshot:latest";
const KIBA_HISTORY_PREFIX = "kiba:snapshot";

function toNumberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildKibaHistoryKey(asOfUtc, bucketMinutes = 15) {
  const d = new Date(asOfUtc || Date.now());
  if (!Number.isFinite(d.getTime())) {
    return `${KIBA_HISTORY_PREFIX}:${Date.now()}`;
  }
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const minute = d.getUTCMinutes();
  const bucket = Math.max(1, Number(bucketMinutes) || 15);
  const minuteBucket = String(Math.floor(minute / bucket) * bucket).padStart(2, "0");
  return `${KIBA_HISTORY_PREFIX}:${y}${m}${day}${h}${minuteBucket}`;
}

function normalizeLevel(value) {
  const u = String(value || "NONE").toUpperCase();
  if (["CRITICAL", "HIGH", "ELEVATED", "NONE"].includes(u)) return u;
  return "NONE";
}

/**
 * Build normalized snapshot for KV/alert. Score and internal names never exposed to user.
 */
function buildKibaSnapshot({ runResult, btcSnapshot = null, macroSnapshot = null, as_of_utc }) {
  const snap = runResult?.snapshot;
  if (!snap || typeof snap !== "object") {
    return {
      as_of_utc: as_of_utc || new Date().toISOString(),
      level: "NONE",
      intensity: "none",
      btcContext: null,
      macroContext: null
    };
  }
  return {
    as_of_utc: snap.as_of_utc || as_of_utc || btcSnapshot?.as_of_utc || new Date().toISOString(),
    level: normalizeLevel(snap.level),
    intensity: String(snap.intensity || "none"),
    btcContext: snap.btcContext || null,
    macroContext: snap.macroContext || null
  };
}

module.exports = {
  KIBA_LATEST_KV_KEY,
  KIBA_HISTORY_PREFIX,
  buildKibaHistoryKey,
  buildKibaSnapshot
};
