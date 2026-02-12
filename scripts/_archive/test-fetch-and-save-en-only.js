// scripts/test-fetch-and-save-en-only.js
// ENのみをテスト実行（確実版）

const fs = require('fs');
const path = require('path');
const { discoverInfluencersForQuoteRepost } = require('../services/grok/client');
const { saveInfluencersToStock } = require('../services/x/influencerStock');

const TARGET_COUNT = 210; // EN: 210人
const LANG = 'en';

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

async function testFetchAndSaveEN() {
  console.log('\n' + '='.repeat(80));
  console.log(`[${LANG.toUpperCase()}] テスト実行: 目標${TARGET_COUNT}人`);
  console.log('='.repeat(80));
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rawFile = path.join(OUTPUT_DIR, `influencers-${LANG}-${timestamp}.json`);
  const validatedFile = path.join(OUTPUT_DIR, `influencers-${LANG}-${timestamp}-validated.json`);
  
  try {
    // ステップ1: Grokからインフルエンサーを取得
    console.log(`[${LANG.toUpperCase()}] 🔵 ステップ1: Grokからインフルエンサーを取得中...`);
    console.log(`[${LANG.toUpperCase()}] 📋 要件:`);
    console.log(`[${LANG.toUpperCase()}]   - REAL tweetId: 18-19桁の数値（必須）`);
    console.log(`[${LANG.toUpperCase()}]   - REAL username: 実際のXユーザー名（@なし）`);
    console.log(`[${LANG.toUpperCase()}]   - REAL tweetText: 実際のツイートテキスト`);
    console.log(`[${LANG.toUpperCase()}]   - ACTIVE: 過去7日以内に投稿`);
    console.log(`[${LANG.toUpperCase()}]   - CRYPTO/BTC content: 暗号/BTC/トレーディング関連`);
    console.log(`[${LANG.toUpperCase()}]   - ENGAGEMENT: エンゲージメントあり（5%+推奨、7%+最適）`);
    console.log(`[${LANG.toUpperCase()}]   - フォロワー数: 10,000-500,000（最適）`);
    console.log(`[${LANG.toUpperCase()}]   - 目標数: ${TARGET_COUNT}人`);
    
    const influencers = await discoverInfluencersForQuoteRepost(LANG, {
      maxResults: TARGET_COUNT
    });
    
    if (!influencers || influencers.length === 0) {
      console.error(`[${LANG.toUpperCase()}] ❌ Grokからインフルエンサーが取得できませんでした`);
      process.exit(1);
    }
    
    console.log(`[${LANG.toUpperCase()}] ✅ Grokから取得: ${influencers.length}人`);
    
    // 取得データの品質確認
    if (influencers.length > 0) {
      const sample = influencers[0];
      console.log(`[${LANG.toUpperCase()}] 🔵 サンプルデータ確認:`);
      console.log(`[${LANG.toUpperCase()}]   - username: ${sample.username || 'N/A'}`);
      console.log(`[${LANG.toUpperCase()}]   - tweetId: ${sample.tweetId || 'N/A'} (${sample.tweetId ? (String(sample.tweetId).length + '桁') : 'N/A'})`);
      console.log(`[${LANG.toUpperCase()}]   - tweetText: ${sample.tweetText ? (sample.tweetText.substring(0, 50) + '...') : 'N/A'}`);
      console.log(`[${LANG.toUpperCase()}]   - engagementRate: ${sample.engagementRate ? ((sample.engagementRate * 100).toFixed(2) + '%') : 'N/A'}`);
      console.log(`[${LANG.toUpperCase()}]   - followerCount: ${sample.followerCount || 'N/A'}`);
      console.log(`[${LANG.toUpperCase()}]   - recentImpressions: ${sample.recentImpressions || 'N/A'}`);
    }
    
    // ステップ2: ローカルに生データを保存（確実に）
    console.log(`[${LANG.toUpperCase()}] 🔵 ステップ2: ローカルに生データを保存中...`);
    fs.writeFileSync(rawFile, JSON.stringify(influencers, null, 2), 'utf-8');
    console.log(`[${LANG.toUpperCase()}] ✅ 生データ保存完了: ${rawFile}`);
    
    // ステップ3: データ検証と拡張
    console.log(`[${LANG.toUpperCase()}] 🔵 ステップ3: データ検証と拡張中...`);
    const validInfluencers = influencers
      .filter(inf => {
        if (!inf.tweetId) {
          console.warn(`[${LANG.toUpperCase()}] ❌ Skipping without tweetId:`, inf.username || 'unknown');
          return false;
        }
        const tweetIdStr = String(inf.tweetId).trim();
        if (!/^\d{18,19}$/.test(tweetIdStr)) {
          console.warn(`[${LANG.toUpperCase()}] ❌ Invalid tweetId: ${tweetIdStr} for @${inf.username || 'unknown'}`);
          return false;
        }
        if (!inf.username || !inf.username.trim()) {
          console.warn(`[${LANG.toUpperCase()}] ❌ Skipping without username`);
          return false;
        }
        if (!inf.tweetText || !inf.tweetText.trim()) {
          console.warn(`[${LANG.toUpperCase()}] ❌ Skipping without tweetText: @${inf.username || 'unknown'}`);
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
          return enrichInfluencerData(normalizedInf, LANG);
        } catch (enrichError) {
          console.warn(`[${LANG.toUpperCase()}] ❌ enrichInfluencerDataエラー:`, enrichError.message);
          return null;
        }
      })
      .filter(inf => inf !== null);
    
    console.log(`[${LANG.toUpperCase()}] ✅ 検証後: ${validInfluencers.length}人（元: ${influencers.length}人）`);
    
    if (validInfluencers.length === 0) {
      console.error(`[${LANG.toUpperCase()}] ❌ CRITICAL: 検証後0人`);
      process.exit(1);
    }
    
    // ステップ4: 検証済みデータをローカルに保存（確実に）
    console.log(`[${LANG.toUpperCase()}] 🔵 ステップ4: 検証済みデータをローカルに保存中...`);
    fs.writeFileSync(validatedFile, JSON.stringify(validInfluencers, null, 2), 'utf-8');
    console.log(`[${LANG.toUpperCase()}] ✅ 検証済みデータ保存完了: ${validatedFile}`);
    
    // ステップ5: KVに保存（保存後の検証も含む）
    console.log(`[${LANG.toUpperCase()}] 🔵 ステップ5: KVに保存中...`);
    console.log(`[${LANG.toUpperCase()}] 📊 保存するデータ:`);
    console.log(`[${LANG.toUpperCase()}]   - 検証済みインフルエンサー数: ${validInfluencers.length}人`);
    console.log(`[${LANG.toUpperCase()}]   - サンプル: @${validInfluencers[0]?.username || 'N/A'} (tweetId: ${validInfluencers[0]?.tweetId || 'N/A'})`);
    
    const saved = await saveInfluencersToStock(LANG, validInfluencers);
    
    if (!saved) {
      console.error(`[${LANG.toUpperCase()}] ❌❌❌ KV保存失敗`);
      console.error(`[${LANG.toUpperCase()}] 💡 ローカルファイルは保存済み: ${validatedFile}`);
      console.error(`[${LANG.toUpperCase()}] 💡 後で手動でKVに保存できます: node scripts/save-local-influencers-to-kv.js`);
      process.exit(1);
    }
    
    // ステップ6: KV保存確認（追加検証）
    console.log(`[${LANG.toUpperCase()}] 🔵 ステップ6: KV保存確認中（追加検証）...`);
    const { getInfluencersFromStock } = require('../services/x/influencerStock');
    const savedStock = await getInfluencersFromStock(LANG);
    const savedCount = Array.isArray(savedStock) ? savedStock.length : 0;
    
    console.log(`[${LANG.toUpperCase()}] 🔵 KV保存確認: ${savedCount}人（期待値: ${validInfluencers.length}人）`);
    
    if (savedCount === 0) {
      console.error(`[${LANG.toUpperCase()}] ❌ CRITICAL: KV保存後も0人`);
      console.error(`[${LANG.toUpperCase()}] 💡 ローカルファイルは保存済み: ${validatedFile}`);
      process.exit(1);
    }
    
    if (savedCount !== validInfluencers.length) {
      console.warn(`[${LANG.toUpperCase()}] ⚠️ WARNING: KV保存数が期待値と異なります`);
      console.warn(`[${LANG.toUpperCase()}]   - 期待値: ${validInfluencers.length}人`);
      console.warn(`[${LANG.toUpperCase()}]   - 実際: ${savedCount}人`);
      console.warn(`[${LANG.toUpperCase()}]   - 差分: ${validInfluencers.length - savedCount}人`);
    }
    
    const tierCounts = {
      top: validInfluencers.filter(inf => inf.tier === 'top').length,
      mid: validInfluencers.filter(inf => inf.tier === 'mid').length,
      bottom: validInfluencers.filter(inf => inf.tier === 'bottom').length
    };
    
    console.log('\n' + '='.repeat(80));
    console.log(`[${LANG.toUpperCase()}] ✅✅✅ テスト成功！`);
    console.log('='.repeat(80));
    console.log(`[${LANG.toUpperCase()}] 📊 KV保存数: ${savedCount}人`);
    console.log(`[${LANG.toUpperCase()}] 📊 階層別: Top ${tierCounts.top}, Mid ${tierCounts.mid}, Bottom ${tierCounts.bottom}`);
    console.log(`[${LANG.toUpperCase()}] 📁 ローカルファイル: ${validatedFile}`);
    console.log(`[${LANG.toUpperCase()}] 📁 生データファイル: ${rawFile}`);
    console.log('='.repeat(80));
    
    console.log('\n✅ テスト成功！全言語実行の準備ができました。');
    console.log('💡 次のコマンドで全言語を実行: node scripts/grok-fetch-and-save-influencers.js');
    
  } catch (error) {
    console.error(`[${LANG.toUpperCase()}] ❌ エラー:`, error.message);
    console.error(`[${LANG.toUpperCase()}] Stack:`, error.stack);
    process.exit(1);
  }
}

// 実行
testFetchAndSaveEN().catch(error => {
  console.error('❌ 致命的なエラー:', error.message);
  console.error('スタックトレース:', error.stack);
  process.exit(1);
});
