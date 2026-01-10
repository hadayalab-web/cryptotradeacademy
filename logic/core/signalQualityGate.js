// logic/core/signalQualityGate.js
// SSOT Trap Defense BTC準拠の統一品質ゲート
// trapScore>=60 & multipleDivergences>=3 の条件を満たした場合のみ alert=true を返す

/**
 * 統一品質ゲート（SSOT準拠）
 * trapScore>=60 & multipleDivergences>=3 の条件を満たした場合のみ alert=true を返す
 * 
 * @param {Object} trapDetection - トラップ検出結果
 * @param {number} trapDetection.trapScore - トラップスコア（0-100）
 * @param {Object} trapDetection.divergence - ダイバージェンス検出結果
 * @param {number} trapDetection.divergence.multipleDivergences - 複数ダイバージェンス数
 * @returns {boolean} 品質ゲートを通過した場合 true
 */
function passesQualityGate(trapDetection) {
  if (!trapDetection || !trapDetection.divergence) {
    return false;
  }
  
  const trapScore = trapDetection.trapScore || 0;
  const multipleDivergences = trapDetection.divergence.multipleDivergences || 0;
  
  // SSOT要件: trapScore>=60 & multipleDivergences>=3
  return trapScore >= 60 && multipleDivergences >= 3;
}

/**
 * トラップアラートに品質ゲートを適用
 * 品質ゲートを通過しない場合は alert=false, recommendation=STANDBY を返す
 * 
 * @param {Object} trapAlert - トラップアラート（generateTrapAlertの返却値）
 * @param {Object} trapDetection - トラップ検出結果
 * @returns {Object} 品質ゲート適用後のトラップアラート
 */
function applyQualityGate(trapAlert, trapDetection) {
  if (!trapAlert || !trapDetection) {
    return {
      alert: false,
      type: null,
      severity: 'NONE',
      confidence: 0,
      recommendation: 'STANDBY',
      trapDetection,
      divergenceSignal: null,
      urgency: 'LOW',
    };
  }
  
  // 品質ゲートを通過しない場合
  if (!passesQualityGate(trapDetection)) {
    return {
      ...trapAlert,
      alert: false, // 品質ゲート未通過のため alert=false
      recommendation: 'STANDBY', // 必ず STANDBY を返す
      urgency: 'LOW',
    };
  }
  
  // 品質ゲートを通過した場合、元のアラートを返す
  return trapAlert;
}

module.exports = {
  passesQualityGate,
  applyQualityGate,
};
