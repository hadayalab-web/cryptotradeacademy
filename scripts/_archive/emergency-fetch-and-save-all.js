// scripts/emergency-fetch-and-save-all.js
// 緊急: Grokから760人を再取得してKVに確実に保存

// 環境変数を設定（バッチファイルからの実行時用）
if (!process.env.XAI_API_KEY) {
  process.env.XAI_API_KEY = 'xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii';
}
if (!process.env.KV_REST_API_TOKEN) {
  process.env.KV_REST_API_TOKEN = 'AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI';
}
if (!process.env.KV_REST_API_URL) {
  process.env.KV_REST_API_URL = 'https://genuine-stork-35682.upstash.io';
}
if (!process.env.KV_URL) {
  process.env.KV_URL = 'rediss://default:AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI@genuine-stork-35682.upstash.io:6379';
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'rediss://default:AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI@genuine-stork-35682.upstash.io:6379';
}

const fs = require('fs');
const path = require('path');
const { discoverInfluencersForQuoteRepost } = require('../services/grok/client');
const { saveInfluencersToStock, getInfluencersFromStock } = require('../services/x/influencerStock');

const TARGET_DISTRIBUTION = {
  'en': 210,
  'es': 168,
  'pt-br': 168,
  'ar': 112,
  'ja': 98,
  'ko': 84
};

const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'grok-influencers');

// 出力ディレクトリを作成
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
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

async function fetchAndSaveLang(lang, targetCount) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`[${lang.toUpperCase()}] 🚨 緊急取得: 目標${targetCount}人`);
  console.log(`${'='.repeat(80)}`);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rawFile = path.join(OUTPUT_DIR, `influencers-${lang}-${timestamp}.json`);
  const validatedFile = path.join(OUTPUT_DIR, `influencers-${lang}-${timestamp}-validated.json`);
  
  try {
    // ステップ1: Grokからインフルエンサーを取得
    console.log(`[${lang.toUpperCase()}] 🔵 ステップ1: Grokからインフルエンサーを取得中...`);
    const influencers = await discoverInfluencersForQuoteRepost(lang, {
      maxResults: targetCount
    });
    
    if (!influencers || influencers.length === 0) {
      console.error(`[${lang.toUpperCase()}] ❌ Grokからインフルエンサーが取得できませんでした`);
      return { lang, success: false, count: 0, message: 'No influencers from Grok' };
    }
    
    console.log(`[${lang.toUpperCase()}] ✅ Grokから取得: ${influencers.length}人`);
    
    // サンプルデータ確認
    if (influencers.length > 0) {
      const sample = influencers[0];
      console.log(`[${lang.toUpperCase()}] 📊 サンプル: @${sample.username || 'N/A'} (tweetId: ${sample.tweetId || 'N/A'})`);
    }
    
    // ステップ2: ローカルに生データを保存（確実に）
    console.log(`[${lang.toUpperCase()}] 🔵 ステップ2: ローカルに生データを保存中...`);
    fs.writeFileSync(rawFile, JSON.stringify(influencers, null, 2), 'utf-8');
    console.log(`[${lang.toUpperCase()}] ✅ 生データ保存完了: ${rawFile}`);
    
    // ステップ3: データ検証と拡張
    console.log(`[${lang.toUpperCase()}] 🔵 ステップ3: データ検証と拡張中...`);
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
        if (!inf.tweetText || !inf.tweetText.trim()) {
          console.warn(`[${lang.toUpperCase()}] ❌ Skipping without tweetText: @${inf.username || 'unknown'}`);
          return false;
        }
        return true;
      })
      .map(inf => {
        try {
          const normalizedInf = {
            ...inf,
            tweetId: String(inf.tweetId).trim(),
            username: String(inf.username).trim().replace(/^@/, ''),
          };
          return enrichInfluencerData(normalizedInf, lang);
        } catch (enrichError) {
          console.warn(`[${lang.toUpperCase()}] ❌ enrichInfluencerDataエラー:`, enrichError.message);
          return null;
        }
      })
      .filter(inf => inf !== null);
    
    console.log(`[${lang.toUpperCase()}] ✅ 検証後: ${validInfluencers.length}人（元: ${influencers.length}人）`);
    
    if (validInfluencers.length === 0) {
      console.error(`[${lang.toUpperCase()}] ❌ CRITICAL: 検証後0人`);
      return { lang, success: false, count: 0, message: 'All filtered out' };
    }
    
    // ステップ4: 検証済みデータをローカルに保存（確実に）
    console.log(`[${lang.toUpperCase()}] 🔵 ステップ4: 検証済みデータをローカルに保存中...`);
    fs.writeFileSync(validatedFile, JSON.stringify(validInfluencers, null, 2), 'utf-8');
    console.log(`[${lang.toUpperCase()}] ✅ 検証済みデータ保存完了: ${validatedFile}`);
    
    // ステップ5: KVに保存（保存後の検証も含む）
    console.log(`[${lang.toUpperCase()}] 🔵 ステップ5: KVに保存中...`);
    const saved = await saveInfluencersToStock(lang, validInfluencers);
    
    if (!saved) {
      console.error(`[${lang.toUpperCase()}] ❌❌❌ KV保存失敗`);
      console.error(`[${lang.toUpperCase()}] 💡 ローカルファイルは保存済み: ${validatedFile}`);
      return { lang, success: false, count: validInfluencers.length, message: 'KV save failed', localFile: validatedFile };
    }
    
    // ステップ6: KV保存確認（追加検証）
    console.log(`[${lang.toUpperCase()}] 🔵 ステップ6: KV保存確認中...`);
    const savedStock = await getInfluencersFromStock(lang);
    const savedCount = Array.isArray(savedStock) ? savedStock.length : 0;
    
    console.log(`[${lang.toUpperCase()}] 🔵 KV保存確認: ${savedCount}人（期待値: ${validInfluencers.length}人）`);
    
    if (savedCount === 0) {
      console.error(`[${lang.toUpperCase()}] ❌ CRITICAL: KV保存後も0人`);
      return { lang, success: false, count: 0, message: 'KV saved but retrieved 0', localFile: validatedFile };
    }
    
    const tierCounts = {
      top: validInfluencers.filter(inf => inf.tier === 'top').length,
      mid: validInfluencers.filter(inf => inf.tier === 'mid').length,
      bottom: validInfluencers.filter(inf => inf.tier === 'bottom').length
    };
    
    console.log(`[${lang.toUpperCase()}] ✅✅✅ 完了: ローカル保存 + KV保存成功`);
    console.log(`[${lang.toUpperCase()}] 📊 KV保存数: ${savedCount}人`);
    console.log(`[${lang.toUpperCase()}] 📊 階層別: Top ${tierCounts.top}, Mid ${tierCounts.mid}, Bottom ${tierCounts.bottom}`);
    
    return { 
      lang, 
      success: true, 
      count: savedCount, 
      tierCounts,
      localFile: validatedFile,
      rawFile: rawFile
    };
    
  } catch (error) {
    console.error(`[${lang.toUpperCase()}] ❌ エラー:`, error.message);
    console.error(`[${lang.toUpperCase()}] Stack:`, error.stack);
    return { lang, success: false, count: 0, message: error.message };
  }
}

