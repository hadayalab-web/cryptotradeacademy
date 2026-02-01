// services/cryptoquant/highResolution.js
// 高解像度データ取得: 複数時間窓での時系列トレンド分析
// 市場の裏側で起こっている「バグ」を検知するための高精度データ取得
// 
// 注意: CryptoQuant ProfessionalプランではAPI解像度が「1日まで」に制限されているため、
// デフォルトでは'day'のみを使用します。Premiumプランの場合は環境変数で制御可能。

const { fetchCryptoQuant } = require('./client');

// プラン制限を考慮したデフォルト時間窓
// Professionalプラン: ['day'] のみ
// Premiumプラン以上: ['hour', '4hour', 'day'] が利用可能
const DEFAULT_WINDOWS = (process.env.CRYPTOQUANT_PLAN === 'premium' || process.env.CRYPTOQUANT_PLAN === 'enterprise')
  ? ['hour', '4hour', 'day']
  : ['day']; // Professionalプランまたは未指定の場合はdayのみ

/**
 * 複数時間窓でExchange Netflowを取得し、トレンドを分析
 * @param {string[]} windows - 時間窓の配列 (Professionalプラン: ['day'], Premium以上: ['hour', '4hour', 'day'])
 * @param {number} limit - 各時間窓での取得ポイント数
 * @returns {Promise<Object>} 時間窓別のデータとトレンド分析
 */
/**
 * Step 2-4: EMERGENCY判定指標のキャッシュバイパス対応
 * @param {string[]} windows - 時間窓の配列
 * @param {number} limit - 各時間窓での取得ポイント数
 * @param {object} options - オプション
 * @param {boolean} options.skipCache - キャッシュをスキップするか（EMERGENCY判定時など）
 */
