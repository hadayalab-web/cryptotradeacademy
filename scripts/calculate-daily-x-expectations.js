// scripts/calculate-daily-x-expectations.js
// 1日のX投稿数とインプレッション数の期待値を計算

require('dotenv').config({ path: '.env' });

const {
  INFLUENCER_COUNT_BY_LANG,
  HOURLY_DISTRIBUTION,
  IMPRESSION_TARGET_BY_LANG,
} = require('../config/influencerStrategy');

/**
 * 1日の投稿数を計算
 */
function calculateDailyPostCount() {
  // Cron設定: UTC 0,2,4,6,8,10,12,14,16,18,20,22（1日12回）
  const cronHours = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
  
  const peakHours = HOURLY_DISTRIBUTION.peak.hours; // [0, 1, 20, 21, 22]
  const offPeakHours = HOURLY_DISTRIBUTION.offPeak.hours; // [13, 14]
  const offPeakMultiplier = HOURLY_DISTRIBUTION.offPeak.multiplier; // 0.4
  
  const dailyPostsByLang = {};
  let totalDailyPosts = 0;
  
  for (const [lang, baseCount] of Object.entries(INFLUENCER_COUNT_BY_LANG)) {
    let dailyPosts = 0;
    
    for (const hour of cronHours) {
      const isPeakHour = peakHours.includes(hour);
      const isOffPeakHour = offPeakHours.includes(hour);
      
      let hourlyPosts;
      if (isOffPeakHour) {
        // オフピーク時間: 通常の40%
        hourlyPosts = Math.max(1, Math.floor(baseCount * offPeakMultiplier));
      } else {
        // ピーク時間または通常時間: 基本値
        hourlyPosts = baseCount;
      }
      
      dailyPosts += hourlyPosts;
    }
    
    dailyPostsByLang[lang] = dailyPosts;
    totalDailyPosts += dailyPosts;
  }
  
  return {
    dailyPostsByLang,
    totalDailyPosts,
    cronExecutions: cronHours.length,
  };
}

/**
 * インプレッション数をパース
 */
