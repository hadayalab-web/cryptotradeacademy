// scripts/analyze-logs-result-3.js
// logs_result (3).jsonを分析（WebhookログとX API呼び出し状況に特化）

const fs = require('fs');
const path = require('path');

const LOG_FILE = 'c:\\Users\\chiba\\Downloads\\logs_result (3).json';
const OUTPUT_DIR = path.join(__dirname, '../docs/reports');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'logs-result-3-analysis.md');

// 出力ディレクトリが存在しない場合は作成
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * ログファイルを読み込む（ストリーミング方式）
 */
function readLogsFile() {
  try {
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    
    // JSON配列または改行区切りのJSONオブジェクトを処理
    let logs = [];
    
    // まず、JSON配列としてパースを試みる
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        logs = parsed;
      } else if (typeof parsed === 'object') {
        logs = [parsed];
      }
    } catch {
      // JSON配列としてパースできない場合、改行区切りのJSONオブジェクトとして処理
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
 * ログを分析
 */
function analyzeLogs(logs) {
  console.log(`📊 ログ分析を開始... (総ログ数: ${logs.length}件)\n`);
  
  const analysis = {
    summary: {
      totalLogs: logs.length,
      timeRange: {
        earliest: null,
        latest: null,
      },
    },
    endpoints: {},
    methods: {},
    statusCodes: {},
    webhookLogs: {
      get: [],
      post: [],
      crcVerification: [],
      events: {
        like: [],
        retweet: [],
        reply: [],
      },
    },
    xApiLogs: {
      requests: [],
      responses: [],
      errors: [],
      postQuoteTweet: [],
      postTweet: [],
    },
    errors: [],
    warnings: [],
  };
  
  // ログを分析
  logs.forEach((log, index) => {
    if (!log || typeof log !== 'object') return;
    
    const message = (log.message || log.text || '').toString();
    const timestamp = log.timestamp || log.time || log.createdAt || null;
    const path = log.path || log.url || log.requestPath || '';
    const method = log.method || '';
    const statusCode = log.statusCode || log.responseStatusCode || null;
    
    // タイムスタンプの範囲を更新
    if (timestamp) {
      if (!analysis.summary.timeRange.earliest || timestamp < analysis.summary.timeRange.earliest) {
        analysis.summary.timeRange.earliest = timestamp;
      }
      if (!analysis.summary.timeRange.latest || timestamp > analysis.summary.timeRange.latest) {
        analysis.summary.timeRange.latest = timestamp;
      }
    }
    
    // エンドポイント別の集計
    if (path) {
      const endpoint = path.split('?')[0]; // クエリパラメータを除去
      if (!analysis.endpoints[endpoint]) {
        analysis.endpoints[endpoint] = {
          count: 0,
          methods: {},
          statusCodes: {},
          errors: [],
        };
      }
      analysis.endpoints[endpoint].count++;
      
      if (method) {
        analysis.endpoints[endpoint].methods[method] = (analysis.endpoints[endpoint].methods[method] || 0) + 1;
      }
      
      if (statusCode) {
        analysis.endpoints[endpoint].statusCodes[statusCode] = (analysis.endpoints[endpoint].statusCodes[statusCode] || 0) + 1;
      }
    }
    
    // HTTPメソッド別の集計
    if (method) {
      analysis.methods[method] = (analysis.methods[method] || 0) + 1;
    }
    
    // ステータスコード別の集計
    if (statusCode) {
      analysis.statusCodes[statusCode] = (analysis.statusCodes[statusCode] || 0) + 1;
    }
    
    // Webhookログの検出
    if (message.includes('[X Webhook]') || path.includes('/x-webhook')) {
      if (message.includes('GET request received') || message.includes('CRC verification')) {
        analysis.webhookLogs.get.push({
          timestamp,
          message,
          path,
          log,
        });
        
        if (message.includes('CRC verification successful')) {
          analysis.webhookLogs.crcVerification.push({
            timestamp,
            message,
            path,
            log,
          });
        }
      }
      
      if (message.includes('POST request received') || message.includes('Received webhook event')) {
        analysis.webhookLogs.post.push({
          timestamp,
          message,
          path,
          log,
        });
      }
      
      if (message.includes('Like event')) {
        analysis.webhookLogs.events.like.push({
          timestamp,
          message,
          path,
          log,
        });
      }
      
      if (message.includes('Retweet event')) {
        analysis.webhookLogs.events.retweet.push({
          timestamp,
          message,
          path,
          log,
        });
      }
      
      if (message.includes('Reply event')) {
        analysis.webhookLogs.events.reply.push({
          timestamp,
          message,
          path,
          log,
        });
      }
    }
    
    // X APIログの検出
    if (message.includes('[X API]')) {
      if (message.includes('xApiRequest called')) {
        analysis.xApiLogs.requests.push({
          timestamp,
          message,
          path,
          log,
        });
      }
      
      if (message.includes('Response received')) {
        analysis.xApiLogs.responses.push({
          timestamp,
          message,
          path,
          log,
        });
      }
      
      if (message.includes('Failed to post quote tweet') || message.includes('Failed to post tweet')) {
        analysis.xApiLogs.errors.push({
          timestamp,
          message,
          path,
          log,
        });
      }
      
      if (message.includes('postQuoteTweet') || message.includes('Quote tweet posted successfully')) {
        analysis.xApiLogs.postQuoteTweet.push({
          timestamp,
          message,
          path,
          log,
        });
      }
      
      if (message.includes('postTweet') || message.includes('Tweet posted successfully')) {
        analysis.xApiLogs.postTweet.push({
          timestamp,
          message,
          path,
          log,
        });
      }
    }
    
    // エラーログの検出
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
    
    // 警告ログの検出
    if (message.includes('warn') || message.includes('Warn') || message.includes('WARN') ||
        message.includes('⚠️') || message.includes('warning')) {
      analysis.warnings.push({
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
  
  lines.push('# logs_result (3).json 分析レポート');
  lines.push(`**作成日時**: ${new Date().toISOString()}`);
  lines.push('');
  
  // サマリー
  lines.push('## 📊 サマリー');
  lines.push('');
  lines.push(`- **総ログ数**: ${analysis.summary.totalLogs.toLocaleString()}件`);
  if (analysis.summary.timeRange.earliest && analysis.summary.timeRange.latest) {
    lines.push(`- **時間範囲**: ${analysis.summary.timeRange.earliest} ～ ${analysis.summary.timeRange.latest}`);
  }
  lines.push('');
  
  // Webhookログ
  lines.push('## 🔔 Webhookログ');
  lines.push('');
  lines.push(`- **GETリクエスト（CRC検証）**: ${analysis.webhookLogs.get.length}件`);
  lines.push(`- **CRC検証成功**: ${analysis.webhookLogs.crcVerification.length}件`);
  lines.push(`- **POSTリクエスト（イベント受信）**: ${analysis.webhookLogs.post.length}件`);
  lines.push(`- **いいねイベント**: ${analysis.webhookLogs.events.like.length}件`);
  lines.push(`- **リツイートイベント**: ${analysis.webhookLogs.events.retweet.length}件`);
  lines.push(`- **リプライイベント**: ${analysis.webhookLogs.events.reply.length}件`);
  lines.push('');
  
  if (analysis.webhookLogs.get.length === 0 && analysis.webhookLogs.post.length === 0) {
    lines.push('⚠️ **警告**: Webhookへのリクエストが1件も記録されていません。');
    lines.push('');
    lines.push('考えられる原因:');
    lines.push('1. Webhook URLが正しく登録されていない');
    lines.push('2. X APIがWebhook URLにリクエストを送信していない');
    lines.push('3. ログの取得範囲外（時間範囲の問題）');
    lines.push('');
  }
  
  // X APIログ
  lines.push('## 🐦 X APIログ');
  lines.push('');
  lines.push(`- **APIリクエスト**: ${analysis.xApiLogs.requests.length}件`);
  lines.push(`- **APIレスポンス**: ${analysis.xApiLogs.responses.length}件`);
  lines.push(`- **引用リポスト投稿**: ${analysis.xApiLogs.postQuoteTweet.length}件`);
  lines.push(`- **ツイート投稿**: ${analysis.xApiLogs.postTweet.length}件`);
  lines.push(`- **エラー**: ${analysis.xApiLogs.errors.length}件`);
  lines.push('');
  
  if (analysis.xApiLogs.requests.length === 0) {
    lines.push('⚠️ **警告**: X APIへのリクエストが1件も記録されていません。');
    lines.push('');
    lines.push('考えられる原因:');
    lines.push('1. X APIが呼び出されていない（タイミングチェックや制限でスキップされている）');
    lines.push('2. ログの取得範囲外（時間範囲の問題）');
    lines.push('3. ログが記録されていない');
    lines.push('');
  }
  
  // エンドポイント別の集計
  lines.push('## 📍 エンドポイント別の集計');
  lines.push('');
  const sortedEndpoints = Object.entries(analysis.endpoints)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20);
  
  for (const [endpoint, data] of sortedEndpoints) {
    lines.push(`### ${endpoint}`);
    lines.push(`- **リクエスト数**: ${data.count}件`);
    if (Object.keys(data.methods).length > 0) {
      lines.push(`- **HTTPメソッド**: ${Object.entries(data.methods).map(([m, c]) => `${m}: ${c}`).join(', ')}`);
    }
    if (Object.keys(data.statusCodes).length > 0) {
      lines.push(`- **ステータスコード**: ${Object.entries(data.statusCodes).map(([s, c]) => `${s}: ${c}`).join(', ')}`);
    }
    lines.push('');
  }
  
  // エラーログ
  lines.push('## ❌ エラーログ');
  lines.push('');
  lines.push(`- **総エラー数**: ${analysis.errors.length}件`);
  lines.push('');
  
  if (analysis.errors.length > 0) {
    // エラーパターンの集計
    const errorPatterns = {};
    analysis.errors.forEach(error => {
      const message = error.message.toLowerCase();
      let pattern = 'Other';
      if (message.includes('x api')) pattern = 'X API Error';
      else if (message.includes('webhook')) pattern = 'Webhook Error';
      else if (message.includes('timeout')) pattern = 'Timeout';
      else if (message.includes('failed')) pattern = 'Failed';
      
      errorPatterns[pattern] = (errorPatterns[pattern] || 0) + 1;
    });
    
    lines.push('### エラーパターン');
    for (const [pattern, count] of Object.entries(errorPatterns).sort((a, b) => b[1] - a[1])) {
      lines.push(`- **${pattern}**: ${count}件`);
    }
    lines.push('');
    
    // 主要なエラーの詳細（最初の10件）
    lines.push('### 主要なエラー（最初の10件）');
    analysis.errors.slice(0, 10).forEach((error, index) => {
      lines.push(`${index + 1}. **${error.timestamp || 'Unknown'}**`);
      lines.push(`   - パス: ${error.path || 'Unknown'}`);
      lines.push(`   - メソッド: ${error.method || 'Unknown'}`);
      lines.push(`   - ステータスコード: ${error.statusCode || 'Unknown'}`);
      lines.push(`   - メッセージ: ${error.message.substring(0, 200)}`);
      lines.push('');
    });
  }
  
  // 警告ログ
  lines.push('## ⚠️ 警告ログ');
  lines.push('');
  lines.push(`- **総警告数**: ${analysis.warnings.length}件`);
  lines.push('');
  
  // 重要な発見
  lines.push('## 🔍 重要な発見');
  lines.push('');
  
  if (analysis.webhookLogs.get.length === 0) {
    lines.push('1. **Webhook GETリクエスト（CRC検証）が0件**');
    lines.push('   - X APIがWebhook URLを検証していない可能性があります');
    lines.push('   - Webhook URLが正しく登録されていない可能性があります');
    lines.push('');
  }
  
  if (analysis.webhookLogs.post.length === 0) {
    lines.push('2. **Webhook POSTリクエスト（イベント受信）が0件**');
    lines.push('   - X APIがWebhookイベントを送信していない可能性があります');
    lines.push('   - イベントサブスクリプションが有効になっていない可能性があります');
    lines.push('');
  }
  
  if (analysis.xApiLogs.requests.length === 0) {
    lines.push('3. **X APIリクエストが0件**');
    lines.push('   - X APIが呼び出されていない可能性があります');
    lines.push('   - タイミングチェックや制限でスキップされている可能性があります');
    lines.push('');
  }
  
  if (analysis.xApiLogs.postQuoteTweet.length === 0 && analysis.xApiLogs.postTweet.length === 0) {
    lines.push('4. **X API投稿が0件**');
    lines.push('   - 実際に投稿が実行されていない可能性があります');
    lines.push('   - エラーが発生して投稿に失敗している可能性があります');
    lines.push('');
  }
  
  // 推奨事項
  lines.push('## 💡 推奨事項');
  lines.push('');
  lines.push('1. **Webhook URLの確認**');
  lines.push('   - X API Developer PortalでWebhook URLが正しく登録されているか確認');
  lines.push('   - Webhook URLがHTTPSであることを確認');
  lines.push('   - Webhook URLが公開アクセス可能であることを確認');
  lines.push('');
  lines.push('2. **イベントサブスクリプションの確認**');
  lines.push('   - X API Developer Portalでイベントサブスクリプションが有効になっているか確認');
  lines.push('   - 必要なイベントタイプがサブスクライブされているか確認');
  lines.push('');
  lines.push('3. **X API呼び出しの確認**');
  lines.push('   - Vercelログで`[X API] 🔵 xApiRequest called`を検索');
  lines.push('   - Vercelログで`[Quote Repost] 🔵 About to call postQuoteTweet`を検索');
  lines.push('   - タイミングチェックや制限でスキップされていないか確認');
  lines.push('');
  lines.push('4. **エラーログの確認**');
  lines.push('   - Vercelログでエラーメッセージを検索');
  lines.push('   - X APIエラーの詳細を確認');
  lines.push('');
  
  return lines.join('\n');
}

/**
 * メイン処理
 */
function main() {
  try {
    console.log('📊 logs_result (3).json の分析を開始...\n');
    
    // ログファイルを読み込む
    const logs = readLogsFile();
    console.log(`✅ ログファイルを読み込みました: ${logs.length}件\n`);
    
    // ログを分析
    const analysis = analyzeLogs(logs);
    
    // レポートを生成
    const report = generateReport(analysis);
    
    // レポートをファイルに保存
    fs.writeFileSync(OUTPUT_FILE, report, 'utf-8');
    console.log(`✅ レポートを保存しました: ${OUTPUT_FILE}\n`);
    
    // サマリーを表示
    console.log('📊 分析結果サマリー:');
    console.log(`- 総ログ数: ${analysis.summary.totalLogs.toLocaleString()}件`);
    console.log(`- Webhook GETリクエスト: ${analysis.webhookLogs.get.length}件`);
    console.log(`- Webhook POSTリクエスト: ${analysis.webhookLogs.post.length}件`);
    console.log(`- X APIリクエスト: ${analysis.xApiLogs.requests.length}件`);
    console.log(`- X API投稿（引用リポスト）: ${analysis.xApiLogs.postQuoteTweet.length}件`);
    console.log(`- X API投稿（ツイート）: ${analysis.xApiLogs.postTweet.length}件`);
    console.log(`- エラー: ${analysis.errors.length}件`);
    console.log(`- 警告: ${analysis.warnings.length}件`);
    console.log('');
    
    if (analysis.webhookLogs.get.length === 0 && analysis.webhookLogs.post.length === 0) {
      console.log('⚠️ 警告: Webhookへのリクエストが1件も記録されていません。');
    }
    
    if (analysis.xApiLogs.requests.length === 0) {
      console.log('⚠️ 警告: X APIへのリクエストが1件も記録されていません。');
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

module.exports = { analyzeLogs, generateReport };
