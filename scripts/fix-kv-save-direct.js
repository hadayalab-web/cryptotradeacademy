// scripts/fix-kv-save-direct.js
// KV保存問題を直接修正するスクリプト（Grokから取得してKVに保存）

const { kv } = require('../utils/kv');
const { discoverInfluencersForQuoteRepost } = require('../services/grok/client');

const TARGET_DISTRIBUTION = {
  'en': 210,
  'es': 168,
  'pt-br': 168,
  'ar': 112,
  'ja': 98,
  'ko': 84
};

const STOCK_KEY_PREFIX = 'x:influencer_stock:';
const STOCK_UPDATE_TIME_KEY_PREFIX = 'x:influencer_stock_update:';

function getStockKey(lang) {
  return `${STOCK_KEY_PREFIX}${lang.toLowerCase()}`;
}

function getUpdateTimeKey(lang) {
  return `${STOCK_UPDATE_TIME_KEY_PREFIX}${lang.toLowerCase()}`;
}

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

async function saveLangToKV(lang, targetCount) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`[${lang.toUpperCase()}] 処理開始: 目標${targetCount}人`);
  console.log(`${'='.repeat(80)}`);
  
  try {
    // KV接続確認
    if (!kv) {
      console.error(`[${lang.toUpperCase()}] ❌ CRITICAL: KV not available`);
      return { lang, success: false, count: 0, message: 'KV not available' };
    }
    
    // KV接続テスト
    try {
      const testKey = `x:test:${Date.now()}`;
      const testResult = await kv.set(testKey, { test: true }, { ex: 10 });
      if (!testResult) {
        console.error(`[${lang.toUpperCase()}] ❌ KV接続テスト失敗`);
        return { lang, success: false, count: 0, message: 'KV connection test failed' };
      }
      const testValue = await kv.get(testKey);
      if (!testValue || !testValue.test) {
        console.error(`[${lang.toUpperCase()}] ❌ KV接続テスト失敗: 値が取得できません`);
        return { lang, success: false, count: 0, message: 'KV connection test failed: value not retrieved' };
      }
      await kv.del(testKey);
      console.log(`[${lang.toUpperCase()}] ✅ KV接続テスト成功`);
    } catch (testError) {
      console.error(`[${lang.toUpperCase()}] ❌ KV接続テストエラー:`, testError.message);
      return { lang, success: false, count: 0, message: `KV connection test error: ${testError.message}` };
    }
    
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
    
    // KVに直接保存（utils/kv.jsを経由せず、@vercel/kvを直接使用）
    const stockKey = getStockKey(lang);
    const updateTimeKey = getUpdateTimeKey(lang);
    
    console.log(`[${lang.toUpperCase()}] 🔵 KVに直接保存を試みます...`);
    console.log(`[${lang.toUpperCase()}] キー: ${stockKey}`);
    console.log(`[${lang.toUpperCase()}] 保存データ数: ${validInfluencers.length}人`);
    
    try {
      // @vercel/kvを直接使用
      const kvModule = require('@vercel/kv');
      const kvDirect = kvModule.kv;
      
      if (!kvDirect) {
        console.error(`[${lang.toUpperCase()}] ❌ @vercel/kv.kv が null です`);
        console.error(`[${lang.toUpperCase()}] 💡 環境変数を確認: KV_REST_API_URL, KV_REST_API_TOKEN`);
        return { lang, success: false, count: validInfluencers.length, message: '@vercel/kv.kv is null' };
      }
      
      // データサイズ確認（デバッグ用）
      const dataSize = JSON.stringify(validInfluencers).length;
      console.log(`[${lang.toUpperCase()}] 🔵 保存データサイズ: ${dataSize} bytes (${(dataSize / 1024).toFixed(2)} KB)`);
      
      // サンプルデータ確認（最初の1人）
      if (validInfluencers.length > 0) {
        console.log(`[${lang.toUpperCase()}] 🔵 サンプルデータ:`, JSON.stringify({
          username: validInfluencers[0].username,
          tweetId: validInfluencers[0].tweetId,
          lang: validInfluencers[0].lang,
          tier: validInfluencers[0].tier
        }, null, 2));
      }
      
      // 直接保存（エラーハンドリング強化）
      console.log(`[${lang.toUpperCase()}] 🔵 kvDirect.set() 実行中...`);
      try {
        await kvDirect.set(stockKey, validInfluencers);
        console.log(`[${lang.toUpperCase()}] ✅ kvDirect.set() 成功（例外なし）`);
      } catch (setError) {
        console.error(`[${lang.toUpperCase()}] ❌ kvDirect.set() 例外発生:`, setError.message);
        console.error(`[${lang.toUpperCase()}] Stack:`, setError.stack);
        console.error(`[${lang.toUpperCase()}] エラー詳細:`, {
          name: setError.name,
          code: setError.code,
          statusCode: setError.statusCode,
          response: setError.response
        });
        throw setError; // 再スローして外側のcatchで処理
      }
      
      // 保存確認（即座に）
      console.log(`[${lang.toUpperCase()}] 🔵 保存確認中...`);
      let savedStock = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          savedStock = await kvDirect.get(stockKey);
          break;
        } catch (getError) {
          retryCount++;
          console.warn(`[${lang.toUpperCase()}] ⚠️ 保存確認エラー (リトライ ${retryCount}/${maxRetries}):`, getError.message);
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
          } else {
            throw getError;
          }
        }
      }
      
      const savedCount = Array.isArray(savedStock) ? savedStock.length : 0;
      console.log(`[${lang.toUpperCase()}] 🔵 保存確認: ${savedCount}人`);
      
      if (savedCount === 0) {
        console.error(`[${lang.toUpperCase()}] ❌ CRITICAL: 保存後も0人（保存が失敗している可能性）`);
        console.error(`[${lang.toUpperCase()}] 💡 確認事項:`);
        console.error(`[${lang.toUpperCase()}]   - KV環境変数が正しく設定されているか`);
        console.error(`[${lang.toUpperCase()}]   - KVストアが存在するか`);
        console.error(`[${lang.toUpperCase()}]   - ネットワーク接続が正常か`);
        return { lang, success: false, count: 0, message: 'Saved but retrieved 0 influencers' };
      }
      
      if (savedCount !== validInfluencers.length) {
        console.error(`[${lang.toUpperCase()}] ❌ CRITICAL: 保存数不一致（期待: ${validInfluencers.length}, 実際: ${savedCount}）`);
        console.error(`[${lang.toUpperCase()}] 💡 部分的な保存が成功した可能性があります`);
        // 部分的な保存でも成功として扱う（後で再実行可能）
        const tierCounts = {
          top: (savedStock || []).filter(inf => inf.tier === 'top').length,
          mid: (savedStock || []).filter(inf => inf.tier === 'mid').length,
          bottom: (savedStock || []).filter(inf => inf.tier === 'bottom').length
        };
        console.log(`[${lang.toUpperCase()}] ⚠️ 部分保存: ${savedCount}人 / 期待: ${validInfluencers.length}人`);
        console.log(`[${lang.toUpperCase()}] 📊 階層別: Top ${tierCounts.top}, Mid ${tierCounts.mid}, Bottom ${tierCounts.bottom}`);
        return { lang, success: true, count: savedCount, tierCounts, partial: true };
      }
      
      // 更新時刻を保存
      try {
        await kvDirect.set(updateTimeKey, new Date().toISOString());
        console.log(`[${lang.toUpperCase()}] ✅ 更新時刻保存成功`);
      } catch (timeError) {
        console.warn(`[${lang.toUpperCase()}] ⚠️ 更新時刻保存失敗（非致命的）:`, timeError.message);
      }
      
      const tierCounts = {
        top: validInfluencers.filter(inf => inf.tier === 'top').length,
        mid: validInfluencers.filter(inf => inf.tier === 'mid').length,
        bottom: validInfluencers.filter(inf => inf.tier === 'bottom').length
      };
      
      console.log(`[${lang.toUpperCase()}] ✅✅✅ KVに保存完了: ${validInfluencers.length}人`);
      console.log(`[${lang.toUpperCase()}] 📊 階層別: Top ${tierCounts.top}, Mid ${tierCounts.mid}, Bottom ${tierCounts.bottom}`);
      
      return { lang, success: true, count: validInfluencers.length, tierCounts };
      
    } catch (saveError) {
      console.error(`[${lang.toUpperCase()}] ❌❌❌ KV保存エラー:`, saveError.message);
      console.error(`[${lang.toUpperCase()}] Stack:`, saveError.stack);
      console.error(`[${lang.toUpperCase()}] エラー詳細:`, {
        name: saveError.name,
        code: saveError.code,
        statusCode: saveError.statusCode,
        message: saveError.message
      });
      console.error(`[${lang.toUpperCase()}] 💡 確認事項:`);
      console.error(`[${lang.toUpperCase()}]   - KV_REST_API_URL: ${process.env.KV_REST_API_URL ? '設定済み' : '未設定'}`);
      console.error(`[${lang.toUpperCase()}]   - KV_REST_API_TOKEN: ${process.env.KV_REST_API_TOKEN ? '設定済み' : '未設定'}`);
      console.error(`[${lang.toUpperCase()}]   - KV_URL: ${process.env.KV_URL ? '設定済み' : '未設定'}`);
      return { lang, success: false, count: validInfluencers.length, message: `Save error: ${saveError.message}` };
    }
    
  } catch (error) {
    console.error(`[${lang.toUpperCase()}] ❌ エラー:`, error.message);
    console.error(`[${lang.toUpperCase()}] Stack:`, error.stack);
    return { lang, success: false, count: 0, message: error.message };
  }
}

async function saveAllToKV() {
  console.log('='.repeat(80));
  console.log('KV保存問題を直接修正（Grok → KV直接保存）');
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
