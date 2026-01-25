const fs = require('fs');

// ログファイルを読み込む
const logFilePath = 'c:\\Users\\chiba\\Downloads\\logs_result (1).json';
const logs = JSON.parse(fs.readFileSync(logFilePath, 'utf8'));

console.log('=== ログ分析レポート（修正版）===\n');
console.log(`総ログエントリ数: ${logs.length}\n`);

// パスを正規化する関数
function normalizePath(fullPath) {
  if (!fullPath) return 'unknown';
  // 完全なURLからパス部分を抽出
  const match = fullPath.match(/\/api\/[^\/\s]+/);
  return match ? match[0] : fullPath;
}

// エンドポイント別の実行状況を集計
const endpointStats = {};
const errors = [];
const warnings = [];
const timeSlots = {}; // 時間帯別の実行状況

logs.forEach((log) => {
  const fullPath = log.requestPath || log.path || 'unknown';
  const path = normalizePath(fullPath);
  const status = log.responseStatusCode || log.statusCode || 0;
  const time = log.TimeUTC || log.time || log.timestamp || 'unknown';
  
  if (!endpointStats[path]) {
    endpointStats[path] = {
      total: 0,
      success: 0,
      errors: 0,
      statusCodes: {},
      times: [],
      fullPaths: new Set()
    };
  }
  
  endpointStats[path].total++;
  endpointStats[path].times.push(time);
  endpointStats[path].fullPaths.add(fullPath);
  
  // 時間帯別の集計
  if (time && typeof time === 'string') {
    const hour = time.substring(11, 13);
    if (hour) {
      if (!timeSlots[hour]) {
        timeSlots[hour] = {};
      }
      if (!timeSlots[hour][path]) {
        timeSlots[hour][path] = 0;
      }
      timeSlots[hour][path]++;
    }
  }
  
  if (status >= 200 && status < 300) {
    endpointStats[path].success++;
  } else if (status >= 400) {
    endpointStats[path].errors++;
    errors.push({
      path,
      status,
      time,
      message: log.message || log.error || 'No error message'
    });
  }
  
  if (!endpointStats[path].statusCodes[status]) {
    endpointStats[path].statusCodes[status] = 0;
  }
  endpointStats[path].statusCodes[status]++;
  
  // 警告メッセージを検出
  const logStr = JSON.stringify(log).toLowerCase();
  if (logStr.includes('warning') || logStr.includes('warn') || logStr.includes('skip') || logStr.includes('error')) {
    warnings.push({
      path,
      time,
      message: log.message || log.msg || JSON.stringify(log).substring(0, 200)
    });
  }
});

// 期待されるCron Jobs（vercel.jsonから）
const expectedCronJobs = {
  '/api/cron': { schedule: '*/15 * * * *', description: '15分ごと', expectedPerDay: 96 },
  '/api/x-post-free-report': { schedule: '0 12,13,14,15,18 * * *', description: 'UTC 12,13,14,15,18', expectedPerDay: 5 },
  '/api/x-quote-repost': { schedule: '0 0,1,20,21 * * *', description: 'UTC 0,1,20,21', expectedPerDay: 4 },
  '/api/x-post-minimal-version-cron': { schedule: '0 8 * * *', description: 'UTC 8:00', expectedPerDay: 1 },
  '/api/vsl1-post': { schedule: '0 14,20 * * *', description: 'UTC 14,20', expectedPerDay: 2 },
  '/api/vsl2-free-users': { schedule: '0 * * * *', description: '1時間ごと', expectedPerDay: 24 },
  '/api/vsl1-reminder': { schedule: '0 */12 * * *', description: '12時間ごと', expectedPerDay: 2 },
  '/api/vsl2-last-call': { schedule: '0 * * * *', description: '1時間ごと', expectedPerDay: 24 },
  '/api/promo-stock-monitor': { schedule: '*/15 * * * *', description: '15分ごと', expectedPerDay: 96 },
  '/api/weekly-report': { schedule: '0 0 * * 0', description: '日曜日 UTC 0:00', expectedPerDay: 1 },
  '/api/monthly-engagement-report': { schedule: '0 0 1 * *', description: '1日 UTC 0:00', expectedPerDay: 1 },
  '/api/x-engagement-metrics': { schedule: '0 0 * * *', description: '1日1回 UTC 0:00', expectedPerDay: 1 },
  '/api/x-influencer-report': { schedule: '0 9 * * 1', description: '月曜日 UTC 9:00', expectedPerDay: 1 },
  '/api/x-quote-repost-metrics': { schedule: '0 * * * *', description: '1時間ごと', expectedPerDay: 24 },
  '/api/x-algorithm-analysis': { schedule: '0 10 * * *', description: '1日1回 UTC 10:00', expectedPerDay: 1 }
};

console.log('=== エンドポイント別実行状況 ===\n');

// 実行回数でソート
const sortedEndpoints = Object.entries(endpointStats).sort((a, b) => b[1].total - a[1].total);

