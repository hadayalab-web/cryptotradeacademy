// scripts/deep-dive-analysis.js
// 24時間分のログを深掘り分析

const fs = require('fs');
const path = require('path');

async function deepDiveAnalysis() {
  const logPath = process.argv[2] || path.join(__dirname, '../../Downloads/logs_result (1).json');
  
  console.log('🔬 深掘り分析を開始...\n');
  
  const logContent = fs.readFileSync(logPath, 'utf-8');
  const logs = JSON.parse(logContent);
  
  // 1. 異常に多い実行回数の原因を調査
  console.log('='.repeat(100));
  console.log('🔍 異常な実行回数の原因調査');
  console.log('='.repeat(100));
  
  const cronExecutions = {};
  logs.forEach(log => {
    const path = log.requestPath || '';
    if (!path.includes('/api/')) return;
    const normalizedPath = path.split('/api/')[1] ? `/api/${path.split('/api/')[1]}` : path;
    const timestamp = log.TimeUTC || log.timestamp;
    
    if (!cronExecutions[normalizedPath]) {
      cronExecutions[normalizedPath] = [];
    }
    cronExecutions[normalizedPath].push({
      timestamp,
      statusCode: log.responseStatusCode,
      message: log.message || '',
      requestId: log.requestId || '',
    });
  });
  
  // /api/cronの実行パターンを分析
  if (cronExecutions['/api/cron']) {
    const cronLogs = cronExecutions['/api/cron'];
    console.log(`\n/api/cron: ${cronLogs.length}回実行`);
    
    // 時間間隔を分析
    const intervals = [];
    for (let i = 1; i < cronLogs.length; i++) {
      const prev = new Date(cronLogs[i-1].timestamp).getTime();
      const curr = new Date(cronLogs[i].timestamp).getTime();
      const interval = (curr - prev) / 1000 / 60; // 分単位
      intervals.push(interval);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const minInterval = Math.min(...intervals);
    const maxInterval = Math.max(...intervals);
    
    console.log(`  平均実行間隔: ${avgInterval.toFixed(1)}分`);
    console.log(`  最小実行間隔: ${minInterval.toFixed(1)}分`);
    console.log(`  最大実行間隔: ${maxInterval.toFixed(1)}分`);
    console.log(`  期待間隔: 15分（*/15 * * * *）`);
    
    if (avgInterval < 10) {
      console.log(`  ⚠️ 警告: 実行間隔が短すぎます！15分間隔の設定なのに${avgInterval.toFixed(1)}分間隔で実行されています`);
    }
    
    // 15分間隔で実行されているか確認
    const correctIntervalCount = intervals.filter(i => i >= 14 && i <= 16).length;
    const correctRate = (correctIntervalCount / intervals.length * 100).toFixed(1);
    console.log(`  15分間隔（±1分）での実行率: ${correctRate}%`);
    
    if (correctRate < 80) {
      console.log(`  ⚠️ 警告: 15分間隔での実行率が低すぎます！`);
    }
  }
  
  // 2. スキップされた処理の詳細分析
  console.log('\n' + '='.repeat(100));
  console.log('⏭️ スキップされた処理の詳細分析');
  console.log('='.repeat(100));
  
  const skippedDetails = {
    '/api/x-quote-repost': [],
    '/api/x-post-free-report': [],
    '/api/cron': [],
    '/api/promo-stock-monitor': [],
  };
  
  logs.forEach(log => {
    const message = log.message || '';
    const path = log.requestPath || '';
    const normalizedPath = path.split('/api/')[1] ? `/api/${path.split('/api/')[1]}` : path;
    
    if (message.includes('Skipping') || message.includes('skipping') || message.includes('skipped')) {
      if (skippedDetails[normalizedPath]) {
        skippedDetails[normalizedPath].push({
          timestamp: log.TimeUTC || log.timestamp,
          message,
          statusCode: log.responseStatusCode,
        });
      }
    }
  });
  
  Object.entries(skippedDetails).forEach(([path, skips]) => {
    if (skips.length > 0) {
      console.log(`\n${path}: ${skips.length}件スキップ`);
      
      // スキップ理由を分類
      const reasons = {
        not_peak_time: 0,
        limit_reached: 0,
        already_executed: 0,
        thresholds_not_met: 0,
        not_configured: 0,
        no_users: 0,
        other: 0,
      };
      
      skips.forEach(skip => {
        const msg = skip.message.toLowerCase();
        if (msg.includes('not peak') || msg.includes('peak time')) {
          reasons.not_peak_time++;
        } else if (msg.includes('limit reached') || msg.includes('limit')) {
          reasons.limit_reached++;
        } else if (msg.includes('already')) {
          reasons.already_executed++;
        } else if (msg.includes('thresholds not met')) {
          reasons.thresholds_not_met++;
        } else if (msg.includes('not configured') || msg.includes('not set')) {
          reasons.not_configured++;
        } else if (msg.includes('no users') || msg.includes('no free users')) {
          reasons.no_users++;
        } else {
          reasons.other++;
        }
      });
      
      console.log(`  スキップ理由:`);
      Object.entries(reasons).forEach(([reason, count]) => {
        if (count > 0) {
          console.log(`    ${reason}: ${count}件`);
        }
      });
      
      // 最初の5件の詳細を表示
      console.log(`  最初の5件:`);
      skips.slice(0, 5).forEach((skip, i) => {
        console.log(`    [${i + 1}] ${skip.timestamp}`);
        console.log(`        ${skip.message.substring(0, 150)}`);
      });
    }
  });
  
  // 3. エラーの詳細分析
  console.log('\n' + '='.repeat(100));
  console.log('❌ エラーの詳細分析');
  console.log('='.repeat(100));
  
  const errors = logs.filter(log => {
    const level = log.level || 'info';
    const statusCode = log.responseStatusCode;
    return level === 'error' || level === 'ERROR' || (statusCode && statusCode >= 400);
  });
  
  console.log(`\n総エラー数: ${errors.length}件`);
  
  // エラーをパス別に分類
  const errorsByPath = {};
  errors.forEach(err => {
    const path = err.requestPath || '';
    const normalizedPath = path.split('/api/')[1] ? `/api/${path.split('/api/')[1]}` : path;
    if (!errorsByPath[normalizedPath]) {
      errorsByPath[normalizedPath] = [];
    }
    errorsByPath[normalizedPath].push({
      timestamp: err.TimeUTC || err.timestamp,
      statusCode: err.responseStatusCode,
      message: err.message || '',
    });
  });
  
  Object.entries(errorsByPath).forEach(([path, errs]) => {
    console.log(`\n${path}: ${errs.length}件のエラー`);
    errs.forEach((err, i) => {
      console.log(`  [${i + 1}] ${err.timestamp} - Status: ${err.statusCode || 'N/A'}`);
      console.log(`      ${err.message.substring(0, 200)}`);
    });
  });
  
  // 4. 警告の詳細分析
  console.log('\n' + '='.repeat(100));
  console.log('⚠️ 警告の詳細分析');
  console.log('='.repeat(100));
  
  const warnings = logs.filter(log => {
    const level = log.level || 'info';
    const message = log.message || '';
    return level === 'warn' || level === 'warning' || message.toLowerCase().includes('warn');
  });
  
  console.log(`\n総警告数: ${warnings.length}件`);
  
  // 警告をパス別に分類
  const warningsByPath = {};
  warnings.forEach(warn => {
    const path = warn.requestPath || '';
    const normalizedPath = path.split('/api/')[1] ? `/api/${path.split('/api/')[1]}` : path;
    if (!warningsByPath[normalizedPath]) {
      warningsByPath[normalizedPath] = [];
    }
    warningsByPath[normalizedPath].push({
      timestamp: warn.TimeUTC || warn.timestamp,
      message: warn.message || '',
    });
  });
  
  Object.entries(warningsByPath).forEach(([path, warns]) => {
    console.log(`\n${path}: ${warns.length}件の警告`);
    warns.slice(0, 5).forEach((warn, i) => {
      console.log(`  [${i + 1}] ${warn.timestamp}`);
      console.log(`      ${warn.message.substring(0, 200)}`);
    });
  });
  
  // 5. X投稿関連の実行状況の詳細
  console.log('\n' + '='.repeat(100));
  console.log('🐦 X投稿関連の実行状況の詳細');
  console.log('='.repeat(100));
  
  const xPostLogs = logs.filter(log => {
    const path = log.requestPath || '';
    return path.includes('x-post') || path.includes('x-quote');
  });
  
  console.log(`\nX投稿関連の総ログ数: ${xPostLogs.length}件`);
  
  // 時間帯別の実行状況
  const xPostByHour = {};
  xPostLogs.forEach(log => {
    const timestamp = log.TimeUTC || log.timestamp;
    if (!timestamp) return;
    const hour = new Date(timestamp).getUTCHours();
    if (!xPostByHour[hour]) {
      xPostByHour[hour] = { total: 0, success: 0, skipped: 0 };
    }
    xPostByHour[hour].total++;
    const statusCode = log.responseStatusCode;
    const message = log.message || '';
    if (statusCode >= 200 && statusCode < 300) {
      xPostByHour[hour].success++;
    }
    if (message.includes('Skipping') || message.includes('skipping')) {
      xPostByHour[hour].skipped++;
    }
  });
  
  console.log(`\n時間帯別のX投稿実行状況（UTC）:`);
  for (let hour = 0; hour < 24; hour++) {
    const stats = xPostByHour[hour];
    if (stats) {
      console.log(`  UTC ${String(hour).padStart(2, '0')}:00 - 総数: ${stats.total}, 成功: ${stats.success}, スキップ: ${stats.skipped}`);
    }
  }
  
  // 6. 根本原因の特定
  console.log('\n' + '='.repeat(100));
  console.log('🎯 根本原因の特定');
  console.log('='.repeat(100));
  
  const rootCauses = [];
  
  // 実行回数が異常に多い原因
  if (cronExecutions['/api/cron'] && cronExecutions['/api/cron'].length > 100) {
    rootCauses.push({
      issue: '/api/cronが異常に多く実行されている',
      possibleCauses: [
        'Vercel Cron Jobsの設定が正しくない（複数のCron Jobsが同じエンドポイントを呼んでいる）',
        '手動実行やデバッグ実行が含まれている',
        'リトライロジックが過剰に動作している',
        '他のシステムからの呼び出しがある',
      ],
      impact: 'リソースの無駄遣い、APIレート制限のリスク',
    });
  }
  
  // スキップが多すぎる原因
  const totalSkipped = Object.values(skippedDetails).reduce((sum, skips) => sum + skips.length, 0);
  if (totalSkipped > 50) {
    rootCauses.push({
      issue: 'スキップされた処理が多すぎる',
      possibleCauses: [
        'ピーク時間チェックが厳しすぎる',
        '投稿制限が厳しすぎる',
        '条件判定ロジックに問題がある',
      ],
      impact: 'インプレッション損失、機会損失',
    });
  }
  
  // ファイルシステムエラー
  const filesystemErrors = errors.filter(e => 
    e.message?.includes('EROFS') || e.message?.includes('read-only file system')
  );
  if (filesystemErrors.length > 0) {
    rootCauses.push({
      issue: 'ファイルシステム読み取り専用エラー',
      possibleCauses: [
        'Vercel環境ではファイルシステムが読み取り専用',
        'ファイル書き込み処理が残っている',
      ],
      impact: 'エラーログの増加、パフォーマンス低下',
      status: '既に修正済み',
    });
  }
  
  rootCauses.forEach((cause, i) => {
    console.log(`\n[${i + 1}] ${cause.issue}`);
    if (cause.status) {
      console.log(`    ステータス: ${cause.status}`);
    }
    console.log(`    考えられる原因:`);
    cause.possibleCauses.forEach((c, j) => {
      console.log(`      ${j + 1}. ${c}`);
    });
    console.log(`    影響: ${cause.impact}`);
  });
  
  console.log('\n' + '='.repeat(100));
  console.log('✅ 深掘り分析完了');
  console.log('='.repeat(100));
}

deepDiveAnalysis().catch(error => {
  console.error('❌ 分析エラー:', error);
  console.error(error.stack);
  process.exit(1);
});
