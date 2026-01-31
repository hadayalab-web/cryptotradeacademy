// services/x/influencerStockFromFile.js
// ファイルシステムからインフルエンサーを取得（Git管理版）

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data', 'influencers');
const JSON_FILE_ALL = path.join(DATA_DIR, 'influencers.json'); // 統合ファイル

let cachedData = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5分

/**
 * インフルエンサーデータを読み込む（キャッシュ付き）
 * 言語別ファイルを優先、なければ統合ファイルを使用
 */
function loadInfluencersData(lang = null) {
  const now = Date.now();
  
  // キャッシュが有効な場合は返す
  const cacheKey = lang || 'all';
  if (cachedData && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedData;
  }
  
  try {
    // 言語別ファイルを優先
    if (lang) {
      const langFile = path.join(DATA_DIR, `influencers-${lang}.json`);
      if (fs.existsSync(langFile)) {
        const content = fs.readFileSync(langFile, 'utf-8');
        const data = JSON.parse(content);
        cachedData = data;
        cacheTimestamp = now;
        console.log(`[InfluencerStockFromFile] [${lang.toUpperCase()}] データ読み込み完了: ${data.count}人`);
        return data;
      }
    }
    
    // 統合ファイルを使用
    if (fs.existsSync(JSON_FILE_ALL)) {
      const content = fs.readFileSync(JSON_FILE_ALL, 'utf-8');
      const data = JSON.parse(content);
      cachedData = data;
      cacheTimestamp = now;
      console.log(`[InfluencerStockFromFile] 統合データ読み込み完了: ${data.total}人`);
      return data;
    }
    
    console.warn(`[InfluencerStockFromFile] ファイルが見つかりません`);
    return null;
  } catch (error) {
    console.error(`[InfluencerStockFromFile] 読み込みエラー:`, error.message);
    return null;
  }
}

/**
 * 言語別にインフルエンサーを取得
 * @param {string} lang - 言語コード
 * @param {Object} options - オプション
 * @returns {Array} インフルエンサー配列
 */
function getInfluencersFromStock(lang, options = {}) {
  const data = loadInfluencersData(lang);
  
  if (!data) {
    return [];
  }
  
  // 言語別ファイルの場合は直接返す
  if (data.lang && data.influencers) {
    let influencers = [...data.influencers];
    
    // アクティブなもののみ
    if (options.activeOnly !== false) {
      influencers = influencers.filter(inf => inf.isActive !== false);
    }
    
    // シャドウバンされていないもののみ
    if (options.excludeShadowbanned !== false) {
      influencers = influencers.filter(inf => !inf.shadowbanFlagged);
    }
    
    // 階層でフィルタ
    if (options.tier) {
      influencers = influencers.filter(inf => inf.tier === options.tier);
    }
    
    // ソート
    if (options.sortBy === 'engagementRate') {
      influencers.sort((a, b) => (b.engagementRate || 0) - (a.engagementRate || 0));
    } else if (options.sortBy === 'followerCount') {
      influencers.sort((a, b) => (b.followerCount || 0) - (a.followerCount || 0));
    }
    
    // 上位N件
    if (options.limit) {
      influencers = influencers.slice(0, options.limit);
    }
    
    return influencers;
  }
  
  // 統合ファイルの場合
  if (!data.influencers) {
    return [];
  }
  
  let influencers = data.influencers.filter(inf => 
    inf.lang && inf.lang.toLowerCase() === lang.toLowerCase()
  );
  
  // アクティブなもののみ
  if (options.activeOnly !== false) {
    influencers = influencers.filter(inf => inf.isActive !== false);
  }
  
  // シャドウバンされていないもののみ
  if (options.excludeShadowbanned !== false) {
    influencers = influencers.filter(inf => !inf.shadowbanFlagged);
  }
  
  // 階層でフィルタ
  if (options.tier) {
    influencers = influencers.filter(inf => inf.tier === options.tier);
  }
  
  // ソート
  if (options.sortBy === 'engagementRate') {
    influencers.sort((a, b) => (b.engagementRate || 0) - (a.engagementRate || 0));
  } else if (options.sortBy === 'followerCount') {
    influencers.sort((a, b) => (b.followerCount || 0) - (a.followerCount || 0));
  }
  
  // 上位N件
  if (options.limit) {
    influencers = influencers.slice(0, options.limit);
  }
  
  return influencers;
}

/**
 * すべてのインフルエンサーを取得
 * @returns {Array} インフルエンサー配列
 */
function getAllInfluencers() {
  const data = loadInfluencersData();
  return data && data.influencers ? data.influencers : [];
}

/**
 * 言語別の数を取得
 * @param {string} lang - 言語コード
 * @returns {number} 数
 */
function getCountForLang(lang) {
  const data = loadInfluencersData();
  if (!data || !data.byLang) {
    return 0;
  }
  return data.byLang[lang.toLowerCase()] || 0;
}

/**
 * 合計数を取得
 * @returns {number} 合計数
 */
function getTotalCount() {
  const data = loadInfluencersData();
  return data && data.total ? data.total : 0;
}

module.exports = {
  getInfluencersFromStock,
  getAllInfluencers,
  getCountForLang,
  getTotalCount,
  loadInfluencersData
};
