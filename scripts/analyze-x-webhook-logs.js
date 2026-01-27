// scripts/analyze-x-webhook-logs.js
// X Webhook関連のログを分析

const fs = require('fs');
const path = require('path');

const logFile = process.argv[2] || path.join(__dirname, '../../Downloads/logs_result (7).json');

if (!fs.existsSync(logFile)) {
  console.error(`❌ Log file not found: ${logFile}`);
  process.exit(1);
}

console.log(`📂 Reading log file: ${logFile}\n`);

const logData = JSON.parse(fs.readFileSync(logFile, 'utf8'));

// X Webhook関連のログを抽出
const webhookLogs = logData.filter(log => 
  log.message && (
    log.message.includes('[X Webhook]') ||
    log.requestPath && log.requestPath.includes('x-webhook')
  )
);

console.log(`📊 Total X Webhook logs found: ${webhookLogs.length}\n`);

if (webhookLogs.length === 0) {
  console.log('⚠️ No X Webhook logs found in this file.');
  process.exit(0);
}

// カテゴリ別に分類
const categories = {
  access: [],
  crc: [],
  events: {
    like: [],
    retweet: [],
    reply: [],
    engagement: [],
    replay: [],
  },
  errors: [],
  warnings: [],
  signature: [],
  other: [],
};

webhookLogs.forEach(log => {
  const msg = log.message || '';
  
  if (msg.includes('Access logged') || msg.includes('GET request') || msg.includes('POST request')) {
    categories.access.push(log);
  } else if (msg.includes('CRC') || msg.includes('crc_token')) {
    categories.crc.push(log);
  } else if (msg.includes('Like event') || msg.includes('like')) {
    categories.events.like.push(log);
  } else if (msg.includes('Retweet event') || msg.includes('retweet')) {
    categories.events.retweet.push(log);
  } else if (msg.includes('Reply event') || msg.includes('reply')) {
    categories.events.reply.push(log);
  } else if (msg.includes('VIRAL POST') || msg.includes('engagement') || msg.includes('Engagement')) {
    categories.events.engagement.push(log);
  } else if (msg.includes('Replay job') || msg.includes('replay_job_status') || (msg.includes('replay') && msg.includes('Event types'))) {
    categories.events.replay.push(log);
  } else if (msg.includes('❌') || msg.includes('CRITICAL') || msg.includes('Error') || msg.includes('Failed')) {
    categories.errors.push(log);
  } else if (msg.includes('⚠️') || msg.includes('Warning') || msg.includes('warn')) {
    categories.warnings.push(log);
  } else if (msg.includes('Signature') || msg.includes('signature')) {
    categories.signature.push(log);
  } else {
    categories.other.push(log);
  }
});

// レポート生成
console.log('='.repeat(80));
console.log('📋 X WEBHOOK ログ分析レポート');
console.log('='.repeat(80));
console.log();

// 1. アクセスログ
console.log(`📝 アクセスログ (${categories.access.length}件)`);
console.log('-'.repeat(80));
if (categories.access.length > 0) {
  categories.access.forEach(log => {
    const time = log.TimeUTC || log.timestampInMs;
    const method = log.requestMethod || 'N/A';
    const path = log.requestPath || 'N/A';
    const status = log.responseStatusCode || 'N/A';
    console.log(`  [${time}] ${method} ${path} → ${status}`);
    if (log.message) {
      console.log(`    ${log.message}`);
    }
  });
} else {
  console.log('  (なし)');
}
console.log();

// 2. CRC検証
console.log(`🔐 CRC検証 (${categories.crc.length}件)`);
console.log('-'.repeat(80));
if (categories.crc.length > 0) {
  categories.crc.forEach(log => {
    const time = log.TimeUTC || log.timestampInMs;
    console.log(`  [${time}] ${log.message}`);
  });
} else {
  console.log('  (なし)');
}
console.log();

// 3. イベント処理
console.log(`📨 イベント処理`);
console.log('-'.repeat(80));
console.log(`  Like: ${categories.events.like.length}件`);
console.log(`  Retweet: ${categories.events.retweet.length}件`);
console.log(`  Reply: ${categories.events.reply.length}件`);
console.log(`  Engagement: ${categories.events.engagement.length}件`);
console.log(`  Replay Job: ${categories.events.replay.length}件`);
console.log();

if (categories.events.like.length > 0) {
  console.log('  Like イベント詳細:');
  categories.events.like.slice(0, 10).forEach(log => {
    const time = log.TimeUTC || log.timestampInMs;
    console.log(`    [${time}] ${log.message}`);
  });
  if (categories.events.like.length > 10) {
    console.log(`    ... 他 ${categories.events.like.length - 10}件`);
  }
  console.log();
}

if (categories.events.retweet.length > 0) {
  console.log('  Retweet イベント詳細:');
  categories.events.retweet.forEach(log => {
    const time = log.TimeUTC || log.timestampInMs;
    console.log(`    [${time}] ${log.message}`);
  });
  console.log();
}

