const {
  CRITICAL_SHIFT_LATEST_KV_KEY,
  buildCriticalShiftHistoryKey,
  buildCriticalShiftSnapshot
} = require("./criticalShiftSnapshotSchema");

const DEFAULT_HISTORY_BUCKET_MINUTES = 15;

/**
 * Persist CRITICAL SHIFT snapshot to KV.
 * - latest: criticalshift:snapshot:latest
 * - history: criticalshift:snapshot:YYYYMMDDHHmm (15m bucket by default)
 *
 * @param {Object} kv - KV instance from getKV()
 * @param {Object} snapshot - CriticalShiftSnapshot
 * @param {Object} [options]
 * @param {number} [options.bucketMinutes=15]
 * @returns {Promise<{ ok: boolean, latestKey: string, historyKey: string|null }>}
 */
async function writeCriticalShiftSnapshot(kv, snapshot, options = {}) {
  const latestKey = CRITICAL_SHIFT_LATEST_KV_KEY;
  const bucketMinutes =
    Number.isFinite(Number(options.bucketMinutes)) && Number(options.bucketMinutes) > 0
      ? Number(options.bucketMinutes)
      : DEFAULT_HISTORY_BUCKET_MINUTES;
  const historyKey = buildCriticalShiftHistoryKey(snapshot?.as_of_utc, bucketMinutes);

  if (!kv || !snapshot || typeof snapshot !== "object") {
    return { ok: false, latestKey, historyKey: null };
  }

  try {
    await kv.set(latestKey, snapshot);
    await kv.set(historyKey, snapshot);
    return { ok: true, latestKey, historyKey };
  } catch (error) {
    console.warn("[criticalShiftSnapshotBuilder] KV write failed:", error?.message);
    return { ok: false, latestKey, historyKey };
  }
}

/**
 * Build + persist a CRITICAL SHIFT snapshot.
 *
 * @param {Object} kv
 * @param {Object} params
 * @param {Object} params.evaluation
 * @param {Object|null} params.btcSnapshot
 * @param {Object|null} params.macroSnapshot
 * @param {string} [params.as_of_utc]
 * @param {number} [params.bucketMinutes]
 * @returns {Promise<{ ok: boolean, snapshot: Object, latestKey: string, historyKey: string|null }>}
 */
async function buildAndWriteCriticalShiftSnapshot(kv, params = {}) {
  const snapshot = buildCriticalShiftSnapshot({
    evaluation: params.evaluation,
    btcSnapshot: params.btcSnapshot || null,
    macroSnapshot: params.macroSnapshot || null,
    as_of_utc: params.as_of_utc
  });

  const writeResult = await writeCriticalShiftSnapshot(kv, snapshot, {
    bucketMinutes: params.bucketMinutes
  });

  return {
    ok: writeResult.ok,
    snapshot,
    latestKey: writeResult.latestKey,
    historyKey: writeResult.historyKey
  };
}

module.exports = {
  DEFAULT_HISTORY_BUCKET_MINUTES,
  writeCriticalShiftSnapshot,
  buildAndWriteCriticalShiftSnapshot
};
