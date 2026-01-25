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
const { selectInfluencersForImpressionTarget, getInfluencerCountForLang } = require('../../config/influencerStrategy');

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
 * ストックからインフルエンサーを取得
 * @param {string} lang - 言語コード
 * @returns {Promise<Array>} インフルエンサー配列
 */
async function getInfluencersFromStock(lang) {
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
  
  console.log(`[InfluencerStock] 🔄 Updating influencer stock for ${targetLang}...`);
  console.log(`[InfluencerStock] Target: ${targetCount} influencers`);
  
  try {
    // Grok APIからインフルエンサーを発見（候補数を多めに取得）
    const candidateCount = Math.max(targetCount * 5, 10); // 候補は目標数の5倍、最低10人
    const discoveredInfluencers = await discoverInfluencersForQuoteRepost(targetLang, { 
      maxResults: candidateCount 
    });
    
    if (!discoveredInfluencers || discoveredInfluencers.length === 0) {
      console.warn(`[InfluencerStock] ⚠️ No influencers discovered for ${targetLang}`);
      return [];
    }
    
    console.log(`[InfluencerStock] Grok API returned ${discoveredInfluencers.length} candidate influencers for ${targetLang}`);
    
    // インプレッション規模を考慮してインフルエンサーを選択
    const selectedInfluencers = selectInfluencersForImpressionTarget(discoveredInfluencers, targetLang);
    
    console.log(`[InfluencerStock] ✅ Selected ${selectedInfluencers.length} influencers for ${targetLang} (target: ${targetCount})`);
    
    // ストックに保存
    const saved = await saveInfluencersToStock(targetLang, selectedInfluencers);
    
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
 * @returns {Promise<Object>} 言語別の更新結果
 */
async function updateAllInfluencerStocks(langs = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko']) {
  const results = {};
  
  console.log(`[InfluencerStock] 🔄 Updating influencer stocks for all languages: ${langs.join(', ')}`);
  
  for (const lang of langs) {
    try {
      const influencers = await updateInfluencerStock(lang);
      results[lang] = {
        success: true,
        count: influencers.length,
        influencers: influencers.slice(0, 5), // 最初の5人だけ返す（ログ用）
      };
      
      // レート制限対策（言語間で5秒待機）
      if (lang !== langs[langs.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 5000));
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
  
  console.log(`[InfluencerStock] ✅✅✅ Completed updating all influencer stocks`);
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
