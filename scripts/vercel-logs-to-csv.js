#!/usr/bin/env node
// scripts/vercel-logs-to-csv.js
// VercelログをCSV形式に変換（Vercel Dashboardと同じ形式）
// Cursorが直接読み取れるようにするため

const fs = require('fs');
const path = require('path');

const ERROR_LOG_FILE = path.join(__dirname, '..', 'data', 'vercel-logs', 'error-logs.json');
const CSV_OUTPUT_FILE = path.join(__dirname, '..', 'data', 'vercel-logs', 'latest-errors.csv');
const LATEST_CSV_FILE = path.join(__dirname, '..', 'data', 'vercel-logs', 'latest-vercel-errors.csv');

/**
 * VercelエラーログをCSV形式に変換
 */
function convertToCSV() {
  if (!fs.existsSync(ERROR_LOG_FILE)) {
    if (require.main === module) {
      console.error(`❌ エラーログファイルが見つかりません: ${ERROR_LOG_FILE}`);
      console.error('   先に npm run vercel:logs を実行してください。');
      process.exit(1);
    }
    return { success: false, error: 'Error log file not found' };
  }

  if (require.main === module) {
    console.log('📊 VercelエラーログをCSV形式に変換中...\n');
  }

  let errorLogs;
  try {
    errorLogs = JSON.parse(fs.readFileSync(ERROR_LOG_FILE, 'utf-8'));
  } catch (error) {
    if (require.main === module) {
      console.error(`❌ エラーログファイルの読み込みに失敗しました: ${error.message}`);
      process.exit(1);
    }
    return { success: false, error: error.message };
  }

  if (!Array.isArray(errorLogs) || errorLogs.length === 0) {
    if (require.main === module) {
      console.log('✅ エラーログはありません。CSVファイルは作成しません。');
      process.exit(0);
    }
    return { success: true, count: 0 };
  }

// CSVヘッダー（Vercel Dashboardと同じ形式）
const csvHeaders = [
  'TimeUTC',
  'timestampInMs',
  'requestPath',
  'requestMethod',
  'requestQueryString',
  'responseStatusCode',
  'requestId',
  'requestUserAgent',
  'level',
  'environment',
  'branch',
  'vercelCache',
  'type',
  'function',
  'host',
  'deploymentDomain',
  'deploymentId',
  'durationMs',
  'region',
  'maxMemoryUsed',
  'memorySize',
  'message',
  'projectId',
  'traceId',
  'sessionId',
  'invocationId',
  'instanceId',
  'concurrency'
];

/**
 * CSVエスケープ（改行、カンマ、ダブルクォートを処理）
 */
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  
  const str = String(value);
  
  // ダブルクォートを含む、または改行を含む場合は全体をダブルクォートで囲む
  if (str.includes('"') || str.includes('\n') || str.includes(',') || str.includes('\r')) {
    // ダブルクォートを二重化してエスケープ
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * ログオブジェクトをCSV行に変換
 */
function logToCSVRow(log) {
  const row = [];
  
  // タイムスタンプ処理
  const timestamp = log.timestamp || log.time || log.createdAt || log.TimeUTC || '';
  const timestampMs = log.timestampInMs || log.timestamp || (timestamp ? new Date(timestamp).getTime() : '');
  
  // メッセージ処理（改行を保持）
  const message = log.message || log.text || '';
  
  row.push(escapeCSV(timestamp));
  row.push(escapeCSV(timestampMs));
  row.push(escapeCSV(log.requestPath || log.path || ''));
  row.push(escapeCSV(log.requestMethod || log.method || ''));
  row.push(escapeCSV(log.requestQueryString || ''));
  row.push(escapeCSV(log.responseStatusCode || log.statusCode || log.status || ''));
  row.push(escapeCSV(log.requestId || log.id || ''));
  row.push(escapeCSV(log.requestUserAgent || log.userAgent || ''));
  row.push(escapeCSV(log.level || log.type || ''));
  row.push(escapeCSV(log.environment || log.env || ''));
  row.push(escapeCSV(log.branch || ''));
  row.push(escapeCSV(log.vercelCache || ''));
  row.push(escapeCSV(log.type || ''));
  row.push(escapeCSV(log.function || log.fn || ''));
  row.push(escapeCSV(log.host || ''));
  row.push(escapeCSV(log.deploymentDomain || log.domain || ''));
  row.push(escapeCSV(log.deploymentId || log.deployment || ''));
  row.push(escapeCSV(log.durationMs || log.duration || ''));
  row.push(escapeCSV(log.region || ''));
  row.push(escapeCSV(log.maxMemoryUsed || log.memory || ''));
  row.push(escapeCSV(log.memorySize || ''));
  row.push(escapeCSV(message));
  row.push(escapeCSV(log.projectId || log.project || ''));
  row.push(escapeCSV(log.traceId || log.trace || ''));
  row.push(escapeCSV(log.sessionId || log.session || ''));
  row.push(escapeCSV(log.invocationId || log.invocation || ''));
  row.push(escapeCSV(log.instanceId || log.instance || ''));
  row.push(escapeCSV(log.concurrency || ''));
  
  return row.join(',');
}

// CSVデータを生成
const csvRows = [csvHeaders.join(',')];
errorLogs.forEach(log => {
  csvRows.push(logToCSVRow(log));
});

const csvContent = csvRows.join('\n');

// CSVファイルを保存（2つの場所に保存してCursorが読み取りやすくする）
try {
  fs.writeFileSync(CSV_OUTPUT_FILE, csvContent, 'utf-8');
  console.log(`✅ CSVファイルを保存: ${CSV_OUTPUT_FILE}`);
  
  // 最新のエラーログとしても保存（Cursorが@で参照しやすいように）
  fs.writeFileSync(LATEST_CSV_FILE, csvContent, 'utf-8');
  console.log(`✅ 最新エラーログとして保存: ${LATEST_CSV_FILE}`);
  
  console.log(`\n📊 エラーログ数: ${errorLogs.length}件`);
  console.log(`\n💡 Cursorで直接読み取るには:`);
  console.log(`   @data/vercel-logs/latest-vercel-errors.csv`);
  console.log(`   または`);
  console.log(`   @data/vercel-logs/latest-errors.csv`);
  
  return { success: true, csvFile: LATEST_CSV_FILE, count: errorLogs.length };
} catch (error) {
  console.error(`❌ CSVファイルの保存に失敗しました: ${error.message}`);
  if (require.main === module) {
    process.exit(1);
  }
  throw error;
}
}

// モジュールとして使用する場合
if (require.main === module) {
  // 直接実行された場合
  convertToCSV();
} else {
  // 他のスクリプトからrequireされた場合
  module.exports = { convertToCSV };
}
