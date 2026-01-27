// services/x/influencerStock.js
// インフルエンサーストック管理（KVストレージ）

let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[InfluencerStock] @vercel/kv not available:', error.message);
}

const { discoverInfluencersForQuoteRepost } = require('../grok/client');
const { 
  selectInfluencersForImpressionTarget, 
  selectInfluencersForHighEngagement,
  getInfluencerCountForLang,
  getStockCountForLang 
} = require('../../config/influencerStrategy');

// KVキーのプレフィックス
const STOCK_KEY_PREFIX = 'x:influencer_stock:';
const STOCK_UPDATE_TIME_KEY_PREFIX = 'x:influencer_stock_update:';

// ストックの有効期限（24時間）
const STOCK_TTL = 24 * 60 * 60; // 24時間（秒）

/**
 * 言語別のストックキーを生成
 * @param {string} lang - 言語コード
 * @returns {string} KVキー
 */
function getStockKey(lang) {
  return `${STOCK_KEY_PREFIX}${lang.toLowerCase()}`;
}

/**
 * 言語別の更新時刻キーを生成
 * @param {string} lang - 言語コード
 * @returns {string} KVキー
 */
function getUpdateTimeKey(lang) {
  return `${STOCK_UPDATE_TIME_KEY_PREFIX}${lang.toLowerCase()}`;
}

/**
 * インフルエンサーをストックに保存
 * @param {string} lang - 言語コード
 * @param {Array} influencers - インフルエンサー配列
 * @returns {Promise<boolean>} 保存成功時true
 */
async function saveInfluencersToStock(lang, influencers) {
  if (!kv) {
    console.warn('[InfluencerStock] KV not available, cannot save influencers');
    return false;
  }

  try {
    const stockKey = getStockKey(lang);
    const updateTimeKey = getUpdateTimeKey(lang);
    
    // インフルエンサーをストックに保存（TTL: 24時間）
    await kv.set(stockKey, influencers, { ex: STOCK_TTL });
    
    // 更新時刻を保存
    await kv.set(updateTimeKey, new Date().toISOString(), { ex: STOCK_TTL });
    
    console.log(`[InfluencerStock] ✅ Saved ${influencers.length} influencers to stock for ${lang}`);
    return true;
  } catch (error) {
    console.error(`[InfluencerStock] ❌ Failed to save influencers to stock for ${lang}:`, error.message);
    return false;
  }
}

/**
 * ストックからインフルエンサーを取得（スコアリング・フィルタリング機能付き）
 * @param {string} lang - 言語コード
 * @param {Object} options - オプション
 * @param {boolean} options.enableScoring - スコアリングを有効にする（デフォルト: false）
 * @param {number} options.topN - 上位N人を返す（デフォルト: 全員）
 * @returns {Promise<Array>} インフルエンサー配列（スコアリング有効時はスコアでソート）
 */
async function getInfluencersFromStock(lang, options = {}) {
  if (!kv) {
    console.warn('[InfluencerStock] KV not available, cannot get influencers from stock');
    return [];
  }

  try {
    const stockKey = getStockKey(lang);
    const influencers = await kv.get(stockKey);
    
    if (!influencers || !Array.isArray(influencers) || influencers.length === 0) {
      console.log(`[InfluencerStock] No influencers in stock for ${lang}`);
      return [];
    }
    
    console.log(`[InfluencerStock] ✅ Retrieved ${influencers.length} influencers from stock for ${lang}`);

    // 🔒 言語整合性検証: ストックに保存されたインフルエンサーが正しい言語のストックから取得されているか確認
    // 注意: インフルエンサーオブジェクトにlangフィールドがある場合は検証、なければ警告のみ
    const mismatchedLang = influencers.filter(inf => inf.lang && inf.lang.toLowerCase() !== lang.toLowerCase());
    if (mismatchedLang.length > 0) {
      console.error(`[InfluencerStock] ⚠️⚠️⚠️ LANGUAGE MISMATCH WARNING: Found ${mismatchedLang.length} influencers with mismatched language in stock for ${lang}:`, 
        mismatchedLang.map(inf => `@${inf.username} (lang: ${inf.lang})`));
      // 言語不一致のインフルエンサーを除外
      influencers = influencers.filter(inf => !inf.lang || inf.lang.toLowerCase() === lang.toLowerCase());
      console.log(`[InfluencerStock] ✅ Filtered to ${influencers.length} influencers with correct language (${lang})`);
    }

    // 🔥 改善: スコアリング機能が有効な場合、Webhookデータからエンゲージメント統計を取得してスコアを計算
    if (options.enableScoring) {
      const influencersWithScores = await Promise.all(
        influencers.map(async (influencer) => {
          // Webhookデータからインフルエンサー別のエンゲージメント統計を取得
          const influencerStatsKey = `x:webhook:stats:influencer:${influencer.username}`;
          const influencerStats = await kv.get(influencerStatsKey) || {
            totalLikes: 0,
            totalRetweets: 0,
            totalReplies: 0,
            tweetCount: 0,
          };

          // 動的スコアリング: エンゲージメント率60% + インプレッション30% + コンバージョン10%
          const engagementRate = influencer.engagementRate || 0;
          const recentImpressions = influencer.recentImpressions || 0;
          const totalEngagement = (influencerStats.totalLikes || 0) + (influencerStats.totalRetweets || 0) + (influencerStats.totalReplies || 0);
          
          // スコア計算（0-100の範囲に正規化）
          const engagementScore = engagementRate * 60; // エンゲージメント率（0-1）を60点満点に
          const impressionsScore = Math.min(recentImpressions / 100000, 1) * 30; // インプレッション（0-100k）を30点満点に
          const conversionScore = Math.min(totalEngagement / 100, 1) * 10; // 総エンゲージメント（0-100）を10点満点に
          
          const score = engagementScore + impressionsScore + conversionScore;

          return {
            ...influencer,
            score,
            webhookStats: influencerStats,
          };
        })
      );

      // スコアでソート（降順）
      influencersWithScores.sort((a, b) => (b.score || 0) - (a.score || 0));

      // topNが指定されている場合は上位N人を返す
      const result = options.topN ? influencersWithScores.slice(0, options.topN) : influencersWithScores;
      
      console.log(`[InfluencerStock] ✅ Scored and sorted ${result.length} influencers (top score: ${result[0]?.score?.toFixed(2) || 'N/A'})`);
      return result;
    }
    
    return influencers;
  } catch (error) {
    console.error(`[InfluencerStock] ❌ Failed to get influencers from stock for ${lang}:`, error.message);
    return [];
  }
}

