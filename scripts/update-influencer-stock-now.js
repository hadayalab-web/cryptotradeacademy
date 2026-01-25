// scripts/update-influencer-stock-now.js
// インフルエンサーストックを今すぐ更新するスクリプト

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const { updateAllInfluencerStocks, getInfluencersFromStock, getStockUpdateTime } = require('../services/x/influencerStock');

async function main() {
  console.log('========================================');
  console.log('インフルエンサーストック更新スクリプト');
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
  console.log(`🔄 Updating influencer stocks for all languages: ${langs.join(', ')}\n`);
  
  try {
    // すべての言語のストックを更新
    const results = await updateAllInfluencerStocks(langs);
    
    console.log('\n========================================');
    console.log('更新結果サマリー');
    console.log('========================================\n');
    
    for (const lang of langs) {
      const result = results[lang];
      const stock = await getInfluencersFromStock(lang);
      const updateTime = await getStockUpdateTime(lang);
      
      if (result.success) {
        console.log(`✅ ${lang.toUpperCase()}:`);
        console.log(`   - ストック数: ${stock.length}人`);
        console.log(`   - 更新時刻: ${updateTime || 'N/A'}`);
        if (result.influencers && result.influencers.length > 0) {
          console.log(`   - サンプル: @${result.influencers[0].username} (${(result.influencers[0].recentImpressions || 0).toLocaleString()} impressions)`);
        }
      } else {
        console.log(`❌ ${lang.toUpperCase()}:`);
        console.log(`   - エラー: ${result.error || 'Unknown error'}`);
      }
      console.log('');
    }
    
    // 合計を表示
    let totalStocked = 0;
    for (const lang of langs) {
      const stock = await getInfluencersFromStock(lang);
      totalStocked += stock.length;
    }
    
    console.log('========================================');
    console.log(`✅ 完了: 合計 ${totalStocked}人のインフルエンサーをストックしました`);
    console.log('========================================\n');
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:');
    console.error('エラーメッセージ:', error.message);
    if (error.stack) {
      console.error('エラースタック:', error.stack);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('致命的なエラー:', error);
  process.exit(1);
});
