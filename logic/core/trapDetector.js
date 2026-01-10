// logic/core/trapDetector.js
// CryptoQuant + Grok X解析のハイブリッドロジックでトラップを検知し、トレンド転換を先回りする
// USP1: 市場裏側で起こっている異常（トラップ）を高精度で検出

const { detectDivergenceHighResolution, evaluateDivergenceSignalHighResolution } = require('./divergenceDetector');
const { TrendReversalDetector } = require('./trendReversalDetector');
const { detectTrap } = require('../tier1_btc/trapDetector');
const { calculateTrapRisk } = require('../tier1_btc/trapRiskScorer');
const { applyQualityGate } = require('./signalQualityGate');

/**
 * トラップ検知エンジン（統合版）
 * CryptoQuantオンチェーンデータとGrok X解析を統合して市場のトラップを検出
 * marketBugDetector.jsとtrapDetector.jsの機能を統合
 * 
 * @param {Object} params - 検出パラメータ
 * @param {number} params.exchangeNetflow - CryptoQuant Exchange Netflow (kBTC)
 * @param {number} params.minerMPI - CryptoQuant Miner Position Index
 * @param {number} params.whaleBias - Xセンチメント: クジラバイアス (-1 ~ +1)
 * @param {number} params.retailFomo - Xセンチメント: リテールFOMO (0 ~ 100)
 * @param {number} params.priceChange24h - 24時間価格変化率 (%)
 * @param {Object} params.highResCQ - 高解像度CryptoQuantデータ
 * @param {Object} params.highResX - 高解像度Xセンチメントデータ
 * @param {Object} params.binanceData - Binance補完データ（オプション）
 * @returns {Object} トラップ検出結果
 */
