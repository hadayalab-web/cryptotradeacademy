// scripts/check-influencer-stock.js
// KVストックに保存されているインフルエンサー数を確認するスクリプト

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const { getInfluencersFromStock, getStockUpdateTime } = require('../services/x/influencerStock');

async function checkStockStatus() {
  const langs = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
  
  console.log('========================================');
  console.log('KVストック インフルエンサー数確認');
  console.log('========================================\n');
  
  const results = {};
  
  for (const lang of langs) {
    try {
      const influencers = await getInfluencersFromStock(lang);
      const updateTime = await getStockUpdateTime(lang);
      
      results[lang] = {
        count: influencers.length,
        updateTime: updateTime || '未更新',
        influencers: influencers.slice(0, 5), // 最初の5人だけ表示用
      };
      
      console.log(`📊 ${lang.toUpperCase()}:`);
      console.log(`   - ストック数: ${influencers.length}人`);
      console.log(`   - 最終更新: ${updateTime || '未更新'}`);
      
      if (influencers.length > 0) {
        const avgEngagement = influencers.reduce((sum, inf) => sum + (inf.engagementRate || 0), 0) / influencers.length;
        const avgImpressions = influencers.reduce((sum, inf) => sum + (inf.recentImpressions || 0), 0) / influencers.length;
        console.log(`   - 平均エンゲージメント率: ${(avgEngagement * 100).toFixed(2)}%`);
        console.log(`   - 平均インプレッション: ${avgImpressions.toLocaleString()}`);
        console.log(`   - Top 5:`);
        influencers.slice(0, 5).forEach((inf, idx) => {
          const engagementRate = (inf.engagementRate || 0) * 100;
          const impressions = inf.recentImpressions || 0;
          console.log(`     ${idx + 1}. @${inf.username} - ${engagementRate.toFixed(2)}% engagement, ${impressions.toLocaleString()} impressions`);
        });
      }
      console.log('');
    } catch (error) {
      console.error(`❌ ${lang.toUpperCase()} の確認中にエラー:`, error.message);
      results[lang] = {
        count: 0,
        updateTime: 'エラー',
        error: error.message,
      };
    }
  }
  
  console.log('========================================');
  console.log('サマリー');
  console.log('========================================');
  
  const totalCount = Object.values(results).reduce((sum, r) => sum + (r.count || 0), 0);
  console.log(`総ストック数: ${totalCount}人\n`);
  
  langs.forEach(lang => {
    const result = results[lang];
    const status = result.count > 0 ? '✅' : '❌';
    console.log(`${status} ${lang.toUpperCase()}: ${result.count}人 ${result.updateTime !== '未更新' && result.updateTime !== 'エラー' ? `(更新: ${new Date(result.updateTime).toLocaleString('ja-JP')})` : ''}`);
  });
  
  console.log('========================================\n');
  
  return results;
}

async function main() {
  try {
    await checkStockStatus();
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

module.exports = { checkStockStatus };
