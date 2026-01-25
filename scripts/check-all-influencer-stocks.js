// scripts/check-all-influencer-stocks.js
// 6言語すべてのインフルエンサーストックを直接確認

require('dotenv').config({ path: '.env' });

let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.error('❌ @vercel/kv not available:', error.message);
  process.exit(1);
}

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
const STOCK_KEY_PREFIX = 'x:influencer_stock:';
const STOCK_UPDATE_TIME_KEY_PREFIX = 'x:influencer_stock_update:';

async function checkAllStocks() {
  console.log('🔍 6言語すべてのインフルエンサーストックを直接確認中...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const results = {};
  
  for (const lang of SUPPORTED_LANGS) {
    const stockKey = `${STOCK_KEY_PREFIX}${lang}`;
    const updateTimeKey = `${STOCK_UPDATE_TIME_KEY_PREFIX}${lang}`;
    
    console.log(`📊 ${lang.toUpperCase()} 言語:`);
    console.log(`   KVキー: ${stockKey}`);
    
    try {
      // ストックデータを直接取得
      const stockData = await kv.get(stockKey);
      const updateTime = await kv.get(updateTimeKey);
      
      if (!stockData || !Array.isArray(stockData) || stockData.length === 0) {
        console.log(`   ❌ ストックが空です（データなし）`);
        results[lang] = {
          exists: false,
          count: 0,
          updateTime: updateTime || null,
        };
      } else {
        console.log(`   ✅ ストック数: ${stockData.length}人`);
        console.log(`   📅 最終更新: ${updateTime || '不明'}`);
        
        // 最初の3人のインフルエンサー情報を表示
        if (stockData.length > 0) {
          console.log(`   📋 サンプル（最初の3人）:`);
          stockData.slice(0, 3).forEach((inf, idx) => {
            console.log(`      ${idx + 1}. @${inf.username || 'unknown'}`);
            console.log(`         - エンゲージメント率: ${((inf.engagementRate || 0) * 100).toFixed(2)}%`);
            console.log(`         - インプレッション: ${inf.recentImpressions || 'N/A'}`);
            console.log(`         - フォロワー数: ${inf.followerCount || 'N/A'}`);
          });
        }
        
        results[lang] = {
          exists: true,
          count: stockData.length,
          updateTime: updateTime || null,
          sample: stockData.slice(0, 3).map(inf => ({
            username: inf.username,
            engagementRate: (inf.engagementRate || 0) * 100,
            impressions: inf.recentImpressions,
            followers: inf.followerCount,
          })),
        };
      }
    } catch (error) {
      console.error(`   ❌ エラー: ${error.message}`);
      results[lang] = {
        exists: false,
        error: error.message,
      };
    }
    
    console.log('');
  }
  
  // サマリー
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 サマリー\n');
  
  const existingLangs = Object.keys(results).filter(lang => results[lang].exists);
  const emptyLangs = Object.keys(results).filter(lang => !results[lang].exists);
  
  console.log(`✅ ストックあり: ${existingLangs.length}言語 (${existingLangs.join(', ').toUpperCase()})`);
  console.log(`❌ ストック空: ${emptyLangs.length}言語 (${emptyLangs.join(', ').toUpperCase()})`);
  
  if (emptyLangs.length > 0) {
    console.log(`\n⚠️ ストックが空の言語:`);
    emptyLangs.forEach(lang => {
      const result = results[lang];
      console.log(`   - ${lang.toUpperCase()}: ${result.updateTime ? `最終更新: ${result.updateTime}` : '更新履歴なし'}`);
      if (result.error) {
        console.log(`     エラー: ${result.error}`);
      }
    });
  }
  
  const totalCount = Object.values(results)
    .filter(r => r.exists)
    .reduce((sum, r) => sum + (r.count || 0), 0);
  
  console.log(`\n📊 総ストック数: ${totalCount}人`);
  
  return results;
}

// 実行
if (require.main === module) {
  checkAllStocks()
    .then(() => {
      console.log('\n✅ 確認完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { checkAllStocks };
