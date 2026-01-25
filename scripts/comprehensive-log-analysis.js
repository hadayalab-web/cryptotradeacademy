// scripts/comprehensive-log-analysis.js
// 24時間分のVercelログを徹底分析

const fs = require('fs');
const path = require('path');

async function comprehensiveAnalysis() {
  const logPath = process.argv[2] || path.join(__dirname, '../../Downloads/logs_result (1).json');
  
  console.log('🔍 24時間分のVercelログ徹底分析を開始...');
  console.log(`📁 ログファイル: ${logPath}\n`);
  
  if (!fs.existsSync(logPath)) {
    console.error(`❌ ログファイルが見つかりません: ${logPath}`);
    process.exit(1);
  }
  
  const logContent = fs.readFileSync(logPath, 'utf-8');
  const logs = JSON.parse(logContent);
  
  console.log(`✅ ${logs.length}件のログエントリを読み込みました\n`);
  
  // 1. Cron Jobs別の実行状況分析
  const cronJobs = {};
  const expectedCronJobs = {
    '/api/cron': { schedule: '*/15 * * * *', expectedPerDay: 96 },
    '/api/x-post-free-report': { schedule: '0 12,13,14,15,18 * * *', expectedPerDay: 5 },
    '/api/x-quote-repost': { schedule: '0 0,1,20,21 * * *', expectedPerDay: 4 },
    '/api/x-post-minimal-version-cron': { schedule: '0 8 * * *', expectedPerDay: 1 },
    '/api/vsl1-post': { schedule: '0 14,20 * * *', expectedPerDay: 2 },
    '/api/vsl2-free-users': { schedule: '0 * * * *', expectedPerDay: 24 },
    '/api/vsl2-last-call': { schedule: '0 * * * *', expectedPerDay: 24 },
    '/api/vsl1-reminder': { schedule: '0 */12 * * *', expectedPerDay: 2 },
    '/api/promo-stock-monitor': { schedule: '*/15 * * * *', expectedPerDay: 96 },
    '/api/x-quote-repost-metrics': { schedule: '0 * * * *', expectedPerDay: 24 },
    '/api/x-engagement-metrics': { schedule: '0 0 * * *', expectedPerDay: 1 },
    '/api/weekly-report': { schedule: '0 0 * * 0', expectedPerDay: 0 }, // 日曜日のみ
    '/api/x-influencer-report': { schedule: '0 9 * * 1', expectedPerDay: 0 }, // 月曜日のみ
    '/api/x-algorithm-analysis': { schedule: '0 10 * * *', expectedPerDay: 1 },
  };
  
  // ログを時間順にソート
  logs.sort((a, b) => {
    const timeA = new Date(a.TimeUTC || a.timestamp || 0).getTime();
    const timeB = new Date(b.TimeUTC || b.timestamp || 0).getTime();
    return timeA - timeB;
  });
  
  // 最初と最後のログ時刻を取得
  const firstLog = logs[0];
  const lastLog = logs[logs.length - 1];
  const firstTime = new Date(firstLog?.TimeUTC || firstLog?.timestamp || 0);
  const lastTime = new Date(lastLog?.TimeUTC || lastLog?.timestamp || 0);
  const hoursDiff = (lastTime - firstTime) / (1000 * 60 * 60);
  
  console.log('='.repeat(100));
  console.log('📅 ログ期間');
  console.log('='.repeat(100));
  console.log(`開始時刻: ${firstTime.toISOString()}`);
  console.log(`終了時刻: ${lastTime.toISOString()}`);
  console.log(`期間: ${hoursDiff.toFixed(1)}時間\n`);
  
  // Cron Jobs別の実行回数を集計
  logs.forEach(log => {
    const path = log.requestPath || '';
    if (!path.includes('/api/')) return;
    
    // パスを正規化（ドメイン部分を除去）
    const normalizedPath = path.split('/api/')[1] ? `/api/${path.split('/api/')[1]}` : path;
    
    if (!cronJobs[normalizedPath]) {
      cronJobs[normalizedPath] = {
        total: 0,
        success: 0,
        errors: 0,
        warnings: 0,
        statusCodes: {},
        timestamps: [],
        errorMessages: [],
        warningMessages: [],
      };
    }
    
    cronJobs[normalizedPath].total++;
    const statusCode = log.responseStatusCode;
    const level = log.level || 'info';
    const message = log.message || '';
    
    if (statusCode >= 200 && statusCode < 300) {
      cronJobs[normalizedPath].success++;
    } else if (statusCode >= 400) {
      cronJobs[normalizedPath].errors++;
      cronJobs[normalizedPath].errorMessages.push({
        timestamp: log.TimeUTC || log.timestamp,
        statusCode,
        message: message.substring(0, 200),
      });
    }
    
    if (level === 'warn' || level === 'warning' || message.toLowerCase().includes('warn')) {
      cronJobs[normalizedPath].warnings++;
      cronJobs[normalizedPath].warningMessages.push({
        timestamp: log.TimeUTC || log.timestamp,
        message: message.substring(0, 200),
      });
    }
    
    if (statusCode) {
      cronJobs[normalizedPath].statusCodes[statusCode] = (cronJobs[normalizedPath].statusCodes[statusCode] || 0) + 1;
    }
    
    cronJobs[normalizedPath].timestamps.push(log.TimeUTC || log.timestamp);
  });
  
  // 2. Cron Jobs実行状況の詳細分析
  console.log('='.repeat(100));
  console.log('📊 Cron Jobs実行状況の詳細分析');
  console.log('='.repeat(100));
  
  Object.entries(expectedCronJobs).forEach(([path, config]) => {
    const actual = cronJobs[path] || { total: 0, success: 0, errors: 0, warnings: 0 };
    const expected = Math.floor(config.expectedPerDay * (hoursDiff / 24));
    const executionRate = expected > 0 ? ((actual.total / expected) * 100).toFixed(1) : 'N/A';
    
    console.log(`\n${path}`);
    console.log(`  期待実行回数: ${expected}回（${hoursDiff.toFixed(1)}時間分）`);
    console.log(`  実際実行回数: ${actual.total}回`);
    console.log(`  実行率: ${executionRate}%`);
    console.log(`  成功: ${actual.success}回, エラー: ${actual.errors}回, 警告: ${actual.warnings}回`);
    
    if (actual.total < expected * 0.8) {
      console.log(`  ⚠️ 警告: 実行回数が期待値の80%未満です！`);
    }
    
    if (actual.errors > 0) {
      console.log(`  ❌ エラー詳細:`);
      actual.errorMessages.slice(0, 3).forEach((err, i) => {
        console.log(`    [${i + 1}] ${err.timestamp} - Status: ${err.statusCode}`);
        console.log(`        ${err.message}`);
      });
    }
    
    if (actual.warnings > 0 && actual.warnings <= 5) {
      console.log(`  ⚠️ 警告詳細:`);
      actual.warningMessages.slice(0, 3).forEach((warn, i) => {
        console.log(`    [${i + 1}] ${warn.timestamp}`);
        console.log(`        ${warn.message}`);
      });
    }
  });
  
  // 3. 実行されていないCron Jobsの特定
  console.log('\n' + '='.repeat(100));
  console.log('❌ 実行されていない/実行回数が少ないCron Jobs');
  console.log('='.repeat(100));
  
  Object.entries(expectedCronJobs).forEach(([path, config]) => {
    const actual = cronJobs[path] || { total: 0 };
    const expected = Math.floor(config.expectedPerDay * (hoursDiff / 24));
    
    if (actual.total === 0 && expected > 0) {
      console.log(`\n❌ ${path}`);
      console.log(`   期待実行回数: ${expected}回`);
      console.log(`   実際実行回数: 0回`);
      console.log(`   スケジュール: ${config.schedule}`);
      console.log(`   ⚠️ 完全に実行されていません！`);
    } else if (actual.total < expected * 0.5 && expected > 0) {
      console.log(`\n⚠️ ${path}`);
      console.log(`   期待実行回数: ${expected}回`);
      console.log(`   実際実行回数: ${actual.total}回`);
      console.log(`   実行率: ${((actual.total / expected) * 100).toFixed(1)}%`);
      console.log(`   ⚠️ 実行回数が期待値の50%未満です！`);
    }
  });
  
  // 4. エラーパターンの詳細分析
  console.log('\n' + '='.repeat(100));
  console.log('🔍 エラーパターンの詳細分析');
  console.log('='.repeat(100));
  
  const allErrors = [];
  const allWarnings = [];
  const errorPatterns = {};
  const warningPatterns = {};
  
  logs.forEach(log => {
    const message = log.message || '';
    const level = log.level || 'info';
    const statusCode = log.responseStatusCode;
    const path = log.requestPath || '';
    
    if (level === 'error' || level === 'ERROR' || (statusCode && statusCode >= 400)) {
      allErrors.push({
        timestamp: log.TimeUTC || log.timestamp,
        path,
        statusCode,
        message,
      });
      
      // エラーパターンを分類
      let pattern = 'unknown';
      if (message.includes('EROFS') || message.includes('read-only file system')) {
        pattern = 'filesystem_readonly';
      } else if (message.includes('rate limit') || message.includes('429')) {
        pattern = 'rate_limit';
      } else if (message.includes('not found') || message.includes('Cannot find module')) {
        pattern = 'module_not_found';
      } else if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
        pattern = 'timeout';
      } else if (message.includes('unauthorized') || message.includes('401')) {
        pattern = 'unauthorized';
      } else if (message.includes('forbidden') || message.includes('403')) {
        pattern = 'forbidden';
      } else if (statusCode === 500) {
        pattern = 'server_error';
      } else if (statusCode === 429) {
        pattern = 'rate_limit';
      } else if (statusCode >= 400 && statusCode < 500) {
        pattern = 'client_error';
      } else if (statusCode >= 500) {
        pattern = 'server_error';
      }
      
      errorPatterns[pattern] = (errorPatterns[pattern] || 0) + 1;
    }
    
    if (level === 'warn' || level === 'warning' || message.toLowerCase().includes('warn')) {
      allWarnings.push({
        timestamp: log.TimeUTC || log.timestamp,
        path,
        message,
      });
      
      // 警告パターンを分類
      let pattern = 'unknown';
      if (message.includes('Skipping')) {
        pattern = 'skipped';
      } else if (message.includes('not set') || message.includes('not configured')) {
        pattern = 'config_missing';
      } else if (message.includes('not available')) {
        pattern = 'service_unavailable';
      } else if (message.includes('Failed to')) {
        pattern = 'operation_failed';
      }
      
      warningPatterns[pattern] = (warningPatterns[pattern] || 0) + 1;
    }
  });
  
  console.log(`\n総エラー数: ${allErrors.length}件`);
  console.log(`エラーパターン:`);
  Object.entries(errorPatterns)
    .sort((a, b) => b[1] - a[1])
    .forEach(([pattern, count]) => {
      console.log(`  ${pattern}: ${count}件`);
    });
  
  console.log(`\n総警告数: ${allWarnings.length}件`);
  console.log(`警告パターン:`);
  Object.entries(warningPatterns)
    .sort((a, b) => b[1] - a[1])
    .forEach(([pattern, count]) => {
      console.log(`  ${pattern}: ${count}件`);
    });
  
  // 5. スキップされた処理の詳細分析
  console.log('\n' + '='.repeat(100));
  console.log('⏭️ スキップされた処理の詳細分析');
  console.log('='.repeat(100));
  
  const skippedByReason = {};
  const skippedByPath = {};
  
  logs.forEach(log => {
    const message = log.message || '';
    const path = log.requestPath || '';
    
    if (message.includes('Skipping') || message.includes('skipping') || message.includes('skipped')) {
      // スキップ理由を抽出
      let reason = 'unknown';
      if (message.includes('not peak')) {
        reason = 'not_peak_time';
      } else if (message.includes('limit reached') || message.includes('limit')) {
        reason = 'limit_reached';
      } else if (message.includes('already')) {
        reason = 'already_executed';
      } else if (message.includes('thresholds not met')) {
        reason = 'thresholds_not_met';
      } else if (message.includes('not configured') || message.includes('not set')) {
        reason = 'not_configured';
      } else if (message.includes('no users') || message.includes('No users')) {
        reason = 'no_users';
      }
      
      skippedByReason[reason] = (skippedByReason[reason] || 0) + 1;
      skippedByPath[path] = (skippedByPath[path] || 0) + 1;
    }
  });
  
  console.log(`\nスキップ理由別:`);
  Object.entries(skippedByReason)
    .sort((a, b) => b[1] - a[1])
    .forEach(([reason, count]) => {
      console.log(`  ${reason}: ${count}件`);
    });
  
  console.log(`\nスキップされたパス別:`);
  Object.entries(skippedByPath)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([path, count]) => {
      console.log(`  ${path}: ${count}件`);
    });
  
  // 6. 時間帯別の実行状況
  console.log('\n' + '='.repeat(100));
  console.log('⏰ 時間帯別の実行状況');
  console.log('='.repeat(100));
  
  const hourlyStats = {};
  logs.forEach(log => {
    const timestamp = log.TimeUTC || log.timestamp;
    if (!timestamp) return;
    
    const date = new Date(timestamp);
    const hour = date.getUTCHours();
    
    if (!hourlyStats[hour]) {
      hourlyStats[hour] = { total: 0, errors: 0, warnings: 0 };
    }
    
    hourlyStats[hour].total++;
    const level = log.level || 'info';
    const statusCode = log.responseStatusCode;
    
    if (level === 'error' || (statusCode && statusCode >= 400)) {
      hourlyStats[hour].errors++;
    }
    if (level === 'warn' || level === 'warning') {
      hourlyStats[hour].warnings++;
    }
  });
  
  console.log('\n時間帯別統計（UTC）:');
  for (let hour = 0; hour < 24; hour++) {
    const stats = hourlyStats[hour] || { total: 0, errors: 0, warnings: 0 };
    if (stats.total > 0) {
      console.log(`  UTC ${String(hour).padStart(2, '0')}:00 - 総数: ${stats.total}, エラー: ${stats.errors}, 警告: ${stats.warnings}`);
    }
  }
  
  // 7. 推奨事項
  console.log('\n' + '='.repeat(100));
  console.log('💡 推奨事項と修正優先度');
  console.log('='.repeat(100));
  
  const recommendations = [];
  
  // 実行されていないCron Jobs
  Object.entries(expectedCronJobs).forEach(([path, config]) => {
    const actual = cronJobs[path] || { total: 0 };
    const expected = Math.floor(config.expectedPerDay * (hoursDiff / 24));
    if (actual.total === 0 && expected > 0) {
      recommendations.push({
        priority: 'HIGH',
        issue: `${path}が実行されていません`,
        action: `Vercel Cron Jobsの設定を確認し、${config.schedule}のスケジュールが正しく設定されているか確認`,
      });
    }
  });
  
  // エラーパターンに基づく推奨事項
  if (errorPatterns.filesystem_readonly > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      issue: 'ファイルシステム読み取り専用エラー',
      action: 'Vercel環境ではファイル書き込みをスキップする処理を追加（既に修正済み）',
    });
  }
  
  if (errorPatterns.rate_limit > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      issue: 'レート制限エラー',
      action: 'リトライ間隔を調整し、レート制限ヘッダーを活用（既に修正済み）',
    });
  }
  
  if (errorPatterns.module_not_found > 0) {
    recommendations.push({
      priority: 'HIGH',
      issue: 'モジュールが見つからないエラー',
      action: 'モジュールのインポートパスを確認し、存在しない場合はエラーハンドリングを追加',
    });
  }
  
  if (warningPatterns.skipped > 50) {
    recommendations.push({
      priority: 'MEDIUM',
      issue: 'スキップされた処理が多すぎる',
      action: 'スキップ条件を緩和し、インプレッション最大化のためより積極的に実行（既に修正済み）',
    });
  }
  
  if (warningPatterns.config_missing > 0) {
    recommendations.push({
      priority: 'HIGH',
      issue: '設定が不足している',
      action: 'Vercel環境変数を確認し、必要な設定を追加',
    });
  }
  
  recommendations.forEach((rec, i) => {
    console.log(`\n[${i + 1}] 優先度: ${rec.priority}`);
    console.log(`    問題: ${rec.issue}`);
    console.log(`    対応: ${rec.action}`);
  });
  
  console.log('\n' + '='.repeat(100));
  console.log('✅ 分析完了');
  console.log('='.repeat(100));
}

comprehensiveAnalysis().catch(error => {
  console.error('❌ 分析エラー:', error);
  console.error(error.stack);
  process.exit(1);
});
