// scripts/calculate-optimal-influencer-counts-500.js
// 500投稿/日を達成するための最適なインフルエンサー数を計算

/**
 * 500投稿/日を達成するための最適なインフルエンサー数を計算
 */
function calculateOptimalCounts() {
  // Cron設定: UTC 0,2,4,6,8,10,12,14,16,18,20,22（1日12回）
  const cronHours = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
  
  // ピーク時間（UTC 0,1,20,21,22）とオフピーク時間（UTC 13,14）
  const peakHours = [0, 1, 20, 21, 22];
  const offPeakHours = [13, 14];
  const offPeakMultiplier = 0.4;
  
  // 目標: 500投稿/日
  const targetDailyPosts = 500;
  
  // 言語別配分（コメントに記載されている目標値）
  const targetPostsByLang = {
    en: 200,   // 200投稿/日
    es: 100,   // 100投稿/日
    'pt-br': 75,  // 75投稿/日
    ar: 50,    // 50投稿/日
    ja: 50,    // 50投稿/日
    ko: 25,    // 25投稿/日
  };
  
  // 各言語の基本値を逆算
  const optimalCounts = {};
  
  for (const [lang, targetPosts] of Object.entries(targetPostsByLang)) {
    // 1日の投稿数から基本値を逆算
    // オフピーク時間（2回）: baseCount * 0.4
    // その他の時間（10回）: baseCount
    // 合計: baseCount * 10 + baseCount * 0.4 * 2 = baseCount * (10 + 0.8) = baseCount * 10.8
    const baseCount = Math.round(targetPosts / 10.8);
    
    // 検証: 実際の投稿数を計算
    let actualPosts = 0;
    for (const hour of cronHours) {
      if (offPeakHours.includes(hour)) {
        actualPosts += Math.max(1, Math.floor(baseCount * offPeakMultiplier));
      } else {
        actualPosts += baseCount;
      }
    }
    
    optimalCounts[lang] = {
      baseCount,
      targetPosts,
      actualPosts,
      difference: actualPosts - targetPosts,
    };
  }
  
  // 合計を計算
  const totalActualPosts = Object.values(optimalCounts).reduce((sum, lang) => sum + lang.actualPosts, 0);
  
  return {
    optimalCounts,
    totalTargetPosts: targetDailyPosts,
    totalActualPosts,
    difference: totalActualPosts - targetDailyPosts,
  };
}

/**
 * レポートを表示
 */
function displayReport() {
  console.log('='.repeat(80));
  console.log('📊 500投稿/日を達成するための最適なインフルエンサー数');
  console.log('='.repeat(80));
  console.log('');
  
  const result = calculateOptimalCounts();
  
  console.log('📝 言語別最適値:');
  console.log('');
  
  for (const [lang, data] of Object.entries(result.optimalCounts)) {
    console.log(`  ${lang.toUpperCase()}:`);
    console.log(`    基本値: ${data.baseCount}人/回`);
    console.log(`    目標投稿数: ${data.targetPosts}投稿/日`);
    console.log(`    実際の投稿数: ${data.actualPosts}投稿/日`);
    if (data.difference !== 0) {
      console.log(`    差分: ${data.difference > 0 ? '+' : ''}${data.difference}投稿/日`);
    }
    console.log('');
  }
  
  console.log('📊 合計:');
  console.log(`  目標投稿数: ${result.totalTargetPosts}投稿/日`);
  console.log(`  実際の投稿数: ${result.totalActualPosts}投稿/日`);
  if (result.difference !== 0) {
    console.log(`  差分: ${result.difference > 0 ? '+' : ''}${result.difference}投稿/日`);
  }
  console.log('');
  
  console.log('💡 推奨設定値（config/influencerStrategy.js）:');
  console.log('');
  console.log('const INFLUENCER_COUNT_BY_LANG = {');
  for (const [lang, data] of Object.entries(result.optimalCounts)) {
    const langKey = lang === 'pt-br' ? "'pt-br'" : lang;
    console.log(`  ${langKey}: parseInt(process.env.INFLUENCER_COUNT_${lang.toUpperCase().replace('-', '_')} || '${data.baseCount}', 10),`);
  }
  console.log('};');
  console.log('');
  
  console.log('='.repeat(80));
  
  return result;
}

if (require.main === module) {
  displayReport();
}

module.exports = { calculateOptimalCounts, displayReport };
