// logic/eventTriggers.js
// CryptoTrade Academy - イベント駆動配信システム用トリガー判定
// 4種類のトリガー（EMERGENCY/WATCH/STANDBY_BREAK/REGULAR）を判定

const { getHoursSinceLastUpdate } = require('../utils/stateManager');

// 市場プロファイルを取得（config/marketProfiles.jsから）
function getMarketProfile(market) {
  try {
    const profiles = require('../config/marketProfiles');
    return profiles.getMarketProfile(market);
  } catch (error) {
    console.warn(`[eventTriggers] marketProfiles.js not found, using defaults for ${market}`);
    // デフォルト設定を返す
    return {
      eventTriggers: {
        EMERGENCY: { trapScore: 60, liquidations: 500000000 },
        WATCH: { scoreChange: 30, mpiThresh: -20 },
        STANDBY_BREAK: { hoursSinceLastActive: 24 },
        REGULAR: { maxHoursWithoutUpdate: 24 },
      },
    };
  }
}

/**
 * イベントトリガーを評価
 * @param {string} market - 市場コード (EN/AR/KO/JA/ES/PT-BR)
 * @param {Object} currentState - 現在の状態
 * @param {Object} lastState - 前回の状態
 * @param {Object} cqDeep - CryptoQuant深掘りデータ
 * @returns {Promise<Object>} トリガー判定結果
 */
async function evaluateTrigger(market, currentState, lastState, cqDeep = {}) {
  try {
    const profile = getMarketProfile(market);
    const triggers = profile.eventTriggers || {};

    // 現在のスコアとシグナル
    const currentScore = currentState.score ?? 0;
    const currentSignal = currentState.signal || 'BUG_STANDBY';
    const trapScore = currentState.trapScore ?? cqDeep.trapScore ?? 0;
    const liquidations = cqDeep.liquidations ?? 0;
    const kimchiPremium = cqDeep.kimchiPremium ?? 0;
    const mpi = cqDeep.mpi ?? cqDeep.minerMPI ?? 0;

    // 前回のスコア
    const lastScore = lastState.lastScore ?? 0;
    const lastSignal = lastState.lastSignal || 'BUG_STANDBY';
    const hoursSinceLastUpdate = getHoursSinceLastUpdate(lastState.lastUpdateTime);

    // スコア変動
    const scoreChange = Math.abs(currentScore - lastScore);

  // 1. EMERGENCY判定（最優先）
  const emergencyConfig = triggers.EMERGENCY || {};
  let emergencyReason = null;

  if (trapScore >= (emergencyConfig.trapScore || 60)) {
    emergencyReason = `trapScore ${trapScore} >= ${emergencyConfig.trapScore || 60}`;
  } else if (liquidations >= (emergencyConfig.liquidations || 500000000)) {
    emergencyReason = `liquidations $${liquidations} >= $${emergencyConfig.liquidations || 500000000}`;
  } else if (market === 'KO' && kimchiPremium >= (emergencyConfig.kimchiPremium || 0.08)) {
    emergencyReason = `kimchiPremium ${(kimchiPremium * 100).toFixed(2)}% >= ${((emergencyConfig.kimchiPremium || 0.08) * 100).toFixed(2)}%`;
  }

  if (emergencyReason) {
    return {
      shouldSend: true,
      triggerType: 'EMERGENCY',
      reason: `EMERGENCY: ${emergencyReason}`,
    };
  }

  // 2. WATCH判定
  const watchConfig = triggers.WATCH || {};
  let watchReason = null;

  if (scoreChange >= (watchConfig.scoreChange || 30)) {
    watchReason = `scoreChange ${scoreChange.toFixed(1)}pt >= ${watchConfig.scoreChange || 30}pt`;
  } else if (mpi <= (watchConfig.mpiThresh || -20)) {
    watchReason = `MPI ${mpi.toFixed(2)} <= ${watchConfig.mpiThresh || -20}`;
  } else if (market === 'KO' && kimchiPremium >= (watchConfig.kimchiPremium || 0.05)) {
    watchReason = `kimchiPremium ${(kimchiPremium * 100).toFixed(2)}% >= ${((watchConfig.kimchiPremium || 0.05) * 100).toFixed(2)}%`;
  }

  if (watchReason) {
    return {
      shouldSend: true,
      triggerType: 'WATCH',
      reason: `WATCH: ${watchReason}`,
    };
  }

  // 3. STANDBY_BREAK判定
  const standbyConfig = triggers.STANDBY_BREAK || {};
  const requiredHours = standbyConfig.hoursSinceLastActive || 24;

  if (lastSignal === 'BUG_STANDBY' && hoursSinceLastUpdate >= requiredHours) {
    // 24時間以上STANDBYが続いた後、条件が成立した場合
    if (currentSignal !== 'BUG_STANDBY') {
      return {
        shouldSend: true,
        triggerType: 'STANDBY_BREAK',
        reason: `STANDBY_BREAK: ${hoursSinceLastUpdate.toFixed(1)}h since last BUG_STANDBY, now ${currentSignal}`,
      };
    }
  }

  // 4. REGULAR判定（24時間強制配信）
  const regularConfig = triggers.REGULAR || {};
  const maxHours = regularConfig.maxHoursWithoutUpdate || 24;

  if (hoursSinceLastUpdate >= maxHours) {
    return {
      shouldSend: true,
      triggerType: 'REGULAR',
      reason: `REGULAR: ${hoursSinceLastUpdate.toFixed(1)}h since last update (>= ${maxHours}h)`,
    };
  }

  // 5. トリガーなし
  return {
    shouldSend: false,
    triggerType: 'NONE',
    reason: `No trigger: score=${currentScore.toFixed(1)}, signal=${currentSignal}, hours=${hoursSinceLastUpdate.toFixed(1)}`,
  };
  } catch (error) {
    console.error('[eventTriggers] Error evaluating trigger:', error);
    // フォールバック: エラー時は配信しない（安全側）
    return {
      shouldSend: false,
      triggerType: 'ERROR',
      reason: `Error evaluating trigger: ${error.message}`,
    };
  }
}

module.exports = {
  evaluateTrigger,
};

