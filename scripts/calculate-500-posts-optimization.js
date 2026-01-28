// scripts/calculate-500-posts-optimization.js
// 1日500投稿を達成するための最適化計算

const { getInfluencerCountForLang } = require('../config/influencerStrategy');

/**
 * 500投稿/日を達成するための最適化されたインフルエンサー数
 */
const OPTIMIZED_COUNTS = {
  en: 32,   // 現在19 → 32（約68%増）
  es: 17,   // 現在10 → 17（約70%増）
  'pt-br': 12,  // 現在7 → 12（約71%増）
  ar: 8,    // 現在5 → 8（約60%増）
  ja: 8,    // 現在5 → 8（約60%増）
  ko: 5,    // 現在3 → 5（約67%増）
};

/**
 * 最適化された投稿数を計算
 */
function calculateOptimizedPosts() {
  const peakHours = [0, 1, 20, 21, 22];
  const offPeakHours = [13, 14];
  const offPeakMultiplier = 0.4;
  
  function getOptimizedCount(lang, hour) {
    const baseCount = OPTIMIZED_COUNTS[lang] || 1;
    if (offPeakHours.includes(hour)) {
      return Math.max(1, Math.floor(baseCount * offPeakMultiplier));
    }
    return baseCount;
  }

  const hourlyConfig = {
    0: { langs: ['ar', 'en'], count: 1 },
    1: { langs: ['ko', 'en'], count: 1 },
    2: { langs: ['en'], count: 1 },
    4: { langs: ['es'], count: 1 },
    6: { langs: ['pt-br'], count: 1 },
    8: { langs: ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'], count: 1 },
    10: { langs: ['ja'], count: 1 },
    12: { langs: ['en'], count: 1 },
    13: { langs: ['ko', 'ja'], count: 1 },
    14: { langs: ['en', 'ja'], count: 1 },
    15: { langs: ['es'], count: 1 },
    16: { langs: ['ko'], count: 1 },
    18: { langs: ['ar'], count: 1 },
    20: { langs: ['en', 'pt-br'], count: 2 },
    21: { langs: ['es', 'en'], count: 1 },
    22: { langs: ['pt-br', 'es', 'en'], count: 1 },
  };

  let totalDailyPosts = 0;
  const hourlyBreakdown = {};

  for (const [hour, config] of Object.entries(hourlyConfig)) {
    const hourNum = parseInt(hour, 10);
    const count = config.count || 1;
    
    let hourPosts = 0;
    const langDetails = {};
    for (const lang of config.langs) {
      const influencerCount = getOptimizedCount(lang, hourNum);
      hourPosts += influencerCount;
      langDetails[lang] = influencerCount;
    }
    
    const totalHourPosts = hourPosts * count;
    totalDailyPosts += totalHourPosts;
    
    const type = peakHours.includes(hourNum) ? 'peak' : offPeakHours.includes(hourNum) ? 'offPeak' : 'normal';
    
    hourlyBreakdown[hourNum] = {
      langs: config.langs,
      count,
      type,
      langDetails,
      postsPerRun: hourPosts,
      totalPosts: totalHourPosts,
    };
  }

  return {
    totalDailyPosts,
    hourlyBreakdown,
  };
}

/**
 * 現在の設定値での投稿数を計算（比較用）
 */
function calculateCurrentPosts() {
  const peakHours = [0, 1, 20, 21, 22];
  const offPeakHours = [13, 14];
  
  const hourlyConfig = {
    0: { langs: ['ar', 'en'], count: 1 },
    1: { langs: ['ko', 'en'], count: 1 },
    2: { langs: ['en'], count: 1 },
    4: { langs: ['es'], count: 1 },
    6: { langs: ['pt-br'], count: 1 },
    8: { langs: ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'], count: 1 },
    10: { langs: ['ja'], count: 1 },
    12: { langs: ['en'], count: 1 },
    13: { langs: ['ko', 'ja'], count: 1 },
    14: { langs: ['en', 'ja'], count: 1 },
    15: { langs: ['es'], count: 1 },
    16: { langs: ['ko'], count: 1 },
    18: { langs: ['ar'], count: 1 },
    20: { langs: ['en', 'pt-br'], count: 2 },
    21: { langs: ['es', 'en'], count: 1 },
    22: { langs: ['pt-br', 'es', 'en'], count: 1 },
  };

  let totalDailyPosts = 0;
  const hourlyBreakdown = {};

  for (const [hour, config] of Object.entries(hourlyConfig)) {
    const hourNum = parseInt(hour, 10);
    const count = config.count || 1;
    
    let hourPosts = 0;
    const langDetails = {};
    for (const lang of config.langs) {
      const influencerCount = getInfluencerCountForLang(lang, hourNum);
      hourPosts += influencerCount;
      langDetails[lang] = influencerCount;
    }
    
    const totalHourPosts = hourPosts * count;
    totalDailyPosts += totalHourPosts;
    
    const type = peakHours.includes(hourNum) ? 'peak' : offPeakHours.includes(hourNum) ? 'offPeak' : 'normal';
    
    hourlyBreakdown[hourNum] = {
      langs: config.langs,
      count,
      type,
      langDetails,
      postsPerRun: hourPosts,
      totalPosts: totalHourPosts,
    };
  }

  return {
    totalDailyPosts,
    hourlyBreakdown,
  };
}

/**
 * レポート生成
 */
function generateReport() {
  console.log('='.repeat(80));
  console.log('📊 1日500投稿達成のための最適化計算');
  console.log('='.repeat(80));
  console.log('');
  
  // 現在の設定値での計算
  const currentResult = calculateCurrentPosts();
  console.log(`📈 現在の設定値: ${currentResult.totalDailyPosts}投稿/日`);
  
  // 最適化後の計算
  const optimizedResult = calculateOptimizedPosts();
  console.log(`🚀 最適化後: ${optimizedResult.totalDailyPosts}投稿/日`);
  console.log(`📊 増加数: ${optimizedResult.totalDailyPosts - currentResult.totalDailyPosts}投稿/日`);
  
  console.log('\n' + '='.repeat(80));
  console.log('📋 言語別インフルエンサー数比較');
  console.log('='.repeat(80));
  
  const currentCounts = {
    en: getInfluencerCountForLang('en'),
    es: getInfluencerCountForLang('es'),
    'pt-br': getInfluencerCountForLang('pt-br'),
    ar: getInfluencerCountForLang('ar'),
    ja: getInfluencerCountForLang('ja'),
    ko: getInfluencerCountForLang('ko'),
  };
  
  for (const lang of Object.keys(OPTIMIZED_COUNTS)) {
    const current = currentCounts[lang] || 0;
    const optimized = OPTIMIZED_COUNTS[lang] || 0;
    const increase = optimized - current;
    const percentIncrease = current > 0 ? ((increase / current) * 100).toFixed(1) : 0;
    console.log(`  ${lang.toUpperCase()}: ${current}人 → ${optimized}人 (+${increase}人, +${percentIncrease}%)`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('⏰ 時間帯別投稿数（最適化後）');
  console.log('='.repeat(80));
  
  const sortedHours = Object.keys(optimizedResult.hourlyBreakdown).map(Number).sort((a, b) => a - b);
  for (const hour of sortedHours) {
    const config = optimizedResult.hourlyBreakdown[hour];
    const langDetailsStr = Object.entries(config.langDetails)
      .map(([lang, count]) => `${lang}:${count}`)
      .join(', ');
    console.log(`  UTC ${String(hour).padStart(2, '0')}:00 - ${config.langs.join(', ')} (${config.type}, count: ${config.count})`);
    console.log(`    → ${langDetailsStr} = ${config.postsPerRun}投稿/回 × ${config.count}回 = ${config.totalPosts}投稿`);
  }
  
  console.log(`\n  合計: ${optimizedResult.totalDailyPosts}投稿/日`);
  
  // コスト計算
  const monthlyPosts = optimizedResult.totalDailyPosts * 30;
  const monthlyCost = monthlyPosts * 0.005; // $0.005/投稿
  
  console.log('\n' + '='.repeat(80));
  console.log('💰 コスト計算（最適化後）');
  console.log('='.repeat(80));
  console.log(`  日次投稿数: ${optimizedResult.totalDailyPosts}投稿/日`);
  console.log(`  月次投稿数: ${monthlyPosts}投稿/月`);
  console.log(`  月間コスト: $${monthlyCost.toFixed(2)}/月`);
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ 最適化完了');
  console.log('='.repeat(80));
  
  return {
    current: currentResult,
    optimized: optimizedResult,
    optimizedCounts: OPTIMIZED_COUNTS,
  };
}

if (require.main === module) {
  try {
    const results = generateReport();
    
    if (process.argv.includes('--json')) {
      console.log('\n📄 JSON形式出力:');
      console.log(JSON.stringify(results, null, 2));
    }
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = { calculateOptimizedPosts, OPTIMIZED_COUNTS };
