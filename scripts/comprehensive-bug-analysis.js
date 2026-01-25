const fs = require('fs');

// ログファイルを読み込む
const logFilePath = 'c:\\Users\\chiba\\Downloads\\logs_result (1).json';
const logs = JSON.parse(fs.readFileSync(logFilePath, 'utf8'));

console.log('=== 全不具合抽出レポート ===\n');
console.log(`総ログエントリ数: ${logs.length}\n`);

// パスを正規化する関数
function normalizePath(fullPath) {
  if (!fullPath) return 'unknown';
  const match = fullPath.match(/\/api\/[^\/\s]+/);
  return match ? match[0] : fullPath;
}

// 不具合カテゴリ別に分類
const bugs = {
  missingExecutions: [], // 実行されていないCron Jobs
  wrongTiming: [], // 間違った時刻に実行されている
  errors: [], // エラー
  warnings: [], // 警告
  skippedPosts: [], // スキップされた投稿
  abnormalCounts: [], // 異常な実行回数
  deprecatedWarnings: [], // 非推奨警告
  missingModules: [], // モジュールが見つからない
  undefinedVariables: [], // 未定義変数
  fileSystemErrors: [] // ファイルシステムエラー
};

// 期待されるCron Jobs
const expectedCronJobs = {
  '/api/cron': { schedule: '*/15 * * * *', expectedPerDay: 96 },
  '/api/x-post-free-report': { schedule: '0 12,13,14,15,18 * * *', expectedHours: [12, 13, 14, 15, 18] },
  '/api/x-quote-repost': { schedule: '0 0,1,20,21 * * *', expectedHours: [0, 1, 20, 21] },
  '/api/x-post-minimal-version-cron': { schedule: '0 8 * * *', expectedHours: [8] },
  '/api/vsl1-post': { schedule: '0 14,20 * * *', expectedHours: [14, 20] },
  '/api/vsl2-free-users': { schedule: '0 * * * *', expectedPerDay: 24 },
  '/api/vsl1-reminder': { schedule: '0 */12 * * *', expectedHours: [0, 12] },
  '/api/vsl2-last-call': { schedule: '0 * * * *', expectedPerDay: 24 },
  '/api/promo-stock-monitor': { schedule: '*/15 * * * *', expectedPerDay: 96 },
  '/api/weekly-report': { schedule: '0 0 * * 0', expectedHours: [0], dayOfWeek: 0 },
  '/api/monthly-engagement-report': { schedule: '0 0 1 * *', expectedHours: [0], dayOfMonth: 1 },
  '/api/x-engagement-metrics': { schedule: '0 0 * * *', expectedHours: [0] },
  '/api/x-influencer-report': { schedule: '0 9 * * 1', expectedHours: [9], dayOfWeek: 1 },
  '/api/x-quote-repost-metrics': { schedule: '0 * * * *', expectedPerDay: 24 },
  '/api/x-algorithm-analysis': { schedule: '0 10 * * *', expectedHours: [10] }
};

