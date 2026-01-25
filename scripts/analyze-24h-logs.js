// scripts/analyze-24h-logs.js
// 24時間分のログを分析して、すべての不具合を特定

const fs = require('fs');
const path = require('path');

const logFile = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads/logs_result (1).json');

console.log('📊 24時間分のログ分析を開始...\n');

const data = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
console.log(`総エントリ数: ${data.length}\n`);

// エンドポイント別集計
const endpoints = {};
const errors = [];
const warnings = [];
const xPostIssues = [];

data.forEach(entry => {
  const path = entry.requestPath?.split('/api/')[1] || 'unknown';
  if (!endpoints[path]) {
    endpoints[path] = {
      count: 0,
      success: 0,
      error: 0,
      statusCodes: {},
      times: [],
      messages: []
    };
  }
  
  endpoints[path].count++;
  const status = entry.responseStatusCode || 0;
  endpoints[path].statusCodes[status] = (endpoints[path].statusCodes[status] || 0) + 1;
  
  if (status >= 200 && status < 300) {
    endpoints[path].success++;
  } else {
    endpoints[path].error++;
  }
  
  if (entry.TimeUTC) {
    endpoints[path].times.push(entry.TimeUTC);
  }
  
  if (entry.message) {
    const msg = entry.message;
    endpoints[path].messages.push({
      time: entry.TimeUTC,
      message: msg
    });
    
    // エラー検出
    if (msg.toLowerCase().includes('error') || msg.includes('ERROR')) {
      errors.push({
        path,
        time: entry.TimeUTC,
        message: msg,
        status: status
      });
    }
    
    // 警告検出
    if (msg.includes('⚠️') || msg.toLowerCase().includes('warning') || 
        msg.includes('TELEGRAM_BOT_TOKEN') || msg.includes('Skipping') ||
        msg.includes('not peak time') || msg.includes('No influencers') ||
        msg.includes('Found 0')) {
      warnings.push({
        path,
        time: entry.TimeUTC,
        message: msg
      });
    }
    
    // X投稿関連の問題検出
    if (path.includes('x-') && (
      msg.includes('Skipping') || 
      msg.includes('not peak time') || 
      msg.includes('No influencers') ||
      msg.includes('Found 0') ||
      msg.includes('dry run') ||
      msg.includes('not enabled')
    )) {
      xPostIssues.push({
        path,
        time: entry.TimeUTC,
        message: msg
      });
    }
  }
});

// 結果表示
console.log('=== エンドポイント別実行状況 ===\n');
Object.keys(endpoints).sort().forEach(path => {
  const e = endpoints[path];
  const times = e.times.sort();
  const firstTime = times[0] || 'N/A';
  const lastTime = times[times.length - 1] || 'N/A';
  
  console.log(`${path}:`);
  console.log(`  総実行回数: ${e.count}`);
  console.log(`  成功: ${e.success}, エラー: ${e.error}`);
  console.log(`  ステータスコード:`, e.statusCodes);
  console.log(`  最初の実行: ${firstTime}`);
  console.log(`  最後の実行: ${lastTime}`);
  
  // X投稿関連の重要なメッセージ
  if (path.includes('x-')) {
    const importantMsgs = e.messages.filter(m => 
      m.message.includes('Skipping') || 
      m.message.includes('not peak time') ||
      m.message.includes('No influencers') ||
      m.message.includes('Posted') ||
      m.message.includes('Dry run')
    );
    if (importantMsgs.length > 0) {
      console.log(`  重要なメッセージ:`);
      importantMsgs.slice(0, 5).forEach(m => {
        console.log(`    [${m.time}] ${m.message.substring(0, 100)}`);
      });
    }
  }
  console.log('');
});

// X投稿関連のCron Jobsの実行状況
console.log('\n=== X投稿関連Cron Jobsの実行状況 ===\n');
const xCronJobs = [
  'x-quote-repost',
  'x-post-free-report',
  'x-post-minimal-version-cron',
  'vsl1-post'
];

xCronJobs.forEach(job => {
  const e = endpoints[job];
  if (e) {
    console.log(`${job}:`);
    console.log(`  実行回数: ${e.count}`);
    console.log(`  成功: ${e.success}, エラー: ${e.error}`);
    
    // 実行時刻を確認
    const executionTimes = e.times.map(t => {
      const match = t.match(/(\d{2}):(\d{2}):(\d{2})/);
      return match ? `${match[1]}:${match[2]}` : t;
    });
    
    const uniqueTimes = [...new Set(executionTimes)].sort();
    console.log(`  実行時刻: ${uniqueTimes.slice(0, 10).join(', ')}${uniqueTimes.length > 10 ? '...' : ''}`);
    
    // スキップされた回数を確認
    const skipped = e.messages.filter(m => 
      m.message.includes('Skipping') || 
      m.message.includes('not peak time')
    ).length;
    if (skipped > 0) {
      console.log(`  ⚠️ スキップされた回数: ${skipped}`);
    }
    
    console.log('');
  } else {
    console.log(`${job}: ❌ 実行ログが見つかりません\n`);
  }
});

// エラー一覧
console.log('\n=== エラー一覧（最初の20件）===\n');
if (errors.length > 0) {
  errors.slice(0, 20).forEach(e => {
    console.log(`[${e.time}] ${e.path} (${e.status}): ${e.message.substring(0, 150)}`);
  });
} else {
  console.log('エラーは見つかりませんでした。');
}

// 警告一覧（X投稿関連）
console.log('\n=== X投稿関連の警告・問題（最初の30件）===\n');
if (xPostIssues.length > 0) {
  xPostIssues.slice(0, 30).forEach(w => {
    console.log(`[${w.time}] ${w.path}: ${w.message.substring(0, 200)}`);
  });
} else {
  console.log('X投稿関連の問題は見つかりませんでした。');
}

// 環境変数関連の警告
console.log('\n=== 環境変数関連の警告 ===\n');
const envWarnings = warnings.filter(w => 
  w.message.includes('TELEGRAM_BOT_TOKEN') || 
  w.message.includes('not set') ||
  w.message.includes('missing')
);
if (envWarnings.length > 0) {
  envWarnings.forEach(w => {
    console.log(`[${w.time}] ${w.path}: ${w.message}`);
  });
} else {
  console.log('環境変数関連の警告は見つかりませんでした。');
}

// UTC 0:00と1:00のx-quote-repost実行確認
console.log('\n=== UTC 0:00と1:00のx-quote-repost実行確認 ===\n');
const quoteRepost = endpoints['x-quote-repost'];
if (quoteRepost) {
  const utc0 = quoteRepost.times.filter(t => t.includes(' 00:') || t.includes(' 01:'));
  console.log(`UTC 0:00-1:59の実行回数: ${utc0.length}`);
  if (utc0.length > 0) {
    console.log('実行時刻:');
    utc0.slice(0, 10).forEach(t => console.log(`  ${t}`));
  } else {
    console.log('⚠️ UTC 0:00-1:59の実行ログが見つかりません');
  }
} else {
  console.log('❌ x-quote-repostの実行ログが見つかりません');
}

console.log('\n=== 分析完了 ===');
