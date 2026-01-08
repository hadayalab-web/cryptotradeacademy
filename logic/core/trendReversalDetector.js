// logic/core/trendReversalDetector.js
// CryptoQuant + X統合によるトレンド転換早期検出アルゴリズム
// GPT提案をベースに実装可能な形に最適化

/**
 * トレンド転換検出エンジン
 * - オンチェーンデータ（Exchange Netflow、MPI、NUPL、SOPR）とXセンチメントを統合
 * - リード/ラグ推定によりタイムラグを最小化
 * - 80%以上の勝率を目指すSELL/SHORTシグナル生成
 */

// ===============================
// ユーティリティ関数
// ===============================

function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x));
}

function median(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function mad(arr) {
  // Median Absolute Deviation（ロバストな標準偏差の推定）
  const med = median(arr);
  const deviations = arr.map(v => Math.abs(v - med));
  return median(deviations);
}

function robustZ(value, window, eps = 1e-9) {
  // ロバストZスコア（異常値に強い正規化）
  const med = median(window);
  const m = mad(window);
  const scale = 1.4826 * (m || eps); // 1.4826 * MAD ≈ 標準偏差（正規分布の場合）
  return (value - med) / scale;
}

function ema(prev, current, alpha) {
  // 指数移動平均
  if (prev == null || Number.isNaN(prev)) return current;
  return alpha * current + (1 - alpha) * prev;
}

function rollingWindowPush(window, value, maxLen) {
  window.push(value);
  if (window.length > maxLen) window.shift();
  return window;
}

/**
 * リード/ラグ推定（相関分析）
 * @param {number[]} x - 先行指標の時系列
 * @param {number[]} y - 目標指標（価格リターン）の時系列
 * @param {number} maxLag - 最大ラグステップ数
 * @returns {{bestLag: number, bestCorr: number}}
 */
function estimateLeadLag(x, y, maxLag = 30) {
  const n = Math.min(x.length, y.length);
  if (n < 20) return { bestLag: 0, bestCorr: 0 };

  function correlation(a, b) {
    const m = Math.min(a.length, b.length);
    if (m < 10) return 0;

    const meanA = a.reduce((sum, v) => sum + v, 0) / m;
    const meanB = b.reduce((sum, v) => sum + v, 0) / m;

    let num = 0, sumSqA = 0, sumSqB = 0;
    for (let i = 0; i < m; i++) {
      const diffA = a[i] - meanA;
      const diffB = b[i] - meanB;
      num += diffA * diffB;
      sumSqA += diffA * diffA;
      sumSqB += diffB * diffB;
    }

    const den = Math.sqrt(sumSqA * sumSqB) + 1e-12;
    return num / den;
  }

  let bestLag = 0;
  let bestCorr = 0;

  for (let lag = -maxLag; lag <= maxLag; lag++) {
    const xShifted = [];
    const yTarget = [];

    for (let t = 0; t < n; t++) {
      const xIndex = t - lag;
      if (xIndex >= 0 && xIndex < n) {
        xShifted.push(x[xIndex]);
        yTarget.push(y[t]);
      }
    }

    const corr = correlation(xShifted, yTarget);
    if (Math.abs(corr) > Math.abs(bestCorr)) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  return { bestLag, bestCorr };
}

// ===============================
// 特徴量エンジン
// ===============================

class FeatureEngine {
  constructor(opts = {}) {
    this.windowSize = opts.windowSize || 240; // 240時間（10日分、1時間データ）
    this.alphaFast = opts.alphaFast || 2 / (12 + 1); // 12時間EMA
    this.alphaSlow = opts.alphaSlow || 2 / (48 + 1); // 48時間EMA

    // 各指標の時系列ウィンドウ
    this.windows = {
      netflow: [],
      mpi: [],
      nupl: [],
      sopr: [],
      whaleBias: [],
      retailFomo: [],
      newsImpact: [],
      priceReturn: []
    };

    // EMA状態
    this.emaFast = {};
    this.emaSlow = {};
    this.lastPrice = null;
  }

  /**
   * データポイントを更新
   * @param {Object} point - {netflow, mpi, nupl, sopr, whaleBias, retailFomo, newsImpact, price}
   */
  update(point) {
    // 価格リターン計算
    const priceReturn = this.lastPrice != null
      ? Math.log(point.price / this.lastPrice)
      : 0;
    this.lastPrice = point.price;

    // 各指標をウィンドウに追加
    const metrics = ['netflow', 'mpi', 'nupl', 'sopr', 'whaleBias', 'retailFomo', 'newsImpact'];
    metrics.forEach(key => {
      rollingWindowPush(this.windows[key], point[key], this.windowSize);
      this.emaFast[key] = ema(this.emaFast[key], point[key], this.alphaFast);
      this.emaSlow[key] = ema(this.emaSlow[key], point[key], this.alphaSlow);
    });

    rollingWindowPush(this.windows.priceReturn, priceReturn, this.windowSize);
  }

  /**
   * 正規化された特徴量を取得
   * @returns {Object} 各指標の{z, trend, raw}
   */
  getFeatures() {
    const features = {};
    const metrics = ['netflow', 'mpi', 'nupl', 'sopr', 'whaleBias', 'retailFomo', 'newsImpact'];

    for (const key of metrics) {
      const window = this.windows[key];
      if (window.length < 10) {
        features[key] = { raw: 0, z: 0, trend: 0 };
        continue;
      }

      const current = window[window.length - 1];
      const z = robustZ(current, window);
      const trend = (this.emaFast[key] - this.emaSlow[key]) / (Math.abs(this.emaSlow[key]) + 1e-9);

      features[key] = {
        raw: current,
        z: clamp(z, -5, 5),
        trend: clamp(trend, -5, 5)
      };
    }

    // 価格リターンのZスコア
    const priceReturnWindow = this.windows.priceReturn;
    const currentReturn = priceReturnWindow[priceReturnWindow.length - 1] || 0;
    features.price = {
      returnZ: robustZ(currentReturn, priceReturnWindow)
    };

    return features;
  }
}

// ===============================
// スコアリング & ゲーティング
// ===============================

function logistic(x) {
  return 1 / (1 + Math.exp(-x));
}

/**
 * SELL/SHORT確率スコアを計算
 * @param {Object} features - 正規化された特徴量
 * @param {Object} weights - 各指標の重み
 * @returns {{p: number, linear: number}}
 */
function computeBearScore(features, weights) {
  const {
    netflow, mpi, nupl, sopr,
    whaleBias, retailFomo, newsImpact
  } = features;

  // SOPRの枯渇検出（高値 + トレンド転換）
  const soprExhaustion = clamp(
    sopr.z * 0.7 + (-sopr.trend) * 1.2,
    -5, 5
  );

  // 線形結合
  const linear =
    weights.netflowZ * netflow.z + weights.netflowT * netflow.trend +
    weights.mpiZ * mpi.z + weights.mpiT * mpi.trend +
    weights.nuplZ * nupl.z + weights.nuplT * nupl.trend +
    weights.soprEx * soprExhaustion +
    weights.whaleBiasZ * whaleBias.z + weights.whaleBiasT * whaleBias.trend +
    weights.retailFomoZ * retailFomo.z + weights.retailFomoT * retailFomo.trend +
    weights.newsImpactZ * newsImpact.z + weights.newsImpactT * newsImpact.trend;

  // ロジスティック関数で0-1に変換
  const p = logistic(linear);

  return { p, linear, soprExhaustion };
}

/**
 * 高精度SELL/SHORTゲーティング（80%勝率目標）
 * @param {Object} features - 正規化された特徴量
 * @param {Object} score - {p, linear}
 * @param {Object} config - 閾値設定
 * @returns {{pass: boolean, diagnostics: Object}}
 */
function shouldFireSellShort(features, score, config) {
  const { netflow, mpi, nupl, whaleBias, retailFomo, newsImpact } = features;
  const { th } = config;

  // オンチェーン弱気確認（少なくとも1つが条件を満たす）
  const onchainBearish =
    (netflow.z >= th.netflowZ && netflow.trend >= th.netflowTrend) ||
    (mpi.z >= th.mpiZ && mpi.trend >= th.mpiTrend) ||
    (nupl.z >= th.nuplZ && nupl.trend >= th.nuplTrend);

  // ソーシャル弱気確認（少なくとも1つが条件を満たす）
  const socialBearish =
    (whaleBias.z >= th.whaleBiasZ && whaleBias.trend >= th.whaleBiasTrend) ||
    (retailFomo.z >= th.retailFomoZ && retailFomo.trend >= th.retailFomoTrend) ||
    (newsImpact.z >= th.newsImpactZ);

  // 加速カウント（トレンドが加速している指標の数）
  const accelerationCount =
    (netflow.trend > th.accel ? 1 : 0) +
    (mpi.trend > th.accel ? 1 : 0) +
    (whaleBias.trend > th.accel ? 1 : 0) +
    (retailFomo.trend > th.accel ? 1 : 0) +
    (newsImpact.trend > th.accel ? 1 : 0);

  // 遅すぎない確認（既に下落中の場合は避ける）
  const notTooLate = features.price.returnZ > th.minPriceRetZ;

  // 総合判定
  const pass =
    score.p >= th.scoreP &&
    onchainBearish &&
    socialBearish &&
    accelerationCount >= th.minAccelCount &&
    notTooLate;

  return {
    pass,
    diagnostics: {
      onchainBearish,
      socialBearish,
      accelerationCount,
      notTooLate,
      scoreP: score.p
    }
  };
}

// ===============================
// トレンド転換検出エンジン
// ===============================

class TrendReversalDetector {
  constructor(opts = {}) {
    // デフォルト設定（80%勝率目標）
    this.config = {
      // リード/ラグ推定設定
      leadLagRecalcInterval: opts.leadLagRecalcInterval || 30, // 30ポイントごとに再計算
      maxLagSteps: opts.maxLagSteps || 30, // 最大30ステップ（30時間）

      // 重み（オンチェーン重視）
      weights: Object.assign({
        netflowZ: 0.55, netflowT: 0.70,
        mpiZ: 0.45, mpiT: 0.60,
        nuplZ: 0.35, nuplT: 0.40,
        soprEx: 0.55,
        whaleBiasZ: 0.60, whaleBiasT: 0.70,
        retailFomoZ: 0.45, retailFomoT: 0.55,
        newsImpactZ: 0.70, newsImpactT: 0.30
      }, opts.weights || {}),

      // 閾値（厳格に設定）
      th: Object.assign({
        scoreP: 0.86, // 86%以上の確率でSELL/SHORT
        netflowZ: 1.2, netflowTrend: 0.05,
        mpiZ: 1.0, mpiTrend: 0.04,
        nuplZ: 1.0, nuplTrend: 0.02,
        whaleBiasZ: 1.0, whaleBiasTrend: 0.04,
        retailFomoZ: 1.0, retailFomoTrend: 0.04,
        newsImpactZ: 1.2,
        accel: 0.03, // 加速閾値
        minAccelCount: 2, // 最低2つの指標が加速
        minPriceRetZ: -2.0 // 価格リターンが-2σ以下は避ける（遅すぎ）
      }, opts.thresholds || {}),

      // クールダウン
      cooldownMs: opts.cooldownMs || 30 * 60 * 1000 // 30分
    };

    this.featureEngine = new FeatureEngine({
      windowSize: opts.windowSize || 240
    });

    this.lastSignalAt = 0;
    this.pointsSinceLagCalc = 0;

    // リード/ラグ推定用の時系列
    this.series = {
      netflow: [],
      mpi: [],
      nupl: [],
      sopr: [],
      whaleBias: [],
      retailFomo: [],
      newsImpact: [],
      priceReturn: []
    };

    // 推定されたラグ
    this.lags = {
      netflow: 0,
      mpi: 0,
      nupl: 0,
      sopr: 0,
      whaleBias: 0,
      retailFomo: 0,
      newsImpact: 0
    };
  }

  /**
   * データポイントを処理
   * @param {Object} point - {t, price, netflow, mpi, nupl, sopr, whaleBias, retailFomo, newsImpact}
   * @returns {Object|null} シグナルまたはnull
   */
  process(point) {
    // 特徴量エンジンを更新
    this.featureEngine.update(point);

    // リード/ラグ推定用の時系列を更新
    const features = this.featureEngine.getFeatures();
    const metrics = ['netflow', 'mpi', 'nupl', 'sopr', 'whaleBias', 'retailFomo', 'newsImpact'];
    
    metrics.forEach(key => {
      rollingWindowPush(this.series[key], features[key].z, 600);
    });
    rollingWindowPush(this.series.priceReturn, features.price.returnZ, 600);

    // リード/ラグを再計算
    this.pointsSinceLagCalc++;
    if (this.pointsSinceLagCalc >= this.config.leadLagRecalcInterval) {
      this.pointsSinceLagCalc = 0;
      this.recalculateLags();
    }

    // ラグ補正された特徴量を取得
    const compensatedFeatures = this.getLagCompensatedFeatures(features);

    // スコア計算
    const score = computeBearScore(compensatedFeatures, this.config.weights);

    // ゲーティング
    const gate = shouldFireSellShort(compensatedFeatures, score, this.config);

    // クールダウンチェック
    const canSignal = (Date.now() - this.lastSignalAt) > this.config.cooldownMs;

    if (gate.pass && canSignal) {
      this.lastSignalAt = Date.now();
      return {
        timestamp: point.t || Date.now(),
        signal: 'NONE', // BUY/SELLシグナルは完全削除
        confidence: score.p,
        scoreLinear: score.linear,
        lags: Object.assign({}, this.lags),
        diagnostics: gate.diagnostics,
        features: compensatedFeatures
      };
    }

    return null;
  }

  /**
   * リード/ラグを再計算
   */
  recalculateLags() {
    const priceReturn = this.series.priceReturn;
    if (priceReturn.length < 60) return;

    const metrics = ['netflow', 'mpi', 'nupl', 'sopr', 'whaleBias', 'retailFomo', 'newsImpact'];

    for (const key of metrics) {
      const featureSeries = this.series[key];
      const { bestLag, bestCorr } = estimateLeadLag(featureSeries, priceReturn, this.config.maxLagSteps);

      // 相関が低い場合はラグなし
      if (Math.abs(bestCorr) < 0.12) {
        this.lags[key] = 0;
      } else {
        this.lags[key] = clamp(bestLag, -this.config.maxLagSteps, this.config.maxLagSteps);
      }
    }
  }

  /**
   * ラグ補正された特徴量を取得
   * @param {Object} features - 元の特徴量
   * @returns {Object} 補正された特徴量
   */
  getLagCompensatedFeatures(features) {
    const compensated = JSON.parse(JSON.stringify(features));
    const metrics = ['netflow', 'mpi', 'nupl', 'sopr', 'whaleBias', 'retailFomo', 'newsImpact'];

    for (const key of metrics) {
      const lag = this.lags[key] || 0;
      const series = this.series[key];

      if (series.length < 5) continue;

      // リード（lag > 0）の場合は強調、ラグ（lag < 0）の場合は減衰
      const leadBoost = lag > 0
        ? (1 + Math.min(0.35, lag / this.config.maxLagSteps))
        : 1;
      const lagPenalty = lag < 0
        ? (1 - Math.min(0.35, Math.abs(lag) / this.config.maxLagSteps))
        : 1;
      const multiplier = leadBoost * lagPenalty;

      compensated[key].trend *= multiplier;
      compensated[key].z *= multiplier;
      compensated[key].lagSteps = lag;
    }

    return compensated;
  }
}

module.exports = {
  TrendReversalDetector,
  FeatureEngine,
  computeBearScore,
  shouldFireSellShort,
  estimateLeadLag,
  robustZ,
  median,
  mad
};
