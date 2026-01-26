// scripts/check-impressions-raw.js
// インプレッション関連ログの生データ確認

const fs = require('fs');

const logFile = 'c:/Users/chiba/Downloads/logs_result (3).json';

try {
  const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  
  const impressionLogs = logs.filter(l => {
    const m = (l.message || l.text || '').toLowerCase();
    return m.includes('impression') || m.includes('impression_count');
  });
  
  console.log('インプレッション関連ログ:', impressionLogs.length);
  console.log();
  
  impressionLogs.slice(0, 10).forEach((log, i) => {
    console.log(`${i + 1}. [${log.TimeUTC || log.timestamp}]`);
    console.log(`   Endpoint: ${log.requestPath || log.function || 'unknown'}`);
    const msg = (log.message || log.text || '');
    console.log(`   Message: ${msg.substring(0, 1000)}`);
    console.log();
  });
  
  // 数値を含むログを探す
  console.log('='.repeat(100));
  console.log('数値を含むインプレッションログ:');
  console.log('='.repeat(100));
  
  impressionLogs.forEach((log, i) => {
    const msg = log.message || log.text || '';
    // 数字を探す
    const numbers = msg.match(/\d{4,}/g);
    if (numbers && numbers.length > 0) {
      console.log(`\n${i + 1}. [${log.TimeUTC || log.timestamp}]`);
      console.log(`   見つかった数値: ${numbers.join(', ')}`);
      console.log(`   メッセージ: ${msg.substring(0, 500)}`);
    }
  });
  
} catch (error) {
  console.error('エラー:', error.message);
  process.exit(1);
}
