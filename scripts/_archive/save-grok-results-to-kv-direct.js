// scripts/save-grok-results-to-kv-direct.js
// Grokの結果を直接KVに保存（環境変数設定済み前提）

const { saveInfluencersToStock } = require('../services/x/influencerStock');
const { discoverInfluencersForQuoteRepost } = require('../services/grok/client');

// 深掘り分析に基づく最適配分
const TARGET_DISTRIBUTION = {
  'en': 210,
  'es': 168,
  'pt-br': 168,
  'ar': 112,
  'ja': 98,
  'ko': 84
};

/**
 * フォロワー数に基づいて階層を判定
 */
function determineTier(followerCount) {
  if (typeof followerCount === 'string') {
    const match = followerCount.match(/(\d+)/);
    if (match) {
      followerCount = parseInt(match[1]);
    } else {
      return 'mid';
    }
  }
  
  if (typeof followerCount !== 'number') {
    return 'mid';
  }
  
  if (followerCount >= 10000) {
    return 'top';
  } else if (followerCount >= 1000) {
    return 'mid';
  } else {
    return 'bottom';
  }
}

/**
 * インフルエンサーにタスク推進に必要な情報を追加
 */
function enrichInfluencerData(influencer, lang) {
  if (!influencer.tweetId) {
    throw new Error(`CRITICAL: enrichInfluencerData called with influencer without tweetId: @${influencer.username || 'unknown'}`);
  }
  
  const tweetIdStr = String(influencer.tweetId).trim();
  if (!/^\d{18,19}$/.test(tweetIdStr)) {
    throw new Error(`CRITICAL: Invalid tweetId format in enrichInfluencerData: ${tweetIdStr} for @${influencer.username || 'unknown'}`);
  }
  
  const followerCount = influencer.followerCount || 0;
  const tier = determineTier(followerCount);
  
  return {
    username: String(influencer.username).trim().replace(/^@/, ''),
    tweetId: tweetIdStr,
    tweetText: influencer.tweetText || '',
    lang: lang.toLowerCase(),
    engagementRate: influencer.engagementRate || 0,
    followerCount: followerCount,
    recentImpressions: influencer.recentImpressions || 0,
    tier: tier,
    discoveredAt: new Date().toISOString(),
    lastQuoteAt: null,
    quoteCount: 0,
    lastQuoteDate: null,
    totalQuotes: 0,
    totalImpressions: 0,
    totalEngagements: 0,
    conversions: 0,
    shadowbanFlagged: false,
    shadowbanDetectedAt: null,
    rotationCycle: 0,
    isActive: true,
    notes: '',
    tags: []
  };
}

/**
 * 一言語のインフルエンサーを取得してKVに保存
 */
