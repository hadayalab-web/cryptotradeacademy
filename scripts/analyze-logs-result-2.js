#!/usr/bin/env node
// scripts/analyze-logs-result-2.js
// Vercelデプロイ後12時間分のログとX API Webhookの徹底分析

const fs = require('fs');
const path = require('path');

const LOG_FILE = 'c:\\Users\\chiba\\Downloads\\logs_result (2).json';
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'vercel-logs');
const ANALYSIS_REPORT = path.join(OUTPUT_DIR, 'logs-result-2-analysis.md');
const ERROR_SUMMARY = path.join(OUTPUT_DIR, 'logs-result-2-errors.json');
const WEBHOOK_ANALYSIS = path.join(OUTPUT_DIR, 'logs-result-2-webhook-analysis.json');

// 出力ディレクトリを作成
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('📊 Vercelデプロイ後12時間分のログを徹底分析中...\n');

// ログファイルを読み込み（ストリーミング処理でメモリ安全）
let logs = [];
try {
  const fileContent = fs.readFileSync(LOG_FILE, 'utf-8');
  logs = JSON.parse(fileContent);
  console.log(`✅ ログファイルを読み込み: ${logs.length}件のログエントリ\n`);
} catch (error) {
  console.error(`❌ ログファイルの読み込みに失敗: ${error.message}`);
  process.exit(1);
}

// 分析結果を格納するオブジェクト
const analysis = {
  summary: {
    totalLogs: logs.length,
    timeRange: {
      start: null,
      end: null
    },
    endpoints: {},
    methods: {},
    statusCodes: {},
    errorCount: 0,
    warningCount: 0,
    infoCount: 0
  },
  errors: [],
  warnings: [],
  webhook: {
    crcRequests: [],
    postRequests: [],
    events: {
      like: 0,
      retweet: 0,
      reply: 0,
      other: 0
    },
    errors: []
  },
  endpoints: {},
  performance: {
    slowRequests: [],
    averageDuration: 0,
    maxDuration: 0
  },
  patterns: {
    errorPatterns: {},
    commonErrors: []
  }
};

// ログを分析
console.log('🔍 ログを分析中...\n');

logs.forEach((log, index) => {
  if (!log || typeof log !== 'object') return;

  // タイムスタンプ処理
  const timestamp = log.TimeUTC || log.timestamp || log.timestampInMs;
  if (timestamp) {
    if (!analysis.summary.timeRange.start || timestamp < analysis.summary.timeRange.start) {
      analysis.summary.timeRange.start = timestamp;
    }
    if (!analysis.summary.timeRange.end || timestamp > analysis.summary.timeRange.end) {
      analysis.summary.timeRange.end = timestamp;
    }
  }

  // エンドポイント統計
  const requestPath = log.requestPath || '';
  const endpoint = requestPath.split('/').pop() || 'unknown';
  if (!analysis.endpoints[endpoint]) {
    analysis.endpoints[endpoint] = {
      count: 0,
      methods: {},
      statusCodes: {},
      errors: [],
      avgDuration: 0,
      durations: []
    };
  }
  analysis.endpoints[endpoint].count++;

  // HTTPメソッド統計
  const method = log.requestMethod || 'unknown';
  analysis.summary.methods[method] = (analysis.summary.methods[method] || 0) + 1;
  analysis.endpoints[endpoint].methods[method] = (analysis.endpoints[endpoint].methods[method] || 0) + 1;

  // ステータスコード統計
  const statusCode = log.responseStatusCode || '';
  if (statusCode) {
    const status = statusCode.toString().charAt(0) + 'xx';
    analysis.summary.statusCodes[status] = (analysis.summary.statusCodes[status] || 0) + 1;
    analysis.endpoints[endpoint].statusCodes[statusCode] = (analysis.endpoints[endpoint].statusCodes[statusCode] || 0) + 1;
  }

  // ログレベル統計
  const level = (log.level || log.type || '').toLowerCase();
  const message = (log.message || log.text || '').toLowerCase();

  if (level.includes('error') || message.includes('error')) {
    analysis.summary.errorCount++;
    analysis.errors.push({
      timestamp,
      endpoint,
      method,
      statusCode,
      message: log.message || log.text || '',
      requestId: log.requestId,
      deploymentId: log.deploymentId
    });
    analysis.endpoints[endpoint].errors.push({
      timestamp,
      message: log.message || log.text || ''
    });
  } else if (level.includes('warn') || message.includes('warn')) {
    analysis.summary.warningCount++;
    analysis.warnings.push({
      timestamp,
      endpoint,
      method,
      message: log.message || log.text || ''
    });
  } else {
    analysis.summary.infoCount++;
  }

  // X Webhookの詳細分析
  if (requestPath.includes('x-webhook')) {
    if (method === 'GET') {
      // CRC Challenge-Response Check
      analysis.webhook.crcRequests.push({
        timestamp,
        queryString: log.requestQueryString || '',
        message: log.message || ''
      });
    } else if (method === 'POST') {
      // POSTリクエスト（Webhookイベント）
      analysis.webhook.postRequests.push({
        timestamp,
        statusCode,
        message: log.message || '',
        requestId: log.requestId
      });

      // イベントタイプの検出
      const msg = log.message || '';
      if (msg.includes('like') || msg.includes('Like')) {
        analysis.webhook.events.like++;
      } else if (msg.includes('retweet') || msg.includes('Retweet')) {
        analysis.webhook.events.retweet++;
      } else if (msg.includes('reply') || msg.includes('Reply')) {
        analysis.webhook.events.reply++;
      } else {
        analysis.webhook.events.other++;
      }

      // Webhookエラー
      if (level.includes('error') || message.includes('error')) {
        analysis.webhook.errors.push({
          timestamp,
          statusCode,
          message: log.message || log.text || '',
          requestId: log.requestId
        });
      }
    }
  }

  // パフォーマンス分析
  const duration = parseInt(log.durationMs) || 0;
  if (duration > 0) {
    analysis.endpoints[endpoint].durations.push(duration);
    if (duration > analysis.performance.maxDuration) {
      analysis.performance.maxDuration = duration;
    }
    if (duration > 1000) { // 1秒以上
      analysis.performance.slowRequests.push({
        timestamp,
        endpoint,
        method,
        duration,
        requestId: log.requestId
      });
    }
  }

  // エラーパターンの抽出
  if (level.includes('error') || message.includes('error')) {
    const errorMsg = log.message || log.text || '';
    const pattern = extractErrorPattern(errorMsg);
    analysis.patterns.errorPatterns[pattern] = (analysis.patterns.errorPatterns[pattern] || 0) + 1;
  }
});

