/**
 * Trap Defence OS v4.2 — CQ 5分キャッシュ同期
 * kiba-5min が取得した CQ を cq:latest として KV に永続化。
 * KIBA → Fusion は cq:latest を参照し、CQ API を毎回叩かない。
 */

const CQ_LATEST_KV_KEY = "cq:latest";
const CQ_LATEST_TTL = 10 * 60; // 10 minutes

/**
 * getCQDeepMetrics の戻り値を cq:latest スキーマに正規化
 * @param {Object} cqDeep - getCQDeepMetrics の戻り値
 * @returns {Object} cq:latest value
 */
function normalizeToCqLatest(cqDeep) {
  if (!cqDeep || typeof cqDeep !== "object") {
    return _defaultCqLatest();
  }
  const whaleRatio =
    cqDeep.whaleFlows?.whaleRatio ?? cqDeep.whaleRatio ?? 0;
  const exchangeInflow = Number(cqDeep.exchangeInflow ?? cqDeep.exchangeFlowsDetailed?.inflow ?? 0) || 0;
  const liq = cqDeep.liquidations || {};
  const longL = Number(liq.longLiquidations ?? liq.liquidations_long ?? 0) || 0;
  const shortL = Number(liq.shortLiquidations ?? liq.liquidations_short ?? 0) || 0;
  const longShortRatio = shortL > 0 ? longL / shortL : 1.0;
  const openInterest = Number(cqDeep.openInterest ?? cqDeep.open_interest ?? 0) || 0;

  return {
    whale_ratio: whaleRatio,
    exchange_inflow: exchangeInflow,
    long_short_ratio: longShortRatio,
    open_interest: openInterest,
    timestamp: Date.now(),
    trap_score: cqDeep.trapScore ?? null,
    raw: {
      exchangeInflow: cqDeep.exchangeInflow,
      netflow: cqDeep.netflow,
      whaleRatio: whaleRatio,
      trapScore: cqDeep.trapScore,
      openInterest: cqDeep.openInterest,
      liquidations: cqDeep.liquidations
    }
  };
}

function _defaultCqLatest() {
  return {
    whale_ratio: 0,
    exchange_inflow: 0,
    long_short_ratio: 1.0,
    open_interest: 0,
    timestamp: Date.now(),
    trap_score: null,
    raw: {}
  };
}

/**
 * cq:latest を KV に書き込み
 * @param {Object} kv - getKV()
 * @param {Object} cqDeep - getCQDeepMetrics の戻り値
 */
async function writeCqLatest(kv, cqDeep) {
  if (!kv) return;
  try {
    const value = normalizeToCqLatest(cqDeep);
    await kv.set(CQ_LATEST_KV_KEY, value, { ex: CQ_LATEST_TTL });
  } catch (e) {
    console.warn("[cqLatestWriter] writeCqLatest failed:", e?.message);
  }
}

/**
 * cq:latest を KV から取得。存在しないか古い場合は null
 * @param {Object} kv - getKV()
 * @param {number} maxAgeMs - 最大有効期限（デフォルト 10 分）
 * @returns {Promise<Object|null>}
 */
async function getCqLatest(kv, maxAgeMs = 10 * 60 * 1000) {
  if (!kv) return null;
  try {
    const value = await kv.get(CQ_LATEST_KV_KEY);
    if (!value || typeof value !== "object") return null;
    const age = Date.now() - (value.timestamp || 0);
    if (age > maxAgeMs || age < 0) return null;
    return value;
  } catch {
    return null;
  }
}

/**
 * cq:latest を kiba_chain_integration の cq_metrics 形式に変換
 * @param {Object} cqLatest - getCqLatest の戻り値
 * @returns {Object} { oi_spike, whale_inflow, long_short_ratio, open_interest, ... }
 */
function cqLatestToCqMetrics(cqLatest) {
  if (!cqLatest || typeof cqLatest !== "object") {
    return {
      oi_spike: false,
      whale_inflow: false,
      long_short_ratio: 1.0,
      open_interest: 0,
      timestamp: null
    };
  }
  const whaleRatio = cqLatest.whale_ratio ?? cqLatest.raw?.whaleRatio ?? 0;
  const trapScore = cqLatest.trap_score ?? cqLatest.raw?.trapScore ?? 0;
  return {
    oi_spike: trapScore >= 40 || whaleRatio > 0.85,
    whale_inflow: whaleRatio > 0.85,
    long_short_ratio: cqLatest.long_short_ratio ?? 1.0,
    open_interest: cqLatest.open_interest ?? 0,
    timestamp: cqLatest.timestamp ?? null
  };
}

module.exports = {
  CQ_LATEST_KV_KEY,
  CQ_LATEST_TTL,
  normalizeToCqLatest,
  writeCqLatest,
  getCqLatest,
  cqLatestToCqMetrics
};
