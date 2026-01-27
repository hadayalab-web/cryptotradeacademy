// scripts/analyze-x-post-status.js
// X投稿の成功/失敗状況を分析するスクリプト

const fs = require('fs');
const path = require('path');

// ログファイルのパス（コマンドライン引数から取得、またはデフォルト）
const LOG_FILE = process.argv[2] || path.join(__dirname, '../../Downloads/logs_result (7).json');

if (!fs.existsSync(LOG_FILE)) {
  console.error(`❌ ログファイルが見つかりません: ${LOG_FILE}`);
  process.exit(1);
}

console.log(`📊 X投稿状況を分析中: ${LOG_FILE}\n`);

let logs;
try {
  const data = fs.readFileSync(LOG_FILE, 'utf8');
  logs = JSON.parse(data);
  console.log(`✅ ログファイルを読み込みました: ${logs.length}件\n`);
} catch (error) {
  console.error(`❌ ログファイルの読み込みに失敗しました: ${error.message}`);
  process.exit(1);
}

if (!Array.isArray(logs)) {
  console.error('❌ ログファイルの形式が不正です（配列である必要があります）。');
  process.exit(1);
}

// X投稿関連のログを抽出
const xPostLogs = {
  minimalVersion: [],
  freeReport: [],
  quoteRepost: [],
  proofPost: [],
  webhook: [],
  success: [],
  failed: [],
  skipped: []
};

logs.forEach((log) => {
  if (!log || typeof log !== 'object') return;
  
  const message = (log.message || '').toString();
  const requestPath = log.requestPath || '';
  
  // X投稿関連のログを分類
  if (requestPath.includes('x-post-minimal-version-cron')) {
    xPostLogs.minimalVersion.push(log);
    if (message.includes('completed') || message.includes('successfully') || message.includes('✅')) {
      xPostLogs.success.push(log);
    } else if (message.includes('Failed') || message.includes('Error') || message.includes('❌')) {
      xPostLogs.failed.push(log);
    } else if (message.includes('skipped') || message.includes('Skipping') || message.includes('dry-run')) {
      xPostLogs.skipped.push(log);
    }
  } else if (requestPath.includes('x-post-free-report')) {
    xPostLogs.freeReport.push(log);
    if (message.includes('Post count incremented') || message.includes('posted successfully') || message.includes('✅')) {
      xPostLogs.success.push(log);
    } else if (message.includes('Failed') || message.includes('Error') || message.includes('❌')) {
      xPostLogs.failed.push(log);
    } else if (message.includes('skipped') || message.includes('Skipping') || message.includes('dry-run') || message.includes('already posted')) {
      xPostLogs.skipped.push(log);
    }
  } else if (requestPath.includes('x-quote-repost')) {
    xPostLogs.quoteRepost.push(log);
    if (message.includes('posted successfully') || message.includes('Quote tweet posted') || message.includes('✅')) {
      xPostLogs.success.push(log);
    } else if (message.includes('Failed') || message.includes('Error') || message.includes('❌')) {
      xPostLogs.failed.push(log);
    } else if (message.includes('skipped') || message.includes('Skipping') || message.includes('dry-run')) {
      xPostLogs.skipped.push(log);
    }
  } else if (requestPath.includes('x-webhook')) {
    xPostLogs.webhook.push(log);
    if (message.includes('Like event') || message.includes('Retweet event') || message.includes('Reply event') || message.includes('VIRAL POST')) {
      xPostLogs.success.push(log);
    }
  }
  
  // X Proof Post（cron.js内から実行）
  if (message.includes('X Proof Post') || message.includes('X Proof')) {
    xPostLogs.proofPost.push(log);
    if (message.includes('Posted successfully') || message.includes('✅')) {
      xPostLogs.success.push(log);
    } else if (message.includes('Failed') || message.includes('Error') || message.includes('❌')) {
      xPostLogs.failed.push(log);
    }
  }
});

// 結果を表示
console.log('='.repeat(80));
console.log('📊 X投稿状況分析結果');
console.log('='.repeat(80));

