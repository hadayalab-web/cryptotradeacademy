/**
 * Trap Defence OS v5.2 — 市場スナップショット取得
 * btc_snapshots（getLastBtcSnapshot）から TrapScore / Netflow / Whale / CVD 等をマッピング
 * 鮮度: 1h 超は is_stale=true（ナラティブは DEFAULT にフォールバック）
 */

const { getLastBtcSnapshot } = require("../../utils/supabase");

const MAX_AGE_MS = 60 * 60 * 1000; // 1h

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
    xrpMove: "unknown",
    timestamp: null,
    is_stale: true
  };

  try {
    const row = await getLastBtcSnapshot();
    if (!row) return defaults;

    const cq = row.cqDeep || {};
    const raw = cq.raw || row.raw || {};
    const trap = row.trapDetection || {};

    const trapScore = trap.trapScore ?? cq.trapScore ?? raw.trap_score ?? defaults.trapScore;
    const netflowState = raw.netflow ?? cq.netflow ?? defaults.netflowState;

    const ts = row.as_of_utc || row.created_at || null;
    const now = Date.now();
    const ageMs = ts ? now - new Date(ts).getTime() : Infinity;
    const is_stale = ageMs > MAX_AGE_MS;

    if (is_stale) {
      console.warn("[getBtcSnapshot] stale snapshot detected", { ageMs, ts: ts || "none" });
    }

    return {
      trapScore,
      netflowState,
      whaleRatio: raw.whale_ratio ?? cq.whaleRatio ?? defaults.whaleRatio,
      cvdState: raw.cvd_state ?? cq.cvdState ?? defaults.cvdState,
      liquidationBias: raw.liquidation_bias ?? raw.bias ?? defaults.liquidationBias,
      fundingRate: raw.funding_state ?? cq.fundingRate ?? defaults.fundingRate,
      athLevel:
        raw.ath_low && raw.ath_high
          ? `$${raw.ath_low}–$${raw.ath_high}`
          : raw.ath_level ?? defaults.athLevel,
      dogeMove: raw.doge_move ?? raw.dogeChange ?? defaults.dogeMove,
      xrpMove: raw.xrp_move ?? raw.xrpChange ?? defaults.xrpMove,
      timestamp: ts,
      is_stale,
      trap_score_label: String(trapScore),
      netflow_state: String(netflowState)
    };
  } catch (e) {
    console.warn("[getBtcSnapshot] error:", e?.message);
    return defaults;
  }
}

module.exports = { getBtcSnapshot };
