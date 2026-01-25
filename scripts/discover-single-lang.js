// scripts/discover-single-lang.js
// 単一言語のインフルエンサーを最大限発見するスクリプト

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const { discoverInfluencersForQuoteRepost } = require('../services/grok/client');
const { selectInfluencersForHighEngagement, getStockCountForLang } = require('../config/influencerStrategy');

async function discoverMaxInfluencers(lang) {
  const targetLang = (lang || 'en').toLowerCase();
  const stockCount = getStockCountForLang(targetLang);
  
  console.log(`\n========================================`);
  console.log(`🔍 Discovering MAX influencers for ${targetLang.toUpperCase()}`);
  console.log(`Target stock: ${stockCount} influencers`);
  console.log(`========================================\n`);
  
  // 最大限の候補数を取得（複数回リクエスト、時間短縮のため最適化）
  const maxCandidatesPerRequest = 50;
  const totalRequests = 3; // 3回リクエストして最大150人を取得（時間短縮）
  const allInfluencers = [];
  
  for (let i = 0; i < totalRequests; i++) {
    console.log(`[Discovery] Request ${i + 1}/${totalRequests}...`);
    try {
      const influencers = await discoverInfluencersForQuoteRepost(targetLang, { 
        maxResults: maxCandidatesPerRequest 
      });
      
      if (influencers && influencers.length > 0) {
        const existingUsernames = new Set(allInfluencers.map(inf => inf.username));
        const newInfluencers = influencers.filter(inf => !existingUsernames.has(inf.username));
        allInfluencers.push(...newInfluencers);
        console.log(`[Discovery] Found ${influencers.length} influencers (${newInfluencers.length} new, total: ${allInfluencers.length})`);
      }
      
      // 待機時間を短縮（3秒→1秒）
      if (i < totalRequests - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`[Discovery] Request ${i + 1} failed:`, error.message);
    }
  }
  
  console.log(`\n[Discovery] Total unique influencers found: ${allInfluencers.length}`);
  
  // エンゲージメント率でフィルタリング（最低4%以上）
  const highEngagementInfluencers = allInfluencers.filter(inf => {
    const engagementRate = inf.engagementRate || 0;
    return engagementRate >= 0.04;
  });
  
  console.log(`[Discovery] High engagement (4%+): ${highEngagementInfluencers.length} influencers`);
  
  // 好反応率重視で選択
  const selectedInfluencers = selectInfluencersForHighEngagement(
    highEngagementInfluencers.length > 0 ? highEngagementInfluencers : allInfluencers,
    targetLang
  );
  
  console.log(`\n[Discovery] ✅ Selected ${selectedInfluencers.length} top influencers for ${targetLang}`);
  
  // 統計を表示
  if (selectedInfluencers.length > 0) {
    const avgEngagement = selectedInfluencers.reduce((sum, inf) => sum + (inf.engagementRate || 0), 0) / selectedInfluencers.length;
    const avgImpressions = selectedInfluencers.reduce((sum, inf) => sum + (inf.recentImpressions || 0), 0) / selectedInfluencers.length;
    const maxEngagement = Math.max(...selectedInfluencers.map(inf => (inf.engagementRate || 0) * 100));
    
    console.log(`\n📊 Statistics:`);
    console.log(`   - Average engagement rate: ${(avgEngagement * 100).toFixed(2)}%`);
    console.log(`   - Maximum engagement rate: ${maxEngagement.toFixed(2)}%`);
    console.log(`   - Average impressions: ${avgImpressions.toLocaleString()}`);
  }
  
  // Top 10を表示
  console.log(`\n📊 Top 10 Influencers:`);
  selectedInfluencers.slice(0, 10).forEach((inf, idx) => {
    const engagementRate = (inf.engagementRate || 0) * 100;
    const impressions = inf.recentImpressions || 0;
    console.log(`  ${idx + 1}. @${inf.username} - ${engagementRate.toFixed(2)}% engagement, ${impressions.toLocaleString()} impressions`);
  });
  
  return {
    totalFound: allInfluencers.length,
    highEngagement: highEngagementInfluencers.length,
    selected: selectedInfluencers.length,
    influencers: selectedInfluencers,
  };
}

async function main() {
  const lang = process.argv[2] || 'en';
  
  console.log('========================================');
  console.log(`最大限のインフルエンサー発見スクリプト - ${lang.toUpperCase()}`);
  console.log('========================================\n');
  
  const xaiApiKey = process.env.XAI_API_KEY;
  if (!xaiApiKey) {
    console.error('❌ XAI_API_KEY not set');
    process.exit(1);
  }
  
  console.log('✅ XAI_API_KEY configured\n');
  
  try {
    const result = await discoverMaxInfluencers(lang);
    
    console.log('\n========================================');
    console.log('結果サマリー');
    console.log('========================================');
    console.log(`✅ ${lang.toUpperCase()}:`);
    console.log(`   - 総発見数: ${result.totalFound}人`);
    console.log(`   - 高エンゲージメント(4%+): ${result.highEngagement}人`);
    console.log(`   - 選択されたインフルエンサー: ${result.selected}人`);
    console.log('========================================\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('致命的なエラー:', error);
  process.exit(1);
});
