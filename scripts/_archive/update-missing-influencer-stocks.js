// scripts/update-missing-influencer-stocks.js
// ENとARのインフルエンサーストックを即座に更新

require('dotenv').config({ path: '.env' });

const { updateInfluencerStock, getInfluencersFromStock, getStockUpdateTime } = require('../services/x/influencerStock');

const MISSING_LANGS = ['en', 'ar'];

async function updateMissingStocks() {
  console.log('🚀 ENとARのインフルエンサーストックを即座に更新中...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // XAI_API_KEYの確認
  const xaiApiKey = process.env.XAI_API_KEY;
  if (!xaiApiKey) {
    console.error('❌ XAI_API_KEY not set');
    process.exit(1);
  }
  
  console.log('✅ XAI_API_KEY configured\n');
  
  const results = {};
  
  for (const lang of MISSING_LANGS) {
    console.log(`📊 ${lang.toUpperCase()} 言語のストック更新を開始...`);
    
    try {
      // 現在のストック状態を確認
      const currentStock = await getInfluencersFromStock(lang);
      const currentUpdateTime = await getStockUpdateTime(lang);
      
      console.log(`   現在のストック数: ${currentStock.length}人`);
      if (currentUpdateTime) {
        console.log(`   現在の最終更新: ${currentUpdateTime}`);
      }
      
      // ストック更新を実行
      console.log(`   🔄 Grok APIからインフルエンサーを取得中...`);
      const startTime = Date.now();
      
      const updatedInfluencers = await updateInfluencerStock(lang);
      
      const elapsed = Date.now() - startTime;
      
      if (!updatedInfluencers || updatedInfluencers.length === 0) {
        console.error(`   ❌ ${lang.toUpperCase()}言語のストック更新に失敗しました（インフルエンサーが0人）`);
        results[lang] = {
          success: false,
          error: 'No influencers returned',
          count: 0,
        };
        continue;
      }
      
      // 更新後のストック状態を確認
      const newStock = await getInfluencersFromStock(lang);
      const newUpdateTime = await getStockUpdateTime(lang);
      
      console.log(`   ✅ ストック更新完了！`);
      console.log(`      - 更新後のストック数: ${newStock.length}人`);
      console.log(`      - 最終更新時刻: ${newUpdateTime || '不明'}`);
      console.log(`      - 実行時間: ${elapsed}ms`);
      
      // 最初の3人のインフルエンサー情報を表示
      if (newStock.length > 0) {
        console.log(`   📋 更新されたインフルエンサー（最初の3人）:`);
        newStock.slice(0, 3).forEach((inf, idx) => {
          console.log(`      ${idx + 1}. @${inf.username || 'unknown'}`);
          console.log(`         - エンゲージメント率: ${((inf.engagementRate || 0) * 100).toFixed(2)}%`);
          console.log(`         - インプレッション: ${inf.recentImpressions || 'N/A'}`);
          console.log(`         - フォロワー数: ${inf.followerCount || 'N/A'}`);
        });
      }
      
      results[lang] = {
        success: true,
        count: newStock.length,
        updateTime: newUpdateTime,
        executionTimeMs: elapsed,
      };
      
    } catch (error) {
      console.error(`   ❌ ${lang.toUpperCase()}言語のストック更新中にエラーが発生しました:`);
      console.error(`      ${error.message}`);
      console.error(`      ${error.stack}`);
      
      results[lang] = {
        success: false,
        error: error.message,
        count: 0,
      };
    }
    
    console.log('');
  }
  
  // サマリー
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 更新結果サマリー\n');
  
  const successLangs = Object.keys(results).filter(lang => results[lang].success);
  const failedLangs = Object.keys(results).filter(lang => !results[lang].success);
  
  if (successLangs.length > 0) {
    console.log(`✅ 更新成功: ${successLangs.length}言語`);
    successLangs.forEach(lang => {
      const result = results[lang];
      console.log(`   - ${lang.toUpperCase()}: ${result.count}人（${result.executionTimeMs}ms）`);
    });
  }
  
  if (failedLangs.length > 0) {
    console.log(`\n❌ 更新失敗: ${failedLangs.length}言語`);
    failedLangs.forEach(lang => {
      const result = results[lang];
      console.log(`   - ${lang.toUpperCase()}: ${result.error || 'Unknown error'}`);
    });
  }
  
  const totalCount = Object.values(results)
    .filter(r => r.success)
    .reduce((sum, r) => sum + (r.count || 0), 0);
  
  console.log(`\n📊 総ストック数（更新後）: ${totalCount}人`);
  
  return results;
}

// 実行
if (require.main === module) {
  updateMissingStocks()
    .then((results) => {
      const allSuccess = Object.values(results).every(r => r.success);
      if (allSuccess) {
        console.log('\n✅ すべてのストック更新が完了しました！');
        process.exit(0);
      } else {
        console.log('\n⚠️ 一部のストック更新に失敗しました');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { updateMissingStocks };
