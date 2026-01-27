// scripts/calculate-engagement-impressions-from-posts.js
// 実際の投稿数予測から平均ERと合計インプレッションを計算

require('dotenv').config({ path: '.env' });

const { kv } = require('../utils/kv');
const { LANG_DISTRIBUTION } = require('./calculate-influencer-distribution-500-posts');

const STOCK_KEY_PREFIX = 'x:influencer_stock:';
const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

// 実際の投稿数予測（3つのシナリオ）
const POST_SCENARIOS = {
  best: {
    name: '最良のケース',
    postsPerDay: 520,
    description: 'ローテーション制約により若干減少',
  },
  realistic: {
    name: '現実的なケース',
    postsPerDay: 490,
    description: 'ローテーション制約 + エラー・失敗（5-10%）',
  },
  worst: {
    name: '最悪のケース',
    postsPerDay: 465,
    description: 'ストック不足 + 多数のエラー + レート制限',
  },
};

async function calculateEngagementAndImpressions() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 実際の投稿数予測から平均ERと合計インプレッションを計算');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // KVストレージからインフルエンサーデータを取得
  const influencerData = {};
  let totalInfluencers = 0;

  for (const lang of SUPPORTED_LANGS) {
    const stockKey = `${STOCK_KEY_PREFIX}${lang}`;
    try {
      const stockData = await kv.get(stockKey);
      if (stockData && Array.isArray(stockData) && stockData.length > 0) {
        influencerData[lang] = stockData;
        totalInfluencers += stockData.length;
      }
    } catch (error) {
      console.error(`❌ Failed to get influencers for ${lang}: ${error.message}`);
    }
  }

  console.log(`📊 インフルエンサーデータ取得完了: 合計 ${totalInfluencers}人\n`);

  // 言語別の統計を計算
  const langStats = {};
  for (const [lang, influencers] of Object.entries(influencerData)) {
    if (!influencers || influencers.length === 0) continue;

    const totalER = influencers.reduce((sum, inf) => sum + (inf.engagementRate || 0), 0);
    const avgER = totalER / influencers.length;
    const totalImpressions = influencers.reduce((sum, inf) => sum + (inf.recentImpressions || 0), 0);
    const avgImpressions = totalImpressions / influencers.length;

    langStats[lang] = {
      count: influencers.length,
      avgER,
      avgImpressions,
      totalImpressions,
    };
  }

  // 全体の統計を計算
  let totalERSum = 0;
  let totalImpressionsSum = 0;
  let totalCount = 0;

  for (const stats of Object.values(langStats)) {
    totalERSum += stats.avgER * stats.count;
    totalImpressionsSum += stats.totalImpressions;
    totalCount += stats.count;
  }

  const overallAvgER = totalERSum / totalCount;
  const overallAvgImpressions = totalImpressionsSum / totalCount;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 インフルエンサー統計（ストック全体）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const [lang, stats] of Object.entries(langStats)) {
    console.log(`📊 ${lang.toUpperCase()} 言語:`);
    console.log(`   ストック数: ${stats.count}人`);
    console.log(`   平均ER: ${(stats.avgER * 100).toFixed(2)}%`);
    console.log(`   平均インプレッション: ${stats.avgImpressions.toLocaleString()}`);
    console.log(`   合計インプレッション（ストック全体）: ${stats.totalImpressions.toLocaleString()}`);
    console.log('');
  }

  console.log(`📊 全体統計:`);
  console.log(`   合計ストック数: ${totalCount}人`);
  console.log(`   全体平均ER: ${(overallAvgER * 100).toFixed(2)}%`);
  console.log(`   全体平均インプレッション: ${overallAvgImpressions.toLocaleString()}\n`);

  // 各シナリオでの予測を計算
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 実際の投稿数予測から平均ERと合計インプレッションを計算');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results = {};

  for (const [scenarioKey, scenario] of Object.entries(POST_SCENARIOS)) {
    const postsPerDay = scenario.postsPerDay;
    
    // 言語別の投稿数を配分（LANG_DISTRIBUTIONの比率を使用）
    const langPosts = {};
    let totalLangPosts = 0;

    for (const [lang, distribution] of Object.entries(LANG_DISTRIBUTION)) {
      const langPostCount = Math.round(postsPerDay * distribution.weight);
      langPosts[lang] = langPostCount;
      totalLangPosts += langPostCount;
    }

    // 合計が目標と異なる場合は調整
    const adjustment = postsPerDay - totalLangPosts;
    if (adjustment !== 0) {
      // ENに調整分を追加（最大市場のため）
      langPosts['en'] = (langPosts['en'] || 0) + adjustment;
    }

    // 言語別の統計を計算
    let totalEngagements = 0;
    let totalImpressions = 0;

    for (const [lang, postCount] of Object.entries(langPosts)) {
      const stats = langStats[lang];
      if (!stats) continue;

      // 1投稿あたりの平均インプレッション
      const impressionsPerPost = stats.avgImpressions;
      
      // 合計インプレッション
      const langTotalImpressions = impressionsPerPost * postCount;
      totalImpressions += langTotalImpressions;

      // 合計エンゲージメント（インプレッション × ER）
      const langTotalEngagements = langTotalImpressions * stats.avgER;
      totalEngagements += langTotalEngagements;
    }

    // 平均ERを計算（合計エンゲージメント / 合計インプレッション）
    const avgER = totalImpressions > 0 ? totalEngagements / totalImpressions : 0;

    results[scenarioKey] = {
      name: scenario.name,
      postsPerDay,
      description: scenario.description,
      langPosts,
      totalImpressions,
      avgER,
      totalEngagements,
    };

    console.log(`📊 ${scenario.name}:`);
    console.log(`   投稿数: ${postsPerDay}投稿/日`);
    console.log(`   説明: ${scenario.description}`);
    console.log(`   言語別投稿数:`);
    for (const [lang, postCount] of Object.entries(langPosts)) {
      const stats = langStats[lang];
      if (stats) {
        const langImpressions = stats.avgImpressions * postCount;
        const langEngagements = langImpressions * stats.avgER;
        console.log(`     - ${lang.toUpperCase()}: ${postCount}投稿 → ${langImpressions.toLocaleString()}インプレッション, ${langEngagements.toLocaleString()}エンゲージメント`);
      }
    }
    console.log(`   合計インプレッション: ${totalImpressions.toLocaleString()}`);
    console.log(`   平均ER: ${(avgER * 100).toFixed(2)}%`);
    console.log(`   合計エンゲージメント: ${totalEngagements.toLocaleString()}`);
    console.log('');
  }

  // サマリー
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 サマリー');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('| シナリオ | 投稿数/日 | 合計インプレッション | 平均ER | 合計エンゲージメント |');
  console.log('|---------|---------|-------------------|--------|-------------------|');
  for (const [key, result] of Object.entries(results)) {
    console.log(`| ${result.name} | ${result.postsPerDay} | ${result.totalImpressions.toLocaleString()} | ${(result.avgER * 100).toFixed(2)}% | ${result.totalEngagements.toLocaleString()} |`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 詳細分析');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 現実的なケースを詳細分析
  const realistic = results.realistic;
  console.log(`📊 ${realistic.name}（推奨）:`);
  console.log(`   投稿数: ${realistic.postsPerDay}投稿/日`);
  console.log(`   合計インプレッション: ${realistic.totalImpressions.toLocaleString()}`);
  console.log(`   平均ER: ${(realistic.avgER * 100).toFixed(2)}%`);
  console.log(`   合計エンゲージメント: ${realistic.totalEngagements.toLocaleString()}`);
  console.log(`   1投稿あたり平均インプレッション: ${(realistic.totalImpressions / realistic.postsPerDay).toLocaleString()}`);
  console.log(`   1投稿あたり平均エンゲージメント: ${(realistic.totalEngagements / realistic.postsPerDay).toLocaleString()}\n`);

  // JSONファイルに保存
  const fs = require('fs');
  const path = require('path');
  const outputPath = path.join(__dirname, '../data/engagement-impressions-prediction.json');
  
  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    influencerStats: langStats,
    overallStats: {
      totalInfluencers: totalCount,
      avgER: overallAvgER,
      avgImpressions: overallAvgImpressions,
    },
    predictions: results,
  }, null, 2), 'utf8');
  
  console.log(`✅ 結果を保存: ${outputPath}\n`);

  return results;
}

if (require.main === module) {
  calculateEngagementAndImpressions()
    .then(() => {
      console.log('✅ 完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { calculateEngagementAndImpressions };
