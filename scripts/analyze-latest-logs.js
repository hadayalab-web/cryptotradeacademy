const fs = require('fs');
const path = require('path');

// ログファイルを読み込む
const logFilePath = 'c:\\Users\\chiba\\Downloads\\logs_result (1).json';
const logs = JSON.parse(fs.readFileSync(logFilePath, 'utf8'));

console.log('=== ログ分析レポート ===\n');
console.log(`総ログエントリ数: ${logs.length}\n`);

// エンドポイント別の実行状況を集計
const endpointStats = {};
const errors = [];
const warnings = [];

logs.forEach((log, index) => {
  const path = log.requestPath || log.path || 'unknown';
  const status = log.responseStatusCode || log.statusCode || 0;
  const time = log.TimeUTC || log.time || log.timestamp || 'unknown';
  
  if (!endpointStats[path]) {
    endpointStats[path] = {
      total: 0,
      success: 0,
      errors: 0,
      statusCodes: {},
      times: []
    };
  }
  
  endpointStats[path].total++;
  endpointStats[path].times.push(time);
  
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
  if (logStr.includes('warning') || logStr.includes('warn') || logStr.includes('skip')) {
    warnings.push({
      path,
      time,
      message: log.message || log.msg || JSON.stringify(log).substring(0, 200)
    });
  }
});

// 期待されるCron Jobs（vercel.jsonから）
const expectedCronJobs = {
  '/api/cron': { schedule: '*/15 * * * *', description: '15分ごと' },
  '/api/x-post-free-report': { schedule: '0 12,13,14,15,18 * * *', description: 'UTC 12,13,14,15,18' },
  '/api/x-quote-repost': { schedule: '0 0,1,20,21 * * *', description: 'UTC 0,1,20,21' },
  '/api/x-post-minimal-version-cron': { schedule: '0 8 * * *', description: 'UTC 8:00' },
  '/api/vsl1-post': { schedule: '0 14,20 * * *', description: 'UTC 14,20' },
  '/api/vsl2-free-users': { schedule: '0 * * * *', description: '1時間ごと' },
  '/api/vsl1-reminder': { schedule: '0 */12 * * *', description: '12時間ごと' },
  '/api/vsl2-last-call': { schedule: '0 * * * *', description: '1時間ごと' },
  '/api/promo-stock-monitor': { schedule: '*/15 * * * *', description: '15分ごと' },
  '/api/weekly-report': { schedule: '0 0 * * 0', description: '日曜日 UTC 0:00' },
  '/api/monthly-engagement-report': { schedule: '0 0 1 * *', description: '1日 UTC 0:00' },
  '/api/x-engagement-metrics': { schedule: '0 0 * * *', description: '1日1回 UTC 0:00' },
  '/api/x-influencer-report': { schedule: '0 9 * * 1', description: '月曜日 UTC 9:00' },
  '/api/x-quote-repost-metrics': { schedule: '0 * * * *', description: '1時間ごと' },
  '/api/x-algorithm-analysis': { schedule: '0 10 * * *', description: '1日1回 UTC 10:00' }
};

console.log('=== エンドポイント別実行状況 ===\n');

// 実行回数でソート
const sortedEndpoints = Object.entries(endpointStats).sort((a, b) => b[1].total - a[1].total);

sortedEndpoints.forEach(([path, stats]) => {
  const expected = expectedCronJobs[path];
  const successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : 0;
  const status = stats.errors > 0 ? '❌' : successRate >= 90 ? '✅' : '⚠️';
  
  console.log(`${status} ${path}`);
  console.log(`  実行回数: ${stats.total}回`);
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
console.log('\n=== 実行されていないCron Jobs ===\n');
Object.keys(expectedCronJobs).forEach(path => {
  if (!endpointStats[path] || endpointStats[path].total === 0) {
    console.log(`❌ ${path}`);
    console.log(`  期待スケジュール: ${expectedCronJobs[path].description}`);
    console.log(`  実行回数: 0回`);
    console.log('');
  }
});

// エラー詳細
if (errors.length > 0) {
  console.log('\n=== エラー詳細 ===\n');
  errors.slice(0, 20).forEach((error, index) => {
    console.log(`${index + 1}. ${error.path} - ${error.status} - ${error.time}`);
    console.log(`   ${error.message.substring(0, 200)}`);
    console.log('');
  });
  if (errors.length > 20) {
    console.log(`... 他 ${errors.length - 20}件のエラー`);
  }
}

// 警告詳細
if (warnings.length > 0) {
  console.log('\n=== 警告・スキップメッセージ ===\n');
  const warningGroups = {};
  warnings.forEach(w => {
    const key = `${w.path}:${w.message.substring(0, 100)}`;
    if (!warningGroups[key]) {
      warningGroups[key] = { count: 0, path: w.path, message: w.message };
    }
    warningGroups[key].count++;
  });
  
  Object.values(warningGroups)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
    .forEach((w, index) => {
      console.log(`${index + 1}. ${w.path} (${w.count}回)`);
      console.log(`   ${w.message.substring(0, 200)}`);
      console.log('');
    });
}

// 時間帯別の実行状況
console.log('\n=== 時間帯別実行状況（UTC）===\n');
const hourStats = {};
logs.forEach(log => {
  const time = log.TimeUTC || log.time || log.timestamp;
  if (time && typeof time === 'string') {
    const hour = time.substring(11, 13); // HH部分を抽出
    if (hour) {
      if (!hourStats[hour]) {
        hourStats[hour] = { total: 0, endpoints: {} };
      }
      hourStats[hour].total++;
      const path = log.requestPath || log.path || 'unknown';
      if (!hourStats[hour].endpoints[path]) {
        hourStats[hour].endpoints[path] = 0;
      }
      hourStats[hour].endpoints[path]++;
    }
  }
});

Object.keys(hourStats).sort().forEach(hour => {
  console.log(`UTC ${hour}:00 - ${hourStats[hour].total}回実行`);
  Object.entries(hourStats[hour].endpoints)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([path, count]) => {
      console.log(`  ${path}: ${count}回`);
    });
  console.log('');
});
