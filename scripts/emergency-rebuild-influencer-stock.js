// scripts/emergency-rebuild-influencer-stock.js
// 緊急: インフルエンサーストックを再構築するスクリプト
// 386人分のストックが削除されたため、緊急で再構築

const { updateAllInfluencerStocks, getInfluencersFromStock, getStockUpdateTime } = require('../services/x/influencerStock');

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

async function emergencyRebuild() {
  console.log('========================================');
  console.log('🚨 緊急: インフルエンサーストック再構築');
  console.log('========================================\n');

  // XAI_API_KEYの確認
  if (!process.env.XAI_API_KEY) {
    console.error('❌ XAI_API_KEY環境変数が設定されていません');
    console.log('環境変数を設定してから再実行してください');
    process.exit(1);
  }

  console.log('✅ XAI_API_KEY設定確認完了\n');

  // 現在のストック状態を確認
  console.log('📋 現在のストック状態を確認中...\n');
  const currentState = {};
  for (const lang of SUPPORTED_LANGS) {
    const influencers = await getInfluencersFromStock(lang);
    const updateTime = await getStockUpdateTime(lang);
    currentState[lang] = {
      count: influencers.length,
      updateTime: updateTime || null,
    };
    const status = influencers.length > 0 ? '✅' : '❌';
    console.log(`${status} ${lang}: ${influencers.length}人 ${updateTime ? `(更新: ${updateTime})` : '(未更新)'}`);
  }

  const totalCurrent = Object.values(currentState).reduce((sum, s) => sum + s.count, 0);
  console.log(`\n現在の総インフルエンサー数: ${totalCurrent}人\n`);

  if (totalCurrent > 0) {
    console.log('⚠️  警告: 既存のストックが存在します');
    console.log('   再構築を続行すると、既存のストックが上書きされます');
    console.log('   続行しますか？ (Ctrl+Cでキャンセル)\n');
    // 5秒待機
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log('🔄 全言語のストックを再構築中...\n');
  console.log('⚠️  注意: この処理には時間がかかります（最大60秒）\n');

  try {
    const startTime = Date.now();
    const results = await updateAllInfluencerStocks(SUPPORTED_LANGS, { timeoutMs: 55000 });
    const elapsed = Date.now() - startTime;

    console.log('\n========================================');
    console.log('📊 再構築結果');
    console.log('========================================');

    let successCount = 0;
    let totalCount = 0;
    let failedLangs = [];

    for (const lang of SUPPORTED_LANGS) {
      const result = results[lang];
      if (result) {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${lang}: ${result.count}人`);
        if (result.success) {
          successCount++;
          totalCount += result.count;
        } else {
          failedLangs.push(lang);
          console.log(`   エラー: ${result.error}`);
        }
      } else {
        console.log(`⚠️  ${lang}: 結果なし`);
        failedLangs.push(lang);
      }
    }

    console.log(`\n成功: ${successCount}/${SUPPORTED_LANGS.length}言語`);
    console.log(`総インフルエンサー数: ${totalCount}人`);
    console.log(`実行時間: ${elapsed}ms`);

    if (failedLangs.length > 0) {
      console.log(`\n⚠️  失敗した言語: ${failedLangs.join(', ')}`);
      console.log('   これらの言語は手動で再構築してください:');
      failedLangs.forEach(lang => {
        console.log(`   node scripts/update-influencer-stock.js --lang=${lang}`);
      });
    }

    // 再構築後の状態を確認
    console.log('\n========================================');
    console.log('📋 再構築後のストック状態');
    console.log('========================================');
    for (const lang of SUPPORTED_LANGS) {
      const influencers = await getInfluencersFromStock(lang);
      const updateTime = await getStockUpdateTime(lang);
      const status = influencers.length > 0 ? '✅' : '❌';
      console.log(`${status} ${lang}: ${influencers.length}人 ${updateTime ? `(更新: ${updateTime})` : '(未更新)'}`);
    }

    const totalAfter = Object.values(SUPPORTED_LANGS).reduce(async (sum, lang) => {
      const influencers = await getInfluencersFromStock(lang);
      return (await sum) + influencers.length;
    }, Promise.resolve(0));

    const finalTotal = await totalAfter;
    console.log(`\n再構築後の総インフルエンサー数: ${finalTotal}人`);

    if (finalTotal >= 300) {
      console.log('\n✅✅✅ 再構築成功！CronJobsを実行するためのリストが復旧しました！');
    } else {
      console.log('\n⚠️  警告: 目標の386人に達していません');
      console.log('   追加の再構築が必要な可能性があります');
    }

    console.log('\n========================================');
    console.log('✅ 緊急再構築完了');
    console.log('========================================');

  } catch (error) {
    console.error('\n❌ エラー:', error.message);
    console.error('スタックトレース:', error.stack);
    process.exit(1);
  }
}

// 実行
emergencyRebuild();
