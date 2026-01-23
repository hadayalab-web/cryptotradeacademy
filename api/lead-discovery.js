// api/lead-discovery.js
// リード発見自動化APIエンドポイント

const {
  monitorGroupMessage,
  sendVSL1ToLead
} = require("../services/lead-discovery/telegramGroupMonitor");
const {
  discoverLeadFromTweet,
  replyVSL1ToLead,
  discoverLeadsFromTrends,
  searchLeadsOnX
} = require("../services/lead-discovery/xLeadDiscovery");
// 注意: Telegramリード発見（Grok経由）は削除 - Xリード発見のみに集中
// const { discoverTelegramLeads, findTelegramGroups } = require('../services/lead-discovery/telegramLeadDiscovery');
const {
  enqueueLead,
  dequeueLead,
  completeLead,
  failLead,
  getQueueStats
} = require("../services/lead-discovery/priorityQueue");
const { HIGH_PRIORITY_KEYWORDS } = require("../services/lead-discovery/keywordMonitor");
const { recordLead, recordVSL1Sent } = require("../services/lead-discovery/conversionTracker");
const { generateLeadDiscoveryReport } = require("../services/lead-discovery/leadDiscoveryReport");

/**
 * キーワードからGrok検索クエリを生成
 * @param {string[]} keywords - キーワード配列（未使用、後方互換性のため残す）
 * @param {string} lang - 言語コード
 * @returns {string} Grok検索クエリ
 */
