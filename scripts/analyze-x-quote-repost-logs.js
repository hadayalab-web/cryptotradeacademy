// scripts/analyze-x-quote-repost-logs.js
// x-quote-repostエンドポイントのログを詳細分析

const fs = require('fs');
const path = require('path');

const LOG_FILE = 'c:\\Users\\chiba\\Downloads\\logs_result (3).json';
const OUTPUT_DIR = path.join(__dirname, '../docs/reports');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'x-quote-repost-detailed-analysis.md');

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
 * x-quote-repostエンドポイントのログを詳細分析
 */
function analyzeQuoteRepostLogs(logs) {
  console.log(`📊 x-quote-repostエンドポイントのログを詳細分析中...\n`);
  
  // x-quote-repostエンドポイントに関連するログを抽出
  const quoteRepostLogs = logs.filter(log => {
    if (!log || typeof log !== 'object') return false;
    const path = log.requestPath || log.path || '';
    const message = (log.message || log.text || '').toString();
    return path.includes('x-quote-repost') || message.includes('[Quote Repost]');
  });
  
  console.log(`✅ x-quote-repost関連のログ: ${quoteRepostLogs.length}件\n`);
  
  const analysis = {
    totalLogs: quoteRepostLogs.length,
    endpoints: {},
    statusCodes: {},
    skipReasons: {
      notPeakTime: [],
      dailyLimit: [],
      hourlyLimit: [],
      timingCheck: [],
      impressionCheck: [],
      other: [],
    },
    errors: {
      assignmentToConstant: [],
      other: [],
    },
    xApiCalls: {
      attempted: [],
      successful: [],
      failed: [],
    },
    flow: {
      started: [],
      languageProcessing: [],
      influencerSelection: [],
      beforePostQuoteTweet: [],
      afterPostQuoteTweet: [],
    },
  };
  
  // ログを分析
  quoteRepostLogs.forEach((log, index) => {
    const message = (log.message || log.text || '').toString();
    const timestamp = log.timestamp || log.TimeUTC || log.timestampInMs || null;
    const path = log.requestPath || log.path || '';
    const statusCode = log.responseStatusCode || log.statusCode || null;
    
    // エンドポイント別の集計
    if (path) {
      const endpoint = path.split('?')[0];
      if (!analysis.endpoints[endpoint]) {
        analysis.endpoints[endpoint] = {
          count: 0,
          statusCodes: {},
        };
      }
      analysis.endpoints[endpoint].count++;
      
      if (statusCode) {
        analysis.endpoints[endpoint].statusCodes[statusCode] = 
          (analysis.endpoints[endpoint].statusCodes[statusCode] || 0) + 1;
      }
    }
    
    // ステータスコード別の集計
    if (statusCode) {
      analysis.statusCodes[statusCode] = (analysis.statusCodes[statusCode] || 0) + 1;
    }
    
    // スキップ理由の検出
    if (message.includes('Skipping quote reposts')) {
      if (message.includes('not quote repost peak time')) {
        analysis.skipReasons.notPeakTime.push({ timestamp, message, path });
      } else if (message.includes('daily limit') || message.includes('Daily post limit')) {
        analysis.skipReasons.dailyLimit.push({ timestamp, message, path });
      } else if (message.includes('hourly limit') || message.includes('Hourly post limit')) {
        analysis.skipReasons.hourlyLimit.push({ timestamp, message, path });
      } else if (message.includes('not optimal timing')) {
        analysis.skipReasons.timingCheck.push({ timestamp, message, path });
      } else if (message.includes('low impressions')) {
        analysis.skipReasons.impressionCheck.push({ timestamp, message, path });
      } else {
        analysis.skipReasons.other.push({ timestamp, message, path });
      }
    }
    
    // エラーの検出
    if (message.includes('Assignment to constant variable')) {
      analysis.errors.assignmentToConstant.push({ timestamp, message, path });
    } else if (message.includes('Failed to post quote reposts') || message.includes('❌')) {
      analysis.errors.other.push({ timestamp, message, path });
    }
    
    // X API呼び出しの検出
    if (message.includes('xApiRequest called') || message.includes('[X API] 🔵')) {
      analysis.xApiCalls.attempted.push({ timestamp, message, path });
    }
    
    if (message.includes('SUCCESSFULLY POSTED') || message.includes('Quote tweet posted successfully')) {
      analysis.xApiCalls.successful.push({ timestamp, message, path });
    }
    
    if (message.includes('Failed to post quote tweet') || message.includes('Failed to post tweet')) {
      analysis.xApiCalls.failed.push({ timestamp, message, path });
    }
    
    // フローの検出
    if (message.includes('Starting influencer discovery') || message.includes('Processing')) {
      analysis.flow.started.push({ timestamp, message, path });
    }
    
    if (message.includes('Getting influencers from STOCK') || message.includes('Retrieved') && message.includes('influencers')) {
      analysis.flow.influencerSelection.push({ timestamp, message, path });
    }
    
    if (message.includes('About to call postQuoteTweet') || message.includes('CALLING postQuoteTweet')) {
      analysis.flow.beforePostQuoteTweet.push({ timestamp, message, path });
    }
    
    if (message.includes('SUCCESSFULLY POSTED') || message.includes('Quote tweet posted successfully')) {
      analysis.flow.afterPostQuoteTweet.push({ timestamp, message, path });
    }
  });
  
  return analysis;
}

