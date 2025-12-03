// logic/tier1_btc/signalGen.js

const thresholds = require('../../config/thresholds');

/**
 * Generate final signal and TP/SL targets
 *
 * Regimes:
 * - BOTTOM_ATTACK : 大底ロング
 * - DIP_ATTACK    : 押し目ロング
 * - CEILING_DEFEND: 天井ショート/利確
 * - RANGE         : レンジ様子見
 * - SOFT          : 弱いバイアスのみ
 */
function generateSignal(score, currentPrice, ctx = {}) {
  const { sentimentLabel = 'Neutral', change24h = 0 } = ctx;

  let signal = 'HOLD';
  let regime = 'RANGE';
  let reason = 'Market is ranging. No strong edge.';

  const absChange = Math.abs(change24h);
  const isFear = sentimentLabel.includes('Fear');
  const isGreed = sentimentLabel.includes('Greed');

  // --- BOTTOM ATTACK: Extreme Fear + 大きな下落後の底候補 ---
  if (
    score >= thresholds.BOTTOM_ATTACK.minScore &&
    sentimentLabel === 'Extreme Fear' &&
    change24h <= thresholds.BOTTOM_ATTACK.maxChange24h
  ) {
    signal = 'BUY';
    regime = 'BOTTOM_ATTACK';
    reason =
      'Bottom Attack: heavy outflows + Extreme Fear + recent dump. Smart money likely accumulating.';
  }

  // --- DIP ATTACK: Fear圏での押し目ロング ---
  else if (
    score >= thresholds.DIP_ATTACK.minScore &&
    isFear &&
    absChange <= thresholds.DIP_ATTACK.maxAbsChange24h
  ) {
    signal = 'BUY';
    regime = 'DIP_ATTACK';
    reason =
      'Dip Attack: bullish score with Fear. Pullback within trend looks buyable with tight risk.';
  }

  // --- CEILING DEFEND: Greed圏での急騰天井候補 ---
  else if (
    score <= thresholds.CEILING_DEFEND.maxScore &&
    isGreed &&
    change24h >= thresholds.CEILING_DEFEND.minChange24h
  ) {
    signal = 'SELL';
    regime = 'CEILING_DEFEND';
    reason =
      'Ceiling Defend: strong rally + Greed. Good zone to take profit or start defensive shorts.';
  }

  // --- RANGE: スコア中立 & 変動小 ---
  else if (
    score > thresholds.RANGE.minScore &&
    score < thresholds.RANGE.maxScore &&
    absChange < thresholds.RANGE.maxAbsChange24h
  ) {
    signal = 'HOLD';
    regime = 'RANGE';
    reason =
      'Range: no clear directional edge. Best to stand aside and protect capital.';
  }

  // --- SOFT BIAS: それ以外は弱いBUY/SELLバイアスのみ ---
  else {
    if (score >= 50) {
      signal = 'BUY';
      regime = 'SOFT';
      reason =
        'Soft bullish bias: flows and sentiment lean upward, but edge is moderate.';
    } else {
      signal = 'SELL';
      regime = 'SOFT';
      reason =
        'Soft bearish bias: flows and sentiment lean downward, but edge is moderate.';
    }
  }

  // --- TP/SL 計算（全レジーム共通で R/R=3.5% / 2%） ---
const TP_PCT = 0.035; // +3.5%
const SL_PCT = 0.02;  // -2%

// エントリー価格
const entry = currentPrice;

// シグナル方向に応じて TP/SL を計算
let takeProfit = entry;
let stopLoss = entry;

if (signal === 'BUY') {
  // LONG: 上方向 TP, 下方向 SL
  takeProfit = entry * (1 + TP_PCT);
  stopLoss  = entry * (1 - SL_PCT);
} else if (signal === 'SELL') {
  // SHORT: 下方向 TP, 上方向 SL
  takeProfit = entry * (1 - TP_PCT);
  stopLoss  = entry * (1 + SL_PCT);
}

// 価格は整数に丸め（UI/バックテストと揃える）
return {
  signal,
  regime,
  score,
  reason,
  entry: Math.round(entry),
  tp: Math.round(takeProfit),
  sl: Math.round(stopLoss),
};
}

module.exports = { generateSignal };
