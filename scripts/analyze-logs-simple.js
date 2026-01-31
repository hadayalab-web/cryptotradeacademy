// scripts/analyze-logs-simple.js
// ログファイルを分析する簡易スクリプト

const fs = require('fs');

const logFile = 'c:\\Users\\chiba\\Downloads\\logs_result.json';

console.log('📊 ログファイルを読み込み中...\n');

try {
  const rawData = fs.readFileSync(logFile, 'utf8');
  const logs = JSON.parse(rawData);
  
  console.log(`✅ ログエントリ数: ${logs.length}\n`);
  
  // Quote Repost関連のログを抽出
  const quoteRepostLogs = logs.filter(log => 
    (log.message && (
      log.message.includes('Quote Repost') ||
      log.message.includes('QuoteRepost')
    )) ||
    (log.function && log.function.includes('quote-repost'))
  );
  
  console.log(`🔍 Quote Repost関連のログ: ${quoteRepostLogs.length}件\n`);
  
  // 時間順にソート（最新が最後）
  quoteRepostLogs.sort((a, b) => {
    const timeA = new Date(a.TimeUTC || a.timestampInMs || 0);
    const timeB = new Date(b.TimeUTC || b.timestampInMs || 0);
    return timeA - timeB;
  });
  
  // 最新の50件を表示
  console.log('='.repeat(80));
  console.log('📅 最新のQuote Repostログ（最新50件）:');
  console.log('='.repeat(80));
  
  const recentLogs = quoteRepostLogs.slice(-50);
  recentLogs.forEach((log, index) => {
    const time = log.TimeUTC || new Date(log.timestampInMs || 0).toISOString();
    const message = (log.message || '').substring(0, 200);
    const status = log.responseStatusCode || '';
    console.log(`\n${index + 1}. [${time}] [${status}] ${message}`);
  });
  
  // スキップ関連のログを抽出
  const skippedLogs = quoteRepostLogs.filter(log => 
    log.message && (
      log.message.includes('SKIPPED') ||
      log.message.includes('skipped') ||
      log.message.includes('Hourly post limit') ||
      log.message.includes('Not quote repost peak time')
    )
  );
  
  console.log('\n' + '='.repeat(80));
  console.log(`⏸️ スキップ関連のログ: ${skippedLogs.length}件`);
  console.log('='.repeat(80));
  
  if (skippedLogs.length > 0) {
    skippedLogs.slice(-20).forEach((log, index) => {
      const time = log.TimeUTC || new Date(log.timestampInMs || 0).toISOString();
      const message = (log.message || '').substring(0, 300);
      console.log(`\n${index + 1}. [${time}] ${message}`);
    });
  }
  
  // 成功した投稿のログを抽出
  const successLogs = quoteRepostLogs.filter(log => 
    log.message && (
      log.message.includes('SUCCESSFULLY POSTED') ||
      log.message.includes('posted successfully') ||
      (log.message.includes('posted_count') && log.message.match(/posted_count[:\s]+[1-9]/))
    )
  );
  
  console.log('\n' + '='.repeat(80));
  console.log(`✅ 成功した投稿のログ: ${successLogs.length}件`);
  console.log('='.repeat(80));
  
  if (successLogs.length > 0) {
    successLogs.slice(-10).forEach((log, index) => {
      const time = log.TimeUTC || new Date(log.timestampInMs || 0).toISOString();
      const message = (log.message || '').substring(0, 200);
      console.log(`\n${index + 1}. [${time}] ${message}`);
    });
  }
  
  // UTC 9時台のログを抽出
  const utc9Logs = quoteRepostLogs.filter(log => {
    const time = log.TimeUTC || '';
    return time.includes('09:') || time.includes(' 09:');
  });
  
  console.log('\n' + '='.repeat(80));
  console.log(`🕘 UTC 9時台のログ: ${utc9Logs.length}件`);
  console.log('='.repeat(80));
  
  if (utc9Logs.length > 0) {
    utc9Logs.forEach((log, index) => {
      const time = log.TimeUTC || new Date(log.timestampInMs || 0).toISOString();
      const message = (log.message || '').substring(0, 200);
      console.log(`\n${index + 1}. [${time}] ${message}`);
    });
  }
  
} catch (error) {
  console.error('❌ エラー:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
}