/**
 * 分析結果をMarkdown形式で出力
 */
function generateReport(analysis) {
  const lines = [];
  
  lines.push('# x-quote-repostエンドポイント詳細分析レポート');
  lines.push(`**作成日時**: ${new Date().toISOString()}`);
  lines.push('');
  
  // サマリー
  lines.push('## 📊 サマリー');
  lines.push('');
  lines.push(`- **総ログ数**: ${analysis.totalLogs.toLocaleString()}件`);
  lines.push('');
  
  // スキップ理由
  lines.push('## ⏰ スキップ理由の分析');
  lines.push('');
  lines.push(`- **ピーク時間外**: ${analysis.skipReasons.notPeakTime.length}件`);
  lines.push(`- **日次制限到達**: ${analysis.skipReasons.dailyLimit.length}件`);
  lines.push(`- **時間制限到達**: ${analysis.skipReasons.hourlyLimit.length}件`);
  lines.push(`- **タイミングチェック失敗**: ${analysis.skipReasons.timingCheck.length}件`);
  lines.push(`- **インプレッション規模不足**: ${analysis.skipReasons.impressionCheck.length}件`);
  lines.push(`- **その他**: ${analysis.skipReasons.other.length}件`);
  lines.push('');
  
  // エラー
  lines.push('## ❌ エラー分析');
  lines.push('');
  lines.push(`- **Assignment to constant variable**: ${analysis.errors.assignmentToConstant.length}件`);
  lines.push(`- **その他のエラー**: ${analysis.errors.other.length}件`);
  lines.push('');
  
  if (analysis.errors.assignmentToConstant.length > 0) {
    lines.push('### Assignment to constant variableエラーの詳細');
    analysis.errors.assignmentToConstant.slice(0, 10).forEach((error, index) => {
      lines.push(`${index + 1}. **${error.timestamp || 'Unknown'}**`);
      lines.push(`   - メッセージ: ${error.message.substring(0, 200)}`);
      lines.push('');
    });
  }
  
  // X API呼び出し
  lines.push('## 🐦 X API呼び出しの分析');
  lines.push('');
  lines.push(`- **X API呼び出し試行**: ${analysis.xApiCalls.attempted.length}件`);
  lines.push(`- **X API呼び出し成功**: ${analysis.xApiCalls.successful.length}件`);
  lines.push(`- **X API呼び出し失敗**: ${analysis.xApiCalls.failed.length}件`);
  lines.push('');
  
  if (analysis.xApiCalls.attempted.length === 0) {
    lines.push('⚠️ **重大な問題**: X APIへの呼び出しが1件も記録されていません。');
    lines.push('');
    lines.push('考えられる原因:');
    lines.push('1. X APIが呼び出される前にエラーが発生している');
    lines.push('2. タイミングチェックや制限でスキップされている');
    lines.push('3. ログが記録されていない');
    lines.push('');
  }
  
  // フロー分析
  lines.push('## 🔄 実行フローの分析');
  lines.push('');
  lines.push(`- **処理開始**: ${analysis.flow.started.length}件`);
  lines.push(`- **インフルエンサー選択**: ${analysis.flow.influencerSelection.length}件`);
  lines.push(`- **X API呼び出し前**: ${analysis.flow.beforePostQuoteTweet.length}件`);
  lines.push(`- **X API呼び出し後**: ${analysis.flow.afterPostQuoteTweet.length}件`);
  lines.push('');
  
  // フローの問題点
  if (analysis.flow.started.length > 0 && analysis.flow.beforePostQuoteTweet.length === 0) {
    lines.push('⚠️ **問題**: 処理は開始されているが、X API呼び出し前に到達していません。');
    lines.push('');
    lines.push('考えられる原因:');
    lines.push('1. インフルエンサー選択で失敗している');
    lines.push('2. タイミングチェックでスキップされている');
    lines.push('3. インプレッション規模チェックでスキップされている');
    lines.push('');
  }
  
  if (analysis.flow.beforePostQuoteTweet.length > 0 && analysis.flow.afterPostQuoteTweet.length === 0) {
    lines.push('⚠️ **問題**: X API呼び出し前には到達しているが、投稿が成功していません。');
    lines.push('');
    lines.push('考えられる原因:');
    lines.push('1. X API呼び出しでエラーが発生している');
    lines.push('2. レスポンス検証で失敗している');
    lines.push('3. エラーハンドリングで例外が発生している');
    lines.push('');
  }
  
  // 推奨事項
  lines.push('## 💡 推奨事項');
  lines.push('');
  
  if (analysis.errors.assignmentToConstant.length > 0) {
    lines.push('1. **Assignment to constant variableエラーの修正**');
    lines.push('   - 修正がデプロイされていない可能性があります');
    lines.push('   - `api/x-quote-repost.js`の549行目と576行目を確認');
    lines.push('');
  }
  
  if (analysis.xApiCalls.attempted.length === 0) {
    lines.push('2. **X API呼び出しの確認**');
    lines.push('   - Vercelログで`[Quote Repost] 🔵`で始まるログを検索');
    lines.push('   - タイミングチェックや制限でスキップされていないか確認');
    lines.push('   - インフルエンサー選択が成功しているか確認');
    lines.push('');
  }
  
  if (analysis.skipReasons.notPeakTime.length > 0) {
    lines.push('3. **ピーク時間外のスキップ**');
    lines.push(`   - ${analysis.skipReasons.notPeakTime.length}件がピーク時間外でスキップされています`);
    lines.push('   - `getPeakMapForHour()`の設定を確認');
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * メイン処理
 */
function main() {
  try {
    console.log('📊 x-quote-repostエンドポイントのログを詳細分析中...\n');
    
    // ログファイルを読み込む
    const logs = readLogsFile();
    console.log(`✅ ログファイルを読み込みました: ${logs.length}件\n`);
    
    // x-quote-repostエンドポイントのログを分析
    const analysis = analyzeQuoteRepostLogs(logs);
    
    // レポートを生成
    const report = generateReport(analysis);
    
    // レポートをファイルに保存
    fs.writeFileSync(OUTPUT_FILE, report, 'utf-8');
    console.log(`✅ レポートを保存しました: ${OUTPUT_FILE}\n`);
    
    // サマリーを表示
    console.log('📊 分析結果サマリー:');
    console.log(`- x-quote-repost関連ログ: ${analysis.totalLogs.toLocaleString()}件`);
    console.log(`- スキップ（ピーク時間外）: ${analysis.skipReasons.notPeakTime.length}件`);
    console.log(`- スキップ（日次制限）: ${analysis.skipReasons.dailyLimit.length}件`);
    console.log(`- スキップ（時間制限）: ${analysis.skipReasons.hourlyLimit.length}件`);
    console.log(`- エラー（Assignment to constant）: ${analysis.errors.assignmentToConstant.length}件`);
    console.log(`- X API呼び出し試行: ${analysis.xApiCalls.attempted.length}件`);
    console.log(`- X API呼び出し成功: ${analysis.xApiCalls.successful.length}件`);
    console.log(`- X API呼び出し前到達: ${analysis.flow.beforePostQuoteTweet.length}件`);
    console.log(`- X API呼び出し後到達: ${analysis.flow.afterPostQuoteTweet.length}件`);
    console.log('');
    
    if (analysis.xApiCalls.attempted.length === 0) {
      console.log('⚠️ 警告: X APIへの呼び出しが1件も記録されていません。');
    }
    
    if (analysis.flow.beforePostQuoteTweet.length > 0 && analysis.flow.afterPostQuoteTweet.length === 0) {
      console.log('⚠️ 警告: X API呼び出し前には到達しているが、投稿が成功していません。');
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

module.exports = { analyzeQuoteRepostLogs, generateReport };
