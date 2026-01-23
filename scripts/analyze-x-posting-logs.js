// scripts/analyze-x-posting-logs.js
// X投稿機能のログ分析スクリプト

const fs = require('fs');
const path = require('path');

async function analyzeXPostingLogs() {
  const logFile = 'c:\\Users\\chiba\\Downloads\\logs_result.json';
  
  if (!fs.existsSync(logFile)) {
    console.error(`❌ ログファイルが見つかりません: ${logFile}`);
    process.exit(1);
  }

  console.log('📖 ログファイルを読み込み中...');
  const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  console.log(`✅ ログエントリ数: ${logs.length}\n`);

  // X投稿関連のログを抽出
  const xPostFreeReportLogs = [];
  const xQuoteRepostLogs = [];
  const xApiLogs = [];
  const errorLogs = [];

  logs.forEach((log, index) => {
    const message = log.message || log.text || JSON.stringify(log);
    const lowerMessage = message.toLowerCase();

    // X投稿関連のログを抽出
    if (lowerMessage.includes('x post free report') || 
        lowerMessage.includes('x-post-free-report') ||
        lowerMessage.includes('[x post free report]')) {
      xPostFreeReportLogs.push({ index, log, message });
    }

    if (lowerMessage.includes('quote repost') || 
        lowerMessage.includes('x-quote-repost') ||
        lowerMessage.includes('[quote repost]')) {
      xQuoteRepostLogs.push({ index, log, message });
    }

    if (lowerMessage.includes('x api') || 
        lowerMessage.includes('twitter api') ||
        lowerMessage.includes('posttweet') ||
        lowerMessage.includes('quote tweet')) {
      xApiLogs.push({ index, log, message });
    }

    // エラーログを抽出
    if (log.level === 'error' || 
        lowerMessage.includes('error') ||
        lowerMessage.includes('failed') ||
        lowerMessage.includes('❌')) {
      errorLogs.push({ index, log, message });
    }
  });

  console.log('='.repeat(80));
  console.log('📊 X投稿機能ログ分析結果');
  console.log('='.repeat(80));
  console.log('');

  // 1. 無料版レポート投稿ログ
  console.log(`1️⃣ 無料版レポート投稿ログ: ${xPostFreeReportLogs.length}件`);
  if (xPostFreeReportLogs.length > 0) {
    console.log('   最新10件:');
    xPostFreeReportLogs.slice(-10).forEach(({ log, message }) => {
      const timestamp = log.timestamp || log.time || log.created_at || 'N/A';
      const preview = message.substring(0, 150);
      console.log(`   [${timestamp}] ${preview}...`);
    });
  } else {
    console.log('   ⚠️ 無料版レポート投稿のログが見つかりませんでした');
  }
  console.log('');

  // 2. 引用リポストログ
  console.log(`2️⃣ 引用リポストログ: ${xQuoteRepostLogs.length}件`);
  if (xQuoteRepostLogs.length > 0) {
    console.log('   最新10件:');
    xQuoteRepostLogs.slice(-10).forEach(({ log, message }) => {
      const timestamp = log.timestamp || log.time || log.created_at || 'N/A';
      const preview = message.substring(0, 150);
      console.log(`   [${timestamp}] ${preview}...`);
    });
  } else {
    console.log('   ⚠️ 引用リポストのログが見つかりませんでした');
  }
  console.log('');

  // 3. X API関連ログ
  console.log(`3️⃣ X API関連ログ: ${xApiLogs.length}件`);
  if (xApiLogs.length > 0) {
    console.log('   最新10件:');
    xApiLogs.slice(-10).forEach(({ log, message }) => {
      const timestamp = log.timestamp || log.time || log.created_at || 'N/A';
      const preview = message.substring(0, 150);
      console.log(`   [${timestamp}] ${preview}...`);
    });
  } else {
    console.log('   ⚠️ X API関連のログが見つかりませんでした');
  }
  console.log('');

  // 4. エラーログ（X投稿関連）
  const xRelatedErrors = errorLogs.filter(({ message }) => {
    const lowerMessage = message.toLowerCase();
    return lowerMessage.includes('x') || 
           lowerMessage.includes('twitter') ||
           lowerMessage.includes('post') ||
           lowerMessage.includes('quote');
  });

  console.log(`4️⃣ X投稿関連エラーログ: ${xRelatedErrors.length}件`);
  if (xRelatedErrors.length > 0) {
    console.log('   最新10件:');
    xRelatedErrors.slice(-10).forEach(({ log, message }) => {
      const timestamp = log.timestamp || log.time || log.created_at || 'N/A';
      const preview = message.substring(0, 200);
      console.log(`   [${timestamp}] ${preview}...`);
    });
  } else {
    console.log('   ✅ X投稿関連のエラーは見つかりませんでした');
  }
  console.log('');

  // 5. Cronジョブ実行状況
  const cronLogs = logs.filter(log => {
    const message = (log.message || log.text || JSON.stringify(log)).toLowerCase();
    return message.includes('cron') || 
           message.includes('/api/x-post-free-report') ||
           message.includes('/api/x-quote-repost');
  });

  console.log(`5️⃣ Cronジョブ実行ログ: ${cronLogs.length}件`);
  if (cronLogs.length > 0) {
    console.log('   最新10件:');
    cronLogs.slice(-10).forEach(log => {
      const timestamp = log.timestamp || log.time || log.created_at || 'N/A';
      const message = log.message || log.text || JSON.stringify(log);
      const preview = message.substring(0, 150);
      console.log(`   [${timestamp}] ${preview}...`);
    });
  } else {
    console.log('   ⚠️ Cronジョブ実行のログが見つかりませんでした');
  }
  console.log('');

  // 6. 診断サマリー
  console.log('='.repeat(80));
  console.log('📋 診断サマリー');
  console.log('='.repeat(80));

  const issues = [];

  if (xPostFreeReportLogs.length === 0) {
    issues.push('❌ 無料版レポート投稿のログが1件も見つかりません - Cronジョブが実行されていない可能性があります');
  }

  if (xQuoteRepostLogs.length === 0) {
    issues.push('❌ 引用リポストのログが1件も見つかりません - Cronジョブが実行されていない可能性があります');
  }

  if (cronLogs.length === 0) {
    issues.push('❌ Cronジョブ実行のログが1件も見つかりません - Vercel Cronが設定されていないか、実行されていない可能性があります');
  }

  if (xRelatedErrors.length > 0) {
    issues.push(`⚠️ X投稿関連のエラーが${xRelatedErrors.length}件見つかりました - 詳細を確認してください`);
  }

  if (issues.length === 0) {
    console.log('✅ ログ分析では明らかな問題は見つかりませんでした');
    console.log('   ただし、実際に投稿が実行されているかは、Xアカウント（@trapdefence）で確認してください');
  } else {
    console.log('以下の問題が検出されました:');
    issues.forEach((issue, idx) => {
      console.log(`   ${idx + 1}. ${issue}`);
    });
  }

  console.log('='.repeat(80));
}

// 実行
analyzeXPostingLogs().catch(error => {
  console.error('❌ ログ分析エラー:', error.message);
  console.error(error.stack);
  process.exit(1);
});
