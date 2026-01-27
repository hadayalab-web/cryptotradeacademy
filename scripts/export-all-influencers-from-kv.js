// scripts/export-all-influencers-from-kv.js
// KVストレージからすべてのインフルエンサーリストをエクスポート

require('dotenv').config({ path: '.env' });

const { kv } = require('../utils/kv');

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
const STOCK_KEY_PREFIX = 'x:influencer_stock:';

async function exportAllInfluencers() {
  console.log('🔍 KVストレージからすべてのインフルエンサーリストをエクスポート中...\n');
  
  const allInfluencers = {};
  let totalCount = 0;
  
  for (const lang of SUPPORTED_LANGS) {
    const stockKey = `${STOCK_KEY_PREFIX}${lang}`;
    
    try {
      const stockData = await kv.get(stockKey);
      
      if (stockData && Array.isArray(stockData) && stockData.length > 0) {
        allInfluencers[lang] = stockData;
        totalCount += stockData.length;
        console.log(`✅ ${lang.toUpperCase()}: ${stockData.length}人`);
      } else {
        console.log(`❌ ${lang.toUpperCase()}: データなし`);
        allInfluencers[lang] = [];
      }
    } catch (error) {
      console.error(`❌ ${lang.toUpperCase()}: エラー - ${error.message}`);
      allInfluencers[lang] = [];
    }
  }
  
  console.log(`\n📊 合計: ${totalCount}人のインフルエンサー`);
  
  // JSONファイルに保存
  const fs = require('fs');
  const path = require('path');
  const outputPath = path.join(__dirname, '../data/influencers-export.json');
  
  fs.writeFileSync(outputPath, JSON.stringify(allInfluencers, null, 2), 'utf8');
  console.log(`\n✅ エクスポート完了: ${outputPath}`);
  
  // サマリーを表示
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 言語別インフルエンサー数:');
  for (const lang of SUPPORTED_LANGS) {
    const count = allInfluencers[lang]?.length || 0;
    if (count > 0) {
      console.log(`  ${lang.toUpperCase()}: ${count}人`);
      // 最初の5人のユーザー名を表示
      const usernames = allInfluencers[lang].slice(0, 5).map(inf => `@${inf.username}`).join(', ');
      console.log(`    (例: ${usernames}${count > 5 ? '...' : ''})`);
    }
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  return allInfluencers;
}

if (require.main === module) {
  exportAllInfluencers()
    .then(() => {
      console.log('✅ 完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { exportAllInfluencers };
