// logic/tier1_btc/trapRiskScorer.js

/**
 * Trap Risk Score 定量化システム
 * 
 * phase1-product推奨事項に基づく「Trap Risk Score」機能
 * 0-100のスコアでトラップリスクを定量化
 * 
 * @param {Object} ctx - 市場コンテキスト
 * @returns {Object} Trap Risk Score と詳細分析
 */
function calculateTrapRisk(ctx = {}) {
  const {
    priceChange = 0,
    volume = 0,
    inflow = null,
    mpi = null,
    whaleBias = 0,
    retailFomo = 50,
    newsImpact = 0,
    market = 'EN',
  } = ctx || {};

  let riskScore = 0;
  const riskFactors = [];

  // === リスク要因1: 価格変動とオンチェーンデータの乖離 ===
  const priceOnchainDivergence = Math.abs(priceChange) > 5 && 
    ((priceChange > 0 && inflow > 1500) || (priceChange < 0 && inflow < -1000));
  
  if (priceOnchainDivergence) {
    const divergenceScore = Math.min(40, Math.abs(priceChange) * 2);
    riskScore += divergenceScore;
    riskFactors.push({
      factor: 'Price-Onchain Divergence',
      score: divergenceScore,
      description: `Price movement (${priceChange.toFixed(2)}%) contradicts on-chain flow (${inflow > 0 ? 'inflow' : 'outflow'})`,
    });
  }

  // === リスク要因2: Whale Alert + Order Book 不均衡 ===
  const whaleOrderBookImbalance = Math.abs(whaleBias) < 0.3 && Math.abs(retailFomo - 50) > 30;
  
  if (whaleOrderBookImbalance) {
    const imbalanceScore = Math.abs(retailFomo - 50) * 0.3;
    riskScore += imbalanceScore;
    riskFactors.push({
      factor: 'Whale-Retail Imbalance',
      score: imbalanceScore,
      description: `Whale neutral (${(whaleBias * 100).toFixed(0)}) while retail FOMO is ${retailFomo > 50 ? 'high' : 'low'} (${retailFomo})`,
    });
  }

  // === リスク要因3: フェイクボリューム（出来高が伴わないブレイク） ===
  if (Math.abs(priceChange) > 3 && volume < 500000) {
    const fakeVolumeScore = 35;
    riskScore += fakeVolumeScore;
    riskFactors.push({
      factor: 'Fake Volume Breakout',
      score: fakeVolumeScore,
      description: `Price movement (${priceChange.toFixed(2)}%) without volume confirmation (${volume.toLocaleString()})`,
    });
  }

  // === リスク要因4: 流動性ギャップ ===
  const liquidityGap = Math.abs(priceChange) > 5 && volume < 1000000;
  
  if (liquidityGap) {
    const gapScore = Math.min(40, Math.abs(priceChange) * 3);
    riskScore += gapScore;
    riskFactors.push({
      factor: 'Liquidity Gap',
      score: gapScore,
      description: `Large price movement (${priceChange.toFixed(2)}%) with low liquidity (${volume.toLocaleString()})`,
    });
  }

  // === リスク要因5: MPI 極端値 ===
  if (mpi !== null) {
    if (mpi < -20) {
      const mpiScore = Math.min(30, Math.abs(mpi) * 1.5);
      riskScore += mpiScore;
      riskFactors.push({
        factor: 'Extreme Miner Selling',
        score: mpiScore,
        description: `Extreme miner selling pressure (MPI: ${mpi.toFixed(2)})`,
      });
    }
    
    if (mpi > 3) {
      const mpiScore = Math.min(25, mpi * 5);
      riskScore += mpiScore;
      riskFactors.push({
        factor: 'Miner Accumulation',
        score: mpiScore,
        description: `High miner accumulation (MPI: ${mpi.toFixed(2)}) - potential distribution signal`,
      });
    }
  }

  // === リスク要因6: センチメント過熱 ===
  if (retailFomo >= 80) {
    const fomoScore = (retailFomo - 80) * 0.5;
    riskScore += fomoScore;
    riskFactors.push({
      factor: 'Retail FOMO Overheating',
      score: fomoScore,
      description: `Extreme retail FOMO (${retailFomo}/100) - potential top signal`,
    });
  }

  if (retailFomo <= 20) {
    const panicScore = (20 - retailFomo) * 0.3;
    riskScore += panicScore;
    riskFactors.push({
      factor: 'Retail Panic',
      score: panicScore,
      description: `Extreme retail panic (${retailFomo}/100) - potential bottom signal but high volatility`,
    });
  }

  // === リスク要因7: ニュース影響 ===
  if (newsImpact > 50) {
    const newsScore = newsImpact * 0.2;
    riskScore += newsScore;
    riskFactors.push({
      factor: 'High News Impact',
      score: newsScore,
      description: `High news impact (${newsImpact}/100) - increased volatility risk`,
    });
  }

  // === 市場別リスク補正 ===
  if (market === 'JA') {
    // JA市場: 週末→月曜調整パターン
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    if (dayOfWeek === 1 && priceChange > 2) {
      riskScore += 15;
      riskFactors.push({
        factor: 'JA Weekend-Monday Pattern',
        score: 15,
        description: 'Weekend high → Monday correction pattern detected',
      });
    }
  }

  if (market === 'KO') {
    // KO市場: キムチプレミアム異常値（簡易版）
    if (Math.abs(priceChange) > 5) {
      riskScore += 10;
      riskFactors.push({
        factor: 'KO Kimchi Premium Risk',
        score: 10,
        description: 'Extreme price movement - monitor Kimchi Premium',
      });
    }
  }

  // === スコア正規化（0-100） ===
  riskScore = Math.min(100, Math.max(0, riskScore));

  // === リスクレベル判定 ===
  let riskLevel = 'LOW';
  if (riskScore >= 80) {
    riskLevel = 'CRITICAL';
  } else if (riskScore >= 60) {
    riskLevel = 'HIGH';
  } else if (riskScore >= 40) {
    riskLevel = 'MEDIUM';
  } else if (riskScore >= 20) {
    riskLevel = 'LOW-MEDIUM';
  }

  // === 推奨アクション ===
  let recommendation = '';
  if (riskScore >= 80) {
    recommendation = 'CRITICAL: Strongly avoid entry. High probability of trap.';
  } else if (riskScore >= 60) {
    recommendation = 'HIGH: Avoid entry. Wait for risk factors to decrease.';
  } else if (riskScore >= 40) {
    recommendation = 'MEDIUM: Proceed with extreme caution. Use smaller position size.';
  } else if (riskScore >= 20) {
    recommendation = 'LOW-MEDIUM: Monitor closely. Some risk factors present.';
  } else {
    recommendation = 'LOW: Normal market conditions. Standard risk management applies.';
  }

  return {
    trapRiskScore: Math.round(riskScore),
    riskLevel,
    riskFactors: riskFactors.sort((a, b) => b.score - a.score),
    recommendation,
    debug: {
      priceChange,
      volume,
      inflow,
      mpi,
      whaleBias,
      retailFomo,
      newsImpact,
      market,
    },
  };
}

module.exports = { calculateTrapRisk };
