/**
 * Trap Defence OS v4.2+ — chain_raid materialized views を 5 分ごとに REFRESH
 * cron: every 5 min (vercel.json の cron は "5分毎")
 * 低CTR言語の投稿頻度抑制用に lang_penalty を KV に書き込む
 */
require("../utils/suppressKnownWarnings");

const { getSupabase } = require("../utils/supabase");
const { getKV } = require("../utils/kv");

const LANG_PENALTY_KV_KEY = "chain_raid:lang_penalty";
const LANG_PENALTY_TTL = 60 * 60; // 1h
// v5.4: 3段階 penalty — avg_ctr で OS が自律調整
const CTR_HIGH = 0.15; // >= 15% → 1.0
const CTR_MID = 0.08; // >= 8% → 0.7

module.exports = async function handler(req, res) {
  console.log("[refresh-chain-raid-mv] start");
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sb = getSupabase();
  if (!sb) {
    console.warn("[refresh-chain-raid-mv] Supabase not configured");
    return res.status(503).json({ ok: false, error: "Supabase not configured" });
  }

  try {
    const { data, error } = await sb.rpc("refresh_chain_raid_mvs");
    if (error) throw error;
    console.log("[refresh-chain-raid-mv] rpc refresh_chain_raid_mvs ok");

    // 低CTR言語の penalty を KV に書き込み（buzzweave / peakClusterScheduler で参照）
    let penaltyKeys = 0;
    try {
      const { data: stats } = await sb.from("mv_lang_ctr_realtime").select("lang, avg_ctr");
      const penalty = {};
      (stats || []).forEach((row) => {
        const ctr = Number(row.avg_ctr);
        penalty[row.lang] = ctr >= CTR_HIGH ? 1.0 : ctr >= CTR_MID ? 0.7 : 0.4;
      });
      penaltyKeys = Object.keys(penalty).length;
      const kv = getKV();
      if (kv && penaltyKeys > 0) {
        await kv.set(LANG_PENALTY_KV_KEY, JSON.stringify(penalty), { ex: LANG_PENALTY_TTL });
        console.log("[refresh-chain-raid-mv] lang_penalty written to KV, keys=" + penaltyKeys);
      }
    } catch (penaltyErr) {
      console.warn("[refresh-chain-raid-mv] lang_penalty KV write failed:", penaltyErr?.message);
    }

    console.log("[refresh-chain-raid-mv] done, penalty_keys=" + penaltyKeys);
    return res.status(200).json({ ok: true, refreshed: true, penalty_keys: penaltyKeys });
  } catch (e) {
    console.warn("[refresh-chain-raid-mv] Error:", e?.message);
    return res.status(500).json({
      ok: false,
      error: e?.message,
      hint: "chain_raid_post_kpi table and refresh_chain_raid_mvs() must exist"
    });
  }
};
