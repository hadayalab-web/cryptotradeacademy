/**
 * Trap Defence OS v4.2+ — chain_raid materialized views の REFRESH と lang_penalty 書き込み
 * 単体の Cron としては廃止し、buzzweave-metrics-poll に統合。手動・他 API からは runRefreshChainRaidMv() を利用可。
 */
require("../utils/suppressKnownWarnings");

const { getSupabase } = require("../utils/supabase");
const { getKV } = require("../utils/kv");

const LANG_PENALTY_KV_KEY = "chain_raid:lang_penalty";
const LANG_PENALTY_TTL = 60 * 60; // 1h
const CTR_HIGH = 0.15;
const CTR_MID = 0.08;

/**
 * MV を REFRESH し、lang_penalty を KV に書き込む。buzzweave-metrics-poll 等から呼び出し可。
 * @returns {{ ok: boolean, penalty_keys?: number, error?: string }}
 */
async function runRefreshChainRaidMv() {
  const sb = getSupabase();
  if (!sb) {
    console.warn("[refresh-chain-raid-mv] Supabase not configured");
    return { ok: false, error: "Supabase not configured" };
  }
  try {
    const { error } = await sb.rpc("refresh_chain_raid_mvs");
    if (error) throw error;
    console.log("[refresh-chain-raid-mv] rpc refresh_chain_raid_mvs ok");

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
    return { ok: true, penalty_keys: penaltyKeys };
  } catch (e) {
    console.warn("[refresh-chain-raid-mv] Error:", e?.message);
    return { ok: false, error: e?.message };
  }
}

async function httpHandler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const result = await runRefreshChainRaidMv();
  if (!result.ok) {
    return res.status(503).json({
      ok: false,
      error: result.error,
      hint: "chain_raid_post_kpi table and refresh_chain_raid_mvs() must exist"
    });
  }
  return res.status(200).json({ ok: true, refreshed: true, penalty_keys: result.penalty_keys });
}

module.exports = httpHandler;
module.exports.runRefreshChainRaidMv = runRefreshChainRaidMv;
