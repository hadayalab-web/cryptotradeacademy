// scripts/get-x-api-cost-summary.js
// X APIコストサマリーを取得・表示

require('dotenv').config({ path: '.env' });

const { getCostSummary, getDailyCost, getMonthlyCost, getCostForPeriod } = require('../services/x/costTracker');

/**
 * コストサマリーを表示
 */
async function displayCostSummary() {
  console.log('='.repeat(80));
  console.log('💰 X APIコストサマリー');
  console.log('='.repeat(80));
  console.log('');
  
  // 今日のコスト
  const today = new Date();
  const todayCost = await getDailyCost();
  
  console.log('📅 今日のコスト:');
  if (todayCost && todayCost.total > 0) {
    console.log(`  総コスト: $${todayCost.total.toFixed(4)}`);
    console.log(`  投稿数: ${todayCost.postCount || 0}回`);
    console.log(`  操作別内訳:`);
    for (const [operation, count] of Object.entries(todayCost.operations || {})) {
      const cost = count * 0.005; // 投稿は$0.005/回
      console.log(`    - ${operation}: ${count}回 ($${cost.toFixed(4)})`);
    }
  } else {
    console.log('  データなし');
  }
  
  console.log('');
  
  // 今月のコスト
  const thisMonth = new Date();
  const thisMonthKey = thisMonth.toISOString().substring(0, 7);
  const monthlyCost = await getMonthlyCost();
  
  console.log('📅 今月のコスト:');
  if (monthlyCost && monthlyCost.total > 0) {
    console.log(`  総コスト: $${monthlyCost.total.toFixed(4)}`);
    console.log(`  投稿数: ${monthlyCost.postCount || 0}回`);
    console.log(`  操作別内訳:`);
    for (const [operation, count] of Object.entries(monthlyCost.operations || {})) {
      const cost = count * 0.005; // 投稿は$0.005/回
      console.log(`    - ${operation}: ${count}回 ($${cost.toFixed(4)})`);
    }
    
    // 日次内訳（最初の7日分）
    console.log(`\n  日次内訳（直近7日）:`);
    const dailyBreakdown = monthlyCost.dailyBreakdown || {};
    const sortedDays = Object.keys(dailyBreakdown).sort().reverse().slice(0, 7);
    for (const day of sortedDays) {
      const dayCost = dailyBreakdown[day];
      console.log(`    - ${day}: $${dayCost.toFixed(4)}`);
    }
  } else {
    console.log('  データなし');
  }
  
  console.log('');
  
  // 過去7日間のコスト
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const periodCost = await getCostForPeriod(sevenDaysAgo, today);
  
  console.log('📅 過去7日間のコスト:');
  if (periodCost && periodCost.totalCost > 0) {
    console.log(`  総コスト: $${periodCost.totalCost.toFixed(4)}`);
    console.log(`  投稿数: ${periodCost.totalPosts}回`);
    console.log(`  操作別内訳:`);
    for (const [operation, count] of Object.entries(periodCost.operations || {})) {
      const cost = count * 0.005; // 投稿は$0.005/回
      console.log(`    - ${operation}: ${count}回 ($${cost.toFixed(4)})`);
    }
    console.log(`  平均日次コスト: $${(periodCost.totalCost / 7).toFixed(4)}/日`);
  } else {
    console.log('  データなし');
  }
  
  console.log('');
  console.log('='.repeat(80));
  
  return {
    today: todayCost,
    monthly: monthlyCost,
    period: periodCost,
  };
}

/**
 * メイン処理
 */
async function main() {
  try {
    const summary = await displayCostSummary();
    
    // JSON形式でも出力（オプション）
    if (process.argv.includes('--json')) {
      console.log('\n📄 JSON形式出力:');
      console.log(JSON.stringify(summary, null, 2));
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

module.exports = { displayCostSummary };
