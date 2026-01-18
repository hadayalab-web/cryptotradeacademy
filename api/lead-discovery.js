// api/lead-discovery.js
// リード発見自動化APIエンドポイント

const { monitorGroupMessage, sendVSL1ToLead } = require('../services/lead-discovery/telegramGroupMonitor');
const { discoverLeadFromTweet, replyVSL1ToLead, discoverLeadsFromTrends, searchLeadsOnX } = require('../services/lead-discovery/xLeadDiscovery');
const { enqueueLead, dequeueLead, completeLead, failLead, getQueueStats } = require('../services/lead-discovery/priorityQueue');
const { HIGH_PRIORITY_KEYWORDS } = require('../services/lead-discovery/keywordMonitor');

/**
 * キーワードからX検索クエリを生成
 * @param {string[]} keywords - キーワード配列
 * @param {string} lang - 言語コード
 * @returns {string} X検索クエリ
 */
function buildXSearchQuery(keywords, lang = 'en') {
  // 言語別の高優先度キーワードを取得
  const langKeywords = HIGH_PRIORITY_KEYWORDS[lang] || HIGH_PRIORITY_KEYWORDS.en;
  
  // 高優先度キーワードを優先的に使用（最大5つ）
  const keywordsToUse = langKeywords.slice(0, 5);
  
  // X検索クエリを構築（OR検索、リツイート除外、言語指定）
  const queryParts = keywordsToUse.map(kw => `"${kw}"`).join(' OR ');
  return `${queryParts} -is:retweet lang:${lang}`;
}

/**
 * リード発見処理を実行
 * @param {Object} req - リクエスト
 * @param {Object} res - レスポンス
 */
async function handleLeadDiscovery(req, res) {
  const authHeader = req.headers.authorization;
  const CRON_SECRET = process.env.CRON_SECRET;
  
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const stats = {
      telegram: { discovered: 0, sent: 0, errors: 0 },
      x: { discovered: 0, sent: 0, errors: 0 },
      queue: { total: 0, perfectMatch: 0 },
    };
    
    // 1. Telegramグループからリード発見（実際の実装では、Telegram Bot APIのWebhookを使用）
    // ここでは構造のみを定義
    
    // 2. Xからリード発見（キーワードベース検索 + トレンド）
    const languages = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
    
    try {
      // 2.1 キーワードベース検索
      for (const lang of languages) {
        try {
          // 高優先度キーワードで検索
          const query = buildXSearchQuery(HIGH_PRIORITY_KEYWORDS.slice(0, 5), lang);
          const keywordLeads = await searchLeadsOnX(query, lang, 20);
          stats.x.discovered += keywordLeads.length;
          
          for (const lead of keywordLeads) {
            try {
              // キューに追加
              const jobId = await enqueueLead(lead);
              
              // ドンピシャリードの場合は即座に送信
              if (lead.isPerfectMatch) {
                await replyVSL1ToLead(lead);
                await completeLead(jobId);
                stats.x.sent++;
              }
            } catch (error) {
              console.error('[Lead Discovery] Failed to process X lead:', error.message);
              stats.x.errors++;
            }
          }
        } catch (error) {
          console.error(`[Lead Discovery] Failed to search leads for ${lang}:`, error.message);
          stats.x.errors++;
        }
      }
      
      // 2.2 トレンドからリード発見（全世界 + 主要地域）
      const woeids = [1, 23424856]; // 1 = 全世界、23424856 = 日本
      for (const woeid of woeids) {
        try {
          const trendLeads = await discoverLeadsFromTrends('en', woeid);
          stats.x.discovered += trendLeads.length;
          
          for (const lead of trendLeads) {
            try {
              const jobId = await enqueueLead(lead);
              
              if (lead.isPerfectMatch) {
                await replyVSL1ToLead(lead);
                await completeLead(jobId);
                stats.x.sent++;
              }
            } catch (error) {
              console.error('[Lead Discovery] Failed to process trend lead:', error.message);
              stats.x.errors++;
            }
          }
        } catch (error) {
          console.error(`[Lead Discovery] Failed to discover leads from trends (woeid: ${woeid}):`, error.message);
          stats.x.errors++;
        }
      }
    } catch (error) {
      console.error('[Lead Discovery] Failed to discover leads from X:', error.message);
      stats.x.errors++;
    }
    
    // 3. キュー統計を取得
    const queueStats = await getQueueStats();
    stats.queue = queueStats;
    
    return res.status(200).json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Lead Discovery] Lead discovery error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * キューからリードを処理
 * @param {Object} req - リクエスト
 * @param {Object} res - レスポンス
 */
async function processLeadQueue(req, res) {
  const authHeader = req.headers.authorization;
  const CRON_SECRET = process.env.CRON_SECRET;
  
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const maxProcess = parseInt(req.query.max || '10', 10);
    const processed = [];
    
    for (let i = 0; i < maxProcess; i++) {
      const job = await dequeueLead();
      if (!job) break;
      
      try {
        const { lead } = job;
        
        // Telegramリードの場合はDM送信
        if (lead.userId && lead.chatId) {
          await sendVSL1ToLead(lead);
        }
        // Xリードの場合はリプライ送信
        else if (lead.tweetId) {
          await replyVSL1ToLead(lead);
        }
        
        await completeLead(job.jobId);
        processed.push({ jobId: job.jobId, success: true });
      } catch (error) {
        console.error('Failed to process lead:', error.message);
        await failLead(job.jobId, error);
        processed.push({ jobId: job.jobId, success: false, error: error.message });
      }
    }
    
    return res.status(200).json({
      success: true,
      processed: processed.length,
      results: processed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Queue processing error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = {
  handleLeadDiscovery,
  processLeadQueue,
};