// エンドポイント別の実行状況
const endpointStats = {};
const executionTimes = {}; // エンドポイント別の実行時刻

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
      times: [],
      statusCodes: {}
    };
    executionTimes[path] = [];
  }
  
  endpointStats[path].total++;
  endpointStats[path].times.push(time);
  executionTimes[path].push(time);
  
  if (status >= 200 && status < 300) {
    endpointStats[path].success++;
  } else if (status >= 400) {
    endpointStats[path].errors++;
    bugs.errors.push({
      path,
      status,
      time,
      message: log.message || log.error || JSON.stringify(log).substring(0, 300)
    });
  }
  
  if (!endpointStats[path].statusCodes[status]) {
    endpointStats[path].statusCodes[status] = 0;
  }
  endpointStats[path].statusCodes[status]++;
  
  // ログメッセージから不具合を検出
  const logStr = JSON.stringify(log).toLowerCase();
  const message = log.message || log.msg || '';
  const messageLower = message.toLowerCase();
  
  // ファイルシステムエラー
  if (messageLower.includes('erofs') || messageLower.includes('read-only file system')) {
    bugs.fileSystemErrors.push({
      path,
      time,
      message: message.substring(0, 300)
    });
  }
  
  // 未定義変数エラー
  if (messageLower.includes('is not defined') || messageLower.includes('undefined')) {
    bugs.undefinedVariables.push({
      path,
      time,
      message: message.substring(0, 300)
    });
  }
  
  // モジュールが見つからない
  if (messageLower.includes('cannot find module') || messageLower.includes('module not found')) {
    bugs.missingModules.push({
      path,
      time,
      message: message.substring(0, 300)
    });
  }
  
  // スキップされた投稿
  if (messageLower.includes('skipping') && (messageLower.includes('post') || messageLower.includes('quote'))) {
    bugs.skippedPosts.push({
      path,
      time,
      message: message.substring(0, 300)
    });
  }
  
  // 非推奨警告
  if (messageLower.includes('deprecation') || messageLower.includes('deprecated')) {
    bugs.deprecatedWarnings.push({
      path,
      time,
      message: message.substring(0, 300)
    });
  }
  
  // その他の警告
  if (messageLower.includes('warning') || messageLower.includes('warn')) {
    bugs.warnings.push({
      path,
      time,
      message: message.substring(0, 300)
    });
  }
});

// 実行されていないCron Jobsを検出
Object.entries(expectedCronJobs).forEach(([path, config]) => {
  const stats = endpointStats[path];
  
  if (!stats || stats.total === 0) {
    bugs.missingExecutions.push({
      path,
      expectedSchedule: config.schedule,
      expectedHours: config.expectedHours,
      reason: '実行ログが見つからない'
    });
  } else if (config.expectedHours) {
    // 期待される時刻に実行されているか確認
    const executedHours = new Set();
    executionTimes[path].forEach(time => {
      if (time && typeof time === 'string') {
        const hour = parseInt(time.substring(11, 13));
        if (!isNaN(hour)) {
          executedHours.add(hour);
        }
      }
    });
    
    config.expectedHours.forEach(expectedHour => {
      if (!executedHours.has(expectedHour)) {
        bugs.missingExecutions.push({
          path,
          expectedSchedule: config.schedule,
          missingHour: expectedHour,
          executedHours: Array.from(executedHours).sort(),
          reason: `UTC ${expectedHour}:00に実行されていない`
        });
      }
    });
    
    // 期待されない時刻に実行されているか確認
    executedHours.forEach(executedHour => {
      if (!config.expectedHours.includes(executedHour)) {
        bugs.wrongTiming.push({
          path,
          expectedHours: config.expectedHours,
          wrongHour: executedHour,
          reason: `UTC ${executedHour}:00に実行されているが、期待される時刻ではない`
        });
      }
    });
  }
});

// 異常な実行回数を検出
Object.entries(endpointStats).forEach(([path, stats]) => {
  const expected = expectedCronJobs[path];
  if (expected) {
    const logPeriodHours = 7.5; // UTC 18:00 - 01:30
    let expectedInPeriod;
    
    if (expected.expectedPerDay) {
      expectedInPeriod = (expected.expectedPerDay / 24) * logPeriodHours;
    } else if (expected.expectedHours) {
      // ログ期間内に期待される実行回数を計算
      const startHour = 18;
      const endHour = 1;
      let count = 0;
      expected.expectedHours.forEach(hour => {
        if (hour >= startHour || hour <= endHour) {
          count++;
        }
      });
      expectedInPeriod = count;
    }
    
    if (expectedInPeriod) {
      const ratio = stats.total / expectedInPeriod;
      if (ratio > 5) {
        bugs.abnormalCounts.push({
          path,
          expected: expectedInPeriod.toFixed(1),
          actual: stats.total,
          ratio: ratio.toFixed(1),
          reason: `実行回数が期待値の${ratio.toFixed(1)}倍（手動実行やデバッグ実行の可能性）`
        });
      } else if (ratio < 0.5 && stats.total > 0) {
        bugs.abnormalCounts.push({
          path,
          expected: expectedInPeriod.toFixed(1),
          actual: stats.total,
          ratio: ratio.toFixed(1),
          reason: `実行回数が期待値の${(ratio * 100).toFixed(1)}%しかない`
        });
      }
    }
  }
});