sortedEndpoints.forEach(([path, stats]) => {
  const expected = expectedCronJobs[path];
  const successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : 0;
  const status = stats.errors > 0 ? '❌' : successRate >= 90 ? '✅' : '⚠️';
  
  // 期待値との比較
  let statusIcon = status;
  if (expected) {
    const logPeriodHours = 7.5; // ログ期間（UTC 18:00 - 01:30 = 7.5時間）
    const expectedInPeriod = (expected.expectedPerDay / 24) * logPeriodHours;
    const actual = stats.total;
    const ratio = actual / expectedInPeriod;
    
    if (ratio < 0.5) {
      statusIcon = '❌'; // 50%未満
    } else if (ratio < 0.8) {
      statusIcon = '⚠️'; // 50-80%
    }
  }
  
  console.log(`${statusIcon} ${path}`);
  console.log(`  実行回数: ${stats.total}回`);
  if (expected) {
    const logPeriodHours = 7.5;
    const expectedInPeriod = (expected.expectedPerDay / 24) * logPeriodHours;
    console.log(`  期待値（7.5時間）: ${expectedInPeriod.toFixed(1)}回`);
    console.log(`  達成率: ${((stats.total / expectedInPeriod) * 100).toFixed(1)}%`);
  }
  console.log(`  成功: ${stats.success}回 (${successRate}%)`);
  console.log(`  エラー: ${stats.errors}回`);
  if (expected) {
    console.log(`  期待スケジュール: ${expected.description}`);
  }
  console.log(`  ステータスコード: ${JSON.stringify(stats.statusCodes)}`);
  
  // 実行時刻の範囲を表示
  if (stats.times.length > 0) {
    const sortedTimes = stats.times.sort();
    console.log(`  最初の実行: ${sortedTimes[0]}`);
    console.log(`  最後の実行: ${sortedTimes[sortedTimes.length - 1]}`);
  }
  console.log('');
});

// 実行されていないCron Jobsを確認
console.log('\n=== 実行されていない/不足しているCron Jobs ===\n');
Object.keys(expectedCronJobs).forEach(path => {
  const stats = endpointStats[path];
  const expected = expectedCronJobs[path];
  const logPeriodHours = 7.5;
  const expectedInPeriod = (expected.expectedPerDay / 24) * logPeriodHours;
  
  if (!stats || stats.total === 0) {
    console.log(`❌ ${path}`);
    console.log(`  期待スケジュール: ${expected.description}`);
    console.log(`  期待実行回数（7.5時間）: ${expectedInPeriod.toFixed(1)}回`);
    console.log(`  実際の実行回数: 0回`);
    console.log('');
  } else if (stats.total < expectedInPeriod * 0.5) {
    console.log(`⚠️ ${path} - 実行回数が不足`);
    console.log(`  期待スケジュール: ${expected.description}`);
    console.log(`  期待実行回数（7.5時間）: ${expectedInPeriod.toFixed(1)}回`);
    console.log(`  実際の実行回数: ${stats.total}回`);
    console.log(`  達成率: ${((stats.total / expectedInPeriod) * 100).toFixed(1)}%`);
    console.log('');
  }
});

// 特定の時間帯の実行状況を確認
console.log('\n=== 重要な時間帯の実行状況 ===\n');

const criticalTimeSlots = {
  '00': { jobs: ['/api/x-quote-repost', '/api/x-engagement-metrics', '/api/weekly-report'], description: 'UTC 0:00' },
  '01': { jobs: ['/api/x-quote-repost'], description: 'UTC 1:00' },
  '08': { jobs: ['/api/x-post-minimal-version-cron'], description: 'UTC 8:00' },
  '12': { jobs: ['/api/x-post-free-report'], description: 'UTC 12:00' },
  '13': { jobs: ['/api/x-post-free-report'], description: 'UTC 13:00' },
  '14': { jobs: ['/api/x-post-free-report', '/api/vsl1-post'], description: 'UTC 14:00' },
  '15': { jobs: ['/api/x-post-free-report'], description: 'UTC 15:00' },
  '18': { jobs: ['/api/x-post-free-report'], description: 'UTC 18:00' },
  '20': { jobs: ['/api/x-quote-repost', '/api/vsl1-post'], description: 'UTC 20:00' },
  '21': { jobs: ['/api/x-quote-repost'], description: 'UTC 21:00' }
};

Object.entries(criticalTimeSlots).forEach(([hour, config]) => {
  console.log(`${config.description} (UTC ${hour}:00)`);
  config.jobs.forEach(job => {
    const count = timeSlots[hour] && timeSlots[hour][job] ? timeSlots[hour][job] : 0;
    const status = count > 0 ? '✅' : '❌';
    console.log(`  ${status} ${job}: ${count}回`);
  });
  console.log('');
});

// エラー詳細
if (errors.length > 0) {
  console.log('\n=== エラー詳細 ===\n');
  errors.slice(0, 10).forEach((error, index) => {
    console.log(`${index + 1}. ${error.path} - ${error.status} - ${error.time}`);
    console.log(`   ${error.message.substring(0, 200)}`);
    console.log('');
  });
  if (errors.length > 10) {
    console.log(`... 他 ${errors.length - 10}件のエラー`);
  }
}

// 重要な警告・スキップメッセージ
console.log('\n=== 重要な警告・スキップメッセージ ===\n');
const importantWarnings = warnings.filter(w => 
  w.message.toLowerCase().includes('skipping') || 
  w.message.toLowerCase().includes('error') ||
  w.message.toLowerCase().includes('not defined') ||
  w.message.toLowerCase().includes('cannot find')
);

const warningGroups = {};
importantWarnings.forEach(w => {
  const key = `${w.path}:${w.message.substring(0, 150)}`;
  if (!warningGroups[key]) {
    warningGroups[key] = { count: 0, path: w.path, message: w.message, times: [] };
  }
  warningGroups[key].count++;
  warningGroups[key].times.push(w.time);
});

Object.values(warningGroups)
  .sort((a, b) => b.count - a.count)
  .slice(0, 15)
  .forEach((w, index) => {
    console.log(`${index + 1}. ${w.path} (${w.count}回)`);
    console.log(`   ${w.message.substring(0, 300)}`);
    if (w.times.length > 0) {
      console.log(`   最初: ${w.times[0]}, 最後: ${w.times[w.times.length - 1]}`);
    }
    console.log('');
  });