async function saveLangToKV(lang, targetCount) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`[${lang.toUpperCase()}] 処理開始: 目標${targetCount}人`);
  console.log(`${'='.repeat(80)}`);
  
  try {
    // Grokからインフルエンサーを取得
    console.log(`[${lang.toUpperCase()}] 🔵 Grokからインフルエンサーを取得中...`);
    const influencers = await discoverInfluencersForQuoteRepost(lang, {
      maxResults: targetCount
    });
    
    if (!influencers || influencers.length === 0) {
      console.error(`[${lang.toUpperCase()}] ❌ Grokからインフルエンサーが取得できませんでした`);
      return { lang, success: false, count: 0, message: 'No influencers from Grok' };
    }
    
    console.log(`[${lang.toUpperCase()}] ✅ Grokから取得: ${influencers.length}人`);
    console.log(`[${lang.toUpperCase()}] 🔵 サンプル:`, JSON.stringify(influencers[0] || {}, null, 2));
    
    // データ検証と拡張
    const validInfluencers = influencers
      .filter(inf => {
        if (!inf.tweetId) {
          console.warn(`[${lang.toUpperCase()}] ❌ Skipping without tweetId:`, inf.username || 'unknown');
          return false;
        }
        const tweetIdStr = String(inf.tweetId).trim();
        if (!/^\d{18,19}$/.test(tweetIdStr)) {
          console.warn(`[${lang.toUpperCase()}] ❌ Invalid tweetId: ${tweetIdStr} for @${inf.username || 'unknown'}`);
          return false;
        }
        if (!inf.username || !inf.username.trim()) {
          console.warn(`[${lang.toUpperCase()}] ❌ Skipping without username`);
          return false;
        }
        return true;
      })
      .map(inf => {
        const normalizedInf = {
          ...inf,
          tweetId: String(inf.tweetId).trim(),
          username: String(inf.username).trim().replace(/^@/, ''),
        };
        return enrichInfluencerData(normalizedInf, lang);
      });
    
    console.log(`[${lang.toUpperCase()}] ✅ 検証後: ${validInfluencers.length}人（元: ${influencers.length}人）`);
    
    if (validInfluencers.length === 0) {
      console.error(`[${lang.toUpperCase()}] ❌ CRITICAL: 検証後0人`);
      return { lang, success: false, count: 0, message: 'All filtered out' };
    }
    
    // KVに保存
    console.log(`[${lang.toUpperCase()}] 🔵 KVに保存を試みます...`);
    const saved = await saveInfluencersToStock(lang, validInfluencers);
    
    if (saved) {
      const tierCounts = {
        top: validInfluencers.filter(inf => inf.tier === 'top').length,
        mid: validInfluencers.filter(inf => inf.tier === 'mid').length,
        bottom: validInfluencers.filter(inf => inf.tier === 'bottom').length
      };
      console.log(`[${lang.toUpperCase()}] ✅✅✅ KVに保存完了: ${validInfluencers.length}人`);
      console.log(`[${lang.toUpperCase()}] 📊 階層別: Top ${tierCounts.top}, Mid ${tierCounts.mid}, Bottom ${tierCounts.bottom}`);
      return { lang, success: true, count: validInfluencers.length, tierCounts };
    } else {
      console.error(`[${lang.toUpperCase()}] ❌❌❌ KVへの保存に失敗`);
      return { lang, success: false, count: validInfluencers.length, message: 'KV save failed' };
    }
    
  } catch (error) {
    console.error(`[${lang.toUpperCase()}] ❌ エラー:`, error.message);
    console.error(`[${lang.toUpperCase()}] Stack:`, error.stack);
    return { lang, success: false, count: 0, message: error.message };
  }
}

/**
 * 全言語を処理
 */
async function saveAllToKV() {
  console.log('='.repeat(80));
  console.log('Grokの結果を直接KVに保存');
  console.log('='.repeat(80));
  
  const results = [];
  
  for (const [lang, targetCount] of Object.entries(TARGET_DISTRIBUTION)) {
    const result = await saveLangToKV(lang, targetCount);
    results.push(result);
    
    // 言語間で待機
    if (lang !== 'ko') {
      console.log(`\n次の言語処理前に5秒待機...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // サマリー
  console.log('\n' + '='.repeat(80));
  console.log('サマリー');
  console.log('='.repeat(80));
  const success = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const total = results.reduce((sum, r) => sum + r.count, 0);
  
  console.log(`✅ 成功: ${success.length}言語`);
  console.log(`❌ 失敗: ${failed.length}言語`);
  console.log(`📊 合計: ${total}人 / 目標840人`);
  
  if (success.length > 0) {
    console.log('\n成功した言語:');
    success.forEach(r => {
      console.log(`  ✅ ${r.lang.toUpperCase()}: ${r.count}人`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n失敗した言語:');
    failed.forEach(r => {
      console.log(`  ❌ ${r.lang.toUpperCase()}: ${r.message}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
}

// 実行
saveAllToKV().catch(error => {
  console.error('❌ 致命的なエラー:', error.message);
  console.error('スタックトレース:', error.stack);
  process.exit(1);
});
