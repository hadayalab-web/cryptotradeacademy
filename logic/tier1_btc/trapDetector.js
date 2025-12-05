// logic/tier1_btc/trapDetector.js

/**
 * Detect Traps using Price vs On-chain + Sentiment Divergence
 *
 * ctx: {
 *   priceChange: number (% change, e.g. +6, -3),
 *   volume?: number,
 *   inflow: number,
 *   mpi?: number,
 *   whaleBias?: number,   // -1 (sell) ～ +1 (buy)
 *   retailFomo?: number,  // 0 ～ 100
 * }
 */

function detectTrap(ctx = {}) {
  // 安全なデフォルトをセットしておく
  const {
    priceChange = 0,
    volume = 0,
    inflow = null,
    mpi = null,
    whaleBias = 0,
    retailFomo = 50,
  } = ctx || {};

  // on-chain データが欠けている場合は「トラップなし」で返す
  if (inflow === null || Number.isNaN(Number(inflow))) {
    return {
      isTrap: false,
      reason: 'Missing or invalid on-chain inflow data',
      debug: { priceChange, volume, inflow, mpi, whaleBias, retailFomo },
    };
  }

  const debug = { priceChange, volume, inflow, mpi, whaleBias, retailFomo };

  // ---- FOMO Bull Trap: リテールFOMO天井でクジラ売り抜け ----
  if (
    priceChange > 7 &&
    inflow > 2000 &&
    retailFomo >= 80 &&
    whaleBias <= 0
  ) {
    return {
      isTrap: true,
      type: 'FOMO_BULL_TRAP',
      label: 'Retail FOMO bull trap',
      side: 'SHORT',
      confidence: 'HIGH',
      reason:
        'Strong price pump with heavy inflows while retail FOMO is extreme and whales are not supporting.',
      note: 'Retail is chasing the breakout while whales distribute into strength.',
      hint: 'Avoid chasing here; consider taking profits or using defensive shorts.',
      debug,
    };
  }

  // ---- PANIC Bear Trap: リテールパニックでクジラ買い集め ----
  if (
    priceChange < -7 &&
    inflow < -2000 &&
    retailFomo <= 20 &&
    whaleBias >= 0
  ) {
    return {
      isTrap: true,
      type: 'PANIC_BEAR_TRAP',
      label: 'Panic bear trap',
      side: 'LONG',
      confidence: 'HIGH',
      reason:
        'Sharp dump with heavy outflows while retail panic is extreme and whales show accumulation bias.',
      note: 'Retail is panic-selling into aggressive whale accumulation.',
      hint: 'Avoid panic selling; consider staged entries instead of chasing lows.',
      debug,
    };
  }

  // ---- 従来の Bull/Bear Trap（感情データなしでも動く） ----

  // Bull Trap: 価格急騰 + 大きな流入
  if (priceChange > 5 && inflow > 1500) {
    return {
      isTrap: true,
      type: 'BULL_TRAP',
      label: 'Whale distribution trap',
      side: 'SHORT',
      confidence: 'HIGH',
      reason:
        'Strong price pump with high exchange inflows suggests distribution by whales.',
      debug,
    };
  }

  // Bear Trap: 価格急落 + 大きな流出
  if (priceChange < -5 && inflow < -1000) {
    return {
      isTrap: true,
      type: 'BEAR_TRAP',
      label: 'Whale accumulation trap',
      side: 'LONG',
      confidence: 'HIGH',
      reason:
        'Strong price dump with large negative exchange inflows suggests accumulation.',
      debug,
    };
  }

  // どちらにも該当しない場合
  return {
    isTrap: false,
    reason: 'No clear trap pattern detected',
    debug,
  };
}

module.exports = { detectTrap };
