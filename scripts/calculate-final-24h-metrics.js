// scripts/calculate-final-24h-metrics.js
// 24時間の投稿数、期待インプレッション数、エンゲージメント率を最終チェック

require('dotenv').config({ path: '.env' });

const {
  calculateDailyPostCount,
  calculateDailyImpressionExpectations,
} = require('./calculate-daily-x-expectations');

/**
 * KVから実際のエンゲージメント率を取得
 * @param {string} lang - 言語コード
 * @returns {Promise<Object>} エンゲージメント率情報
 */
async function getActualEngagementRate(lang) {
  const { getInfluencersFromStock } = require('../services/x/influencerStock');
  
  try {
    const influencers = await getInfluencersFromStock(lang);
    if (!influencers || influencers.length === 0) {
      return {
        avg: 0.015,  // デフォルト: 1.5%
        min: 0.005,  // デフォルト: 0.5%
        max: 0.05,   // デフォルト: 5%
        count: 0,
      };
    }
    
    // エンゲージメント率を取得（0-1の範囲、例: 0.05 = 5%）
    const engagementRates = influencers
      .map(inf => inf.engagementRate || 0)
      .filter(rate => rate > 0); // 0のものを除外
    
    if (engagementRates.length === 0) {
      return {
        avg: 0.015,  // デフォルト: 1.5%
        min: 0.005,  // デフォルト: 0.5%
        max: 0.05,   // デフォルト: 5%
        count: influencers.length,
      };
    }
    
    const avg = engagementRates.reduce((sum, rate) => sum + rate, 0) / engagementRates.length;
    const min = Math.min(...engagementRates);
    const max = Math.max(...engagementRates);
    
    return {
      avg,
      min,
      max,
      count: influencers.length,
      validCount: engagementRates.length,
    };
  } catch (error) {
    console.warn(`[Calculate Final Metrics] Failed to get engagement rate for ${lang}, using default:`, error.message);
    return {
      avg: 0.015,  // デフォルト: 1.5%
      min: 0.005,  // デフォルト: 0.5%
      max: 0.05,   // デフォルト: 5%
      count: 0,
    };
  }
}

/**
 * エンゲージメント数を計算（実際のエンゲージメント率を使用）
 * @param {number} impressions - インプレッション数
 * @param {number} engagementRate - エンゲージメント率（0-1の範囲、例: 0.05 = 5%）
 * @returns {number} エンゲージメント数
 */
function calculateEngagementCount(impressions, engagementRate) {
  return Math.round(impressions * engagementRate);
}

/**
 * 最終レポートを表示
 */
