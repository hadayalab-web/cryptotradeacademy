// scripts/analyze-cron-logs-all.js
// すべてのCronジョブの実行ログを分析

const fs = require('fs');
const path = require('path');

const logFilePath = 'c:\\Users\\chiba\\Downloads\\logs_result (1).json';

console.log('📊 Cronジョブ実行ログ分析開始...\n');

try {
  const logData = JSON.parse(fs.readFileSync(logFilePath, 'utf8'));
  
  if (!Array.isArray(logData)) {
    console.error('❌ ログデータが配列形式ではありません');
    process.exit(1);
  }
  
  console.log(`✅ ログエントリ数: ${logData.length}\n`);
  
  // リクエストパスでグループ化
  const byPath = {};
  
  logData.forEach(entry => {
    const requestPath = entry.requestPath || '';
    const pathName = requestPath.split('/').pop() || 'unknown';
    
    if (!byPath[pathName]) {
      byPath[pathName] = {
        path: requestPath,
        entries: [],
        errors: [],
        statusCodes: {},
        totalCount: 0,
        errorCount: 0,
        successCount: 0,
      };
    }
    
    byPath[pathName].entries.push(entry);
    byPath[pathName].totalCount++;
    
    // ステータスコード集計
    const statusCode = entry.responseStatusCode || 'unknown';
    byPath[pathName].statusCodes[statusCode] = (byPath[pathName].statusCodes[statusCode] || 0) + 1;
    
    // エラー集計
    if (entry.level === 'error' || statusCode >= 400) {
      byPath[pathName].errorCount++;
      if (entry.message) {
        byPath[pathName].errors.push({
          timestamp: entry.TimeUTC,
          message: entry.message,
          statusCode: statusCode,
        });
      }
    } else if (statusCode < 400) {
      byPath[pathName].successCount++;
    }
  });
  
  // X投稿関連のCronジョブを優先表示
  const xPostingPaths = ['x-post-free-report', 'x-quote-repost'];
  const otherPaths = Object.keys(byPath).filter(p => !xPostingPaths.includes(p));
  
  console.log('='.repeat(80));
  console.log('🚨 X投稿関連Cronジョブの実行結果');
  console.log('='.repeat(80));
  
  xPostingPaths.forEach(pathName => {
    const data = byPath[pathName];
    if (!data) {
      console.log(`\n❌ ${pathName}: ログが見つかりません`);
      return;
    }
    
    console.log(`\n📌 ${pathName}`);
    console.log(`   パス: ${data.path}`);
    console.log(`   実行回数: ${data.totalCount}`);
    console.log(`   成功: ${data.successCount}回`);
    console.log(`   エラー: ${data.errorCount}回`);
    console.log(`   ステータスコード:`, data.statusCodes);
    
    if (data.errors.length > 0) {
      console.log(`\n   ⚠️ エラー詳細:`);
      data.errors.forEach((error, idx) => {
        console.log(`   ${idx + 1}. [${error.timestamp}] ${error.statusCode}`);
        // エラーメッセージの最初の200文字を表示
        const msgPreview = error.message.substring(0, 200);
        console.log(`      メッセージ: ${msgPreview}${error.message.length > 200 ? '...' : ''}`);
      });
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('📋 その他のCronジョブの実行結果');
  console.log('='.repeat(80));
  
  otherPaths.forEach(pathName => {
    const data = byPath[pathName];
    console.log(`\n📌 ${pathName}`);
    console.log(`   実行回数: ${data.totalCount}`);
    console.log(`   成功: ${data.successCount}回`);
    console.log(`   エラー: ${data.errorCount}回`);
    console.log(`   ステータスコード:`, data.statusCodes);
    
    if (data.errors.length > 0) {
      console.log(`   ⚠️ エラー: ${data.errors.length}件`);
      data.errors.slice(0, 1).forEach(error => {
        const msgPreview = error.message.substring(0, 100);
        console.log(`      ${msgPreview}${error.message.length > 100 ? '...' : ''}`);
      });
    }
  });
  
  // エラーサマリー
  console.log('\n' + '='.repeat(80));
  console.log('🔍 エラーサマリー');
  console.log('='.repeat(80));
  
  const allErrors = [];
  Object.keys(byPath).forEach(pathName => {
    byPath[pathName].errors.forEach(error => {
      allErrors.push({
        path: pathName,
        ...error,
      });
    });
  });
  
  if (allErrors.length === 0) {
    console.log('\n✅ エラーは見つかりませんでした');
  } else {
    console.log(`\n⚠️ 合計エラー数: ${allErrors.length}`);
    allErrors.forEach((error, idx) => {
      console.log(`\n${idx + 1}. [${error.path}] ${error.statusCode} - ${error.timestamp}`);
      const msgPreview = error.message.substring(0, 300);
      console.log(`   ${msgPreview}${error.message.length > 300 ? '...' : ''}`);
    });
  }
  
} catch (error) {
  console.error('❌ エラー:', error.message);
  console.error(error.stack);
  process.exit(1);
}
