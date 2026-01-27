// scripts/refresh-stock-from-grok.js
// Grok APIから再取得してKVストレージを正確に更新

require('dotenv').config({ path: '.env' });

const { discoverInfluencersForQuoteRepost } = require('../services/grok/client');
const { 
  selectInfluencersForHighEngagement,
  getStockCountForLang 
} = require('../config/influencerStrategy');

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

function getStockKey(lang) {
  return `${STOCK_KEY_PREFIX}${lang.toLowerCase()}`;
}

function getUpdateTimeKey(lang) {
  return `${STOCK_UPDATE_TIME_KEY_PREFIX}${lang.toLowerCase()}`;
}

async function saveInfluencersToStock(lang, influencers) {
  if (!kv) {
    console.warn('[Refresh] KV not available, cannot save influencers');
    return false;
  }

  try {
    const stockKey = getStockKey(lang);
    const updateTimeKey = getUpdateTimeKey(lang);
    
    // インフルエンサーをストックに保存（TTL: 24時間）
    await kv.set(stockKey, influencers, { ex: STOCK_TTL });
    
    // 更新時刻を保存
    await kv.set(updateTimeKey, new Date().toISOString(), { ex: STOCK_TTL });
    
    console.log(`[Refresh] ✅ Saved ${influencers.length} influencers to stock for ${lang}`);
    return true;
  } catch (error) {
    console.error(`[Refresh] ❌ Failed to save influencers to stock for ${lang}:`, error.message);
    return false;
  }
}

