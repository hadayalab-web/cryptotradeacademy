// logic/core/marketBugDetector.js
// CryptoQuant + Grok X解析のハイブリッドロジックで市場バグを検知し、トレンド転換を先回りする
// USP1: 市場裏側で起こっている異常（バグ）を高精度で検出

const { detectDivergenceHighResolution, evaluateDivergenceSignalHighResolution } = require('./divergenceDetector');
const { TrendReversalDetector } = require('./trendReversalDetector');

/**
 * 市場バグ検知エンジン
 * CryptoQuantオンチェーンデータとGrok X解析を統合して市場の異常（バグ）を検出
 * 
 * @param {Object} params - 検出パラメータ
 * @param {number} params.exchangeNetflow - CryptoQuant Exchange Netflow (kBTC)
 * @param {number} params.minerMPI - CryptoQuant Miner Position Index
 * @param {number} params.whaleBias - Xセンチメント: クジラバイアス (-1 ~ +1)
 * @param {number} params.retailFomo - Xセンチメント: リテールFOMO (0 ~ 100)
 * @param {number} params.priceChange24h - 24時間価格変化率 (%)
 * @param {Object} params.highResCQ - 高解像度CryptoQuantデータ
 * @param {Object} params.highResX - 高解像度Xセンチメントデータ
 * @returns {Object} 市場バグ検出結果
 */
function detectMarketBug(params = {}) {
  const {
    exchangeNetflow = 0,
    minerMPI = 0,
    whaleBias = 0,
    retailFomo = 50,
    priceChange24h = 0,
    highResCQ = null,
    highResX = null,
  } = params;

  // ===== 1. 高解像度ダイバージェンス検出 =====
  const divergenceResult = detectDivergenceHighResolution({
    exchangeNetflow,
    minerMPI,
    whaleBias,
    retailFomo,
    priceChange24h,
    highResCQ,
    highResX,
  });

  // ===== 2. 市場バグスコア計算 =====
  // 市場バグ = 複数の異常が同時に発生している状態
  // - オンチェーンとXセンチメントの大きなズレ
  // - 価格とオンチェーンのズレ
  // - 価格とXセンチメントのズレ
  // - 高解像度データでの異常検知
  
  let bugScore = 0;
  let bugSeverity = 'NONE'; // 'NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  let bugType = null; // 'WHALE_RETAIL_DIVERGENCE', 'PRICE_ONCHAIN_DIVERGENCE', 'PRICE_SOCIAL_DIVERGENCE', 'MULTI_LAYER_ANOMALY'
  
  // 複数のダイバージェンスが同時に発生 = 市場バグの可能性
  if (divergenceResult.multipleDivergences >= 3) {
    bugScore += 40;
    bugType = 'MULTI_LAYER_ANOMALY';
  } else if (divergenceResult.multipleDivergences >= 2) {
    bugScore += 25;
  }
  
  // 高解像度データでの異常検知
  if (divergenceResult.highResolution?.anomalyDetected) {
    bugScore += 20;
    if (!bugType) bugType = 'HIGH_RESOLUTION_ANOMALY';
  }
  
  // 高解像度データでの加速度検出（トレンド転換の兆候）
  if (divergenceResult.highResolution?.accelerationDetected) {
    bugScore += 15;
    if (!bugType) bugType = 'TREND_ACCELERATION';
  }
  
  // 大口とリテールの大きなズレ = 市場バグの典型的なパターン
  const whaleRetailDivergence = Math.abs(divergenceResult.onchainSocialDivergence);
  if (whaleRetailDivergence > 40) {
    bugScore += 25;
    bugType = bugType || 'WHALE_RETAIL_DIVERGENCE';
  } else if (whaleRetailDivergence > 25) {
    bugScore += 15;
  }
  
  // 価格とオンチェーンのズレ = 市場バグの典型的なパターン
  if (divergenceResult.priceOnchainDivergence && Math.abs(divergenceResult.onchainScore) > 20) {
    bugScore += 20;
    bugType = bugType || 'PRICE_ONCHAIN_DIVERGENCE';
  }
  
  // 価格とXセンチメントのズレ = 市場バグの典型的なパターン
  if (divergenceResult.priceSocialDivergence && Math.abs(divergenceResult.socialScore) > 20) {
    bugScore += 20;
    bugType = bugType || 'PRICE_SOCIAL_DIVERGENCE';
  }
  
  // バグの深刻度を判定
  if (bugScore >= 70) {
    bugSeverity = 'CRITICAL';
  } else if (bugScore >= 50) {
    bugSeverity = 'HIGH';
  } else if (bugScore >= 30) {
    bugSeverity = 'MEDIUM';
  } else if (bugScore >= 15) {
    bugSeverity = 'LOW';
  }
  
  // ===== 3. トレンド転換先回りシグナル =====
  // 高解像度データを使用してトレンド転換の兆候を早期検出
  let trendReversalSignal = null;
  let reversalConfidence = 0;
  
  if (highResCQ && highResX) {
    // オンチェーンデータの加速度を確認
    const netflowAcceleration = highResCQ.netflow?.timeframes?.hour?.acceleration || 0;
    const mpiAcceleration = highResCQ.mpi?.timeframes?.hour?.acceleration || 0;
    
    // Xセンチメントの変化率を確認
    const whaleBiasChange = highResX.sentimentData?.whale?.bias || 0;
    const retailFomoChange = highResX.sentimentData?.retail?.fomo || 50;
    
    // BUY/SELLトレンド転換シグナル生成は完全削除（トラップアラートのみ使用）
    // トレンド転換の兆候は検出するが、BUY/SELLシグナルは生成しない
    if (netflowAcceleration > 0.15 && mpiAcceleration > 0.1 && whaleBiasChange < -0.3 && retailFomoChange > 70) {
      // 弱気転換の兆候を検出（BUY/SELLシグナルは生成しない）
      trendReversalSignal = null; // BUY/SELL_REVERSAL_IMMINENTは完全削除
      reversalConfidence = Math.min(0.85, 0.60 + (bugScore / 100) * 0.25);
    }
    // トレンド転換の兆候: オンチェーンが強気に加速 + Xセンチメントが強気に転換
    else if (netflowAcceleration < -0.15 && mpiAcceleration < -0.1 && whaleBiasChange > 0.3 && retailFomoChange < 30) {
      // 強気転換の兆候を検出（BUY/SELLシグナルは生成しない）
      trendReversalSignal = null; // BUY/SELL_REVERSAL_IMMINENTは完全削除
      reversalConfidence = Math.min(0.85, 0.60 + (bugScore / 100) * 0.25);
    }
  }
  
  return {
    // 基本情報
    bugDetected: bugScore >= 15,
    bugScore: Math.min(100, bugScore),
    bugSeverity,
    bugType,
    
    // ダイバージェンス情報
    divergence: divergenceResult,
    
    // トレンド転換先回りシグナル
    trendReversalSignal,
    reversalConfidence,
    
    // 詳細情報
    details: {
      multipleDivergences: divergenceResult.multipleDivergences,
      onchainSocialDivergence: divergenceResult.onchainSocialDivergence,
      priceOnchainDivergence: divergenceResult.priceOnchainDivergence,
      priceSocialDivergence: divergenceResult.priceSocialDivergence,
      highResolutionEnabled: divergenceResult.highResolution?.enabled || false,
      anomalyDetected: divergenceResult.highResolution?.anomalyDetected || false,
      accelerationDetected: divergenceResult.highResolution?.accelerationDetected || false,
    },
  };
}

