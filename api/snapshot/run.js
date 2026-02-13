/**
 * Multi-Asset snapshot trigger API
 * GET /api/snapshot/run?asset=ETH
 * Requires CRON_SECRET
 */
const { runAssetSnapshot } = require("../../services/snapshot/assetSnapshotBuilder");
const { VALID_ASSETS } = require("../../services/snapshot/assetSnapshotSchema");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.authorization;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const asset = (req.query.asset || req.query.assetCode || "BTC").toUpperCase();
  if (!VALID_ASSETS.includes(asset)) {
    return res.status(400).json({
      error: "Invalid asset",
      valid: VALID_ASSETS
    });
  }

  try {
    const snapshot = await runAssetSnapshot(asset);
    if (!snapshot) {
      return res.status(502).json({ error: "Snapshot failed", asset });
    }
    return res.status(200).json({
      success: true,
      asset,
      as_of_utc: snapshot.as_of_utc,
      raw: snapshot.raw ? { priceUsd: snapshot.raw.priceUsd, change24h: snapshot.raw.change24h } : null
    });
  } catch (e) {
    console.error("[snapshot/run] Error:", e.message);
    return res.status(500).json({ error: e.message, asset });
  }
};