// レポート出力
console.log('=== 1. 実行されていないCron Jobs ===\n');
if (bugs.missingExecutions.length === 0) {
  console.log('✅ すべてのCron Jobsが実行されています\n');
} else {
  bugs.missingExecutions.forEach((bug, index) => {
    console.log(`${index + 1}. ❌ ${bug.path}`);
    console.log(`   期待スケジュール: ${bug.expectedSchedule}`);
    if (bug.missingHour !== undefined) {
      console.log(`   欠落時刻: UTC ${bug.missingHour}:00`);
      console.log(`   実際の実行時刻: UTC ${bug.executedHours.join(', ')}`);
    }
    console.log(`   理由: ${bug.reason}`);
    console.log('');
  });
}

console.log('\n=== 2. 間違った時刻に実行されているCron Jobs ===\n');
if (bugs.wrongTiming.length === 0) {
  console.log('✅ すべてのCron Jobsが正しい時刻に実行されています\n');
} else {
  bugs.wrongTiming.forEach((bug, index) => {
    console.log(`${index + 1}. ⚠️ ${bug.path}`);
    console.log(`   期待される時刻: UTC ${bug.expectedHours.join(', ')}`);
    console.log(`   間違った時刻: UTC ${bug.wrongHour}:00`);
    console.log(`   理由: ${bug.reason}`);
    console.log('');
  });
}

console.log('\n=== 3. エラー（4xx/5xxステータスコード）===\n');
if (bugs.errors.length === 0) {
  console.log('✅ エラーは発生していません\n');
} else {
  console.log(`合計: ${bugs.errors.length}件のエラー\n`);
  bugs.errors.slice(0, 10).forEach((error, index) => {
    console.log(`${index + 1}. ❌ ${error.path} - ${error.status} - ${error.time}`);
    console.log(`   ${error.message.substring(0, 200)}`);
    console.log('');
  });
  if (bugs.errors.length > 10) {
    console.log(`... 他 ${bugs.errors.length - 10}件のエラー`);
  }
}

console.log('\n=== 4. ファイルシステムエラー（EROFS）===\n');
if (bugs.fileSystemErrors.length === 0) {
  console.log('✅ ファイルシステムエラーは発生していません\n');
} else {
  console.log(`合計: ${bugs.fileSystemErrors.length}件\n`);
  const grouped = {};
  bugs.fileSystemErrors.forEach(err => {
    const key = err.path;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(err);
  });
  Object.entries(grouped).forEach(([path, errs]) => {
    console.log(`❌ ${path}: ${errs.length}件`);
    console.log(`   最初: ${errs[0].time}, 最後: ${errs[errs.length - 1].time}`);
    console.log(`   メッセージ: ${errs[0].message.substring(0, 150)}`);
    console.log('');
  });
}

console.log('\n=== 5. 未定義変数エラー ===\n');
if (bugs.undefinedVariables.length === 0) {
  console.log('✅ 未定義変数エラーは発生していません\n');
} else {
  console.log(`合計: ${bugs.undefinedVariables.length}件\n`);
  bugs.undefinedVariables.forEach((bug, index) => {
    console.log(`${index + 1}. ❌ ${bug.path} - ${bug.time}`);
    console.log(`   ${bug.message.substring(0, 200)}`);
    console.log('');
  });
}