// 平均処理時間を計算
Object.keys(analysis.endpoints).forEach(endpoint => {
  const durations = analysis.endpoints[endpoint].durations;
  if (durations.length > 0) {
    const sum = durations.reduce((a, b) => a + b, 0);
    analysis.endpoints[endpoint].avgDuration = Math.round(sum / durations.length);
  }
});

// 全エンドポイントの平均処理時間を計算
const allDurations = [];
Object.values(analysis.endpoints).forEach(endpoint => {
  allDurations.push(...endpoint.durations);
});
if (allDurations.length > 0) {
  const sum = allDurations.reduce((a, b) => a + b, 0);
  analysis.performance.averageDuration = Math.round(sum / allDurations.length);
}

// よくあるエラーを抽出
analysis.patterns.commonErrors = Object.entries(analysis.patterns.errorPatterns)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([pattern, count]) => ({ pattern, count }));

// エラーサマリーを保存
fs.writeFileSync(
  ERROR_SUMMARY,
  JSON.stringify({
    totalErrors: analysis.summary.errorCount,
    errors: analysis.errors.slice(0, 100), // 最初の100件
    errorPatterns: analysis.patterns.errorPatterns,
    commonErrors: analysis.patterns.commonErrors
  }, null, 2),
  'utf-8'
);

// Webhook分析結果を保存
fs.writeFileSync(
  WEBHOOK_ANALYSIS,
  JSON.stringify(analysis.webhook, null, 2),
  'utf-8'
);

// 詳細レポートを生成
const report = generateReport(analysis);
fs.writeFileSync(ANALYSIS_REPORT, report, 'utf-8');

console.log('✅ 分析完了！\n');
console.log('📊 サマリー:');
console.log(`  - 総ログ数: ${analysis.summary.totalLogs}件`);
console.log(`  - エラー数: ${analysis.summary.errorCount}件`);
console.log(`  - 警告数: ${analysis.summary.warningCount}件`);
console.log(`  - 情報ログ: ${analysis.summary.infoCount}件`);
console.log(`\n📡 X Webhook:`);
console.log(`  - CRCリクエスト: ${analysis.webhook.crcRequests.length}件`);
console.log(`  - POSTリクエスト: ${analysis.webhook.postRequests.length}件`);
console.log(`  - いいねイベント: ${analysis.webhook.events.like}件`);
console.log(`  - リツイートイベント: ${analysis.webhook.events.retweet}件`);
console.log(`  - リプライイベント: ${analysis.webhook.events.reply}件`);
console.log(`  - その他イベント: ${analysis.webhook.events.other}件`);
console.log(`  - Webhookエラー: ${analysis.webhook.errors.length}件`);
console.log(`\n⏱️  パフォーマンス:`);
console.log(`  - 平均処理時間: ${analysis.performance.averageDuration}ms`);
console.log(`  - 最大処理時間: ${analysis.performance.maxDuration}ms`);
console.log(`  - 遅いリクエスト（>1秒）: ${analysis.performance.slowRequests.length}件`);