function parseImpressions(impressions) {
  if (typeof impressions === 'number') {
    return impressions;
  }
  if (typeof impressions === 'string') {
    const match = impressions.match(/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    const rangeMatch = impressions.match(/(\d+)-(\d+)/);
    if (rangeMatch) {
      return (parseInt(rangeMatch[1], 10) + parseInt(rangeMatch[2], 10)) / 2;
    }
  }
  return 0;
}

/**
 * 1日のインプレッション数の期待値を計算
 */
async function calculateDailyImpressionExpectations() {
  const { dailyPostsByLang } = calculateDailyPostCount();
  const { getInfluencersFromStock } = require('../services/x/influencerStock');
  
  const impressionExpectationsByLang = {};
  let totalExpectedImpressions = 0;
  
  for (const [lang, postCount] of Object.entries(dailyPostsByLang)) {
    let avgImpressionsPerPost = 100000; // デフォルト値
    
    try {
      // KVから実際のインフルエンサーデータを取得
      const influencers = await getInfluencersFromStock(lang);
      if (influencers && influencers.length > 0) {
        const totalImpressions = influencers.reduce((sum, inf) => {
          return sum + parseImpressions(inf.recentImpressions || 0);
        }, 0);
        avgImpressionsPerPost = Math.round(totalImpressions / influencers.length);
      }
    } catch (error) {
      console.warn(`[Calculate Expectations] Failed to get influencers for ${lang}, using default:`, error.message);
    }
    
    // 1日の期待インプレッション数 = 投稿数 × 1投稿あたりの平均インプレッション数
    const expectedImpressions = postCount * avgImpressionsPerPost;
    
    // 目標範囲も計算（保守的-楽観的）
    const target = IMPRESSION_TARGET_BY_LANG[lang] || {
      min: 10000,
      max: 50000,
      priority: 'low',
    };
    
    // 1投稿あたりのインプレッション数を目標範囲に基づいて推定
    const minImpressionsPerPost = Math.min(avgImpressionsPerPost, target.min);
    const maxImpressionsPerPost = Math.max(avgImpressionsPerPost, target.max);
    
    impressionExpectationsByLang[lang] = {
      postCount,
      avgImpressionsPerPost,
      avgImpressions: expectedImpressions,
      minImpressions: postCount * minImpressionsPerPost,
      maxImpressions: postCount * maxImpressionsPerPost,
      target,
    };
    
    totalExpectedImpressions += expectedImpressions;
  }
  
  return {
    impressionExpectationsByLang,
    totalExpectedImpressions,
    minTotalImpressions: Object.values(impressionExpectationsByLang).reduce(
      (sum, exp) => sum + exp.minImpressions,
      0
    ),
    maxTotalImpressions: Object.values(impressionExpectationsByLang).reduce(
      (sum, exp) => sum + exp.maxImpressions,
      0
    ),
  };
}

/**
 * レポートを表示
 */
async function displayReport() {
  console.log('='.repeat(80));
  console.log('📊 1日のX投稿数とインプレッション数の期待値');
  console.log('='.repeat(80));
  console.log('');
  
  // 投稿数計算
  const { dailyPostsByLang, totalDailyPosts, cronExecutions } = calculateDailyPostCount();
  
  console.log('📝 1日の投稿数:');
  console.log(`  Cron実行回数: ${cronExecutions}回/日（UTC 0,2,4,6,8,10,12,14,16,18,20,22）`);
  console.log('');
  
  for (const [lang, count] of Object.entries(dailyPostsByLang)) {
    const baseCount = INFLUENCER_COUNT_BY_LANG[lang];
    console.log(`  ${lang.toUpperCase()}: ${count}投稿/日（基本値: ${baseCount}人/回）`);
  }
  
  console.log('');
  console.log(`  📊 合計: ${totalDailyPosts}投稿/日`);
  console.log('');
  
  // インプレッション数計算
  const {
    impressionExpectationsByLang,
    totalExpectedImpressions,
    minTotalImpressions,
    maxTotalImpressions,
  } = await calculateDailyImpressionExpectations();
  
  console.log('👁️ 1日のインプレッション数の期待値:');
  console.log('');
  
  for (const [lang, exp] of Object.entries(impressionExpectationsByLang)) {
    console.log(`  ${lang.toUpperCase()}:`);
    console.log(`    投稿数: ${exp.postCount}投稿/日`);
    console.log(`    1投稿あたりの平均インプレッション数: ${exp.avgImpressionsPerPost.toLocaleString()}インプレッション`);
    console.log(`    期待インプレッション数: ${exp.avgImpressions.toLocaleString()}インプレッション/日`);
    console.log(`    範囲: ${exp.minImpressions.toLocaleString()} - ${exp.maxImpressions.toLocaleString()}インプレッション/日`);
    console.log('');
  }
  
  console.log('  📊 合計期待インプレッション数:');
  console.log(`    平均: ${totalExpectedImpressions.toLocaleString()}インプレッション/日`);
  console.log(`    範囲: ${minTotalImpressions.toLocaleString()} - ${maxTotalImpressions.toLocaleString()}インプレッション/日`);
  console.log('');
  
  // 月次期待値
  const monthlyPosts = totalDailyPosts * 30;
  const monthlyImpressions = totalExpectedImpressions * 30;
  const minMonthlyImpressions = minTotalImpressions * 30;
  const maxMonthlyImpressions = maxTotalImpressions * 30;
  
  console.log('📅 月次期待値（30日換算）:');
  console.log(`  投稿数: ${monthlyPosts.toLocaleString()}投稿/月`);
  console.log(`  インプレッション数: ${monthlyImpressions.toLocaleString()}インプレッション/月`);
  console.log(`  範囲: ${minMonthlyImpressions.toLocaleString()} - ${maxMonthlyImpressions.toLocaleString()}インプレッション/月`);
  console.log('');
  
  // X APIコスト計算
  const postCostPerUnit = 0.005; // $0.005 per post
  const dailyCost = totalDailyPosts * postCostPerUnit;
  const monthlyCost = monthlyPosts * postCostPerUnit;
  
  console.log('💰 X APIコスト期待値:');
  console.log(`  1日: $${dailyCost.toFixed(2)}（${totalDailyPosts}投稿 × $${postCostPerUnit}/投稿）`);
  console.log(`  1ヶ月: $${monthlyCost.toFixed(2)}（${monthlyPosts}投稿 × $${postCostPerUnit}/投稿）`);
  console.log('');
  
  console.log('='.repeat(80));
  
  return {
    daily: {
      posts: totalDailyPosts,
      impressions: {
        avg: totalExpectedImpressions,
        min: minTotalImpressions,
        max: maxTotalImpressions,
      },
      cost: dailyCost,
    },
    monthly: {
      posts: monthlyPosts,
      impressions: {
        avg: monthlyImpressions,
        min: minMonthlyImpressions,
        max: maxMonthlyImpressions,
      },
      cost: monthlyCost,
    },
    byLang: {
      posts: dailyPostsByLang,
      impressions: impressionExpectationsByLang,
    },
  };
}

/**
 * メイン処理
 */
async function main() {
  try {
    const report = await displayReport();
    
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

module.exports = {
  calculateDailyPostCount,
  calculateDailyImpressionExpectations,
  displayReport,
  parseImpressions,
};
