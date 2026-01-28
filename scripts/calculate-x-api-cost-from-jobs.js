// scripts/calculate-x-api-cost-from-jobs.js
// X API関連のCronジョブの投稿数とスケジュールを調べてコストを計算

const pricing = require('../config/xApiPricing');

/**
 * 各時間帯の投稿数を正確に計算
 * getPeakMapForHourとinfluencerStrategy.jsの設定に基づく
 */
function calculateHourlyPosts() {
  // influencerStrategy.jsのINFLUENCER_COUNT_BY_LANG設定から実際の値を取得
  // 設定ファイルから動的に読み込む（環境変数で上書き可能）
  const { INFLUENCER_COUNT_BY_LANG } = require('../config/influencerStrategy');
  const baseCounts = {
    en: INFLUENCER_COUNT_BY_LANG.en || 32,
    es: INFLUENCER_COUNT_BY_LANG.es || 17,
    'pt-br': INFLUENCER_COUNT_BY_LANG['pt-br'] || 12,
    ar: INFLUENCER_COUNT_BY_LANG.ar || 8,
    ja: INFLUENCER_COUNT_BY_LANG.ja || 8,
    ko: INFLUENCER_COUNT_BY_LANG.ko || 5,
  };
  
  // HOURLY_DISTRIBUTION設定
  const peakHours = [0, 1, 20, 21, 22];
  const offPeakHours = [13, 14];
  const offPeakMultiplier = 0.4;
  
  // getInfluencerCountForLangの実装を正確に再現
  function getInfluencerCountForLang(lang, hour) {
    const baseCount = baseCounts[lang] || 1;
    if (offPeakHours.includes(hour)) {
      return Math.max(1, Math.floor(baseCount * offPeakMultiplier));
    }
    return baseCount;
  }

  // getPeakMapForHourの設定を正確に反映（services/x/optimization.jsから）
  // 注意: コメントには「298投稿/日」とあるが、実際のINFLUENCER_COUNT_BY_LANGの値では異なる
  const hourlyConfig = {
    0: { langs: ['ar', 'en'], count: 1 },      // UTC 0:00
    1: { langs: ['ko', 'en'], count: 1 },      // UTC 1:00
    2: { langs: ['en'], count: 1 },            // UTC 2:00
    4: { langs: ['es'], count: 1 },            // UTC 4:00
    6: { langs: ['pt-br'], count: 1 },         // UTC 6:00
    8: { langs: ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'], count: 1 }, // UTC 8:00 - 全言語
    10: { langs: ['ja'], count: 1 },           // UTC 10:00
    12: { langs: ['en'], count: 1 },           // UTC 12:00
    13: { langs: ['ko', 'ja'], count: 1 },     // UTC 13:00 - オフピーク
    14: { langs: ['en', 'ja'], count: 1 },     // UTC 14:00 - オフピーク
    15: { langs: ['es'], count: 1 },           // UTC 15:00
    16: { langs: ['ko'], count: 1 },           // UTC 16:00
    18: { langs: ['ar'], count: 1 },           // UTC 18:00
    20: { langs: ['en', 'pt-br'], count: 2 },  // UTC 20:00 - count: 2なので2回実行
    21: { langs: ['es', 'en'], count: 1 },     // UTC 21:00
    22: { langs: ['pt-br', 'es', 'en'], count: 1 }, // UTC 22:00
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
    
    // count回実行される（UTC 20:00はcount: 2なので2回実行）
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
 * X API関連のCronジョブ設定
 */
const X_API_JOBS = {
  'x-quote-repost': {
    name: '引用リポスト自動化',
    schedule: '0 0,2,4,6,8,10,12,14,16,18,20,22 * * *', // 12回/日（2時間ごと）
    runsPerDay: 12,
    calculatePosts: () => {
      const { totalDailyPosts } = calculateHourlyPosts();
      return {
        estimated: totalDailyPosts,
        min: Math.floor(totalDailyPosts * 0.8), // 80%の見積もり
        max: Math.ceil(totalDailyPosts * 1.2), // 120%の見積もり
      };
    },
    description: 'インフルエンサーのツイートを引用リポスト（6言語対応）',
  },
  'x-post-minimal-version-cron': {
    name: '無料版（Minimal Version）X投稿',
    schedule: '0 7,12,15,23 * * *', // 4回/日
    runsPerDay: 4,
    postsPerRun: {
      min: 1,
      max: 1,
      estimated: 1,
    },
    description: '無料版レポートのX投稿（UTC 8:00, 12:00, 18:00, 20:00）',
  },
  'x-post-free-report': {
    name: '無料版レポートX投稿',
    schedule: '30 4,10,17,19 * * *', // 4回/日
    runsPerDay: 4,
    postsPerRun: {
      min: 1,
      max: 1,
      estimated: 1,
    },
    description: '無料版レポート配信後のX投稿（6言語対応）',
  },
  'vsl1-post': {
    name: 'VSL1自動投稿（X/Twitter）',
    schedule: '0 1,13,21 * * *', // 3回/日
    runsPerDay: 3,
    postsPerRun: {
      min: 1,
      max: 1,
      estimated: 1,
    },
    description: 'VSL1投稿（無料版オプトイン誘導）',
  },
};

/**
 * 日次投稿数を計算
 */
function calculateDailyPosts(jobs) {
  const dailyPosts = {
    min: 0,
    max: 0,
    estimated: 0,
    breakdown: {},
  };

  for (const [jobId, config] of Object.entries(jobs)) {
    let dailyMin, dailyMax, dailyEstimated;
    
    if (config.calculatePosts) {
      const posts = config.calculatePosts();
      dailyMin = posts.min;
      dailyMax = posts.max;
      dailyEstimated = posts.estimated;
    } else {
      dailyMin = config.runsPerDay * config.postsPerRun.min;
      dailyMax = config.runsPerDay * config.postsPerRun.max;
      dailyEstimated = config.runsPerDay * config.postsPerRun.estimated;
    }

    dailyPosts.min += dailyMin;
    dailyPosts.max += dailyMax;
    dailyPosts.estimated += dailyEstimated;

    dailyPosts.breakdown[jobId] = {
      name: config.name,
      runsPerDay: config.runsPerDay,
      postsPerRun: config.postsPerRun || { estimated: dailyEstimated / config.runsPerDay },
      dailyMin,
      dailyMax,
      dailyEstimated,
    };
  }

  return dailyPosts;
}

/**
 * 月次投稿数を計算
 */
function calculateMonthlyPosts(dailyPosts) {
  const daysPerMonth = 30;
  return {
    min: dailyPosts.min * daysPerMonth,
    max: dailyPosts.max * daysPerMonth,
    estimated: dailyPosts.estimated * daysPerMonth,
  };
}

/**
 * コストを計算
 */
function calculateCosts(monthlyPosts) {
  const postCost = pricing.calculate.postCost;
  
  return {
    min: postCost(monthlyPosts.min),
    max: postCost(monthlyPosts.max),
    estimated: postCost(monthlyPosts.estimated),
  };
}

/**
 * レポートを生成
 */
function generateReport() {
  console.log('📊 X API関連Cronジョブの投稿数とコスト計算（正確版）\n');
  console.log('='.repeat(80));
  
  // 時間帯別の詳細計算
  const { totalDailyPosts, hourlyBreakdown } = calculateHourlyPosts();
  console.log('\n⏰ 時間帯別投稿数（x-quote-repost）:');
  const sortedHours = Object.keys(hourlyBreakdown).map(Number).sort((a, b) => a - b);
  for (const hour of sortedHours) {
    const config = hourlyBreakdown[hour];
    const langDetailsStr = Object.entries(config.langDetails)
      .map(([lang, count]) => `${lang}:${count}`)
      .join(', ');
    console.log(`  UTC ${String(hour).padStart(2, '0')}:00 - ${config.langs.join(', ')} (${config.type}, count: ${config.count})`);
    console.log(`    → ${langDetailsStr} = ${config.postsPerRun}投稿/回 × ${config.count}回 = ${config.totalPosts}投稿`);
  }
  console.log(`\n  合計: ${totalDailyPosts}投稿/日`);
  
  // 日次投稿数
  const dailyPosts = calculateDailyPosts(X_API_JOBS);
  console.log('\n📅 日次投稿数（全ジョブ合計）:');
  console.log(`  最小: ${dailyPosts.min}投稿/日`);
  console.log(`  最大: ${dailyPosts.max}投稿/日`);
  console.log(`  推定: ${dailyPosts.estimated}投稿/日`);
  
  console.log('\n📋 ジョブ別内訳:');
  for (const [jobId, breakdown] of Object.entries(dailyPosts.breakdown)) {
    console.log(`\n  ${breakdown.name} (${jobId}):`);
    console.log(`    実行回数: ${breakdown.runsPerDay}回/日`);
    if (breakdown.postsPerRun.estimated) {
      console.log(`    1回あたり: 推定 ${breakdown.postsPerRun.estimated.toFixed(1)}投稿`);
    }
    console.log(`    日次合計: ${breakdown.dailyMin}-${breakdown.dailyMax}投稿（推定: ${breakdown.dailyEstimated}投稿）`);
  }
  
  // 月次投稿数
  const monthlyPosts = calculateMonthlyPosts(dailyPosts);
  console.log('\n📅 月次投稿数（30日換算）:');
  console.log(`  最小: ${monthlyPosts.min}投稿/月`);
  console.log(`  最大: ${monthlyPosts.max}投稿/月`);
  console.log(`  推定: ${monthlyPosts.estimated}投稿/月`);
  
  // コスト計算
  const costs = calculateCosts(monthlyPosts);
  console.log('\n💰 月間コスト（X API従量課金制）:');
  console.log(`  最小: $${costs.min.toFixed(2)}/月`);
  console.log(`  最大: $${costs.max.toFixed(2)}/月`);
  console.log(`  推定: $${costs.estimated.toFixed(2)}/月`);
  
  // スケジュール詳細
  console.log('\n⏰ スケジュール詳細:');
  for (const [jobId, config] of Object.entries(X_API_JOBS)) {
    console.log(`\n  ${config.name} (${jobId}):`);
    console.log(`    スケジュール: ${config.schedule}`);
    console.log(`    説明: ${config.description}`);
  }
  
  // 比較
  console.log('\n📈 旧モデルとの比較:');
  const oldBasicPlan = 200; // $200/month
  const oldProPlan = 5000; // $5,000/month
  console.log(`  旧Basicプラン ($200/月):`);
  console.log(`    推定コスト比: ${((costs.estimated / oldBasicPlan) * 100).toFixed(1)}%`);
  console.log(`    削減額: $${(oldBasicPlan - costs.estimated).toFixed(2)}/月`);
  console.log(`  旧Proプラン ($5,000/月):`);
  console.log(`    推定コスト比: ${((costs.estimated / oldProPlan) * 100).toFixed(1)}%`);
  console.log(`    削減額: $${(oldProPlan - costs.estimated).toFixed(2)}/月`);
  
  // 年間コスト
  const yearlyCosts = {
    min: costs.min * 12,
    max: costs.max * 12,
    estimated: costs.estimated * 12,
  };
  console.log('\n📅 年間コスト（12ヶ月換算）:');
  console.log(`  最小: $${yearlyCosts.min.toFixed(2)}/年`);
  console.log(`  最大: $${yearlyCosts.max.toFixed(2)}/年`);
  console.log(`  推定: $${yearlyCosts.estimated.toFixed(2)}/年`);
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ 計算完了');
  
  return {
    dailyPosts,
    monthlyPosts,
    costs,
    yearlyCosts,
    hourlyBreakdown,
  };
}

// 実行
if (require.main === module) {
  try {
    const results = generateReport();
    
    // JSON形式でも出力（オプション）
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

module.exports = {
  X_API_JOBS,
  calculateHourlyPosts,
  calculateDailyPosts,
  calculateMonthlyPosts,
  calculateCosts,
  generateReport,
};
