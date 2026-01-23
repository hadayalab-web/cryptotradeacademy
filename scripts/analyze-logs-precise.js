// scripts/analyze-logs-precise.js
// 高精度Cron Jobsログ分析（詳細なエラー分類とパフォーマンス分析）

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads', 'logs_result.json');

function analyzeLogsPrecise() {
  console.log('🔬 高精度: Cron Jobsログ分析開始\n');
  console.log('='.repeat(80));
  
  // ログファイルを読み込み
  let logs;
  try {
    const logContent = fs.readFileSync(LOG_FILE, 'utf-8');
    logs = JSON.parse(logContent);
    console.log(`✅ ログファイルを読み込みました`);
    console.log(`📊 ログエントリ数: ${logs.length}件\n`);
  } catch (error) {
    console.error(`❌ ログファイルの読み込みに失敗: ${error.message}`);
    return;
  }
  
  if (!Array.isArray(logs)) {
    console.error('❌ ログファイルの形式が不正です（配列である必要があります）');
    return;
  }
  
  // タイムスタンプでソート（古い順）
  logs.sort((a, b) => {
    const timeA = a.TimeUTC || a.timestampInMs || 0;
    const timeB = b.TimeUTC || b.timestampInMs || 0;
    return timeA - timeB;
  });
  
  // Cron Job別に分類（より詳細なパス解析）
  const cronJobs = {
    'cron': [],
    'weekly-report': [],
    'vsl1-post': [],
    'vsl2-free-users': [],
    'vsl1-reminder': [],
    'vsl2-last-call': [],
    'promo-stock-monitor': [],
    'monthly-engagement-report': [],
    'lead-discovery': [],
    'lead-discovery/process': [],
    'lead-discovery/cvr-dashboard': [],
    'lead-discovery/sync-purchases': [],
    'lead-discovery-daily-report': [],
    'lead-discovery-weekly-report': [],
    'x-post-free-report': [],
    'x-quote-repost': [],
  };
  
  // ログを分類（より正確なパス解析）
  logs.forEach(log => {
    const requestPath = log.requestPath || '';
    const functionPath = log.function || '';
    const message = log.message || '';
    
    // パスからCron Job名を抽出（複数の方法を試行）
    let jobName = null;
    
    // 方法1: requestPathから抽出
    if (requestPath.includes('/api/')) {
      const match = requestPath.match(/\/api\/([^\/\?]+)/);
      if (match) {
        jobName = match[1];
      }
    }
    
    // 方法2: functionPathから抽出
    if (!jobName && functionPath.includes('/api/')) {
      const match = functionPath.match(/\/api\/([^\/\?]+)/);
      if (match) {
        jobName = match[1];
      }
    }
    
    // 方法3: メッセージから推測
    if (!jobName && message) {
      const messageLower = message.toLowerCase();
      if (messageLower.includes('quote repost') || messageLower.includes('[quote repost]')) {
        jobName = 'x-quote-repost';
      } else if (messageLower.includes('lead discovery') || messageLower.includes('[lead discovery]')) {
        jobName = 'lead-discovery';
      } else if (messageLower.includes('x post') || messageLower.includes('[x post]')) {
        jobName = 'x-post-free-report';
      } else if (messageLower.includes('vsl1')) {
        jobName = 'vsl1-post';
      } else if (messageLower.includes('vsl2')) {
        jobName = 'vsl2-free-users';
      }
    }
    
    if (jobName && cronJobs[jobName]) {
      cronJobs[jobName].push(log);
    } else {
      if (!cronJobs['_unknown']) {
        cronJobs['_unknown'] = [];
      }
      cronJobs['_unknown'].push(log);
    }
  });
  
  // 各Cron Jobの実行結果を詳細分析
  const analysis = {
    total: logs.length,
    success: 0,
    errors: 0,
    warnings: 0,
    byJob: {},
    criticalIssues: [],
    blockingIssues: [],
    performanceIssues: [],
    errorPatterns: {},
    timeRange: {
      start: null,
      end: null,
      duration: null,
    },
  };
  
  // エラーパターン分類
  const errorPatterns = {
    'SyntaxError': [],
    'TypeError': [],
    'ReferenceError': [],
    '403': [],
    '404': [],
    '500': [],
    'timeout': [],
    'rate_limit': [],
    'network': [],
    'other': [],
  };
  
  Object.keys(cronJobs).forEach(jobName => {
    if (jobName === '_unknown') return;
    
    const jobLogs = cronJobs[jobName];
    if (jobLogs.length === 0) return;
    
    const jobAnalysis = {
      count: jobLogs.length,
      success: 0,
      errors: 0,
      warnings: 0,
      errorMessages: [],
      statusCodes: {},
      errorTypes: {},
      durations: [],
      lastExecution: null,
      firstExecution: null,
      blockingErrors: [],
      performanceIssues: [],
      successRate: 0,
      errorRate: 0,
    };
    
    jobLogs.forEach(log => {
      const statusCode = log.responseStatusCode || 0;
      const level = log.level || 'info';
      const message = log.message || '';
      const duration = log.durationMs || 0;
      const timeUTC = log.TimeUTC || log.timestampInMs;
      
      // タイムスタンプ記録
      if (timeUTC) {
        if (!jobAnalysis.firstExecution || timeUTC < jobAnalysis.firstExecution) {
          jobAnalysis.firstExecution = timeUTC;
        }
        if (!jobAnalysis.lastExecution || timeUTC > jobAnalysis.lastExecution) {
          jobAnalysis.lastExecution = timeUTC;
        }
        
        if (!analysis.timeRange.start || timeUTC < analysis.timeRange.start) {
          analysis.timeRange.start = timeUTC;
        }
        if (!analysis.timeRange.end || timeUTC > analysis.timeRange.end) {
          analysis.timeRange.end = timeUTC;
        }
      }
      
      // 実行時間記録
      if (duration > 0) {
        jobAnalysis.durations.push(duration);
      }
      
      // ステータスコード別にカウント
      if (!jobAnalysis.statusCodes[statusCode]) {
        jobAnalysis.statusCodes[statusCode] = 0;
      }
      jobAnalysis.statusCodes[statusCode]++;
      
      // 成功/エラー/警告の詳細判定
      let isSuccess = false;
      let isError = false;
      let isWarning = false;
      
      // ステータスコードベースの判定
      if (statusCode >= 200 && statusCode < 300) {
        isSuccess = true;
      } else if (statusCode >= 400) {
        isError = true;
      } else if (statusCode === 0) {
        // ステータスコード0の詳細分析
        if (level === 'error' || message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) {
          isError = true;
        } else if (level === 'warn' || message.toLowerCase().includes('warning') || message.toLowerCase().includes('warn')) {
          isWarning = true;
        } else {
          // メッセージ内容で判定
          const msgLower = message.toLowerCase();
          if (msgLower.includes('success') || msgLower.includes('completed') || msgLower.includes('sent successfully')) {
            isSuccess = true;
          } else if (msgLower.includes('skipped') || msgLower.includes('not peak time')) {
            isWarning = true; // スキップは警告として扱う
          } else {
            // デフォルトは成功として扱う（正常終了の可能性が高い）
            isSuccess = true;
          }
        }
      }
      
      // レベルベースの判定（ステータスコードより優先）
      if (level === 'error') {
        isError = true;
        isSuccess = false;
      } else if (level === 'warn') {
        isWarning = true;
      }
      
      // カウント
      if (isSuccess) {
        jobAnalysis.success++;
        analysis.success++;
      } else if (isError) {
        jobAnalysis.errors++;
        analysis.errors++;
        
        // エラーメッセージを記録
        const errorMsg = message.substring(0, 500);
        if (errorMsg && !jobAnalysis.errorMessages.includes(errorMsg)) {
          jobAnalysis.errorMessages.push(errorMsg);
        }
        
        // エラータイプを分類
        let errorType = 'other';
        if (message.includes('SyntaxError')) {
          errorType = 'SyntaxError';
          errorPatterns.SyntaxError.push({ job: jobName, message: errorMsg, timestamp: timeUTC });
        } else if (message.includes('TypeError')) {
          errorType = 'TypeError';
          errorPatterns.TypeError.push({ job: jobName, message: errorMsg, timestamp: timeUTC });
        } else if (message.includes('ReferenceError')) {
          errorType = 'ReferenceError';
          errorPatterns.ReferenceError.push({ job: jobName, message: errorMsg, timestamp: timeUTC });
        } else if (message.includes('403') || message.includes('Forbidden')) {
          errorType = '403';
          errorPatterns['403'].push({ job: jobName, message: errorMsg, timestamp: timeUTC });
        } else if (message.includes('404') || message.includes('Not Found')) {
          errorType = '404';
          errorPatterns['404'].push({ job: jobName, message: errorMsg, timestamp: timeUTC });
        } else if (statusCode === 500 || message.includes('500')) {
          errorType = '500';
          errorPatterns['500'].push({ job: jobName, message: errorMsg, timestamp: timeUTC });
        } else if (message.includes('timeout') || message.includes('Timeout')) {
          errorType = 'timeout';
          errorPatterns.timeout.push({ job: jobName, message: errorMsg, timestamp: timeUTC });
        } else if (message.includes('rate limit') || message.includes('Rate limit') || message.includes('429')) {
          errorType = 'rate_limit';
          errorPatterns.rate_limit.push({ job: jobName, message: errorMsg, timestamp: timeUTC });
        } else if (message.includes('network') || message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
          errorType = 'network';
          errorPatterns.network.push({ job: jobName, message: errorMsg, timestamp: timeUTC });
        } else {
          errorPatterns.other.push({ job: jobName, message: errorMsg, timestamp: timeUTC });
        }
        
        if (!jobAnalysis.errorTypes[errorType]) {
          jobAnalysis.errorTypes[errorType] = 0;
        }
        jobAnalysis.errorTypes[errorType]++;
        
        // ブロッキングエラーを特定
        if (statusCode === 500 || errorType === 'SyntaxError' || errorType === 'TypeError' || errorType === 'ReferenceError') {
          jobAnalysis.blockingErrors.push({
            statusCode,
            errorType,
            message: errorMsg,
            timestamp: timeUTC,
          });
        }
      } else if (isWarning) {
        jobAnalysis.warnings++;
        analysis.warnings++;
      }
      
      // パフォーマンス問題の検出（30秒以上）
      if (duration > 30000) {
        jobAnalysis.performanceIssues.push({
          duration,
          timestamp: timeUTC,
          message: message.substring(0, 100),
        });
      }
    });
    
    // 成功率とエラー率を計算
    jobAnalysis.successRate = (jobAnalysis.success / jobAnalysis.count * 100);
    jobAnalysis.errorRate = (jobAnalysis.errors / jobAnalysis.count * 100);
    
    // 平均実行時間を計算
    if (jobAnalysis.durations.length > 0) {
      jobAnalysis.avgDuration = jobAnalysis.durations.reduce((a, b) => a + b, 0) / jobAnalysis.durations.length;
      jobAnalysis.maxDuration = Math.max(...jobAnalysis.durations);
      jobAnalysis.minDuration = Math.min(...jobAnalysis.durations);
    }
    
    analysis.byJob[jobName] = jobAnalysis;
    
    // 重要な問題を検出
    if (jobAnalysis.errors > 0) {
      analysis.criticalIssues.push({
        job: jobName,
        errorCount: jobAnalysis.errors,
        errorRate: jobAnalysis.errorRate.toFixed(1) + '%',
        errors: jobAnalysis.errorMessages.slice(0, 5),
        blockingErrors: jobAnalysis.blockingErrors,
        errorTypes: jobAnalysis.errorTypes,
      });
    }
    
    // ブロッキングエラーを記録
    if (jobAnalysis.blockingErrors.length > 0) {
      analysis.blockingIssues.push({
        job: jobName,
        blockingErrors: jobAnalysis.blockingErrors,
      });
    }
    
    // パフォーマンス問題を記録
    if (jobAnalysis.performanceIssues.length > 0) {
      analysis.performanceIssues.push({
        job: jobName,
        performanceIssues: jobAnalysis.performanceIssues,
        avgDuration: jobAnalysis.avgDuration,
        maxDuration: jobAnalysis.maxDuration,
      });
    }
  });
  
  // 時間範囲を計算
  if (analysis.timeRange.start && analysis.timeRange.end) {
    analysis.timeRange.duration = analysis.timeRange.end - analysis.timeRange.start;
  }
  
  // エラーパターンを記録
  analysis.errorPatterns = errorPatterns;
  
  // 結果を表示
  console.log('\n📈 Cron Jobs実行結果サマリー（高精度分析）\n');
  console.log('-'.repeat(80));
  console.log(`総実行数: ${analysis.total}`);
  console.log(`成功: ${analysis.success} (${(analysis.success / analysis.total * 100).toFixed(2)}%)`);
  console.log(`エラー: ${analysis.errors} (${(analysis.errors / analysis.total * 100).toFixed(2)}%)`);
  console.log(`警告: ${analysis.warnings} (${(analysis.warnings / analysis.total * 100).toFixed(2)}%)`);
  
  if (analysis.timeRange.duration) {
    const durationMinutes = Math.round(analysis.timeRange.duration / 1000 / 60);
    console.log(`実行時間範囲: ${durationMinutes}分`);
  }
  console.log('-'.repeat(80));
  
  // エラーパターン分析
  console.log('\n\n🔍 エラーパターン分析\n');
  console.log('='.repeat(80));
  Object.keys(errorPatterns).forEach(pattern => {
    if (errorPatterns[pattern].length > 0) {
      console.log(`\n${pattern}: ${errorPatterns[pattern].length}件`);
      const jobs = [...new Set(errorPatterns[pattern].map(e => e.job))];
      console.log(`  影響を受けたCron Jobs: ${jobs.join(', ')}`);
      if (errorPatterns[pattern].length <= 3) {
        errorPatterns[pattern].forEach((err, idx) => {
          console.log(`  [${idx + 1}] ${err.job}: ${err.message.substring(0, 150)}`);
        });
      }
    }
  });
  console.log('='.repeat(80));
  
  // ブロッキングエラーを最優先で表示
  if (analysis.blockingIssues.length > 0) {
    console.log('\n\n🚨🚨🚨 緊急: ブロッキングエラー 🚨🚨🚨\n');
    console.log('='.repeat(80));
    analysis.blockingIssues.forEach(issue => {
      console.log(`\n❌ ${issue.job} - 完全に停止しています！`);
      issue.blockingErrors.forEach((err, idx) => {
        console.log(`\n   [${idx + 1}] エラー詳細:`);
        console.log(`   エラータイプ: ${err.errorType}`);
        console.log(`   ステータスコード: ${err.statusCode}`);
        console.log(`   エラーメッセージ: ${err.message.substring(0, 300)}`);
        if (err.timestamp) {
          const date = new Date(err.timestamp);
          console.log(`   発生時刻: ${date.toISOString()}`);
        }
      });
    });
    console.log('\n' + '='.repeat(80));
  } else {
    console.log('\n\n✅ ブロッキングエラーなし！\n');
    console.log('='.repeat(80));
  }
  
  // 各Cron Jobの詳細
  console.log('\n\n📋 各Cron Jobの詳細分析\n');
  console.log('-'.repeat(80));
  
  const criticalJobs = [
    'x-post-free-report',
    'x-quote-repost',
    'lead-discovery',
    'lead-discovery/process',
    'vsl1-post',
    'vsl2-free-users',
  ];
  
  // 重要Cron Jobsを優先表示
  criticalJobs.forEach(jobName => {
    const job = analysis.byJob[jobName];
    if (!job || job.count === 0) {
      console.log(`\n⚠️ ${jobName}: 実行ログが見つかりません`);
      return;
    }
    
    const status = job.errorRate === 0 ? '✅' : '❌';
    console.log(`\n${status} ${jobName}`);
    console.log(`   実行回数: ${job.count}`);
    console.log(`   成功: ${job.success} (${job.successRate.toFixed(2)}%)`);
    console.log(`   エラー: ${job.errors} (${job.errorRate.toFixed(2)}%)`);
    console.log(`   警告: ${job.warnings}`);
    console.log(`   ステータスコード分布: ${JSON.stringify(job.statusCodes)}`);
    
    if (Object.keys(job.errorTypes).length > 0) {
      console.log(`   エラータイプ: ${JSON.stringify(job.errorTypes)}`);
    }
    
    if (job.avgDuration) {
      console.log(`   平均実行時間: ${job.avgDuration.toFixed(0)}ms`);
      console.log(`   最大実行時間: ${job.maxDuration.toFixed(0)}ms`);
      console.log(`   最小実行時間: ${job.minDuration.toFixed(0)}ms`);
    }
    
    if (job.errorMessages.length > 0) {
      console.log(`   ⚠️ エラーメッセージ:`);
      job.errorMessages.slice(0, 3).forEach((msg, idx) => {
        console.log(`      [${idx + 1}] ${msg.substring(0, 200)}`);
      });
    }
    
    if (job.performanceIssues.length > 0) {
      console.log(`   ⏱️ パフォーマンス問題: ${job.performanceIssues.length}件（30秒以上）`);
    }
  });
  
  // その他のCron Jobs
  console.log('\n\n📋 その他のCron Jobs\n');
  console.log('-'.repeat(80));
  Object.keys(analysis.byJob).forEach(jobName => {
    if (criticalJobs.includes(jobName)) return;
    
    const job = analysis.byJob[jobName];
    const status = job.errorRate === 0 ? '✅' : '❌';
    console.log(`\n${status} ${jobName}: ${job.success}/${job.count} (成功率: ${job.successRate.toFixed(2)}%, エラー率: ${job.errorRate.toFixed(2)}%)`);
    
    if (job.errorMessages.length > 0) {
      console.log(`   ⚠️ エラー: ${job.errorMessages[0].substring(0, 100)}...`);
    }
  });
  
  // 月間$1.8M目標達成への評価
  console.log('\n\n🎯 月間$1.8M目標達成への道筋評価（高精度分析）\n');
  console.log('='.repeat(80));
  
  let criticalIssuesCount = 0;
  let allCriticalJobsRunning = true;
  
  criticalJobs.forEach(jobName => {
    const job = analysis.byJob[jobName];
    if (!job || job.count === 0) {
      console.log(`⚠️ ${jobName}: 実行ログが見つかりません`);
      allCriticalJobsRunning = false;
      return;
    }
    
    if (job.errorRate > 0) {
      console.log(`❌ ${jobName}: エラー率 ${job.errorRate.toFixed(2)}% (${job.errors}/${job.count})`);
      criticalIssuesCount++;
    } else {
      console.log(`✅ ${jobName}: 正常動作 (${job.success}/${job.count}, 成功率: ${job.successRate.toFixed(2)}%)`);
    }
  });
  
  console.log('\n' + '-'.repeat(80));
  
  // 総合評価
  const overallHealth = (analysis.success / analysis.total) * 100;
  const criticalHealth = criticalIssuesCount === 0 && allCriticalJobsRunning;
  
  console.log('\n📊 総合評価\n');
  console.log(`全体成功率: ${overallHealth.toFixed(2)}%`);
  console.log(`全体エラー率: ${(analysis.errors / analysis.total * 100).toFixed(2)}%`);
  console.log(`重要Cron Jobs: ${criticalHealth ? '✅ すべて正常' : '❌ 問題あり'}`);
  
  if (overallHealth >= 95 && criticalHealth) {
    console.log('\n✅ 評価: 月間$1.8M目標達成への道筋は明確です！');
    console.log('   - すべての重要Cron Jobsが正常に動作しています');
    console.log('   - エラー率が許容範囲内です');
  } else if (overallHealth >= 90 && criticalHealth) {
    console.log('\n✅ 評価: ほぼ完璧です。わずかな改善で目標達成可能です');
  } else if (overallHealth >= 80) {
    console.log('\n⚠️ 評価: 良好ですが、一部改善が必要です');
    console.log('   - いくつかのCron Jobsでエラーが発生しています');
  } else {
    console.log('\n❌ 評価: 重大な問題があります - 早急な修正が必要です！');
  }
  
  console.log('\n' + '='.repeat(80));
  
  // 詳細レポートを保存
  const reportPath = path.join(__dirname, '../docs/CRON_JOBS_PRECISE_ANALYSIS.md');
  const reportContent = generateDetailedReport(analysis, criticalJobs);
  
  fs.writeFileSync(reportPath, reportContent, 'utf-8');
  console.log(`\n📄 詳細レポートを保存しました: ${reportPath}`);
}

