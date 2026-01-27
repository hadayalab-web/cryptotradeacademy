// scripts/analyze-vercel-logs-result.js
// Vercelログファイルを分析するスクリプト

const fs = require('fs');
const path = require('path');

// ログファイルのパス（コマンドライン引数から取得、またはデフォルト）
const LOG_FILE = process.argv[2] || path.join(__dirname, '../../Downloads/logs_result (1).json');

if (!fs.existsSync(LOG_FILE)) {
  console.error(`❌ ログファイルが見つかりません: ${LOG_FILE}`);
  process.exit(1);
}

console.log(`📊 ログファイルを分析中: ${LOG_FILE}\n`);

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

// 分析結果
const analysis = {
  total: logs.length,
  statusCodes: {},
  errors: [],
  warnings: [],
  requestPaths: {},
  timestamps: [],
  errorPatterns: {},
  topErrors: []
};

logs.forEach((log, index) => {
  if (!log || typeof log !== 'object') return;

  // ステータスコードの集計
  const statusCode = log.responseStatusCode || log.statusCode || 'unknown';
  analysis.statusCodes[statusCode] = (analysis.statusCodes[statusCode] || 0) + 1;

  // リクエストパスの集計
  const requestPath = log.requestPath || log.path || 'unknown';
  analysis.requestPaths[requestPath] = (analysis.requestPaths[requestPath] || 0) + 1;

  // タイムスタンプ
  const timestamp = log.TimeUTC || log.timestamp || log.time || 'unknown';
  if (timestamp !== 'unknown') {
    analysis.timestamps.push(timestamp);
  }

  // エラーの検出
  const message = (log.message || log.text || log.error || '').toString();
  const level = (log.level || log.type || '').toString().toLowerCase();
  
  if (statusCode >= 400 || level.includes('error') || message.toLowerCase().includes('error')) {
    analysis.errors.push({
      index,
      timestamp,
      statusCode,
      requestPath,
      message: message.substring(0, 500), // 長いメッセージを切り詰め
      requestId: log.requestId || 'unknown',
      fullLog: log
    });

    // エラーパターンの抽出
    let pattern = 'Other';
    if (message.includes('SyntaxError')) pattern = 'SyntaxError';
    else if (message.includes('ReferenceError')) pattern = 'ReferenceError';
    else if (message.includes('TypeError')) pattern = 'TypeError';
    else if (message.includes('Cannot find module')) pattern = 'ModuleNotFound';
    else if (message.includes('timeout')) pattern = 'Timeout';
    else if (message.includes('integratedOptimization')) pattern = 'integratedOptimization';
    else if (message.includes('GPT API')) pattern = 'GPT API Error';
    else if (message.includes('Regular Briefing') || message.includes('REGULAR')) pattern = 'Regular Briefing';
    
    analysis.errorPatterns[pattern] = (analysis.errorPatterns[pattern] || 0) + 1;
  }

  // 警告の検出
  if (level.includes('warn') || message.toLowerCase().includes('warning')) {
    analysis.warnings.push({
      index,
      timestamp,
      requestPath,
      message: message.substring(0, 500)
    });
  }
});

// トップエラーを抽出
analysis.topErrors = Object.entries(analysis.errorPatterns)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([pattern, count]) => ({ pattern, count }));

// 結果を表示
console.log('='.repeat(80));
console.log('📊 Vercelログ分析結果');
console.log('='.repeat(80));
console.log(`\n総ログ数: ${analysis.total}件`);
console.log(`エラー数: ${analysis.errors.length}件`);
console.log(`警告数: ${analysis.warnings.length}件`);

console.log('\n📈 ステータスコード別の集計:');
Object.entries(analysis.statusCodes)
  .sort((a, b) => b[1] - a[1])
  .forEach(([code, count]) => {
    const percentage = ((count / analysis.total) * 100).toFixed(1);
    console.log(`  ${code}: ${count}件 (${percentage}%)`);
  });

console.log('\n🔍 エラーパターン別の集計:');
analysis.topErrors.forEach(({ pattern, count }) => {
  console.log(`  ${pattern}: ${count}件`);
});

console.log('\n🌐 リクエストパス別の集計（上位10件）:');
Object.entries(analysis.requestPaths)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([path, count]) => {
    console.log(`  ${path}: ${count}件`);
  });

if (analysis.errors.length > 0) {
  console.log('\n❌ エラー詳細（上位10件）:');
  analysis.errors.slice(0, 10).forEach((error, index) => {
    console.log(`\n  [${index + 1}] ${error.timestamp}`);
    console.log(`      ステータス: ${error.statusCode}`);
    console.log(`      パス: ${error.requestPath}`);
    console.log(`      リクエストID: ${error.requestId}`);
    console.log(`      メッセージ: ${error.message.substring(0, 200)}`);
  });
}

// 分析結果をファイルに保存
const outputFile = path.join(__dirname, '../docs/reports/vercel-logs-analysis-result.md');
const outputContent = `# Vercelログ分析結果

**分析日時**: ${new Date().toISOString()}
**ログファイル**: ${LOG_FILE}
**総ログ数**: ${analysis.total}件

## 📊 サマリー

- **エラー数**: ${analysis.errors.length}件
- **警告数**: ${analysis.warnings.length}件

## 📈 ステータスコード別の集計

${Object.entries(analysis.statusCodes)
  .sort((a, b) => b[1] - a[1])
  .map(([code, count]) => `- **${code}**: ${count}件 (${((count / analysis.total) * 100).toFixed(1)}%)`)
  .join('\n')}

## 🔍 エラーパターン別の集計

${analysis.topErrors.map(({ pattern, count }) => `- **${pattern}**: ${count}件`).join('\n')}

## 🌐 リクエストパス別の集計（上位10件）

${Object.entries(analysis.requestPaths)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([path, count]) => `- **${path}**: ${count}件`)
  .join('\n')}

## ❌ エラー詳細

${analysis.errors.slice(0, 20).map((error, index) => `
### エラー ${index + 1}

- **タイムスタンプ**: ${error.timestamp}
- **ステータスコード**: ${error.statusCode}
- **リクエストパス**: ${error.requestPath}
- **リクエストID**: ${error.requestId}
- **メッセージ**: ${error.message}

\`\`\`json
${JSON.stringify(error.fullLog, null, 2).substring(0, 1000)}
\`\`\`
`).join('\n')}

## ⚠️ 警告詳細

${analysis.warnings.slice(0, 10).map((warning, index) => `
### 警告 ${index + 1}

- **タイムスタンプ**: ${warning.timestamp}
- **リクエストパス**: ${warning.requestPath}
- **メッセージ**: ${warning.message}
`).join('\n')}
`;

try {
  fs.writeFileSync(outputFile, outputContent, 'utf-8');
  console.log(`\n💾 分析結果を保存しました: ${outputFile}`);
} catch (error) {
  console.error(`\n⚠️ 分析結果の保存に失敗しました: ${error.message}`);
}

// JSON形式でも保存
const jsonOutputFile = path.join(__dirname, '../docs/reports/vercel-logs-analysis-result.json');
try {
  fs.writeFileSync(jsonOutputFile, JSON.stringify(analysis, null, 2), 'utf-8');
  console.log(`💾 JSON形式の分析結果を保存しました: ${jsonOutputFile}`);
} catch (error) {
  console.error(`⚠️ JSON形式の分析結果の保存に失敗しました: ${error.message}`);
}

console.log('\n' + '='.repeat(80));
console.log('✅ 分析完了');
console.log('='.repeat(80));