/**
 * ストックの更新時刻を取得
 * @param {string} lang - 言語コード
 * @returns {Promise<string|null>} 更新時刻（ISO 8601形式）またはnull
 */
async function getStockUpdateTime(lang) {
  if (!kv) {
    return null;
  }

  try {
    const updateTimeKey = getUpdateTimeKey(lang);
    const updateTime = await kv.get(updateTimeKey);
    return updateTime || null;
  } catch (error) {
    console.error(`[InfluencerStock] Failed to get update time for ${lang}:`, error.message);
    return null;
  }
}

/**
 * ストックを更新（Grok APIから新しいインフルエンサーを取得してストックに保存）
 * @param {string} lang - 言語コード
 * @param {Object} options - オプション
 * @returns {Promise<Array>} 更新されたインフルエンサー配列
 */
async function updateInfluencerStock(lang, options = {}) {
  const targetLang = (lang || 'en').toLowerCase();
  const targetCount = getInfluencerCountForLang(targetLang);
  const stockCount = getStockCountForLang(targetLang);
  
  console.log(`[InfluencerStock] 🔄 Updating influencer stock for ${targetLang}...`);
  console.log(`[InfluencerStock] Target: ${stockCount} influencers for stock (posting: ${targetCount})`);
  
  try {
    // Grok APIからインフルエンサーを発見（候補数を大幅に増加 - 好反応率重視）
    // ストック数の5倍以上を取得して、より良い選択肢を確保（最大限の探索）
    const candidateCount = Math.max(stockCount * 5, 50); // ストック数の5倍、最低50人（最大限の探索）
    console.log(`[InfluencerStock] Requesting ${candidateCount} candidate influencers from Grok API (maximum exploration)...`);
    
    const discoveredInfluencers = await discoverInfluencersForQuoteRepost(targetLang, { 
      maxResults: candidateCount 
    });
    
    if (!discoveredInfluencers || discoveredInfluencers.length === 0) {
      console.warn(`[InfluencerStock] ⚠️ No influencers discovered for ${targetLang}`);
      return [];
    }
    
    console.log(`[InfluencerStock] Grok API returned ${discoveredInfluencers.length} candidate influencers for ${targetLang}`);
    
    // エンゲージメント率でフィルタリング（最低4%以上）
    const highEngagementInfluencers = discoveredInfluencers.filter(inf => {
      const engagementRate = inf.engagementRate || 0;
      return engagementRate >= 0.04; // 4%以上
    });
    
    console.log(`[InfluencerStock] Filtered to ${highEngagementInfluencers.length} influencers with 4%+ engagement rate`);
    
    // 好反応率重視の選択戦略を使用（エンゲージメント率とインプレッション数のバランス）
    const selectedInfluencers = selectInfluencersForHighEngagement(
      highEngagementInfluencers.length > 0 ? highEngagementInfluencers : discoveredInfluencers,
      targetLang
    );
    
    console.log(`[InfluencerStock] ✅ Selected ${selectedInfluencers.length} influencers for ${targetLang} stock (target: ${stockCount})`);
    
    // 選択されたインフルエンサーの統計を表示
    if (selectedInfluencers.length > 0) {
      const avgEngagement = selectedInfluencers.reduce((sum, inf) => sum + (inf.engagementRate || 0), 0) / selectedInfluencers.length;
      const avgImpressions = selectedInfluencers.reduce((sum, inf) => sum + (inf.recentImpressions || 0), 0) / selectedInfluencers.length;
      console.log(`[InfluencerStock] 📊 Average engagement rate: ${(avgEngagement * 100).toFixed(2)}%`);
      console.log(`[InfluencerStock] 📊 Average impressions: ${avgImpressions.toLocaleString()}`);
    }
    
    // 🔒 言語整合性保証: すべてのインフルエンサーにlangフィールドを設定
    const influencersWithLang = selectedInfluencers.map(inf => ({
      ...inf,
      lang: targetLang, // 明示的に言語を設定
    }));
    
    // ストックに保存
    const saved = await saveInfluencersToStock(targetLang, influencersWithLang);
    
    if (saved) {
      console.log(`[InfluencerStock] ✅✅✅ Successfully updated stock for ${targetLang} with ${selectedInfluencers.length} influencers`);
    } else {
      console.warn(`[InfluencerStock] ⚠️ Failed to save influencers to stock for ${targetLang}`);
    }
    
    return selectedInfluencers;
  } catch (error) {
    console.error(`[InfluencerStock] ❌ Failed to update influencer stock for ${targetLang}:`, error.message);
    console.error(`[InfluencerStock] Error stack:`, error.stack);
    return [];
  }
}

