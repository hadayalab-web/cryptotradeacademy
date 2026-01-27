// scripts/verify-500-posts-implementation.js
// 1日500投稿の実装が正確に動くか検証

require('dotenv').config({ path: '.env' });

const { getInfluencerCountForLang, HOURLY_DISTRIBUTION } = require('../config/influencerStrategy');
const { LANG_DISTRIBUTION } = require('./calculate-influencer-distribution-500-posts');

const CRON_RUNS_PER_DAY = 12; // Quote Repost Cron実行回数
const TARGET_POSTS_PER_DAY = 500;

function verifyImplementation() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 1日500投稿の実装検証');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`🎯 目標: ${TARGET_POSTS_PER_DAY}投稿/日`);
  console.log(`📅 Cron実行回数: ${CRON_RUNS_PER_DAY}回/日\n`);

  // ピーク時間とオフピーク時間の投稿数を計算
  const peakHours = HOURLY_DISTRIBUTION.peak.hours;
  const offPeakHours = HOURLY_DISTRIBUTION.offPeak.hours;
  const normalHours = Array.from({ length: 24 }, (_, i) => i)
    .filter(h => !peakHours.includes(h) && !offPeakHours.includes(h));

  const peakRuns = peakHours.length; // 5回
  const offPeakRuns = offPeakHours.length; // 2回
  const normalRuns = CRON_RUNS_PER_DAY - peakRuns - offPeakRuns; // 5回

  console.log(`📊 Cron実行内訳:`);
  console.log(`   - ピーク時間: ${peakRuns}回 (UTC ${peakHours.join(', ')})`);
  console.log(`   - オフピーク時間: ${offPeakRuns}回 (UTC ${offPeakHours.join(', ')})`);
  console.log(`   - 通常時間: ${normalRuns}回\n`);

  const results = {};
  let totalPosts = 0;

  for (const [lang, distribution] of Object.entries(LANG_DISTRIBUTION)) {
    const peakCount = getInfluencerCountForLang(lang, peakHours[0]);
    const offPeakCount = getInfluencerCountForLang(lang, offPeakHours[0]);
    const normalCount = getInfluencerCountForLang(lang, normalHours[0] || 2);

    // 1日の投稿数を計算
    const postsPerDay = 
      (peakCount * peakRuns) + 
      (offPeakCount * offPeakRuns) + 
      (normalCount * normalRuns);

    const targetPosts = distribution.postsPerDay;
    const diff = postsPerDay - targetPosts;
    const isCorrect = Math.abs(diff) <= 2; // 2投稿以内の誤差は許容

    results[lang] = {
      peakCount,
      offPeakCount,
      normalCount,
      postsPerDay,
      targetPosts,
      diff,
      isCorrect,
    };

    totalPosts += postsPerDay;

    console.log(`📊 ${lang.toUpperCase()} 言語:`);
    console.log(`   ピーク時間: ${peakCount}人/回 × ${peakRuns}回 = ${peakCount * peakRuns}投稿`);
    console.log(`   オフピーク時間: ${offPeakCount}人/回 × ${offPeakRuns}回 = ${offPeakCount * offPeakRuns}投稿`);
    console.log(`   通常時間: ${normalCount}人/回 × ${normalRuns}回 = ${normalCount * normalRuns}投稿`);
    console.log(`   合計: ${postsPerDay}投稿/日 (目標: ${targetPosts}投稿/日)`);
    if (isCorrect) {
      console.log(`   ✅ 目標達成`);
    } else {
      console.log(`   ❌ 目標との差: ${diff > 0 ? '+' : ''}${diff}投稿`);
    }
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 検証結果サマリー');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const allCorrect = Object.values(results).every(r => r.isCorrect);
  const totalTarget = Object.values(LANG_DISTRIBUTION).reduce((sum, d) => sum + d.postsPerDay, 0);
  const totalDiff = totalPosts - totalTarget;

  console.log(`✅ 合計投稿数: ${totalPosts}投稿/日`);
  console.log(`🎯 目標投稿数: ${totalTarget}投稿/日`);
  console.log(`📊 差: ${totalDiff > 0 ? '+' : ''}${totalDiff}投稿\n`);

  if (allCorrect && Math.abs(totalDiff) <= 5) {
    console.log('✅✅✅ 実装は正確です！1日500投稿を達成できます。\n');
  } else {
    console.log('⚠️ 実装に問題があります。以下の修正が必要です:\n');
    
    for (const [lang, result] of Object.entries(results)) {
      if (!result.isCorrect) {
        console.log(`   ❌ ${lang.toUpperCase()}: ${result.postsPerDay}投稿/日 (目標: ${result.targetPosts}投稿/日)`);
        console.log(`      修正が必要: ${result.diff > 0 ? '減らす' : '増やす'} ${Math.abs(result.diff)}投稿`);
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 推奨アクション');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (allCorrect && Math.abs(totalDiff) <= 5) {
    console.log('✅ 実装は正確です。追加の修正は不要です。');
  } else {
    console.log('1. `config/influencerStrategy.js`の`INFLUENCER_COUNT_BY_LANG`を調整');
    console.log('2. 環境変数で各言語の投稿数を調整可能にする');
    console.log('3. 再度検証スクリプトを実行して確認');
  }

  return { allCorrect, totalPosts, totalTarget, results };
}

if (require.main === module) {
  const result = verifyImplementation();
  process.exit(result.allCorrect ? 0 : 1);
}

module.exports = { verifyImplementation };
