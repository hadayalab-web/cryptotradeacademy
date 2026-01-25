// scripts/discover-max-influencers.js
// 最大限のインフルエンサーを発見するスクリプト

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const { discoverInfluencersForQuoteRepost } = require('../services/grok/client');
const { selectInfluencersForHighEngagement, getStockCountForLang } = require('../config/influencerStrategy');

async function discoverMaxInfluencers(lang) {
  const targetLang = (lang || 'en').toLowerCase();
  const stockCount = getStockCountForLang(targetLang);
  
  console.log(`\n========================================`);
  console.log(`🔍 Discovering MAX influencers for ${targetLang.toUpperCase()}`);
  console.log(`========================================\n`);
  
  // 最大限の候補数を取得（複数回リクエスト）
  const maxCandidatesPerRequest = 50; // Grok APIの1回あたりの最大候補数
  const totalRequests = 3; // 3回リクエストして最大150人を取得
  const allInfluencers = [];
  
  for (let i = 0; i < totalRequests; i++) {
    console.log(`[Discovery] Request ${i + 1}/${totalRequests}...`);
    try {
      const influencers = await discoverInfluencersForQuoteRepost(targetLang, { 
        maxResults: maxCandidatesPerRequest 
      });
      
      if (influencers && influencers.length > 0) {
        // 重複を除去（usernameで）
        const existingUsernames = new Set(allInfluencers.map(inf => inf.username));
        const newInfluencers = influencers.filter(inf => !existingUsernames.has(inf.username));
        allInfluencers.push(...newInfluencers);
        console.log(`[Discovery] Found ${influencers.length} influencers (${newInfluencers.length} new)`);
      }
      
      // レート制限対策（リクエスト間に5秒待機）
      if (i < totalRequests - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error(`[Discovery] Request ${i + 1} failed:`, error.message);
    }
  }
  
  console.log(`\n[Discovery] Total unique influencers found: ${allInfluencers.length}`);
  
  // エンゲージメント率でフィルタリング（最低4%以上）
  const highEngagementInfluencers = allInfluencers.filter(inf => {
    const engagementRate = inf.engagementRate || 0;
    return engagementRate >= 0.04; // 4%以上
  });
  
  console.log(`[Discovery] High engagement (4%+): ${highEngagementInfluencers.length} influencers`);
  
  // 好反応率重視で選択
  const selectedInfluencers = selectInfluencersForHighEngagement(
    highEngagementInfluencers.length > 0 ? highEngagementInfluencers : allInfluencers,
    targetLang
  );
  
  console.log(`\n[Discovery] ✅ Selected ${selectedInfluencers.length} top influencers for ${targetLang}`);
  
  // 詳細を表示
  console.log(`\n📊 Top 10 Influencers:`);
  selectedInfluencers.slice(0, 10).forEach((inf, idx) => {
    const engagementRate = (inf.engagementRate || 0) * 100;
    const impressions = inf.recentImpressions || 0;
    console.log(`  ${idx + 1}. @${inf.username}`);
    console.log(`     - Engagement: ${engagementRate.toFixed(2)}%`);
    console.log(`     - Impressions: ${impressions.toLocaleString()}`);
    console.log(`     - Followers: ${inf.followerCount || 'N/A'}`);
    console.log(`     - Tweet ID: ${inf.tweetId || 'MISSING'}`);
    console.log('');
  });
  
  return selectedInfluencers;
}

async function main() {
  console.log('========================================');
  console.log('最大限のインフルエンサー発見スクリプト');
  console.log('========================================\n');
  
  // XAI_API_KEYの確認
  const xaiApiKey = process.env.XAI_API_KEY;
  if (!xaiApiKey) {
    console.error('❌ XAI_API_KEY not set in environment variables');
    console.error('Please set XAI_API_KEY in .env.local or environment variables');
    process.exit(1);
  }
  
  console.log('✅ XAI_API_KEY configured');
  console.log(`   Key: ${xaiApiKey.substring(0, 20)}...\n`);
  
  const langs = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
  const results = {};
  
  for (const lang of langs) {
    try {
      const influencers = await discoverMaxInfluencers(lang);
      results[lang] = {
        success: true,
        count: influencers.length,
        influencers: influencers.slice(0, 5), // 最初の5人だけ表示
      };
      
      // 言語間で10秒待機（レート制限対策）
      if (lang !== langs[langs.length - 1]) {
        console.log('\n⏳ Waiting 10 seconds before next language...\n');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    } catch (error) {
      console.error(`\n❌ Failed for ${lang}:`, error.message);
      results[lang] = {
        success: false,
        error: error.message,
        count: 0,
      };
    }
  }
  
  console.log('\n========================================');
  console.log('最終結果サマリー');
  console.log('========================================\n');
  
  let totalFound = 0;
  for (const lang of langs) {
    const result = results[lang];
    if (result.success) {
      console.log(`✅ ${lang.toUpperCase()}: ${result.count} influencers`);
      totalFound += result.count;
    } else {
      console.log(`❌ ${lang.toUpperCase()}: ${result.error || 'Failed'}`);
    }
  }
  
  console.log(`\n✅✅✅ 合計 ${totalFound}人の高品質インフルエンサーを発見しました！`);
  console.log('========================================\n');
}

main().catch((error) => {
  console.error('致命的なエラー:', error);
  process.exit(1);
});
