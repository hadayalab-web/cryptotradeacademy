// services/lead-discovery/reportStorage.js
// COO・Grok・CEOの3者でPDCAを回すための情報共有ストレージ

let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[Report Storage] @vercel/kv not available:', error.message);
}

const REPORT_PREFIX = 'lead_discovery_report:';
const REPORT_HISTORY_PREFIX = 'lead_discovery_report_history:';
const REPORT_METADATA_KEY = 'lead_discovery_report_metadata';

/**
 * レポートをVercel KVに保存（COO・Grok・CEO共有用）
 * @param {string} reportType - 'execution' | 'daily' | 'weekly'
 * @param {Object} reportData - レポートデータ
 * @param {string} htmlReport - HTML形式のレポート
 * @returns {Promise<string>} レポートID
 */
async function saveReport(reportType, reportData, htmlReport = null) {
  if (!kv) {
    console.warn('[Report Storage] KV not available, skipping save');
    return null;
  }

  const timestamp = new Date().toISOString();
  const reportId = `${reportType}_${Date.now()}`;
  const reportKey = `${REPORT_PREFIX}${reportId}`;
  
  // 構造化されたレポートデータ（Grokが読みやすい形式）
  const structuredReport = {
    id: reportId,
    type: reportType,
    timestamp,
    date: reportData.date || new Date().toISOString().split('T')[0],
    
    // システム稼働状況（COO向け）
    systemMetrics: {
      cronJobs: {
        leadDiscovery: {
          executions: reportData.stats?.x?.discovered || 0,
          successes: (reportData.stats?.x?.discovered || 0) - (reportData.stats?.x?.errors || 0),
          errors: reportData.stats?.x?.errors || 0,
          errorRate: reportData.stats?.x?.discovered > 0 
            ? ((reportData.stats?.x?.errors || 0) / reportData.stats.x.discovered * 100).toFixed(2) + '%'
            : '0.00%',
        },
        xPostFreeReport: {
          executions: reportData.stats?.xPostCount || 0,
          successes: reportData.stats?.xPostSuccess || 0,
          errors: reportData.stats?.xPostErrors || 0,
          errorRate: '0.00%',
        },
        xQuoteRepost: {
          executions: reportData.stats?.quoteRepostCount || 0,
          successes: reportData.stats?.quoteRepostSuccess || 0,
          errors: reportData.stats?.quoteRepostErrors || 0,
          errorRate: '0.00%',
        },
      },
      leadProcessing: {
        discovered: reportData.stats?.x?.discovered || 0,
        // 修正: cvrStats.repliesSentを使用（実際のリプライ送信数）
        repliesSent: reportData.cvrStats?.repliesSent || reportData.stats?.x?.sent || 0,
        replySuccessRate: (reportData.cvrStats?.totalLeads || reportData.stats?.x?.discovered || 0) > 0
          ? ((reportData.cvrStats?.repliesSent || reportData.stats?.x?.sent || 0) / (reportData.cvrStats?.totalLeads || reportData.stats?.x?.discovered || 1) * 100).toFixed(2) + '%'
          : '0.00%',
        errors: reportData.stats?.x?.errors || 0,
        queueTotal: reportData.stats?.queue?.total || 0,
        perfectMatchInQueue: reportData.stats?.queue?.perfectMatch || 0,
      },
      apiErrors: {
        skipped403: reportData.stats?.x?.skipped403 || 0,
        rateLimitErrors: reportData.stats?.x?.rateLimitErrors || 0,
        authErrors: reportData.stats?.x?.authErrors || 0,
        otherErrors: reportData.stats?.x?.otherErrors || 0,
      },
    },
    
    // CVR統計（CEO向け、Grok分析用）
    cvrStats: reportData.cvrStats ? {
      totalLeads: reportData.cvrStats.totalLeads || 0,
      repliesSent: reportData.cvrStats.repliesSent || 0,
      conversions: reportData.cvrStats.conversions || 0,
      cvr: (reportData.cvrStats.cvr || 0).toFixed(2) + '%',
      revenue: reportData.cvrStats.revenue || 0,
      perfectMatchLeads: reportData.cvrStats.perfectMatchLeads || 0,
      perfectMatchCVR: (reportData.cvrStats.perfectMatchCVR || 0).toFixed(2) + '%',
      bySource: reportData.cvrStats.bySource || {},
    } : null,
    
    // 言語別統計
    languageStats: reportData.langStats || null,
    
    // Whop統計
    whopStats: reportData.whopStats || null,
    
    // リード統計（無料版ユーザー = リード）
    leadStats: reportData.leadStats || null,
    
    // リスト統計（引用リポストするインフルエンサー = リスト）
    listStats: reportData.listStats || null,
    
    // 生データ（詳細分析用）
    rawData: {
      stats: reportData.stats,
      cvrStats: reportData.cvrStats,
      langStats: reportData.langStats,
      whopStats: reportData.whopStats,
      leadStats: reportData.leadStats,
      listStats: reportData.listStats,
    },
    
    // HTMLレポート（CEO向け表示用）
    htmlReport: htmlReport || null,
  };

  try {
    // レポートを保存（30日間保持）
    await kv.set(reportKey, structuredReport, { ex: 30 * 24 * 60 * 60 });
    
    // レポート履歴に追加
    const historyKey = `${REPORT_HISTORY_PREFIX}${reportType}`;
    const history = await kv.lpush(historyKey, reportId);
    
    // 履歴は最新100件まで保持
    await kv.ltrim(historyKey, 0, 99);
    
    // メタデータを更新
    await updateReportMetadata(reportType, reportId, timestamp);
    
    console.log(`[Report Storage] Report saved: ${reportId} (type: ${reportType})`);
    return reportId;
  } catch (error) {
    console.error('[Report Storage] Failed to save report:', error.message);
    return null;
  }
}

