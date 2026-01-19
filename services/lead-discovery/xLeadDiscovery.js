// services/lead-discovery/xLeadDiscovery.js
// Grok（X AI API）によるリード発見スクリプト

const { detectKeywords, isPerfectMatch, calculateLeadScore } = require('./keywordMonitor');
const { replyToTweet } = require('../x/client');
const { discoverLeadsOnX } = require('../grok/client');

/**
 * Grok（X AI API）でリードを検索
 * @param {string} query - 検索クエリ（例: "BTC lost", "hacked wallet"）
 * @param {string} lang - 言語コード
 * @param {number} maxResults - 最大結果数（Grokが返すsourcesから抽出）
 * @returns {Promise<Array>} リード情報の配列
 */
async function searchLeadsOnX(query, lang = 'en', maxResults = 100) {
  try {
    // Grok（X AI API）でリード発見
    const grokResult = await discoverLeadsOnX(query, lang);
    
    // Grokの結果からリードを抽出
    const leads = [];
    
    if (grokResult && grokResult.sources && Array.isArray(grokResult.sources)) {
      for (const source of grokResult.sources.slice(0, maxResults)) {
        if (source.handle && source.note) {
          // source.noteからキーワードを検出
          const detectionResult = detectKeywords(source.note, lang);
          
          if (detectionResult.matched) {
            const userData = {
              engagementRate: 0.1, // Grokから取得できないためデフォルト値
            };
            
            const score = calculateLeadScore(detectionResult, userData);
            const isPerfect = isPerfectMatch(detectionResult, userData);
            
            // tweet IDを取得（Grokが返したtweetId、またはnull）
            const tweetId = source.tweetId || null;
            
            leads.push({
              userId: null,
              username: source.handle.replace('@', ''),
              tweetId: tweetId,
              lang: detectionResult.lang,
              text: source.note.substring(0, 200),
              keywords: detectionResult.keywords,
              priority: detectionResult.priority,
              score,
              isPerfectMatch: isPerfect,
              engagementRate: 0.1,
              timestamp: new Date().toISOString(),
              source: 'grok',
            });
          }
        }
      }
    }
    
    return leads;
  } catch (error) {
    console.error('[X Lead Discovery] Failed to search leads with Grok:', error.message);
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
  // tweetIdがない場合はスキップ（Grokから取得できなかった場合）
  if (!lead || !lead.tweetId) {
    console.warn(`[X Lead Discovery] Skipping lead without tweetId: ${lead?.username || 'unknown'}`);
    return false;
  }
  
  // 重複送信防止チェック
  const { hasSentVSL1, markVSL1Sent } = require('./duplicatePrevention');
  if (await hasSentVSL1(lead)) {
    console.log(`[X Lead Discovery] VSL1 already sent to tweet ${lead.tweetId} (user: @${lead.username})`);
    return false;
  }
  
  // レート制限チェック
  const { checkXApiRateLimit, waitForRateLimit } = require('./rateLimiter');
  const canProceed = await checkXApiRateLimit();
  if (!canProceed) {
    console.warn('[X Lead Discovery] Rate limit exceeded, waiting...');
    const waited = await waitForRateLimit(checkXApiRateLimit, 30000); // 最大30秒待機
    if (!waited) {
      console.error('[X Lead Discovery] Rate limit wait timeout');
      return false;
    }
  }
  
  try {
    // VSL1メッセージを生成（言語別）
    const { generateVSL1Message } = require('../telegram/messages/vsl1');
    const { getTelegramDeepLink } = require('../../api/vsl1-post');
    const VSL1_YOUTUBE_LINK = process.env.VSL1_YOUTUBE_LINK || 'https://youtu.be/OqvqngJOiXc';
    
    const deepLink = getTelegramDeepLink(lead.lang);
    const message = generateVSL1Message(lead.lang, deepLink, VSL1_YOUTUBE_LINK);
    
    console.log(`[X Lead Discovery] Sending VSL1 reply to tweet ${lead.tweetId} (@${lead.username}, lang: ${lead.lang})`);
    
    // X投稿にリプライ（280文字制限に合わせて調整）
    // メッセージからHTMLタグを除去してテキストのみに
    const plainText = message.replace(/<[^>]*>/g, '').replace(/\n/g, ' ');
    const replyText = `${plainText.substring(0, 200)}... ${VSL1_YOUTUBE_LINK}`;
    
    console.log(`[X Lead Discovery] Reply text (${replyText.length} chars): ${replyText.substring(0, 100)}...`);
    
    // X API v2でリプライを送信
    try {
      await replyToTweet(replyText, lead.tweetId);
      console.log(`[X Lead Discovery] Reply sent successfully to tweet ${lead.tweetId}`);
    } catch (replyError) {
      console.error(`[X Lead Discovery] Failed to send reply to tweet ${lead.tweetId}:`, replyError.message);
      console.error(`[X Lead Discovery] Error details:`, {
        tweetId: lead.tweetId,
        username: lead.username,
        lang: lead.lang,
        errorType: replyError.constructor.name,
        errorMessage: replyError.message,
        errorStack: replyError.stack,
      });
      throw replyError; // 再スローして外側のcatchで処理
    }
    
    // 送信済みをマーク
    try {
      await markVSL1Sent(lead);
      console.log(`[X Lead Discovery] Marked VSL1 as sent for tweet ${lead.tweetId}`);
    } catch (markError) {
      console.warn(`[X Lead Discovery] Failed to mark VSL1 as sent for tweet ${lead.tweetId}:`, markError.message);
      // マーク失敗は致命的ではないので続行
    }
    
    console.log(`[X Lead Discovery] ✅ Successfully sent VSL1 reply to tweet ${lead.tweetId} (@${lead.username})`);
    return true;
  } catch (error) {
    console.error(`[X Lead Discovery] ❌ Failed to reply VSL1 to lead:`, {
      tweetId: lead?.tweetId,
      username: lead?.username,
      lang: lead?.lang,
      errorType: error.constructor.name,
      errorMessage: error.message,
      errorStack: error.stack,
    });
    return false;
  }
}

/**
 * Grokでトレンドからリードを発見
 * @param {string} lang - 言語コード
 * @param {number} woeid - Where On Earth ID（1 = 全世界、23424856 = 日本など）
 * @returns {Promise<Array>} リード情報の配列
 */
async function discoverLeadsFromTrends(lang = 'en', woeid = 1) {
  try {
    // Grokでトレンド関連のリード発見
    const grokPrompt = `Analyze current X trends related to BTC trading. Find traders who are experiencing losses, FOMO, or fear. Focus on trending topics that indicate trader distress or need for protection. Return specific X handles (@username), tweet IDs, and tweet content. Language: ${lang}`;
    
    const grokResult = await discoverLeadsOnX(grokPrompt, lang);
    
    const leads = [];
    
    if (grokResult && grokResult.sources && Array.isArray(grokResult.sources)) {
      for (const source of grokResult.sources.slice(0, 50)) {
        if (source.handle && source.note) {
          const detectionResult = detectKeywords(source.note, lang);
          
          if (detectionResult.matched) {
            const userData = { engagementRate: 0.1 };
            const score = calculateLeadScore(detectionResult, userData);
            const isPerfect = isPerfectMatch(detectionResult, userData);
            
            leads.push({
              userId: null,
              username: source.handle.replace('@', ''),
              tweetId: source.tweetId || null,
              lang: detectionResult.lang,
              text: source.note.substring(0, 200),
              keywords: detectionResult.keywords,
              priority: detectionResult.priority,
              score,
              isPerfectMatch: isPerfect,
              engagementRate: 0.1,
              timestamp: new Date().toISOString(),
              source: 'grok_trends',
            });
          }
        }
      }
    }
    
    return leads;
  } catch (error) {
    console.error('[X Lead Discovery] Failed to discover leads from trends with Grok:', error.message);
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
