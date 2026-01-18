// services/lead-discovery/xLeadDiscovery.js
// X API連携によるリード発見スクリプト

const { detectKeywords, isPerfectMatch, calculateLeadScore } = require('./keywordMonitor');
const { searchTweets, replyToTweet, getTrends } = require('../x/client');

/**
 * X APIでリードを検索
 * @param {string} query - 検索クエリ（Twitter検索構文）
 * @param {string} lang - 言語コード
 * @param {number} maxResults - 最大結果数（10-100）
 * @returns {Promise<Array>} リード情報の配列
 */
async function searchLeadsOnX(query, lang = 'en', maxResults = 100) {
  try {
    // X API v2でツイートを検索
    const searchResult = await searchTweets(query, {
      maxResults: Math.min(maxResults, 100),
      sortOrder: 'relevancy',
    });

    const leads = [];
    const tweets = searchResult.data || [];
    const users = searchResult.includes?.users || [];

    // ユーザー情報をマップ
    const userMap = {};
    users.forEach(user => {
      userMap[user.id] = user;
    });

    // 各ツイートからリードを発見
    for (const tweet of tweets) {
      const lead = discoverLeadFromTweet(tweet, lang, userMap[tweet.author_id]);
      if (lead) {
        leads.push(lead);
      }
    }

    return leads;
  } catch (error) {
    console.error('[X Lead Discovery] Failed to search leads:', error.message);
    return [];
  }
}

/**
 * X投稿からリードを発見
 * @param {Object} tweet - X投稿オブジェクト
 * @param {string} lang - 言語コード
 * @param {Object} user - ユーザー情報（オプション）
 * @returns {Object|null} リード情報（発見時）またはnull
 */
function discoverLeadFromTweet(tweet, lang = 'en', user = null) {
  if (!tweet || !tweet.text) return null;
  
  // キーワード検出
  const detectionResult = detectKeywords(tweet.text, lang);
  
  if (!detectionResult.matched) return null;
  
  // エンゲージメント率を計算
  const engagementRate = calculateEngagementRate(tweet);
  
  // リード品質スコア計算
  const userData = {
    engagementRate,
    followersCount: user?.public_metrics?.followers_count || tweet.public_metrics?.followers_count || 0,
  };
  
  const score = calculateLeadScore(detectionResult, userData);
  const isPerfect = isPerfectMatch(detectionResult, userData);
  
  return {
    userId: tweet.author_id,
    username: user?.username || tweet.username,
    tweetId: tweet.id,
    lang: detectionResult.lang,
    text: tweet.text.substring(0, 200),
    keywords: detectionResult.keywords,
    priority: detectionResult.priority,
    score,
    isPerfectMatch: isPerfect,
    engagementRate,
    timestamp: new Date().toISOString(),
  };
}

/**
 * エンゲージメント率を計算
 * @param {Object} tweet - X投稿オブジェクト
 * @returns {number} エンゲージメント率（0-1）
 */
function calculateEngagementRate(tweet) {
  if (!tweet.public_metrics) return 0;
  
  const { like_count = 0, retweet_count = 0, reply_count = 0, quote_count = 0 } = tweet.public_metrics;
  const totalEngagement = like_count + retweet_count + reply_count + quote_count;
  const followersCount = tweet.author_id ? (tweet.public_metrics?.followers_count || 1000) : 1000;
  
  // エンゲージメント率 = 総エンゲージメント / フォロワー数
  return Math.min(totalEngagement / followersCount, 1.0);
}

/**
 * リードにリプライでVSL1を送信
 * @param {Object} lead - リード情報
 * @returns {Promise<boolean>} 送信成功時true
 */
async function replyVSL1ToLead(lead) {
  if (!lead || !lead.tweetId) return false;
  
  try {
    // VSL1メッセージを生成（言語別）
    const { generateVSL1Message } = require('../telegram/messages/vsl1');
    const { getTelegramDeepLink } = require('../../api/vsl1-post');
    const VSL1_YOUTUBE_LINK = process.env.VSL1_YOUTUBE_LINK || 'https://youtu.be/OqvqngJOiXc';
    
    const deepLink = getTelegramDeepLink(lead.lang);
    const message = generateVSL1Message(lead.lang, deepLink, VSL1_YOUTUBE_LINK);
    
    // X投稿にリプライ（280文字制限に合わせて調整）
    // メッセージからHTMLタグを除去してテキストのみに
    const plainText = message.replace(/<[^>]*>/g, '').replace(/\n/g, ' ');
    const replyText = `${plainText.substring(0, 200)}... ${VSL1_YOUTUBE_LINK}`;
    
    // X API v2でリプライを送信
    await replyToTweet(replyText, lead.tweetId);
    
    console.log(`[X Lead Discovery] VSL1 reply sent to tweet ${lead.tweetId}`);
    return true;
  } catch (error) {
    console.error('[X Lead Discovery] Failed to reply VSL1 to lead:', error.message);
    return false;
  }
}

/**
 * Xトレンドからリードを発見
 * @param {string} lang - 言語コード
 * @param {number} woeid - Where On Earth ID（1 = 全世界、23424856 = 日本など）
 * @returns {Promise<Array>} リード情報の配列
 */
async function discoverLeadsFromTrends(lang = 'en', woeid = 1) {
  try {
    // X API v1.1でトレンドを取得
    const trends = await getTrends(woeid);
    
    const leads = [];
    
    // トレンド名からキーワードを検出
    for (const trend of trends) {
      if (!trend.name) continue;
      
      // トレンド名からキーワードを検出
      const detectionResult = detectKeywords(trend.name, lang);
      
      if (detectionResult.matched) {
        // トレンド名がキーワードにマッチした場合、そのトレンドに関連するツイートを検索
        const query = `${trend.name} -is:retweet lang:${lang}`;
        const trendLeads = await searchLeadsOnX(query, lang, 10);
        leads.push(...trendLeads);
      }
    }
    
    return leads;
  } catch (error) {
    console.error('[X Lead Discovery] Failed to discover leads from trends:', error.message);
    return [];
  }
}

module.exports = {
  searchLeadsOnX,
  discoverLeadFromTweet,
  replyVSL1ToLead,
  discoverLeadsFromTrends,
  calculateEngagementRate,
};