async function getExchangeNetflowMultiTimeframe(windows = DEFAULT_WINDOWS, limit = 24, options = {}) {
  const results = {};
  
  try {
    // 各時間窓で並列取得（client.jsのrate limitingで3秒間隔に制御）
    // Professionalプラン: windows = ['day'] なので1リクエストのみ
    const fetchPromises = windows.map(async (window) => {
      try {
        const data = await fetchCryptoQuant('/btc/exchange-flows/netflow', {
          exchange: 'all_exchange',
          window,
          limit,
        }, { skipCache: options.skipCache });
        
        const points = data?.result?.data || [];
        if (points.length === 0) return { window, data: [], trend: null };
        
        // 最新値を取得
        const latestValue = points[0]?.netflow_total ?? points[0]?.netflow ?? points[0]?.value ?? 0;
        
        // 時系列データを抽出
        const values = points.map(p => p.netflow_total ?? p.netflow ?? p.value ?? 0);
        
        // トレンド分析（線形回帰の傾きを計算）
        const trend = calculateTrend(values);
        
        // 加速度（変化率の変化率）
        const acceleration = calculateAcceleration(values);
        
        // 異常検知（Zスコアベース）
        const anomalyScore = calculateAnomalyScore(values, latestValue);
        
        return {
          window,
          current: latestValue,
          values,
          trend,
          acceleration,
          anomalyScore,
          dataPoints: points.length,
        };
      } catch (error) {
        console.warn(`[highResolution] Error fetching netflow for window ${window}:`, error.message);
        return { window, error: error.message };
      }
    });
    
    const windowResults = await Promise.all(fetchPromises);
    windowResults.forEach(result => {
      if (result.window) {
        results[result.window] = result;
      }
    });
    
    // 複数時間窓での整合性チェック（短期と長期の方向性が一致しているか）
    const consistency = calculateTimeframeConsistency(results);
    
    return {
      timeframes: results,
      consistency,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('[highResolution] Error in multi-timeframe fetch:', error);
    return { error: error.message };
  }
}

/**
 * Miners' Position Index (MPI) を複数時間窓で取得
 * @param {string[]} windows - 時間窓の配列 (Professionalプラン: ['day'], Premium以上: ['hour', '4hour', 'day'])
 * @param {number} limit - 各時間窓での取得ポイント数
 * @returns {Promise<Object>} 時間窓別のMPIデータとトレンド分析
 */
/**
 * Step 2-4: EMERGENCY判定指標のキャッシュバイパス対応
 * @param {string[]} windows - 時間窓の配列
 * @param {number} limit - 各時間窓での取得ポイント数
 * @param {object} options - オプション
 * @param {boolean} options.skipCache - キャッシュをスキップするか（EMERGENCY判定時など）
 */
async function getMPIMultiTimeframe(windows = DEFAULT_WINDOWS, limit = 24, options = {}) {
  const results = {};
  
  try {
    // 各時間窓で並列取得（client.jsのrate limitingで3秒間隔に制御）
    // Professionalプラン: windows = ['day'] なので1リクエストのみ
    const fetchPromises = windows.map(async (window) => {
      try {
        const data = await fetchCryptoQuant('/btc/flow-indicator/mpi', {
          window,
          limit,
        }, { skipCache: options.skipCache });
        
        const points = data?.result?.data || [];
        if (points.length === 0) return { window, data: [], trend: null };
        
        const latestValue = points[0]?.mpi ?? points[0]?.value ?? 0;
        const values = points.map(p => p.mpi ?? p.value ?? 0);
        const trend = calculateTrend(values);
        const acceleration = calculateAcceleration(values);
        const anomalyScore = calculateAnomalyScore(values, latestValue);
        
        return {
          window,
          current: latestValue,
          values,
          trend,
          acceleration,
          anomalyScore,
          dataPoints: points.length,
        };
      } catch (error) {
        console.warn(`[highResolution] Error fetching MPI for window ${window}:`, error.message);
        return { window, error: error.message };
      }
    });
    
    const windowResults = await Promise.all(fetchPromises);
    windowResults.forEach(result => {
      if (result.window) {
        results[result.window] = result;
      }
    });
    
    const consistency = calculateTimeframeConsistency(results);
    
    return {
      timeframes: results,
      consistency,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('[highResolution] Error in MPI multi-timeframe fetch:', error);
    return { error: error.message };
  }
}

/**
 * 高解像度CryptoQuantデータを統合取得
 * 複数時間窓、複数指標を並列取得し、市場の「バグ」を検出可能な高精度データを返す
 * 
 * Professionalプラン制限対応: API解像度が「1日まで」のため、デフォルトでは'day'のみを使用
 * Premiumプラン以上では環境変数CRYPTOQUANT_PLAN=premiumで複数時間窓が利用可能
 * 
 * @param {Object} options - 取得オプション
 * @param {string[]} options.windows - 時間窓の配列 (デフォルト: プランに応じて自動設定)
 * @param {number} options.limit - 各時間窓での取得ポイント数
 * @param {boolean} options.includeWhaleRatio - Whale Ratioを含めるか
 * @param {boolean} options.includeLiquidations - Liquidationsを含めるか
 * @returns {Promise<Object>} 高解像度データ
 */
async function getHighResolutionCQData(options = {}) {
  // Professionalプラン: トレンド/加速度に7日分で十分。API負荷・レスポンス時間を削減
  const defaultLimit = (process.env.CRYPTOQUANT_PLAN === 'premium' || process.env.CRYPTOQUANT_PLAN === 'enterprise')
    ? 24
    : 7;
  const {
    windows = DEFAULT_WINDOWS,
    limit = defaultLimit,
    includeWhaleRatio = true,
    includeLiquidations = true,
  } = options;
  
  try {
    // 基本指標を複数時間窓で並列取得
    // API制限対応: client.jsのrate limiting（3秒間隔）により自動制御
    // Professionalプラン制限（20リクエスト/分）に対応:
    // - Professionalプランでは合計5リクエスト（netflow: 1, MPI: 1, whaleRatio: 1, liquidations: 2）
    // - 3秒間隔で実行されるため、約12-15秒で完了（制限内）
    // Step 2-4: EMERGENCY判定指標のキャッシュバイパス
    const skipCache = options.skipCache || false;
    const [netflowMulti, mpiMulti, whaleRatioData, liquidationsData] = await Promise.allSettled([
      getExchangeNetflowMultiTimeframe(windows, limit, { skipCache }),
      getMPIMultiTimeframe(windows, limit, { skipCache }),
      includeWhaleRatio ? (async () => {
        try {
          // Step 2-4: EMERGENCY判定指標のキャッシュバイパス
          const data = await fetchCryptoQuant('/btc/flow-indicator/exchange-whale-ratio', {
            exchange: 'all_exchange',
            window: 'day',
            limit: limit,
          }, { skipCache: options.skipCache });
          const points = data?.result?.data || [];
          const values = points.map(p => p.exchange_whale_ratio ?? p.value ?? 0);
          return {
            current: values[0] || 0,
            values,
            trend: calculateTrend(values),
            acceleration: calculateAcceleration(values),
          };
        } catch (error) {
          console.warn('[highResolution] Error fetching whale ratio:', error.message);
          return null;
        }
      })() : Promise.resolve(null),
      includeLiquidations ? (async () => {
        // CryptoQuant APIでは Liquidations エンドポイントが提供されていないため（404エラー）、
        // 常にnullを返す（高解像度データでは使用しない）
        return null;
      })() : Promise.resolve(null),
    ]);
    
    // 結果を統合
    const netflow = netflowMulti.status === 'fulfilled' ? netflowMulti.value : null;
    const mpi = mpiMulti.status === 'fulfilled' ? mpiMulti.value : null;
    const whaleRatio = whaleRatioData.status === 'fulfilled' ? whaleRatioData.value : null;
    const liquidations = liquidationsData.status === 'fulfilled' ? liquidationsData.value : null;
    
    // 市場「バグ」検出のためのシグナル強度計算
    const bugSignals = detectMarketBugs({
      netflow,
      mpi,
      whaleRatio,
      liquidations,
    });
    
    return {
      netflow,
      mpi,
      whaleRatio,
      liquidations,
      bugSignals,
      timestamp: Date.now(),
      resolution: 'high',
    };
  } catch (error) {
    console.error('[highResolution] Error in high-resolution data fetch:', error);
    throw error;
  }
}

// ===== ユーティリティ関数 =====

/**
 * 時系列データからトレンド（傾き）を計算（線形回帰）
 * @param {number[]} values - 時系列データ（新しい順）
 * @returns {number} トレンド（正の値=上昇、負の値=下降、0=横ばい）
 */
function calculateTrend(values) {
  if (!values || values.length < 2) return 0;
  
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = values.reverse(); // 古い順に並び替え
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return isNaN(slope) ? 0 : slope;
}

/**
 * 加速度（変化率の変化率）を計算
 * @param {number[]} values - 時系列データ
 * @returns {number} 加速度
 */
function calculateAcceleration(values) {
  if (!values || values.length < 3) return 0;
  
  const changes = [];
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i + 1] !== 0) {
      changes.push((values[i] - values[i + 1]) / Math.abs(values[i + 1]));
    }
  }
  
  if (changes.length < 2) return 0;
  
  const accelerations = [];
  for (let i = 0; i < changes.length - 1; i++) {
    accelerations.push(changes[i] - changes[i + 1]);
  }
  
  const avgAcceleration = accelerations.reduce((a, b) => a + b, 0) / accelerations.length;
  return isNaN(avgAcceleration) ? 0 : avgAcceleration;
}

