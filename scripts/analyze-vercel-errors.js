#!/usr/bin/env node
// scripts/analyze-vercel-errors.js
// 保存されたVercelエラーログの分析スクリプト

const fs = require('fs');
const path = require('path');

const ERROR_LOG_FILE = path.join(__dirname, '..', 'data', 'vercel-logs', 'error-logs.json');

if (!fs.existsSync(ERROR_LOG_FILE)) {
  console.error(`❌ エラーログファイルが見つかりません: ${ERROR_LOG_FILE}`);
  console.error('   先に scripts/fetch-vercel-logs.js を実行してください。');
  process.exit(1);
}

console.log('📊 Vercelエラーログの分析\n');

let errorLogs;
try {
  errorLogs = JSON.parse(fs.readFileSync(ERROR_LOG_FILE, 'utf-8'));
} catch (error) {
  console.error(`❌ エラーログファイルの読み込みに失敗しました: ${error.message}`);
  process.exit(1);
}

if (!Array.isArray(errorLogs)) {
  console.error('❌ エラーログファイルの形式が不正です（配列である必要があります）。');
  process.exit(1);
}

if (errorLogs.length === 0) {
  console.log('✅ エラーログはありません。');
  process.exit(0);
}

// エラーパターンの集計
const errorPatterns = {};
const errorTypes = {};
const errorFiles = {};
const errorTimestamps = [];

errorLogs.forEach(log => {
  if (!log || typeof log !== 'object') return;
  
  const message = (log.message || log.text || '').toString();
  const timestamp = log.timestamp || log.time || log.createdAt || 'unknown';
  
  // エラーパターン
  let pattern = 'Other';
  if (message.includes('SyntaxError')) pattern = 'SyntaxError';
  else if (message.includes('ReferenceError')) pattern = 'ReferenceError';
  else if (message.includes('TypeError')) pattern = 'TypeError';
  else if (message.includes('Cannot find module')) pattern = 'ModuleNotFound';
  else if (message.includes('timeout')) pattern = 'Timeout';
  
  errorPatterns[pattern] = (errorPatterns[pattern] || 0) + 1;

  // エラータイプ（より詳細）
  const typeMatch = message.match(/(SyntaxError|ReferenceError|TypeError|Error):/);
  if (typeMatch) {
    const type = typeMatch[1];
    errorTypes[type] = (errorTypes[type] || 0) + 1;
  }

  // ファイル名
  const fileMatch = message.match(/([\/\\][\w\-_\/\\]+\.(js|ts|json))/);
  if (fileMatch) {
    const file = fileMatch[1];
    errorFiles[file] = (errorFiles[file] || 0) + 1;
  }

  if (timestamp !== 'unknown') {
    errorTimestamps.push(timestamp);
  }
});

// 結果を表示
console.log(`総エラー数: ${errorLogs.length}件\n`);

console.log('📋 エラーパターン:');
Object.entries(errorPatterns)
  .sort((a, b) => b[1] - a[1])
  .forEach(([pattern, count]) => {
    console.log(`  - ${pattern}: ${count}件`);
  });

if (Object.keys(errorTypes).length > 0) {
  console.log('\n📋 エラータイプ:');
  Object.entries(errorTypes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}件`);
    });
}

if (Object.keys(errorFiles).length > 0) {
  console.log('\n📁 エラーが発生したファイル（トップ10）:');
  Object.entries(errorFiles)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([file, count]) => {
      console.log(`  - ${file}: ${count}件`);
    });
}

if (errorTimestamps.length > 0) {
  const sortedTimestamps = errorTimestamps.sort();
  console.log(`\n⏰ エラー発生期間:`);
  console.log(`  - 最初: ${sortedTimestamps[0]}`);
  console.log(`  - 最後: ${sortedTimestamps[sortedTimestamps.length - 1]}`);
}

// 詳細なエラーサマリー
console.log('\n📝 エラー詳細（最初の5件）:');
errorLogs.slice(0, 5).forEach((log, index) => {
  const message = log.message || log.text || 'No message';
  const timestamp = log.timestamp || log.time || log.createdAt || 'unknown';
  console.log(`\n  ${index + 1}. [${timestamp}]`);
  console.log(`     ${message.substring(0, 200)}${message.length > 200 ? '...' : ''}`);
});

console.log('\n💾 完全なエラーログ:', ERROR_LOG_FILE);
