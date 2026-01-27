// scripts/analyze-webhook-logs-detailed.js
// Webhookログの詳細分析

const fs = require('fs');
const path = require('path');

const LOG_FILE = 'c:\\Users\\chiba\\Downloads\\logs_result (3).json';
const OUTPUT_DIR = path.join(__dirname, '../docs/reports');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'webhook-logs-detailed-analysis.md');

// 出力ディレクトリが存在しない場合は作成
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * ログファイルを読み込む
 */
function readLogsFile() {
  try {
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    let logs = [];
    
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        logs = parsed;
      } else if (typeof parsed === 'object') {
        logs = [parsed];
      }
    } catch {
      const lines = content.trim().split('\n').filter(line => line.trim());
      logs = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean);
    }
    
    return logs;
  } catch (error) {
    console.error(`❌ ログファイルの読み込みに失敗: ${error.message}`);
    throw error;
  }
}

/**
 * Webhookログを詳細分析
 */
function analyzeWebhookLogs(logs) {
  console.log(`📊 Webhookログを詳細分析中...\n`);
  
  // Webhook関連のログを抽出
  const webhookLogs = logs.filter(log => {
    if (!log || typeof log !== 'object') return false;
    const path = log.requestPath || log.path || '';
    const message = (log.message || log.text || '').toString();
    return path.includes('x-webhook') || message.includes('[X Webhook]');
  });
  
  console.log(`✅ Webhook関連のログ: ${webhookLogs.length}件\n`);
  
  const analysis = {
    totalLogs: webhookLogs.length,
    getRequests: [],
    postRequests: [],
    crcVerification: {
      successful: [],
      failed: [],
    },
    events: {
      favorite: [],
      retweet: [],
      reply: [],
      replayJobStatus: [],
      other: [],
    },
    errors: [],
    accessLogs: [],
  };
  
  // ログを分析
  webhookLogs.forEach((log, index) => {
    const message = (log.message || log.text || '').toString();
    const timestamp = log.timestamp || log.TimeUTC || log.timestampInMs || null;
    const path = log.requestPath || log.path || '';
    const method = log.requestMethod || log.method || '';
    const statusCode = log.responseStatusCode || log.statusCode || null;
    
    // GETリクエスト（CRC検証）
    if (method === 'GET' || message.includes('GET request received')) {
      analysis.getRequests.push({
        timestamp,
        message,
        path,
        method,
        statusCode,
        log,
      });
      
      if (message.includes('CRC verification successful')) {
        analysis.crcVerification.successful.push({
          timestamp,
          message,
          path,
          method,
          statusCode,
          log,
        });
      } else if (message.includes('CRC verification failed')) {
        analysis.crcVerification.failed.push({
          timestamp,
          message,
          path,
          method,
          statusCode,
          log,
        });
      }
    }
    
    // POSTリクエスト（イベント受信）
    if (method === 'POST' || message.includes('POST request received')) {
      analysis.postRequests.push({
        timestamp,
        message,
        path,
        method,
        statusCode,
        log,
      });
      
      // イベントタイプを検出
      if (message.includes('favorite_events') || message.includes('Like event')) {
        analysis.events.favorite.push({
          timestamp,
          message,
          path,
          method,
          statusCode,
          log,
        });
      }
      
      if (message.includes('retweet_events') || message.includes('Retweet event')) {
        analysis.events.retweet.push({
          timestamp,
          message,
          path,
          method,
          statusCode,
          log,
        });
      }
      
      if (message.includes('tweet_create_events') || message.includes('Reply event')) {
        analysis.events.reply.push({
          timestamp,
          message,
          path,
          method,
          statusCode,
          log,
        });
      }
      
      if (message.includes('replay_job_status')) {
        analysis.events.replayJobStatus.push({
          timestamp,
          message,
          path,
          method,
          statusCode,
          log,
        });
      }
      
      // その他のイベント
      if (message.includes('Received webhook event') && 
          !message.includes('favorite_events') && 
          !message.includes('retweet_events') && 
          !message.includes('tweet_create_events') &&
          !message.includes('replay_job_status')) {
        analysis.events.other.push({
          timestamp,
          message,
          path,
          method,
          statusCode,
          log,
        });
      }
    }
    
    // アクセスログ
    if (message.includes('Access logged') || message.includes('logWebhookAccess')) {
      analysis.accessLogs.push({
        timestamp,
        message,
        path,
        method,
        statusCode,
        log,
      });
    }
    
    // エラー
    if (message.includes('error') || message.includes('Error') || message.includes('ERROR') || 
        message.includes('failed') || message.includes('Failed') || message.includes('FAILED') ||
        statusCode >= 400) {
      analysis.errors.push({
        timestamp,
        message,
        path,
        method,
        statusCode,
        log,
      });
    }
  });
  
  return analysis;
}