console.log('\n=== 6. モジュールが見つからないエラー ===\n');
if (bugs.missingModules.length === 0) {
  console.log('✅ モジュールが見つからないエラーは発生していません\n');
} else {
  console.log(`合計: ${bugs.missingModules.length}件\n`);
  bugs.missingModules.forEach((bug, index) => {
    console.log(`${index + 1}. ❌ ${bug.path} - ${bug.time}`);
    console.log(`   ${bug.message.substring(0, 200)}`);
    console.log('');
  });
}

console.log('\n=== 7. スキップされた投稿 ===\n');
if (bugs.skippedPosts.length === 0) {
  console.log('✅ スキップされた投稿はありません\n');
} else {
  console.log(`合計: ${bugs.skippedPosts.length}件\n`);
  const grouped = {};
  bugs.skippedPosts.forEach(skip => {
    const key = `${skip.path}:${skip.message.substring(0, 100)}`;
    if (!grouped[key]) {
      grouped[key] = { count: 0, path: skip.path, message: skip.message, times: [] };
    }
    grouped[key].count++;
    grouped[key].times.push(skip.time);
  });
  Object.values(grouped)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .forEach((skip, index) => {
      console.log(`${index + 1}. ⚠️ ${skip.path} (${skip.count}回)`);
      console.log(`   ${skip.message.substring(0, 200)}`);
      console.log(`   最初: ${skip.times[0]}, 最後: ${skip.times[skip.times.length - 1]}`);
      console.log('');
    });
}

console.log('\n=== 8. 異常な実行回数 ===\n');
if (bugs.abnormalCounts.length === 0) {
  console.log('✅ 異常な実行回数はありません\n');
} else {
  bugs.abnormalCounts.forEach((bug, index) => {
    console.log(`${index + 1}. ⚠️ ${bug.path}`);
    console.log(`   期待値: ${bug.expected}回`);
    console.log(`   実際: ${bug.actual}回`);
    console.log(`   比率: ${bug.ratio}倍`);
    console.log(`   理由: ${bug.reason}`);
    console.log('');
  });
}

console.log('\n=== 9. 非推奨警告 ===\n');
if (bugs.deprecatedWarnings.length === 0) {
  console.log('✅ 非推奨警告はありません\n');
} else {
  console.log(`合計: ${bugs.deprecatedWarnings.length}件\n`);
  const grouped = {};
  bugs.deprecatedWarnings.forEach(warn => {
    const key = warn.message.substring(0, 100);
    if (!grouped[key]) {
      grouped[key] = { count: 0, path: warn.path, message: warn.message, times: [] };
    }
    grouped[key].count++;
    grouped[key].times.push(warn.time);
  });
  Object.values(grouped)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .forEach((warn, index) => {
      console.log(`${index + 1}. ⚠️ ${warn.path} (${warn.count}回)`);
      console.log(`   ${warn.message.substring(0, 200)}`);
      console.log('');
    });
}

// 総合サマリー
console.log('\n=== 総合サマリー ===\n');
console.log(`実行されていないCron Jobs: ${bugs.missingExecutions.length}件`);
console.log(`間違った時刻に実行: ${bugs.wrongTiming.length}件`);
console.log(`エラー（4xx/5xx）: ${bugs.errors.length}件`);
console.log(`ファイルシステムエラー: ${bugs.fileSystemErrors.length}件`);
console.log(`未定義変数エラー: ${bugs.undefinedVariables.length}件`);
console.log(`モジュールが見つからない: ${bugs.missingModules.length}件`);
console.log(`スキップされた投稿: ${bugs.skippedPosts.length}件`);
console.log(`異常な実行回数: ${bugs.abnormalCounts.length}件`);
console.log(`非推奨警告: ${bugs.deprecatedWarnings.length}件`);

const totalBugs = bugs.missingExecutions.length + bugs.wrongTiming.length + bugs.errors.length + 
                  bugs.fileSystemErrors.length + bugs.undefinedVariables.length + bugs.missingModules.length +
                  bugs.abnormalCounts.length;
console.log(`\n合計不具合数: ${totalBugs}件`);
