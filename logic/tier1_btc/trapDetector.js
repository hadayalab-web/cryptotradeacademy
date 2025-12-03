/**
 * Detect Bull/Bear Traps using Price vs On-chain Divergence
 *
 * priceAction: {
 *   priceChange: number (% change, e.g. +6, -3),
 *   volume: number (optional, not strictly required)
 * }
 *
 * onChainMetrics: {
 *   inflow: number (exchange net inflow, e.g. from CryptoQuant),
 *   mpi: number (Miner Position Index, optional)
 * }
 */

function detectTrap(priceAction = {}, onChainMetrics = {}) {
  // 安全なデフォルトをセットしておく
  const { priceChange = 0, volume = 0 } = priceAction || {};
  const { inflow = null, mpi = null } = onChainMetrics || {};

  // on-chain データが欠けている場合は「トラップなし」で返す
  if (inflow === null || Number.isNaN(Number(inflow))) {
    return {
      isTrap: false,
      reason: 'Missing or invalid on-chain inflow data',
      debug: { priceChange, volume, inflow, mpi },
    };
  }

  // ---- ルールベースのシンプルトラップ検出 ----

  // Bull Trap:
  // 価格が大きく上昇しているのに、取引所への流入がかなり大きい
  // → 鯨が上昇局面で売り抜けている可能性
  if (priceChange > 5 && inflow > 1500) {
    return {
      isTrap: true,
      type: 'BULL_TRAP',
      confidence: 'HIGH',
      reason:
        'Strong price pump with high exchange inflows suggests distribution by whales.',
      debug: { priceChange, volume, inflow, mpi },
    };
  }

  // Bear Trap:
  // 価格が大きく下落しているのに、取引所からの流出（inflow がマイナス）が大きい
  // → 鯨が安値で買い集めている可能性
  if (priceChange < -5 && inflow < -1000) {
    return {
      isTrap: true,
      type: 'BEAR_TRAP',
      confidence: 'HIGH',
      reason:
        'Strong price dump with large negative exchange inflows suggests accumulation.',
      debug: { priceChange, volume, inflow, mpi },
    };
  }

  // どちらにも該当しない場合
  return {
    isTrap: false,
    reason: 'No clear bull/bear trap pattern detected',
    debug: { priceChange, volume, inflow, mpi },
  };
}

module.exports = { detectTrap };
