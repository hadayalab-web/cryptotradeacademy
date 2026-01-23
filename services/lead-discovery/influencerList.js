// services/lead-discovery/influencerList.js
// 引用リポストするインフルエンサーのリスト管理

const { createClient } = require('@vercel/kv');

const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

let kvClient = null;
if (KV_REST_API_URL && KV_REST_API_TOKEN) {
  kvClient = createClient({
    url: KV_REST_API_URL,
    token: KV_REST_API_TOKEN,
  });
}

const INFLUENCER_LIST_PREFIX = 'influencer_list:';
const INFLUENCER_LIST_INDEX_KEY = 'influencer_list_index';

/**
 * インフルエンサーIDを生成
 * @param {Object} influencer - インフルエンサー情報
 * @returns {string} インフルエンサーID
 */
function generateInfluencerId(influencer) {
  const crypto = require('crypto');
  const data = `influencer:${influencer.username || influencer.userId || 'unknown'}_${influencer.tweetId || Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

/**
 * インフルエンサーをリストに追加
 * @param {Object} influencer - インフルエンサー情報
 * @returns {Promise<string>} インフルエンサーID
 */
async function addInfluencerToList(influencer) {
  if (!kvClient) {
    console.warn('[Influencer List] KV client not initialized, skipping add');
    return null;
  }

  const influencerId = generateInfluencerId(influencer);
  const influencerData = {
    id: influencerId,
    username: influencer.username,
    userId: influencer.userId,
    tweetId: influencer.tweetId,
    lang: influencer.lang || null,
    followers: influencer.followers || 0,
    engagement: influencer.recentImpressions || 0,
    addedAt: new Date().toISOString(),
    lastQuoteRepostAt: null,
    quoteRepostCount: 0,
    lastEngagement: influencer.recentImpressions || 0,
  };

  try {
    // インフルエンサー情報を保存
    await kvClient.set(`${INFLUENCER_LIST_PREFIX}${influencerId}`, JSON.stringify(influencerData), { ex: 365 * 24 * 60 * 60 }); // 1年間保存
    
    // インフルエンサーIDをインデックスに追加
    await kvClient.sadd(INFLUENCER_LIST_INDEX_KEY, influencerId);
    
    console.log(`[Influencer List] Added influencer: ${influencerId} (@${influencer.username})`);
    return influencerId;
  } catch (error) {
    console.error('[Influencer List] Failed to add influencer:', error.message);
    return null;
  }
}

/**
 * 引用リポストを記録
 * @param {string} influencerId - インフルエンサーID
 * @param {string} quoteTweetId - 引用リポストのツイートID
 * @param {Object} metrics - メトリクスデータ（オプション）
 * @returns {Promise<void>}
 */
async function recordQuoteRepost(influencerId, quoteTweetId, metrics = null) {
  if (!kvClient) return;

  try {
    const influencerDataRaw = await kvClient.get(`${INFLUENCER_LIST_PREFIX}${influencerId}`);
    if (!influencerDataRaw) return;

    const influencerData = typeof influencerDataRaw === 'string' ? JSON.parse(influencerDataRaw) : influencerDataRaw;
    influencerData.lastQuoteRepostAt = new Date().toISOString();
    influencerData.quoteRepostCount = (influencerData.quoteRepostCount || 0) + 1;
    
    // メトリクスを記録（引用リポスト履歴に追加）
    if (!influencerData.quoteReposts) {
      influencerData.quoteReposts = [];
    }
    influencerData.quoteReposts.push({
      quoteTweetId,
      postedAt: new Date().toISOString(),
      metrics: metrics || null,
    });
    
    // 最新10件のみ保持
    if (influencerData.quoteReposts.length > 10) {
      influencerData.quoteReposts = influencerData.quoteReposts.slice(-10);
    }

    await kvClient.set(`${INFLUENCER_LIST_PREFIX}${influencerId}`, JSON.stringify(influencerData), { ex: 365 * 24 * 60 * 60 });
  } catch (error) {
    console.error('[Influencer List] Failed to record quote repost:', error.message);
  }
}

/**
 * インフルエンサーリストを取得
 * @param {Object} options - オプション
 * @returns {Promise<Array>} インフルエンサーの配列
 */
async function getInfluencerList(options = {}) {
  if (!kvClient) {
    return [];
  }

  const { lang = null, limit = 100 } = options;

  try {
    const influencerIds = await kvClient.smembers(INFLUENCER_LIST_INDEX_KEY);
    const influencers = [];

    for (const influencerId of influencerIds.slice(0, limit)) {
      const influencerDataRaw = await kvClient.get(`${INFLUENCER_LIST_PREFIX}${influencerId}`);
      if (!influencerDataRaw) continue;

      const influencerData = typeof influencerDataRaw === 'string' ? JSON.parse(influencerDataRaw) : influencerDataRaw;
      
      // 言語フィルター
      if (lang && influencerData.lang !== lang) continue;

      influencers.push(influencerData);
    }

    return influencers;
  } catch (error) {
    console.error('[Influencer List] Failed to get influencer list:', error.message);
    return [];
  }
}

/**
 * インフルエンサーリスト統計を取得
 * @returns {Promise<Object>} 統計情報
 */
async function getInfluencerListStats() {
  if (!kvClient) {
    return {
      total: 0,
      byLang: {},
      totalQuoteReposts: 0,
    };
  }

  try {
    const influencers = await getInfluencerList({ limit: 1000 });
    const stats = {
      total: influencers.length,
      byLang: {},
      totalQuoteReposts: 0,
    };

    for (const influencer of influencers) {
      const lang = influencer.lang || 'unknown';
      stats.byLang[lang] = (stats.byLang[lang] || 0) + 1;
      stats.totalQuoteReposts += influencer.quoteRepostCount || 0;
    }

    return stats;
  } catch (error) {
    console.error('[Influencer List] Failed to get stats:', error.message);
    return {
      total: 0,
      byLang: {},
      totalQuoteReposts: 0,
    };
  }
}

module.exports = {
  generateInfluencerId,
  addInfluencerToList,
  recordQuoteRepost,
  getInfluencerList,
  getInfluencerListStats,
};
