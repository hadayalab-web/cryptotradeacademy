// scripts/analyze-cron-logs.js
// Cron Jobsログ分析スクリプト

const fs = require('fs');
const path = require('path');

const logFile = process.argv[2] || path.join(__dirname, '../../Downloads/logs_result (10).json');

console.log('📊 Cron Jobsログ分析を開始します...\n');
console.log(`📁 ログファイル: ${logFile}\n`);

try {
  const rawData = fs.readFileSync(logFile, 'utf8');
  const logs = JSON.parse(rawData);
  
  console.log(`✅ ログエントリ数: ${logs.length}件\n`);
  
  // 1. エンドポイント別実行回数
  const endpoints = {};
  logs.forEach(log => {
    const path = log.requestPath || 'unknown';
    if (!endpoints[path]) {
      endpoints[path] = {
        count: 0,
        statusCodes: {},
        errors: [],
        messages: []
      };
    }
    endpoints[path].count++;
    
    // ステータスコード集計
    const status = log.responseStatusCode || 'unknown';
    endpoints[path].statusCodes[status] = (endpoints[path].statusCodes[status] || 0) + 1;
    
    // エラーメッセージ収集
    if (log.message) {
      const msg = log.message.toLowerCase();
      if (msg.includes('error') || msg.includes('failed') || msg.includes('❌')) {
        endpoints[path].errors.push({
          time: log.TimeUTC,
          message: log.message,
          statusCode: log.responseStatusCode
        });
      }
    }
  });
  
  console.log('=== 📋 エンドポイント別実行状況 ===\n');
  Object.entries(endpoints)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([path, data]) => {
      console.log(`🔹 ${path}`);
      console.log(`   実行回数: ${data.count}回`);
      console.log(`   ステータスコード: ${JSON.stringify(data.statusCodes)}`);
      if (data.errors.length > 0) {
        console.log(`   ⚠️  エラー: ${data.errors.length}件`);
        data.errors.slice(0, 3).forEach(err => {
          console.log(`      - [${err.time}] ${err.message.substring(0, 100)}`);
        });
      }
      console.log('');
    });
  
  // 2. プロモコード関連のログを抽出
  console.log('\n=== 🎫 プロモコード自動補充関連ログ ===\n');
  const promoLogs = logs.filter(log => {
    const msg = (log.message || '').toLowerCase();
    return msg.includes('promo') || 
           msg.includes('restock') || 
           msg.includes('whop') ||
           log.requestPath?.includes('promo');
  });
  
  if (promoLogs.length === 0) {
    console.log('⚠️  プロモコード関連のログが見つかりませんでした。');
  } else {
    promoLogs.forEach(log => {
      console.log(`[${log.TimeUTC}] ${log.requestPath || 'unknown'}`);
      console.log(`  Message: ${log.message || 'N/A'}`);
      console.log(`  Status: ${log.responseStatusCode || 'N/A'}`);
      console.log('');
    });
  }
  
  // 3. エラーサマリー
  console.log('\n=== ❌ エラーサマリー ===\n');
  const allErrors = logs.filter(log => {
    const msg = (log.message || '').toLowerCase();
    return msg.includes('error') || 
           msg.includes('failed') || 
           msg.includes('❌') ||
           (log.responseStatusCode && log.responseStatusCode >= 400);
  });
  
  if (allErrors.length === 0) {
    console.log('✅ エラーは見つかりませんでした！');
  } else {
    console.log(`⚠️  エラー件数: ${allErrors.length}件\n`);
    allErrors.slice(0, 10).forEach(err => {
      console.log(`[${err.TimeUTC}] ${err.requestPath || 'unknown'}`);
      console.log(`  Status: ${err.responseStatusCode || 'N/A'}`);
      console.log(`  Message: ${err.message || 'N/A'}`);
      console.log('');
    });
    if (allErrors.length > 10) {
      console.log(`... 他 ${allErrors.length - 10}件のエラー`);
    }
  }
  
  // 4. ステータスコード分布
  console.log('\n=== 📊 ステータスコード分布 ===\n');
  const statusCodes = {};
  logs.forEach(log => {
    const status = log.responseStatusCode || 'unknown';
    statusCodes[status] = (statusCodes[status] || 0) + 1;
  });
  Object.entries(statusCodes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      const emoji = status >= 400 ? '❌' : status >= 300 ? '⚠️' : '✅';
      console.log(`${emoji} ${status}: ${count}回`);
    });
  
  console.log('\n✅ 分析完了！\n');
  
} catch (error) {
  console.error('❌ エラー:', error.message);
  console.error(error.stack);
  process.exit(1);
}