async function displayFinalReport() {
  console.log('='.repeat(80));
  console.log('📊 24時間の最終チェック: 投稿数・インプレッション数・エンゲージメント率');
  console.log('='.repeat(80));
  console.log('');

  // 投稿数計算
  const { dailyPostsByLang, totalDailyPosts, cronExecutions } = calculateDailyPostCount();
  
  console.log('📝 24時間の投稿数:');
  console.log(`  Cron実行回数: ${cronExecutions}回/日（UTC 0,2,4,6,8,10,12,14,16,18,20,22）`);
  console.log('');
  
  for (const [lang, count] of Object.entries(dailyPostsByLang)) {
    const baseCount = require('../config/influencerStrategy').INFLUENCER_COUNT_BY_LANG[lang];
    console.log(`  ${lang.toUpperCase()}: ${count}投稿/日（基本値: ${baseCount}人/回）`);
  }
  
  console.log('');
  console.log(`  📊 合計: ${totalDailyPosts}投稿/24時間`);
  console.log('');

  // インプレッション数計算
  const {
    impressionExpectationsByLang,
    totalExpectedImpressions,
    minTotalImpressions,
    maxTotalImpressions,
  } = await calculateDailyImpressionExpectations();
  
  console.log('👁️ 24時間の期待インプレッション数:');
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
  console.log(`    平均: ${totalExpectedImpressions.toLocaleString()}インプレッション/24時間`);
  console.log(`    範囲: ${minTotalImpressions.toLocaleString()} - ${maxTotalImpressions.toLocaleString()}インプレッション/24時間`);
  console.log('');

  // エンゲージメント率計算（KVから実際のデータを取得）
  console.log('💬 24時間の期待エンゲージメント数（KVの実際のエンゲージメント率を使用）:');
  console.log('');
  
  // 言語別の実際のエンゲージメント率を取得
  const engagementRatesByLang = {};
  let totalWeightedEngagementRate = 0;
  let totalImpressionsForWeight = 0;
  
  for (const [lang, exp] of Object.entries(impressionExpectationsByLang)) {
    const engagementRateInfo = await getActualEngagementRate(lang);
    engagementRatesByLang[lang] = engagementRateInfo;
    
    // 重み付き平均を計算（インプレッション数で重み付け）
    totalWeightedEngagementRate += exp.avgImpressions * engagementRateInfo.avg;
    totalImpressionsForWeight += exp.avgImpressions;
  }
  
  const overallAvgEngagementRate = totalImpressionsForWeight > 0 
    ? totalWeightedEngagementRate / totalImpressionsForWeight 
    : 0.015; // デフォルト: 1.5%
  
  // 言語別エンゲージメント（実際のエンゲージメント率を使用）
  console.log('🌍 言語別エンゲージメント期待値（KVの実際のエンゲージメント率を使用）:');
  console.log('');
  
  let totalEngagements = 0;
  let minTotalEngagements = 0;
  let maxTotalEngagements = 0;
  
  for (const [lang, exp] of Object.entries(impressionExpectationsByLang)) {
    const engagementRateInfo = engagementRatesByLang[lang];
    const avgEngagements = calculateEngagementCount(exp.avgImpressions, engagementRateInfo.avg);
    const minEngagements = calculateEngagementCount(exp.minImpressions, engagementRateInfo.min);
    const maxEngagements = calculateEngagementCount(exp.maxImpressions, engagementRateInfo.max);
    
    totalEngagements += avgEngagements;
    minTotalEngagements += minEngagements;
    maxTotalEngagements += maxEngagements;
    
    console.log(`  ${lang.toUpperCase()}:`);
    console.log(`    期待エンゲージメント数: ${avgEngagements.toLocaleString()}エンゲージメント/24時間`);
    console.log(`    範囲: ${minEngagements.toLocaleString()} - ${maxEngagements.toLocaleString()}エンゲージメント/24時間`);
    console.log(`    エンゲージメント率: ${(engagementRateInfo.avg * 100).toFixed(2)}%（平均、範囲: ${(engagementRateInfo.min * 100).toFixed(2)}% - ${(engagementRateInfo.max * 100).toFixed(2)}%）`);
    console.log(`    インフルエンサー数: ${engagementRateInfo.count}人（有効データ: ${engagementRateInfo.validCount || engagementRateInfo.count}人）`);
    console.log('');
  }

  // サマリー
  const targetEngagements = totalEngagements;
  const minTargetEngagements = minTotalEngagements;
  const maxTargetEngagements = maxTotalEngagements;
  
  console.log('📊 24時間サマリー:');
  console.log('');
  console.log(`  投稿数: ${totalDailyPosts}投稿/24時間`);
  console.log(`  期待インプレッション数: ${totalExpectedImpressions.toLocaleString()}インプレッション/24時間`);
  console.log(`    範囲: ${minTotalImpressions.toLocaleString()} - ${maxTotalImpressions.toLocaleString()}インプレッション/24時間`);
  console.log(`  期待エンゲージメント数: ${targetEngagements.toLocaleString()}エンゲージメント/24時間`);
  console.log(`    範囲: ${minTargetEngagements.toLocaleString()} - ${maxTargetEngagements.toLocaleString()}エンゲージメント/24時間`);
  console.log(`  エンゲージメント率: ${(overallAvgEngagementRate * 100).toFixed(2)}%（KVの実際のデータから計算）`);
  console.log('');

  // 月次期待値
  const monthlyPosts = totalDailyPosts * 30;
  const monthlyImpressions = totalExpectedImpressions * 30;
  const monthlyEngagements = targetEngagements * 30;
  
  console.log('📅 月次期待値（30日換算）:');
  console.log(`  投稿数: ${monthlyPosts.toLocaleString()}投稿/月`);
  console.log(`  インプレッション数: ${monthlyImpressions.toLocaleString()}インプレッション/月`);
  console.log(`  エンゲージメント数: ${monthlyEngagements.toLocaleString()}エンゲージメント/月（エンゲージメント率: ${(overallAvgEngagementRate * 100).toFixed(2)}%）`);
  console.log('');

  // X APIコスト
  const postCostPerUnit = 0.005; // $0.005 per post
  const dailyCost = totalDailyPosts * postCostPerUnit;
  const monthlyCost = monthlyPosts * postCostPerUnit;
  
  console.log('💰 X APIコスト期待値:');
  console.log(`  24時間: $${dailyCost.toFixed(2)}（${totalDailyPosts}投稿 × $${postCostPerUnit}/投稿）`);
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
      engagements: {
        avg: targetEngagements,
        min: minTargetEngagements,
        max: maxTargetEngagements,
        engagementRate: overallAvgEngagementRate,
      },
      cost: dailyCost,
    },
    monthly: {
      posts: monthlyPosts,
      impressions: monthlyImpressions,
      engagements: monthlyEngagements,
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
    const report = await displayFinalReport();
    
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
  getActualEngagementRate,
  calculateEngagementCount,
  displayFinalReport,
};