async function refreshStockForLang(lang) {
  const targetLang = (lang || 'en').toLowerCase();
  const stockCount = getStockCountForLang(targetLang);
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🔄 ${targetLang.toUpperCase()} 言語のストックをGrok APIから再取得中...`);
  console.log(`📊 目標ストック数: ${stockCount}人\n`);
  
  try {
    // Grok APIからインフルエンサーを発見
    const candidateCount = Math.max(stockCount * 5, 50);
    console.log(`[Refresh] Grok APIから ${candidateCount}人の候補を取得中...`);
    
    const discoveredInfluencers = await discoverInfluencersForQuoteRepost(targetLang, { 
      maxResults: candidateCount 
    });
    
    if (!discoveredInfluencers || discoveredInfluencers.length === 0) {
      console.warn(`[Refresh] ⚠️ No influencers discovered for ${targetLang}`);
      return { success: false, count: 0, error: 'No influencers discovered' };
    }
    
    console.log(`[Refresh] ✅ Grok APIから ${discoveredInfluencers.length}人の候補を取得`);
    
    // 取得したデータの構造を確認（最初の1人）
    if (discoveredInfluencers.length > 0) {
      console.log(`\n📋 Grok APIが返したデータ構造（最初の1人）:`);
      console.log(JSON.stringify(discoveredInfluencers[0], null, 2));
      console.log('');
    }
    
    // エンゲージメント率でフィルタリング（最低4%以上）
    const highEngagementInfluencers = discoveredInfluencers.filter(inf => {
      const engagementRate = inf.engagementRate || 0;
      return engagementRate >= 0.04; // 4%以上
    });
    
    console.log(`[Refresh] 📊 4%以上のエンゲージメント率: ${highEngagementInfluencers.length}人`);
    
    // 好反応率重視の選択戦略を使用
    const selectedInfluencers = selectInfluencersForHighEngagement(
      highEngagementInfluencers.length > 0 ? highEngagementInfluencers : discoveredInfluencers,
      targetLang
    );
    
    console.log(`[Refresh] ✅ 選択されたインフルエンサー: ${selectedInfluencers.length}人（目標: ${stockCount}人）`);
    
    // 選択されたインフルエンサーの統計を表示
    if (selectedInfluencers.length > 0) {
      const avgEngagement = selectedInfluencers.reduce((sum, inf) => sum + (inf.engagementRate || 0), 0) / selectedInfluencers.length;
      const avgImpressions = selectedInfluencers.reduce((sum, inf) => sum + (inf.recentImpressions || 0), 0) / selectedInfluencers.length;
      console.log(`[Refresh] 📊 平均エンゲージメント率: ${(avgEngagement * 100).toFixed(2)}%`);
      console.log(`[Refresh] 📊 平均インプレッション: ${avgImpressions.toLocaleString()}`);
      
      // 必須フィールドの確認
      const missingFields = [];
      selectedInfluencers.forEach((inf, idx) => {
        if (!inf.username) missingFields.push(`[${idx}] username`);
        if (!inf.tweetId) missingFields.push(`[${idx}] tweetId`);
        if (!inf.lang) missingFields.push(`[${idx}] lang`);
      });
      
      if (missingFields.length > 0) {
        console.warn(`[Refresh] ⚠️ 必須フィールドが欠落: ${missingFields.slice(0, 5).join(', ')}${missingFields.length > 5 ? '...' : ''}`);
      } else {
        console.log(`[Refresh] ✅ すべてのインフルエンサーに必須フィールドが設定済み`);
      }
    }
    
    // 🔒 言語整合性保証: すべてのインフルエンサーにlangフィールドを設定
    const influencersWithLang = selectedInfluencers.map(inf => ({
      ...inf,
      lang: targetLang, // 明示的に言語を設定
    }));
    
    // KVに保存
    const saved = await saveInfluencersToStock(targetLang, influencersWithLang);
    
    if (saved) {
      console.log(`[Refresh] ✅✅✅ ${targetLang.toUpperCase()} のストックを更新しました（${influencersWithLang.length}人）`);
      return { success: true, count: influencersWithLang.length, influencers: influencersWithLang };
    } else {
      console.warn(`[Refresh] ⚠️ Failed to save influencers to stock for ${targetLang}`);
      return { success: false, count: 0, error: 'Failed to save' };
    }
  } catch (error) {
    console.error(`[Refresh] ❌ Failed to refresh stock for ${targetLang}:`, error.message);
    console.error(`[Refresh] Error stack:`, error.stack);
    return { success: false, count: 0, error: error.message };
  }
}

async function refreshAllStocks() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 すべての言語のストックをGrok APIから再取得');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const results = {};
  
  for (const lang of SUPPORTED_LANGS) {
    const result = await refreshStockForLang(lang);
    results[lang] = result;
    
    // レート制限対策（言語間で3秒待機）
    if (lang !== SUPPORTED_LANGS[SUPPORTED_LANGS.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // サマリー
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 サマリー\n');
  
  const successLangs = Object.keys(results).filter(lang => results[lang].success);
  const failedLangs = Object.keys(results).filter(lang => !results[lang].success);
  
  console.log(`✅ 成功: ${successLangs.length}言語`);
  successLangs.forEach(lang => {
    const result = results[lang];
    console.log(`   - ${lang.toUpperCase()}: ${result.count}人`);
  });
  
  if (failedLangs.length > 0) {
    console.log(`\n❌ 失敗: ${failedLangs.length}言語`);
    failedLangs.forEach(lang => {
      const result = results[lang];
      console.log(`   - ${lang.toUpperCase()}: ${result.error || 'Unknown error'}`);
    });
  }
  
  const totalCount = Object.values(results)
    .filter(r => r.success)
    .reduce((sum, r) => sum + (r.count || 0), 0);
  
  console.log(`\n📊 合計ストック数: ${totalCount}人`);
  
  return results;
}

// 実行
if (require.main === module) {
  const langArg = process.argv[2];
  
  if (langArg) {
    // 指定言語のみ更新
    refreshStockForLang(langArg)
      .then(() => {
        console.log('\n✅ 完了');
        process.exit(0);
      })
      .catch(error => {
        console.error('\n❌ エラー:', error);
        process.exit(1);
      });
  } else {
    // 全言語更新
    refreshAllStocks()
      .then(() => {
        console.log('\n✅ 完了');
        process.exit(0);
      })
      .catch(error => {
        console.error('\n❌ エラー:', error);
        process.exit(1);
      });
  }
}

module.exports = { refreshStockForLang, refreshAllStocks };