console.log(`\n📈 実行状況:`);
console.log(`  Minimal Version Cron: ${xPostLogs.minimalVersion.length}件`);
console.log(`  Free Report: ${xPostLogs.freeReport.length}件`);
console.log(`  Quote Repost: ${xPostLogs.quoteRepost.length}件`);
console.log(`  Proof Post: ${xPostLogs.proofPost.length}件`);
console.log(`  Webhook: ${xPostLogs.webhook.length}件`);

console.log(`\n✅ 成功: ${xPostLogs.success.length}件`);
console.log(`❌ 失敗: ${xPostLogs.failed.length}件`);
console.log(`⏸️  スキップ: ${xPostLogs.skipped.length}件`);

if (xPostLogs.success.length > 0) {
  console.log(`\n✅ 成功ログ（上位10件）:`);
  xPostLogs.success.slice(0, 10).forEach((log, index) => {
    const timestamp = log.TimeUTC || log.timestamp || 'unknown';
    const message = (log.message || '').substring(0, 150);
    console.log(`  [${index + 1}] ${timestamp}: ${message}`);
  });
}

if (xPostLogs.failed.length > 0) {
  console.log(`\n❌ 失敗ログ（上位10件）:`);
  xPostLogs.failed.slice(0, 10).forEach((log, index) => {
    const timestamp = log.TimeUTC || log.timestamp || 'unknown';
    const requestPath = log.requestPath || 'unknown';
    const message = (log.message || '').substring(0, 200);
    console.log(`  [${index + 1}] ${timestamp}`);
    console.log(`      パス: ${requestPath}`);
    console.log(`      メッセージ: ${message}`);
  });
}

if (xPostLogs.webhook.length > 0) {
  console.log(`\n🔔 X Webhookイベント（上位10件）:`);
  xPostLogs.webhook.slice(0, 10).forEach((log, index) => {
    const timestamp = log.TimeUTC || log.timestamp || 'unknown';
    const message = (log.message || '').substring(0, 150);
    console.log(`  [${index + 1}] ${timestamp}: ${message}`);
  });
}

// 分析結果をファイルに保存
const outputFile = path.join(__dirname, '../docs/reports/x-post-status-analysis.md');
const outputContent = `# X投稿状況分析結果

**分析日時**: ${new Date().toISOString()}
**ログファイル**: ${LOG_FILE}

## 📊 サマリー

- **Minimal Version Cron**: ${xPostLogs.minimalVersion.length}件
- **Free Report**: ${xPostLogs.freeReport.length}件
- **Quote Repost**: ${xPostLogs.quoteRepost.length}件
- **Proof Post**: ${xPostLogs.proofPost.length}件
- **Webhook**: ${xPostLogs.webhook.length}件

## 📈 実行結果

- **✅ 成功**: ${xPostLogs.success.length}件
- **❌ 失敗**: ${xPostLogs.failed.length}件
- **⏸️  スキップ**: ${xPostLogs.skipped.length}件

## ✅ 成功ログ

${xPostLogs.success.slice(0, 20).map((log, index) => `
### 成功 ${index + 1}

- **タイムスタンプ**: ${log.TimeUTC || log.timestamp || 'unknown'}
- **リクエストパス**: ${log.requestPath || 'unknown'}
- **メッセージ**: ${(log.message || '').substring(0, 500)}
`).join('\n')}

## ❌ 失敗ログ

${xPostLogs.failed.slice(0, 20).map((log, index) => `
### 失敗 ${index + 1}

- **タイムスタンプ**: ${log.TimeUTC || log.timestamp || 'unknown'}
- **リクエストパス**: ${log.requestPath || 'unknown'}
- **メッセージ**: ${(log.message || '').substring(0, 500)}
`).join('\n')}

## 🔔 X Webhookイベント

${xPostLogs.webhook.slice(0, 20).map((log, index) => `
### Webhookイベント ${index + 1}

- **タイムスタンプ**: ${log.TimeUTC || log.timestamp || 'unknown'}
- **メッセージ**: ${(log.message || '').substring(0, 500)}
`).join('\n')}
`;

try {
  fs.writeFileSync(outputFile, outputContent, 'utf-8');
  console.log(`\n💾 分析結果を保存しました: ${outputFile}`);
} catch (error) {
  console.error(`\n⚠️ 分析結果の保存に失敗しました: ${error.message}`);
}

console.log('\n' + '='.repeat(80));
console.log('✅ 分析完了');
console.log('='.repeat(80));