if (categories.events.replay.length > 0) {
  console.log('  Replay Job イベント詳細:');
  categories.events.replay.forEach(log => {
    const time = log.TimeUTC || log.timestampInMs;
    console.log(`    [${time}] ${log.message}`);
  });
  console.log();
}

if (categories.events.reply.length > 0) {
  console.log('  Reply イベント詳細:');
  categories.events.reply.slice(0, 10).forEach(log => {
    const time = log.TimeUTC || log.timestampInMs;
    console.log(`    [${time}] ${log.message}`);
  });
  if (categories.events.reply.length > 10) {
    console.log(`    ... 他 ${categories.events.reply.length - 10}件`);
  }
  console.log();
}

if (categories.events.engagement.length > 0) {
  console.log('  Engagement イベント詳細:');
  categories.events.engagement.forEach(log => {
    const time = log.TimeUTC || log.timestampInMs;
    console.log(`    [${time}] ${log.message}`);
  });
  console.log();
}

// 4. 署名検証
console.log(`🔐 署名検証 (${categories.signature.length}件)`);
console.log('-'.repeat(80));
if (categories.signature.length > 0) {
  categories.signature.forEach(log => {
    const time = log.TimeUTC || log.timestampInMs;
    console.log(`  [${time}] ${log.message}`);
  });
} else {
  console.log('  (なし)');
}
console.log();

// 5. エラー
console.log(`❌ エラー (${categories.errors.length}件)`);
console.log('-'.repeat(80));
if (categories.errors.length > 0) {
  categories.errors.forEach(log => {
    const time = log.TimeUTC || log.timestampInMs;
    console.log(`  [${time}] ${log.message}`);
    if (log.stack) {
      console.log(`    Stack: ${log.stack.substring(0, 200)}...`);
    }
  });
} else {
  console.log('  ✅ エラーなし');
}
console.log();

// 6. 警告
console.log(`⚠️ 警告 (${categories.warnings.length}件)`);
console.log('-'.repeat(80));
if (categories.warnings.length > 0) {
  categories.warnings.slice(0, 20).forEach(log => {
    const time = log.TimeUTC || log.timestampInMs;
    console.log(`  [${time}] ${log.message}`);
  });
  if (categories.warnings.length > 20) {
    console.log(`  ... 他 ${categories.warnings.length - 20}件`);
  }
} else {
  console.log('  ✅ 警告なし');
}
console.log();

// 7. その他
if (categories.other.length > 0) {
  console.log(`📋 その他のログ (${categories.other.length}件)`);
  console.log('-'.repeat(80));
  categories.other.forEach(log => {
    const time = log.TimeUTC || log.timestampInMs;
    console.log(`  [${time}] ${log.message}`);
  });
  console.log();
}

// 8. タイムライン順の全ログ（時系列）
console.log('='.repeat(80));
console.log('📅 タイムライン順の全X Webhookログ');
console.log('='.repeat(80));
const sortedLogs = [...webhookLogs].sort((a, b) => {
  const timeA = new Date(a.TimeUTC || a.timestampInMs).getTime();
  const timeB = new Date(b.TimeUTC || b.timestampInMs).getTime();
  return timeA - timeB;
});

sortedLogs.forEach((log, index) => {
  const time = log.TimeUTC || log.timestampInMs;
  const method = log.requestMethod || '';
  const path = log.requestPath || '';
  const status = log.responseStatusCode || '';
  console.log(`\n[${index + 1}] [${time}] ${method} ${path} ${status ? `→ ${status}` : ''}`);
  console.log(`    ${log.message || '(メッセージなし)'}`);
  if (log.requestId) {
    console.log(`    Request ID: ${log.requestId}`);
  }
});
console.log();

// 統計サマリー
console.log('='.repeat(80));
console.log('📊 統計サマリー');
console.log('='.repeat(80));
console.log(`総リクエスト数: ${categories.access.length}`);
console.log(`CRC検証: ${categories.crc.length}件`);
console.log(`Like イベント: ${categories.events.like.length}件`);
console.log(`Retweet イベント: ${categories.events.retweet.length}件`);
console.log(`Reply イベント: ${categories.events.reply.length}件`);
console.log(`Engagement イベント: ${categories.events.engagement.length}件`);
console.log(`Replay Job イベント: ${categories.events.replay.length}件`);
console.log(`エラー: ${categories.errors.length}件`);
console.log(`警告: ${categories.warnings.length}件`);
console.log(`署名検証: ${categories.signature.length}件`);

// HTTPステータスコード別の集計
const statusCodes = {};
categories.access.forEach(log => {
  const status = log.responseStatusCode || 'N/A';
  statusCodes[status] = (statusCodes[status] || 0) + 1;
});

if (Object.keys(statusCodes).length > 0) {
  console.log();
  console.log('HTTPステータスコード別:');
  Object.entries(statusCodes).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}件`);
  });
}

console.log();
console.log('='.repeat(80));
