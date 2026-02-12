// scripts/grok-fetch-and-save-influencers.js
// Grokからインフルエンサーを取得して、まずローカルに保存、その後KVに保存（確実版）

const fs = require('fs');
const path = require('path');
const { discoverInfluencersForQuoteRepost } = require('../services/grok/client');
const { saveInfluencersToStock } = require('../services/x/influencerStock');

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
  console.log(`[${lang.toUpperCase()}] 処理開始: 目標${targetCount}人`);
  console.log(`${'='.repeat(80)}`);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rawFile = path.join(OUTPUT_DIR, `influencers-${lang}-${timestamp}.json`);
  const validatedFile = path.join(OUTPUT_DIR, `influencers-${lang}-${timestamp}-validated.json`);
  
  try {
    // ステップ1: Grokからインフルエンサーを取得
    console.log(`[${lang.toUpperCase()}] 🔵 ステップ1: Grokからインフルエンサーを取得中...`);
    console.log(`[${lang.toUpperCase()}] 📋 要件:`);
    console.log(`[${lang.toUpperCase()}]   - REAL tweetId: 18-19桁の数値（必須）`);
    console.log(`[${lang.toUpperCase()}]   - REAL username: 実際のXユーザー名（@なし）`);
    console.log(`[${lang.toUpperCase()}]   - REAL tweetText: 実際のツイートテキスト`);
    console.log(`[${lang.toUpperCase()}]   - ACTIVE: 過去7日以内に投稿`);
    console.log(`[${lang.toUpperCase()}]   - CRYPTO/BTC content: 暗号/BTC/トレーディング関連`);
    console.log(`[${lang.toUpperCase()}]   - ENGAGEMENT: エンゲージメントあり（5%+推奨、7%+最適）`);
    console.log(`[${lang.toUpperCase()}]   - フォロワー数: 10,000-500,000（最適）`);
    console.log(`[${lang.toUpperCase()}]   - 目標数: ${targetCount}人`);
    const influencers = await discoverInfluencersForQuoteRepost(lang, {
      maxResults: targetCount
    });
    
    if (!influencers || influencers.length === 0) {
      console.error(`[${lang.toUpperCase()}] ❌ Grokからインフルエンサーが取得できませんでした`);
      return { lang, success: false, count: 0, message: 'No influencers from Grok' };
    }
    
    console.log(`[${lang.toUpperCase()}] ✅ Grokから取得: ${influencers.length}人`);
    
    // 取得データの品質確認
    if (influencers.length > 0) {
      const sample = influencers[0];
      console.log(`[${lang.toUpperCase()}] 🔵 サンプルデータ確認:`);
      console.log(`[${lang.toUpperCase()}]   - username: ${sample.username || 'N/A'}`);
      console.log(`[${lang.toUpperCase()}]   - tweetId: ${sample.tweetId || 'N/A'} (${sample.tweetId ? (String(sample.tweetId).length + '桁') : 'N/A'})`);
      console.log(`[${lang.toUpperCase()}]   - tweetText: ${sample.tweetText ? (sample.tweetText.substring(0, 50) + '...') : 'N/A'}`);
      console.log(`[${lang.toUpperCase()}]   - engagementRate: ${sample.engagementRate ? ((sample.engagementRate * 100).toFixed(2) + '%') : 'N/A'}`);
      console.log(`[${lang.toUpperCase()}]   - followerCount: ${sample.followerCount || 'N/A'}`);
      console.log(`[${lang.toUpperCase()}]   - recentImpressions: ${sample.recentImpressions || 'N/A'}`);
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
    console.log(`[${lang.toUpperCase()}] 📊 保存するデータ:`);
    console.log(`[${lang.toUpperCase()}]   - 検証済みインフルエンサー数: ${validInfluencers.length}人`);
    console.log(`[${lang.toUpperCase()}]   - サンプル: @${validInfluencers[0]?.username || 'N/A'} (tweetId: ${validInfluencers[0]?.tweetId || 'N/A'})`);
    
    const saved = await saveInfluencersToStock(lang, validInfluencers);
    
    if (!saved) {
      console.error(`[${lang.toUpperCase()}] ❌❌❌ KV保存失敗`);
      console.error(`[${lang.toUpperCase()}] 💡 ローカルファイルは保存済み: ${validatedFile}`);
      console.error(`[${lang.toUpperCase()}] 💡 後で手動でKVに保存できます: node scripts/save-local-influencers-to-kv.js`);
      return { lang, success: false, count: validInfluencers.length, message: 'KV save failed', localFile: validatedFile };
    }
    
    // ステップ6: KV保存確認（追加検証）
    console.log(`[${lang.toUpperCase()}] 🔵 ステップ6: KV保存確認中（追加検証）...`);
    const { getInfluencersFromStock } = require('../services/x/influencerStock');
    const savedStock = await getInfluencersFromStock(lang);
    const savedCount = Array.isArray(savedStock) ? savedStock.length : 0;
    
    console.log(`[${lang.toUpperCase()}] 🔵 KV保存確認: ${savedCount}人（期待値: ${validInfluencers.length}人）`);
    
    if (savedCount === 0) {
      console.error(`[${lang.toUpperCase()}] ❌ CRITICAL: KV保存後も0人`);
      console.error(`[${lang.toUpperCase()}] 💡 ローカルファイルは保存済み: ${validatedFile}`);
      return { lang, success: false, count: 0, message: 'KV saved but retrieved 0', localFile: validatedFile };
    }
    
    if (savedCount !== validInfluencers.length) {
      console.warn(`[${lang.toUpperCase()}] ⚠️ WARNING: KV保存数が期待値と異なります`);
      console.warn(`[${lang.toUpperCase()}]   - 期待値: ${validInfluencers.length}人`);
      console.warn(`[${lang.toUpperCase()}]   - 実際: ${savedCount}人`);
      console.warn(`[${lang.toUpperCase()}]   - 差分: ${validInfluencers.length - savedCount}人`);
    }
    
    const tierCounts = {
      top: validInfluencers.filter(inf => inf.tier === 'top').length,
      mid: validInfluencers.filter(inf => inf.tier === 'mid').length,
      bottom: validInfluencers.filter(inf => inf.tier === 'bottom').length
    };
    
    console.log(`[${lang.toUpperCase()}] ✅✅✅ 完了: ローカル保存 + KV保存成功`);
    console.log(`[${lang.toUpperCase()}] 📊 KV保存数: ${savedCount}人`);
    console.log(`[${lang.toUpperCase()}] 📊 階層別: Top ${tierCounts.top}, Mid ${tierCounts.mid}, Bottom ${tierCounts.bottom}`);
    console.log(`[${lang.toUpperCase()}] 📁 ローカルファイル: ${validatedFile}`);
    
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
  console.log('Grokからインフルエンサーを取得して保存（確実版）');
  console.log('='.repeat(80));
  console.log(`出力ディレクトリ: ${OUTPUT_DIR}`);
  
  const results = [];
  
  for (const [lang, targetCount] of Object.entries(TARGET_DISTRIBUTION)) {
    const result = await fetchAndSaveLang(lang, targetCount);
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
        console.log(`     💡 後で手動でKVに保存: node scripts/save-local-influencers-to-kv.js`);
      }
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📁 ローカルファイル保存場所:');
  console.log(`   ${OUTPUT_DIR}`);
  console.log('='.repeat(80));
}

// 実行
fetchAndSaveAll().catch(error => {
  console.error('❌ 致命的なエラー:', error.message);
  console.error('スタックトレース:', error.stack);
  process.exit(1);
});