function generateDetailedReport(analysis, criticalJobs) {
  const overallHealth = (analysis.success / analysis.total) * 100;
  let criticalIssuesCount = 0;
  let allCriticalJobsRunning = true;
  
  criticalJobs.forEach(jobName => {
    const job = analysis.byJob[jobName];
    if (!job || job.count === 0) {
      allCriticalJobsRunning = false;
      return;
    }
    if (job.errorRate > 0) {
      criticalIssuesCount++;
    }
  });
  
  const criticalHealth = criticalIssuesCount === 0 && allCriticalJobsRunning;
  
  return `# 高精度Cron Jobs分析レポート

生成日時: ${new Date().toISOString()}

## 📊 分析結果サマリー

- **総実行数**: ${analysis.total}
- **成功**: ${analysis.success} (${(analysis.success / analysis.total * 100).toFixed(2)}%)
- **エラー**: ${analysis.errors} (${(analysis.errors / analysis.total * 100).toFixed(2)}%)
- **警告**: ${analysis.warnings} (${(analysis.warnings / analysis.total * 100).toFixed(2)}%)
- **全体成功率**: ${overallHealth.toFixed(2)}%

${analysis.timeRange.duration ? `
- **実行時間範囲**: ${Math.round(analysis.timeRange.duration / 1000 / 60)}分
- **開始時刻**: ${new Date(analysis.timeRange.start).toISOString()}
- **終了時刻**: ${new Date(analysis.timeRange.end).toISOString()}
` : ''}

---

## 🔍 エラーパターン分析

${Object.keys(analysis.errorPatterns).map(pattern => {
  const errors = analysis.errorPatterns[pattern];
  if (errors.length === 0) return '';
  const jobs = [...new Set(errors.map(e => e.job))];
  return `
### ${pattern}: ${errors.length}件
- **影響を受けたCron Jobs**: ${jobs.join(', ')}
${errors.length <= 5 ? errors.map((err, idx) => `
**エラー ${idx + 1}:**
- Cron Job: ${err.job}
- メッセージ: \`${err.message.substring(0, 200)}\`
- 時刻: ${err.timestamp ? new Date(err.timestamp).toISOString() : 'N/A'}
`).join('\n') : `- 詳細はコンソール出力を参照してください`}
`;
}).filter(Boolean).join('\n')}

---

## 🚨 ブロッキングエラー

${analysis.blockingIssues.length > 0 ? analysis.blockingIssues.map(issue => `
### ❌ ${issue.job}
${issue.blockingErrors.map((err, idx) => `
**エラー ${idx + 1}:**
- エラータイプ: ${err.errorType}
- ステータスコード: ${err.statusCode}
- エラーメッセージ: \`${err.message}\`
- 発生時刻: ${err.timestamp ? new Date(err.timestamp).toISOString() : 'N/A'}
`).join('\n')}
`).join('\n') : '**なし** - すべてのブロッキングエラーが解消されました！'}

---

## 📋 各Cron Jobの詳細分析

${Object.keys(analysis.byJob).map(jobName => {
  const job = analysis.byJob[jobName];
  return `
### ${jobName}
- **実行回数**: ${job.count}
- **成功**: ${job.success} (${job.successRate.toFixed(2)}%)
- **エラー**: ${job.errors} (${job.errorRate.toFixed(2)}%)
- **警告**: ${job.warnings}
- **ステータスコード分布**: ${JSON.stringify(job.statusCodes)}
${Object.keys(job.errorTypes).length > 0 ? `
- **エラータイプ**: ${JSON.stringify(job.errorTypes)}
` : ''}
${job.avgDuration ? `
- **平均実行時間**: ${job.avgDuration.toFixed(0)}ms
- **最大実行時間**: ${job.maxDuration.toFixed(0)}ms
- **最小実行時間**: ${job.minDuration.toFixed(0)}ms
` : ''}
${job.errorMessages.length > 0 ? `
**エラーメッセージ:**
${job.errorMessages.map((msg, idx) => `${idx + 1}. ${msg}`).join('\n')}
` : ''}
${job.performanceIssues.length > 0 ? `
**パフォーマンス問題**: ${job.performanceIssues.length}件（30秒以上）
` : ''}
`;
}).join('\n')}

---

## 🎯 重要Cron Jobsの状態

${criticalJobs.map(jobName => {
  const job = analysis.byJob[jobName];
  if (!job || job.count === 0) {
    return `- ⚠️ ${jobName}: 実行ログが見つかりません`;
  }
  return `- ${job.errorRate === 0 ? '✅' : '❌'} ${jobName}: エラー率 ${job.errorRate.toFixed(2)}% (${job.success}/${job.count}成功)`;
}).join('\n')}

---

## 🎯 月間$1.8M目標達成への評価

${overallHealth >= 95 && criticalHealth ? `
✅ **評価: 月間$1.8M目標達成への道筋は明確です！**

- すべての重要Cron Jobsが正常に動作しています
- エラー率が許容範囲内です
- X投稿、リード発掘、VSL配信が機能しています
` : overallHealth >= 90 && criticalHealth ? `
✅ **評価: ほぼ完璧です。わずかな改善で目標達成可能です**

- すべての重要Cron Jobsが正常に動作しています
- わずかなエラーがありますが、許容範囲内です
` : overallHealth >= 80 ? `
⚠️ **評価: 良好ですが、一部改善が必要です**

- いくつかのCron Jobsでエラーが発生しています
- エラーを修正することで目標達成への道筋が明確になります
` : `
❌ **評価: 重大な問題があります**

- 複数のCron Jobsでエラーが発生しています
- 早急な修正が必要です
`}

---

**生成日時**: ${new Date().toISOString()}
`;
}

if (require.main === module) {
  analyzeLogsPrecise();
}

module.exports = { analyzeLogsPrecise };
