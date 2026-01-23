// scripts/analyze-process-queue-logs.js
// lead-discovery/processのログを分析して、リプライ送信が0件の原因を調査

const fs = require('fs');
const path = require('path');

const LOG_FILE = process.argv[2] || 'c:\\Users\\chiba\\Downloads\\logs_result (3).json';

function analyzeProcessQueueLogs() {
  console.log('🔍 lead-discovery/processのログ分析\n');
  console.log('='.repeat(80));
  
  if (!fs.existsSync(LOG_FILE)) {
    console.error(`❌ ログファイルが見つかりません: ${LOG_FILE}`);
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
  
  // lead-discovery/processのログをフィルタ
  const processLogs = logs.filter(log => {
    const logPath = log.requestPath || log.path || '';
    return logPath.includes('lead-discovery/process');
  });
  
  console.log(`📊 lead-discovery/processのログ: ${processLogs.length}件\n`);
  
  if (processLogs.length === 0) {
    console.log('⚠️ lead-discovery/processのログが見つかりませんでした');
    return;
  }
  
  // メッセージを分析
  const messages = processLogs
    .map(log => log.message || '')
    .filter(msg => msg.length > 0);
  
  console.log(`📝 メッセージがあるログ: ${messages.length}件\n`);
  
  // キーワード別に分類
  const keywords = {
    'No tweetId': [],
    'no tweetId': [],
    'Reply': [],
    'reply': [],
    'Processing': [],
    'processed': [],
    'VSL1': [],
    '403': [],
    'Error': [],
    'error': [],
  };
  
  messages.forEach(msg => {
    for (const [keyword, arr] of Object.entries(keywords)) {
      if (msg.includes(keyword)) {
        arr.push(msg);
      }
    }
  });
  
  console.log('📊 キーワード別のログ数:\n');
  for (const [keyword, arr] of Object.entries(keywords)) {
    if (arr.length > 0) {
      console.log(`   ${keyword}: ${arr.length}件`);
      if (arr.length <= 5) {
        arr.forEach((msg, i) => {
          console.log(`     ${i + 1}. ${msg.substring(0, 150)}`);
        });
      } else {
        arr.slice(0, 3).forEach((msg, i) => {
          console.log(`     ${i + 1}. ${msg.substring(0, 150)}`);
        });
        console.log(`     ... 他${arr.length - 3}件`);
      }
      console.log('');
    }
  }
  
  // エラーログを分析
  const errorLogs = processLogs.filter(log => {
    const level = log.level || '';
    const status = log.responseStatusCode || '';
    return level === 'error' || (status && parseInt(status) >= 400);
  });
  
  console.log(`\n❌ エラーログ: ${errorLogs.length}件\n`);
  
  if (errorLogs.length > 0) {
    const errorMessages = errorLogs
      .map(log => log.message || '')
      .filter(msg => msg.length > 0)
      .slice(0, 10);
    
    errorMessages.forEach((msg, i) => {
      console.log(`   ${i + 1}. ${msg.substring(0, 200)}`);
    });
  }
  
  // 成功ログを分析
  const successLogs = processLogs.filter(log => {
    const status = log.responseStatusCode || '';
    return status && parseInt(status) === 200;
  });
  
  console.log(`\n✅ 成功ログ（200）: ${successLogs.length}件\n`);
  
  // リプライ送信関連のログを抽出
  const replyRelatedLogs = messages.filter(msg => {
    return msg.includes('Reply') || 
           msg.includes('reply') || 
           msg.includes('VSL1') || 
           msg.includes('tweetId');
  });
  
  console.log(`\n📨 リプライ送信関連のログ: ${replyRelatedLogs.length}件\n`);
  
  if (replyRelatedLogs.length > 0) {
    replyRelatedLogs.slice(0, 20).forEach((msg, i) => {
      console.log(`   ${i + 1}. ${msg.substring(0, 200)}`);
    });
  } else {
    console.log('   ⚠️ リプライ送信関連のログが見つかりませんでした');
    console.log('   可能性:');
    console.log('     1. キュー内のリードにtweetIdがない');
    console.log('     2. processLeadQueueが実行されていない');
    console.log('     3. ログが取得できていない');
  }
  
  console.log('\n' + '='.repeat(80));
}

analyzeProcessQueueLogs();
