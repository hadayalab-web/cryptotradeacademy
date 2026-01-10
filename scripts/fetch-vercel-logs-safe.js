#!/usr/bin/env node
// scripts/fetch-vercel-logs-safe.js
// Vercelエラーログの自動取得と分析スクリプト（メモリ安全版）
// Cursorクラッシュ対策: ストリーミング処理、バッチサイズ制限、タイムアウト設定

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'vercel-logs');
const ERROR_LOG_FILE = path.join(OUTPUT_DIR, 'error-logs.json');
const ANALYSIS_FILE = path.join(OUTPUT_DIR, 'error-analysis.json');

// メモリ安全設定
const MAX_LOGS = 10000; // 最大ログ数（メモリ保護）
const MAX_MESSAGE_LENGTH = 5000; // メッセージの最大長（文字数）
const TIMEOUT_MS = 60000; // 60秒タイムアウト
const BATCH_SIZE = 100; // バッチ処理サイズ

// 出力ディレクトリを作成
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('📥 Fetching Vercel logs (safe mode)...\n');

/**
 * ストリーミング方式でVercelログを取得（メモリ安全）
 */
function fetchLogsStreaming() {
  return new Promise((resolve, reject) => {
    const logs = [];
    let logCount = 0;
    let buffer = '';
    
    // Vercel CLIをspawnで実行（execSyncではなく）
    // Cursorクラッシュ対策: 時間範囲を6時間に短縮
    const vercelProcess = spawn('vercel', ['logs', '--since', '6h', '--output', 'json'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });

    // タイムアウト設定
    const timeout = setTimeout(() => {
      vercelProcess.kill();
      reject(new Error(`Timeout after ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS);

    // stdoutからデータをストリーミング読み込み
    vercelProcess.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      
      // 改行で区切ってJSONオブジェクトをパース
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 最後の不完全な行を保持
      
      for (const line of lines) {
        if (logCount >= MAX_LOGS) {
          console.warn(`⚠️ ログ数が上限(${MAX_LOGS})に達しました。処理を停止します。`);
          vercelProcess.kill();
          break;
        }
        
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        try {
          const log = JSON.parse(trimmed);
          if (log && typeof log === 'object') {
            // メッセージサイズを制限（メモリ保護）
            if (log.message && log.message.length > MAX_MESSAGE_LENGTH) {
              log.message = log.message.substring(0, MAX_MESSAGE_LENGTH) + '...[truncated]';
            }
            logs.push(log);
            logCount++;
          }
        } catch (error) {
          // JSONパースエラーは無視（不完全な行など）
          continue;
        }
      }
    });

    vercelProcess.stderr.on('data', (data) => {
      const error = data.toString();
      // 認証エラーなどの重要なエラーのみ処理
      if (error.includes('not authenticated') || error.includes('not found')) {
        console.error('❌ Vercel CLI認証エラー:', error);
      }
    });

    vercelProcess.on('close', (code) => {
      clearTimeout(timeout);
      
      // 残りのバッファを処理
      if (buffer.trim()) {
        try {
          const log = JSON.parse(buffer.trim());
          if (log && typeof log === 'object' && logCount < MAX_LOGS) {
            if (log.message && log.message.length > MAX_MESSAGE_LENGTH) {
              log.message = log.message.substring(0, MAX_MESSAGE_LENGTH) + '...[truncated]';
            }
            logs.push(log);
            logCount++;
          }
        } catch (error) {
          // 無視
        }
      }
      
      if (code !== 0 && logs.length === 0) {
        reject(new Error(`Vercel CLI exited with code ${code}`));
      } else {
        resolve(logs);
      }
    });

    vercelProcess.on('error', (error) => {
      clearTimeout(timeout);
      if (error.code === 'ENOENT') {
        reject(new Error('Vercel CLIがインストールされていません。npm install -g vercel を実行してください。'));
      } else {
        reject(error);
      }
    });
  });
}

/**
 * エラーログをバッチ処理でフィルタリング（メモリ安全）
 */
function filterErrorLogs(logs) {
  const errorLogs = [];
  
  for (let i = 0; i < logs.length; i += BATCH_SIZE) {
    const batch = logs.slice(i, i + BATCH_SIZE);
    
    for (const log of batch) {
      if (!log || typeof log !== 'object') continue;
      
      const level = (log.level || log.type || '').toString().toLowerCase();
      const message = (log.message || log.text || '').toString().toLowerCase();
      
      if (level.includes('error') || 
          message.includes('error') ||
          message.includes('syntaxerror') ||
          message.includes('referenceerror') ||
          message.includes('typeerror') ||
          message.includes('cannot find module') ||
          message.includes('failed') ||
          message.includes('exception')) {
        errorLogs.push(log);
      }
    }
    
    // メモリ使用量を監視（ガベージコレクションを促す）
    if (i % (BATCH_SIZE * 10) === 0 && global.gc) {
      global.gc();
    }
  }
  
  return errorLogs;
}

/**
 * メイン処理
 */
async function main() {
  try {
    let logs = [];
    
    try {
      logs = await fetchLogsStreaming();
      console.log(`📊 取得したログ: ${logs.length}件`);
    } catch (error) {
      if (error.message.includes('not authenticated') || error.message.includes('not found')) {
        console.error('❌ Vercel CLIがインストールされていないか、認証されていません。');
        console.error('   インストール: npm install -g vercel');
        console.error('   認証: vercel login');
        process.exit(1);
      } else if (error.message.includes('Timeout')) {
        console.warn('⚠️ タイムアウトしました。取得できたログのみを処理します。');
        // 既に取得したログがあれば処理を続行
      } else {
        throw error;
      }
    }

    // エラーログをフィルタリング（バッチ処理）
    const errorLogs = filterErrorLogs(logs);
    console.log(`❌ エラーログ: ${errorLogs.length}件\n`);

    // エラーログをファイルに保存（ストリーミング書き込み）
    const writeStream = fs.createWriteStream(ERROR_LOG_FILE, { encoding: 'utf-8' });
    writeStream.write('[\n');
    
    for (let i = 0; i < errorLogs.length; i++) {
      const comma = i < errorLogs.length - 1 ? ',' : '';
      writeStream.write(JSON.stringify(errorLogs[i], null, 2) + comma + '\n');
    }
    
    writeStream.write(']');
    writeStream.end();
    
    await new Promise((resolve) => writeStream.on('finish', resolve));
    console.log(`💾 エラーログを保存: ${ERROR_LOG_FILE}`);

    // エラーパターンの分析（軽量化）
    const analysis = analyzeErrorsLightweight(errorLogs);
    
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

    // 分析結果を表示（簡潔版）
    displayAnalysisCompact(analysis);

    if (errorLogs.length > 0) {
      console.log('\n⚠️ エラーログが見つかりました。詳細は上記のファイルを確認してください。');
      process.exit(1);
    } else {
      console.log('\n✅ エラーログは見つかりませんでした。');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ エラーログの取得に失敗しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * 軽量版エラー分析（メモリ効率的）
 */
function analyzeErrorsLightweight(errorLogs) {
  const analysis = {
    totalErrors: errorLogs.length,
    errorPatterns: {},
    errorTypes: {},
    errorFiles: {},
    topErrors: []
  };

  // バッチ処理で分析
  for (let i = 0; i < errorLogs.length; i += BATCH_SIZE) {
    const batch = errorLogs.slice(i, i + BATCH_SIZE);
    
    for (const log of batch) {
      const message = (log.message || log.text || '').toString();
      
      // メッセージ長を制限
      const limitedMessage = message.substring(0, MAX_MESSAGE_LENGTH);
      
      // エラーパターンの集計
      const pattern = extractErrorPattern(limitedMessage);
      analysis.errorPatterns[pattern] = (analysis.errorPatterns[pattern] || 0) + 1;

      // エラータイプの集計
      const errorType = extractErrorType(limitedMessage);
      analysis.errorTypes[errorType] = (analysis.errorTypes[errorType] || 0) + 1;

      // ファイル別の集計
      const file = extractFileName(limitedMessage) || 'unknown';
      analysis.errorFiles[file] = (analysis.errorFiles[file] || 0) + 1;
    }
  }

  // トップエラーを抽出（出現回数順、最大10件）
  analysis.topErrors = Object.entries(analysis.errorPatterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([pattern, count]) => ({ 
      pattern: pattern.substring(0, 200), // パターンも制限
      count 
    }));

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
 * 簡潔版分析結果表示（出力サイズ制限）
 */
function displayAnalysisCompact(analysis) {
  console.log('📊 エラー分析結果\n');
  console.log(`総エラー数: ${analysis.totalErrors}件\n`);

  if (analysis.topErrors.length > 0) {
    console.log('🔝 トップ5エラー:');
    analysis.topErrors.slice(0, 5).forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.pattern} (${item.count}回)`);
    });
    console.log('');
  }

  if (Object.keys(analysis.errorTypes).length > 0) {
    console.log('📋 エラータイプ別:');
    Object.entries(analysis.errorTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}件`);
      });
    console.log('');
  }

  if (Object.keys(analysis.errorFiles).length > 0) {
    console.log('📁 ファイル別（トップ5）:');
    Object.entries(analysis.errorFiles)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([file, count]) => {
        console.log(`  - ${file}: ${count}件`);
      });
    console.log('');
  }
}

// メイン処理を実行
main().catch(error => {
  console.error('❌ 予期しないエラー:', error);
  process.exit(1);
});
