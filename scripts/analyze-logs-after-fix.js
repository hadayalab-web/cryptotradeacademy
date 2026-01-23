// scripts/analyze-logs-after-fix.js
// 修正後のCron Jobsログ分析（緊急修正の効果確認）

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads', 'logs_result (1).json');

function analyzeLogsAfterFix() {
  console.log('🔍 修正後のCron Jobsログ分析開始\n');
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
  
  // Cron Job別に分類
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
  
  // ログを分類
  logs.forEach(log => {
    const requestPath = log.requestPath || '';
    const functionPath = log.function || '';
    
    // パスからCron Job名を抽出
    let jobName = null;
    if (requestPath.includes('/api/')) {
      const match = requestPath.match(/\/api\/([^\/]+)/);
      if (match) {
        jobName = match[1];
      }
    } else if (functionPath.includes('/api/')) {
      const match = functionPath.match(/\/api\/([^\/]+)/);
      if (match) {
        jobName = match[1];
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
  
  // 各Cron Jobの実行結果を分析
  const analysis = {
    total: logs.length,
    success: 0,
    errors: 0,
    byJob: {},
    criticalIssues: [],
    blockingIssues: [],
    fixedIssues: [],
  };
  
  Object.keys(cronJobs).forEach(jobName => {
    if (jobName === '_unknown') return;
    
    const jobLogs = cronJobs[jobName];
    if (jobLogs.length === 0) return;
    
    const jobAnalysis = {
      count: jobLogs.length,
      success: 0,
      errors: 0,
      errorMessages: [],
      statusCodes: {},
      lastExecution: null,
      blockingErrors: [],
    };
    
    jobLogs.forEach(log => {
      const statusCode = log.responseStatusCode || 0;
      const level = log.level || 'info';
      const message = log.message || '';
      
      // ステータスコード別にカウント
      if (!jobAnalysis.statusCodes[statusCode]) {
        jobAnalysis.statusCodes[statusCode] = 0;
      }
      jobAnalysis.statusCodes[statusCode]++;
      
      // 成功/エラー判定
      if (statusCode >= 200 && statusCode < 300) {
        jobAnalysis.success++;
        analysis.success++;
      } else if (statusCode >= 400 || level === 'error') {
        jobAnalysis.errors++;
        analysis.errors++;
        
        // エラーメッセージを記録
        const errorMsg = message.substring(0, 500);
        if (errorMsg && !jobAnalysis.errorMessages.includes(errorMsg)) {
          jobAnalysis.errorMessages.push(errorMsg);
        }
        
        // ブロッキングエラーを特定
        if (statusCode === 500 || message.includes('SyntaxError') || message.includes('TypeError') || message.includes('ReferenceError')) {
          jobAnalysis.blockingErrors.push({
            statusCode,
            message: errorMsg,
            timestamp: log.TimeUTC || log.timestampInMs,
          });
        }
      }
      
      // 最新の実行時刻を記録
      const timeUTC = log.TimeUTC || log.timestampInMs;
      if (timeUTC && (!jobAnalysis.lastExecution || timeUTC > jobAnalysis.lastExecution)) {
        jobAnalysis.lastExecution = timeUTC;
      }
    });
    
    analysis.byJob[jobName] = jobAnalysis;
    
    // 重要な問題を検出
    if (jobAnalysis.errors > 0) {
      analysis.criticalIssues.push({
        job: jobName,
        errorCount: jobAnalysis.errors,
        errorRate: (jobAnalysis.errors / jobAnalysis.count * 100).toFixed(1) + '%',
        errors: jobAnalysis.errorMessages.slice(0, 5),
        blockingErrors: jobAnalysis.blockingErrors,
      });
    }
    
    // ブロッキングエラーを記録
    if (jobAnalysis.blockingErrors.length > 0) {
      analysis.blockingIssues.push({
        job: jobName,
        blockingErrors: jobAnalysis.blockingErrors,
      });
    }
  });
  
  // 結果を表示
  console.log('\n📈 Cron Jobs実行結果サマリー（修正後）\n');
  console.log('-'.repeat(80));
  console.log(`総実行数: ${analysis.total}`);
  console.log(`成功: ${analysis.success} (${(analysis.success / analysis.total * 100).toFixed(1)}%)`);
  console.log(`エラー: ${analysis.errors} (${(analysis.errors / analysis.total * 100).toFixed(1)}%)`);
  console.log('-'.repeat(80));
  
  // 修正前後の比較
  console.log('\n\n📊 修正前後の比較\n');
  console.log('='.repeat(80));
  console.log('修正前（logs_result.json）:');
  console.log('  - x-quote-repost: エラー率 100.0% (3/3失敗) - SyntaxError');
  console.log('  - lead-discovery: エラー率 6.5% (6/92失敗) - 403エラー');
  console.log('  - 全体成功率: 58.9%');
  console.log('');
  console.log('修正後（logs_result (1).json）:');
  
  const criticalJobs = [
    'x-post-free-report',
    'x-quote-repost',
    'lead-discovery',
    'lead-discovery/process',
    'vsl1-post',
    'vsl2-free-users',
  ];
  
  criticalJobs.forEach(jobName => {
    const job = analysis.byJob[jobName];
    if (!job || job.count === 0) {
      console.log(`  - ${jobName}: 実行ログが見つかりません`);
      return;
    }
    
    const errorRate = (job.errors / job.count * 100);
    const status = errorRate === 0 ? '✅' : '❌';
    console.log(`  ${status} ${jobName}: エラー率 ${errorRate.toFixed(1)}% (${job.success}/${job.count}成功)`);
    
    // 修正が成功したか確認
    if (jobName === 'x-quote-repost' && errorRate === 0) {
      analysis.fixedIssues.push({
        job: jobName,
        before: '100.0%',
        after: '0.0%',
        status: '✅ 修正成功',
      });
    }
    if (jobName === 'lead-discovery' && errorRate < 6.5) {
      analysis.fixedIssues.push({
        job: jobName,
        before: '6.5%',
        after: `${errorRate.toFixed(1)}%`,
        status: errorRate === 0 ? '✅ 修正成功' : '⚠️ 改善',
      });
    }
  });
  
  const overallHealth = (analysis.success / analysis.total) * 100;
  console.log(`  - 全体成功率: ${overallHealth.toFixed(1)}%`);
  console.log('');
  
  // 修正結果の評価
  if (analysis.fixedIssues.length > 0) {
    console.log('✅ 修正が成功したCron Jobs:');
    analysis.fixedIssues.forEach(issue => {
      console.log(`   ${issue.job}: ${issue.before} → ${issue.after} ${issue.status}`);
    });
  }
  
  console.log('='.repeat(80));
  
  // ブロッキングエラーを最優先で表示
  if (analysis.blockingIssues.length > 0) {
    console.log('\n\n🚨🚨🚨 緊急: ブロッキングエラー 🚨🚨🚨\n');
    console.log('='.repeat(80));
    analysis.blockingIssues.forEach(issue => {
      console.log(`\n❌ ${issue.job} - まだ停止しています！`);
      issue.blockingErrors.forEach((err, idx) => {
        console.log(`\n   [${idx + 1}] エラー詳細:`);
        console.log(`   ステータスコード: ${err.statusCode}`);
        console.log(`   エラーメッセージ: ${err.message.substring(0, 300)}`);
      });
    });
    console.log('\n' + '='.repeat(80));
  } else {
    console.log('\n\n✅ ブロッキングエラーなし！\n');
    console.log('='.repeat(80));
  }
  
  // 各Cron Jobの詳細
  console.log('\n\n📋 各Cron Jobの詳細\n');
  console.log('-'.repeat(80));
  
  // 重要Cron Jobsを優先表示
  criticalJobs.forEach(jobName => {
    const job = analysis.byJob[jobName];
    if (!job || job.count === 0) {
      console.log(`\n⚠️ ${jobName}: 実行ログが見つかりません`);
      return;
    }
    
    const successRate = (job.success / job.count * 100).toFixed(1);
    const errorRate = (job.errors / job.count * 100).toFixed(1);
    
    const status = errorRate === '0.0' ? '✅' : '❌';
    console.log(`\n${status} ${jobName}`);
    console.log(`   実行回数: ${job.count}`);
    console.log(`   成功: ${job.success} (${successRate}%)`);
    console.log(`   エラー: ${job.errors} (${errorRate}%)`);
    console.log(`   ステータスコード: ${JSON.stringify(job.statusCodes)}`);
    
    if (job.errorMessages.length > 0) {
      console.log(`   ⚠️ エラーメッセージ:`);
      job.errorMessages.slice(0, 3).forEach((msg, idx) => {
        console.log(`      [${idx + 1}] ${msg.substring(0, 200)}`);
      });
    }
  });
  
  // その他のCron Jobs
  console.log('\n\n📋 その他のCron Jobs\n');
  console.log('-'.repeat(80));
  Object.keys(analysis.byJob).forEach(jobName => {
    if (criticalJobs.includes(jobName)) return;
    
    const job = analysis.byJob[jobName];
    const successRate = (job.success / job.count * 100).toFixed(1);
    const errorRate = (job.errors / job.count * 100).toFixed(1);
    
    const status = errorRate === '0.0' ? '✅' : '❌';
    console.log(`\n${status} ${jobName}: ${job.success}/${job.count} (エラー率: ${errorRate}%)`);
    
    if (job.errorMessages.length > 0) {
      console.log(`   ⚠️ エラー: ${job.errorMessages[0].substring(0, 100)}...`);
    }
  });
  
  // 月間$1.8M目標達成への評価
  console.log('\n\n🎯 月間$1.8M目標達成への道筋評価（修正後）\n');
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
    
    const errorRate = (job.errors / job.count * 100);
    if (errorRate > 0) {
      console.log(`❌ ${jobName}: エラー率 ${errorRate.toFixed(1)}%`);
      criticalIssuesCount++;
    } else {
      console.log(`✅ ${jobName}: 正常動作 (${job.success}/${job.count})`);
    }
  });
  
  console.log('\n' + '-'.repeat(80));
  
  // 総合評価
  const criticalHealth = criticalIssuesCount === 0 && allCriticalJobsRunning;
  
  console.log('\n📊 総合評価\n');
  console.log(`全体成功率: ${overallHealth.toFixed(1)}%`);
  console.log(`重要Cron Jobs: ${criticalHealth ? '✅ すべて正常' : '❌ 問題あり'}`);
  
  if (overallHealth >= 90 && criticalHealth) {
    console.log('\n✅ 評価: 月間$1.8M目標達成への道筋は明確です！');
    console.log('   - すべての重要Cron Jobsが正常に動作しています');
    console.log('   - 緊急修正が成功しました');
  } else if (overallHealth >= 70) {
    console.log('\n⚠️ 評価: 一部改善が必要です');
    console.log('   - いくつかのCron Jobsでエラーが発生しています');
  } else {
    console.log('\n❌ 評価: 重大な問題があります - 早急な修正が必要です！');
  }
  
  console.log('\n' + '='.repeat(80));
  
  // 詳細レポートを保存
  const reportPath = path.join(__dirname, '../docs/CRON_JOBS_AFTER_FIX_ANALYSIS.md');
  const reportContent = `# 修正後のCron Jobs分析レポート

生成日時: ${new Date().toISOString()}

## 📊 分析結果サマリー

- **総実行数**: ${analysis.total}
- **成功**: ${analysis.success} (${(analysis.success / analysis.total * 100).toFixed(1)}%)
- **エラー**: ${analysis.errors} (${(analysis.errors / analysis.total * 100).toFixed(1)}%)
- **全体成功率**: ${overallHealth.toFixed(1)}%

---

## 📊 修正前後の比較

### 修正前（logs_result.json）
- **x-quote-repost**: エラー率 100.0% (3/3失敗) - SyntaxError
- **lead-discovery**: エラー率 6.5% (6/92失敗) - 403エラー
- **全体成功率**: 58.9%

### 修正後（logs_result (1).json）
${criticalJobs.map(jobName => {
  const job = analysis.byJob[jobName];
  if (!job || job.count === 0) {
    return `- **${jobName}**: 実行ログが見つかりません`;
  }
  const errorRate = (job.errors / job.count * 100);
  return `- **${jobName}**: エラー率 ${errorRate.toFixed(1)}% (${job.success}/${job.count}成功)`;
}).join('\n')}
- **全体成功率**: ${overallHealth.toFixed(1)}%

---

## ✅ 修正結果

${analysis.fixedIssues.length > 0 ? analysis.fixedIssues.map(issue => `
### ${issue.job}
- 修正前: ${issue.before} エラー率
- 修正後: ${issue.after} エラー率
- ステータス: ${issue.status}
`).join('\n') : '修正が必要だったCron Jobsはすべて正常に動作しています。'}

---

## 🚨 ブロッキングエラー

${analysis.blockingIssues.length > 0 ? analysis.blockingIssues.map(issue => `
### ❌ ${issue.job}
${issue.blockingErrors.map((err, idx) => `
**エラー ${idx + 1}:**
- ステータスコード: ${err.statusCode}
- エラーメッセージ: \`${err.message}\`
`).join('\n')}
`).join('\n') : '**なし** - すべてのブロッキングエラーが解消されました！'}

---

## 📋 各Cron Jobの詳細

${Object.keys(analysis.byJob).map(jobName => {
  const job = analysis.byJob[jobName];
  const successRate = (job.success / job.count * 100).toFixed(1);
  const errorRate = (job.errors / job.count * 100).toFixed(1);
  return `
### ${jobName}
- 実行回数: ${job.count}
- 成功: ${job.success} (${successRate}%)
- エラー: ${job.errors} (${errorRate}%)
- ステータスコード: ${JSON.stringify(job.statusCodes)}
${job.errorMessages.length > 0 ? `
**エラーメッセージ:**
${job.errorMessages.map((msg, idx) => `${idx + 1}. ${msg}`).join('\n')}
` : ''}
`;
}).join('\n')}

---

## 🎯 月間$1.8M目標達成への評価

${overallHealth >= 90 && criticalHealth ? `
✅ **評価: 月間$1.8M目標達成への道筋は明確です！**

- すべての重要Cron Jobsが正常に動作しています
- 緊急修正が成功しました
- X投稿、リード発掘、VSL配信が機能しています
` : overallHealth >= 70 ? `
⚠️ **評価: 一部改善が必要です**

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

  fs.writeFileSync(reportPath, reportContent, 'utf-8');
  console.log(`\n📄 詳細レポートを保存しました: ${reportPath}`);
}

if (require.main === module) {
  analyzeLogsAfterFix();
}

module.exports = { analyzeLogsAfterFix };
