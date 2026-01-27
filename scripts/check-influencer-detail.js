// scripts/check-influencer-detail.js
// KVストレージに保存されているインフルエンサーの詳細データを確認

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

async function checkDetail() {
  console.log('🔍 KVストレージに保存されているインフルエンサーの詳細データを確認\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  for (const lang of SUPPORTED_LANGS) {
    const stockKey = `${STOCK_KEY_PREFIX}${lang}`;
    
    try {
      const stockData = await kv.get(stockKey);
      
      if (!stockData || !Array.isArray(stockData) || stockData.length === 0) {
        console.log(`📊 ${lang.toUpperCase()}: ストックが空です\n`);
        continue;
      }
      
      // 最初の1人の完全なデータを表示
      const firstInfluencer = stockData[0];
      
      console.log(`📊 ${lang.toUpperCase()} 言語 - 最初の1人の完全なデータ:`);
      console.log(JSON.stringify(firstInfluencer, null, 2));
      console.log('\n');
      
      // すべてのフィールドをリストアップ
      console.log(`📋 保存されているフィールド:`);
      const fields = Object.keys(firstInfluencer);
      fields.forEach(field => {
        const value = firstInfluencer[field];
        const type = typeof value;
        const preview = type === 'string' && value.length > 50 
          ? value.substring(0, 50) + '...' 
          : value;
        console.log(`   - ${field}: ${type} = ${JSON.stringify(preview)}`);
      });
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      // 1言語だけ確認して終了
      break;
    } catch (error) {
      console.error(`❌ ${lang.toUpperCase()} エラー: ${error.message}\n`);
    }
  }
}

if (require.main === module) {
  checkDetail()
    .then(() => {
      console.log('✅ 確認完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { checkDetail };
