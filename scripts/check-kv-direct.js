// scripts/check-kv-direct.js
// KVに直接アクセスしてインフルエンサーリストを確認（XAI_API_KEY不要）

const { kv } = require('../utils/kv');

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
const STOCK_KEY_PREFIX = 'x:influencer_stock:';
const STOCK_UPDATE_TIME_KEY_PREFIX = 'x:influencer_stock_update:';

function getStockKey(lang) {
  return `${STOCK_KEY_PREFIX}${lang.toLowerCase()}`;
}

function getUpdateTimeKey(lang) {
  return `${STOCK_UPDATE_TIME_KEY_PREFIX}${lang.toLowerCase()}`;
}

async function checkKVDirect() {
  console.log('========================================');
  console.log('KV直接確認（削除操作なし）');
  console.log('========================================\n');

  // KV接続確認
  if (!kv) {
    console.error('❌ KV接続エラー: @vercel/kvが利用できません');
    console.log('環境変数 KV_REST_API_URL または KV_URL が設定されているか確認してください');
    process.exit(1);
  }

  console.log('✅ KV接続成功\n');
  console.log('📋 KVから直接データを読み取ります（削除操作は一切行いません）\n');

  const results = {};
  let totalInfluencers = 0;

  for (const lang of SUPPORTED_LANGS) {
    try {
      const stockKey = getStockKey(lang);
      const updateTimeKey = getUpdateTimeKey(lang);
      
      console.log(`📋 ${lang.toUpperCase()} 言語のKVキーを確認中...`);
      console.log(`   ストックキー: ${stockKey}`);
      console.log(`   更新時刻キー: ${updateTimeKey}`);
      
      // KVから直接取得（削除操作なし）
      const influencers = await kv.get(stockKey);
      const updateTime = await kv.get(updateTimeKey);
      
      const count = Array.isArray(influencers) ? influencers.length : 0;
      
      results[lang] = {
        count: count,
        influencers: influencers || [],
        updateTime: updateTime || null,
        keyExists: influencers !== null,
      };
      
      totalInfluencers += count;
      
      if (count > 0) {
        console.log(`   ✅ ${lang}: ${count}人（キー存在: ${influencers !== null ? 'あり' : 'なし'}）`);
        if (updateTime) {
          const updateDate = new Date(updateTime);
          const now = new Date();
          const diffHours = Math.floor((now - updateDate) / (1000 * 60 * 60));
          console.log(`   📅 最終更新: ${updateTime} (${diffHours}時間前)`);
        }
        
        // 最初の3人のユーザー名を表示
        if (Array.isArray(influencers) && influencers.length > 0) {
          console.log(`   👥 最初の3人:`);
          influencers.slice(0, 3).forEach((inf, idx) => {
            const username = inf.username || inf.userId || inf.id || 'N/A';
            console.log(`      ${idx + 1}. @${username}`);
          });
        }
      } else {
        if (influencers === null) {
          console.log(`   ⚠️  ${lang}: キーが存在しません（データなしまたはTTL期限切れ）`);
        } else {
          console.log(`   ⚠️  ${lang}: 空配列（0人）`);
        }
      }
      
      console.log('');
    } catch (error) {
      console.error(`   ❌ ${lang}の取得エラー:`, error.message);
      results[lang] = {
        count: 0,
        influencers: [],
        error: error.message,
        keyExists: false,
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
    const keyStatus = result.keyExists ? '（キー存在）' : '（キーなし）';
    console.log(`  ${status} ${lang}: ${result.count}人 ${keyStatus}`);
  }

  // 削除操作の有無を確認
  console.log('\n========================================');
  console.log('🔍 削除操作の確認');
  console.log('========================================');
  console.log('このスクリプトは以下の操作のみを行いました:');
  console.log('  ✅ kv.get() - データの読み取りのみ');
  console.log('  ❌ kv.del() - 削除操作なし');
  console.log('  ❌ kv.set() - 書き込み操作なし');
  console.log('\n結論: このスクリプトはデータを削除していません。');

  // JSONファイルに保存
  const fs = require('fs');
  const path = require('path');
  const outputPath = path.join(__dirname, '..', 'data', 'kv-direct-check.json');
  
  const simplifiedResults = {};
  for (const lang of SUPPORTED_LANGS) {
    const result = results[lang];
    simplifiedResults[lang] = {
      count: result.count,
      updateTime: result.updateTime,
      keyExists: result.keyExists,
      sampleUsernames: result.influencers.slice(0, 5).map(inf => 
        inf.username || inf.userId || inf.id
      ),
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
checkKVDirect().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
