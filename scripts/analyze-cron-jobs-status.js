// scripts/analyze-cron-jobs-status.js
// Cron Jobsのステータスを分析するスクリプト

const fs = require('fs');
const path = require('path');

const logFile = process.argv[2] || path.join(__dirname, '../c:/Users/chiba/Downloads/logs_result (11).json');

if (!fs.existsSync(logFile)) {
  console.error(`❌ ログファイルが見つかりません: ${logFile}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(logFile, 'utf8'));

const jobs = {};

data.forEach(log => {
  const func = log.function || log.requestPath.split('/').pop();
  if (!jobs[func]) {
    jobs[func] = {
      success: 0,
      error: 0,
      statusCodes: {},
      errors: []
    };
  }
  
  const status = log.responseStatusCode || '';
  
  if (status === 200 || status === 202) {
    jobs[func].success++;
  } else if (status >= 400) {
    jobs[func].error++;
    if (log.message && log.message.trim()) {
      jobs[func].errors.push({
        status,
        message: log.message.substring(0, 200),
        time: log.TimeUTC
      });
    }
  }
  
  jobs[func].statusCodes[status] = (jobs[func].statusCodes[status] || 0) + 1;
});

console.log('='.repeat(80));
console.log('📊 Cron Jobs 診断レポート');
console.log('='.repeat(80));
console.log();

const sortedJobs = Object.keys(jobs).sort();

sortedJobs.forEach(func => {
  const j = jobs[func];
  const total = j.success + j.error;
  const status = j.error === 0 ? '✅' : '❌';
  
  console.log(`${status} ${func}`);
  console.log(`   成功: ${j.success}回 / 失敗: ${j.error}回 (合計: ${total}回)`);
  
  Object.keys(j.statusCodes).sort().forEach(code => {
    console.log(`   ステータス ${code}: ${j.statusCodes[code]}回`);
  });
  
  if (j.errors.length > 0) {
    console.log(`   ⚠️ エラー詳細:`);
    j.errors.slice(0, 3).forEach(err => {
      console.log(`     [${err.time}] ${err.status}: ${err.message}`);
    });
    if (j.errors.length > 3) {
      console.log(`     ... 他 ${j.errors.length - 3}件のエラー`);
    }
  }
  
  console.log();
});

console.log('='.repeat(80));
console.log(`合計: ${sortedJobs.length}個のCron Jobs`);
console.log(`✅ 正常: ${sortedJobs.filter(f => jobs[f].error === 0).length}個`);
console.log(`❌ エラー: ${sortedJobs.filter(f => jobs[f].error > 0).length}個`);
console.log('='.repeat(80));
