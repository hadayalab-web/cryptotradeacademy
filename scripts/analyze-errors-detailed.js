// scripts/analyze-errors-detailed.js
// エラーの詳細分析スクリプト

const fs = require('fs');
const path = require('path');

const logFile = process.argv[2] || path.join(__dirname, '../c:/Users/chiba/Downloads/logs_result (11).json');

if (!fs.existsSync(logFile)) {
  console.error(`❌ ログファイルが見つかりません: ${logFile}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(logFile, 'utf8'));

// エラーを抽出
const errors = data.filter(log => 
  (log.responseStatusCode >= 400 || log.level === 'error') && 
  log.function && 
  log.function.startsWith('/api/')
);

// エラーをグループ化
const errorGroups = {};
errors.forEach(log => {
  const func = log.function;
  if (!errorGroups[func]) {
    errorGroups[func] = [];
  }
  errorGroups[func].push({
    time: log.TimeUTC,
    status: log.responseStatusCode,
    message: log.message || '',
    deploymentId: log.deploymentId,
    requestId: log.requestId
  });
});

// エラー詳細レポート
console.log('='.repeat(80));
console.log('🔍 エラー詳細分析レポート');
console.log('='.repeat(80));
console.log();

Object.keys(errorGroups).sort().forEach(func => {
  const errs = errorGroups[func];
  const uniqueMessages = new Set();
  errs.forEach(e => {
    if (e.message && e.message.trim()) {
      uniqueMessages.add(e.message.substring(0, 500));
    }
  });
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`❌ ${func}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`発生回数: ${errs.length}回`);
  console.log(`ステータスコード: ${errs[0].status}`);
  console.log(`デプロイID: ${errs[0].deploymentId}`);
  console.log(`\nエラーメッセージ（ユニーク）:`);
  Array.from(uniqueMessages).slice(0, 3).forEach((msg, idx) => {
    console.log(`\n[${idx + 1}] ${msg}`);
  });
  console.log(`\n発生時刻（最新5件）:`);
  errs.slice(0, 5).forEach(e => {
    console.log(`  - ${e.time} (Request ID: ${e.requestId})`);
  });
});

console.log(`\n${'='.repeat(80)}`);
console.log(`合計エラー数: ${errors.length}件`);
console.log(`エラー発生Cron Jobs: ${Object.keys(errorGroups).length}個`);
console.log('='.repeat(80));
