// scripts/analyze-cron-logs-detailed.js
// Cron Jobs実行ログの詳細分析

const fs = require('fs');
const path = require('path');

/**
 * Cron Jobsログを分析
 */
async function analyzeCronLogs(logFilePath) {
  try {
    console.log('[Cron Logs Analyzer] ========================================');
    console.log('[Cron Logs Analyzer] Analyzing Cron Jobs logs...');
    console.log('[Cron Logs Analyzer] ========================================\n');

    // JSONファイルを読み込み
    const logData = JSON.parse(fs.readFileSync(logFilePath, 'utf8'));
    
    // エンドポイント別に分類
    const endpoints = {
      'x-post-free-report': [],
      'x-quote-repost': [],
      'x-algorithm-analysis': [],
      'x-engagement-metrics': [],
      'other': []
    };

    // エラーと成功を分類
    const errors = [];
    const successes = [];
    const statusCodes = {};

    logData.forEach((log) => {
      const path = log.requestPath || '';
      const statusCode = log.responseStatusCode || 0;
      const message = log.message || '';
      const timestamp = log.TimeUTC || log.timestamp || '';

      // ステータスコードを集計
      statusCodes[statusCode] = (statusCodes[statusCode] || 0) + 1;

      // エンドポイント別に分類
      if (path.includes('x-post-free-report')) {
        endpoints['x-post-free-report'].push(log);
      } else if (path.includes('x-quote-repost')) {
        endpoints['x-quote-repost'].push(log);
      } else if (path.includes('x-algorithm-analysis')) {
        endpoints['x-algorithm-analysis'].push(log);
      } else if (path.includes('x-engagement-metrics')) {
        endpoints['x-engagement-metrics'].push(log);
      } else {
        endpoints['other'].push(log);
      }

      // エラーと成功を分類
      if (statusCode >= 400 || message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) {
        errors.push({
          path,
          statusCode,
          message,
          timestamp,
          requestId: log.requestId || ''
        });
      } else if (statusCode >= 200 && statusCode < 300) {
        successes.push({
          path,
          statusCode,
          message,
          timestamp
        });
      }
    });

    // 結果を表示
    console.log('📊 Cron Jobs Execution Summary');
    console.log('========================================\n');

    console.log('📈 Status Code Distribution:');
    Object.entries(statusCodes).sort((a, b) => b[1] - a[1]).forEach(([code, count]) => {
      console.log(`   ${code}: ${count} requests`);
    });

    console.log('\n📝 Endpoint Execution Count:');
    Object.entries(endpoints).forEach(([endpoint, logs]) => {
      if (logs.length > 0) {
        console.log(`   ${endpoint}: ${logs.length} executions`);
      }
    });

    console.log(`\n✅ Successes: ${successes.length}`);
    console.log(`❌ Errors: ${errors.length}`);

    // エンドポイント別の詳細分析
    console.log('\n📋 Endpoint Details:');
    console.log('========================================\n');

    Object.entries(endpoints).forEach(([endpoint, logs]) => {
      if (logs.length === 0) return;

      const endpointStatusCodes = {};
      const endpointErrors = [];
      const endpointSuccesses = [];

      logs.forEach((log) => {
        const statusCode = log.responseStatusCode || 0;
        endpointStatusCodes[statusCode] = (endpointStatusCodes[statusCode] || 0) + 1;

        if (statusCode >= 400 || (log.message || '').toLowerCase().includes('error')) {
          endpointErrors.push(log);
        } else if (statusCode >= 200 && statusCode < 300) {
          endpointSuccesses.push(log);
        }
      });

      console.log(`\n🔹 ${endpoint.toUpperCase()}:`);
      console.log(`   Total Executions: ${logs.length}`);
      console.log(`   Successes: ${endpointSuccesses.length}`);
      console.log(`   Errors: ${endpointErrors.length}`);
      console.log(`   Status Codes:`, endpointStatusCodes);

      // 最新の実行ログを表示
      if (logs.length > 0) {
        const latestLog = logs[logs.length - 1];
        console.log(`   Latest Execution: ${latestLog.TimeUTC || latestLog.timestamp || 'N/A'}`);
        console.log(`   Latest Status: ${latestLog.responseStatusCode || 'N/A'}`);
        if (latestLog.message) {
          const shortMessage = latestLog.message.substring(0, 100);
          console.log(`   Latest Message: ${shortMessage}${latestLog.message.length > 100 ? '...' : ''}`);
        }
      }

      // エラーがある場合は詳細を表示
      if (endpointErrors.length > 0) {
        console.log(`\n   ⚠️ Errors (${endpointErrors.length}):`);
        endpointErrors.slice(0, 5).forEach((errorLog) => {
          console.log(`      - ${errorLog.TimeUTC || errorLog.timestamp || 'N/A'}: ${errorLog.responseStatusCode || 'N/A'} - ${(errorLog.message || '').substring(0, 80)}`);
        });
        if (endpointErrors.length > 5) {
          console.log(`      ... and ${endpointErrors.length - 5} more errors`);
        }
      }
    });

    // エラーサマリー
    if (errors.length > 0) {
      console.log('\n\n❌ Error Summary:');
      console.log('========================================');
      errors.slice(0, 10).forEach((error) => {
        console.log(`\n[${error.timestamp}] ${error.path}`);
        console.log(`   Status: ${error.statusCode}`);
        console.log(`   Message: ${error.message.substring(0, 150)}`);
        console.log(`   Request ID: ${error.requestId}`);
      });
      if (errors.length > 10) {
        console.log(`\n... and ${errors.length - 10} more errors`);
      }
    }

    // Grok最適化メッセージ関連のログを検索
    console.log('\n\n🎯 Grok Optimization Message Related Logs:');
    console.log('========================================');
    const grokRelatedLogs = logData.filter((log) => {
      const message = (log.message || '').toLowerCase();
      return message.includes('grok') || 
             message.includes('optimization') || 
             message.includes('quote repost') ||
             message.includes('tweet template') ||
             message.includes('urgent alert') ||
             message.includes('emergency briefing');
    });

    if (grokRelatedLogs.length > 0) {
      console.log(`Found ${grokRelatedLogs.length} related logs:\n`);
      grokRelatedLogs.slice(0, 10).forEach((log) => {
        console.log(`[${log.TimeUTC || log.timestamp || 'N/A'}] ${log.requestPath || 'N/A'}`);
        console.log(`   ${log.message || 'N/A'}`);
      });
    } else {
      console.log('No Grok optimization related logs found.');
    }

    return {
      summary: {
        totalLogs: logData.length,
        successes: successes.length,
        errors: errors.length,
        statusCodes
      },
      endpoints,
      errors: errors.slice(0, 20),
      grokRelatedLogs: grokRelatedLogs.slice(0, 20)
    };
  } catch (error) {
    console.error('[Cron Logs Analyzer] ❌ Error:', error.message);
    console.error('[Cron Logs Analyzer] Stack:', error.stack);
    throw error;
  }
}

// 実行
if (require.main === module) {
  const logFilePath = process.argv[2] || path.join(__dirname, '../logs_result.json');
  
  analyzeCronLogs(logFilePath)
    .then((result) => {
      console.log('\n✅ Analysis completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to analyze logs:', error);
      process.exit(1);
    });
}

module.exports = { analyzeCronLogs };
