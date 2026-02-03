// scripts/check-kv-stock-status.js
// KVストックの状態を確認（KVリスト総数: 300。config/influencerStrategy.js の STOCK_COUNT_BY_LANG に合わせる）

const { getInfluencersFromStock } = require('../services/x/influencerStock');
const { STOCK_COUNT_BY_LANG } = require('../config/influencerStrategy');

const LANGUAGES = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
const KV_TARGET_TOTAL = 300;
const TARGET_DISTRIBUTION = Object.fromEntries(
  LANGUAGES.map((lang) => [lang, STOCK_COUNT_BY_LANG[lang] || 0])
);

async function checkStockStatus() {
  console.log('='.repeat(80));
  console.log('KVストック状態確認');
  console.log('='.repeat(80));
  console.log();
  
  let totalCount = 0;
  const results = [];
  
  for (const lang of LANGUAGES) {
    try {
      const influencers = await getInfluencersFromStock(lang);
      const count = Array.isArray(influencers) ? influencers.length : 0;
      const target = TARGET_DISTRIBUTION[lang] || 0;
      const status = count >= target * 0.9 ? '✅' : count > 0 ? '⚠️' : '❌';
      
      results.push({ lang, count, target, status });
      totalCount += count;
      
      console.log(`${status} [${lang.toUpperCase()}] ${count}人 / 目標${target}人 (${((count/target)*100).toFixed(1)}%)`);
      
      if (count > 0 && count < 10) {
        console.log(`   ⚠️ 非常に少ない数です`);
      }
      
      if (count === 0) {
        console.log(`   ❌ ストックが空です`);
      }
      
      // サンプルデータ表示
      if (count > 0 && influencers.length > 0) {
        const sample = influencers[0];
        console.log(`   📊 サンプル: @${sample.username || 'N/A'} (tweetId: ${sample.tweetId || 'N/A'})`);
      }
      
    } catch (error) {
      console.error(`❌ [${lang.toUpperCase()}] エラー:`, error.message);
      results.push({ lang, count: 0, target: TARGET_DISTRIBUTION[lang] || 0, status: '❌' });
    }
    console.log();
  }
  
  console.log('='.repeat(80));
  console.log('サマリー');
  console.log('='.repeat(80));
  console.log(`合計: ${totalCount}人 / 目標${KV_TARGET_TOTAL}人（KV） (${((totalCount / KV_TARGET_TOTAL) * 100).toFixed(1)}%)`);
  console.log();

  const success = results.filter(r => r.status === '✅').length;
  const warning = results.filter(r => r.status === '⚠️').length;
  const failed = results.filter(r => r.status === '❌').length;

  console.log(`✅ 目標達成: ${success}言語`);
  console.log(`⚠️ 部分達成: ${warning}言語`);
  console.log(`❌ 失敗: ${failed}言語`);
  console.log();

  if (totalCount === 0) {
    console.log('❌ CRITICAL: KVストックが完全に空です');
    console.log('💡 ローカルファイルを確認してください: data/grok-influencers/');
  } else if (totalCount < KV_TARGET_TOTAL * 0.5) {
    console.log('⚠️ WARNING: KVストックが目標の50%未満です');
  } else if (totalCount >= KV_TARGET_TOTAL * 0.9) {
    console.log('✅ 良好: KVストックが目標の90%以上です');
  }
  
  console.log('='.repeat(80));
}

checkStockStatus().catch(error => {
  console.error('❌ 致命的なエラー:', error.message);
  console.error('スタックトレース:', error.stack);
  process.exit(1);
});
