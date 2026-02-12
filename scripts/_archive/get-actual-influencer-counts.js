// scripts/get-actual-influencer-counts.js
// KVストレージから実際のインフルエンサー数を取得して、正確な投稿数を計算

require('dotenv').config({ path: '.env' });

const { getInfluencersFromStock } = require('../services/x/influencerStock');
const { getInfluencerCountForLang } = require('../config/influencerStrategy');
const { getPeakMapForHour } = require('../services/x/optimization');

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

/**
 * KVストレージから実際のインフルエンサー数を取得
 */
async function getActualInfluencerCounts() {
  console.log('🔍 KVストレージから実際のインフルエンサー数を取得中...\n');
  
  const actualCounts = {};
  const configCounts = {};
  
  for (const lang of SUPPORTED_LANGS) {
    try {
      // KVストレージから実際のインフルエンサー数を取得
      const influencers = await getInfluencersFromStock(lang);
      actualCounts[lang] = influencers.length;
      
      // 設定値から取得
      configCounts[lang] = getInfluencerCountForLang(lang);
      
      console.log(`📊 ${lang.toUpperCase()}:`);
      console.log(`   KVストレージ: ${actualCounts[lang]}人`);
      console.log(`   設定値（ピーク時間）: ${configCounts[lang]}人`);
      
      if (actualCounts[lang] !== configCounts[lang]) {
        console.log(`   ⚠️  不一致: KVストレージ(${actualCounts[lang]}) vs 設定値(${configCounts[lang]})`);
      }
    } catch (error) {
      console.error(`❌ ${lang.toUpperCase()}: エラー - ${error.message}`);
      actualCounts[lang] = 0;
      configCounts[lang] = getInfluencerCountForLang(lang);
    }
  }
  
  return { actualCounts, configCounts };
}

/**
 * 実際のインフルエンサー数に基づいて投稿数を計算
 */
function calculatePostsWithActualCounts(actualCounts) {
  const peakHours = [0, 1, 20, 21, 22];
  const offPeakHours = [13, 14];
  const offPeakMultiplier = 0.4;
  
  // getInfluencerCountForLangの実装を正確に再現
  function getInfluencerCountForLangActual(lang, hour) {
    const baseCount = actualCounts[lang] || 0;
    if (offPeakHours.includes(hour)) {
      return Math.max(1, Math.floor(baseCount * offPeakMultiplier));
    }
    return baseCount;
  }

  // getPeakMapForHourの設定を正確に反映
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
      const influencerCount = getInfluencerCountForLangActual(lang, hourNum);
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
 * 設定値に基づいて投稿数を計算（比較用）
 */
function calculatePostsWithConfigCounts() {
  const { getInfluencerCountForLang } = require('../config/influencerStrategy');
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
 * メイン処理
 */
async function main() {
  try {
    console.log('='.repeat(80));
    console.log('📊 実際のインフルエンサー数と投稿数計算');
    console.log('='.repeat(80));
    console.log('');
    
    // 実際のKVストレージからインフルエンサー数を取得
    const { actualCounts, configCounts } = await getActualInfluencerCounts();
    
    console.log('\n' + '='.repeat(80));
    console.log('📈 投稿数計算（KVストレージの実際の数値を使用）');
    console.log('='.repeat(80));
    
    // 実際の数値で計算
    const actualResult = calculatePostsWithActualCounts(actualCounts);
    console.log(`\n✅ 実際のKVストレージ数値に基づく投稿数: ${actualResult.totalDailyPosts}投稿/日`);
    
    console.log('\n⏰ 時間帯別投稿数（実際のKVストレージ数値）:');
    const sortedHours = Object.keys(actualResult.hourlyBreakdown).map(Number).sort((a, b) => a - b);
    for (const hour of sortedHours) {
      const config = actualResult.hourlyBreakdown[hour];
      const langDetailsStr = Object.entries(config.langDetails)
        .map(([lang, count]) => `${lang}:${count}`)
        .join(', ');
      console.log(`  UTC ${String(hour).padStart(2, '0')}:00 - ${config.langs.join(', ')} (${config.type}, count: ${config.count})`);
      console.log(`    → ${langDetailsStr} = ${config.postsPerRun}投稿/回 × ${config.count}回 = ${config.totalPosts}投稿`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📈 投稿数計算（設定値を使用）');
    console.log('='.repeat(80));
    
    // 設定値で計算（比較用）
    const configResult = calculatePostsWithConfigCounts();
    console.log(`\n✅ 設定値に基づく投稿数: ${configResult.totalDailyPosts}投稿/日`);
    
    console.log('\n⏰ 時間帯別投稿数（設定値）:');
    const sortedHoursConfig = Object.keys(configResult.hourlyBreakdown).map(Number).sort((a, b) => a - b);
    for (const hour of sortedHoursConfig) {
      const config = configResult.hourlyBreakdown[hour];
      const langDetailsStr = Object.entries(config.langDetails)
        .map(([lang, count]) => `${lang}:${count}`)
        .join(', ');
      console.log(`  UTC ${String(hour).padStart(2, '0')}:00 - ${config.langs.join(', ')} (${config.type}, count: ${config.count})`);
      console.log(`    → ${langDetailsStr} = ${config.postsPerRun}投稿/回 × ${config.count}回 = ${config.totalPosts}投稿`);
    }
    
    // 比較
    console.log('\n' + '='.repeat(80));
    console.log('📊 比較サマリー');
    console.log('='.repeat(80));
    console.log(`実際のKVストレージ数値: ${actualResult.totalDailyPosts}投稿/日`);
    console.log(`設定値: ${configResult.totalDailyPosts}投稿/日`);
    console.log(`差分: ${actualResult.totalDailyPosts - configResult.totalDailyPosts}投稿/日`);
    
    console.log('\n言語別インフルエンサー数比較:');
    for (const lang of SUPPORTED_LANGS) {
      const actual = actualCounts[lang] || 0;
      const config = configCounts[lang] || 0;
      const diff = actual - config;
      const status = diff === 0 ? '✅' : diff > 0 ? '📈' : '📉';
      console.log(`  ${status} ${lang.toUpperCase()}: KV=${actual}人, 設定=${config}人 (差分: ${diff > 0 ? '+' : ''}${diff})`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ 完了');
    console.log('='.repeat(80));
    
    return {
      actualCounts,
      configCounts,
      actualPosts: actualResult.totalDailyPosts,
      configPosts: configResult.totalDailyPosts,
      hourlyBreakdown: actualResult.hourlyBreakdown,
    };
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

module.exports = { getActualInfluencerCounts, calculatePostsWithActualCounts };
