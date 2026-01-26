// services/trapScore/enhanced.js
// Trap Score強化版（Fear & Greed Index、Funding Rate、Open Interest統合）

/**
 * Fear & Greed Indexを取得
 */
async function getFearAndGreedIndex() {
  try {
    // Alternative.meのFear & Greed Index API
    const response = await fetch('https://api.alternative.me/fng/');
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      const latest = data.data[0];
      return {
        value: parseInt(latest.value),
        classification: latest.value_classification, // Extreme Fear, Fear, Neutral, Greed, Extreme Greed
        timestamp: parseInt(latest.timestamp) * 1000,
      };
    }
    
    return null;
  } catch (error) {
    console.error('[TrapScore] Failed to fetch Fear & Greed Index:', error);
    return null;
  }
}

/**
 * Funding Rateを取得（Binance API）
 */
async function getFundingRate() {
  try {
    // Binance APIからFunding Rateを取得
    const response = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT');
    const data = await response.json();
    
    if (data.lastFundingRate) {
      return {
        rate: parseFloat(data.lastFundingRate) * 100, // パーセンテージに変換
        nextFundingTime: data.nextFundingTime,
        markPrice: parseFloat(data.markPrice),
      };
    }
    
    return null;
  } catch (error) {
    console.error('[TrapScore] Failed to fetch Funding Rate:', error);
    return null;
  }
}

/**
 * Open Interestを取得（Binance API）
 */
async function getOpenInterest() {
  try {
    // Binance APIからOpen Interestを取得
    const response = await fetch('https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT');
    const data = await response.json();
    
    if (data.openInterest) {
      return {
        value: parseFloat(data.openInterest),
        timestamp: data.time,
      };
    }
    
    return null;
  } catch (error) {
    console.error('[TrapScore] Failed to fetch Open Interest:', error);
    return null;
  }
}

/**
 * 強化されたTrap Scoreを計算
 */
async function calculateEnhancedTrapScore(baseTrapScore, onchainData, additionalMetrics = {}) {
  let enhancedScore = baseTrapScore || 0;
  const factors = [];

  // 1. Fear & Greed Indexの影響
  const fearGreed = additionalMetrics.fearGreedIndex || await getFearAndGreedIndex();
  if (fearGreed) {
    // Extreme Greed (75-100) または Extreme Fear (0-25) の場合はリスクが高い
    if (fearGreed.value >= 75 || fearGreed.value <= 25) {
      enhancedScore += 2;
      factors.push({
        name: 'Fear & Greed Index',
        value: fearGreed.value,
        impact: +2,
        reason: fearGreed.value >= 75 
          ? 'Extreme Greed: 過度な楽観がリスクを高める'
          : 'Extreme Fear: パニック売りが発生する可能性',
      });
    } else if (fearGreed.value >= 60 || fearGreed.value <= 40) {
      enhancedScore += 1;
      factors.push({
        name: 'Fear & Greed Index',
        value: fearGreed.value,
        impact: +1,
        reason: fearGreed.value >= 60 ? 'Greed: 注意が必要' : 'Fear: 慎重に監視',
      });
    }
  }

  // 2. Funding Rateの影響
  const fundingRate = additionalMetrics.fundingRate || await getFundingRate();
  if (fundingRate && Math.abs(fundingRate.rate) > 0.01) {
    // Funding Rateが0.01%以上（絶対値）の場合は、過度なレバレッジが存在
    if (Math.abs(fundingRate.rate) >= 0.05) {
      enhancedScore += 2;
      factors.push({
        name: 'Funding Rate',
        value: `${fundingRate.rate.toFixed(4)}%`,
        impact: +2,
        reason: '極端なFunding Rate: 過度なレバレッジがリスクを高める',
      });
    } else if (Math.abs(fundingRate.rate) >= 0.02) {
      enhancedScore += 1;
      factors.push({
        name: 'Funding Rate',
        value: `${fundingRate.rate.toFixed(4)}%`,
        impact: +1,
        reason: '高いFunding Rate: 注意が必要',
      });
    }
  }

  // 3. Open Interestの影響
  const openInterest = additionalMetrics.openInterest || await getOpenInterest();
  if (openInterest) {
    // Open Interestが急激に増加した場合（過去24時間で10%以上増加）
    // 実際の実装では、過去のOpen Interestと比較する必要がある
    // ここでは簡易的な実装
    factors.push({
      name: 'Open Interest',
      value: `${(openInterest.value / 1000000).toFixed(2)}M BTC`,
      impact: 0,
      reason: 'Open Interestを監視: 急激な増加はレバレッジの増加を示す',
    });
  }

  // 4. Exchange Netflowの影響（既存のロジックを強化）
  if (onchainData.exchangeNetflow) {
    const netflow = Math.abs(onchainData.exchangeNetflow);
    if (netflow >= 200) {
      enhancedScore += 2;
      factors.push({
        name: 'Exchange Netflow',
        value: `${onchainData.exchangeNetflow.toFixed(0)} BTC`,
        impact: +2,
        reason: '極端なNetflow: 大量の資金移動が発生',
      });
    } else if (netflow >= 100) {
      enhancedScore += 1;
      factors.push({
        name: 'Exchange Netflow',
        value: `${onchainData.exchangeNetflow.toFixed(0)} BTC`,
        impact: +1,
        reason: '高いNetflow: 注意が必要',
      });
    }
  }

  // 5. MPIの影響（既存のロジックを強化）
  if (onchainData.mpi !== undefined) {
    if (Math.abs(onchainData.mpi) >= 2) {
      enhancedScore += 2;
      factors.push({
        name: 'MPI',
        value: onchainData.mpi.toFixed(2),
        impact: +2,
        reason: '極端なMPI: マイナーの強い動き',
      });
    } else if (Math.abs(onchainData.mpi) >= 1) {
      enhancedScore += 1;
      factors.push({
        name: 'MPI',
        value: onchainData.mpi.toFixed(2),
        impact: +1,
        reason: '高いMPI: 注意が必要',
      });
    }
  }

  // スコアを0-10の範囲に正規化
  const finalScore = Math.min(Math.max(enhancedScore, 0), 10);

  return {
    baseScore: baseTrapScore || 0,
    enhancedScore: finalScore,
    factors,
    fearGreedIndex: fearGreed,
    fundingRate,
    openInterest,
    riskLevel: getRiskLevel(finalScore),
  };
}

/**
 * リスクレベルを判定
 */
function getRiskLevel(score) {
  if (score >= 8) return 'CRITICAL';
  if (score >= 6) return 'HIGH';
  if (score >= 4) return 'MEDIUM';
  if (score >= 2) return 'LOW';
  return 'MINIMAL';
}

/**
 * カスタムTrap Scoreを計算（ユーザー定義の重み付け）
 */
function calculateCustomTrapScore(baseScore, userWeights = {}) {
  const defaultWeights = {
    fearGreedIndex: 0.2,
    fundingRate: 0.2,
    openInterest: 0.1,
    exchangeNetflow: 0.3,
    mpi: 0.2,
  };

  const weights = { ...defaultWeights, ...userWeights };
  
  // 実際の実装では、各指標を正規化して重み付け平均を計算
  // ここでは簡易的な実装
  return {
    customScore: baseScore,
    weights,
    calculation: 'weighted_average',
  };
}

module.exports = {
  getFearAndGreedIndex,
  getFundingRate,
  getOpenInterest,
  calculateEnhancedTrapScore,
  calculateCustomTrapScore,
  getRiskLevel,
};
