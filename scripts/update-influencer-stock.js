// scripts/update-influencer-stock.js
// インフルエンサーストックを更新するスクリプト

const { updateInfluencerStock, updateAllInfluencerStocks } = require('../services/x/influencerStock');

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

async function updateStock() {
  const args = process.argv.slice(2);
  const lang = args.find(arg => arg.startsWith('--lang='))?.split('=')[1];
  const all = args.includes('--all');

  console.log('========================================');
  console.log('インフルエンサーストック更新');
  console.log('========================================\n');

  // XAI_API_KEYの確認
  if (!process.env.XAI_API_KEY) {
    console.error('❌ XAI_API_KEY環境変数が設定されていません');
    console.log('環境変数を設定してから再実行してください');
    process.exit(1);
  }

  console.log('✅ XAI_API_KEY設定確認完了\n');

  try {
    if (all) {
      // 全言語を更新
      console.log('🔄 全言語のストックを更新中...');
      console.log('⚠️  注意: タイムアウト（60秒）のリスクがあります\n');
      
      const results = await updateAllInfluencerStocks(SUPPORTED_LANGS, { timeoutMs: 55000 });
      
      console.log('\n========================================');
      console.log('📊 更新結果');
      console.log('========================================');
      
      let successCount = 0;
      let totalCount = 0;
      
      for (const lang of SUPPORTED_LANGS) {
        const result = results[lang];
        if (result) {
          const status = result.success ? '✅' : '❌';
          console.log(`${status} ${lang}: ${result.count}人`);
          if (result.success) {
            successCount++;
            totalCount += result.count;
          } else {
            console.log(`   エラー: ${result.error}`);
          }
        } else {
          console.log(`⚠️  ${lang}: 結果なし`);
        }
      }
      
      console.log(`\n成功: ${successCount}/${SUPPORTED_LANGS.length}言語`);
      console.log(`総インフルエンサー数: ${totalCount}人`);
      
    } else if (lang) {
      // 指定言語を更新
      const targetLang = lang.toLowerCase();
      if (!SUPPORTED_LANGS.includes(targetLang)) {
        console.error(`❌ 無効な言語コード: ${targetLang}`);
        console.log(`サポートされている言語: ${SUPPORTED_LANGS.join(', ')}`);
        process.exit(1);
      }
      
      console.log(`🔄 ${targetLang}言語のストックを更新中...\n`);
      
      const influencers = await updateInfluencerStock(targetLang);
      
      console.log('\n========================================');
      console.log('✅ 更新完了');
      console.log('========================================');
      console.log(`言語: ${targetLang}`);
      console.log(`インフルエンサー数: ${influencers.length}人`);
      
      if (influencers.length > 0) {
        console.log('\n最初の5人:');
        influencers.slice(0, 5).forEach((inf, idx) => {
          const username = inf.username || inf.userId || inf.id || 'N/A';
          const followers = inf.followersCount ? inf.followersCount.toLocaleString() : 'N/A';
          const engagementRate = inf.engagementRate 
            ? `${(inf.engagementRate * 100).toFixed(2)}%` 
            : 'N/A';
          console.log(`  ${idx + 1}. @${username} (フォロワー: ${followers}, エンゲージメント率: ${engagementRate})`);
        });
      }
      
    } else {
      // 使用方法を表示
      console.log('使用方法:');
      console.log('  単一言語を更新: node scripts/update-influencer-stock.js --lang=en');
      console.log('  全言語を更新:   node scripts/update-influencer-stock.js --all');
      console.log('\nサポートされている言語:');
      SUPPORTED_LANGS.forEach(l => console.log(`  - ${l}`));
      process.exit(0);
    }
    
    console.log('\n========================================');
    console.log('✅ 完了');
    console.log('========================================');
    
  } catch (error) {
    console.error('\n❌ エラー:', error.message);
    console.error('スタックトレース:', error.stack);
    process.exit(1);
  }
}

// 実行
updateStock();
