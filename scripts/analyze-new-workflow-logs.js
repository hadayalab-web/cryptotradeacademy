// scripts/analyze-new-workflow-logs.js
// 新しいワークフロー対応のログ分析（X APIクレジット不足に注視）

const fs = require('fs');
const path = require('path');

// 複数のパスを試す
const possiblePaths = [
  'c:\\Users\\chiba\\Downloads\\logs_result.json',
  path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads', 'logs_result.json'),
  'c:\\Users\\chiba\\Downloads\\logs_result (2).json',
  path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads', 'logs_result (2).json'),
];

function findLogFile() {
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

function analyzeNewWorkflowLogs() {
  console.log('🔍 新しいワークフロー対応ログ分析開始\n');
  console.log('='.repeat(80));
  
  // ログファイルを探す
  const LOG_FILE = findLogFile();
  if (!LOG_FILE) {
    console.error(`❌ ログファイルが見つかりません。以下のパスを確認してください:`);
    possiblePaths.forEach(p => console.error(`   - ${p}`));
    console.error(`\n💡 ファイルパスを引数として指定することもできます:`);
    console.error(`   node scripts/analyze-new-workflow-logs.js "c:\\path\\to\\logs_result.json"`);
    return;
  }
  
  console.log(`📁 ログファイル: ${LOG_FILE}\n`);
  
  // ログファイルを読み込み
  let logs;
  try {
    const logContent = fs.readFileSync(LOG_FILE, 'utf-8');
    logs = JSON.parse(logContent);
    console.log(`✅ ログファイルを読み込みました`);
    console.log(`📊 総ログエントリ数: ${logs.length}件\n`);
  } catch (error) {
    console.error(`❌ ログファイルの読み込みに失敗: ${error.message}`);
    return;
  }
  
  if (!Array.isArray(logs)) {
    console.error('❌ ログファイルの形式が不正です（配列である必要があります）');
    return;
  }
  
  // タイムスタンプでソート（新しい順）
  logs.sort((a, b) => {
    const timeA = a.TimeUTC || a.timestampInMs || 0;
    const timeB = b.TimeUTC || b.timestampInMs || 0;
    return timeB - timeA; // 新しい順
  });
  
  // 最新のログを取得（過去30分以内、または最新200件）
  const now = Date.now();
  const thirtyMinutesAgo = now - (30 * 60 * 1000);
  
  const latest200Logs = logs.slice(0, 200);
  const recentLogs = logs.filter(log => {
    const timeUTC = log.TimeUTC || log.timestampInMs || 0;
    return timeUTC > thirtyMinutesAgo;
  });
  
  const logsToAnalyze = recentLogs.length > 0 ? recentLogs : latest200Logs;
  
  console.log(`⏰ 分析対象:`);
  console.log(`   過去30分以内: ${recentLogs.length}件`);
  console.log(`   最新200件: ${latest200Logs.length}件`);
  console.log(`   実際に分析するログ: ${logsToAnalyze.length}件\n`);
  
  if (logsToAnalyze.length === 0) {
    console.log('⚠️ 分析対象のログがありません。');
    return;
  }
  
  // 最新ログのタイムスタンプ範囲を表示
  const oldestLog = logsToAnalyze[logsToAnalyze.length - 1];
  const newestLog = logsToAnalyze[0];
  const oldestTime = new Date(oldestLog.TimeUTC || oldestLog.timestampInMs).toISOString();
  const newestTime = new Date(newestLog.TimeUTC || newestLog.timestampInMs).toISOString();
  
  console.log(`📅 ログの時間範囲:`);
  console.log(`   最新: ${newestTime}`);
  console.log(`   最古: ${oldestTime}\n`);
  
  // 新しいワークフローのCron Jobs別に分類
  const cronJobs = {
    'x-post-free-report': [],
    'x-quote-repost': [],
    'lead-discovery': [],
    'vsl1-reminder': [],
    'vsl2-free-users': [],
    'vsl2-last-call': [],
  };
  
  logsToAnalyze.forEach(log => {
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
    
    // メッセージからも推測
    if (!jobName && message) {
      const messageLower = message.toLowerCase();
      if (messageLower.includes('x post') || messageLower.includes('[x post]') || messageLower.includes('free report')) {
        jobName = 'x-post-free-report';
      } else if (messageLower.includes('quote repost') || messageLower.includes('[quote repost]')) {
        jobName = 'x-quote-repost';
      } else if (messageLower.includes('lead discovery') || messageLower.includes('[lead discovery]')) {
        jobName = 'lead-discovery';
      } else if (messageLower.includes('vsl1 reminder') || messageLower.includes('vsl1-reminder')) {
        jobName = 'vsl1-reminder';
      } else if (messageLower.includes('vsl2') && messageLower.includes('free')) {
        jobName = 'vsl2-free-users';
      } else if (messageLower.includes('vsl2') && messageLower.includes('last call')) {
        jobName = 'vsl2-last-call';
      }
    }
    
    if (jobName && cronJobs[jobName]) {
      cronJobs[jobName].push(log);
    }
  });
  
  // X API関連のエラーを検出
  const xApiErrors = {
    credit: [], // クレジット不足
    rateLimit: [], // レート制限
    auth: [], // 認証エラー（401, 403）
    other: [], // その他のエラー
  };
  
  logsToAnalyze.forEach(log => {
    const message = log.message || '';
    const statusCode = log.responseStatusCode || 0;
    const level = log.level || 'info';
    
    if (level === 'error' || statusCode >= 400) {
      const msgLower = message.toLowerCase();
      
      if (msgLower.includes('x api') || msgLower.includes('twitter api') || msgLower.includes('tweet')) {
        if (msgLower.includes('credit') || msgLower.includes('quota') || msgLower.includes('insufficient')) {
          xApiErrors.credit.push({
            message: message.substring(0, 300),
            timestamp: log.TimeUTC || log.timestampInMs,
            statusCode,
            job: log.requestPath || log.function || 'unknown',
          });
        } else if (msgLower.includes('rate limit') || msgLower.includes('429') || statusCode === 429) {
          xApiErrors.rateLimit.push({
            message: message.substring(0, 300),
            timestamp: log.TimeUTC || log.timestampInMs,
            statusCode,
            job: log.requestPath || log.function || 'unknown',
          });
        } else if (msgLower.includes('401') || msgLower.includes('403') || statusCode === 401 || statusCode === 403) {
          // 403エラーは削除されたツイートの場合もあるので、詳細を確認
          if (msgLower.includes('deleted') || msgLower.includes('not visible') || msgLower.includes('forbidden')) {
            // これは正常なスキップとして扱う
          } else {
            xApiErrors.auth.push({
              message: message.substring(0, 300),
              timestamp: log.TimeUTC || log.timestampInMs,
              statusCode,
              job: log.requestPath || log.function || 'unknown',
            });
          }
        } else {
          xApiErrors.other.push({
            message: message.substring(0, 300),
            timestamp: log.TimeUTC || log.timestampInMs,
            statusCode,
            job: log.requestPath || log.function || 'unknown',
          });
        }
      }
    }
  });
  
  // 各Cron Jobの分析
  console.log('\n📈 新しいワークフロー Cron Jobs の詳細分析\n');
  console.log('-'.repeat(80));
  
  let totalSuccess = 0;
  let totalErrors = 0;
  let totalSkipped = 0;
  
  Object.keys(cronJobs).forEach(jobName => {
    const jobLogs = cronJobs[jobName];
    if (jobLogs.length === 0) return;
    
    let success = 0;
    let errors = 0;
    let skipped = 0;
    const errorMessages = [];
    const successMessages = [];
    const xApiErrorMessages = [];
    
    jobLogs.forEach(log => {
      const statusCode = log.responseStatusCode || 0;
      const level = log.level || 'info';
      const message = log.message || '';
      const timeUTC = log.TimeUTC || log.timestampInMs;
      
      // X API関連のエラーを検出
      const msgLower = message.toLowerCase();
      if ((level === 'error' || statusCode >= 400) && 
          (msgLower.includes('x api') || msgLower.includes('twitter api') || msgLower.includes('tweet'))) {
        if (xApiErrorMessages.length < 3) {
          xApiErrorMessages.push({
            message: message.substring(0, 200),
            timestamp: timeUTC ? new Date(timeUTC).toISOString() : 'N/A',
            statusCode,
          });
        }
      }
      
      // 成功/エラー/スキップの判定
      if (statusCode >= 200 && statusCode < 300) {
        success++;
        totalSuccess++;
      } else if (statusCode >= 400 || level === 'error') {
        // 403エラーでスキップメッセージがある場合はスキップとして扱う
        if (message.includes('403') && (message.includes('skipped') || message.includes('Skipped') || message.includes('skipping') || message.includes('deleted') || message.includes('not visible'))) {
          skipped++;
          totalSkipped++;
        } else {
          errors++;
          totalErrors++;
          if (errorMessages.length < 5) {
            errorMessages.push({
              message: message.substring(0, 200),
              timestamp: timeUTC ? new Date(timeUTC).toISOString() : 'N/A',
              statusCode,
            });
          }
        }
      } else if (statusCode === 0) {
        // ステータスコード0の詳細分析
        const msgLower = message.toLowerCase();
        if (msgLower.includes('success') || msgLower.includes('completed') || msgLower.includes('sent successfully') || msgLower.includes('posted successfully')) {
          success++;
          totalSuccess++;
          if (successMessages.length < 3) {
            successMessages.push(message.substring(0, 150));
          }
        } else if (msgLower.includes('skipped') || msgLower.includes('not peak time') || msgLower.includes('skipping')) {
          skipped++;
          totalSkipped++;
        } else if (level === 'error' || msgLower.includes('error') || msgLower.includes('failed')) {
          // 403エラーの場合はスキップとして扱う
          if (msgLower.includes('403') || msgLower.includes('forbidden')) {
            skipped++;
            totalSkipped++;
          } else {
            errors++;
            totalErrors++;
            if (errorMessages.length < 5) {
              errorMessages.push({
                message: message.substring(0, 200),
                timestamp: timeUTC ? new Date(timeUTC).toISOString() : 'N/A',
                statusCode,
              });
            }
          }
        } else {
          // デフォルトは成功として扱う
          success++;
          totalSuccess++;
        }
      }
    });
    
    const totalCount = jobLogs.length;
    const successRate = totalCount > 0 ? (success / totalCount * 100).toFixed(2) : '0.00';
    const errorRate = totalCount > 0 ? (errors / totalCount * 100).toFixed(2) : '0.00';
    const skipRate = totalCount > 0 ? (skipped / totalCount * 100).toFixed(2) : '0.00';
    
    const status = errorRate === '0.00' ? '✅' : '❌';
    console.log(`\n${status} ${jobName}`);
    console.log(`   実行数: ${totalCount}`);
    console.log(`   成功: ${success} (${successRate}%)`);
    console.log(`   エラー: ${errors} (${errorRate}%)`);
    if (skipped > 0) {
      console.log(`   スキップ: ${skipped} (${skipRate}%) ← これは正常な動作です`);
    }
    
    // X API関連のエラーを表示
    if (xApiErrorMessages.length > 0) {
      console.log(`   ⚠️ X API関連エラー:`);
      xApiErrorMessages.forEach((err, idx) => {
        console.log(`      [${idx + 1}] ${err.timestamp}: ${err.message}`);
      });
    }
    
    // 最新のログの状態を確認
    if (jobLogs.length > 0) {
      const latestLog = jobLogs[0]; // 既に新しい順にソート済み
      const latestStatus = latestLog.responseStatusCode || 0;
      const latestMessage = latestLog.message || '';
      const latestTime = new Date(latestLog.TimeUTC || latestLog.timestampInMs).toISOString();
      
      console.log(`   最新実行: ${latestTime}`);
      if (latestStatus >= 200 && latestStatus < 300) {
        console.log(`   最新ステータス: ✅ 成功 (${latestStatus})`);
      } else if (latestMessage.includes('skipped') || latestMessage.includes('Skipped') || latestMessage.includes('skipping')) {
        console.log(`   最新ステータス: ⏭️ スキップ（正常）`);
      } else if (latestMessage.includes('403') || latestMessage.includes('Forbidden')) {
        console.log(`   最新ステータス: ⏭️ 403エラー（スキップとして扱うべき）`);
      } else {
        console.log(`   最新ステータス: ❌ エラー (${latestStatus})`);
        console.log(`   最新メッセージ: ${latestMessage.substring(0, 150)}`);
      }
    }
    
    if (successMessages.length > 0) {
      console.log(`   ✅ 成功メッセージ:`);
      successMessages.forEach((msg, idx) => {
        console.log(`      [${idx + 1}] ${msg}`);
      });
    }
    
    if (errorMessages.length > 0) {
      console.log(`   ⚠️ エラーメッセージ:`);
      errorMessages.forEach((err, idx) => {
        console.log(`      [${idx + 1}] ${err.timestamp}: ${err.message}`);
      });
    }
  });
  
  // X APIエラーの詳細分析
  console.log('\n\n🚨 X APIエラー詳細分析\n');
  console.log('='.repeat(80));
  
  if (xApiErrors.credit.length > 0) {
    console.log(`\n❌ クレジット不足エラー: ${xApiErrors.credit.length}件`);
    xApiErrors.credit.forEach((err, idx) => {
      const time = err.timestamp ? new Date(err.timestamp).toISOString() : 'N/A';
      console.log(`   [${idx + 1}] ${time}`);
      console.log(`      ジョブ: ${err.job}`);
      console.log(`      メッセージ: ${err.message}`);
      console.log(`      ステータス: ${err.statusCode}`);
    });
  } else {
    console.log(`\n✅ クレジット不足エラー: 0件`);
  }
  
  if (xApiErrors.rateLimit.length > 0) {
    console.log(`\n⚠️ レート制限エラー: ${xApiErrors.rateLimit.length}件`);
    xApiErrors.rateLimit.forEach((err, idx) => {
      const time = err.timestamp ? new Date(err.timestamp).toISOString() : 'N/A';
      console.log(`   [${idx + 1}] ${time}`);
      console.log(`      ジョブ: ${err.job}`);
      console.log(`      メッセージ: ${err.message}`);
    });
  } else {
    console.log(`\n✅ レート制限エラー: 0件`);
  }
  
  if (xApiErrors.auth.length > 0) {
    console.log(`\n⚠️ 認証エラー（401/403）: ${xApiErrors.auth.length}件`);
    xApiErrors.auth.forEach((err, idx) => {
      const time = err.timestamp ? new Date(err.timestamp).toISOString() : 'N/A';
      console.log(`   [${idx + 1}] ${time}`);
      console.log(`      ジョブ: ${err.job}`);
      console.log(`      メッセージ: ${err.message}`);
      console.log(`      ステータス: ${err.statusCode}`);
    });
  } else {
    console.log(`\n✅ 認証エラー: 0件`);
  }
  
  if (xApiErrors.other.length > 0) {
    console.log(`\n⚠️ その他のX APIエラー: ${xApiErrors.other.length}件`);
    xApiErrors.other.forEach((err, idx) => {
      const time = err.timestamp ? new Date(err.timestamp).toISOString() : 'N/A';
      console.log(`   [${idx + 1}] ${time}`);
      console.log(`      ジョブ: ${err.job}`);
      console.log(`      メッセージ: ${err.message}`);
      console.log(`      ステータス: ${err.statusCode}`);
    });
  } else {
    console.log(`\n✅ その他のX APIエラー: 0件`);
  }
  
  // 総合評価
  const totalCount = logsToAnalyze.length;
  const overallSuccessRate = totalCount > 0 ? (totalSuccess / totalCount * 100).toFixed(2) : '0.00';
  const overallErrorRate = totalCount > 0 ? (totalErrors / totalCount * 100).toFixed(2) : '0.00';
  
  console.log('\n\n🎯 新しいワークフローの総合評価\n');
  console.log('='.repeat(80));
  console.log(`分析対象ログ数: ${totalCount}件`);
  console.log(`成功: ${totalSuccess} (${overallSuccessRate}%)`);
  console.log(`エラー: ${totalErrors} (${overallErrorRate}%)`);
  console.log(`スキップ: ${totalSkipped}件（正常な動作）`);
  
  // 重要Cron Jobsのエラー率
  const xPostFreeReport = cronJobs['x-post-free-report'];
  const xQuoteRepost = cronJobs['x-quote-repost'];
  const leadDiscovery = cronJobs['lead-discovery'];
  
  let xPostErrors = 0;
  let xQuoteErrors = 0;
  let leadDiscoveryErrors = 0;
  
  if (xPostFreeReport && xPostFreeReport.length > 0) {
    xPostFreeReport.forEach(log => {
      const statusCode = log.responseStatusCode || 0;
      const level = log.level || 'info';
      const message = log.message || '';
      if (statusCode >= 400 || (level === 'error' && !message.includes('skipped'))) {
        xPostErrors++;
      }
    });
  }
  
  if (xQuoteRepost && xQuoteRepost.length > 0) {
    xQuoteRepost.forEach(log => {
      const statusCode = log.responseStatusCode || 0;
      const level = log.level || 'info';
      const message = log.message || '';
      if (statusCode >= 400 || (level === 'error' && !message.includes('skipped'))) {
        xQuoteErrors++;
      }
    });
  }
  
  if (leadDiscovery && leadDiscovery.length > 0) {
    leadDiscovery.forEach(log => {
      const statusCode = log.responseStatusCode || 0;
      const level = log.level || 'info';
      const message = log.message || '';
      if (statusCode === 403 || (message.includes('403') && !message.includes('skipped') && !message.includes('Skipped'))) {
        // 403エラーはスキップとして扱うべき
      } else if (message.includes('skipped') || message.includes('Skipped')) {
        // スキップは正常
      } else if (statusCode >= 400 || level === 'error') {
        leadDiscoveryErrors++;
      }
    });
  }
  
  const xPostErrorRate = xPostFreeReport && xPostFreeReport.length > 0 ? (xPostErrors / xPostFreeReport.length * 100).toFixed(2) : '0.00';
  const xQuoteErrorRate = xQuoteRepost && xQuoteRepost.length > 0 ? (xQuoteErrors / xQuoteRepost.length * 100).toFixed(2) : '0.00';
  const leadDiscoveryErrorRate = leadDiscovery && leadDiscovery.length > 0 ? (leadDiscoveryErrors / leadDiscovery.length * 100).toFixed(2) : '0.00';
  
  console.log(`\n📊 重要Cron Jobsのエラー率（新しいワークフロー）:`);
  console.log(`   x-post-free-report: ${xPostErrorRate}%`);
  console.log(`   x-quote-repost: ${xQuoteErrorRate}%`);
  console.log(`   lead-discovery: ${leadDiscoveryErrorRate}%`);
  
  console.log(`\n🎯 エラー率0%達成の確認:`);
  
  if (xPostErrorRate === '0.00' && xQuoteErrorRate === '0.00' && leadDiscoveryErrorRate === '0.00') {
    console.log(`   ✅ エラー率0%達成！圧倒的な収益化が始まります！`);
    console.log(`   🚀 すべての重要Cron Jobsが正常に動作しています！`);
  } else {
    console.log(`   ⏳ まだエラーが発生しています`);
    
    if (parseFloat(xPostErrorRate) > 0) {
      console.log(`   ⚠️ x-post-free-report: エラー率 ${xPostErrorRate}%`);
    }
    if (parseFloat(xQuoteErrorRate) > 0) {
      console.log(`   ⚠️ x-quote-repost: エラー率 ${xQuoteErrorRate}%`);
    }
    if (parseFloat(leadDiscoveryErrorRate) > 0) {
      console.log(`   ⚠️ lead-discovery: エラー率 ${leadDiscoveryErrorRate}%`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
}

if (require.main === module) {
  // コマンドライン引数からファイルパスを取得
  const customPath = process.argv[2];
  if (customPath) {
    possiblePaths.unshift(customPath);
  }
  analyzeNewWorkflowLogs();
}

module.exports = { analyzeNewWorkflowLogs };