/**
 * 分析結果をMarkdown形式で出力
 */
function generateReport(analysis) {
  const lines = [];
  
  lines.push('# Webhookログ詳細分析レポート');
  lines.push(`**作成日時**: ${new Date().toISOString()}`);
  lines.push('');
  
  // サマリー
  lines.push('## 📊 サマリー');
  lines.push('');
  lines.push(`- **総Webhookログ数**: ${analysis.totalLogs.toLocaleString()}件`);
  lines.push(`- **GETリクエスト（CRC検証）**: ${analysis.getRequests.length}件`);
  lines.push(`- **POSTリクエスト（イベント受信）**: ${analysis.postRequests.length}件`);
  lines.push(`- **CRC検証成功**: ${analysis.crcVerification.successful.length}件`);
  lines.push(`- **CRC検証失敗**: ${analysis.crcVerification.failed.length}件`);
  lines.push(`- **アクセスログ記録**: ${analysis.accessLogs.length}件`);
  lines.push('');
  
  // イベントタイプ別の集計
  lines.push('## 🔔 イベントタイプ別の集計');
  lines.push('');
  lines.push(`- **いいねイベント**: ${analysis.events.favorite.length}件`);
  lines.push(`- **リツイートイベント**: ${analysis.events.retweet.length}件`);
  lines.push(`- **リプライイベント**: ${analysis.events.reply.length}件`);
  lines.push(`- **Replay Job Statusイベント**: ${analysis.events.replayJobStatus.length}件`);
  lines.push(`- **その他のイベント**: ${analysis.events.other.length}件`);
  lines.push('');
  
  // GETリクエストの詳細
  if (analysis.getRequests.length > 0) {
    lines.push('## 📥 GETリクエスト（CRC検証）の詳細');
    lines.push('');
    analysis.getRequests.forEach((req, index) => {
      lines.push(`### ${index + 1}. ${req.timestamp || 'Unknown'}`);
      lines.push(`- **パス**: ${req.path || 'Unknown'}`);
      lines.push(`- **メソッド**: ${req.method || 'Unknown'}`);
      lines.push(`- **ステータスコード**: ${req.statusCode || 'Unknown'}`);
      lines.push(`- **メッセージ**: ${req.message.substring(0, 500)}`);
      lines.push('');
    });
  }
  
  // POSTリクエストの詳細
  if (analysis.postRequests.length > 0) {
    lines.push('## 📨 POSTリクエスト（イベント受信）の詳細');
    lines.push('');
    analysis.postRequests.forEach((req, index) => {
      lines.push(`### ${index + 1}. ${req.timestamp || 'Unknown'}`);
      lines.push(`- **パス**: ${req.path || 'Unknown'}`);
      lines.push(`- **メソッド**: ${req.method || 'Unknown'}`);
      lines.push(`- **ステータスコード**: ${req.statusCode || 'Unknown'}`);
      lines.push(`- **メッセージ**: ${req.message.substring(0, 1000)}`);
      lines.push('');
    });
  }
  
  // Replay Job Statusイベントの詳細
  if (analysis.events.replayJobStatus.length > 0) {
    lines.push('## 🔄 Replay Job Statusイベントの詳細');
    lines.push('');
    lines.push('**説明**: Replay Job Statusイベントは、X APIがWebhookイベントのリプレイジョブの完了を通知するイベントです。');
    lines.push('実際のエンゲージメントイベント（いいね、リツイート、リプライ）ではありません。');
    lines.push('');
    analysis.events.replayJobStatus.forEach((event, index) => {
      lines.push(`### ${index + 1}. ${event.timestamp || 'Unknown'}`);
      lines.push(`- **メッセージ**: ${event.message.substring(0, 500)}`);
      lines.push('');
    });
  }
  
  // 重要な発見
  lines.push('## 🔍 重要な発見');
  lines.push('');
  
  if (analysis.getRequests.length > 0) {
    lines.push('✅ **CRC検証は成功しています**');
    lines.push(`- GETリクエスト: ${analysis.getRequests.length}件`);
    lines.push(`- CRC検証成功: ${analysis.crcVerification.successful.length}件`);
    lines.push(`- CRC検証失敗: ${analysis.crcVerification.failed.length}件`);
    lines.push('');
    lines.push('**意味**: X APIがWebhook URLを正しく検証できており、Webhook URLは有効です。');
    lines.push('');
  }
  
  if (analysis.postRequests.length > 0 && analysis.events.favorite.length === 0 && 
      analysis.events.retweet.length === 0 && analysis.events.reply.length === 0) {
    lines.push('⚠️ **POSTリクエストは受信されているが、エンゲージメントイベントが0件**');
    lines.push(`- POSTリクエスト: ${analysis.postRequests.length}件`);
    lines.push(`- いいねイベント: ${analysis.events.favorite.length}件`);
    lines.push(`- リツイートイベント: ${analysis.events.retweet.length}件`);
    lines.push(`- リプライイベント: ${analysis.events.reply.length}件`);
    lines.push('');
    lines.push('**考えられる原因**:');
    lines.push('1. 実際にエンゲージメント（いいね、リツイート、リプライ）が発生していない');
    lines.push('2. イベントサブスクリプションが正しく設定されていない');
    lines.push('3. 投稿がまだ公開されていない、またはエンゲージメントがまだ発生していない');
    lines.push('');
  }
  
  if (analysis.accessLogs.length === 0) {
    lines.push('⚠️ **アクセスログが記録されていません**');
    lines.push('');
    lines.push('**意味**: `logWebhookAccess`関数が実行されていない、またはログが記録されていません。');
    lines.push('以前実装した`logWebhookAccess`関数が動作しているか確認してください。');
    lines.push('');
  }
  
  // 推奨事項
  lines.push('## 💡 推奨事項');
  lines.push('');
  
  if (analysis.events.favorite.length === 0 && analysis.events.retweet.length === 0 && 
      analysis.events.reply.length === 0) {
    lines.push('1. **エンゲージメントイベントの確認**');
    lines.push('   - X API Developer Portalでイベントサブスクリプションを確認');
    lines.push('   - 必要なイベントタイプ（いいね、リツイート、リプライ）がサブスクライブされているか確認');
    lines.push('   - 実際にエンゲージメントが発生しているか確認（投稿へのいいね、リツイート、リプライ）');
    lines.push('');
  }
  
  if (analysis.accessLogs.length === 0) {
    lines.push('2. **アクセスログの確認**');
    lines.push('   - `api/x-webhook.js`の`logWebhookAccess`関数が実行されているか確認');
    lines.push('   - Vercel KVへの書き込みが成功しているか確認');
    lines.push('   - `api/x-webhook-logs.js`エンドポイントでログを取得できるか確認');
    lines.push('');
  }
  
  lines.push('3. **Webhookログの継続的な監視**');
  lines.push('   - 定期的に`api/x-webhook-logs.js`エンドポイントでログを確認');
  lines.push('   - Vercelログで`[X Webhook]`で始まるログを検索');
  lines.push('   - エンゲージメントイベントが発生した際にログが記録されるか確認');
  lines.push('');
  
  return lines.join('\n');
}