/**
 * レポートメタデータを更新
 */
async function updateReportMetadata(reportType, reportId, timestamp) {
  if (!kv) return;
  
  try {
    const metadata = await kv.get(REPORT_METADATA_KEY) || {};
    metadata[reportType] = {
      latestReportId: reportId,
      latestTimestamp: timestamp,
      count: (metadata[reportType]?.count || 0) + 1,
    };
    await kv.set(REPORT_METADATA_KEY, metadata);
  } catch (error) {
    console.error('[Report Storage] Failed to update metadata:', error.message);
  }
}

/**
 * 最新のレポートを取得（Grok用）
 * @param {string} reportType - 'execution' | 'daily' | 'weekly'
 * @returns {Promise<Object|null>} レポートデータ
 */
async function getLatestReport(reportType) {
  if (!kv) {
    console.warn('[Report Storage] KV not available');
    return null;
  }

  try {
    const metadata = await kv.get(REPORT_METADATA_KEY);
    if (!metadata || !metadata[reportType]) {
      return null;
    }

    const reportId = metadata[reportType].latestReportId;
    const reportKey = `${REPORT_PREFIX}${reportId}`;
    const report = await kv.get(reportKey);
    
    return report;
  } catch (error) {
    console.error('[Report Storage] Failed to get latest report:', error.message);
    return null;
  }
}

/**
 * レポート履歴を取得（Grok用）
 * @param {string} reportType - 'execution' | 'daily' | 'weekly'
 * @param {number} limit - 取得件数（デフォルト: 10）
 * @returns {Promise<Array>} レポートデータの配列
 */
async function getReportHistory(reportType, limit = 10) {
  if (!kv) {
    console.warn('[Report Storage] KV not available');
    return [];
  }

  try {
    const historyKey = `${REPORT_HISTORY_PREFIX}${reportType}`;
    const reportIds = await kv.lrange(historyKey, 0, limit - 1);
    
    const reports = [];
    for (const reportId of reportIds) {
      const reportKey = `${REPORT_PREFIX}${reportId}`;
      const report = await kv.get(reportKey);
      if (report) {
        reports.push(report);
      }
    }
    
    return reports;
  } catch (error) {
    console.error('[Report Storage] Failed to get report history:', error.message);
    return [];
  }
}

/**
 * レポートIDでレポートを取得
 * @param {string} reportId - レポートID
 * @returns {Promise<Object|null>} レポートデータ
 */