async function fetchAndSaveAll() {
  console.log('='.repeat(80));
  console.log('🚨 緊急: Grokから760人を再取得してKVに保存');
  console.log('='.repeat(80));
  console.log(`出力ディレクトリ: ${OUTPUT_DIR}`);
  console.log();
  
  const results = [];
  
  for (const [lang, targetCount] of Object.entries(TARGET_DISTRIBUTION)) {
    const result = await fetchAndSaveLang(lang, targetCount);
    results.push(result);
    
    // 言語間で待機（APIレート制限対策）
    if (lang !== 'ko') {
      console.log(`\n次の言語処理前に10秒待機...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  // サマリー
  console.log('\n' + '='.repeat(80));
  console.log('📊 最終結果');
  console.log('='.repeat(80));
  const success = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const total = results.reduce((sum, r) => sum + r.count, 0);
  
  console.log(`✅ 成功: ${success.length}言語 (${total}人)`);
  console.log(`❌ 失敗: ${failed.length}言語`);
  console.log(`📊 合計: ${total}人 / 目標840人 (${((total/840)*100).toFixed(1)}%)`);
  console.log();
  
  if (success.length > 0) {
    console.log('成功した言語:');
    success.forEach(r => {
      console.log(`  ✅ ${r.lang.toUpperCase()}: ${r.count}人`);
      if (r.localFile) {
        console.log(`     📁 ローカルファイル: ${r.localFile}`);
      }
    });
  }
  
  if (failed.length > 0) {
    console.log('\n失敗した言語:');
    failed.forEach(r => {
      console.log(`  ❌ ${r.lang.toUpperCase()}: ${r.message}`);
      if (r.localFile) {
        console.log(`     📁 ローカルファイルは保存済み: ${r.localFile}`);
      }
    });
  }
  
  console.log('\n' + '='.repeat(80));
  
  if (total >= 700) {
    console.log('✅✅✅ 緊急復旧成功！760人以上がKVに保存されました');
    console.log('💡 次のステップ: X投稿CronJobが正常に動作するか確認');
  } else if (total > 0) {
    console.log('⚠️ 部分成功: 一部の言語が失敗しました');
    console.log('💡 失敗した言語は後で再実行してください');
  } else {
    console.error('❌ CRITICAL: すべての言語が失敗しました');
    console.error('💡 KV接続とGrok APIキーを確認してください');
    process.exit(1);
  }
  
  console.log('='.repeat(80));
}

// 実行
fetchAndSaveAll().catch(error => {
  console.error('❌ 致命的なエラー:', error.message);
  console.error('スタックトレース:', error.stack);
  process.exit(1);
});
