// scripts/analyze-cron-logs.js
// Cron Jobs実行ログを分析

const fs = require('fs');
const path = require('path');

const logFile = process.argv[2] || path.join(__dirname, '../../Downloads/logs_result (5).json');

if (!fs.existsSync(logFile)) {
  console.error(`❌ Log file not found: ${logFile}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(logFile, 'utf8'));

const analysis = {
  summary: {
    totalLogs: data.length,
    timeRange: {
      start: data[0]?.TimeUTC || 'N/A',
      end: data[data.length - 1]?.TimeUTC || 'N/A',
    },
  },
  endpoints: {},
  errors: [],
  keyMetrics: {
    xPostFreeReport: { executions: 0, successes: 0, errors: 0 },
    xQuoteRepost: { executions: 0, successes: 0, errors: 0 },
    xAlgorithmAnalysis: { executions: 0, successes: 0, errors: 0 },
    xInfluencerReport: { executions: 0, successes: 0, errors: 0 },
    xEngagementMetrics: { executions: 0, successes: 0, errors: 0 },
  },
};

data.forEach(log => {
  const msg = log.message || '';
  const requestPath = log.requestPath || '';
  const pathMatch = requestPath.match(/api\/([^\/\?]+)/);
  const endpoint = pathMatch ? pathMatch[1] : 'unknown';
  
  if (!analysis.endpoints[endpoint]) {
    analysis.endpoints[endpoint] = {
      total: 0,
      errors: 0,
      successes: 0,
      statusCodes: {},
      messages: [],
    };
  }
  
  analysis.endpoints[endpoint].total++;
  
  // ステータスコードを記録
  const status = log.responseStatusCode || 'N/A';
  analysis.endpoints[endpoint].statusCodes[status] = 
    (analysis.endpoints[endpoint].statusCodes[status] || 0) + 1;
  
  // エラーチェック
  const isError = 
    msg.includes('Error') || 
    msg.includes('Failed') || 
    msg.includes('❌') ||
    (status >= 400 && status !== 'N/A');
  
  // 成功チェック
  const isSuccess = 
    msg.includes('completed') || 
    msg.includes('success') || 
    msg.includes('✅') ||
    (status >= 200 && status < 300);
  
  if (isError) {
    analysis.endpoints[endpoint].errors++;
    analysis.errors.push({
      endpoint,
      timestamp: log.TimeUTC,
      message: msg.substring(0, 300),
      statusCode: status,
      requestId: log.requestId,
    });
  } else if (isSuccess) {
    analysis.endpoints[endpoint].successes++;
  }
  
  // 主要メトリクスの更新
  if (endpoint === 'x-post-free-report') {
    analysis.keyMetrics.xPostFreeReport.executions++;
    if (isError) analysis.keyMetrics.xPostFreeReport.errors++;
    if (isSuccess) analysis.keyMetrics.xPostFreeReport.successes++;
  } else if (endpoint === 'x-quote-repost') {
    analysis.keyMetrics.xQuoteRepost.executions++;
    if (isError) analysis.keyMetrics.xQuoteRepost.errors++;
    if (isSuccess) analysis.keyMetrics.xQuoteRepost.successes++;
  } else if (endpoint === 'x-algorithm-analysis') {
    analysis.keyMetrics.xAlgorithmAnalysis.executions++;
    if (isError) analysis.keyMetrics.xAlgorithmAnalysis.errors++;
    if (isSuccess) analysis.keyMetrics.xAlgorithmAnalysis.successes++;
  } else if (endpoint === 'x-influencer-report') {
    analysis.keyMetrics.xInfluencerReport.executions++;
    if (isError) analysis.keyMetrics.xInfluencerReport.errors++;
    if (isSuccess) analysis.keyMetrics.xInfluencerReport.successes++;
  } else if (endpoint === 'x-engagement-metrics') {
    analysis.keyMetrics.xEngagementMetrics.executions++;
    if (isError) analysis.keyMetrics.xEngagementMetrics.errors++;
    if (isSuccess) analysis.keyMetrics.xEngagementMetrics.successes++;
  }
});

// エラー率を計算
Object.keys(analysis.endpoints).forEach(endpoint => {
  const ep = analysis.endpoints[endpoint];
  ep.errorRate = ep.total > 0 ? ((ep.errors / ep.total) * 100).toFixed(2) + '%' : '0%';
  ep.successRate = ep.total > 0 ? ((ep.successes / ep.total) * 100).toFixed(2) + '%' : '0%';
});

console.log(JSON.stringify(analysis, null, 2));
