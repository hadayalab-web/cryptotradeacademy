// scripts/analyze-cron-jobs-execution.js
// Cron Jobsの実行状況を詳細分析

const fs = require('fs');
const path = require('path');

const LOG_FILE = 'c:\\Users\\chiba\\Downloads\\logs_result (3).json';
const OUTPUT_DIR = path.join(__dirname, '../docs/reports');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'cron-jobs-execution-analysis.md');

// 出力ディレクトリが存在しない場合は作成
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * ログファイルを読み込む
 */
function readLogsFile() {
  try {
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    let logs = [];
    
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        logs = parsed;
      } else if (typeof parsed === 'object') {
        logs = [parsed];
      }
    } catch {
      const lines = content.trim().split('\n').filter(line => line.trim());
      logs = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean);
    }
    
    return logs;
  } catch (error) {
    console.error(`❌ ログファイルの読み込みに失敗: ${error.message}`);
    throw error;
  }
}

/**
 * Cron Jobsの実行状況を分析
 */
function analyzeCronJobs(logs) {
  console.log(`📊 Cron Jobsの実行状況を詳細分析中...\n`);
  
  // Cron Jobs関連のエンドポイント
  const cronEndpoints = [
    'api/cron',
    'api/x-quote-repost',
    'api/x-engagement-metrics',
    'api/promo-stock-monitor',
    'api/vsl2-last-call',
    'api/vsl2-free-users',
    'api/x-quote-repost-metrics',
    'api/vsl1-reminder',
    'api/x-post-performance-analysis',
  ];
  
  const analysis = {
    totalLogs: logs.length,
    cronJobs: {},
    errors: [],
    warnings: [],
    successRate: {},
  };
  
  // 各Cron Jobの実行状況を分析
  cronEndpoints.forEach(endpoint => {
    const endpointLogs = logs.filter(log => {
      if (!log || typeof log !== 'object') return false;
      const path = log.requestPath || log.path || '';
      return path.includes(endpoint);
    });
    
    const successLogs = endpointLogs.filter(log => {
      const statusCode = log.responseStatusCode || log.statusCode || null;
      return statusCode === 200;
    });
    
    const errorLogs = endpointLogs.filter(log => {
      const message = (log.message || log.text || '').toString();
      const statusCode = log.responseStatusCode || log.statusCode || null;
      return statusCode >= 400 || 
             message.includes('error') || 
             message.includes('Error') || 
             message.includes('failed') || 
             message.includes('Failed');
    });
    
    const warningLogs = endpointLogs.filter(log => {
      const message = (log.message || log.text || '').toString();
      return message.includes('warn') || 
             message.includes('Warn') || 
             message.includes('⚠️');
    });
    
    analysis.cronJobs[endpoint] = {
      totalRequests: endpointLogs.length,
      successRequests: successLogs.length,
      errorRequests: errorLogs.length,
      warningRequests: warningLogs.length,
      successRate: endpointLogs.length > 0 
        ? ((successLogs.length / endpointLogs.length) * 100).toFixed(1) 
        : '0.0',
      logs: endpointLogs,
      errors: errorLogs,
      warnings: warningLogs,
    };
    
    // エラーを集計
    errorLogs.forEach(error => {
      analysis.errors.push({
        endpoint,
        timestamp: error.timestamp || error.TimeUTC || error.timestampInMs || null,
        message: (error.message || error.text || '').toString(),
        statusCode: error.responseStatusCode || error.statusCode || null,
        log: error,
      });
    });
  });
  
  // 全体の成功率を計算
  let totalRequests = 0;
  let totalSuccess = 0;
  
  Object.values(analysis.cronJobs).forEach(job => {
    totalRequests += job.totalRequests;
    totalSuccess += job.successRequests;
  });
  
  analysis.overallSuccessRate = totalRequests > 0 
    ? ((totalSuccess / totalRequests) * 100).toFixed(1) 
    : '0.0';
  
  return analysis;
}

/**
 * 分析結果をMarkdown形式で出力
 */
