// scripts/analyze-stock-requirement-500-posts.js
// 500投稿/日を超えるために必要なストック数を分析

const {
  INFLUENCER_COUNT_BY_LANG,
  STOCK_COUNT_BY_LANG,
} = require('../config/influencerStrategy');

/**
 * 500投稿/日を超えるために必要なストック数を計算
 */
function analyzeStockRequirement() {
  // Cron設定: UTC 0,2,4,6,8,10,12,14,16,18,20,22（1日12回）
  const cronExecutions = 12;
  
  // 8時間クールダウン: 1人あたり最大3回/日
  const maxPostsPerInfluencer = 3;
  
  // 日次上限: 4回/日（デフォルト）
  const dailyLimitPerInfluencer = 4;
  
  // 実質的な上限: min(3回/日, 4回/日) = 3回/日
  const effectiveLimitPerInfluencer = Math.min(maxPostsPerInfluencer, dailyLimitPerInfluencer);
  
  const analysis = {};
  let totalRequiredStock = 0;
  let totalCurrentStock = 0;
  
  for (const [lang, baseCount] of Object.entries(INFLUENCER_COUNT_BY_LANG)) {
    // 1日の投稿数（理想）
    // オフピーク時間（2回）: baseCount * 0.4
    // その他の時間（10回）: baseCount
    // 合計: baseCount * 10 + baseCount * 0.4 * 2 = baseCount * 10.8
    const idealDailyPosts = Math.round(baseCount * 10.8);
    
    // 500投稿/日を超えるために必要な投稿数
    const targetDailyPosts = idealDailyPosts; // 既に534投稿/日なので、これを維持
    
    // クールダウンを考慮した場合、1人あたり3回/日が上限
    // 必要なインフルエンサー数 = 目標投稿数 / 1人あたりの上限
    const requiredInfluencers = Math.ceil(targetDailyPosts / effectiveLimitPerInfluencer);
    
    // ローテーションの柔軟性を考慮（余裕を持たせる）
    // ストック数は必要数の1.5倍以上が推奨
    const recommendedStock = Math.ceil(requiredInfluencers * 1.5);
    
    // 現在のストック数
    const currentStock = STOCK_COUNT_BY_LANG[lang] || 0;
    
    // ストック数が十分かどうか
    const isStockSufficient = currentStock >= requiredInfluencers;
    const isStockOptimal = currentStock >= recommendedStock;
    
    analysis[lang] = {
      baseCount,
      idealDailyPosts,
      targetDailyPosts,
      effectiveLimitPerInfluencer,
      requiredInfluencers,
      recommendedStock,
      currentStock,
      isStockSufficient,
      isStockOptimal,
      stockSurplus: currentStock - requiredInfluencers,
      stockDeficit: isStockSufficient ? 0 : requiredInfluencers - currentStock,
    };
    
    totalRequiredStock += requiredInfluencers;
    totalCurrentStock += currentStock;
  }
  
  return {
    analysis,
    summary: {
      totalRequiredStock,
      totalCurrentStock,
      totalSurplus: totalCurrentStock - totalRequiredStock,
      isOverallSufficient: totalCurrentStock >= totalRequiredStock,
    },
  };
}

/**
 * レポートを表示
 */
function displayReport() {
  console.log('='.repeat(80));
  console.log('📊 500投稿/日を超えるために必要なストック数分析');
  console.log('='.repeat(80));
  console.log('');
  
  const result = analyzeStockRequirement();
  
  console.log('📝 言語別分析:');
  console.log('');
  
  for (const [lang, data] of Object.entries(result.analysis)) {
    console.log(`  ${lang.toUpperCase()}:`);
    console.log(`    基本値: ${data.baseCount}人/回`);
    console.log(`    理想投稿数: ${data.idealDailyPosts}投稿/日`);
    console.log(`    1人あたりの上限: ${data.effectiveLimitPerInfluencer}回/日（8時間クールダウン）`);
    console.log(`    必要なインフルエンサー数: ${data.requiredInfluencers}人`);
    console.log(`    推奨ストック数: ${data.recommendedStock}人`);
    console.log(`    現在のストック数: ${data.currentStock}人`);
    
    if (data.isStockSufficient) {
      console.log(`    ✅ ストック数は十分（余裕: +${data.stockSurplus}人）`);
    } else {
      console.log(`    ❌ ストック数が不足（不足: -${data.stockDeficit}人）`);
    }
    
    if (data.isStockOptimal) {
      console.log(`    ✅ ストック数は最適（推奨値以上）`);
    } else {
      console.log(`    ⚠️  ストック数を増やすとより安全（推奨: ${data.recommendedStock}人）`);
    }
    
    console.log('');
  }
  
  console.log('📊 合計:');
  console.log(`  必要なストック数: ${result.summary.totalRequiredStock}人`);
  console.log(`  現在のストック数: ${result.summary.totalCurrentStock}人`);
  
  if (result.summary.isOverallSufficient) {
    console.log(`  ✅ ストック数は十分（余裕: +${result.summary.totalSurplus}人）`);
  } else {
    console.log(`  ❌ ストック数が不足（不足: -${Math.abs(result.summary.totalSurplus)}人）`);
  }
  
  console.log('');
  
  // 結論
  console.log('🎯 結論:');
  console.log('');
  
  if (result.summary.isOverallSufficient) {
    console.log('  ✅ **ストック数を増やす必要はありません**');
    console.log('');
    console.log('  理由:');
    console.log('    - 現在のストック数で534投稿/日を達成可能');
    console.log('    - ローテーション管理により、クールダウンを回避可能');
    console.log('    - ストック数が十分で、異なるインフルエンサーが選ばれる');
  } else {
    console.log('  ⚠️  **ストック数を増やす必要があります**');
    console.log('');
    console.log('  理由:');
    console.log('    - 現在のストック数では534投稿/日を達成できない可能性');
    console.log('    - クールダウンにより、同じ人が連続して選ばれる可能性');
    console.log('    - ローテーションの柔軟性が不足');
  }
  
  console.log('');
  console.log('💡 推奨アクション:');
  console.log('');
  
  // ストック数が不足している言語を特定
  const insufficientLangs = Object.entries(result.analysis)
    .filter(([_, data]) => !data.isStockSufficient);
  
  if (insufficientLangs.length === 0) {
    console.log('  ✅ すべての言語でストック数が十分です');
    console.log('  ✅ 追加のアクションは不要です');
  } else {
    console.log('  ストック数を増やす必要がある言語:');
    for (const [lang, data] of insufficientLangs) {
      console.log(`    - ${lang.toUpperCase()}: ${data.currentStock}人 → ${data.requiredInfluencers}人以上（推奨: ${data.recommendedStock}人）`);
    }
  }
  
  console.log('');
  console.log('='.repeat(80));
  
  return result;
}

if (require.main === module) {
  displayReport();
}

module.exports = { analyzeStockRequirement, displayReport };