/**
 * メイン処理
 */
function main() {
  try {
    console.log('📊 Webhookログを詳細分析中...\n');
    
    // ログファイルを読み込む
    const logs = readLogsFile();
    console.log(`✅ ログファイルを読み込みました: ${logs.length}件\n`);
    
    // Webhookログを分析
    const analysis = analyzeWebhookLogs(logs);
    
    // レポートを生成
    const report = generateReport(analysis);
    
    // レポートをファイルに保存
    fs.writeFileSync(OUTPUT_FILE, report, 'utf-8');
    console.log(`✅ レポートを保存しました: ${OUTPUT_FILE}\n`);
    
    // サマリーを表示
    console.log('📊 Webhookログ分析結果サマリー:');
    console.log(`- 総Webhookログ数: ${analysis.totalLogs.toLocaleString()}件`);
    console.log(`- GETリクエスト（CRC検証）: ${analysis.getRequests.length}件`);
    console.log(`- POSTリクエスト（イベント受信）: ${analysis.postRequests.length}件`);
    console.log(`- CRC検証成功: ${analysis.crcVerification.successful.length}件`);
    console.log(`- CRC検証失敗: ${analysis.crcVerification.failed.length}件`);
    console.log(`- いいねイベント: ${analysis.events.favorite.length}件`);
    console.log(`- リツイートイベント: ${analysis.events.retweet.length}件`);
    console.log(`- リプライイベント: ${analysis.events.reply.length}件`);
    console.log(`- Replay Job Statusイベント: ${analysis.events.replayJobStatus.length}件`);
    console.log(`- アクセスログ記録: ${analysis.accessLogs.length}件`);
    console.log('');
    
    if (analysis.postRequests.length > 0 && analysis.events.favorite.length === 0 && 
        analysis.events.retweet.length === 0 && analysis.events.reply.length === 0) {
      console.log('⚠️ 警告: POSTリクエストは受信されているが、エンゲージメントイベントが0件です。');
    }
    
    console.log('\n✅ 分析完了');
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// 実行
if (require.main === module) {
  main();
}

module.exports = { analyzeWebhookLogs, generateReport };
