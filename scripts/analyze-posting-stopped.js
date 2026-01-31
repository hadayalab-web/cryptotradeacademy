// scripts/analyze-posting-stopped.js
// 投稿停止の原因を分析するスクリプト

const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../../Downloads/logs_result.json');

console.log('📊 ログファイルを読み込み中...\n');

try {
  const rawData = fs.readFileSync(logFile, 'utf8');
  const logs = JSON.parse(rawData);
  
  console.log(`✅ ログエントリ数: ${logs.length}\n`);
  
  // 時間順にソート（最新が最後）
  logs.sort((a, b) => {
    const timeA = new Date(a.TimeUTC || a.timestampInMs || 0);
    const timeB = new Date(b.TimeUTC || b.timestampInMs || 0);
    return timeA - timeB;
  });
  
  // 最新の10分間のログを抽出
  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
  
  const recentLogs = logs.filter(log => {
    const logTime = new Date(log.TimeUTC || log.timestampInMs || 0);
    return logTime >= tenMinutesAgo;
  });
  
  console.log(`📅 最新10分間のログエントリ数: ${recentLogs.length}\n`);
  
  // Quote Repost関連のログを抽出
  const quoteRepostLogs = recentLogs.filter(log => 
    log.message && (
      log.message.includes('Quote Repost') ||
      log.message.includes('QuoteRepost') ||
      log.function && log.function.includes('quote-repost')
    )
  );
  
  console.log(`🔍 Quote Repost関連のログ: ${quoteRepostLogs.length}件\n`);
  
  // スキップされたログを抽出
  const skippedLogs = quoteRepostLogs.filter(log => 
    log.message && (
      log.message.includes('SKIPPED') ||
      log.message.includes('skipped') ||
      log.message.includes('Hourly post limit') ||
      log.message.includes('Not quote repost peak time') ||
      log.message.includes('time_window_check') ||
      log.message.includes('hourly_limit_check')
    )
  );
  
  console.log(`⏸️ スキップされたログ: ${skippedLogs.length}件\n`);
  
  // 成功した投稿のログを抽出
  const successLogs = quoteRepostLogs.filter(log => 
    log.message && (
      log.message.includes('SUCCESSFULLY POSTED') ||
      log.message.includes('posted successfully') ||
      log.message.includes('posted_count') && log.message.match(/posted_count[:\s]+[1-9]/)
    )
  );
  
  console.log(`✅ 成功した投稿のログ: ${successLogs.length}件\n`);
  
  // 時間制限関連のログを抽出
  const hourlyLimitLogs = quoteRepostLogs.filter(log => 
    log.message && (
      log.message.includes('Hourly post limit') ||
      log.message.includes('hourly_limit') ||
      log.message.includes('currentHourlyPostCount')
    )
  );
  
  console.log(`⏰ 時間制限関連のログ: ${hourlyLimitLogs.length}件\n`);
  
  // 時間帯制御関連のログを抽出
  const timeWindowLogs = quoteRepostLogs.filter(log => 
    log.message && (
      log.message.includes('Not quote repost peak time') ||
      log.message.includes('time_window') ||
      log.message.includes('currentHour')
    )
  );
  
  console.log(`🕐 時間帯制御関連のログ: ${timeWindowLogs.length}件\n`);
  
  // 詳細分析
  console.log('='.repeat(80));
  console.log('📋 詳細分析結果');
  console.log('='.repeat(80));
  
  if (skippedLogs.length > 0) {
    console.log('\n⏸️ スキップされたログ（最新10件）:');
    skippedLogs.slice(-10).forEach((log, index) => {
      const time = log.TimeUTC || new Date(log.timestampInMs || 0).toISOString();
      const message = log.message || '';
      console.log(`\n${index + 1}. [${time}] ${message.substring(0, 200)}`);
    });
  }
  
  if (hourlyLimitLogs.length > 0) {
    console.log('\n⏰ 時間制限関連のログ（最新10件）:');
    hourlyLimitLogs.slice(-10).forEach((log, index) => {
      const time = log.TimeUTC || new Date(log.timestampInMs || 0).toISOString();
      const message = log.message || '';
      console.log(`\n${index + 1}. [${time}] ${message.substring(0, 200)}`);
    });
  }
  
  if (timeWindowLogs.length > 0) {
    console.log('\n🕐 時間帯制御関連のログ（最新10件）:');
    timeWindowLogs.slice(-10).forEach((log, index) => {
      const time = log.TimeUTC || new Date(log.timestampInMs || 0).toISOString();
      const message = log.message || '';
      console.log(`\n${index + 1}. [${time}] ${message.substring(0, 200)}`);
    });
  }
  
  if (successLogs.length > 0) {
    console.log('\n✅ 成功した投稿のログ（最新10件）:');
    successLogs.slice(-10).forEach((log, index) => {
      const time = log.TimeUTC || new Date(log.timestampInMs || 0).toISOString();
      const message = log.message || '';
      console.log(`\n${index + 1}. [${time}] ${message.substring(0, 200)}`);
    });
  }
  
  // 最新のログを表示
  console.log('\n' + '='.repeat(80));
  console.log('📅 最新のログ（最新20件）:');
  console.log('='.repeat(80));
  
  quoteRepostLogs.slice(-20).forEach((log, index) => {
    const time = log.TimeUTC || new Date(log.timestampInMs || 0).toISOString();
    const message = log.message || '';
    const status = log.responseStatusCode || '';
    console.log(`\n${index + 1}. [${time}] [${status}] ${message.substring(0, 150)}`);
  });
  
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
    console.log('   - 定義されている時間帯（UTC 0, 1, 2, 4, 6, 8, 10, 12, 15, 16, 18, 20, 21, 22）まで待つ');
    console.log('   - または getPeakMapForHour に現在時刻を追加');
  }
  
  if (hourlyLimitCount === 0 && timeWindowCount === 0 && successLogs.length === 0) {
    console.log('\n⚠️ その他の原因の可能性があります');
    console.log('   - CronJobの実行エラー');
    console.log('   - X APIのレート制限');
    console.log('   - ドライランモードが有効');
    console.log('   - タイムアウトエラー');
  }
  
} catch (error) {
  console.error('❌ エラー:', error.message);
  console.error(error.stack);
}