async function getReportById(reportId) {
  if (!kv) {
    return null;
  }

  try {
    const reportKey = `${REPORT_PREFIX}${reportId}`;
    const report = await kv.get(reportKey);
    return report;
  } catch (error) {
    console.error('[Report Storage] Failed to get report by ID:', error.message);
    return null;
  }
}

/**
 * Grokが分析しやすい形式でレポートを取得
 * @param {string} reportType - 'execution' | 'daily' | 'weekly'
 * @returns {Promise<string>} Grok用のテキスト形式レポート
 */
async function getReportForGrok(reportType) {
  const report = await getLatestReport(reportType);
  if (!report) {
    return 'No report available.';
  }

  // Grokが読みやすい形式にフォーマット
  let grokReport = `# ${reportType.toUpperCase()} REPORT - ${report.date}\n\n`;
  grokReport += `Generated: ${report.timestamp}\n\n`;
  
  // システム稼働状況
  grokReport += `## SYSTEM METRICS\n\n`;
  grokReport += `### Cron Jobs Execution\n`;
  grokReport += `- lead-discovery: ${report.systemMetrics.cronJobs.leadDiscovery.executions} executions, ${report.systemMetrics.cronJobs.leadDiscovery.errors} errors (${report.systemMetrics.cronJobs.leadDiscovery.errorRate} error rate)\n`;
  grokReport += `- x-post-free-report: ${report.systemMetrics.cronJobs.xPostFreeReport.executions} executions, ${report.systemMetrics.cronJobs.xPostFreeReport.errors} errors\n`;
  grokReport += `- x-quote-repost: ${report.systemMetrics.cronJobs.xQuoteRepost.executions} executions, ${report.systemMetrics.cronJobs.xQuoteRepost.errors} errors\n\n`;
  
  grokReport += `### Lead Processing\n`;
  grokReport += `- Discovered: ${report.systemMetrics.leadProcessing.discovered} leads\n`;
  grokReport += `- Replies Sent: ${report.systemMetrics.leadProcessing.repliesSent} (${report.systemMetrics.leadProcessing.replySuccessRate} success rate)\n`;
  grokReport += `- Queue Total: ${report.systemMetrics.leadProcessing.queueTotal} leads\n`;
  grokReport += `- Perfect Match in Queue: ${report.systemMetrics.leadProcessing.perfectMatchInQueue} leads\n\n`;
  
  grokReport += `### API Errors\n`;
  grokReport += `- Skipped 403 (deleted tweets): ${report.systemMetrics.apiErrors.skipped403}\n`;
  grokReport += `- Rate Limit Errors: ${report.systemMetrics.apiErrors.rateLimitErrors}\n`;
  grokReport += `- Auth Errors: ${report.systemMetrics.apiErrors.authErrors}\n`;
  grokReport += `- Other Errors: ${report.systemMetrics.apiErrors.otherErrors}\n\n`;
  
  // CVR統計
  if (report.cvrStats) {
    grokReport += `## CVR STATISTICS\n\n`;
    grokReport += `- Total Leads: ${report.cvrStats.totalLeads}\n`;
    grokReport += `- Replies Sent: ${report.cvrStats.repliesSent}\n`;
    grokReport += `- Conversions: ${report.cvrStats.conversions}\n`;
    grokReport += `- CVR: ${report.cvrStats.cvr}\n`;
    grokReport += `- Revenue: $${report.cvrStats.revenue?.toLocaleString() || 0}\n`;
    grokReport += `- Perfect Match Leads: ${report.cvrStats.perfectMatchLeads}\n`;
    grokReport += `- Perfect Match CVR: ${report.cvrStats.perfectMatchCVR}\n\n`;
    
    // ソース別トラッキング
    if (report.cvrStats.bySource) {
      grokReport += `### Source-based Tracking\n`;
      for (const [source, data] of Object.entries(report.cvrStats.bySource)) {
        grokReport += `- ${source}: ${data.leads || 0} leads, ${data.replies || 0} replies, ${data.conversions || 0} conversions, ${(data.cvr || 0).toFixed(2)}% CVR\n`;
      }
      grokReport += `\n`;
    }
  }
  
  return grokReport;
}

module.exports = {
  saveReport,
  getLatestReport,
  getReportHistory,
  getReportById,
  getReportForGrok,
};
