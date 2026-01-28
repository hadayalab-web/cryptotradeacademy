// scripts/calculate-x-roi.js
// X投稿戦略のROI分析

require('dotenv').config({ path: '.env' });

const {
  calculateDailyPostCount,
  calculateDailyImpressionExpectations,
} = require('./calculate-daily-x-expectations');
const {
  getActualEngagementRate,
  calculateEngagementCount,
} = require('./calculate-final-24h-metrics');

/**
 * X投稿戦略のROIを計算
 */
async function calculateXROI() {
  console.log('='.repeat(80));
  console.log('💰 X投稿戦略のROI分析');
  console.log('='.repeat(80));
  console.log('');

  // 投稿数計算
  const { dailyPostsByLang, totalDailyPosts } = calculateDailyPostCount();
  
  // インプレッション数計算
  const {
    impressionExpectationsByLang,
    totalExpectedImpressions,
  } = await calculateDailyImpressionExpectations();
  
  // エンゲージメント数計算（KVの実際のデータを使用）
  const engagementRatesByLang = {};
  let totalWeightedEngagementRate = 0;
  let totalImpressionsForWeight = 0;
  
  for (const [lang, exp] of Object.entries(impressionExpectationsByLang)) {
    const engagementRateInfo = await getActualEngagementRate(lang);
    engagementRatesByLang[lang] = engagementRateInfo;
    totalWeightedEngagementRate += exp.avgImpressions * engagementRateInfo.avg;
    totalImpressionsForWeight += exp.avgImpressions;
  }
  
  const overallAvgEngagementRate = totalImpressionsForWeight > 0 
    ? totalWeightedEngagementRate / totalImpressionsForWeight 
    : 0.015;
  
  const totalEngagements = calculateEngagementCount(totalExpectedImpressions, overallAvgEngagementRate);
  
  // コスト計算
  const postCostPerUnit = 0.005; // $0.005 per post
  const dailyCost = totalDailyPosts * postCostPerUnit;
  const monthlyCost = dailyCost * 30;
  
  // 月次エンゲージメント数
  const monthlyImpressions = totalExpectedImpressions * 30;
  const monthlyEngagements = totalEngagements * 30;
  
  console.log('📊 基本指標:');
  console.log('');
  console.log(`  24時間:`);
  console.log(`    投稿数: ${totalDailyPosts}投稿`);
  console.log(`    インプレッション数: ${totalExpectedImpressions.toLocaleString()}インプレッション`);
  console.log(`    エンゲージメント数: ${totalEngagements.toLocaleString()}エンゲージメント`);
  console.log(`    コスト: $${dailyCost.toFixed(2)}`);
  console.log('');
  console.log(`  月次（30日）:`);
  console.log(`    投稿数: ${(totalDailyPosts * 30).toLocaleString()}投稿`);
  console.log(`    インプレッション数: ${monthlyImpressions.toLocaleString()}インプレッション`);
  console.log(`    エンゲージメント数: ${monthlyEngagements.toLocaleString()}エンゲージメント`);
  console.log(`    コスト: $${monthlyCost.toFixed(2)}`);
  console.log('');

  // ROI計算
  console.log('💎 ROI分析:');
  console.log('');
  
  // 1投稿あたりのコスト
  const costPerPost = postCostPerUnit;
  
  // 1投稿あたりのインプレッション数
  const impressionsPerPost = totalExpectedImpressions / totalDailyPosts;
  
  // 1投稿あたりのエンゲージメント数
  const engagementsPerPost = totalEngagements / totalDailyPosts;
  
  // 1インプレッションあたりのコスト
  const costPerImpression = dailyCost / totalExpectedImpressions;
  
  // 1エンゲージメントあたりのコスト
  const costPerEngagement = dailyCost / totalEngagements;
  
  console.log('  📈 1投稿あたりのパフォーマンス:');
  console.log(`    コスト: $${costPerPost.toFixed(4)}`);
  console.log(`    インプレッション数: ${impressionsPerPost.toLocaleString()}インプレッション`);
  console.log(`    エンゲージメント数: ${engagementsPerPost.toLocaleString()}エンゲージメント`);
  console.log(`    エンゲージメント率: ${(overallAvgEngagementRate * 100).toFixed(2)}%`);
  console.log('');
  
  console.log('  💰 コスト効率:');
  console.log(`    1インプレッションあたりのコスト: $${costPerImpression.toFixed(8)}（${(costPerImpression * 1000000).toFixed(2)}セント/100万インプレッション）`);
  console.log(`    1エンゲージメントあたりのコスト: $${costPerEngagement.toFixed(8)}（${(costPerEngagement * 1000000).toFixed(2)}セント/100万エンゲージメント）`);
  console.log('');
  
  // 比較分析
  console.log('  🔥 競合比較（一般的なX広告との比較）:');
  console.log('');
  
  // 一般的なX広告のCPM（Cost Per Mille = 1000インプレッションあたりのコスト）
  const typicalCPM = 5.0; // $5/1000インプレッション = $0.005/インプレッション
  const typicalCostPerImpression = typicalCPM / 1000;
  const typicalDailyCost = totalExpectedImpressions * typicalCostPerImpression;
  const typicalMonthlyCost = typicalDailyCost * 30;
  
  // 一般的なX広告のCPE（Cost Per Engagement）
  const typicalCPE = 0.50; // $0.50/エンゲージメント
  const typicalCostPerEngagement = typicalCPE;
  const typicalDailyCostByEngagement = totalEngagements * typicalCostPerEngagement;
  const typicalMonthlyCostByEngagement = typicalDailyCostByEngagement * 30;
  
  console.log(`    一般的なX広告（CPM $${typicalCPM}/1000インプレッション）:`);
  console.log(`      24時間のコスト: $${typicalDailyCost.toFixed(2)}`);
  console.log(`      月次のコスト: $${typicalMonthlyCost.toFixed(2)}`);
  console.log(`      我々のコストとの差: ${((typicalDailyCost / dailyCost - 1) * 100).toFixed(1)}%高い`);
  console.log('');
  
  console.log(`    一般的なX広告（CPE $${typicalCPE}/エンゲージメント）:`);
  console.log(`      24時間のコスト: $${typicalDailyCostByEngagement.toFixed(2)}`);
  console.log(`      月次のコスト: $${typicalMonthlyCostByEngagement.toFixed(2)}`);
  console.log(`      我々のコストとの差: ${((typicalDailyCostByEngagement / dailyCost - 1) * 100).toFixed(1)}%高い`);
  console.log('');
  
  // コスト削減額
  const dailySavingsByImpression = typicalDailyCost - dailyCost;
  const monthlySavingsByImpression = typicalMonthlyCost - monthlyCost;
  const dailySavingsByEngagement = typicalDailyCostByEngagement - dailyCost;
  const monthlySavingsByEngagement = typicalMonthlyCostByEngagement - monthlyCost;
  
  console.log('  💵 コスト削減効果:');
  console.log(`    インプレッション基準（CPM比較）:`);
  console.log(`      24時間の削減額: $${dailySavingsByImpression.toFixed(2)}`);
  console.log(`      月次の削減額: $${monthlySavingsByImpression.toFixed(2)}`);
  console.log(`      削減率: ${((dailySavingsByImpression / typicalDailyCost) * 100).toFixed(2)}%`);
  console.log('');
  
  console.log(`    エンゲージメント基準（CPE比較）:`);
  console.log(`      24時間の削減額: $${dailySavingsByEngagement.toFixed(2)}`);
  console.log(`      月次の削減額: $${monthlySavingsByEngagement.toFixed(2)}`);
  console.log(`      削減率: ${((dailySavingsByEngagement / typicalDailyCostByEngagement) * 100).toFixed(2)}%`);
  console.log('');
  
  // ROI計算（投資対効果）
  const roiByImpression = ((typicalDailyCost - dailyCost) / dailyCost) * 100;
  const roiByEngagement = ((typicalDailyCostByEngagement - dailyCost) / dailyCost) * 100;
  
  console.log('  📊 ROI（投資対効果）:');
  console.log(`    インプレッション基準: ${roiByImpression.toFixed(1)}%`);
  console.log(`    エンゲージメント基準: ${roiByEngagement.toFixed(1)}%`);
  console.log('');
  
  // 年間の削減額
  const yearlySavingsByImpression = monthlySavingsByImpression * 12;
  const yearlySavingsByEngagement = monthlySavingsByEngagement * 12;
  
  console.log('  📅 年間のコスト削減効果:');
  console.log(`    インプレッション基準: $${yearlySavingsByImpression.toFixed(2)}`);
  console.log(`    エンゲージメント基準: $${yearlySavingsByEngagement.toFixed(2)}`);
  console.log('');
  
  // スケーリング分析
  console.log('  🚀 スケーリング分析:');
  console.log('');
  
  const scalingScenarios = [
    { multiplier: 2, label: '2倍スケール' },
    { multiplier: 5, label: '5倍スケール' },
    { multiplier: 10, label: '10倍スケール' },
  ];
  
  for (const scenario of scalingScenarios) {
    const scaledPosts = totalDailyPosts * scenario.multiplier;
    const scaledImpressions = totalExpectedImpressions * scenario.multiplier;
    const scaledEngagements = totalEngagements * scenario.multiplier;
    const scaledCost = dailyCost * scenario.multiplier;
    const scaledTypicalCost = typicalDailyCostByEngagement * scenario.multiplier;
    const scaledSavings = scaledTypicalCost - scaledCost;
    
    console.log(`    ${scenario.label}:`);
    console.log(`      投稿数: ${scaledPosts.toLocaleString()}投稿/日`);
    console.log(`      エンゲージメント数: ${scaledEngagements.toLocaleString()}エンゲージメント/日`);
    console.log(`      コスト: $${scaledCost.toFixed(2)}/日（$${(scaledCost * 30).toFixed(2)}/月）`);
    console.log(`      一般的なX広告のコスト: $${scaledTypicalCost.toFixed(2)}/日（$${(scaledTypicalCost * 30).toFixed(2)}/月）`);
    console.log(`      削減額: $${scaledSavings.toFixed(2)}/日（$${(scaledSavings * 30).toFixed(2)}/月）`);
    console.log('');
  }
  
  console.log('='.repeat(80));
  
  return {
    daily: {
      posts: totalDailyPosts,
      impressions: totalExpectedImpressions,
      engagements: totalEngagements,
      cost: dailyCost,
      costPerPost,
      costPerImpression,
      costPerEngagement,
      impressionsPerPost,
      engagementsPerPost,
    },
    monthly: {
      posts: totalDailyPosts * 30,
      impressions: monthlyImpressions,
      engagements: monthlyEngagements,
      cost: monthlyCost,
    },
    comparison: {
      typicalCPM,
      typicalCPE,
      typicalDailyCostByImpression: typicalDailyCost,
      typicalDailyCostByEngagement: typicalDailyCostByEngagement,
      dailySavingsByImpression,
      dailySavingsByEngagement,
      monthlySavingsByImpression,
      monthlySavingsByEngagement,
      yearlySavingsByImpression,
      yearlySavingsByEngagement,
      roiByImpression,
      roiByEngagement,
    },
  };
}

/**
 * メイン処理
 */
async function main() {
  try {
    const report = await calculateXROI();
    
    // JSON形式でも出力（オプション）
    if (process.argv.includes('--json')) {
      console.log('\n📄 JSON形式出力:');
      console.log(JSON.stringify(report, null, 2));
    }
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('致命的なエラー:', error);
    process.exit(1);
  });
}

module.exports = { calculateXROI };