/**
 * すべての言語のストックを更新
 * @param {Array<string>} langs - 言語コード配列（省略時は全言語）
 * @param {Object} options - オプション
 * @param {number} options.timeoutMs - タイムアウト時間（ミリ秒、デフォルト: 無制限）
 * @returns {Promise<Object>} 言語別の更新結果
 */
async function updateAllInfluencerStocks(langs = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'], options = {}) {
  const results = {};
  const startTime = Date.now();
  const timeoutMs = options.timeoutMs || Infinity;
  
  console.log(`[InfluencerStock] 🔄 Updating influencer stocks for all languages: ${langs.join(', ')}`);
  if (timeoutMs !== Infinity) {
    console.log(`[InfluencerStock] ⚠️ Timeout set to ${timeoutMs}ms`);
  }
  
  for (const lang of langs) {
    // タイムアウトチェック
    const elapsed = Date.now() - startTime;
    if (elapsed > timeoutMs) {
      console.warn(`[InfluencerStock] ⚠️ Timeout approaching (${elapsed}ms), stopping updates`);
      results[lang] = {
        success: false,
        error: 'Timeout: Stopped before processing this language',
        count: 0,
      };
      break;
    }
    
    try {
      const influencers = await updateInfluencerStock(lang);
      results[lang] = {
        success: true,
        count: influencers.length,
        influencers: influencers.slice(0, 5), // 最初の5人だけ返す（ログ用）
      };
      
      // レート制限対策（言語間で3秒待機、タイムアウト対策で短縮）
      if (lang !== langs[langs.length - 1]) {
        const remainingTime = timeoutMs - (Date.now() - startTime);
        const waitTime = Math.min(3000, remainingTime - 1000); // 最低1秒のバッファを残す
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    } catch (error) {
      console.error(`[InfluencerStock] ❌ Failed to update stock for ${lang}:`, error.message);
      results[lang] = {
        success: false,
        error: error.message,
        count: 0,
      };
    }
  }
  
  const totalElapsed = Date.now() - startTime;
  console.log(`[InfluencerStock] ✅✅✅ Completed updating all influencer stocks (${totalElapsed}ms)`);
  return results;
}

/**
 * ストックからインフルエンサーを取得（ストックが空の場合は新規取得）
 * @param {string} lang - 言語コード
 * @param {boolean} forceRefresh - 強制更新フラグ
 * @returns {Promise<Array>} インフルエンサー配列
 */
async function getInfluencersWithFallback(lang, forceRefresh = false) {
  const targetLang = (lang || 'en').toLowerCase();
  
  // 強制更新でない場合、ストックから取得を試みる
  if (!forceRefresh) {
    const stockInfluencers = await getInfluencersFromStock(targetLang);
    if (stockInfluencers && stockInfluencers.length > 0) {
      console.log(`[InfluencerStock] Using stock influencers for ${targetLang} (${stockInfluencers.length} influencers)`);
      return stockInfluencers;
    }
  }
  
  // ストックが空または強制更新の場合、新規取得
  console.log(`[InfluencerStock] Stock empty or force refresh, fetching new influencers for ${targetLang}...`);
  const newInfluencers = await updateInfluencerStock(targetLang);
  
  if (newInfluencers && newInfluencers.length > 0) {
    return newInfluencers;
  }
  
  // 新規取得も失敗した場合、空配列を返す
  console.warn(`[InfluencerStock] ⚠️ No influencers available for ${targetLang}`);
  return [];
}

module.exports = {
  saveInfluencersToStock,
  getInfluencersFromStock,
  getStockUpdateTime,
  updateInfluencerStock,
  updateAllInfluencerStocks,
  getInfluencersWithFallback,
};
