// scripts/fix-influencer-lang-field.js
// KVストレージに保存されているインフルエンサーデータにlangフィールドを追加/修正

require('dotenv').config({ path: '.env' });

const { getInfluencersFromStock, saveInfluencersToStock } = require('../services/x/influencerStock');

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

/**
 * インフルエンサーデータにlangフィールドを追加/修正
 */
async function fixInfluencerLangField() {
  console.log('🔧 KVストレージのインフルエンサーデータにlangフィールドを追加/修正中...\n');
  
  const results = {};
  
  for (const lang of SUPPORTED_LANGS) {
    try {
      console.log(`\n📊 ${lang.toUpperCase()}を処理中...`);
      
      // KVストレージからインフルエンサーを取得
      const influencers = await getInfluencersFromStock(lang);
      
      if (!influencers || influencers.length === 0) {
        console.log(`  ⚠️  ${lang.toUpperCase()}: データなし`);
        results[lang] = {
          success: false,
          count: 0,
          fixed: 0,
          error: 'No data',
        };
        continue;
      }
      
      // langフィールドがない、または不一致のインフルエンサーを検出
      const missingLang = influencers.filter(inf => !inf.lang);
      const mismatchedLang = influencers.filter(inf => inf.lang && inf.lang.toLowerCase() !== lang.toLowerCase());
      
      console.log(`  📋 総数: ${influencers.length}人`);
      console.log(`  ⚠️  langフィールドなし: ${missingLang.length}人`);
      console.log(`  ⚠️  言語不一致: ${mismatchedLang.length}人`);
      
      if (missingLang.length > 0) {
        console.log(`  🔍 langフィールドがないインフルエンサー:`, missingLang.slice(0, 5).map(inf => `@${inf.username}`).join(', '));
      }
      
      if (mismatchedLang.length > 0) {
        console.log(`  🔍 言語不一致のインフルエンサー:`, mismatchedLang.slice(0, 5).map(inf => `@${inf.username} (lang: ${inf.lang})`).join(', '));
      }
      
      // すべてのインフルエンサーにlangフィールドを設定
      const fixedInfluencers = influencers.map(inf => ({
        ...inf,
        lang: lang.toLowerCase(), // 明示的に言語を設定（上書きも含む）
      }));
      
      // KVストレージに再保存
      const saved = await saveInfluencersToStock(lang, fixedInfluencers);
      
      if (saved) {
        const fixedCount = missingLang.length + mismatchedLang.length;
        console.log(`  ✅ ${lang.toUpperCase()}: ${fixedCount}人のlangフィールドを修正しました`);
        results[lang] = {
          success: true,
          count: influencers.length,
          fixed: fixedCount,
          missingLang: missingLang.length,
          mismatchedLang: mismatchedLang.length,
        };
      } else {
        console.error(`  ❌ ${lang.toUpperCase()}: 保存に失敗しました`);
        results[lang] = {
          success: false,
          count: influencers.length,
          fixed: 0,
          error: 'Save failed',
        };
      }
    } catch (error) {
      console.error(`  ❌ ${lang.toUpperCase()}: エラー - ${error.message}`);
      results[lang] = {
        success: false,
        count: 0,
        fixed: 0,
        error: error.message,
      };
    }
  }
  
  // サマリー
  console.log('\n' + '='.repeat(80));
  console.log('📊 修正結果サマリー');
  console.log('='.repeat(80));
  
  let totalCount = 0;
  let totalFixed = 0;
  
  for (const lang of SUPPORTED_LANGS) {
    const result = results[lang];
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${lang.toUpperCase()}: ${result.count}人（修正: ${result.fixed}人）`);
    totalCount += result.count;
    totalFixed += result.fixed;
  }
  
  console.log(`\n合計: ${totalCount}人（修正: ${totalFixed}人）`);
  console.log('='.repeat(80));
  
  return results;
}

/**
 * メイン処理
 */
async function main() {
  try {
    await fixInfluencerLangField();
    console.log('\n✅ 完了');
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

module.exports = { fixInfluencerLangField };