console.log(`\n💾 分析結果を保存:`);
console.log(`  - 詳細レポート: ${ANALYSIS_REPORT}`);
console.log(`  - エラーサマリー: ${ERROR_SUMMARY}`);
console.log(`  - Webhook分析: ${WEBHOOK_ANALYSIS}`);

/**
 * エラーパターンを抽出
 */
function extractErrorPattern(message) {
  if (!message || typeof message !== 'string') return 'Unknown error';
  
  // SyntaxError, ReferenceError, TypeErrorなどを検出
  const syntaxMatch = message.match(/(SyntaxError|ReferenceError|TypeError|Error):\s*(.+?)(?:\n|$)/i);
  if (syntaxMatch) {
    return `${syntaxMatch[1]}: ${syntaxMatch[2].substring(0, 100)}`;
  }

  // "Cannot find module"などの一般的なパターン
  const moduleMatch = message.match(/Cannot find module ['"](.+?)['"]/i);
  if (moduleMatch) {
    return `Module not found: ${moduleMatch[1]}`;
  }

  // タイムアウト
  if (message.includes('timeout') || message.includes('Timeout')) {
    return 'Timeout error';
  }

  // 認証エラー
  if (message.includes('auth') || message.includes('unauthorized') || message.includes('401')) {
    return 'Authentication error';
  }

  // その他のエラーメッセージの最初の100文字
  return message.substring(0, 100).replace(/\n/g, ' ').trim() || 'Unknown error';
}

/**
 * 詳細レポートを生成
 */
function generateReport(analysis) {
  const lines = [];
  
  lines.push('# Vercelデプロイ後12時間分のログ徹底分析レポート');
  lines.push(`**生成日時**: ${new Date().toISOString()}`);
  lines.push(`**分析対象**: logs_result (2).json`);
  lines.push('');
  
  lines.push('## 📊 サマリー');
  lines.push('');
  lines.push(`- **総ログ数**: ${analysis.summary.totalLogs}件`);
  lines.push(`- **エラー数**: ${analysis.summary.errorCount}件`);
  lines.push(`- **警告数**: ${analysis.summary.warningCount}件`);
  lines.push(`- **情報ログ**: ${analysis.summary.infoCount}件`);
  lines.push(`- **期間**: ${analysis.summary.timeRange.start} ～ ${analysis.summary.timeRange.end}`);
  lines.push('');
  
  lines.push('## 📡 X Webhook分析');
  lines.push('');
  lines.push('### CRC Challenge-Response Check');
  lines.push(`- **総リクエスト数**: ${analysis.webhook.crcRequests.length}件`);
  if (analysis.webhook.crcRequests.length > 0) {
    lines.push('- **最初のリクエスト**: ' + analysis.webhook.crcRequests[0].timestamp);
    lines.push('- **最後のリクエスト**: ' + analysis.webhook.crcRequests[analysis.webhook.crcRequests.length - 1].timestamp);
  }
  lines.push('');
  
  lines.push('### POSTリクエスト（Webhookイベント）');
  lines.push(`- **総リクエスト数**: ${analysis.webhook.postRequests.length}件`);
  if (analysis.webhook.postRequests.length > 0) {
    lines.push('- **最初のリクエスト**: ' + analysis.webhook.postRequests[0].timestamp);
    lines.push('- **最後のリクエスト**: ' + analysis.webhook.postRequests[analysis.webhook.postRequests.length - 1].timestamp);
  }
  lines.push('');
  
  lines.push('### イベントタイプ別');
  lines.push(`- **いいね**: ${analysis.webhook.events.like}件`);
  lines.push(`- **リツイート**: ${analysis.webhook.events.retweet}件`);
  lines.push(`- **リプライ**: ${analysis.webhook.events.reply}件`);
  lines.push(`- **その他**: ${analysis.webhook.events.other}件`);
  lines.push('');
  
  if (analysis.webhook.errors.length > 0) {
    lines.push('### Webhookエラー');
    lines.push(`- **エラー数**: ${analysis.webhook.errors.length}件`);
    lines.push('');
    lines.push('#### エラー詳細（最初の10件）');
    analysis.webhook.errors.slice(0, 10).forEach((error, index) => {
      lines.push(`${index + 1}. **[${error.timestamp}]** ${error.statusCode || 'N/A'}`);
      lines.push(`   - ${error.message.substring(0, 200)}`);
      lines.push(`   - Request ID: ${error.requestId || 'N/A'}`);
      lines.push('');
    });
  }
  
  lines.push('## 🔍 エンドポイント別分析');
  lines.push('');
  const sortedEndpoints = Object.entries(analysis.endpoints)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20);
  
  sortedEndpoints.forEach(([endpoint, data]) => {
    lines.push(`### ${endpoint}`);
    lines.push(`- **総リクエスト数**: ${data.count}件`);
    lines.push(`- **平均処理時間**: ${data.avgDuration}ms`);
    lines.push(`- **エラー数**: ${data.errors.length}件`);
    lines.push('');
    
    if (Object.keys(data.methods).length > 0) {
      lines.push('#### HTTPメソッド');
      Object.entries(data.methods)
        .sort((a, b) => b[1] - a[1])
        .forEach(([method, count]) => {
          lines.push(`- ${method}: ${count}件`);
        });
      lines.push('');
    }
    
    if (Object.keys(data.statusCodes).length > 0) {
      lines.push('#### ステータスコード');
      Object.entries(data.statusCodes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([code, count]) => {
          lines.push(`- ${code}: ${count}件`);
        });
      lines.push('');
    }
    
    if (data.errors.length > 0) {
      lines.push('#### エラー詳細（最初の5件）');
      data.errors.slice(0, 5).forEach((error, index) => {
        lines.push(`${index + 1}. **[${error.timestamp}]**`);
        lines.push(`   ${error.message.substring(0, 200)}`);
        lines.push('');
      });
    }
  });
  
  lines.push('## ❌ エラー分析');
  lines.push('');
  lines.push(`### 総エラー数: ${analysis.summary.errorCount}件`);
  lines.push('');
  
  if (analysis.patterns.commonErrors.length > 0) {
    lines.push('### よくあるエラー（トップ10）');
    analysis.patterns.commonErrors.forEach((item, index) => {
      lines.push(`${index + 1}. **${item.pattern}** (${item.count}回)`);
    });
    lines.push('');
  }
  
  if (analysis.errors.length > 0) {
    lines.push('### エラー詳細（最初の20件）');
    analysis.errors.slice(0, 20).forEach((error, index) => {
      lines.push(`${index + 1}. **[${error.timestamp}]** ${error.endpoint} (${error.method})`);
      lines.push(`   - Status: ${error.statusCode || 'N/A'}`);
      lines.push(`   - ${error.message.substring(0, 300)}`);
      lines.push(`   - Request ID: ${error.requestId || 'N/A'}`);
      lines.push('');
    });
  }
  
  lines.push('## ⏱️ パフォーマンス分析');
  lines.push('');
  lines.push(`- **平均処理時間**: ${analysis.performance.averageDuration}ms`);
  lines.push(`- **最大処理時間**: ${analysis.performance.maxDuration}ms`);
  lines.push(`- **遅いリクエスト（>1秒）**: ${analysis.performance.slowRequests.length}件`);
  lines.push('');
  
  if (analysis.performance.slowRequests.length > 0) {
    lines.push('### 遅いリクエスト（トップ10）');
    analysis.performance.slowRequests
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
      .forEach((req, index) => {
        lines.push(`${index + 1}. **[${req.timestamp}]** ${req.endpoint} (${req.method})`);
        lines.push(`   - 処理時間: ${req.duration}ms`);
        lines.push(`   - Request ID: ${req.requestId || 'N/A'}`);
        lines.push('');
      });
  }
  
  lines.push('## 📋 HTTPメソッド別統計');
  lines.push('');
  Object.entries(analysis.summary.methods)
    .sort((a, b) => b[1] - a[1])
    .forEach(([method, count]) => {
      lines.push(`- **${method}**: ${count}件`);
    });
  lines.push('');
  
  lines.push('## 📊 ステータスコード別統計');
  lines.push('');
  Object.entries(analysis.summary.statusCodes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      lines.push(`- **${status}**: ${count}件`);
    });
  lines.push('');
  
  lines.push('## 🔧 推奨事項');
  lines.push('');
  
  if (analysis.summary.errorCount > 0) {
    lines.push('### エラー対応');
    lines.push(`- ${analysis.summary.errorCount}件のエラーが検出されました。エラー詳細を確認し、根本原因を特定してください。`);
    lines.push('');
  }
  
  if (analysis.performance.slowRequests.length > 0) {
    lines.push('### パフォーマンス改善');
    lines.push(`- ${analysis.performance.slowRequests.length}件の遅いリクエストが検出されました。最適化を検討してください。`);
    lines.push('');
  }
  
  if (analysis.webhook.errors.length > 0) {
    lines.push('### X Webhook改善');
    lines.push(`- X Webhookで${analysis.webhook.errors.length}件のエラーが検出されました。Webhook処理の安定性を向上させてください。`);
    lines.push('');
  }
  
  lines.push('---');
  lines.push(`**レポート生成日時**: ${new Date().toISOString()}`);
  
  return lines.join('\n');
}
