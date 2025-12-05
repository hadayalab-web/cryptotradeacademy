// logic/tier1_btc/marketScorer.js

/**
 * Calculate Market Health Score based on multiple metrics
 * Score range: 0 (max bearish) – 100 (max bullish), 50 = neutral
 *
 * metrics: {
 *   inflow: number,
 *   mpi: number,
 *   sentiment: string,   // normalized Fear & Greed
 *   change24h: number,
 *   xSentiment?: { whaleBias: number, retailFomo: number, newsImpact: number }
 * }
 */

function calculateMarketScore(metrics = {}) {
  let score = 50; // Default Neutral

  const { inflow, mpi, sentiment, change24h, xSentiment } = metrics;

  const whaleBias = xSentiment?.whaleBias ?? 0;     // -1 (sell) ～ +1 (buy)
  const retailFomo = xSentiment?.retailFomo ?? 50;  // 0 ～ 100
  const newsImpact = xSentiment?.newsImpact ?? 0;   // 0 ～ 100

  // --- Exchange Netflow (Whales) ---
  // 大きな流出 = クジラ積み増し（強気）、大きな流入 = 供給増（弱気）
  if (inflow <= -2000) {
    score += 35; // 強い買いバイアス（底/押し目候補）
  } else if (inflow <= -1000) {
    score += 20;
  } else if (inflow >= 2000) {
    score -= 35; // 強い売りバイアス（天井候補）
  } else if (inflow >= 1000) {
    score -= 20;
  }

  // --- Miner Position Index (MPI) ---
  // マイナー売りは構造的な下押し要因、買いは支え
  if (mpi <= -1.5) {
    score -= 10; // Aggressive miner selling
  } else if (mpi <= -0.5) {
    score -= 5;
  } else if (mpi >= 1.5) {
    score += 10; // Strong miner holding/accumulation
  } else if (mpi >= 0.5) {
    score += 5;
  }

  // --- Sentiment (Fear & Greed) ---
  // Extreme Fear = 逆張り強気, Extreme Greed = 逆張り弱気
  if (sentiment === 'Extreme Fear') {
    score += 25;
  } else if (sentiment === 'Fear') {
    score += 10;
  } else if (sentiment === 'Greed') {
    score -= 10;
  } else if (sentiment === 'Extreme Greed') {
    score -= 25;
  }

  // --- 24h Price Change (Momentum / Flush) ---
  // 大きな下落 + Extreme Fear = capitulation 後の底候補
  if (change24h <= -10 && sentiment === 'Extreme Fear') {
    score += 20;
  } else if (change24h <= -5 && String(sentiment).includes('Fear')) {
    score += 10;
  }

  // 大きな上昇 + Greed = FOMO天井候補
  if (change24h >= 10 && String(sentiment).includes('Greed')) {
    score -= 20;
  } else if (change24h >= 7 && String(sentiment).includes('Greed')) {
    score -= 10;
  }

  // --- Whale–Retail Divergence (USPのコア) -----------------------
  // クジラが買い越し & 取引所から流出しているのに、リテールのFOMOが低い静かな底
  if (
    Number.isFinite(whaleBias) &&
    Number.isFinite(retailFomo) &&
    Number.isFinite(inflow)
  ) {
    // Quiet accumulation bottom
    if (whaleBias >= 0.4 && retailFomo <= 30 && inflow <= -1000) {
      score += 15;
    }
    if (whaleBias >= 0.7 && retailFomo <= 20 && inflow <= -2000) {
      score += 25;
    }

    // Euphoria blow-off top
    if (whaleBias <= -0.4 && retailFomo >= 70 && inflow >= 1000) {
      score -= 15;
    }
    if (whaleBias <= -0.7 && retailFomo >= 85 && inflow >= 2000) {
      score -= 25;
    }
  }

  // ニュースインパクトが極端なときは少しだけ補正
  if (newsImpact >= 80 && retailFomo >= 70) {
    score -= 5; // 祭り状態は天井寄り
  } else if (newsImpact >= 80 && retailFomo <= 30 && whaleBias > 0) {
    score += 5; // 悪材料出尽くし＋クジラ買い
  }

  // 正規化（0–100にクランプ）
  return Math.max(0, Math.min(100, score));
}

module.exports = { calculateMarketScore };
