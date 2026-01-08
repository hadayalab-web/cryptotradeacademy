// scripts/backtest/find_optimal_conditions.js
// 80%勝率を達成する最適な条件を探索

const fs = require('fs');
const path = require('path');

const ANALYSIS_FILE = path.join(__dirname, '..', '..', 'data', 'divergence_patterns_analysis.json');

function findOptimalConditions() {
  console.log(`\n🔍 80%勝率を達成する最適な条件を探索中...`);
  
  if (!fs.existsSync(ANALYSIS_FILE)) {
    console.error(`❌ 分析結果ファイルが見つかりません: ${ANALYSIS_FILE}`);
    process.exit(1);
  }
  
  const analysis = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf8'));
  const patterns = analysis.patterns || [];
  
  const wins = patterns.filter((p) => p.isWin);
  const losses = patterns.filter((p) => p.isLoss);
  
  console.log(`\n📊 基本統計:`);
  console.log(`  勝ち: ${wins.length}件`);
  console.log(`  負け: ${losses.length}件`);
  
  // 各条件の組み合わせを試す
  const testConditions = [];
  
  // onchainScoreの閾値
  const onchainThresholds = [-28.0, -29.0, -30.0, -31.0];
  // socialScoreの閾値
  const socialThresholds = [-50.0, -51.0, -52.0, -53.0];
  // minerMPIの閾値
  const mpiThresholds = [1.5, 1.6, 1.7, 1.8];
  // exchangeNetflowの範囲
  const netflowMins = [2000, 2500, 3000];
  const netflowMaxs = [4000, 4300, 4500];
  // priceChange24hの範囲
  const priceMins = [2.5, 2.8, 3.0];
  const priceMaxs = [6.0, 6.5, 7.0];
  // retailFomoの閾値
  const fomoThresholds = [75, 80, 85];
  // whaleBiasの閾値
  const whaleThresholds = [-0.3, -0.5, -0.7];
  
  console.log(`\n🔍 ${onchainThresholds.length * socialThresholds.length * mpiThresholds.length * netflowMins.length * netflowMaxs.length * priceMins.length * priceMaxs.length * fomoThresholds.length * whaleThresholds.length}通りの条件をテスト中...`);
  
  let bestCondition = null;
  let bestWinRate = 0;
  let bestTotal = 0;
  
  for (const onchainTh of onchainThresholds) {
    for (const socialTh of socialThresholds) {
      for (const mpiTh of mpiThresholds) {
        for (const netflowMin of netflowMins) {
          for (const netflowMax of netflowMaxs) {
            if (netflowMin >= netflowMax) continue;
            for (const priceMin of priceMins) {
              for (const priceMax of priceMaxs) {
                if (priceMin >= priceMax) continue;
                for (const fomoTh of fomoThresholds) {
                  for (const whaleTh of whaleThresholds) {
                    let winsCount = 0;
                    let lossesCount = 0;
                    
                    patterns.forEach((p) => {
                      const meets = 
                        p.divergence.multipleDivergences >= 2 &&
                        p.divergence.onchainScore < onchainTh &&
                        p.divergence.socialScore < socialTh &&
                        p.change24h > priceMin && p.change24h < priceMax &&
                        p.onchain.inflow > netflowMin && p.onchain.inflow < netflowMax &&
                        p.onchain.mpi > 0 && p.onchain.mpi < mpiTh &&
                        p.social.retailFomo >= fomoTh &&
                        p.social.whaleBias <= whaleTh;
                      
                      if (meets) {
                        if (p.isWin) winsCount++;
                        if (p.isLoss) lossesCount++;
                      }
                    });
                    
                    const total = winsCount + lossesCount;
                    if (total > 0) {
                      const winRate = winsCount / total;
                      if (winRate >= 0.80 && total >= 3) {
                        testConditions.push({
                          condition: {
                            onchainScore: onchainTh,
                            socialScore: socialTh,
                            minerMPI: mpiTh,
                            exchangeNetflow: { min: netflowMin, max: netflowMax },
                            priceChange24h: { min: priceMin, max: priceMax },
                            retailFomo: fomoTh,
                            whaleBias: whaleTh,
                          },
                          results: { total, wins: winsCount, losses: lossesCount, winRate },
                        });
                        
                        if (winRate > bestWinRate || (winRate === bestWinRate && total > bestTotal)) {
                          bestWinRate = winRate;
                          bestTotal = total;
                          bestCondition = {
                            condition: {
                              onchainScore: onchainTh,
                              socialScore: socialTh,
                              minerMPI: mpiTh,
                              exchangeNetflow: { min: netflowMin, max: netflowMax },
                              priceChange24h: { min: priceMin, max: priceMax },
                              retailFomo: fomoTh,
                              whaleBias: whaleTh,
                            },
                            results: { total, wins: winsCount, losses: lossesCount, winRate },
                          };
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  console.log(`\n📊 80%勝率を達成する条件: ${testConditions.length}件`);
  
  if (bestCondition) {
    console.log(`\n✅ 最適な条件:`);
    console.log(`  onchainScore < ${bestCondition.condition.onchainScore}`);
    console.log(`  socialScore < ${bestCondition.condition.socialScore}`);
    console.log(`  exchangeNetflow: ${bestCondition.condition.exchangeNetflow.min} ~ ${bestCondition.condition.exchangeNetflow.max}`);
    console.log(`  minerMPI < ${bestCondition.condition.minerMPI}`);
    console.log(`  priceChange24h: ${bestCondition.condition.priceChange24h.min} ~ ${bestCondition.condition.priceChange24h.max}`);
    console.log(`  retailFomo >= ${bestCondition.condition.retailFomo}`);
    console.log(`  whaleBias <= ${bestCondition.condition.whaleBias}`);
    console.log(`\n📊 結果:`);
    console.log(`  総シグナル数: ${bestCondition.results.total}`);
    console.log(`  勝ち: ${bestCondition.results.wins}`);
    console.log(`  負け: ${bestCondition.results.losses}`);
    console.log(`  勝率: ${(bestCondition.results.winRate * 100).toFixed(2)}%`);
  } else {
    console.log(`\n⚠️ 80%勝率を達成する条件が見つかりませんでした。`);
  }
  
  // 結果を保存
  const result = {
    analysisDate: new Date().toISOString(),
    bestCondition,
    allConditions: testConditions.sort((a, b) => b.results.winRate - a.results.winRate).slice(0, 10), // 上位10件
  };
  
  const outputFile = path.join(__dirname, '..', '..', 'data', 'optimal_conditions_search.json');
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.log(`\n💾 探索結果を保存: ${outputFile}`);
  
  return result;
}

if (require.main === module) {
  try {
    findOptimalConditions();
    console.log(`\n✅ 探索完了`);
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ エラー:`, error);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = { findOptimalConditions };
