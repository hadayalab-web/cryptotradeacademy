// scripts/analyze-cron-logs.js
// 16個のCron Jobsの実行ログを分析し、月間$1.8M目標達成への道筋を評価

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads', 'logs_result (3).json');

function analyzeCronLogs() {
  console.log('📊 Cron Jobs実行ログ分析開始\n');
  console.log('='.repeat(80));
  
  // ログファイルを読み込み
  let logs;
  try {
    const logContent = fs.readFileSync(LOG_FILE, 'utf-8');
    logs = JSON.parse(logContent);
  } catch (error) {
    console.error('❌ ログファイルの読み込みに失敗:', error.message);
    return;
  }
  
  if (!Array.isArray(logs)) {
    console.error('❌ ログファイルの形式が不正です（配列である必要があります）');
    return;
  }
  
  console.log(`\n✅ ログエントリ数: ${logs.length}件\n`);
  
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
      // 未分類のログ
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
    recommendations: [],
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
        if (message && !jobAnalysis.errorMessages.includes(message)) {
          jobAnalysis.errorMessages.push(message.substring(0, 200));
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
        errors: jobAnalysis.errorMessages.slice(0, 3),
      });
    }
  });
  
  // 分析結果を表示
  console.log('\n📈 Cron Jobs実行結果サマリー\n');
  console.log('-'.repeat(80));
  console.log(`総実行数: ${analysis.total}`);
  console.log(`成功: ${analysis.success} (${(analysis.success / analysis.total * 100).toFixed(1)}%)`);
  console.log(`エラー: ${analysis.errors} (${(analysis.errors / analysis.total * 100).toFixed(1)}%)`);
  console.log('-'.repeat(80));
  
  console.log('\n📋 各Cron Jobの詳細\n');
  Object.keys(analysis.byJob).forEach(jobName => {
    const job = analysis.byJob[jobName];
    const successRate = (job.success / job.count * 100).toFixed(1);
    const errorRate = (job.errors / job.count * 100).toFixed(1);
    
    console.log(`\n🔹 ${jobName}`);
    console.log(`   実行回数: ${job.count}`);
    console.log(`   成功: ${job.success} (${successRate}%)`);
    console.log(`   エラー: ${job.errors} (${errorRate}%)`);
    console.log(`   ステータスコード: ${JSON.stringify(job.statusCodes)}`);
    
    if (job.errorMessages.length > 0) {
      console.log(`   ⚠️ エラーメッセージ:`);
      job.errorMessages.slice(0, 2).forEach((msg, idx) => {
        console.log(`      [${idx + 1}] ${msg.substring(0, 150)}...`);
      });
    }
  });
  
  // 重要な問題を表示
  if (analysis.criticalIssues.length > 0) {
    console.log('\n\n🚨 重要な問題\n');
    console.log('-'.repeat(80));
    analysis.criticalIssues.forEach(issue => {
      console.log(`\n❌ ${issue.job}`);
      console.log(`   エラー数: ${issue.errorCount} (${issue.errorRate})`);
      console.log(`   エラー内容:`);
      issue.errors.forEach((err, idx) => {
        console.log(`     ${idx + 1}. ${err.substring(0, 200)}`);
      });
    });
    console.log('-'.repeat(80));
  }
  
  // 月間$1.8M目標達成への評価
  console.log('\n\n🎯 月間$1.8M目標達成への道筋評価\n');
  console.log('='.repeat(80));
  
  const criticalJobs = [
    'x-post-free-report',
    'x-quote-repost',
    'lead-discovery',
    'lead-discovery/process',
    'vsl1-post',
    'vsl2-free-users',
  ];
  
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
  const overallHealth = (analysis.success / analysis.total) * 100;
  const criticalHealth = criticalIssuesCount === 0 && allCriticalJobsRunning;
  
  console.log('\n📊 総合評価\n');
  console.log(`全体成功率: ${overallHealth.toFixed(1)}%`);
  console.log(`重要Cron Jobs: ${criticalHealth ? '✅ すべて正常' : '❌ 問題あり'}`);
  
  if (overallHealth >= 90 && criticalHealth) {
    console.log('\n✅ 評価: 月間$1.8M目標達成への道筋は明確です');
    console.log('   - すべての重要Cron Jobsが正常に動作しています');
    console.log('   - X投稿、リード発掘、VSL配信が機能しています');
  } else if (overallHealth >= 70) {
    console.log('\n⚠️ 評価: 一部改善が必要です');
    console.log('   - いくつかのCron Jobsでエラーが発生しています');
    console.log('   - エラーを修正することで目標達成への道筋が明確になります');
  } else {
    console.log('\n❌ 評価: 重大な問題があります');
    console.log('   - 複数のCron Jobsでエラーが発生しています');
    console.log('   - 早急な修正が必要です');
  }
  
  // 推奨事項
  console.log('\n\n💡 推奨事項\n');
  console.log('-'.repeat(80));
  
  if (analysis.criticalIssues.length > 0) {
    console.log('1. エラーの修正:');
    analysis.criticalIssues.forEach(issue => {
      console.log(`   - ${issue.job}: エラーを確認して修正`);
    });
  }
  
  if (overallHealth >= 90) {
    console.log('2. モニタリング強化:');
    console.log('   - 週次KPIダッシュボードの構築');
    console.log('   - エンゲージメント率、コンバージョン率の追跡');
    console.log('   - A/Bテストの実施');
  } else {
    console.log('2. 安定性の向上:');
    console.log('   - エラーハンドリングの強化');
    console.log('   - リトライロジックの追加');
    console.log('   - ログ監視の設定');
  }
  
  console.log('3. 継続的改善:');
  console.log('   - 週次パフォーマンスレビュー');
  console.log('   - トレンド連動投稿の最適化');
  console.log('   - インフルエンサー発掘の精度向上');
  
  console.log('\n' + '='.repeat(80));
}

// 実行
if (require.main === module) {
  analyzeCronLogs();
}

module.exports = { analyzeCronLogs };
