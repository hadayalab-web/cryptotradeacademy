// scripts/parse-logs-json.js
// ログファイルを解析するスクリプト

const fs = require('fs');
const path = require('path');

const logFile = path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads', 'logs_result.json');

console.log('📊 ログファイルを読み込み中...');
console.log(`ファイルパス: ${logFile}\n`);

try {
  if (!fs.existsSync(logFile)) {
    console.error(`❌ ファイルが見つかりません: ${logFile}`);
    console.log('\n代替パスを試します...');
    const altPath = 'c:\\Users\\chiba\\Downloads\\logs_result.json';
    if (fs.existsSync(altPath)) {
      console.log(`✅ ファイルが見つかりました: ${altPath}`);
      analyzeLogs(altPath);
    } else {
      console.error(`❌ ファイルが見つかりません: ${altPath}`);
      console.log('\n手動でファイルパスを指定してください:');
      console.log('node scripts/parse-logs-json.js <ファイルパス>');
    }
  } else {
    analyzeLogs(logFile);
  }
} catch (error) {
  console.error('❌ エラー:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
}

function analyzeLogs(filePath) {
  console.log(`\n📂 ファイルサイズ: ${(fs.statSync(filePath).size / 1024 / 1024).toFixed(2)} MB\n`);
  
  const rawData = fs.readFileSync(filePath, 'utf8');
  console.log('📝 JSONをパース中...\n');
  
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
  
  // UTC 9時台のログを抽出
  const utc9Logs = quoteRepostLogs.filter(log => {
    const time = log.TimeUTC || '';
    return time.includes('09:');
  });
  
  console.log(`🕘 UTC 9時台のログ: ${utc9Logs.length}件\n`);
  
  // 最新の20件を表示
  console.log('='.repeat(80));
  console.log('📅 最新のQuote Repostログ（最新20件）:');
  console.log('='.repeat(80));
  
  const recentLogs = quoteRepostLogs.slice(-20);
  recentLogs.forEach((log, index) => {
    const time = log.TimeUTC || new Date(log.timestampInMs || 0).toISOString();
    const message = (log.message || '').substring(0, 250);
    const status = log.responseStatusCode || '';
    console.log(`\n${index + 1}. [${time}] [${status}]`);
    console.log(`   ${message}`);
  });
  
  // UTC 9時台のログを表示
  if (utc9Logs.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('🕘 UTC 9時台のログ（すべて）:');
    console.log('='.repeat(80));
    
    utc9Logs.forEach((log, index) => {
      const time = log.TimeUTC || new Date(log.timestampInMs || 0).toISOString();
      const message = (log.message || '').substring(0, 300);
      const status = log.responseStatusCode || '';
      console.log(`\n${index + 1}. [${time}] [${status}]`);
      console.log(`   ${message}`);
    });
  }
  
  // スキップ関連のログを抽出
  const skippedLogs = quoteRepostLogs.filter(log => 
    log.message && (
      log.message.includes('SKIPPED') ||
      log.message.includes('skipped') ||
      log.message.includes('Hourly post limit') ||
      log.message.includes('Not quote repost peak time') ||
      log.message.includes('time_window') ||
      log.message.includes('hourly_limit')
    )
  );
  
  console.log('\n' + '='.repeat(80));
  console.log(`⏸️ スキップ関連のログ: ${skippedLogs.length}件`);
  console.log('='.repeat(80));
  
  if (skippedLogs.length > 0) {
    skippedLogs.slice(-30).forEach((log, index) => {
      const time = log.TimeUTC || new Date(log.timestampInMs || 0).toISOString();
      const message = (log.message || '').substring(0, 400);
      console.log(`\n${index + 1}. [${time}]`);
      console.log(`   ${message}`);
    });
  } else {
    console.log('\n⚠️ スキップ関連のログが見つかりませんでした');
  }
  
  // 成功した投稿のログを抽出
  const successLogs = quoteRepostLogs.filter(log => 
    log.message && (
      log.message.includes('SUCCESSFULLY POSTED') ||
      log.message.includes('posted successfully') ||
      (log.message.includes('posted_count') && log.message.match(/posted_count[:\s]+[1-9]/)) ||
      log.message.includes('quoteTweetId')
    )
  );
  
  console.log('\n' + '='.repeat(80));
  console.log(`✅ 成功した投稿のログ: ${successLogs.length}件`);
  console.log('='.repeat(80));
  
  if (successLogs.length > 0) {
    successLogs.slice(-20).forEach((log, index) => {
      const time = log.TimeUTC || new Date(log.timestampInMs || 0).toISOString();
      const message = (log.message || '').substring(0, 250);
      console.log(`\n${index + 1}. [${time}]`);
      console.log(`   ${message}`);
    });
  } else {
    console.log('\n⚠️ 成功した投稿のログが見つかりませんでした');
  }
  
  // 統計情報
  console.log('\n' + '='.repeat(80));
  console.log('📊 統計情報');
  console.log('='.repeat(80));
  
  const hourlyLimitCount = skippedLogs.filter(log => 
    log.message && log.message.includes('Hourly post limit')
  ).length;
  
  const timeWindowCount = skippedLogs.filter(log => 
    log.message && log.message.includes('Not quote repost peak time')
  ).length;
  
  console.log(`\n⏰ 時間制限でスキップ: ${hourlyLimitCount}件`);
  console.log(`🕐 時間帯制御でスキップ: ${timeWindowCount}件`);
  console.log(`✅ 成功した投稿: ${successLogs.length}件`);
  console.log(`🕘 UTC 9時台のログ: ${utc9Logs.length}件`);
  
  // 推奨事項
  console.log('\n' + '='.repeat(80));
  console.log('💡 推奨事項');
  console.log('='.repeat(80));
  
  if (hourlyLimitCount > 0) {
    console.log('\n⚠️ 時間制限（X_MAX_HOURLY_POSTS: 100/時間）に達している可能性があります');
    console.log('   - 次の時間（UTC）まで待つ');
    console.log('   - または X_MAX_HOURLY_POSTS を一時的に増やす（X APIレート制限内で）');
  }
  
  if (timeWindowCount > 0) {
    console.log('\n⚠️ 時間帯制御でスキップされている可能性があります');
    console.log('   - UTC 9時は定義されていない時間帯です');
    console.log('   - 定義されている時間帯（UTC 0, 1, 2, 4, 6, 8, 10, 12, 15, 16, 18, 20, 21, 22）まで待つ');
    console.log('   - または getPeakMapForHour に UTC 9時を追加');
  }
  
  if (utc9Logs.length > 0 && timeWindowCount === 0 && hourlyLimitCount === 0) {
    console.log('\n⚠️ UTC 9時台のログがありますが、スキップの理由が明確ではありません');
    console.log('   - ログの詳細を確認してください');
    console.log('   - 時間帯制御（getPeakMapForHour）で UTC 9時が定義されていない可能性があります');
  }
  
  if (hourlyLimitCount === 0 && timeWindowCount === 0 && successLogs.length === 0) {
    console.log('\n⚠️ その他の原因の可能性があります');
    console.log('   - CronJobの実行エラー');
    console.log('   - X APIのレート制限');
    console.log('   - ドライランモードが有効');
    console.log('   - タイムアウトエラー');
  }
}
