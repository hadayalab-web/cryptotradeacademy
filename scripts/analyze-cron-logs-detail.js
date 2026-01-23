// scripts/analyze-cron-logs-detail.js
// Cronジョブ実行ログの詳細分析

const fs = require('fs');

async function analyzeCronLogsDetail() {
  const logFile = 'c:\\Users\\chiba\\Downloads\\logs_result.json';
  const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));

  console.log('='.repeat(80));
  console.log('📊 Cronジョブ実行ログ詳細分析');
  console.log('='.repeat(80));
  console.log('');

  // リクエストパスで分類
  const paths = {};
  logs.forEach(log => {
    const path = log.requestPath || log.path || log.url || 'unknown';
    if (!paths[path]) {
      paths[path] = [];
    }
    paths[path].push(log);
  });

  console.log('📋 リクエストパス別の実行回数:');
  Object.keys(paths).sort().forEach(path => {
    const count = paths[path].length;
    const latest = paths[path][paths[path].length - 1];
    const timestamp = latest.timestamp || latest.TimeUTC || latest.time || 'N/A';
    console.log(`   ${path}: ${count}回 (最新: ${timestamp})`);
  });
  console.log('');

  // X投稿関連のパスを確認
  const xPostPaths = Object.keys(paths).filter(path => 
    path.includes('x-post') || 
    path.includes('x-quote') ||
    path.includes('quote-repost')
  );

  console.log('🔍 X投稿関連のパス:');
  if (xPostPaths.length > 0) {
    xPostPaths.forEach(path => {
      console.log(`   ✅ ${path}: ${paths[path].length}回`);
      const latest = paths[path][paths[path].length - 1];
      console.log(`      最新実行: ${latest.timestamp || latest.TimeUTC || latest.time || 'N/A'}`);
    });
  } else {
    console.log('   ❌ X投稿関連のパスが見つかりませんでした');
    console.log('   ⚠️ /api/x-post-free-report と /api/x-quote-repost が実行されていない可能性があります');
  }
  console.log('');

  // /api/cron のログを確認（X投稿機能が呼び出されているか）
  const cronLogs = logs.filter(log => {
    const path = log.requestPath || log.path || log.url || '';
    return path.includes('/api/cron');
  });

  console.log(`📋 /api/cron の実行ログ: ${cronLogs.length}件`);
  if (cronLogs.length > 0) {
    console.log('   最新5件のメッセージ:');
    cronLogs.slice(-5).forEach((log, idx) => {
      const msg = log.msg || log.message || log.text || JSON.stringify(log).substring(0, 200);
      const timestamp = log.timestamp || log.TimeUTC || log.time || 'N/A';
      console.log(`   [${idx + 1}] [${timestamp}] ${msg}...`);
    });
  }
  console.log('');

  // エラーログを確認
  const errorLogs = logs.filter(log => {
    const level = log.level || '';
    const msg = (log.msg || log.message || log.text || '').toLowerCase();
    return level === 'error' || msg.includes('error') || msg.includes('failed');
  });

  console.log(`❌ エラーログ: ${errorLogs.length}件`);
  if (errorLogs.length > 0) {
    console.log('   最新10件:');
    errorLogs.slice(-10).forEach((log, idx) => {
      const msg = log.msg || log.message || log.text || JSON.stringify(log).substring(0, 200);
      const timestamp = log.timestamp || log.TimeUTC || log.time || 'N/A';
      const path = log.requestPath || log.path || log.url || 'unknown';
      console.log(`   [${idx + 1}] [${timestamp}] [${path}]`);
      console.log(`       ${msg}...`);
    });
  }
  console.log('');

  // 診断結果
  console.log('='.repeat(80));
  console.log('📋 診断結果');
  console.log('='.repeat(80));

  const issues = [];

  if (xPostPaths.length === 0) {
    issues.push('❌ /api/x-post-free-report と /api/x-quote-repost が実行されていません');
    issues.push('   → Vercel Cron設定を確認してください（vercel.json）');
  }

  if (cronLogs.length > 0) {
    const hasXPostCall = cronLogs.some(log => {
      const msg = (log.msg || log.message || log.text || '').toLowerCase();
      return msg.includes('x post') || msg.includes('x-post') || msg.includes('quote repost');
    });
    
    if (!hasXPostCall) {
      issues.push('⚠️ /api/cron からX投稿機能が呼び出されていません');
      issues.push('   → api/cron.js で postFreeReportToX が呼び出されているか確認してください');
    }
  }

  if (issues.length === 0) {
    console.log('✅ ログ分析では問題は見つかりませんでした');
  } else {
    console.log('以下の問題が検出されました:');
    issues.forEach((issue, idx) => {
      console.log(`   ${idx + 1}. ${issue}`);
    });
  }

  console.log('='.repeat(80));
}

analyzeCronLogsDetail().catch(error => {
  console.error('❌ 分析エラー:', error.message);
  console.error(error.stack);
  process.exit(1);
});
