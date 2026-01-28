// scripts/check-influencer-lang-field.js
// KVストレージに保存されているインフルエンサーデータのlangフィールドを確認

require('dotenv').config({ path: '.env' });

const { kv } = require('../utils/kv');

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
const STOCK_KEY_PREFIX = 'x:influencer_stock:';

/**
 * インフルエンサーデータのlangフィールドを確認
 */
async function checkInfluencerLangField() {
  console.log('🔍 KVストレージのインフルエンサーデータのlangフィールドを確認中...\n');
  
  const results = {};
  
  for (const lang of SUPPORTED_LANGS) {
    try {
      const stockKey = `${STOCK_KEY_PREFIX}${lang}`;
      const influencers = await kv.get(stockKey);
      
      if (!influencers || !Array.isArray(influencers) || influencers.length === 0) {
        console.log(`📊 ${lang.toUpperCase()}: データなし`);
        results[lang] = {
          count: 0,
          missingLang: 0,
          mismatchedLang: 0,
          correctLang: 0,
        };
        continue;
      }
      
      // langフィールドの状態を確認
      const missingLang = influencers.filter(inf => !inf.lang || inf.lang === undefined || inf.lang === null);
      const mismatchedLang = influencers.filter(inf => inf.lang && inf.lang.toLowerCase() !== lang.toLowerCase());
      const correctLang = influencers.filter(inf => inf.lang && inf.lang.toLowerCase() === lang.toLowerCase());
      
      console.log(`📊 ${lang.toUpperCase()}:`);
      console.log(`  総数: ${influencers.length}人`);
      console.log(`  ✅ langフィールド正しい: ${correctLang.length}人`);
      console.log(`  ⚠️  langフィールドなし: ${missingLang.length}人`);
      console.log(`  ❌ 言語不一致: ${mismatchedLang.length}人`);
      
      if (missingLang.length > 0) {
        console.log(`  🔍 langフィールドがないインフルエンサー（最初の5人）:`);
        missingLang.slice(0, 5).forEach(inf => {
          console.log(`    - @${inf.username} (lang: ${inf.lang || 'undefined'})`);
        });
      }
      
      if (mismatchedLang.length > 0) {
        console.log(`  🔍 言語不一致のインフルエンサー（最初の5人）:`);
        mismatchedLang.slice(0, 5).forEach(inf => {
          console.log(`    - @${inf.username} (lang: ${inf.lang}, expected: ${lang})`);
        });
      }
      
      // サンプルデータを表示（最初の1人）
      if (influencers.length > 0) {
        const sample = influencers[0];
        console.log(`  📋 サンプルデータ（最初の1人）:`);
        console.log(`    - @${sample.username}`);
        console.log(`    - lang: ${sample.lang || 'undefined'}`);
        console.log(`    - engagementRate: ${sample.engagementRate || 'undefined'}`);
        console.log(`    - recentImpressions: ${sample.recentImpressions || 'undefined'}`);
        console.log(`    - 全フィールド: ${Object.keys(sample).join(', ')}`);
      }
      
      results[lang] = {
        count: influencers.length,
        missingLang: missingLang.length,
        mismatchedLang: mismatchedLang.length,
        correctLang: correctLang.length,
      };
      
      console.log('');
    } catch (error) {
      console.error(`❌ ${lang.toUpperCase()}: エラー - ${error.message}`);
      results[lang] = {
        count: 0,
        missingLang: 0,
        mismatchedLang: 0,
        correctLang: 0,
        error: error.message,
      };
    }
  }
  
  // サマリー
  console.log('='.repeat(80));
  console.log('📊 確認結果サマリー');
  console.log('='.repeat(80));
  
  let totalCount = 0;
  let totalMissingLang = 0;
  let totalMismatchedLang = 0;
  let totalCorrectLang = 0;
  
  for (const lang of SUPPORTED_LANGS) {
    const result = results[lang];
    const status = result.missingLang === 0 && result.mismatchedLang === 0 ? '✅' : '⚠️';
    console.log(`${status} ${lang.toUpperCase()}: ${result.count}人（正しい: ${result.correctLang}人, なし: ${result.missingLang}人, 不一致: ${result.mismatchedLang}人）`);
    totalCount += result.count;
    totalMissingLang += result.missingLang;
    totalMismatchedLang += result.mismatchedLang;
    totalCorrectLang += result.correctLang;
  }
  
  console.log(`\n合計: ${totalCount}人（正しい: ${totalCorrectLang}人, なし: ${totalMissingLang}人, 不一致: ${totalMismatchedLang}人）`);
  
  if (totalMissingLang > 0 || totalMismatchedLang > 0) {
    console.log('\n⚠️  問題が検出されました。`node scripts/fix-influencer-lang-field.js`を実行して修正してください。');
  } else {
    console.log('\n✅ すべてのインフルエンサーに正しいlangフィールドが設定されています。');
  }
  
  console.log('='.repeat(80));
  
  return results;
}

/**
 * メイン処理
 */
async function main() {
  try {
    await checkInfluencerLangField();
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

module.exports = { checkInfluencerLangField };
