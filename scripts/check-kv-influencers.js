// scripts/check-kv-influencers.js
// KVに保存されているインフルエンサーリストを確認するスクリプト

const { kv } = require('../utils/kv');
const { getInfluencersFromStock, getStockUpdateTime } = require('../services/x/influencerStock');

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

async function checkKVInfluencers() {
  console.log('========================================');
  console.log('KVインフルエンサーリスト確認');
  console.log('========================================\n');

  // KV接続確認
  if (!kv) {
    console.error('❌ KV接続エラー: @vercel/kvが利用できません');
    console.log('環境変数 KV_REST_API_URL または KV_URL が設定されているか確認してください');
    process.exit(1);
  }

  console.log('✅ KV接続成功\n');

  // 各言語のインフルエンサーリストを取得
  const results = {};
  let totalInfluencers = 0;

  for (const lang of SUPPORTED_LANGS) {
    try {
      console.log(`📋 ${lang.toUpperCase()} 言語のインフルエンサーリストを取得中...`);
      
      // ストックから取得
      const influencers = await getInfluencersFromStock(lang, { enableScoring: false });
      
      // 更新時刻を取得
      const updateTime = await getStockUpdateTime(lang);
      
      results[lang] = {
        count: influencers.length,
        influencers: influencers,
        updateTime: updateTime,
      };
      
      totalInfluencers += influencers.length;
      
      console.log(`  ✅ ${lang}: ${influencers.length}人`);
      if (updateTime) {
        const updateDate = new Date(updateTime);
        const now = new Date();
        const diffHours = Math.floor((now - updateDate) / (1000 * 60 * 60));
        console.log(`  📅 最終更新: ${updateTime} (${diffHours}時間前)`);
      } else {
        console.log(`  ⚠️  更新時刻: 不明`);
      }
      
      // 最初の5人の詳細を表示
      if (influencers.length > 0) {
        console.log(`  👥 インフルエンサー一覧（最初の5人）:`);
        influencers.slice(0, 5).forEach((inf, idx) => {
          const username = inf.username || inf.userId || inf.id || 'N/A';
          const followers = inf.followersCount ? inf.followersCount.toLocaleString() : 'N/A';
          const engagementRate = inf.engagementRate 
            ? `${(inf.engagementRate * 100).toFixed(2)}%` 
            : 'N/A';
          const impressions = inf.recentImpressions 
            ? inf.recentImpressions.toLocaleString() 
            : 'N/A';
          
          console.log(`    ${idx + 1}. @${username}`);
          console.log(`       フォロワー: ${followers} | エンゲージメント率: ${engagementRate} | インプレッション: ${impressions}`);
        });
        if (influencers.length > 5) {
          console.log(`    ... 他 ${influencers.length - 5}人`);
        }
      } else {
        console.log(`  ⚠️  インフルエンサーがストックにありません`);
      }
      
      console.log('');
    } catch (error) {
      console.error(`  ❌ ${lang}の取得エラー:`, error.message);
      results[lang] = {
        count: 0,
        influencers: [],
        error: error.message,
      };
      console.log('');
    }
  }

  // サマリー表示
  console.log('========================================');
  console.log('📊 サマリー');
  console.log('========================================');
  console.log(`総インフルエンサー数: ${totalInfluencers}人`);
  console.log('\n言語別内訳:');
  for (const lang of SUPPORTED_LANGS) {
    const result = results[lang];
    const status = result.count > 0 ? '✅' : '⚠️';
    console.log(`  ${status} ${lang}: ${result.count}人`);
  }

  // 詳細情報をJSONファイルに保存（オプション）
  const fs = require('fs');
  const path = require('path');
  const outputPath = path.join(__dirname, '..', 'data', 'kv-influencers-check.json');
  
  // ファイルサイズを考慮して、インフルエンサー情報を簡略化
  const simplifiedResults = {};
  for (const lang of SUPPORTED_LANGS) {
    const result = results[lang];
    simplifiedResults[lang] = {
      count: result.count,
      updateTime: result.updateTime,
      influencers: result.influencers.map(inf => ({
        username: inf.username || inf.userId || inf.id,
        followersCount: inf.followersCount,
        engagementRate: inf.engagementRate,
        recentImpressions: inf.recentImpressions,
        lang: inf.lang,
      })),
      error: result.error || null,
    };
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(simplifiedResults, null, 2), 'utf-8');
  console.log(`\n💾 詳細情報を保存しました: ${outputPath}`);
  
  console.log('\n========================================');
  console.log('✅ 確認完了');
  console.log('========================================');
}

// 実行
checkKVInfluencers().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
