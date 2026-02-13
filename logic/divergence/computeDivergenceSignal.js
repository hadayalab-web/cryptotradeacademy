/**
 * Phase 3: High-level divergence signal for templates and BWE
 * Input: snapshot, lastSnapshot
 * Output: { divergenceLevel, reasons, confidence }
 * Low-level: existing divergenceDetector (used inside trapDetection)
 */

/**
 * @param {Object} snapshot - btcSnapshot
 * @param {Object|null} lastSnapshot - previous btcSnapshot
 * @returns {{ divergenceLevel: 'none'|'mild'|'moderate'|'severe', reasons: string[], confidence: number }}
 */
function computeDivergenceSignal(snapshot, lastSnapshot) {
  const reasons = [];
  let score = 0;

  if (!snapshot) {
    return { divergenceLevel: "none", reasons: [], confidence: 0 };
  }

  const cqDeep = snapshot.cqDeep || {};
  const raw = snapshot.raw || {};
  const xSentiment = snapshot.xSentiment || {};

  const whaleRatio = Number(cqDeep.whaleFlows?.whaleRatio ?? cqDeep.whaleRatio ?? 0);
  const funding = Number(cqDeep.funding ?? 0);
  const openInterest = cqDeep.openInterest;
  const liquidity = cqDeep.liquidity;
  const change24h = Number(raw.change24h ?? 0);
  const whaleBias = Number(xSentiment.whaleBias ?? 0);
  const retailFomo = Number(xSentiment.retailFomo ?? 50);

  // Whale vs retail divergence
  const whaleRetailGap = Math.abs(whaleBias * 50 - (retailFomo - 50));
  if (whaleRetailGap > 40) {
    reasons.push("whale_retail_divergence");
    score += 35;
  } else if (whaleRetailGap > 25) {
    reasons.push("whale_retail_mild");
    score += 15;
  }

  // Whale ratio extreme (selling pressure)
  if (whaleRatio >= 0.9) {
    reasons.push("whale_ratio_extreme");
    score += 30;
  } else if (whaleRatio >= 0.85) {
    reasons.push("whale_ratio_high");
    score += 20;
  }

  // Funding extreme
  if (funding !== 0 && Math.abs(funding) > 0.001) {
    reasons.push("funding_extreme");
    score += 15;
  }

  // Volatility regime shift
  if (Math.abs(change24h) >= 8) {
    reasons.push("volatility_regime_shift");
    score += 25;
  } else if (Math.abs(change24h) >= 5) {
    reasons.push("volatility_elevated");
    score += 10;
  }

  // Sentiment flip (vs last snapshot)
  if (lastSnapshot && typeof snapshot.market_score === "number" && typeof lastSnapshot.market_score === "number") {
    const delta = Math.abs(snapshot.market_score - lastSnapshot.market_score);
    if (delta >= 30) {
      reasons.push("sentiment_flip");
      score += 25;
    } else if (delta >= 20) {
      reasons.push("sentiment_shift");
      score += 10;
    }
  }

  // Price vs on-chain divergence (simplified: price up + high whale ratio = potential trap)
  if (change24h > 3 && whaleRatio > 0.85) {
    reasons.push("price_whale_divergence");
    score += 20;
  }

  const confidence = Math.min(100, score);
  let divergenceLevel = "none";
  if (confidence >= 60) divergenceLevel = "severe";
  else if (confidence >= 40) divergenceLevel = "moderate";
  else if (confidence >= 20) divergenceLevel = "mild";

  return { divergenceLevel, reasons, confidence };
}

module.exports = { computeDivergenceSignal };
