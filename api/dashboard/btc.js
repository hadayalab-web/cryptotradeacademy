/**
 * Phase 4: Dashboard API — BTC snapshot from KV
 * GET /api/dashboard/btc
 * Returns asset:snapshot:BTC (or btc:snapshot fallback)
 * Public, no auth.
 */
const { getKV } = require("../../utils/kv");
const { BTC_SNAPSHOT_KV_KEY } = require("../../services/snapshot/btcSnapshotSchema");

const ASSET_SNAPSHOT_KEY = "asset:snapshot:BTC";

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");

  try {
    const kv = getKV();
    if (!kv) {
      return res.status(503).json({ error: "KV not available", snapshot: null });
    }

    let snapshot = await kv.get(ASSET_SNAPSHOT_KEY);
    if (!snapshot) {
      snapshot = await kv.get(BTC_SNAPSHOT_KV_KEY);
    }
    if (!snapshot) {
      return res.status(200).json({ snapshot: null, source: null });
    }

    return res.status(200).json({ snapshot, source: "kv" });
  } catch (e) {
    console.warn("[dashboard/btc] error:", e.message);
    return res.status(500).json({ error: e.message, snapshot: null });
  }
};