function buildXSearchQuery(keywords, lang = "en") {
  // 言語別の高優先度キーワードを取得
  const langKeywords = HIGH_PRIORITY_KEYWORDS[lang] || HIGH_PRIORITY_KEYWORDS.en;

  // 高優先度キーワードを優先的に使用（最大5つ）
  const keywordsToUse = langKeywords.slice(0, 5);

  // Grokに投げるクエリを構築（自然言語）
  const keywordList = keywordsToUse.join(", ");
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
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const stats = {
      x: { discovered: 0, sent: 0, errors: 0 },
      queue: { total: 0, perfectMatch: 0 }
    };

    console.log("[Lead Discovery] Starting lead discovery process...");
    console.log(
      `[Lead Discovery] Environment: LEAD_DISCOVERY_SEND_REPORT=${process.env.LEAD_DISCOVERY_SEND_REPORT || "true (default)"}`
    );
    console.log(
      `[Lead Discovery] Environment: LEAD_DISCOVERY_LANGUAGES=${process.env.LEAD_DISCOVERY_LANGUAGES || "en,es,pt-br,ar,ja,ko (default)"}`
    );
    console.log(
      `[Lead Discovery] Environment: LEAD_DISCOVERY_MAX_SOURCES=${process.env.LEAD_DISCOVERY_MAX_SOURCES || "50 (default)"}`
    );

    // Xからリード発見（初速収益化のため高品質リードに集中）
    // 注意: Telegramリード発見（Grok経由）は削除しました
    // 理由: X上の投稿から発見しているため、Xリードと同じ扱いになっていた
    // 将来の拡張: Telegramグループ監視機能は保持（環境変数設定で有効化可能）
    // 緊急修正: 6言語同時展開をデフォルトに変更（リード獲得を最大化）
    // 初速段階: 6言語同時展開（EN, ES, PT-BR, AR, JA, KO）
    // スケール後: Sources数と実行頻度を増やす
    const languages = process.env.LEAD_DISCOVERY_LANGUAGES?.split(",") || [
      "en",
      "es",
      "pt-br",
      "ar",
      "ja",
      "ko"
    ];
    console.log(
      `[Lead Discovery] Processing ${languages.length} languages: ${languages.join(", ")}`
    );

    try {
      // 1. Grok（X AI API）でリード発見（初速収益化: 高品質リードに集中）
      for (const lang of languages) {
        try {
          // 緊急修正: sources数を増やしてリード獲得を最大化（デフォルト: 50）
          // 初速段階: 高品質リードに絞る（sources数削減でコスト削減）
          // リード獲得を最大化するため、デフォルト値を30→50に変更
          const maxSources = parseInt(process.env.LEAD_DISCOVERY_MAX_SOURCES || "50", 10);
          console.log(`[Lead Discovery] Searching ${maxSources} sources for ${lang} language`);
          const query = buildXSearchQuery(null, lang);
          const keywordLeads = await searchLeadsOnX(query, lang, maxSources);
          stats.x.discovered += keywordLeads.length;

          console.log(`[Lead Discovery] Found ${keywordLeads.length} leads for ${lang} language`);
          console.log(
            `[Lead Discovery] Perfect matches: ${keywordLeads.filter((l) => l.isPerfectMatch).length}`
          );
          console.log(
            `[Lead Discovery] Leads with tweetId: ${keywordLeads.filter((l) => l.tweetId).length}`
          );

          let recordedCount = 0;
          let queuedCount = 0;
          let sentCount = 0;
          let errorCount = 0;

          for (const lead of keywordLeads) {
            try {
              // すべてのリードで、キューに追加する前にrecordLeadを実行
              const leadId = await recordLead(lead);
              if (leadId) {
                lead.leadId = leadId;
                recordedCount++;
                console.log(
                  `[Lead Discovery] Recorded lead: ${leadId} (@${lead.username || lead.userId || "unknown"}, tweetId: ${lead.tweetId || "N/A"})`
                );
              } else {
                console.warn(
                  `[Lead Discovery] ⚠️ Failed to record lead: @${lead.username || lead.userId || "unknown"}`
                );
              }

              // キューに追加
              const jobId = await enqueueLead(lead);
              queuedCount++;

              // ドンピシャリードの場合は即座に送信
              if (lead.isPerfectMatch) {
                if (!lead.tweetId) {
                  console.warn(
                    `[Lead Discovery] ⚠️ Perfect match lead has no tweetId, cannot send VSL1: @${lead.username || lead.userId || "unknown"}`
                  );
                  continue;
                }

                console.log(
                  `[Lead Discovery] Perfect match lead found, sending VSL1 immediately: @${lead.username || lead.userId || "unknown"} (tweetId: ${lead.tweetId})`
                );
                const sent = await replyVSL1ToLead(lead);

                // VSL1送信時にrecordVSL1Sentを実行
                if (sent === true) {
                  // 正常に送信された場合
                  if (leadId) {
                    await recordVSL1Sent(leadId);
                    console.log(
                      `[Lead Discovery] ✅ VSL1 sent successfully to lead: ${leadId} (@${lead.username})`
                    );
                  } else {
                    console.warn(
                      `[Lead Discovery] ⚠️ VSL1 sent but leadId is null: @${lead.username}`
                    );
                  }
                  await completeLead(jobId);
                  sentCount++;
                  stats.x.sent++;
                } else if (sent && sent.skipped) {
                  // スキップされた場合（403エラーなど）- エラーとして扱わない
                  console.log(
                    `[Lead Discovery] ⏭️ VSL1 skipped for lead: @${lead.username} (reason: ${sent.reason || 'unknown'})`
                  );
                  await completeLead(jobId);
                  // エラーカウントに含めない
                } else {
                  // 送信失敗の場合
                  console.error(
                    `[Lead Discovery] ❌ Failed to send VSL1 to perfect match lead: @${lead.username} (tweetId: ${lead.tweetId})`
                  );
                  errorCount++;
                }
              } else {
                console.log(
                  `[Lead Discovery] Lead queued (not perfect match): @${lead.username || lead.userId || "unknown"}`
                );
              }
            } catch (error) {
              console.error("[Lead Discovery] ❌ Failed to process X lead:", error.message);
              console.error("[Lead Discovery] Error stack:", error.stack);
              errorCount++;
              stats.x.errors++;
            }
          }

          console.log(`[Lead Discovery] Processed ${keywordLeads.length} leads for ${lang}:`);
          console.log(`[Lead Discovery]   - Recorded: ${recordedCount}`);
          console.log(`[Lead Discovery]   - Queued: ${queuedCount}`);
          console.log(`[Lead Discovery]   - Sent (VSL1): ${sentCount}`);
          console.log(`[Lead Discovery]   - Errors: ${errorCount}`);
        } catch (error) {
          console.error(`[Lead Discovery] Failed to search leads for ${lang}:`, error.message);
          stats.x.errors++;
        }
      }

      // 2. トレンド検索（初速段階では無効化: コスト削減のため）
      // スケール後: 環境変数 LEAD_DISCOVERY_ENABLE_TRENDS=true で有効化
      if (process.env.LEAD_DISCOVERY_ENABLE_TRENDS === "true") {
        for (const lang of languages) {
          try {
            const maxTrendSources = parseInt(
              process.env.LEAD_DISCOVERY_MAX_TREND_SOURCES || "20",
              10
            );
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
                  if (sent === true) {
                    // 正常に送信された場合
                    if (leadId) {
                      await recordVSL1Sent(leadId);
                    }
                    await completeLead(jobId);
                    stats.x.sent++;
                  } else if (sent && sent.skipped) {
                    // スキップされた場合（403エラーなど）- エラーとして扱わない
                    await completeLead(jobId);
                    // エラーカウントに含めない
                  } else {
                    // 送信失敗の場合
                    stats.x.errors++;
                  }
                }
              } catch (error) {
                console.error("[Lead Discovery] Failed to process trend lead:", error.message);
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
      console.error("[Lead Discovery] Failed to discover leads from X:", error.message);
      stats.x.errors++;
    }

    // 3. キュー統計を取得
    const queueStats = await getQueueStats();
    stats.queue = queueStats;

    // 4. CEOレポートを送信（デフォルト: 有効、環境変数で無効化可能）
    // 緊急修正: CEOレポートを確実に送信するように改善
    const shouldSendReport = process.env.LEAD_DISCOVERY_SEND_REPORT !== "false";
    if (shouldSendReport) {
      try {
        await generateLeadDiscoveryReport(stats, { sendEmail: true });
        console.log("[Lead Discovery] CEO report sent successfully");
      } catch (error) {
        console.error("[Lead Discovery] Failed to send CEO report:", error.message);
        console.error("[Lead Discovery] Error stack:", error.stack);
        // エラーが発生しても処理は続行（エラーログを詳細に出力）
      }
    } else {
      console.warn(
        "[Lead Discovery] CEO report sending is disabled by LEAD_DISCOVERY_SEND_REPORT=false"
      );
    }

    return res.status(200).json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[Lead Discovery] Lead discovery error:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message
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
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const maxProcess = parseInt(req.query.max || "10", 10);
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

        if (sent === true) {
          // 正常に送信された場合
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
        } else if (sent && sent.skipped) {
          // スキップされた場合（403エラーなど）- エラーとして扱わない
          await completeLead(job.jobId);
          processed.push({ jobId: job.jobId, success: true, note: `Skipped: ${sent.reason || 'unknown'}` });
        } else {
          // 送信失敗（重複送信など）の場合は完了として扱う
          await completeLead(job.jobId);
          processed.push({ jobId: job.jobId, success: true, note: "Already sent or skipped" });
        }
      } catch (error) {
        console.error("Failed to process lead:", error.message);
        await failLead(job.jobId, error);
        processed.push({ jobId: job.jobId, success: false, error: error.message });
      }
    }

    return res.status(200).json({
      success: true,
      processed: processed.length,
      results: processed,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Queue processing error:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Vercel Serverless Functions用のデフォルトエクスポート
module.exports = handleLeadDiscovery;
module.exports.processLeadQueue = processLeadQueue;