/**
 * 異常検知スコア（Zスコアベース）
 * @param {number[]} values - 時系列データ
 * @param {number} currentValue - 現在値
 * @returns {number} 異常スコア（絶対値が大きいほど異常）
 */
function calculateAnomalyScore(values, currentValue) {
  if (!values || values.length < 2) return 0;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return 0;
  
  const zScore = (currentValue - mean) / stdDev;
  return isNaN(zScore) ? 0 : zScore;
}

/**
 * 複数時間窓での整合性を計算
 * @param {Object} results - 時間窓別の結果
 * @returns {Object} 整合性スコア
 */
function calculateTimeframeConsistency(results) {
  const validResults = Object.values(results).filter(r => r && r.trend !== null && !r.error);
  if (validResults.length < 2) {
    return { score: 0, aligned: false, reason: 'insufficient_data' };
  }
  
  // トレンドの方向性が一致しているか確認
  const trends = validResults.map(r => Math.sign(r.trend));
  const allPositive = trends.every(t => t >= 0);
  const allNegative = trends.every(t => t <= 0);
  const aligned = allPositive || allNegative;
  
  // 整合性スコア（0-1、1が最高）
  const consistencyScore = aligned ? 1.0 : 0.5;
  
  return {
    score: consistencyScore,
    aligned,
    trendSigns: trends,
    timeframes: validResults.map(r => r.window),
  };
}

