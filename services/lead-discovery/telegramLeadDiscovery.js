// services/lead-discovery/telegramLeadDiscovery.js
// Grok（X AI API）によるTelegramリード発見スクリプト

const { detectKeywords, isPerfectMatch, calculateLeadScore } = require('./keywordMonitor');
// 旧仕様: sendVSL1ToLeadは削除されました（新しいワークフローではX API経由のリプライ送信を使用）
const { discoverLeadsOnX } = require('../grok/client');

/**
 * GrokでTelegramのリードを発見
 * GrokはX上の投稿からTelegramグループ/チャンネルへの言及を検索し、
 * TelegramでBTC損失を報告しているユーザーを発見
 * @param {string} lang - 言語コード
 * @param {number} maxResults - 最大結果数
 * @returns {Promise<Array>} リード情報の配列
 */
async function discoverTelegramLeads(lang = 'en', maxResults = 30) {
  try {
    // GrokにTelegram関連のリード発見を依頼
    const grokPrompt = `Find BTC traders on X who mention Telegram groups, channels, or DMs where they discuss losses, hacks, or FOMO. 
    Look for posts that mention:
    - Telegram group links (t.me/...)
    - Telegram channel links
    - Users asking for help in Telegram
    - Users sharing their losses in Telegram groups
    - Users mentioning they got hacked and discussing it on Telegram
    
    Return specific X handles (@username), tweet content, and tweet IDs.
    Also extract any Telegram group/channel links mentioned in the tweets.
    Language: ${lang}`;
    
    const grokResult = await discoverLeadsOnX(grokPrompt, lang);
    
    const leads = [];
    
    // Grokのレスポンス形式を検証
    if (!grokResult) {
      console.warn('[Telegram Lead Discovery] Grok returned null or undefined');
      return leads;
    }
    
    if (!grokResult.sources || !Array.isArray(grokResult.sources)) {
      console.warn('[Telegram Lead Discovery] Grok sources is not an array:', typeof grokResult.sources);
      return leads;
    }
    
    console.log(`[Telegram Lead Discovery] Grok returned ${grokResult.sources.length} sources`);
    
    for (const source of grokResult.sources.slice(0, maxResults)) {
      // 必須フィールドの検証
      if (!source || !source.handle || !source.note) {
        console.warn('[Telegram Lead Discovery] Skipping invalid source:', source);
        continue;
      }
      
      // Telegramリンクを抽出
      const telegramLinks = extractTelegramLinks(source.note);
      
      // キーワード検出
      const detectionResult = detectKeywords(source.note, lang);
      
      // Telegramリンクがあるか、キーワードがマッチした場合のみリードとして追加
      if (detectionResult.matched || telegramLinks.length > 0) {
        const userData = {
          engagementRate: 0.1,
        };
        
        const score = calculateLeadScore(detectionResult, userData);
        const isPerfect = isPerfectMatch(detectionResult, userData);
        
        leads.push({
          userId: null,
          username: source.handle.replace('@', '').trim(),
          tweetId: source.tweetId || null,
          lang: detectionResult.lang || lang,
          text: source.note.substring(0, 200),
          keywords: detectionResult.keywords || [],
          priority: detectionResult.priority || 'medium',
          score,
          isPerfectMatch: isPerfect,
          engagementRate: 0.1,
          timestamp: new Date().toISOString(),
          source: 'grok_telegram',
          telegramLinks: telegramLinks, // Telegramリンク情報
        });
      }
    }
    
    console.log(`[Telegram Lead Discovery] Found ${leads.length} valid leads from ${grokResult.sources.length} sources`);
    
    return leads;
  } catch (error) {
    console.error('[Telegram Lead Discovery] Failed to discover Telegram leads with Grok:', error.message);
    console.error('[Telegram Lead Discovery] Stack trace:', error.stack);
    return [];
  }
}

/**
 * テキストからTelegramリンクを抽出
 * @param {string} text - テキスト
 * @returns {Array} Telegramリンクの配列
 */
function extractTelegramLinks(text) {
  const links = [];
  
  if (!text || typeof text !== 'string') {
    return links;
  }
  
  // t.me/... パターンを検索（Telegramリンクのみ）
  const telegramPattern = /t\.me\/([a-zA-Z0-9_]+)/g;
  let match;
  
  while ((match = telegramPattern.exec(text)) !== null) {
    // 重複チェック
    if (!links.find(l => l.username === match[1])) {
      links.push({
        type: 'channel_or_group',
        username: match[1],
        url: `https://t.me/${match[1]}`,
      });
    }
  }
  
  // 注意: @username パターンは削除（Xのハンドルと混同するため）
  // Telegramのユーザー名は通常 t.me/username の形式で共有される
  
  return links;
}

/**
 * Telegramグループ/チャンネルを探す（Grokを使用）
 * @param {string} lang - 言語コード
 * @returns {Promise<Array>} グループ/チャンネル情報の配列
 */
async function findTelegramGroups(lang = 'en') {
  try {
    const grokPrompt = `Find popular Telegram groups and channels related to BTC trading, crypto losses, or hack discussions.
    Look for X posts that mention Telegram groups/channels where traders discuss:
    - BTC losses
    - Hacks and security issues
    - Trading mistakes
    - FOMO and fear
    
    Return Telegram group/channel links (t.me/...) and descriptions.
    Language: ${lang}`;
    
    const grokResult = await discoverLeadsOnX(grokPrompt, lang);
    
    const groups = [];
    
    if (grokResult && grokResult.sources && Array.isArray(grokResult.sources)) {
      for (const source of grokResult.sources) {
        if (source.note) {
          const telegramLinks = extractTelegramLinks(source.note);
          
          for (const link of telegramLinks) {
            // 重複チェック
            if (!groups.find(g => g.username === link.username)) {
              groups.push({
                username: link.username,
                url: link.url,
                type: link.type,
                description: source.note.substring(0, 100),
                sourceTweet: source.handle,
                lang,
                discoveredAt: new Date().toISOString(),
              });
            }
          }
        }
      }
    }
    
    return groups;
  } catch (error) {
    console.error('[Telegram Lead Discovery] Failed to find Telegram groups:', error.message);
    return [];
  }
}

module.exports = {
  discoverTelegramLeads,
  findTelegramGroups,
  extractTelegramLinks,
};
