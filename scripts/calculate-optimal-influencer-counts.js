// scripts/calculate-optimal-influencer-counts.js
// 1日500投稿を正確に達成するための最適なインフルエンサー数を計算

const { LANG_DISTRIBUTION } = require('./calculate-influencer-distribution-500-posts');

const CRON_RUNS_PER_DAY = 12;
const PEAK_RUNS = 5; // UTC 0,1,20,21,22
const OFF_PEAK_RUNS = 2; // UTC 13,14
const NORMAL_RUNS = 5; // その他
const OFF_PEAK_MULTIPLIER = 0.4;

function calculateOptimalCounts() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 1日500投稿を正確に達成するための最適なインフルエンサー数計算');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results = {};

  for (const [lang, distribution] of Object.entries(LANG_DISTRIBUTION)) {
    const targetPosts = distribution.postsPerDay;
    
    // オフピーク時間の投稿数を計算
    // 目標: targetPosts = (peakCount * PEAK_RUNS) + (offPeakCount * OFF_PEAK_RUNS) + (normalCount * NORMAL_RUNS)
    // offPeakCount = peakCount * OFF_PEAK_MULTIPLIER
    // normalCount = peakCount (通常時間はピーク時間と同じ)
    
    // targetPosts = peakCount * (PEAK_RUNS + NORMAL_RUNS) + (peakCount * OFF_PEAK_MULTIPLIER) * OFF_PEAK_RUNS
    // targetPosts = peakCount * (PEAK_RUNS + NORMAL_RUNS + OFF_PEAK_MULTIPLIER * OFF_PEAK_RUNS)
    // peakCount = targetPosts / (PEAK_RUNS + NORMAL_RUNS + OFF_PEAK_MULTIPLIER * OFF_PEAK_RUNS)
    
    const denominator = PEAK_RUNS + NORMAL_RUNS + (OFF_PEAK_MULTIPLIER * OFF_PEAK_RUNS);
    const peakCount = Math.ceil(targetPosts / denominator);
    const offPeakCount = Math.max(1, Math.floor(peakCount * OFF_PEAK_MULTIPLIER));
    const normalCount = peakCount;

    // 実際の投稿数を計算
    const actualPosts = 
      (peakCount * PEAK_RUNS) + 
      (offPeakCount * OFF_PEAK_RUNS) + 
      (normalCount * NORMAL_RUNS);

    results[lang] = {
      targetPosts,
      peakCount,
      offPeakCount,
      normalCount,
      actualPosts,
      diff: actualPosts - targetPosts,
    };

    console.log(`📊 ${lang.toUpperCase()} 言語:`);
    console.log(`   目標: ${targetPosts}投稿/日`);
    console.log(`   ピーク時間: ${peakCount}人/回 × ${PEAK_RUNS}回 = ${peakCount * PEAK_RUNS}投稿`);
    console.log(`   オフピーク時間: ${offPeakCount}人/回 × ${OFF_PEAK_RUNS}回 = ${offPeakCount * OFF_PEAK_RUNS}投稿`);
    console.log(`   通常時間: ${normalCount}人/回 × ${NORMAL_RUNS}回 = ${normalCount * NORMAL_RUNS}投稿`);
    console.log(`   実際: ${actualPosts}投稿/日 (差: ${actualPosts - targetPosts > 0 ? '+' : ''}${actualPosts - targetPosts})`);
    console.log('');
  }

  const totalActual = Object.values(results).reduce((sum, r) => sum + r.actualPosts, 0);
  const totalTarget = Object.values(LANG_DISTRIBUTION).reduce((sum, d) => sum + d.postsPerDay, 0);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 サマリー');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`✅ 実際の投稿数: ${totalActual}投稿/日`);
  console.log(`🎯 目標投稿数: ${totalTarget}投稿/日`);
  console.log(`📊 差: ${totalActual - totalTarget > 0 ? '+' : ''}${totalActual - totalTarget}投稿\n`);

  console.log('📋 推奨設定値（config/influencerStrategy.js）:\n');
  console.log('const INFLUENCER_COUNT_BY_LANG = {');
  for (const [lang, result] of Object.entries(results)) {
    console.log(`  ${lang}: ${result.peakCount}, // ${result.targetPosts}投稿/日`);
  }
  console.log('};\n');

  return results;
}

if (require.main === module) {
  calculateOptimalCounts();
}

module.exports = { calculateOptimalCounts };
