// services/cryptoquant/snapshot.js
// Phase 3: CryptoQuantデータ取得の集約関数（重複排除）
// getCQSnapshot() - 1回呼ぶと必要指標を全部返す集約関数

const { getExchangeInflow, getMinerPositionIndex } = require('./endpoints/btc');
const { getCQDeepMetrics } = require('./deepMetrics');
const { getHighResolutionCQData } = require('./highResolution');

/**
 * CryptoQuantデータのスナップショットを取得（集約関数）
 * 重複取得を排除し、必要な指標を一度に取得
 * 
 * @param {Object} options - 取得オプション
 * @param {string[]} options.windows - 時間窓の配列（デフォルト: プランに応じて自動設定）
 * @param {boolean} options.includeDeep - 深掘りデータを含めるか（デフォルト: true）
 * @param {boolean} options.includeHighRes - 高解像度データを含めるか（デフォルト: true）
 * @param {string} options.market - 市場コード（EN/AR/KO/JA/ES/PT-BR）
 * @param {Object} options.priceOptions - 価格オプション（KO市場用）
 * @returns {Promise<Object>} CryptoQuantデータスナップショット
 */
async function getCQSnapshot(options = {}) {
  const {
    windows = null, // nullの場合はgetHighResolutionCQData内で自動設定
    includeDeep = true,
    includeHighRes = true,
    market = 'EN',
    priceOptions = {},
  } = options;
  
  try {
    // 基本データ取得（重複排除: 一度だけ取得）
    const [inflowData, mpiData] = await Promise.all([
      getExchangeInflow(),
      getMinerPositionIndex(),
    ]);
    
    const inflow = inflowData?.value ?? 0;
    const mpi = mpiData?.value ?? 0;
    
    // 深掘りデータと高解像度データを並列取得（重複排除: 基本データは再利用）
    const promises = [];
    
    if (includeDeep) {
      promises.push(
        getCQDeepMetrics(market, priceOptions).catch(error => {
          console.warn('[snapshot] Error fetching deep metrics:', error.message);
          return null;
        })
      );
    } else {
      promises.push(Promise.resolve(null));
    }
    
    if (includeHighRes) {
      promises.push(
        getHighResolutionCQData({
          windows,
          limit: 24,
          includeWhaleRatio: true,
          includeLiquidations: true,
        }).catch(error => {
          console.warn('[snapshot] Error fetching high-resolution data:', error.message);
          return null;
        })
      );
    } else {
      promises.push(Promise.resolve(null));
    }
    
    const [deepData, highResData] = await Promise.allSettled(promises);
    
    const cqDeep = deepData.status === 'fulfilled' ? deepData.value : null;
    const highResCQ = highResData.status === 'fulfilled' ? highResData.value : null;
    
    // スナップショットを統合
    return {
      // 基本データ
      inflow,
      mpi,
      
      // 深掘りデータ（存在する場合）
      ...(cqDeep || {}),
      
      // 高解像度データ（存在する場合）
      highResCQ,
      
      // メタデータ
      timestamp: Date.now(),
      market,
      windows: windows || (highResCQ?.netflow?.timeframes ? Object.keys(highResCQ.netflow.timeframes) : ['day']),
    };
  } catch (error) {
    console.error('[snapshot] Error in getCQSnapshot:', error);
    // エラー時は基本データのみ返す
    return {
      inflow: 0,
      mpi: 0,
      timestamp: Date.now(),
      market,
      error: error.message,
    };
  }
}

module.exports = {
  getCQSnapshot,
};
