/**
 * Classify whale activity from Exchange Netflow (BTC)
 *
 * inflow: CryptoQuant の netflow 値 (BTC単位)
 *  - 大きなマイナス = 取引所から流出（クジラ積み増し・強気）
 *  - 大きなプラス  = 取引所へ流入（売り圧・弱気）
 */

function classifyWhaleActivity(inflow) {
  let level = 'NORMAL';
  let bias = 'NEUTRAL'; // 'BULLISH' | 'BEARISH'
  let message = 'Whale flows look normal. No strong signal from exchanges.';

  if (inflow <= -4000) {
    level = 'EXTREME_OUTFLOW';
    bias = 'BULLISH';
    message =
      'Heavy BTC outflow from exchanges. Whales likely accumulating or preparing a squeeze.';
  } else if (inflow <= -2000) {
    level = 'OUTFLOW_HEAVY';
    bias = 'BULLISH';
    message =
      'Strong BTC outflow from exchanges. Buying pressure from large wallets is dominant.';
  } else if (inflow >= 4000) {
    level = 'EXTREME_INFLOW';
    bias = 'BEARISH';
    message =
      'Heavy BTC inflow to exchanges. Whales may be preparing to sell into strength.';
  } else if (inflow >= 2000) {
    level = 'INFLOW_HEAVY';
    bias = 'BEARISH';
    message =
      'Significant BTC inflow to exchanges. Supply from large holders is increasing.';
  }

  return {
    level,
    bias,
    message,
  };
}

/**
 * Telegram用の短い1行ヘッドライン
 */
function buildWhaleHeadline(inflow) {
  const { level, bias } = classifyWhaleActivity(inflow);

  if (level === 'EXTREME_OUTFLOW')
    return '🐋 Massive BTC outflow — whales aggressively accumulating.';
  if (level === 'OUTFLOW_HEAVY')
    return '🐋 Strong BTC outflow — whale accumulation bias.';
  if (level === 'EXTREME_INFLOW')
    return '🐋 Massive BTC inflow — whales may be unloading.';
  if (level === 'INFLOW_HEAVY')
    return '🐋 Strong BTC inflow — selling pressure rising.';

  return '🐋 Whale flows: normal range.';
}

module.exports = {
  classifyWhaleActivity,
  buildWhaleHeadline,
};
