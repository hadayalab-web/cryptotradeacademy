// scripts/backtest/analyze_win_loss_patterns.js
// 勝ちパターンと負けパターンの詳細分析

const fs = require('fs');
const path = require('path');

const ANALYSIS_FILE = path.join(__dirname, '..', '..', 'data', 'divergence_patterns_analysis.json');

function analyzeWinLossPatterns() {
  console.log(`\n🔍 勝ちパターンと負けパターンの詳細分析...`);
  
  if (!fs.existsSync(ANALYSIS_FILE)) {
    console.error(`❌ 分析結果ファイルが見つかりません: ${ANALYSIS_FILE}`);
    console.log(`💡 まず 'npm run analyze:divergence:180' を実行してください。`);
    process.exit(1);
  }
  
  const analysis = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf8'));
  const patterns = analysis.patterns || [];
  
  const wins = patterns.filter((p) => p.isWin);
  const losses = patterns.filter((p) => p.isLoss);
  
  console.log(`\n📊 基本統計:`);
  console.log(`  勝ち: ${wins.length}件`);
  console.log(`  負け: ${losses.length}件`);
  
  // 各指標の詳細分析
  const analyzeDetailed = (name, getValue) => {
    const winValues = wins.map(getValue).sort((a, b) => a - b);
    const lossValues = losses.map(getValue).sort((a, b) => a - b);
    
    const winQ1 = winValues[Math.floor(winValues.length * 0.25)];
    const winMedian = winValues[Math.floor(winValues.length * 0.5)];
    const winQ3 = winValues[Math.floor(winValues.length * 0.75)];
    const winMin = winValues[0];
    const winMax = winValues[winValues.length - 1];
    
    const lossQ1 = lossValues[Math.floor(lossValues.length * 0.25)];
    const lossMedian = lossValues[Math.floor(lossValues.length * 0.5)];
    const lossQ3 = lossValues[Math.floor(lossValues.length * 0.75)];
    const lossMin = lossValues[0];
    const lossMax = lossValues[lossValues.length - 1];
    
    // 80%勝率を達成するための閾値（勝ちパターンの75%タイルを基準）
    const optimalThreshold = winQ3;
    
    return {
      name,
      win: { min: winMin, q1: winQ1, median: winMedian, q3: winQ3, max: winMax },
      loss: { min: lossMin, q1: lossQ1, median: lossMedian, q3: lossQ3, max: lossMax },
      optimalThreshold,
      separation: winMedian - lossMedian,
    };
  };
  
  const metrics = [
    analyzeDetailed('onchainScore', (p) => p.divergence.onchainScore),
    analyzeDetailed('socialScore', (p) => p.divergence.socialScore),
    analyzeDetailed('exchangeNetflow', (p) => p.onchain.inflow),
    analyzeDetailed('minerMPI', (p) => p.onchain.mpi),
    analyzeDetailed('retailFomo', (p) => p.social.retailFomo),
    analyzeDetailed('whaleBias', (p) => p.social.whaleBias),
    analyzeDetailed('priceChange24h', (p) => p.change24h),
    analyzeDetailed('multipleDivergences', (p) => p.divergence.multipleDivergences),
  ];
  
  console.log(`\n📊 詳細分析:`);
  metrics.forEach((m) => {
    console.log(`\n  ${m.name}:`);
    console.log(`    勝ち: min=${m.win.min.toFixed(2)}, Q1=${m.win.q1.toFixed(2)}, median=${m.win.median.toFixed(2)}, Q3=${m.win.q3.toFixed(2)}, max=${m.win.max.toFixed(2)}`);
    console.log(`    負け: min=${m.loss.min.toFixed(2)}, Q1=${m.loss.q1.toFixed(2)}, median=${m.loss.median.toFixed(2)}, Q3=${m.loss.q3.toFixed(2)}, max=${m.loss.max.toFixed(2)}`);
    console.log(`    分離度: ${m.separation.toFixed(2)}`);
    console.log(`    最適閾値（勝ちQ3）: ${m.optimalThreshold.toFixed(2)}`);
  });
  
  // 80%勝率を達成するための複合条件を提案
  console.log(`\n🎯 80%勝率を達成するための複合条件提案:`);
  
  const onchainMetric = metrics.find((m) => m.name === 'onchainScore');
  const socialMetric = metrics.find((m) => m.name === 'socialScore');
  const netflowMetric = metrics.find((m) => m.name === 'exchangeNetflow');
  const mpiMetric = metrics.find((m) => m.name === 'minerMPI');
  const fomoMetric = metrics.find((m) => m.name === 'retailFomo');
  const whaleMetric = metrics.find((m) => m.name === 'whaleBias');
  const priceMetric = metrics.find((m) => m.name === 'priceChange24h');
  const divMetric = metrics.find((m) => m.name === 'multipleDivergences');
  
  // 勝ちパターンの75%タイルを基準に条件を設定
  const optimalConditions = {
    onchainScore: onchainMetric.win.q3,
    socialScore: socialMetric.win.q3,
    exchangeNetflow: { min: netflowMetric.win.q1, max: netflowMetric.win.q3 },
    minerMPI: mpiMetric.win.q3,
    retailFomo: fomoMetric.win.q1,
    whaleBias: whaleMetric.win.q3,
    priceChange24h: { min: priceMetric.win.q1, max: priceMetric.win.q3 },
    multipleDivergences: divMetric.win.q1,
  };
  
  console.log(`  onchainScore < ${optimalConditions.onchainScore.toFixed(2)}`);
  console.log(`  socialScore < ${optimalConditions.socialScore.toFixed(2)}`);
  console.log(`  exchangeNetflow: ${optimalConditions.exchangeNetflow.min.toFixed(0)} ~ ${optimalConditions.exchangeNetflow.max.toFixed(0)}`);
  console.log(`  minerMPI < ${optimalConditions.minerMPI.toFixed(2)}`);
  console.log(`  retailFomo >= ${optimalConditions.retailFomo.toFixed(2)}`);
  console.log(`  whaleBias <= ${optimalConditions.whaleBias.toFixed(2)}`);
  console.log(`  priceChange24h: ${optimalConditions.priceChange24h.min.toFixed(2)} ~ ${optimalConditions.priceChange24h.max.toFixed(2)}`);
  console.log(`  multipleDivergences >= ${optimalConditions.multipleDivergences}`);
  
  // 最適化された条件で再計算
  console.log(`\n🔍 最適化された条件で再計算中...`);
  
  let optimizedWins = 0;
  let optimizedLosses = 0;
  
  patterns.forEach((p) => {
    const meetsOptimized = 
      p.divergence.onchainScore < optimalConditions.onchainScore &&
      p.divergence.socialScore < optimalConditions.socialScore &&
      p.onchain.inflow >= optimalConditions.exchangeNetflow.min && 
      p.onchain.inflow <= optimalConditions.exchangeNetflow.max &&
      p.onchain.mpi < optimalConditions.minerMPI &&
      p.social.retailFomo >= optimalConditions.retailFomo &&
      p.social.whaleBias <= optimalConditions.whaleBias &&
      p.change24h >= optimalConditions.priceChange24h.min && 
      p.change24h <= optimalConditions.priceChange24h.max &&
      p.divergence.multipleDivergences >= optimalConditions.multipleDivergences;
    
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
    console.log(`\n✅ 80%勝率を達成！`);
  } else {
    console.log(`\n⚠️ 80%勝率を達成できませんでした。`);
    console.log(`💡 より厳格な条件が必要です。`);
  }
  
  // 結果を保存
  const result = {
    analysisDate: new Date().toISOString(),
    metrics,
    optimalConditions,
    optimizedResults: {
      total: optimizedTotal,
      wins: optimizedWins,
      losses: optimizedLosses,
      winRate: optimizedWinRate,
    },
  };
  
  const outputFile = path.join(__dirname, '..', '..', 'data', 'win_loss_patterns_analysis.json');
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.log(`\n💾 分析結果を保存: ${outputFile}`);
  
  return result;
}

if (require.main === module) {
  try {
    analyzeWinLossPatterns();
    console.log(`\n✅ 分析完了`);
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ エラー:`, error);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = { analyzeWinLossPatterns };