/**
 * 市場「バグ」検出ロジック
 * 複数時間窓、複数指標の異常パターンを組み合わせて検出
 * @param {Object} data - 高解像度データ
 * @returns {Object} バグシグナル
 */
function detectMarketBugs({ netflow, mpi, whaleRatio, liquidations }) {
  const signals = {
    whaleDump: { detected: false, confidence: 0, details: {} },
    retailFomoTrap: { detected: false, confidence: 0, details: {} },
    minerSelling: { detected: false, confidence: 0, details: {} },
    liquidationCascade: { detected: false, confidence: 0, details: {} },
    overallBugScore: 0,
  };
  
  // 1. クジラの大量売却検出
  if (netflow?.timeframes?.day && whaleRatio) {
    const dayNetflow = netflow.timeframes.day;
    // 日次で大きな流入（売却） + Whale Ratioが高い = 大口が売り抜け
    if (dayNetflow.current > 3000 && whaleRatio.current > 0.85) {
      signals.whaleDump = {
        detected: true,
        confidence: Math.min(0.9, 0.6 + (dayNetflow.current / 10000) * 0.3),
        details: {
          netflow: dayNetflow.current,
          whaleRatio: whaleRatio.current,
          trend: dayNetflow.trend,
        },
      };
    }
  }
  
  // 2. リテールFOMOトラップ検出（価格上昇中に大口が売却）
  // Professionalプラン対応: hourが利用できない場合は、dayの加速度とトレンドで判定
  if (netflow?.timeframes?.day) {
    const dayNetflow = netflow.timeframes.day;
    // 日次で流入が加速 + 大きな流入 = リテールが買い続けている間に大口が売却
    // Professionalプラン: dayの加速度とトレンドを組み合わせて判定
    const accelerationThreshold = netflow.timeframes.hour 
      ? 0.1  // Premiumプラン: hourデータがある場合は従来ロジック
      : 0.05; // Professionalプラン: dayデータのみの場合は閾値を下げる
    
    if (dayNetflow.acceleration > accelerationThreshold && dayNetflow.current > 2000) {
      signals.retailFomoTrap = {
        detected: true,
        confidence: Math.min(0.85, 0.5 + dayNetflow.acceleration * 2),
        details: {
          acceleration: dayNetflow.acceleration,
          dayNetflow: dayNetflow.current,
          trend: dayNetflow.trend,
          // Professionalプランではhourデータがないことを明示
          resolution: netflow.timeframes.hour ? 'multi-timeframe' : 'daily-only',
        },
      };
    }
  }
  
  // 3. マイナーの大量売却検出
  if (mpi?.timeframes?.day) {
    const dayMPI = mpi.timeframes.day;
    // MPIが高い + トレンドが加速している = マイナーが売却加速
    if (dayMPI.current > 1.5 && dayMPI.acceleration > 0.05) {
      signals.minerSelling = {
        detected: true,
        confidence: Math.min(0.8, 0.5 + (dayMPI.current - 1.0) * 0.3),
        details: {
          mpi: dayMPI.current,
          acceleration: dayMPI.acceleration,
        },
      };
    }
  }
  
  // 4. リキデーションカスケード検出
  if (liquidations?.total) {
    const totalLiq = liquidations.total;
    // リキデーションが急増 + トレンドが加速 = カスケードの可能性
    if (totalLiq.current > 100_000_000 && totalLiq.trend > 0.1) {
      signals.liquidationCascade = {
        detected: true,
        confidence: Math.min(0.75, 0.4 + (totalLiq.current / 500_000_000) * 0.35),
        details: {
          totalLiquidations: totalLiq.current,
          trend: totalLiq.trend,
        },
      };
    }
  }
  
  // 総合バグスコア（0-1、高いほど市場に異常がある）
  const bugScores = [
    signals.whaleDump.confidence,
    signals.retailFomoTrap.confidence,
    signals.minerSelling.confidence,
    signals.liquidationCascade.confidence,
  ];
  signals.overallBugScore = bugScores.reduce((a, b) => Math.max(a, b), 0);
  
  return signals;
}

module.exports = {
  getExchangeNetflowMultiTimeframe,
  getMPIMultiTimeframe,
  getHighResolutionCQData,
  detectMarketBugs,
  calculateTrend,
  calculateAcceleration,
  calculateAnomalyScore,
  calculateTimeframeConsistency,
};
