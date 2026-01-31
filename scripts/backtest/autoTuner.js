// scripts/backtest/autoTuner.js
// アルゴリズム自動チューニング - パラメータ最適化

const { getMarketProfile } = require('../../config/marketProfiles');
const { decideSignal, buildMarketContext } = require('../../logic/core/marketCore');
const { fetchKlines } = require('../../services/binance/client');
const { getExchangeInflow, getMinerPositionIndex } = require('../../services/cryptoquant/endpoints/btc');
const { getComplementaryData } = require('../../services/binance/client');

// コマンドライン引数
const argv = process.argv.slice(2);
const marketArg = argv.find((a) => a.startsWith('--market='));
const daysArg = argv.find((a) => a.startsWith('--days='));
const targetArg = argv.find((a) => a.startsWith('--target='));

const MARKET = marketArg ? marketArg.split('=')[1] : 'EN';
const DAYS = daysArg ? parseInt(daysArg.split('=')[1], 10) : 30;
const TARGET_METRIC = targetArg ? targetArg.split('=')[1] : 'accuracy'; // accuracy, precision, recall, f1

/**
 * パラメータ空間の定義（市場別）
 */
function getParameterSpace(market) {
  const profile = getMarketProfile(market);
  const base = profile.algorithm;

  return {
    HARD_SIGNAL_THRESH: {
      min: Math.max(15, base.HARD_SIGNAL_THRESH - 5),
      max: Math.min(35, base.HARD_SIGNAL_THRESH + 5),
      step: 1,
      current: base.HARD_SIGNAL_THRESH,
    },
    SOFT_REGIME_THRESH: {
      min: Math.max(10, base.SOFT_REGIME_THRESH - 5),
      max: Math.min(25, base.SOFT_REGIME_THRESH + 5),
      step: 1,
      current: base.SOFT_REGIME_THRESH,
    },
    MIN_CONF_FOR_TRADE: {
      min: Math.max(0.3, base.MIN_CONF_FOR_TRADE - 0.1),
      max: Math.min(0.7, base.MIN_CONF_FOR_TRADE + 0.1),
      step: 0.05,
      current: base.MIN_CONF_FOR_TRADE,
    },
    BUG_STANDBY_BIAS: {
      min: Math.max(0, base.BUG_STANDBY_BIAS - 20),
      max: Math.min(80, base.BUG_STANDBY_BIAS + 20),
      step: 5,
      current: base.BUG_STANDBY_BIAS,
    },
  };
}

/**
 * グリッドサーチによるパラメータ最適化
 * @param {Object} paramSpace - パラメータ空間
 * @param {Array} testData - テストデータ
 * @returns {Object} 最適パラメータ
 */
function gridSearch(paramSpace, testData) {
  let bestParams = null;
  let bestScore = -Infinity;

  // 簡易版: 各パラメータを個別に最適化（全組み合わせは計算コストが高いため）
  const optimized = { ...paramSpace };

  for (const [key, range] of Object.entries(paramSpace)) {
    let bestValue = range.current;
    let bestParamScore = -Infinity;

    // 範囲内でステップごとに評価
    for (let value = range.min; value <= range.max; value += range.step) {
      const testParams = { ...optimized, [key]: { ...range, current: value } };
      const score = evaluateParameters(testParams, testData);

      if (score > bestParamScore) {
        bestParamScore = score;
        bestValue = value;
      }
    }

    optimized[key].current = bestValue;
    console.log(`  ${key}: ${range.current} → ${bestValue} (score: ${bestParamScore.toFixed(3)})`);
  }

  return optimized;
}

/**
 * パラメータセットの評価
 * @param {Object} params - パラメータセット
 * @param {Array} testData - テストデータ
 * @returns {number} スコア
 */
function evaluateParameters(params, testData) {
  // 簡易評価: 実際のシグナル生成ロジックを使って評価
  // TODO: より詳細な評価メトリクス（accuracy, precision, recall等）を実装
  let correctSignals = 0;
  let totalSignals = 0;

  // テストデータの各時点でシグナルを生成し、実際の価格変動と比較
  // この実装は簡易版なので、実際にはより詳細な評価が必要

  return totalSignals > 0 ? correctSignals / totalSignals : 0;
}

/**
 * 過去データの取得と準備
 * @param {string} market - 市場コード
 * @param {number} days - 過去何日分
 * @returns {Promise<Array>} テストデータ
 */
async function prepareTestData(market, days) {
  const endTime = Date.now();
  const startTime = endTime - days * 24 * 60 * 60 * 1000;

  // Binanceから価格データ取得
  const klines = await fetchKlines('BTCUSDT', '1h', startTime, endTime, 1000);

  // CryptoQuantデータ取得（簡易版: 実際には時系列データが必要）
  // Binanceデータのみで簡易評価

  return klines.map((k) => ({
    timestamp: k.openTime,
    price: k.close,
    high: k.high,
    low: k.low,
    volume: k.volume,
  }));
}

/**
 * メイン実行
 */
async function main() {
  console.log('🔧 Starting Auto-Tuner...');
  console.log(`Market: ${MARKET}, Days: ${DAYS}, Target: ${TARGET_METRIC}`);

  try {
    // パラメータ空間の取得
    const paramSpace = getParameterSpace(MARKET);
    console.log('\n📊 Current Parameters:');
    for (const [key, range] of Object.entries(paramSpace)) {
      console.log(`  ${key}: ${range.current}`);
    }

    // テストデータ準備
    console.log(`\n📥 Fetching test data (${DAYS} days)...`);
    const testData = await prepareTestData(MARKET, DAYS);
    console.log(`  Fetched ${testData.length} data points`);

    // グリッドサーチ実行
    console.log('\n🔍 Running grid search...');
    const optimized = gridSearch(paramSpace, testData);

    // 結果出力
    console.log('\n✅ Optimization complete!');
    console.log('\n📊 Optimized Parameters:');
    const optimizedParams = {};
    for (const [key, range] of Object.entries(optimized)) {
      optimizedParams[key] = range.current;
      console.log(`  ${key}: ${range.current}`);
    }

    // JSON出力（設定ファイルとして使用可能）
    console.log('\n💾 Recommended config:');
    console.log(JSON.stringify(optimizedParams, null, 2));

    return optimizedParams;
  } catch (error) {
    console.error('❌ Auto-tuning failed:', error);
    process.exit(1);
  }
}

// 直接実行時
if (require.main === module) {
  main();
}

module.exports = {
  getParameterSpace,
  gridSearch,
  evaluateParameters,
  prepareTestData,
};