/**
 * 市場バグ検知ベースのシグナル判定
 * 市場バグを検知した場合、高信頼度のSELL/BUYシグナルを生成
 * 
 * @param {Object} params - 検出パラメータ
 * @returns {Object} シグナル判定結果
 */
function evaluateMarketBugSignal(params = {}) {
  const bugDetection = detectMarketBug(params);
  
  // 市場バグが検出され、かつ高解像度ダイバージェンスシグナルが生成されている場合
  if (bugDetection.bugDetected && bugDetection.divergence.confidence >= 0.70) {
    const divergenceSignal = evaluateDivergenceSignalHighResolution({
      exchangeNetflow: params.exchangeNetflow,
      minerMPI: params.minerMPI,
      whaleBias: params.whaleBias,
      retailFomo: params.retailFomo,
      priceChange24h: params.priceChange24h,
      highResCQ: params.highResCQ,
      highResX: params.highResX,
    });
    
    // 市場バグが検出されている場合、シグナルの信頼度を向上
    if (divergenceSignal.signal !== 'NONE' && bugDetection.bugSeverity !== 'NONE') {
      const bugBoost = bugDetection.bugSeverity === 'CRITICAL' ? 0.15 :
                      bugDetection.bugSeverity === 'HIGH' ? 0.10 :
                      bugDetection.bugSeverity === 'MEDIUM' ? 0.05 : 0;
      
      return {
        ...divergenceSignal,
        confidence: Math.min(1.0, divergenceSignal.confidence + bugBoost),
        reason: `MARKET_BUG_${bugDetection.bugType}_${divergenceSignal.reason}`,
        marketBug: bugDetection,
        urgency: bugDetection.bugSeverity === 'CRITICAL' ? 'CRITICAL' : divergenceSignal.urgency,
      };
    }
    
    return {
      ...divergenceSignal,
      marketBug: bugDetection,
    };
  }
  
  // 市場バグが検出されているが、シグナルが生成されていない場合
  if (bugDetection.bugDetected) {
    return {
      signal: 'NONE',
      confidence: bugDetection.bugScore / 100,
      reason: `MARKET_BUG_DETECTED_BUT_INSUFFICIENT_SIGNAL`,
      marketBug: bugDetection,
      urgency: bugDetection.bugSeverity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
    };
  }
  
  // 市場バグが検出されていない場合
  return {
    signal: 'NONE',
    confidence: 0,
    reason: 'NO_MARKET_BUG_DETECTED',
    marketBug: bugDetection,
    urgency: 'LOW',
  };
}

module.exports = {
  detectMarketBug,
  evaluateMarketBugSignal,
};
