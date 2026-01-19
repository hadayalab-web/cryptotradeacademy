// api/lead-discovery.js
// リード発見自動化APIエンドポイント

const { monitorGroupMessage, sendVSL1ToLead } = require('../services/lead-discovery/telegramGroupMonitor');
const { discoverLeadFromTweet, replyVSL1ToLead, discoverLeadsFromTrends, searchLeadsOnX } = require('../services/lead-discovery/xLeadDiscovery');
// 注意: Telegramリード発見（Grok経由）は削除 - Xリード発見のみに集中
// const { discoverTelegramLeads, findTelegramGroups } = require('../services/lead-discovery/telegramLeadDiscovery');
const { enqueueLead, dequeueLead, completeLead, failLead, getQueueStats } = require('../services/lead-discovery/priorityQueue');
const { HIGH_PRIORITY_KEYWORDS } = require('../services/lead-discovery/keywordMonitor');
const { recordLead, recordVSL1Sent } = require('../services/lead-discovery/conversionTracker');
const { generateLeadDiscoveryReport } = require('../services/lead-discovery/leadDiscoveryReport');

/**
 * キーワードからGrok検索クエリを生成
 * @param {string[]} keywords - キーワード配列（未使用、後方互換性のため残す）
 * @param {string} lang - 言語コード
 * @returns {string} Grok検索クエリ
 */
function buildXSearchQuery(keywords, lang = 'en') {
  // 言語別の高優先度キーワードを取得
  const langKeywords = HIGH_PRIORITY_KEYWORDS[lang] || HIGH_PRIORITY_KEYWORDS.en;
  
  // 高優先度キーワードを優先的に使用（最大5つ）
  const keywordsToUse = langKeywords.slice(0, 5);
  
  // Grokに投げるクエリを構築（自然言語）
  const keywordList = keywordsToUse.join(', ');
  return `Find BTC traders on X who are experiencing: ${keywordList}. Look for posts mentioning losses, hacks, FOMO, or fear. Return specific X handles (@username) and tweet content. Language: ${lang}`;
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
      x: { discovered: 0, sent: 0, errors: 0 },
      queue: { total: 0, perfectMatch: 0 },
    };
    
    // Xからリード発見（初速収益化のため高品質リードに集中）
    // 注意: Telegramリード発見（Grok経由）は削除しました
    // 理由: X上の投稿から発見しているため、Xリードと同じ扱いになっていた
    // 将来の拡張: Telegramグループ監視機能は保持（環境変数設定で有効化可能）
    // 初速段階: 6言語同時展開（EN, ES, PT-BR, AR, JA, KO）
    // スケール後: Sources数と実行頻度を増やす
    const languages = process.env.LEAD_DISCOVERY_LANGUAGES?.split(',') || ['en', 'es'];
    
    try {
      // 1. Grok（X AI API）でリード発見（初速収益化: 高品質リードに集中）
      for (const lang of languages) {
        try {
          // 初速段階: 高品質リードに絞る（sources数削減でコスト削減）
          const maxSources = parseInt(process.env.LEAD_DISCOVERY_MAX_SOURCES || '30', 10);
          const query = buildXSearchQuery(HIGH_PRIORITY_KEYWORDS.slice(0, 5), lang);
          const keywordLeads = await searchLeadsOnX(query, lang, maxSources);
          stats.x.discovered += keywordLeads.length;
          
          for (const lead of keywordLeads) {
            try {
              // すべてのリードで、キューに追加する前にrecordLeadを実行
              const leadId = await recordLead(lead);
              if (leadId) {
                lead.leadId = leadId;
              }
              
              // キューに追加
              const jobId = await enqueueLead(lead);
              
              // ドンピシャリードの場合は即座に送信
              if (lead.isPerfectMatch) {
                const sent = await replyVSL1ToLead(lead);
                // VSL1送信時にrecordVSL1Sentを実行
                if (sent && leadId) {
                  await recordVSL1Sent(leadId);
                }
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
      
      // 2. トレンド検索（初速段階では無効化: コスト削減のため）
      // スケール後: 環境変数 LEAD_DISCOVERY_ENABLE_TRENDS=true で有効化
      if (process.env.LEAD_DISCOVERY_ENABLE_TRENDS === 'true') {
        for (const lang of languages) {
          try {
            const maxTrendSources = parseInt(process.env.LEAD_DISCOVERY_MAX_TREND_SOURCES || '20', 10);
            const trendLeads = await discoverLeadsFromTrends(lang, 1);
            stats.x.discovered += trendLeads.length;
            
            for (const lead of trendLeads) {
              try {
                // すべてのリードで、キューに追加する前にrecordLeadを実行
                const leadId = await recordLead(lead);
                if (leadId) {
                  lead.leadId = leadId;
                }
                
                const jobId = await enqueueLead(lead);
                
                if (lead.isPerfectMatch && lead.tweetId) {
                  const sent = await replyVSL1ToLead(lead);
                  // VSL1送信時にrecordVSL1Sentを実行
                  if (sent && leadId) {
                    await recordVSL1Sent(leadId);
                  }
                  await completeLead(jobId);
                  stats.x.sent++;
                }
              } catch (error) {
                console.error('[Lead Discovery] Failed to process trend lead:', error.message);
                stats.x.errors++;
              }
            }
          } catch (error) {
            console.error(`[Lead Discovery] Failed to discover leads from trends:`, error.message);
            stats.x.errors++;
          }
        }
      }
    } catch (error) {
      console.error('[Lead Discovery] Failed to discover leads from X:', error.message);
      stats.x.errors++;
    }
    
    // 3. キュー統計を取得
    const queueStats = await getQueueStats();
    stats.queue = queueStats;
    
    // 4. CEOレポートを送信（環境変数で制御可能）
    // 注意: レポート送信は非同期で実行し、エラーが発生しても処理を続行
    if (process.env.LEAD_DISCOVERY_SEND_REPORT !== 'false') {
      generateLeadDiscoveryReport(stats, { sendEmail: true }).catch(error => {
        console.error('[Lead Discovery] Failed to send report:', error.message);
        // レポート送信失敗は処理を続行（エラーログのみ）
      });
    }
    
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
        
        let sent = false;
        
        // Telegramリードの場合はDM送信
        if (lead.userId && lead.chatId) {
          sent = await sendVSL1ToLead(lead);
        }
        // Xリードの場合はリプライ送信
        else if (lead.tweetId) {
          sent = await replyVSL1ToLead(lead);
        }
        
        if (sent) {
          // リードが既に記録されているか確認（leadIdが存在するか）
          let leadId = lead.leadId;
          // 未記録の場合は記録を実行
          if (!leadId) {
            leadId = await recordLead(lead);
            if (leadId) {
              lead.leadId = leadId;
            }
          }
          // VSL1送信記録を実行
          if (leadId) {
            await recordVSL1Sent(leadId);
          }
          await completeLead(job.jobId);
          processed.push({ jobId: job.jobId, success: true });
        } else {
          // 送信失敗（重複送信など）の場合は完了として扱う
          await completeLead(job.jobId);
          processed.push({ jobId: job.jobId, success: true, note: 'Already sent or skipped' });
        }
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