function detectTrapDetection(params = {}) {
  const {
    exchangeNetflow = 0,
    minerMPI = 0,
    whaleBias = 0,
    retailFomo = 50,
    priceChange24h = 0,
    highResCQ = null,
    highResX = null,
    binanceData = null,
  } = params;

  // ===== 1. 高解像度ダイバージェンス検出 =====
  const divergenceResult = detectDivergenceHighResolution({
    exchangeNetflow,
    minerMPI,
    whaleBias,
    retailFomo,
    priceChange24h,
    binanceData,
    highResCQ,
    highResX,
  });

  // ===== 2. トラップ検知スコア計算 =====
  // トラップ = 複数の異常が同時に発生している状態
  // - オンチェーンとXセンチメントの大きなズレ
  // - 価格とオンチェーンのズレ
  // - 価格とXセンチメントのズレ
  // - 高解像度データでの異常検知
  
  let trapScore = 0;
  let trapSeverity = 'NONE'; // 'NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  let trapType = null; // 'WHALE_RETAIL_DIVERGENCE', 'PRICE_ONCHAIN_DIVERGENCE', 'PRICE_SOCIAL_DIVERGENCE', 'MULTI_LAYER_ANOMALY', 'BULL_TRAP', 'BEAR_TRAP', 'FOMO_BULL_TRAP', 'PANIC_BEAR_TRAP'
  
  // 複数のダイバージェンスが同時に発生 = トラップの可能性
  if (divergenceResult.multipleDivergences >= 3) {
    trapScore += 40;
    trapType = 'MULTI_LAYER_ANOMALY';
  } else if (divergenceResult.multipleDivergences >= 2) {
    trapScore += 25;
  }
  
  // 高解像度データでの異常検知
  if (divergenceResult.highResolution?.anomalyDetected) {
    trapScore += 20;
    if (!trapType) trapType = 'HIGH_RESOLUTION_ANOMALY';
  }
  
  // 高解像度データでの加速度検出（トレンド転換の兆候）
  if (divergenceResult.highResolution?.accelerationDetected) {
    trapScore += 15;
    if (!trapType) trapType = 'TREND_ACCELERATION';
  }
  
  // 大口とリテールの大きなズレ = トラップの典型的なパターン
  const whaleRetailDivergence = Math.abs(divergenceResult.onchainSocialDivergence);
  if (whaleRetailDivergence > 40) {
    trapScore += 25;
    trapType = trapType || 'WHALE_RETAIL_DIVERGENCE';
  } else if (whaleRetailDivergence > 25) {
    trapScore += 15;
  }
  
  // 価格とオンチェーンのズレ = トラップの典型的なパターン
  if (divergenceResult.priceOnchainDivergence && Math.abs(divergenceResult.onchainScore) > 20) {
    trapScore += 20;
    trapType = trapType || 'PRICE_ONCHAIN_DIVERGENCE';
  }
  
  // 価格とXセンチメントのズレ = トラップの典型的なパターン
  if (divergenceResult.priceSocialDivergence && Math.abs(divergenceResult.socialScore) > 20) {
    trapScore += 20;
    trapType = trapType || 'PRICE_SOCIAL_DIVERGENCE';
  }

  // ===== 3. 既存のtrapDetector.jsロジックを統合 =====
  const basicTrap = detectTrap({
    priceChange: priceChange24h,
    volume: 0,
    inflow: exchangeNetflow,
    mpi: minerMPI,
    whaleBias,
    retailFomo,
  });

  if (basicTrap.isTrap) {
    // 既存のトラップ検知ロジックの結果を統合
    trapScore += 30; // 既存トラップ検知の重み付け
    if (!trapType) {
      trapType = basicTrap.type; // 'FOMO_BULL_TRAP', 'PANIC_BEAR_TRAP', 'BULL_TRAP', 'BEAR_TRAP'
    }
  }

  // トラップの深刻度を判定
  if (trapScore >= 70) {
    trapSeverity = 'CRITICAL';
  } else if (trapScore >= 50) {
    trapSeverity = 'HIGH';
  } else if (trapScore >= 30) {
    trapSeverity = 'MEDIUM';
  } else if (trapScore >= 15) {
    trapSeverity = 'LOW';
  }
  
  // ===== 4. トレンド転換先回りシグナル =====
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
      reversalConfidence = Math.min(0.85, 0.60 + (trapScore / 100) * 0.25);
    }
    // トレンド転換の兆候: オンチェーンが強気に加速 + Xセンチメントが強気に転換
    else if (netflowAcceleration < -0.15 && mpiAcceleration < -0.1 && whaleBiasChange > 0.3 && retailFomoChange < 30) {
      // 強気転換の兆候を検出（BUY/SELLシグナルは生成しない）
      trendReversalSignal = null; // BUY/SELL_REVERSAL_IMMINENTは完全削除
      reversalConfidence = Math.min(0.85, 0.60 + (trapScore / 100) * 0.25);
    }
  }
  
  return {
    // 基本情報（後方互換性のためbugDetected/bugScoreも保持）
    trapDetected: trapScore >= 15,
    bugDetected: trapScore >= 15, // 後方互換性
    trapScore: Math.min(100, trapScore),
    bugScore: Math.min(100, trapScore), // 後方互換性
    trapSeverity,
    bugSeverity: trapSeverity, // 後方互換性
    trapType,
    bugType: trapType, // 後方互換性
    
    // ダイバージェンス情報
    divergence: divergenceResult,
    
    // 既存トラップ検知結果
    basicTrap,
    
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
 * トラップ検知ベースのアラート生成
 * トラップを検知した場合、トラップアラートを生成（BUY/SELLシグナルではなく）
 * 
 * @param {Object} params - 検出パラメータ
 * @returns {Object} トラップアラート結果
 */
function generateTrapAlert(params = {}) {
  const trapDetection = detectTrapDetection(params);
  
  // トラップが検出され、かつ高解像度ダイバージェンスシグナルが生成されている場合
  if (trapDetection.trapDetected && trapDetection.divergence.confidence >= 0.70) {
    const divergenceSignal = evaluateDivergenceSignalHighResolution({
      exchangeNetflow: params.exchangeNetflow,
      minerMPI: params.minerMPI,
      whaleBias: params.whaleBias,
      retailFomo: params.retailFomo,
      priceChange24h: params.priceChange24h,
      binanceData: params.binanceData,
      highResCQ: params.highResCQ,
      highResX: params.highResX,
    });
    
    // トラップが検出されている場合、アラートを生成
    if (trapDetection.trapSeverity !== 'NONE') {
      // トラップタイプに基づいてアラートタイプを決定
      let alertType = 'TRAP_DETECTED';
      let recommendation = 'STANDBY';
      
      if (trapDetection.trapType === 'FOMO_BULL_TRAP' || trapDetection.trapType === 'BULL_TRAP') {
        alertType = 'BULL_TRAP';
        recommendation = 'AVOID_LONG';
      } else if (trapDetection.trapType === 'PANIC_BEAR_TRAP' || trapDetection.trapType === 'BEAR_TRAP') {
        alertType = 'BEAR_TRAP';
        recommendation = 'AVOID_SHORT';
      } else if (trapDetection.trapSeverity === 'CRITICAL' || trapDetection.trapSeverity === 'HIGH') {
        alertType = 'CRITICAL_TRAP';
        recommendation = 'STANDBY';
      }
      
      const trapAlert = {
        alert: true,
        type: alertType,
        severity: trapDetection.trapSeverity,
        confidence: Math.min(1.0, trapDetection.trapScore / 100),
        recommendation,
        trapDetection,
        divergenceSignal: divergenceSignal.signal !== 'STANDBY' ? divergenceSignal : null, // NONE → STANDBY
        urgency: trapDetection.trapSeverity === 'CRITICAL' ? 'CRITICAL' : trapDetection.trapSeverity === 'HIGH' ? 'HIGH' : 'MEDIUM',
      };
      
      // SSOT準拠: 統一品質ゲートを適用（trapScore>=60 & multipleDivergences>=3）
      return applyQualityGate(trapAlert, trapDetection);
    }
    
    const trapAlert = {
      alert: false,
      type: null,
      severity: 'NONE',
      confidence: 0,
      recommendation: 'STANDBY', // NONE → STANDBY
      trapDetection,
      divergenceSignal: divergenceSignal.signal !== 'STANDBY' ? divergenceSignal : null, // NONE → STANDBY
      urgency: 'LOW',
    };
    
    // SSOT準拠: 統一品質ゲートを適用
    return applyQualityGate(trapAlert, trapDetection);
  }
  
  // トラップが検出されているが、シグナルが生成されていない場合
  if (trapDetection.trapDetected) {
    let alertType = 'TRAP_DETECTED';
    let recommendation = 'STANDBY';
    
    if (trapDetection.trapType === 'FOMO_BULL_TRAP' || trapDetection.trapType === 'BULL_TRAP') {
      alertType = 'BULL_TRAP';
      recommendation = 'AVOID_LONG';
    } else if (trapDetection.trapType === 'PANIC_BEAR_TRAP' || trapDetection.trapType === 'BEAR_TRAP') {
      alertType = 'BEAR_TRAP';
      recommendation = 'AVOID_SHORT';
    }
    
    const trapAlert = {
      alert: true,
      type: alertType,
      severity: trapDetection.trapSeverity,
      confidence: trapDetection.trapScore / 100,
      recommendation,
      trapDetection,
      divergenceSignal: null,
      urgency: trapDetection.trapSeverity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
    };
    
    // SSOT準拠: 統一品質ゲートを適用
    return applyQualityGate(trapAlert, trapDetection);
  }
  
  // トラップが検出されていない場合
  const trapAlert = {
    alert: false,
    type: null,
    severity: 'NONE',
    confidence: 0,
    recommendation: 'STANDBY', // NONE → STANDBY
    trapDetection,
    divergenceSignal: null,
    urgency: 'LOW',
  };
  
  // SSOT準拠: 統一品質ゲートを適用
  return applyQualityGate(trapAlert, trapDetection);
}

// 後方互換性のため、旧関数名もエクスポート
const detectMarketBug = detectTrapDetection;
const evaluateMarketBugSignal = generateTrapAlert;

module.exports = {
  detectTrapDetection,
  generateTrapAlert,
  // 後方互換性
  detectMarketBug,
  evaluateMarketBugSignal,
};