function generateReport(analysis) {
  const lines = [];
  
  lines.push('# Cron Jobs実行状況詳細分析レポート');
  lines.push(`**作成日時**: ${new Date().toISOString()}`);
  lines.push('');
  
  // サマリー
  lines.push('## 📊 サマリー');
  lines.push('');
  lines.push(`- **総ログ数**: ${analysis.totalLogs.toLocaleString()}件`);
  lines.push(`- **全体の成功率**: ${analysis.overallSuccessRate}%`);
  lines.push('');
  
  // 各Cron Jobの実行状況
  lines.push('## 🔄 各Cron Jobの実行状況');
  lines.push('');
  lines.push('| Cron Job | 総リクエスト数 | 成功 | エラー | 警告 | 成功率 |');
  lines.push('|----------|----------------|------|--------|------|--------|');
  
  Object.entries(analysis.cronJobs)
    .sort((a, b) => b[1].totalRequests - a[1].totalRequests)
    .forEach(([endpoint, data]) => {
      lines.push(`| ${endpoint} | ${data.totalRequests}件 | ${data.successRequests}件 | ${data.errorRequests}件 | ${data.warningRequests}件 | ${data.successRate}% |`);
    });
  
  lines.push('');
  
  // 問題のあるCron Jobs
  lines.push('## ⚠️ 問題のあるCron Jobs');
  lines.push('');
  
  const problematicJobs = Object.entries(analysis.cronJobs)
    .filter(([endpoint, data]) => {
      return data.errorRequests > 0 || 
             parseFloat(data.successRate) < 90 || 
             (data.totalRequests > 0 && data.successRequests === 0);
    })
    .sort((a, b) => b[1].errorRequests - a[1].errorRequests);
  
  if (problematicJobs.length === 0) {
    lines.push('✅ 問題のあるCron Jobはありません。');
    lines.push('');
  } else {
    problematicJobs.forEach(([endpoint, data]) => {
      lines.push(`### ${endpoint}`);
      lines.push(`- **総リクエスト数**: ${data.totalRequests}件`);
      lines.push(`- **成功**: ${data.successRequests}件`);
      lines.push(`- **エラー**: ${data.errorRequests}件`);
      lines.push(`- **警告**: ${data.warningRequests}件`);
      lines.push(`- **成功率**: ${data.successRate}%`);
      lines.push('');
      
      if (data.errorRequests > 0) {
        lines.push('#### エラーの詳細（最初の5件）');
        data.errors.slice(0, 5).forEach((error, index) => {
          lines.push(`${index + 1}. **${error.timestamp || 'Unknown'}**`);
          lines.push(`   - ステータスコード: ${error.statusCode || 'Unknown'}`);
          lines.push(`   - メッセージ: ${error.message.substring(0, 300)}`);
          lines.push('');
        });
      }
    });
  }
  
  // 重要な発見
  lines.push('## 🔍 重要な発見');
  lines.push('');
  
  // x-quote-repostの分析
  const quoteRepostJob = analysis.cronJobs['api/x-quote-repost'];
  if (quoteRepostJob) {
    lines.push('### 1. x-quote-repostエンドポイント');
    lines.push(`- **総リクエスト数**: ${quoteRepostJob.totalRequests}件`);
    lines.push(`- **成功**: ${quoteRepostJob.successRequests}件`);
    lines.push(`- **エラー**: ${quoteRepostJob.errorRequests}件`);
    lines.push(`- **成功率**: ${quoteRepostJob.successRate}%`);
    lines.push('');
    
    if (quoteRepostJob.errorRequests > 0) {
      lines.push('⚠️ **問題**: エラーが発生しています。');
      lines.push('');
      lines.push('**主なエラー**:');
      const assignmentErrors = quoteRepostJob.errors.filter(e => 
        e.message.includes('Assignment to constant variable')
      );
      if (assignmentErrors.length > 0) {
        lines.push(`- Assignment to constant variable: ${assignmentErrors.length}件`);
      }
      lines.push('');
    }
    
    if (quoteRepostJob.successRequests > 0 && quoteRepostJob.errorRequests === 0) {
      lines.push('✅ **成功**: リクエストは成功していますが、X APIへの投稿が0件です。');
      lines.push('これは、処理が正常に完了しているが、実際の投稿が実行されていない可能性があります。');
      lines.push('');
    }
  }
  
  // cron.jsの分析
  const cronJob = analysis.cronJobs['api/cron'];
  if (cronJob) {
    lines.push('### 2. cron.jsエンドポイント');
    lines.push(`- **総リクエスト数**: ${cronJob.totalRequests}件`);
    lines.push(`- **成功**: ${cronJob.successRequests}件`);
    lines.push(`- **エラー**: ${cronJob.errorRequests}件`);
    lines.push(`- **成功率**: ${cronJob.successRate}%`);
    lines.push('');
    
    if (cronJob.errorRequests > 0) {
      lines.push('⚠️ **問題**: エラーが発生しています。');
      lines.push('');
      const gptErrors = cronJob.errors.filter(e => 
        e.message.includes('GPT API failed') || e.message.includes('OpenAI API error')
      );
      if (gptErrors.length > 0) {
        lines.push(`- GPT APIエラー: ${gptErrors.length}件`);
      }
      lines.push('');
    }
  }
  
  // 推奨事項
  lines.push('## 💡 推奨事項');
  lines.push('');
  
  if (problematicJobs.length > 0) {
    lines.push('1. **エラーの修正**');
    lines.push('   - 各Cron Jobのエラーログを確認');
    lines.push('   - エラーの原因を特定して修正');
    lines.push('   - 特に`Assignment to constant variable`エラーは修正がデプロイされていない可能性があります');
    lines.push('');
  }
  
  lines.push('2. **Cron Jobsの監視強化**');
  lines.push('   - 各Cron Jobの実行状況を定期的に確認');
  lines.push('   - エラー率が高いCron Jobを優先的に修正');
  lines.push('   - 成功率が90%未満のCron Jobを調査');
  lines.push('');
  
  lines.push('3. **デバッグログの追加**');
  lines.push('   - 各Cron Jobの処理開始時にログを記録');
  lines.push('   - エラー発生時に詳細な情報をログに記録');
  lines.push('   - 処理完了時に成功/失敗をログに記録');
  lines.push('');
  
  return lines.join('\n');
}

