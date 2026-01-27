// scripts/analyze-quote-repost-flow.js
// x-quote-repostエンドポイントの実行フローを詳細分析

const fs = require('fs');
const path = require('path');

const LOG_FILE = 'c:\\Users\\chiba\\Downloads\\logs_result (3).json';
const OUTPUT_DIR = path.join(__dirname, '../docs/reports');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'quote-repost-flow-analysis.md');

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
 * 実行フローを分析
 */
function analyzeFlow(logs) {
  console.log(`📊 実行フローを詳細分析中...\n`);
  
  // x-quote-repostエンドポイントに関連するログを抽出
  const quoteRepostLogs = logs.filter(log => {
    if (!log || typeof log !== 'object') return false;
    const path = log.requestPath || log.path || '';
    const message = (log.message || log.text || '').toString();
    return path.includes('x-quote-repost') || message.includes('[Quote Repost]');
  });
  
  console.log(`✅ x-quote-repost関連のログ: ${quoteRepostLogs.length}件\n`);
  
  // 実行フローの各ステップを追跡
  const flowSteps = {
    // 1. エンドポイント呼び出し
    endpointCalled: [],
    
    // 2. 言語処理開始
    languageProcessingStarted: [],
    
    // 3. インフルエンサー取得
    gettingInfluencers: [],
    influencersRetrieved: [],
    
    // 4. ローテーション選択
    rotationSelection: [],
    rotationSelectionResult: [],
    
    // 5. インフルエンサーループ開始
    influencerLoopStarted: [],
    
    // 6. 各インフルエンサーの処理
    processingInfluencer: [],
    
    // 7. タイミングチェック
    timingCheckPassed: [],
    timingCheckFailed: [],
    
    // 8. インプレッション規模チェック
    impressionCheckPassed: [],
    impressionCheckFailed: [],
    
    // 9. テキスト生成
    textGenerationStarted: [],
    textGenerationCompleted: [],
    
    // 10. X API呼び出し前
    beforePostQuoteTweet: [],
    
    // 11. X API呼び出し
    xApiCallAttempted: [],
    
    // 12. X API呼び出し成功
    xApiCallSuccessful: [],
    
    // 13. エラー
    errors: [],
  };
  
  // ログを分析
  quoteRepostLogs.forEach((log, index) => {
    const message = (log.message || log.text || '').toString();
    const timestamp = log.timestamp || log.TimeUTC || log.timestampInMs || null;
    const path = log.requestPath || log.path || '';
    
    // 各ステップを検出
    if (path.includes('x-quote-repost')) {
      flowSteps.endpointCalled.push({ timestamp, message, path });
    }
    
    if (message.includes('Processing') && message.includes('lang')) {
      flowSteps.languageProcessingStarted.push({ timestamp, message, path });
    }
    
    if (message.includes('Getting influencers from STOCK')) {
      flowSteps.gettingInfluencers.push({ timestamp, message, path });
    }
    
    if (message.includes('Retrieved') && message.includes('influencers')) {
      flowSteps.influencersRetrieved.push({ timestamp, message, path });
    }
    
    if (message.includes('Rotation selection result')) {
      flowSteps.rotationSelectionResult.push({ timestamp, message, path });
    }
    
    if (message.includes('Starting influencer loop')) {
      flowSteps.influencerLoopStarted.push({ timestamp, message, path });
    }
    
    if (message.includes('Processing influencer:') && message.includes('influencer:')) {
      flowSteps.processingInfluencer.push({ timestamp, message, path });
    }
    
    if (message.includes('Timing check passed')) {
      flowSteps.timingCheckPassed.push({ timestamp, message, path });
    }
    
    if (message.includes('Skipping quote repost') && message.includes('not optimal timing')) {
      flowSteps.timingCheckFailed.push({ timestamp, message, path });
    }
    
    if (message.includes('meets impression target')) {
      flowSteps.impressionCheckPassed.push({ timestamp, message, path });
    }
    
    if (message.includes('Skipping quote repost') && message.includes('low impressions')) {
      flowSteps.impressionCheckFailed.push({ timestamp, message, path });
    }
    
    if (message.includes('About to call postQuoteTweet') || message.includes('CALLING postQuoteTweet')) {
      flowSteps.beforePostQuoteTweet.push({ timestamp, message, path });
    }
    
    if (message.includes('[X API]') && message.includes('xApiRequest called')) {
      flowSteps.xApiCallAttempted.push({ timestamp, message, path });
    }
    
    if (message.includes('SUCCESSFULLY POSTED') || message.includes('Quote tweet posted successfully')) {
      flowSteps.xApiCallSuccessful.push({ timestamp, message, path });
    }
    
    if (message.includes('Failed to post quote reposts') || message.includes('❌')) {
      flowSteps.errors.push({ timestamp, message, path });
    }
  });
  
  return flowSteps;
}

/**
 * 分析結果をMarkdown形式で出力
 */
