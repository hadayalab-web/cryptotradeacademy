// ログファイルを解析してVSLワークフローの問題を特定
const fs = require('fs');
const path = require('path');

const logFile = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads', 'logs_result (1).json');

try {
  const data = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
  
  console.log(`📊 総ログ数: ${data.length}`);
  
  // VSL関連のログを抽出
  const vslLogs = data.filter(log => {
    const path = log.requestPath || '';
    return /vsl/i.test(path);
  });
  
  console.log(`\n🔍 VSL関連ログ数: ${vslLogs.length}`);
  
  // エラーログを抽出
  const errorLogs = data.filter(log => {
    const status = log.responseStatusCode || 0;
    return status >= 400 || log.message?.toLowerCase().includes('error') || log.message?.toLowerCase().includes('fail');
  });
  
  console.log(`\n❌ エラーログ数: ${errorLogs.length}`);
  
  // VSL関連のエラーを抽出
  const vslErrors = vslLogs.filter(log => {
    const status = log.responseStatusCode || 0;
    return status >= 400;
  });
  
  console.log(`\n🚨 VSL関連エラー数: ${vslErrors.length}`);
  
  // VSLエンドポイント別の統計
  const vslEndpoints = {};
  vslLogs.forEach(log => {
    const endpoint = log.requestPath || 'unknown';
    if (!vslEndpoints[endpoint]) {
      vslEndpoints[endpoint] = {
        total: 0,
        success: 0,
        errors: 0,
        avgDuration: 0,
        durations: []
      };
    }
    vslEndpoints[endpoint].total++;
    const status = log.responseStatusCode || 0;
    if (status >= 200 && status < 300) {
      vslEndpoints[endpoint].success++;
    } else {
      vslEndpoints[endpoint].errors++;
    }
    if (log.durationMs) {
      vslEndpoints[endpoint].durations.push(log.durationMs);
    }
  });
  
  // 平均時間を計算
  Object.keys(vslEndpoints).forEach(endpoint => {
    const durations = vslEndpoints[endpoint].durations;
    if (durations.length > 0) {
      vslEndpoints[endpoint].avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    }
  });
  
  console.log('\n📈 VSLエンドポイント別統計:');
  Object.keys(vslEndpoints).forEach(endpoint => {
    const stats = vslEndpoints[endpoint];
    console.log(`\n${endpoint}:`);
    console.log(`  総実行数: ${stats.total}`);
    console.log(`  成功: ${stats.success}`);
    console.log(`  エラー: ${stats.errors}`);
    console.log(`  平均実行時間: ${stats.avgDuration}ms`);
  });
  
  // 最近のVSLログを表示
  console.log('\n📋 最近のVSLログ（最新10件）:');
  vslLogs
    .sort((a, b) => (b.timestampInMs || 0) - (a.timestampInMs || 0))
    .slice(0, 10)
    .forEach(log => {
      console.log(`\n${log.TimeUTC || 'N/A'}`);
      console.log(`  Path: ${log.requestPath || 'N/A'}`);
      console.log(`  Status: ${log.responseStatusCode || 'N/A'}`);
      console.log(`  Duration: ${log.durationMs || 'N/A'}ms`);
      if (log.message) {
        console.log(`  Message: ${log.message}`);
      }
    });
  
  // エラーログの詳細
  if (vslErrors.length > 0) {
    console.log('\n🚨 VSLエラーログ詳細:');
    vslErrors
      .sort((a, b) => (b.timestampInMs || 0) - (a.timestampInMs || 0))
      .slice(0, 10)
      .forEach(log => {
        console.log(`\n${log.TimeUTC || 'N/A'}`);
        console.log(`  Path: ${log.requestPath || 'N/A'}`);
        console.log(`  Status: ${log.responseStatusCode || 'N/A'}`);
        console.log(`  Message: ${log.message || 'N/A'}`);
      });
  }
  
} catch (error) {
  console.error('❌ ログ解析エラー:', error.message);
  console.error(error.stack);
}
