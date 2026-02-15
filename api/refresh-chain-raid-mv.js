/**
 * Trap Defence OS v4.2+ — chain_raid materialized views を 5 分ごとに REFRESH
 * cron: */5 * * * *
 */
require("../utils/suppressKnownWarnings");

const { getSupabase } = require("../utils/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sb = getSupabase();
  if (!sb) {
    return res.status(503).json({ ok: false, error: "Supabase not configured" });
  }

  try {
    const { data, error } = await sb.rpc("refresh_chain_raid_mvs");
    if (error) throw error;
    return res.status(200).json({ ok: true, refreshed: true });
  } catch (e) {
    console.warn("[refresh-chain-raid-mv] Error:", e?.message);
    return res.status(500).json({
      ok: false,
      error: e?.message,
      hint: "chain_raid_post_kpi table and refresh_chain_raid_mvs() must exist"
    });
  }
};
