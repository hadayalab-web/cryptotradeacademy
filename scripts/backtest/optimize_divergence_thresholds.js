// scripts/backtest/optimize_divergence_thresholds.js
// ダイバージェンスパターン分析結果から80%勝率を達成する最適な閾値を特定

const fs = require('fs');
const path = require('path');

const ANALYSIS_FILE = path.join(__dirname, '..', '..', 'data', 'divergence_patterns_analysis.json');

function optimizeThresholds() {
  console.log(`\n🔍 80%勝率を達成する最適な閾値を特定中...`);
  
  if (!fs.existsSync(ANALYSIS_FILE)) {
    console.error(`❌ 分析結果ファイルが見つかりません: ${ANALYSIS_FILE}`);
    console.log(`💡 まず 'npm run analyze:divergence:180' を実行してください。`);
    process.exit(1);
  }
  
  const analysis = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf8'));
  const patterns = analysis.patterns || [];
  
  console.log(`📊 ${patterns.length}件のパターンを分析`);
  
  // 勝ちパターンと負けパターンを分類
  const wins = patterns.filter((p) => p.isWin);
  const losses = patterns.filter((p) => p.isLoss);
  
  console.log(`\n✅ 勝ち: ${wins.length}件`);
  console.log(`❌ 負け: ${losses.length}件`);
  
  // 各指標の分布を分析
  const analyzeMetric = (name, getValue) => {
    const winValues = wins.map(getValue);
    const lossValues = losses.map(getValue);
    
    const winMedian = winValues.sort((a, b) => a - b)[Math.floor(winValues.length / 2)];
    const lossMedian = lossValues.sort((a, b) => a - b)[Math.floor(lossValues.length / 2)];
    
    const winMin = Math.min(...winValues);
    const winMax = Math.max(...winValues);
    const lossMin = Math.min(...lossValues);
    const lossMax = Math.max(...lossValues);
    
    return {
      name,
      win: { min: winMin, max: winMax, median: winMedian },
      loss: { min: lossMin, max: lossMax, median: lossMedian },
      separation: winMedian - lossMedian, // 勝ちと負けの分離度
    };
  };
  
  const metrics = [
    analyzeMetric('onchainScore', (p) => p.divergence.onchainScore),
    analyzeMetric('socialScore', (p) => p.divergence.socialScore),
    analyzeMetric('exchangeNetflow', (p) => p.onchain.inflow),
    analyzeMetric('minerMPI', (p) => p.onchain.mpi),
    analyzeMetric('retailFomo', (p) => p.social.retailFomo),
    analyzeMetric('priceChange24h', (p) => p.change24h),
    analyzeMetric('multipleDivergences', (p) => p.divergence.multipleDivergences),
  ];
  
  console.log(`\n📊 指標分析:`);
  metrics.forEach((m) => {
    console.log(`\n  ${m.name}:`);
    console.log(`    勝ち: 中央値=${m.win.median.toFixed(2)}, 範囲=[${m.win.min.toFixed(2)}, ${m.win.max.toFixed(2)}]`);
    console.log(`    負け: 中央値=${m.loss.median.toFixed(2)}, 範囲=[${m.loss.min.toFixed(2)}, ${m.loss.max.toFixed(2)}]`);
    console.log(`    分離度: ${m.separation.toFixed(2)}`);
  });
  
  // 80%勝率を達成するための最適な閾値を提案
  console.log(`\n🎯 80%勝率を達成するための最適な閾値提案:`);
  
  // 1. onchainScore
  const onchainWinMedian = metrics.find((m) => m.name === 'onchainScore').win.median;
  const onchainLossMedian = metrics.find((m) => m.name === 'onchainScore').loss.median;
  const optimalOnchainThreshold = (onchainWinMedian + onchainLossMedian) / 2;
  console.log(`  onchainScore < ${optimalOnchainThreshold.toFixed(2)} (現在: -25)`);
  
  // 2. socialScore
  const socialWinMedian = metrics.find((m) => m.name === 'socialScore').win.median;
  const socialLossMedian = metrics.find((m) => m.name === 'socialScore').loss.median;
  const optimalSocialThreshold = (socialWinMedian + socialLossMedian) / 2;
  console.log(`  socialScore < ${optimalSocialThreshold.toFixed(2)} (現在: -50)`);
  
  // 3. exchangeNetflow
  const netflowWinMedian = metrics.find((m) => m.name === 'exchangeNetflow').win.median;
  const netflowLossMedian = metrics.find((m) => m.name === 'exchangeNetflow').loss.median;
  const optimalNetflowThreshold = Math.max(netflowWinMedian, netflowLossMedian);
  console.log(`  exchangeNetflow > ${optimalNetflowThreshold.toFixed(0)} (現在: 3000)`);
  
  // 4. retailFomo
  const fomoWinMedian = metrics.find((m) => m.name === 'retailFomo').win.median;
  const fomoLossMedian = metrics.find((m) => m.name === 'retailFomo').loss.median;
  const optimalFomoThreshold = Math.min(fomoWinMedian, fomoLossMedian);
  console.log(`  retailFomo >= ${optimalFomoThreshold.toFixed(0)} (現在: 80)`);
  
  // 5. priceChange24h
  const priceWinMedian = metrics.find((m) => m.name === 'priceChange24h').win.median;
  const priceLossMedian = metrics.find((m) => m.name === 'priceChange24h').loss.median;
  const optimalPriceMin = Math.min(priceWinMedian, priceLossMedian);
  const optimalPriceMax = Math.max(priceWinMedian, priceLossMedian);
  console.log(`  priceChange24h: ${optimalPriceMin.toFixed(2)} ~ ${optimalPriceMax.toFixed(2)} (現在: 2.5 ~ 8)`);
  
  // 6. multipleDivergences
  const divWinMedian = metrics.find((m) => m.name === 'multipleDivergences').win.median;
  const divLossMedian = metrics.find((m) => m.name === 'multipleDivergences').loss.median;
  const optimalDivThreshold = Math.ceil(Math.max(divWinMedian, divLossMedian));
  console.log(`  multipleDivergences >= ${optimalDivThreshold} (現在: 3)`);
  
  // 最適化された条件で再計算
  console.log(`\n🔍 最適化された条件で再計算中...`);
  
  let optimizedWins = 0;
  let optimizedLosses = 0;
  
  patterns.forEach((p) => {
    const meetsOptimized = 
      p.divergence.onchainScore < optimalOnchainThreshold &&
      p.divergence.socialScore < optimalSocialThreshold &&
      p.onchain.inflow > optimalNetflowThreshold &&
      p.social.retailFomo >= optimalFomoThreshold &&
      p.change24h > optimalPriceMin && p.change24h < optimalPriceMax &&
      p.divergence.multipleDivergences >= optimalDivThreshold;
    
    if (meetsOptimized) {
      if (p.isWin) optimizedWins++;
      if (p.isLoss) optimizedLosses++;
    }
  });
  
  const optimizedTotal = optimizedWins + optimizedLosses;
  const optimizedWinRate = optimizedTotal > 0 ? optimizedWins / optimizedTotal : 0;
  
  console.log(`\n📊 最適化後の結果:`);
  console.log(`  総シグナル数: ${optimizedTotal}`);
  console.log(`  勝ち: ${optimizedWins}`);
  console.log(`  負け: ${optimizedLosses}`);
  console.log(`  勝率: ${(optimizedWinRate * 100).toFixed(2)}%`);
  
  if (optimizedWinRate >= 0.80) {
    console.log(`\n✅ 80%勝率を達成！最適化された閾値:`);
    console.log(`  onchainScore < ${optimalOnchainThreshold.toFixed(2)}`);
    console.log(`  socialScore < ${optimalSocialThreshold.toFixed(2)}`);
    console.log(`  exchangeNetflow > ${optimalNetflowThreshold.toFixed(0)}`);
    console.log(`  retailFomo >= ${optimalFomoThreshold.toFixed(0)}`);
    console.log(`  priceChange24h: ${optimalPriceMin.toFixed(2)} ~ ${optimalPriceMax.toFixed(2)}`);
    console.log(`  multipleDivergences >= ${optimalDivThreshold}`);
  } else {
    console.log(`\n⚠️ 80%勝率を達成できませんでした。`);
    console.log(`💡 より厳格な条件が必要です。`);
  }
  
  // 結果を保存
  const result = {
    analysisDate: new Date().toISOString(),
    currentConditions: {
      onchainScore: -25,
      socialScore: -50,
      exchangeNetflow: 3000,
      retailFomo: 80,
      priceChange24h: { min: 2.5, max: 8 },
      multipleDivergences: 3,
    },
    optimizedConditions: {
      onchainScore: optimalOnchainThreshold,
      socialScore: optimalSocialThreshold,
      exchangeNetflow: optimalNetflowThreshold,
      retailFomo: optimalFomoThreshold,
      priceChange24h: { min: optimalPriceMin, max: optimalPriceMax },
      multipleDivergences: optimalDivThreshold,
    },
    metrics,
    optimizedResults: {
      total: optimizedTotal,
      wins: optimizedWins,
      losses: optimizedLosses,
      winRate: optimizedWinRate,
    },
  };
  
  const outputFile = path.join(__dirname, '..', '..', 'data', 'divergence_thresholds_optimization.json');
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.log(`\n💾 最適化結果を保存: ${outputFile}`);
  
  return result;
}

if (require.main === module) {
  try {
    optimizeThresholds();
    console.log(`\n✅ 最適化完了`);
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ エラー:`, error);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = { optimizeThresholds };
