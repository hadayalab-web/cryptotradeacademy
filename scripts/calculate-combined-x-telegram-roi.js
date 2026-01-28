// scripts/calculate-combined-x-telegram-roi.js
// X API + Telegramの統合ROI分析

require('dotenv').config({ path: '.env' });

const { calculateXROI } = require('./calculate-x-roi');
const { calculateTelegramROI } = require('./calculate-telegram-roi');

/**
 * X API + Telegramの統合ROI分析
 */
async function calculateCombinedROI() {
  console.log('='.repeat(80));
  console.log('🚀 X API + Telegram統合戦略のROI分析');
  console.log('='.repeat(80));
  console.log('');

  // X APIとTelegramのROIを取得
  const xRoi = await calculateXROI();
  const telegramRoi = await calculateTelegramROI();

  console.log('📊 統合戦略のサマリー:');
  console.log('');
  
  // 統合指標
  // X APIのエンゲージメント数は daily.engagements（数値）から取得
  const xDailyEngagements = typeof xRoi.daily?.engagements === 'number' 
    ? xRoi.daily.engagements 
    : (xRoi.daily?.engagements?.avg || xRoi.daily?.engagements?.excellent || 0);
  // Telegramのエンゲージメント数は daily.engagements.average から取得
  const telegramDailyEngagements = telegramRoi.daily?.engagements?.average || telegramRoi.daily?.engagements?.avg || 0;
  
  const combinedDailyPosts = (xRoi.daily?.posts || 0) + (telegramRoi.daily?.posts || 0);
  const combinedDailyCost = (xRoi.daily?.cost || 0) + (telegramRoi.daily?.cost || 0);
  const combinedDailyEngagements = xDailyEngagements + telegramDailyEngagements;
  
  const combinedMonthlyPosts = (xRoi.monthly?.posts || 0) + (telegramRoi.monthly?.posts || 0);
  const combinedMonthlyCost = (xRoi.monthly?.cost || 0) + (telegramRoi.monthly?.cost || 0);
  const xMonthlyEngagements = typeof xRoi.monthly?.engagements === 'number'
    ? xRoi.monthly.engagements
    : (xRoi.monthly?.engagements?.avg || xRoi.monthly?.engagements?.excellent || 0);
  const telegramMonthlyEngagements = telegramRoi.monthly?.engagements?.average || telegramRoi.monthly?.engagements?.avg || 0;
  const combinedMonthlyEngagements = xMonthlyEngagements + telegramMonthlyEngagements;
  
  console.log('  24時間:');
  console.log(`    投稿数: ${combinedDailyPosts.toLocaleString()}投稿/日`);
  console.log(`      - X API: ${xRoi.daily.posts}投稿/日`);
  console.log(`      - Telegram: ${telegramRoi.daily.posts}投稿/日`);
  console.log(`    エンゲージメント数: ${combinedDailyEngagements.toLocaleString()}エンゲージメント/日`);
  console.log(`      - X API: ${xDailyEngagements.toLocaleString()}エンゲージメント/日`);
  console.log(`      - Telegram: ${telegramDailyEngagements.toLocaleString()}エンゲージメント/日`);
  console.log(`    コスト: $${combinedDailyCost.toFixed(2)}/日`);
  console.log(`      - X API: $${xRoi.daily.cost.toFixed(2)}/日`);
  console.log(`      - Telegram: $${telegramRoi.daily.cost.toFixed(2)}/日（無料）`);
  console.log('');
  
  console.log('  月次（30日）:');
  console.log(`    投稿数: ${combinedMonthlyPosts.toLocaleString()}投稿/月`);
  console.log(`    エンゲージメント数: ${combinedMonthlyEngagements.toLocaleString()}エンゲージメント/月`);
  console.log(`    コスト: $${combinedMonthlyCost.toFixed(2)}/月`);
  console.log('');

  // 統合コスト効率
  const combinedCostPerEngagement = combinedDailyCost / combinedDailyEngagements;
  
  console.log('💎 統合コスト効率:');
  console.log('');
  console.log(`    1エンゲージメントあたりのコスト: $${combinedCostPerEngagement.toFixed(8)}`);
  console.log(`    1投稿あたりのコスト: $${(combinedDailyCost / combinedDailyPosts).toFixed(6)}`);
  console.log(`    1投稿あたりのエンゲージメント数: ${(combinedDailyEngagements / combinedDailyPosts).toFixed(2)}エンゲージメント`);
  console.log('');

  // X APIとの比較（統合戦略の優位性）
  console.log('🔥 統合戦略の優位性:');
  console.log('');
  const xDailyCost = xRoi.daily?.cost || 0;
  const xCostPerEngagement = xDailyCost > 0 && xDailyEngagements > 0 ? xDailyCost / xDailyEngagements : 0;
  
  console.log(`    X API単独:`);
  console.log(`      コスト: $${xDailyCost.toFixed(2)}/日`);
  console.log(`      エンゲージメント数: ${xDailyEngagements.toLocaleString()}エンゲージメント/日`);
  console.log(`      1エンゲージメントあたりのコスト: $${xCostPerEngagement.toFixed(8)}`);
  console.log('');
  console.log(`    X API + Telegram統合:`);
  const costIncreasePercent = xDailyCost > 0 ? ((combinedDailyCost / xDailyCost - 1) * 100).toFixed(1) : '0.0';
  const engagementIncreasePercent = xDailyEngagements > 0 ? ((combinedDailyEngagements / xDailyEngagements - 1) * 100).toFixed(1) : '0.0';
  const costEfficiencyChangePercent = xCostPerEngagement > 0 ? ((combinedCostPerEngagement / xCostPerEngagement - 1) * 100).toFixed(1) : '0.0';
  console.log(`      コスト: $${combinedDailyCost.toFixed(2)}/日（+${costIncreasePercent}%）`);
  console.log(`      エンゲージメント数: ${combinedDailyEngagements.toLocaleString()}エンゲージメント/日（+${engagementIncreasePercent}%）`);
  console.log(`      1エンゲージメントあたりのコスト: $${combinedCostPerEngagement.toFixed(8)}（${costEfficiencyChangePercent}%）`);
  console.log('');
  console.log(`    💡 統合戦略のメリット:`);
  console.log(`      - エンゲージメント数: +${engagementIncreasePercent}%`);
  console.log(`      - コスト増加: +${costIncreasePercent}%（Telegramは無料のため、X APIのコストのみ）`);
  const isImproved = combinedCostPerEngagement < xCostPerEngagement;
  console.log(`      - コスト効率: 統合により、1エンゲージメントあたりのコストが${costEfficiencyChangePercent}%${isImproved ? '改善' : '悪化'}しました`);
  console.log('');

  // スケーリング分析
  console.log('🚀 統合戦略のスケーリング分析:');
  console.log('');
  
  const scalingScenarios = [
    { multiplier: 2, label: '2倍スケール' },
    { multiplier: 5, label: '5倍スケール' },
    { multiplier: 10, label: '10倍スケール' },
  ];
  
  for (const scenario of scalingScenarios) {
    const scaledXPosts = xRoi.daily.posts * scenario.multiplier;
    const scaledTelegramPosts = telegramRoi.daily.posts * scenario.multiplier;
    const scaledCombinedPosts = scaledXPosts + scaledTelegramPosts;
    const scaledXEngagements = xDailyEngagements * scenario.multiplier;
    const scaledTelegramEngagements = telegramDailyEngagements * scenario.multiplier;
    const scaledCombinedEngagements = scaledXEngagements + scaledTelegramEngagements;
    const scaledXCost = xRoi.daily.cost * scenario.multiplier;
    const scaledTelegramCost = telegramRoi.daily.cost * scenario.multiplier;
    const scaledCombinedCost = scaledXCost + scaledTelegramCost;
    
    console.log(`    ${scenario.label}:`);
    console.log(`      投稿数: ${scaledCombinedPosts.toLocaleString()}投稿/日（X: ${scaledXPosts.toLocaleString()}、TG: ${scaledTelegramPosts.toLocaleString()}）`);
    console.log(`      エンゲージメント数: ${scaledCombinedEngagements.toLocaleString()}エンゲージメント/日（X: ${scaledXEngagements.toLocaleString()}、TG: ${scaledTelegramEngagements.toLocaleString()}）`);
    console.log(`      コスト: $${scaledCombinedCost.toFixed(2)}/日（$${(scaledCombinedCost * 30).toFixed(2)}/月）`);
    console.log(`        - X API: $${scaledXCost.toFixed(2)}/日（$${(scaledXCost * 30).toFixed(2)}/月）`);
    console.log(`        - Telegram: $${scaledTelegramCost.toFixed(2)}/日（$${(scaledTelegramCost * 30).toFixed(2)}/月）- 無料`);
    console.log('');
  }

  console.log('='.repeat(80));
  
  return {
    daily: {
      posts: combinedDailyPosts,
      engagements: combinedDailyEngagements,
      cost: combinedDailyCost,
      costPerEngagement: combinedCostPerEngagement,
      xApi: {
        posts: xRoi.daily?.posts || 0,
        engagements: xDailyEngagements,
        cost: xRoi.daily?.cost || 0,
      },
      telegram: {
        posts: telegramRoi.daily?.posts || 0,
        engagements: telegramDailyEngagements,
        cost: telegramRoi.daily?.cost || 0,
      },
    },
    monthly: {
      posts: combinedMonthlyPosts,
      engagements: combinedMonthlyEngagements,
      cost: combinedMonthlyCost,
    },
  };
}

/**
 * メイン処理
 */
async function main() {
  try {
    const report = await calculateCombinedROI();
    
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

module.exports = { calculateCombinedROI };
