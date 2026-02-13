/**
 * Trap Defence Unified OS — btcSnapshot KV and DB write
 * Cron uses: writeEarlySnapshot (after raw), writeFullSnapshot + persistSnapshotToDb (after full build)
 */

const { BTC_SNAPSHOT_KV_KEY, BTC_SNAPSHOT_EARLY_KV_KEY, buildEarlySnapshot, snapshotToDbRow } = require("./btcSnapshotSchema");
const { insertBtcSnapshot } = require("../../utils/supabase");

// TTL: cron は約15分周期。minimal-tg-delivery は early → full の fallback あり（btc:snapshot:early 無ければ btc:snapshot を読む）
const KV_EARLY_TTL = 1200; // 20分（cron 15分 < 20分で余裕あり）
const KV_FULL_TTL = 1200;

/**
 * Write early snapshot to KV (Stage 1 only). Ensures Minimal and fallback always have data.
 * @param {Object} kv - getKV()
 * @param {Object} raw - { inflow, mpi, priceUsd, change24h, sentimentLabel, fng? }
 * @param {number} market_score
 * @param {Object} trap - from detectTrap
 */
async function writeEarlySnapshot(kv, raw, market_score, trap) {
  if (!kv) return;
  const early = buildEarlySnapshot(raw, market_score, trap);
  try {
    await kv.set(BTC_SNAPSHOT_EARLY_KV_KEY, early, { ex: KV_EARLY_TTL });
  } catch (e) {
    console.warn("[btcSnapshotWriter] writeEarlySnapshot failed:", e.message);
  }
}

/**
 * Write full btcSnapshot to KV.
 * @param {Object} kv - getKV()
 * @param {Object} snapshot - full btcSnapshot
 */
async function writeFullSnapshot(kv, snapshot) {
  if (!kv) return;
  try {
    await kv.set(BTC_SNAPSHOT_KV_KEY, snapshot, { ex: KV_FULL_TTL });
  } catch (e) {
    console.warn("[btcSnapshotWriter] writeFullSnapshot failed:", e.message);
  }
}

/**
 * Persist btcSnapshot to btc_snapshots table (mandatory history).
 * @param {Object} snapshot - full btcSnapshot
 */
async function persistSnapshotToDb(snapshot) {
  const row = snapshotToDbRow(snapshot);
  const { ok, error } = await insertBtcSnapshot(row);
  if (!ok) console.warn("[btcSnapshotWriter] persistSnapshotToDb failed:", error);
}

module.exports = {
  writeEarlySnapshot,
  writeFullSnapshot,
  persistSnapshotToDb
};
