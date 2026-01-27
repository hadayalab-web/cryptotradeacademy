// scripts/add-lang-field-to-stock.js
// 既存のストックデータにlangフィールドを追加

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
const STOCK_TTL = 24 * 60 * 60; // 24時間（秒）

async function addLangField() {
  console.log('🔧 既存のストックデータにlangフィールドを追加中...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const results = {};
  
  for (const lang of SUPPORTED_LANGS) {
    const stockKey = `${STOCK_KEY_PREFIX}${lang}`;
    const updateTimeKey = `${STOCK_UPDATE_TIME_KEY_PREFIX}${lang}`;
    
    console.log(`📊 ${lang.toUpperCase()} 言語:`);
    
    try {
      const stockData = await kv.get(stockKey);
      
      if (!stockData || !Array.isArray(stockData) || stockData.length === 0) {
        console.log(`   ⚠️ ストックが空です（スキップ）\n`);
        results[lang] = { success: false, reason: 'empty' };
        continue;
      }
      
      // langフィールドがないインフルエンサーをカウント
      const withoutLang = stockData.filter(inf => !inf.lang);
      const withLang = stockData.filter(inf => inf.lang);
      
      console.log(`   📋 総数: ${stockData.length}人`);
      console.log(`   ✅ langフィールドあり: ${withLang.length}人`);
      console.log(`   ❌ langフィールドなし: ${withoutLang.length}人`);
      
      if (withoutLang.length === 0) {
        console.log(`   ✅ すべてのインフルエンサーにlangフィールドが設定済み（スキップ）\n`);
        results[lang] = { success: true, updated: 0, skipped: stockData.length };
        continue;
      }
      
      // langフィールドを追加
      const updatedData = stockData.map(inf => ({
        ...inf,
        lang: inf.lang || lang, // langフィールドがない場合は現在の言語を設定
      }));
      
      // KVに保存
      await kv.set(stockKey, updatedData, { ex: STOCK_TTL });
      await kv.set(updateTimeKey, new Date().toISOString(), { ex: STOCK_TTL });
      
      console.log(`   ✅ ${withoutLang.length}人のインフルエンサーにlangフィールドを追加しました\n`);
      results[lang] = { success: true, updated: withoutLang.length, skipped: withLang.length };
    } catch (error) {
      console.error(`   ❌ エラー: ${error.message}\n`);
      results[lang] = { success: false, error: error.message };
    }
  }
  
  // サマリー
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 サマリー\n');
  
  const successLangs = Object.keys(results).filter(lang => results[lang].success);
  const failedLangs = Object.keys(results).filter(lang => !results[lang].success);
  
  console.log(`✅ 成功: ${successLangs.length}言語`);
  successLangs.forEach(lang => {
    const result = results[lang];
    if (result.updated > 0) {
      console.log(`   - ${lang.toUpperCase()}: ${result.updated}人更新`);
    } else {
      console.log(`   - ${lang.toUpperCase()}: 更新不要（既に設定済み）`);
    }
  });
  
  if (failedLangs.length > 0) {
    console.log(`\n❌ 失敗: ${failedLangs.length}言語`);
    failedLangs.forEach(lang => {
      const result = results[lang];
      console.log(`   - ${lang.toUpperCase()}: ${result.error || result.reason}`);
    });
  }
  
  const totalUpdated = Object.values(results)
    .filter(r => r.success && r.updated)
    .reduce((sum, r) => sum + (r.updated || 0), 0);
  
  console.log(`\n📊 合計更新数: ${totalUpdated}人`);
  
  return results;
}

if (require.main === module) {
  addLangField()
    .then(() => {
      console.log('\n✅ 完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { addLangField };
