// utils/stateManager.js
// CryptoTrade Academy - イベント駆動配信システム用状態管理
// Vercel KVを使用して前回配信状態を保存・取得

const { kv } = require('@vercel/kv');
const { Logger } = require('./logger');
const { ErrorTracker } = require('./errorTracker');

// Valid market codes
const VALID_MARKETS = ['EN', 'AR', 'KO', 'JA', 'ES', 'PT-BR'];

// 市場別の状態キー生成
function getStateKey(market) {
  // Validate market code
  if (!VALID_MARKETS.includes(market)) {
    Logger.warn('stateManager', 'Invalid market code, using EN as default', { market });
    market = 'EN';
  }
  return `state:${market}`;
}

/**
 * 前回配信状態を取得
 * @param {string} market - 市場コード (EN/AR/KO/JA/ES/PT-BR)
 * @returns {Promise<Object>} 前回状態データ
 */
async function getLastState(market) {
  try {
    const key = getStateKey(market);
    const state = await kv.get(key);

    if (!state) {
      // 初回起動時はデフォルト値を返す
      return {
        lastUpdateTime: null,
        lastSignal: null,
        lastScore: null,
        consecutiveStandbyCount: 0,
      };
    }

    return {
      lastUpdateTime: state.lastUpdateTime || null,
      lastSignal: state.lastSignal || null,
      lastScore: state.lastScore || null,
      consecutiveStandbyCount: state.consecutiveStandbyCount || 0,
    };
  } catch (error) {
    ErrorTracker.trackError('stateManager', 'getLastState', error, { market });
    // エラー時もデフォルト値を返す（フォールバック）
    return {
      lastUpdateTime: null,
      lastSignal: null,
      lastScore: null,
      consecutiveStandbyCount: 0,
    };
  }
}

/**
 * 状態を保存
 * @param {string} market - 市場コード
 * @param {Object} state - 保存する状態データ
 */
async function saveState(market, state) {
  try {
    const key = getStateKey(market);
    const now = new Date().toISOString();

    // 連続BUG_STANDBY回数をカウント
    let consecutiveStandbyCount = 0;
    if (state.lastSignal === 'BUG_STANDBY') {
      const lastState = await getLastState(market);
      consecutiveStandbyCount = (lastState.consecutiveStandbyCount || 0) + 1;
    }

    const stateToSave = {
      lastUpdateTime: now,
      lastSignal: state.signal || state.lastSignal || null,
      lastScore: state.score !== undefined ? state.score : state.lastScore || null,
      consecutiveStandbyCount,
      regime: state.regime || null,
      confidence: state.confidence || null,
    };

    // Vercel KVに保存（TTL: 7日間）
    await kv.set(key, stateToSave, { ex: 7 * 24 * 60 * 60 }); // 7 days in seconds

    Logger.debug('stateManager', `Saved state for ${market}`, {
      signal: stateToSave.lastSignal,
      score: stateToSave.lastScore,
      consecutiveStandbyCount: stateToSave.consecutiveStandbyCount,
    });
  } catch (error) {
    Logger.error('stateManager', `Error saving state for ${market}`, error);
    // エラー時も処理を続行（ログのみ）
  }
}

/**
 * 最終更新からの経過時間を取得（時間単位）
 * @param {string|null} lastUpdateTime - ISO 8601形式の時刻文字列
 * @returns {number} 経過時間（時間）
 */
function getHoursSinceLastUpdate(lastUpdateTime) {
  if (!lastUpdateTime) {
    return Infinity; // 初回起動時は無限大として扱う
  }

  try {
    const lastDate = new Date(lastUpdateTime);
    const now = new Date();
    const diffMs = now - lastDate;
    const diffHours = diffMs / (1000 * 60 * 60);

    return Math.max(0, diffHours); // 負の値は0に
  } catch (error) {
    ErrorTracker.trackError('stateManager', 'getHoursSinceLastUpdate', error);
    return Infinity;
  }
}

module.exports = {
  getLastState,
  saveState,
  getHoursSinceLastUpdate,
};

