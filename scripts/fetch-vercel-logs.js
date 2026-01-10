#!/usr/bin/env node
// scripts/fetch-vercel-logs.js
// Vercelエラーログの自動取得と分析スクリプト

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'vercel-logs');
const ERROR_LOG_FILE = path.join(OUTPUT_DIR, 'error-logs.json');
const ANALYSIS_FILE = path.join(OUTPUT_DIR, 'error-analysis.json');
const RAW_LOGS_FILE = path.join(OUTPUT_DIR, 'raw-logs.json'); // 生のJSONログ（全ログ）

// メモリ安全設定（Cursorクラッシュ対策）
const MAX_LOGS = 5000; // 最大ログ数（メモリ保護）
const MAX_MESSAGE_LENGTH = 3000; // メッセージの最大長（文字数）

// 出力ディレクトリを作成
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('📥 Fetching Vercel logs...\n');

try {
  // Vercel CLIでログを取得（過去24時間）
  // 注意: Vercel CLIがインストールされ、認証されている必要があります
  // Cursorクラッシュ対策: 時間範囲を短縮（過去6時間）してメモリ使用量を削減
  const logsCommand = 'vercel logs --since 6h --output json 2>&1';
  
  let logsOutput;
  try {
    logsOutput = execSync(logsCommand, { 
      encoding: 'utf-8',
      maxBuffer: 5 * 1024 * 1024, // 5MB（Cursorクラッシュ対策）
      timeout: 30000 // 30秒タイムアウト
    });
  } catch (error) {
    // Vercel CLIがインストールされていない、または認証されていない場合
    if (error.message.includes('vercel: command not found') || 
        error.message.includes('not found') ||
        error.code === 'ENOENT') {
      console.error('❌ Vercel CLIがインストールされていません。');
      console.error('   インストール: npm install -g vercel');
      console.error('   認証: vercel login');
      process.exit(1);
    }
    // その他のエラー（ログが空など）は続行
    // stdoutまたはstderrから出力を取得（2>&1でリダイレクトしているが念のため両方確認）
    logsOutput = error.stdout?.toString() || error.stderr?.toString() || '[]';
  }

  // JSON形式でログをパース（メモリ安全）
  let logs = [];
  try {
    // 複数行のJSON配列または改行区切りのJSONオブジェクトを処理
    const lines = logsOutput.trim().split('\n').filter(line => line.trim());
    
    // ログ数制限（メモリ保護）
    const limitedLines = lines.slice(0, MAX_LOGS);
    if (lines.length > MAX_LOGS) {
      console.warn(`⚠️ ログ数が上限(${MAX_LOGS})を超えています。最初の${MAX_LOGS}件のみ処理します。`);
    }
    
    logs = limitedLines.map(line => {
      try {
        const log = JSON.parse(line);
        // メッセージサイズを制限（メモリ保護）
        if (log && log.message && log.message.length > MAX_MESSAGE_LENGTH) {
          log.message = log.message.substring(0, MAX_MESSAGE_LENGTH) + '...[truncated]';
        }
        if (log && log.text && log.text.length > MAX_MESSAGE_LENGTH) {
          log.text = log.text.substring(0, MAX_MESSAGE_LENGTH) + '...[truncated]';
        }
        return log;
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch (error) {
    console.warn('⚠️ ログのパースに失敗しました。空の配列を使用します。');
    logs = [];
  }

  // エラーログのみをフィルタリング
  const errorLogs = logs.filter(log => {
    if (!log || typeof log !== 'object') return false;
    
    const level = (log.level || log.type || '').toString().toLowerCase();
    const message = (log.message || log.text || '').toString().toLowerCase();
    
    return level.includes('error') || 
           message.includes('error') ||
           message.includes('syntaxerror') ||
           message.includes('referenceerror') ||
           message.includes('typeerror') ||
           message.includes('cannot find module') ||
           message.includes('failed') ||
           message.includes('exception');
  });

  console.log(`📊 取得したログ: ${logs.length}件`);
  console.log(`❌ エラーログ: ${errorLogs.length}件\n`);

  // 生のJSONログを保存（全ログ、フィルタリング前）
  try {
    fs.writeFileSync(
      RAW_LOGS_FILE,
      JSON.stringify(logs, null, 2),
      'utf-8'
    );
    console.log(`💾 生のJSONログを保存: ${RAW_LOGS_FILE}`);
  } catch (error) {
    console.warn(`⚠️ 生のJSONログの保存に失敗しました: ${error.message}`);
  }

  // エラーログをファイルに保存（JSON形式）
  fs.writeFileSync(
    ERROR_LOG_FILE,
    JSON.stringify(errorLogs, null, 2),
    'utf-8'
  );
  console.log(`💾 エラーログを保存（JSON形式）: ${ERROR_LOG_FILE}`);

  // エラーパターンの分析
  const analysis = analyzeErrors(errorLogs);
  
  // 分析結果をファイルに保存
  try {
    fs.writeFileSync(
      ANALYSIS_FILE,
      JSON.stringify(analysis, null, 2),
      'utf-8'
    );
    console.log(`📈 分析結果を保存: ${ANALYSIS_FILE}\n`);
  } catch (error) {
    console.warn(`⚠️ 分析結果の保存に失敗しました: ${error.message}`);
  }

  // 分析結果を表示
  displayAnalysis(analysis);

  // CSV形式でも保存（Cursorが直接読み取れるように）
  if (errorLogs.length > 0) {
    try {
      console.log('\n📊 CSV形式に変換中...');
      const { convertToCSV } = require('./vercel-logs-to-csv.js');
      const result = convertToCSV();
      if (result && result.success) {
        console.log(`✅ CSV変換完了: ${result.count}件のエラーログ`);
      }
    } catch (error) {
      console.warn(`⚠️  CSV変換に失敗しました: ${error.message}`);
    }
  }

  if (errorLogs.length > 0) {
    console.log('\n⚠️ エラーログが見つかりました。詳細は上記のファイルを確認してください。');
    console.log('\n💡 Cursorで直接読み取るには:');
    console.log('   @data/vercel-logs/latest-vercel-errors.csv');
    console.log('\n💡 GitHub Issueを自動作成するには:');
    console.log('   npm run vercel:issue');
    process.exit(1);
  } else {
    console.log('\n✅ エラーログは見つかりませんでした。');
    process.exit(0);
  }

} catch (error) {
  console.error('❌ エラーログの取得に失敗しました:', error.message);
  process.exit(1);
}

/**
 * エラーログを分析
 */
function analyzeErrors(errorLogs) {
  const analysis = {
    totalErrors: errorLogs.length,
    errorPatterns: {},
    errorTypes: {},
    errorFiles: {},
    errorTimestamps: [],
    topErrors: []
  };

  errorLogs.forEach(log => {
    const message = log.message || log.text || '';
    const timestamp = log.timestamp || log.time || log.createdAt || 'unknown';
    
    // エラーパターンの集計
    const pattern = extractErrorPattern(message);
    analysis.errorPatterns[pattern] = (analysis.errorPatterns[pattern] || 0) + 1;

    // エラータイプの集計
    const errorType = extractErrorType(message);
    analysis.errorTypes[errorType] = (analysis.errorTypes[errorType] || 0) + 1;

    // ファイル別の集計
    const file = extractFileName(message) || 'unknown';
    if (!analysis.errorFiles[file]) {
      analysis.errorFiles[file] = 0;
    }
    analysis.errorFiles[file]++;

    // タイムスタンプ
    if (timestamp !== 'unknown') {
      analysis.errorTimestamps.push(timestamp);
    }
  });

  // トップエラーを抽出（出現回数順）
  analysis.topErrors = Object.entries(analysis.errorPatterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([pattern, count]) => ({ pattern, count }));

  return analysis;
}

/**
 * エラーパターンを抽出
 */
function extractErrorPattern(message) {
  if (!message || typeof message !== 'string') return 'Unknown error';
  
  // SyntaxError, ReferenceError, TypeErrorなどを検出
  const syntaxMatch = message.match(/(SyntaxError|ReferenceError|TypeError|Error):\s*(.+?)(?:\n|$)/);
  if (syntaxMatch) {
    return `${syntaxMatch[1]}: ${syntaxMatch[2].substring(0, 100)}`;
  }

  // "Cannot find module"などの一般的なパターン
  const moduleMatch = message.match(/Cannot find module ['"](.+?)['"]/);
  if (moduleMatch) {
    return `Module not found: ${moduleMatch[1]}`;
  }

  // その他のエラーメッセージの最初の100文字
  return message.substring(0, 100).replace(/\n/g, ' ').trim() || 'Unknown error';
}

/**
 * エラータイプを抽出
 */
function extractErrorType(message) {
  if (!message || typeof message !== 'string') return 'Other';
  
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('syntaxerror')) return 'SyntaxError';
  if (lowerMessage.includes('referenceerror')) return 'ReferenceError';
  if (lowerMessage.includes('typeerror')) return 'TypeError';
  if (lowerMessage.includes('cannot find module')) return 'ModuleNotFound';
  if (lowerMessage.includes('timeout')) return 'Timeout';
  if (lowerMessage.includes('permission')) return 'PermissionError';
  return 'Other';
}

/**
 * ファイル名を抽出
 */
function extractFileName(message) {
  if (!message || typeof message !== 'string') return null;
  
  const fileMatch = message.match(/([\/\\][\w\-_\/\\]+\.(js|ts|json|mjs|cjs))/);
  if (fileMatch) {
    return fileMatch[1];
  }
  return null;
}

/**
 * 分析結果を表示（出力サイズ制限 - Cursorクラッシュ対策）
 */
function displayAnalysis(analysis) {
  console.log('📊 エラー分析結果\n');
  console.log(`総エラー数: ${analysis.totalErrors}件\n`);

  if (analysis.topErrors.length > 0) {
    console.log('🔝 トップ5エラー:');
    analysis.topErrors.slice(0, 5).forEach((item, index) => {
      // パターン長を制限（出力サイズ削減）
      const pattern = item.pattern.length > 150 ? item.pattern.substring(0, 150) + '...' : item.pattern;
      console.log(`  ${index + 1}. ${pattern} (${item.count}回)`);
    });
    console.log('');
  }

  if (Object.keys(analysis.errorTypes).length > 0) {
    console.log('📋 エラータイプ別:');
    Object.entries(analysis.errorTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // トップ5のみ表示
      .forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}件`);
      });
    console.log('');
  }

  if (Object.keys(analysis.errorFiles).length > 0) {
    console.log('📁 ファイル別（トップ5）:');
    Object.entries(analysis.errorFiles)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // トップ5のみ表示
      .forEach(([file, count]) => {
        console.log(`  - ${file}: ${count}件`);
      });
    console.log('');
  }
}