function generateReport(flowSteps) {
  const lines = [];
  
  lines.push('# x-quote-repost実行フロー詳細分析レポート');
  lines.push(`**作成日時**: ${new Date().toISOString()}`);
  lines.push('');
  
  // 実行フローの各ステップ
  lines.push('## 🔄 実行フローの各ステップ');
  lines.push('');
  lines.push('| ステップ | 件数 | 到達率 |');
  lines.push('|---------|------|--------|');
  
  const steps = [
    { name: '1. エンドポイント呼び出し', logs: flowSteps.endpointCalled, key: 'endpointCalled' },
    { name: '2. 言語処理開始', logs: flowSteps.languageProcessingStarted, key: 'languageProcessingStarted' },
    { name: '3. インフルエンサー取得開始', logs: flowSteps.gettingInfluencers, key: 'gettingInfluencers' },
    { name: '4. インフルエンサー取得完了', logs: flowSteps.influencersRetrieved, key: 'influencersRetrieved' },
    { name: '5. ローテーション選択結果', logs: flowSteps.rotationSelectionResult, key: 'rotationSelectionResult' },
    { name: '6. インフルエンサーループ開始', logs: flowSteps.influencerLoopStarted, key: 'influencerLoopStarted' },
    { name: '7. インフルエンサー処理開始', logs: flowSteps.processingInfluencer, key: 'processingInfluencer' },
    { name: '8. タイミングチェック通過', logs: flowSteps.timingCheckPassed, key: 'timingCheckPassed' },
    { name: '9. タイミングチェック失敗', logs: flowSteps.timingCheckFailed, key: 'timingCheckFailed' },
    { name: '10. インプレッション規模チェック通過', logs: flowSteps.impressionCheckPassed, key: 'impressionCheckPassed' },
    { name: '11. インプレッション規模チェック失敗', logs: flowSteps.impressionCheckFailed, key: 'impressionCheckFailed' },
    { name: '12. X API呼び出し前', logs: flowSteps.beforePostQuoteTweet, key: 'beforePostQuoteTweet' },
    { name: '13. X API呼び出し試行', logs: flowSteps.xApiCallAttempted, key: 'xApiCallAttempted' },
    { name: '14. X API呼び出し成功', logs: flowSteps.xApiCallSuccessful, key: 'xApiCallSuccessful' },
  ];
  
  const baseCount = flowSteps.endpointCalled.length || 1;
  
  steps.forEach(step => {
    const count = step.logs.length;
    const rate = baseCount > 0 ? ((count / baseCount) * 100).toFixed(1) : '0.0';
    lines.push(`| ${step.name} | ${count}件 | ${rate}% |`);
  });
  
  lines.push('');
  
  // ボトルネックの特定
  lines.push('## 🔍 ボトルネックの特定');
  lines.push('');
  
  if (flowSteps.processingInfluencer.length > 0 && flowSteps.timingCheckPassed.length === 0) {
    lines.push('⚠️ **重大な問題**: インフルエンサーの処理は開始されているが、タイミングチェックを通過していません。');
    lines.push('');
    lines.push(`- インフルエンサー処理開始: ${flowSteps.processingInfluencer.length}件`);
    lines.push(`- タイミングチェック通過: ${flowSteps.timingCheckPassed.length}件`);
    lines.push(`- タイミングチェック失敗: ${flowSteps.timingCheckFailed.length}件`);
    lines.push('');
    lines.push('**原因**: `shouldPostQuoteRepost()`関数が`false`を返している可能性が高いです。');
    lines.push('');
  }
  
  if (flowSteps.timingCheckPassed.length > 0 && flowSteps.impressionCheckPassed.length === 0) {
    lines.push('⚠️ **問題**: タイミングチェックは通過しているが、インプレッション規模チェックで失敗しています。');
    lines.push('');
    lines.push(`- タイミングチェック通過: ${flowSteps.timingCheckPassed.length}件`);
    lines.push(`- インプレッション規模チェック通過: ${flowSteps.impressionCheckPassed.length}件`);
    lines.push(`- インプレッション規模チェック失敗: ${flowSteps.impressionCheckFailed.length}件`);
    lines.push('');
    lines.push('**原因**: インフルエンサーのインプレッション数が目標の30%未満、または10,000未満の可能性があります。');
    lines.push('');
  }
  
  if (flowSteps.impressionCheckPassed.length > 0 && flowSteps.beforePostQuoteTweet.length === 0) {
    lines.push('⚠️ **問題**: インプレッション規模チェックは通過しているが、X API呼び出し前に到達していません。');
    lines.push('');
    lines.push(`- インプレッション規模チェック通過: ${flowSteps.impressionCheckPassed.length}件`);
    lines.push(`- X API呼び出し前: ${flowSteps.beforePostQuoteTweet.length}件`);
    lines.push('');
    lines.push('**原因**: テキスト生成でエラーが発生している可能性があります。');
    lines.push('');
  }
  
  if (flowSteps.beforePostQuoteTweet.length > 0 && flowSteps.xApiCallAttempted.length === 0) {
    lines.push('⚠️ **問題**: X API呼び出し前には到達しているが、X APIが呼び出されていません。');
    lines.push('');
    lines.push(`- X API呼び出し前: ${flowSteps.beforePostQuoteTweet.length}件`);
    lines.push(`- X API呼び出し試行: ${flowSteps.xApiCallAttempted.length}件`);
    lines.push('');
    lines.push('**原因**: X API設定チェック（dryRun、postingEnabled）でスキップされている可能性があります。');
    lines.push('');
  }
  
  // エラーの詳細
  if (flowSteps.errors.length > 0) {
    lines.push('## ❌ エラーの詳細');
    lines.push('');
    lines.push(`- **総エラー数**: ${flowSteps.errors.length}件`);
    lines.push('');
    
    flowSteps.errors.slice(0, 10).forEach((error, index) => {
      lines.push(`${index + 1}. **${error.timestamp || 'Unknown'}**`);
      lines.push(`   - メッセージ: ${error.message.substring(0, 300)}`);
      lines.push('');
    });
  }
  
  // 推奨事項
  lines.push('## 💡 推奨事項');
  lines.push('');
  
  if (flowSteps.timingCheckFailed.length > 0) {
    lines.push('1. **タイミングチェックの緩和**');
    lines.push(`   - ${flowSteps.timingCheckFailed.length}件がタイミングチェックでスキップされています`);
    lines.push('   - `shouldPostQuoteRepost()`関数の条件を確認');
    lines.push('   - タイミングチェックをさらに緩和することを検討');
    lines.push('');
  }
  
  if (flowSteps.impressionCheckFailed.length > 0) {
    lines.push('2. **インプレッション規模チェックの緩和**');
    lines.push(`   - ${flowSteps.impressionCheckFailed.length}件がインプレッション規模チェックでスキップされています`);
    lines.push('   - 最小インプレッション数の閾値を下げることを検討');
    lines.push('');
  }
  
  if (flowSteps.beforePostQuoteTweet.length > 0 && flowSteps.xApiCallAttempted.length === 0) {
    lines.push('3. **X API設定の確認**');
    lines.push('   - `X_POSTING_ENABLED`が`true`であることを確認');
    lines.push('   - `X_POSTING_DRY_RUN`が`false`であることを確認');
    lines.push('   - X API認証情報が正しく設定されていることを確認');
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * メイン処理
 */
function main() {
  try {
    console.log('📊 x-quote-repost実行フローを詳細分析中...\n');
    
    // ログファイルを読み込む
    const logs = readLogsFile();
    console.log(`✅ ログファイルを読み込みました: ${logs.length}件\n`);
    
    // 実行フローを分析
    const flowSteps = analyzeFlow(logs);
    
    // レポートを生成
    const report = generateReport(flowSteps);
    
    // レポートをファイルに保存
    fs.writeFileSync(OUTPUT_FILE, report, 'utf-8');
    console.log(`✅ レポートを保存しました: ${OUTPUT_FILE}\n`);
    
    // サマリーを表示
    console.log('📊 実行フロー分析結果サマリー:');
    console.log(`- エンドポイント呼び出し: ${flowSteps.endpointCalled.length}件`);
    console.log(`- インフルエンサー処理開始: ${flowSteps.processingInfluencer.length}件`);
    console.log(`- タイミングチェック通過: ${flowSteps.timingCheckPassed.length}件`);
    console.log(`- タイミングチェック失敗: ${flowSteps.timingCheckFailed.length}件`);
    console.log(`- インプレッション規模チェック通過: ${flowSteps.impressionCheckPassed.length}件`);
    console.log(`- インプレッション規模チェック失敗: ${flowSteps.impressionCheckFailed.length}件`);
    console.log(`- X API呼び出し前: ${flowSteps.beforePostQuoteTweet.length}件`);
    console.log(`- X API呼び出し試行: ${flowSteps.xApiCallAttempted.length}件`);
    console.log(`- X API呼び出し成功: ${flowSteps.xApiCallSuccessful.length}件`);
    console.log('');
    
    // ボトルネックの特定
    if (flowSteps.processingInfluencer.length > 0 && flowSteps.timingCheckPassed.length === 0) {
      console.log('⚠️ 警告: タイミングチェックで全てスキップされています。');
    }
    
    if (flowSteps.timingCheckPassed.length > 0 && flowSteps.impressionCheckPassed.length === 0) {
      console.log('⚠️ 警告: インプレッション規模チェックで全てスキップされています。');
    }
    
    if (flowSteps.beforePostQuoteTweet.length > 0 && flowSteps.xApiCallAttempted.length === 0) {
      console.log('⚠️ 警告: X API呼び出し前には到達しているが、X APIが呼び出されていません。');
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

module.exports = { analyzeFlow, generateReport };