/**
 * メイン処理
 */
function main() {
  try {
    console.log('📊 Cron Jobsの実行状況を詳細分析中...\n');
    
    // ログファイルを読み込む
    const logs = readLogsFile();
    console.log(`✅ ログファイルを読み込みました: ${logs.length}件\n`);
    
    // Cron Jobsの実行状況を分析
    const analysis = analyzeCronJobs(logs);
    
    // レポートを生成
    const report = generateReport(analysis);
    
    // レポートをファイルに保存
    fs.writeFileSync(OUTPUT_FILE, report, 'utf-8');
    console.log(`✅ レポートを保存しました: ${OUTPUT_FILE}\n`);
    
    // サマリーを表示
    console.log('📊 Cron Jobs実行状況分析結果サマリー:');
    console.log(`- 全体の成功率: ${analysis.overallSuccessRate}%`);
    console.log('');
    
    Object.entries(analysis.cronJobs)
      .sort((a, b) => b[1].totalRequests - a[1].totalRequests)
      .forEach(([endpoint, data]) => {
        console.log(`${endpoint}:`);
        console.log(`  - 総リクエスト数: ${data.totalRequests}件`);
        console.log(`  - 成功: ${data.successRequests}件`);
        console.log(`  - エラー: ${data.errorRequests}件`);
        console.log(`  - 成功率: ${data.successRate}%`);
        console.log('');
      });
    
    const problematicJobs = Object.entries(analysis.cronJobs)
      .filter(([endpoint, data]) => {
        return data.errorRequests > 0 || 
               parseFloat(data.successRate) < 90 || 
               (data.totalRequests > 0 && data.successRequests === 0);
      });
    
    if (problematicJobs.length > 0) {
      console.log('⚠️ 問題のあるCron Jobs:');
      problematicJobs.forEach(([endpoint, data]) => {
        console.log(`  - ${endpoint}: エラー${data.errorRequests}件, 成功率${data.successRate}%`);
      });
      console.log('');
    }
    
    console.log('\n✅ 分析完了');
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// 実行
if (require.main === module) {
  main();
}

module.exports = { analyzeCronJobs, generateReport };
