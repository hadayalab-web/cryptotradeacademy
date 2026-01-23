// scripts/analyze-latest-deployment-logs.js
// 最新デプロイ後の17個のCron Jobsテスト結果を分析

const fs = require('fs');
const path = require('path');

const LOG_FILE = process.argv[2] || 'c:\\Users\\chiba\\Downloads\\logs_result (3).json';

function analyzeLatestDeploymentLogs() {
  console.log('🔍 最新デプロイ後のCron Jobsテスト結果分析\n');
  console.log('='.repeat(80));
  
  if (!fs.existsSync(LOG_FILE)) {
    console.error(`❌ ログファイルが見つかりません: ${LOG_FILE}`);
    return;
  }
  
  console.log(`📁 ログファイル: ${LOG_FILE}\n`);
  
  // ログファイルを読み込み
  let logs;
  try {
    const logContent = fs.readFileSync(LOG_FILE, 'utf-8');
    logs = JSON.parse(logContent);
    console.log(`✅ ログファイルを読み込みました`);
    console.log(`📊 総ログエントリ数: ${logs.length}件\n`);
  } catch (error) {
    console.error(`❌ ログファイルの読み込みに失敗: ${error.message}`);
    return;
  }
  
  if (!Array.isArray(logs)) {
    console.error('❌ ログファイルの形式が不正です（配列である必要があります）');
    return;
  }
  
  // パスを正規化（ドメイン部分を除去）
  function normalizePath(fullPath) {
    if (!fullPath) return 'unknown';
    const match = fullPath.match(/\/api\/(.+)$/);
    return match ? `/api/${match[1]}` : fullPath;
  }
  
  // Cron Jobsの定義（vercel.jsonから）
  const cronJobs = [
    { path: '/api/cron', name: 'cron', schedule: '*/15 * * * *' },
    { path: '/api/weekly-report', name: 'weekly-report', schedule: '0 0 * * 0' },
    { path: '/api/vsl1-post', name: 'vsl1-post', schedule: '0 14,20 * * *' },
    { path: '/api/vsl2-free-users', name: 'vsl2-free-users', schedule: '0 * * * *' },
    { path: '/api/vsl1-reminder', name: 'vsl1-reminder', schedule: '0 */12 * * *' },
    { path: '/api/vsl2-last-call', name: 'vsl2-last-call', schedule: '0 * * * *' },
    { path: '/api/promo-stock-monitor', name: 'promo-stock-monitor', schedule: '*/15 * * * *' },
    { path: '/api/monthly-engagement-report', name: 'monthly-engagement-report', schedule: '0 0 1 * *' },
    { path: '/api/lead-discovery', name: 'lead-discovery', schedule: '0 */2 * * *' },
    { path: '/api/lead-discovery/process', name: 'lead-discovery-process', schedule: '*/5 * * * *' },
    { path: '/api/lead-discovery/cvr-dashboard', name: 'lead-discovery-cvr-dashboard', schedule: '0 0 * * 0' },
    { path: '/api/lead-discovery/sync-purchases', name: 'lead-discovery-sync-purchases', schedule: '0 */6 * * *' },
    { path: '/api/lead-discovery-daily-report', name: 'lead-discovery-daily-report', schedule: '0 9 * * *' },
    { path: '/api/lead-discovery-weekly-report', name: 'lead-discovery-weekly-report', schedule: '0 9 * * 1' },
    { path: '/api/x-post-free-report', name: 'x-post-free-report', schedule: '5 6,18 * * *' },
    { path: '/api/x-quote-repost', name: 'x-quote-repost', schedule: '0 12-22 * * *' },
    { path: '/api/x-quote-repost-metrics', name: 'x-quote-repost-metrics', schedule: '0 * * * *' },
  ];
  
  // 各Cron Jobの実行状況を分析
  const jobStats = {};
  
  cronJobs.forEach(job => {
    const jobLogs = logs.filter(log => {
      const logPath = normalizePath(log.requestPath || log.path);
      return logPath === job.path;
    });
    
    const executions = jobLogs.length;
    const errors = jobLogs.filter(log => {
      const level = log.level || '';
      const status = log.responseStatusCode || '';
      return level === 'error' || (status && parseInt(status) >= 400);
    }).length;
    const successes = executions - errors;
    
    // エラーメッセージを収集
    const errorMessages = jobLogs
      .filter(log => {
        const level = log.level || '';
        const status = log.responseStatusCode || '';
        return level === 'error' || (status && parseInt(status) >= 400);
      })
      .map(log => {
        const msg = log.message || '';
        const status = log.responseStatusCode || '';
        return `${status ? `[${status}] ` : ''}${msg.substring(0, 100)}`;
      })
      .slice(0, 5); // 最初の5件のみ
    
    jobStats[job.path] = {
      name: job.name,
      schedule: job.schedule,
      executions,
      successes,
      errors,
      errorRate: executions > 0 ? ((errors / executions) * 100).toFixed(2) : '0.00',
      errorMessages,
      status: errors === 0 ? '✅' : errors < executions * 0.1 ? '⚠️' : '❌',
    };
  });
  
  // 結果を表示
  console.log('📊 Cron Jobs実行状況サマリー\n');
  console.log('='.repeat(80));
  
  const sortedJobs = Object.entries(jobStats).sort((a, b) => {
    // エラー率でソート（エラーが多い順）
    return parseFloat(b[1].errorRate) - parseFloat(a[1].errorRate);
  });
  
  sortedJobs.forEach(([path, stats]) => {
    console.log(`\n${stats.status} ${stats.name}`);
    console.log(`   パス: ${path}`);
    console.log(`   スケジュール: ${stats.schedule}`);
    console.log(`   実行数: ${stats.executions}回`);
    console.log(`   成功: ${stats.successes}回`);
    console.log(`   エラー: ${stats.errors}回`);
    console.log(`   エラー率: ${stats.errorRate}%`);
    
    if (stats.errorMessages.length > 0) {
      console.log(`   エラーメッセージ（最初の${stats.errorMessages.length}件）:`);
      stats.errorMessages.forEach((msg, idx) => {
        console.log(`     ${idx + 1}. ${msg}`);
      });
    }
  });
  
  // 全体統計
  console.log('\n' + '='.repeat(80));
  console.log('\n📈 全体統計\n');
  
  const totalExecutions = Object.values(jobStats).reduce((sum, s) => sum + s.executions, 0);
  const totalSuccesses = Object.values(jobStats).reduce((sum, s) => sum + s.successes, 0);
  const totalErrors = Object.values(jobStats).reduce((sum, s) => sum + s.errors, 0);
  const totalErrorRate = totalExecutions > 0 ? ((totalErrors / totalExecutions) * 100).toFixed(2) : '0.00';
  
  const executedJobs = Object.values(jobStats).filter(s => s.executions > 0).length;
  const perfectJobs = Object.values(jobStats).filter(s => s.errors === 0 && s.executions > 0).length;
  const errorJobs = Object.values(jobStats).filter(s => s.errors > 0).length;
  
  console.log(`総Cron Jobs数: ${cronJobs.length}個`);
  console.log(`実行されたCron Jobs数: ${executedJobs}個`);
  console.log(`エラー0%のCron Jobs数: ${perfectJobs}個`);
  console.log(`エラーが発生したCron Jobs数: ${errorJobs}個`);
  console.log(`\n総実行数: ${totalExecutions}回`);
  console.log(`総成功数: ${totalSuccesses}回`);
  console.log(`総エラー数: ${totalErrors}回`);
  console.log(`総エラー率: ${totalErrorRate}%`);
  
  // エラー0%達成状況
  console.log('\n' + '='.repeat(80));
  console.log('\n🎯 エラー0%達成状況\n');
  
  if (perfectJobs === executedJobs && executedJobs === cronJobs.length) {
    console.log('✅ すべてのCron Jobsがエラー0%を達成しています！');
  } else if (perfectJobs === executedJobs) {
    console.log(`✅ 実行されたすべてのCron Jobs（${executedJobs}個）がエラー0%を達成しています！`);
    console.log(`⚠️ 未実行のCron Jobs: ${cronJobs.length - executedJobs}個`);
  } else {
    console.log(`⚠️ エラー0%を達成していないCron Jobs: ${errorJobs}個`);
    console.log(`\nエラーが発生しているCron Jobs:`);
    sortedJobs
      .filter(([_, stats]) => stats.errors > 0)
      .forEach(([path, stats]) => {
        console.log(`  ❌ ${stats.name} (${path}): ${stats.errors}エラー / ${stats.executions}実行 (${stats.errorRate}%)`);
      });
  }
  
  // 新しく追加したCron Jobの状況
  console.log('\n' + '='.repeat(80));
  console.log('\n🆕 新しく追加したCron Jobの状況\n');
  
  const newJob = jobStats['/api/x-quote-repost-metrics'];
  if (newJob) {
    console.log(`✅ x-quote-repost-metrics`);
    console.log(`   実行数: ${newJob.executions}回`);
    console.log(`   成功: ${newJob.successes}回`);
    console.log(`   エラー: ${newJob.errors}回`);
    console.log(`   エラー率: ${newJob.errorRate}%`);
    if (newJob.errorMessages.length > 0) {
      console.log(`   エラーメッセージ:`);
      newJob.errorMessages.forEach((msg, idx) => {
        console.log(`     ${idx + 1}. ${msg}`);
      });
    }
  } else {
    console.log('⚠️ x-quote-repost-metricsのログが見つかりませんでした');
  }
  
  console.log('\n' + '='.repeat(80));
}

// 実行
analyzeLatestDeploymentLogs();
