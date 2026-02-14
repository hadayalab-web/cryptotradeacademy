const {
  KIBA_LATEST_KV_KEY,
  buildKibaHistoryKey,
  buildKibaSnapshot
} = require("./kibaSnapshotSchema");

const DEFAULT_HISTORY_BUCKET_MINUTES = 15;

async function writeKibaSnapshot(kv, snapshot, options = {}) {
  const latestKey = KIBA_LATEST_KV_KEY;
  const bucketMinutes =
    Number.isFinite(Number(options.bucketMinutes)) && Number(options.bucketMinutes) > 0
      ? Number(options.bucketMinutes)
      : DEFAULT_HISTORY_BUCKET_MINUTES;
  const historyKey = buildKibaHistoryKey(snapshot?.as_of_utc, bucketMinutes);

  if (!kv || !snapshot || typeof snapshot !== "object") {
    return { ok: false, latestKey, historyKey: null };
  }

  try {
    await kv.set(latestKey, snapshot);
    await kv.set(historyKey, snapshot);
    return { ok: true, latestKey, historyKey };
  } catch (error) {
    console.warn("[kibaSnapshotBuilder] KV write failed:", error?.message);
    return { ok: false, latestKey, historyKey };
  }
}

async function buildAndWriteKibaSnapshot(kv, params = {}) {
  const snapshot = buildKibaSnapshot({
    runResult: params.runResult,
    btcSnapshot: params.btcSnapshot || null,
    macroSnapshot: params.macroSnapshot || null,
    as_of_utc: params.as_of_utc
  });

  const writeResult = await writeKibaSnapshot(kv, snapshot, {
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
  writeKibaSnapshot,
  buildAndWriteKibaSnapshot
};
