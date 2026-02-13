/**
 * Phase 4: Dashboard API — BTC snapshot history from Supabase
 * GET /api/dashboard/history?limit=50
 * Returns recent N snapshots from btc_snapshots
 * Public, no auth.
 */
const { getBtcSnapshotsHistory } = require("../../utils/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate");

  try {
    const limit = Math.min(parseInt(req.query?.limit || "50", 10) || 50, 200);
    const snapshots = await getBtcSnapshotsHistory(limit);
    return res.status(200).json({ snapshots });
  } catch (e) {
    console.warn("[dashboard/history] error:", e.message);
    return res.status(500).json({ error: e.message, snapshots: [] });
  }
};
