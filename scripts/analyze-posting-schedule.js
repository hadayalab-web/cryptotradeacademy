// scripts/analyze-posting-schedule.js
// 投稿予測数と投稿スケジュールを分析

const { LANG_DISTRIBUTION } = require('./calculate-influencer-distribution-500-posts');
const { getInfluencerCountForLang, HOURLY_DISTRIBUTION } = require('../config/influencerStrategy');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 投稿予測数と投稿スケジュール分析');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Cronスケジュール（vercel.jsonから）
const cronHours = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
const langs = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

console.log('📅 Cronスケジュール:');
console.log(`   実行時間（UTC）: ${cronHours.join(', ')}`);
console.log(`   実行回数: ${cronHours.length}回/日\n`);

console.log('⏰ 時価配分設定:');
console.log(`   ピーク時間（UTC ${HOURLY_DISTRIBUTION.peak.hours.join(', ')}）: ${(HOURLY_DISTRIBUTION.peak.multiplier * 100).toFixed(0)}%`);
console.log(`   オフピーク時間（UTC ${HOURLY_DISTRIBUTION.offPeak.hours.join(', ')}）: ${(HOURLY_DISTRIBUTION.offPeak.multiplier * 100).toFixed(0)}%\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 言語別投稿予測数');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let totalPosts = 0;
const results = {};

langs.forEach(lang => {
  let langTotal = 0;
  const hourlyBreakdown = {};
  
  cronHours.forEach(hour => {
    const count = getInfluencerCountForLang(lang, hour);
    langTotal += count;
    hourlyBreakdown[hour] = count;
  });
  
  totalPosts += langTotal;
  const target = LANG_DISTRIBUTION[lang]?.postsPerDay || 0;
  const diff = langTotal - target;
  
  results[lang] = {
    predicted: langTotal,
    target: target,
    diff: diff,
    hourlyBreakdown: hourlyBreakdown
  };
  
  console.log(`${lang.toUpperCase()}:`);
  console.log(`  予測: ${langTotal}投稿/日`);
  console.log(`  目標: ${target}投稿/日`);
  console.log(`  差分: ${diff > 0 ? '+' : ''}${diff}投稿/日`);
  
  // 時価別の内訳を表示
  const peakHours = HOURLY_DISTRIBUTION.peak.hours.filter(h => cronHours.includes(h));
  const offPeakHours = HOURLY_DISTRIBUTION.offPeak.hours.filter(h => cronHours.includes(h));
  const normalHours = cronHours.filter(h => !peakHours.includes(h) && !offPeakHours.includes(h));
  
  let peakTotal = 0;
  let offPeakTotal = 0;
  let normalTotal = 0;
  
  peakHours.forEach(h => peakTotal += hourlyBreakdown[h] || 0);
  offPeakHours.forEach(h => offPeakTotal += hourlyBreakdown[h] || 0);
  normalHours.forEach(h => normalTotal += hourlyBreakdown[h] || 0);
  
  console.log(`  内訳:`);
  console.log(`    - ピーク時間（${peakHours.length}回）: ${peakTotal}投稿`);
  console.log(`    - 通常時間（${normalHours.length}回）: ${normalTotal}投稿`);
  console.log(`    - オフピーク時間（${offPeakHours.length}回）: ${offPeakTotal}投稿`);
  console.log('');
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 合計');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log(`予測合計: ${totalPosts}投稿/日`);
console.log(`目標合計: 500投稿/日`);
console.log(`差分: ${totalPosts - 500 > 0 ? '+' : ''}${totalPosts - 500}投稿/日\n`);

// 時価別の合計投稿数
const peakHours = HOURLY_DISTRIBUTION.peak.hours.filter(h => cronHours.includes(h));
const offPeakHours = HOURLY_DISTRIBUTION.offPeak.hours.filter(h => cronHours.includes(h));
const normalHours = cronHours.filter(h => !peakHours.includes(h) && !offPeakHours.includes(h));

let peakTotal = 0;
let offPeakTotal = 0;
let normalTotal = 0;

langs.forEach(lang => {
  peakHours.forEach(h => peakTotal += results[lang].hourlyBreakdown[h] || 0);
  offPeakHours.forEach(h => offPeakTotal += results[lang].hourlyBreakdown[h] || 0);
  normalHours.forEach(h => normalTotal += results[lang].hourlyBreakdown[h] || 0);
});

console.log('時価別合計投稿数:');
console.log(`  ピーク時間（${peakHours.length}回）: ${peakTotal}投稿`);
console.log(`  通常時間（${normalHours.length}回）: ${normalTotal}投稿`);
console.log(`  オフピーク時間（${offPeakHours.length}回）: ${offPeakTotal}投稿\n`);

// 1回あたりの平均投稿数
console.log('1回あたりの平均投稿数:');
console.log(`  ピーク時間: ${(peakTotal / peakHours.length).toFixed(1)}投稿/回`);
console.log(`  通常時間: ${(normalTotal / normalHours.length).toFixed(1)}投稿/回`);
console.log(`  オフピーク時間: ${(offPeakTotal / offPeakHours.length).toFixed(1)}投稿/回`);
console.log(`  全体平均: ${(totalPosts / cronHours.length).toFixed(1)}投稿/回\n`);

// 推奨アクション
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🎯 推奨アクション');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (totalPosts < 500) {
  const shortage = 500 - totalPosts;
  console.log(`⚠️ 目標投稿数に不足: ${shortage}投稿/日`);
  console.log(`   対策: インフルエンサー数を増やすか、Cron実行回数を増やす`);
} else if (totalPosts > 500) {
  const excess = totalPosts - 500;
  console.log(`⚠️ 目標投稿数を超過: ${excess}投稿/日`);
  console.log(`   対策: インフルエンサー数を減らすか、Cron実行回数を減らす`);
} else {
  console.log(`✅ 目標投稿数と一致しています`);
}

console.log('\n言語別の調整が必要な場合:');
langs.forEach(lang => {
  const diff = results[lang].diff;
  if (Math.abs(diff) > 5) {
    console.log(`   ${lang.toUpperCase()}: ${diff > 0 ? '+' : ''}${diff}投稿/日の${diff > 0 ? '超過' : '不足'}`);
  }
});

module.exports = { results, totalPosts };
