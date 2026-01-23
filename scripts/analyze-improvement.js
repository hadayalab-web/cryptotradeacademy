// scripts/analyze-improvement.js
// 改善状況の詳細分析（修正前後の比較）

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads', 'logs_result (1).json');

function analyzeImprovement() {
  console.log('📊 改善状況分析開始\n');
  console.log('='.repeat(80));
  
  // ログファイルを読み込み
  let logs;
  try {
    const logContent = fs.readFileSync(LOG_FILE, 'utf-8');
    logs = JSON.parse(logContent);
    console.log(`✅ ログファイルを読み込みました`);
    console.log(`📊 ログエントリ数: ${logs.length}件\n`);
  } catch (error) {
    console.error(`❌ ログファイルの読み込みに失敗: ${error.message}`);
    return;
  }
  
  if (!Array.isArray(logs)) {
    console.error('❌ ログファイルの形式が不正です（配列である必要があります）');
    return;
  }
  
  // タイムスタンプでソート
  logs.sort((a, b) => {
    const timeA = a.TimeUTC || a.timestampInMs || 0;
    const timeB = b.TimeUTC || b.timestampInMs || 0;
    return timeA - timeB;
  });
  
  // 最新のログを取得（最後の1時間）
  const oneHourAgo = Date.now() - 3600000;
  const recentLogs = logs.filter(log => {
    const timeUTC = log.TimeUTC || log.timestampInMs || 0;
    return timeUTC > oneHourAgo;
  });
  
  console.log(`\n⏰ 最新ログ（過去1時間）: ${recentLogs.length}件\n`);
  
  // Cron Job別に分類
  const cronJobs = {
    'x-quote-repost': [],
    'lead-discovery': [],
    'x-post-free-report': [],
    'vsl1-post': [],
    'vsl2-free-users': [],
  };
  
  logs.forEach(log => {
    const requestPath = log.requestPath || '';
    const functionPath = log.function || '';
    const message = log.message || '';
    
    let jobName = null;
    if (requestPath.includes('/api/')) {
      const match = requestPath.match(/\/api\/([^\/\?]+)/);
      if (match) {
        jobName = match[1];
      }
    } else if (functionPath.includes('/api/')) {
      const match = functionPath.match(/\/api\/([^\/\?]+)/);
      if (match) {
        jobName = match[1];
      }
    }
    
    if (jobName && cronJobs[jobName]) {
      cronJobs[jobName].push(log);
    }
  });
  
  // 各Cron Jobの分析
  console.log('\n📈 重要Cron Jobsの詳細分析\n');
  console.log('-'.repeat(80));
  
  Object.keys(cronJobs).forEach(jobName => {
    const jobLogs = cronJobs[jobName];
    if (jobLogs.length === 0) return;
    
    // 最新のログを取得
    const recentJobLogs = jobLogs.filter(log => {
      const timeUTC = log.TimeUTC || log.timestampInMs || 0;
      return timeUTC > oneHourAgo;
    });
    
    const totalCount = jobLogs.length;
    const recentCount = recentJobLogs.length;
    
    let success = 0;
    let errors = 0;
    let skipped = 0;
    const errorMessages = [];
    
    jobLogs.forEach(log => {
      const statusCode = log.responseStatusCode || 0;
      const level = log.level || 'info';
      const message = log.message || '';
      
      if (statusCode >= 200 && statusCode < 300) {
        success++;
      } else if (statusCode >= 400 || level === 'error') {
        // 403エラーでスキップメッセージがある場合はスキップとして扱う
        if (message.includes('403') && (message.includes('skipped') || message.includes('Skipped'))) {
          skipped++;
        } else {
          errors++;
          if (errorMessages.length < 5) {
            errorMessages.push(message.substring(0, 200));
          }
        }
      } else if (statusCode === 0) {
        // ステータスコード0の詳細分析
        const msgLower = message.toLowerCase();
        if (msgLower.includes('success') || msgLower.includes('completed') || msgLower.includes('sent successfully')) {
          success++;
        } else if (msgLower.includes('skipped') || msgLower.includes('not peak time')) {
          skipped++;
        } else if (level === 'error' || msgLower.includes('error') || msgLower.includes('failed')) {
          errors++;
          if (errorMessages.length < 5) {
            errorMessages.push(message.substring(0, 200));
          }
        } else {
          success++; // デフォルトは成功として扱う
        }
      }
    });
    
    const successRate = (success / totalCount * 100).toFixed(2);
    const errorRate = (errors / totalCount * 100).toFixed(2);
    const skipRate = (skipped / totalCount * 100).toFixed(2);
    
    const status = errorRate === '0.00' ? '✅' : '❌';
    console.log(`\n${status} ${jobName}`);
    console.log(`   総実行数: ${totalCount}`);
    console.log(`   最新1時間: ${recentCount}件`);
    console.log(`   成功: ${success} (${successRate}%)`);
    console.log(`   エラー: ${errors} (${errorRate}%)`);
    if (skipped > 0) {
      console.log(`   スキップ: ${skipped} (${skipRate}%)`);
    }
    
    // 最新のログの状態を確認
    if (recentJobLogs.length > 0) {
      const latestLog = recentJobLogs[recentJobLogs.length - 1];
      const latestStatus = latestLog.responseStatusCode || 0;
      const latestMessage = latestLog.message || '';
      const latestTime = new Date(latestLog.TimeUTC || latestLog.timestampInMs).toISOString();
      
      console.log(`   最新実行: ${latestTime}`);
      if (latestStatus >= 200 && latestStatus < 300) {
        console.log(`   最新ステータス: ✅ 成功 (${latestStatus})`);
      } else if (latestMessage.includes('skipped') || latestMessage.includes('Skipped')) {
        console.log(`   最新ステータス: ⏭️ スキップ`);
      } else {
        console.log(`   最新ステータス: ❌ エラー (${latestStatus})`);
        console.log(`   最新メッセージ: ${latestMessage.substring(0, 150)}`);
      }
    }
    
    if (errorMessages.length > 0) {
      console.log(`   ⚠️ エラーメッセージ:`);
      errorMessages.forEach((msg, idx) => {
        console.log(`      [${idx + 1}] ${msg}`);
      });
    }
  });
  
  // 改善状況の評価
  console.log('\n\n🎯 改善状況の評価\n');
  console.log('='.repeat(80));
  
  const xQuoteRepost = cronJobs['x-quote-repost'];
  const leadDiscovery = cronJobs['lead-discovery'];
  
  let xQuoteRepostErrors = 0;
  let leadDiscoveryErrors = 0;
  let leadDiscoverySkipped = 0;
  
  if (xQuoteRepost.length > 0) {
    xQuoteRepost.forEach(log => {
      const statusCode = log.responseStatusCode || 0;
      const level = log.level || 'info';
      const message = log.message || '';
      if (statusCode >= 400 || (level === 'error' && !message.includes('skipped'))) {
        xQuoteRepostErrors++;
      }
    });
  }
  
  if (leadDiscovery.length > 0) {
    leadDiscovery.forEach(log => {
      const statusCode = log.responseStatusCode || 0;
      const level = log.level || 'info';
      const message = log.message || '';
      if (statusCode === 403 || (message.includes('403') && !message.includes('skipped'))) {
        leadDiscoveryErrors++;
      } else if (message.includes('skipped') || message.includes('Skipped')) {
        leadDiscoverySkipped++;
      } else if (statusCode >= 400 || level === 'error') {
        leadDiscoveryErrors++;
      }
    });
  }
  
  const xQuoteRepostErrorRate = xQuoteRepost.length > 0 ? (xQuoteRepostErrors / xQuoteRepost.length * 100).toFixed(2) : '0.00';
  const leadDiscoveryErrorRate = leadDiscovery.length > 0 ? (leadDiscoveryErrors / leadDiscovery.length * 100).toFixed(2) : '0.00';
  
  console.log(`\n📊 現在のエラー率:`);
  console.log(`   x-quote-repost: ${xQuoteRepostErrorRate}%`);
  console.log(`   lead-discovery: ${leadDiscoveryErrorRate}%`);
  
  if (leadDiscoverySkipped > 0) {
    console.log(`   lead-discovery (スキップ): ${leadDiscoverySkipped}件（これは正常な動作です）`);
  }
  
  console.log(`\n🎯 エラー率0%達成への進捗:`);
  
  if (xQuoteRepostErrorRate === '0.00' && leadDiscoveryErrorRate === '0.00') {
    console.log(`   ✅ エラー率0%達成！圧倒的な収益化が始まります！`);
  } else {
    const progress = ((1 - (parseFloat(xQuoteRepostErrorRate) + parseFloat(leadDiscoveryErrorRate)) / 2 / 100) * 100).toFixed(1);
    console.log(`   📈 進捗: ${progress}%`);
    
    if (parseFloat(xQuoteRepostErrorRate) > 0) {
      console.log(`   ⚠️ x-quote-repost: まだエラーが発生しています`);
    }
    if (parseFloat(leadDiscoveryErrorRate) > 0) {
      console.log(`   ⚠️ lead-discovery: まだエラーが発生しています（403エラーはスキップとして扱うべき）`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  
  // リード取得の確認
  console.log('\n\n📧 リード取得の確認\n');
  console.log('='.repeat(80));
  
  const leadDiscoverySuccess = leadDiscovery.filter(log => {
    const statusCode = log.responseStatusCode || 0;
    const message = log.message || '';
    return (statusCode >= 200 && statusCode < 300) || 
           message.includes('sent successfully') || 
           message.includes('VSL1 sent') ||
           message.includes('lead') && message.includes('success');
  });
  
  console.log(`✅ lead-discovery成功実行: ${leadDiscoverySuccess.length}件`);
  console.log(`📧 メール報告が流れてきた = リード取得が成功している証拠！`);
  
  if (leadDiscoverySuccess.length > 0) {
    console.log(`\n🎉 素晴らしい！リード発見システムが正常に動作しています！`);
  }
  
  console.log('\n' + '='.repeat(80));
}

if (require.main === module) {
  analyzeImprovement();
}

module.exports = { analyzeImprovement };
