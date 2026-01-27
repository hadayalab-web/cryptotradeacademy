// scripts/calculate-influencer-distribution-500-posts.js
// 1日500投稿を想定した6言語のインフルエンサー配分を計算

/**
 * 1日500投稿の配分計算
 * 
 * 前提条件:
 * - Quote Repost Cron: 1日12回実行（0,2,4,6,8,10,12,14,16,18,20,22 UTC）
 * - 1日500投稿 = 1回あたり平均41.7投稿（500 / 12）
 * - 6言語で配分
 */

const CRON_RUNS_PER_DAY = 12; // Quote Repost Cron実行回数
const TARGET_POSTS_PER_DAY = 500;
const POSTS_PER_CRON_RUN = TARGET_POSTS_PER_DAY / CRON_RUNS_PER_DAY; // 約41.7投稿/回

// 言語別の重要度と市場規模を考慮した配分
const LANG_DISTRIBUTION = {
  // 英語: 最大市場、最高優先度
  en: {
    weight: 0.40, // 40% = 200投稿/日
    postsPerDay: Math.round(TARGET_POSTS_PER_DAY * 0.40),
    postsPerRun: Math.round(TARGET_POSTS_PER_DAY * 0.40 / CRON_RUNS_PER_DAY),
    reason: '最大市場、最高エンゲージメント率',
  },
  // スペイン語: ラテンアメリカ市場
  es: {
    weight: 0.20, // 20% = 100投稿/日
    postsPerDay: Math.round(TARGET_POSTS_PER_DAY * 0.20),
    postsPerRun: Math.round(TARGET_POSTS_PER_DAY * 0.20 / CRON_RUNS_PER_DAY),
    reason: 'ラテンアメリカ市場、高成長',
  },
  // ポルトガル語: ブラジル市場
  'pt-br': {
    weight: 0.15, // 15% = 75投稿/日
    postsPerDay: Math.round(TARGET_POSTS_PER_DAY * 0.15),
    postsPerRun: Math.round(TARGET_POSTS_PER_DAY * 0.15 / CRON_RUNS_PER_DAY),
    reason: 'ブラジル市場、高エンゲージメント',
  },
  // アラビア語: 中東市場
  ar: {
    weight: 0.10, // 10% = 50投稿/日
    postsPerDay: Math.round(TARGET_POSTS_PER_DAY * 0.10),
    postsPerRun: Math.round(TARGET_POSTS_PER_DAY * 0.10 / CRON_RUNS_PER_DAY),
    reason: '中東市場、高購買力',
  },
  // 日本語: アジア市場
  ja: {
    weight: 0.10, // 10% = 50投稿/日
    postsPerDay: Math.round(TARGET_POSTS_PER_DAY * 0.10),
    postsPerRun: Math.round(TARGET_POSTS_PER_DAY * 0.10 / CRON_RUNS_PER_DAY),
    reason: '日本市場、最高ER（12.5%）',
  },
  // 韓国語: アジア市場
  ko: {
    weight: 0.05, // 5% = 25投稿/日
    postsPerDay: Math.round(TARGET_POSTS_PER_DAY * 0.05),
    postsPerRun: Math.round(TARGET_POSTS_PER_DAY * 0.05 / CRON_RUNS_PER_DAY),
    reason: '韓国市場、安定した需要',
  },
};

// 各言語に必要なインフルエンサー数を計算
// 前提: 1人あたり最大4回/日、8時間クールダウン
const MAX_POSTS_PER_INFLUENCER_PER_DAY = 4;
const COOLDOWN_HOURS = 8;

function calculateInfluencersNeeded(lang, postsPerDay) {
  // 1人あたり最大4回/日なので、最低限必要な人数
  const minInfluencers = Math.ceil(postsPerDay / MAX_POSTS_PER_INFLUENCER_PER_DAY);
  
  // 余裕を持たせるため、1.5倍の人数を確保（ローテーション用）
  const recommendedInfluencers = Math.ceil(minInfluencers * 1.5);
  
  // ストック数は投稿用の2倍を確保（選択肢を増やす）
  const stockInfluencers = recommendedInfluencers * 2;
  
  return {
    min: minInfluencers,
    recommended: recommendedInfluencers,
    stock: stockInfluencers,
  };
}

function calculateDistribution() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 1日500投稿を想定したインフルエンサー配分計算');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log(`🎯 目標: ${TARGET_POSTS_PER_DAY}投稿/日`);
  console.log(`📅 Cron実行回数: ${CRON_RUNS_PER_DAY}回/日`);
  console.log(`📈 1回あたり平均: ${POSTS_PER_CRON_RUN.toFixed(1)}投稿\n`);
  
  const results = {};
  let totalPosts = 0;
  let totalRecommended = 0;
  let totalStock = 0;
  
  for (const [lang, config] of Object.entries(LANG_DISTRIBUTION)) {
    const influencers = calculateInfluencersNeeded(lang, config.postsPerDay);
    
    results[lang] = {
      ...config,
      influencers,
    };
    
    totalPosts += config.postsPerDay;
    totalRecommended += influencers.recommended;
    totalStock += influencers.stock;
    
    console.log(`📊 ${lang.toUpperCase()} 言語:`);
    console.log(`   配分: ${(config.weight * 100).toFixed(0)}% (${config.postsPerDay}投稿/日)`);
    console.log(`   1回あたり: ${config.postsPerRun}投稿`);
    console.log(`   理由: ${config.reason}`);
    console.log(`   必要インフルエンサー数:`);
    console.log(`     - 最低: ${influencers.min}人`);
    console.log(`     - 推奨: ${influencers.recommended}人（投稿用）`);
    console.log(`     - ストック: ${influencers.stock}人（選択肢確保）`);
    console.log('');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 サマリー');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log(`✅ 合計投稿数: ${totalPosts}投稿/日`);
  console.log(`✅ 推奨インフルエンサー数（投稿用）: ${totalRecommended}人`);
  console.log(`✅ ストックインフルエンサー数: ${totalStock}人\n`);
  
  console.log('📋 言語別内訳:');
  for (const [lang, result] of Object.entries(results)) {
    console.log(`   ${lang.toUpperCase()}: ${result.postsPerDay}投稿/日, ${result.influencers.recommended}人（投稿用）, ${result.influencers.stock}人（ストック）`);
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 推奨アクション');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('1. Grok APIで各言語のストック数を確保:');
  for (const [lang, result] of Object.entries(results)) {
    console.log(`   - ${lang.toUpperCase()}: ${result.influencers.stock}人をストック`);
  }
  
  console.log('\n2. ローテーション戦略:');
  console.log('   - 1人あたり最大4回/日');
  console.log('   - 8時間クールダウン');
  console.log('   - ストックからローテーションで選択');
  
  console.log('\n3. ピーク時間の配分:');
  console.log('   - ピーク時間（UTC 0,1,20,21,22）: 通常の1.2倍');
  console.log('   - オフピーク時間（UTC 13,14）: 通常の0.4倍');
  
  return results;
}

if (require.main === module) {
  const results = calculateDistribution();
  
  // JSONファイルに保存
  const fs = require('fs');
  const path = require('path');
  const outputPath = path.join(__dirname, '../data/influencer-distribution-500-posts.json');
  
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n✅ 結果を保存: ${outputPath}\n`);
}

module.exports = { calculateDistribution, LANG_DISTRIBUTION };
