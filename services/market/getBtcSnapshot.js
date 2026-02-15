/**
 * Trap Defence OS v5.2 — 市場スナップショット取得
 * btc_snapshots（getLastBtcSnapshot）から TrapScore / Netflow / Whale / CVD 等をマッピング
 * ※将来: mv_btc_trap_realtime, mv_btc_whale_realtime 等があれば拡張可能
 */

const { getLastBtcSnapshot } = require("../../utils/supabase");

async function getBtcSnapshot() {
  const defaults = {
    trapScore: "unknown",
    netflowState: "neutral",
    whaleRatio: "unknown",
    cvdState: "neutral",
    liquidationBias: "neutral",
    fundingRate: "neutral",
    athLevel: "$69K–$72K",
    dogeMove: "unknown",
    xrpMove: "unknown"
  };

  try {
    const row = await getLastBtcSnapshot();
    if (!row) return defaults;

    const cq = row.cqDeep || {};
    const raw = cq.raw || row.raw || {};
    const trap = row.trapDetection || {};

    return {
      trapScore: trap.trapScore ?? cq.trapScore ?? raw.trap_score ?? defaults.trapScore,
      netflowState: raw.netflow ?? cq.netflow ?? defaults.netflowState,
      whaleRatio: raw.whale_ratio ?? cq.whaleRatio ?? defaults.whaleRatio,
      cvdState: raw.cvd_state ?? cq.cvdState ?? defaults.cvdState,
      liquidationBias: raw.liquidation_bias ?? raw.bias ?? defaults.liquidationBias,
      fundingRate: raw.funding_state ?? cq.fundingRate ?? defaults.fundingRate,
      athLevel:
        raw.ath_low && raw.ath_high
          ? `$${raw.ath_low}–$${raw.ath_high}`
          : raw.ath_level ?? defaults.athLevel,
      dogeMove: raw.doge_move ?? raw.dogeChange ?? defaults.dogeMove,
      xrpMove: raw.xrp_move ?? raw.xrpChange ?? defaults.xrpMove
    };
  } catch (e) {
    console.warn("[getBtcSnapshot] error:", e?.message);
    return defaults;
  }
}

module.exports = { getBtcSnapshot };
