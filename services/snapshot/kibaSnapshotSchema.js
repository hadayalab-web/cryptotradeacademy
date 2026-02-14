/**
 * Internal engine snapshot schema. No user-facing names exposed.
 * Multi-asset: kiba:snapshot:${ASSET}:latest, kiba:snapshot:${ASSET}:YYYYMMDDHHmm
 */

const KIBA_LATEST_KV_KEY = "kiba:snapshot:latest";
const KIBA_HISTORY_PREFIX = "kiba:snapshot";

function getKibaLatestKey(asset = "BTC") {
  const a = String(asset || "BTC").toUpperCase();
  return a === "BTC" ? KIBA_LATEST_KV_KEY : `kiba:snapshot:${a}:latest`;
}

function getKibaHistoryPrefix(asset = "BTC") {
  const a = String(asset || "BTC").toUpperCase();
  return a === "BTC" ? KIBA_HISTORY_PREFIX : `kiba:snapshot:${a}`;
}

function toNumberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildKibaHistoryKey(asOfUtc, bucketMinutes = 15, asset = "BTC") {
  const prefix = getKibaHistoryPrefix(asset);
  const d = new Date(asOfUtc || Date.now());
  if (!Number.isFinite(d.getTime())) {
    return `${prefix}:${Date.now()}`;
  }
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const minute = d.getUTCMinutes();
  const bucket = Math.max(1, Number(bucketMinutes) || 15);
  const minuteBucket = String(Math.floor(minute / bucket) * bucket).padStart(2, "0");
  return `${prefix}:${y}${m}${day}${h}${minuteBucket}`;
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
  getKibaLatestKey,
  getKibaHistoryPrefix,
  buildKibaHistoryKey,
  buildKibaSnapshot
};
