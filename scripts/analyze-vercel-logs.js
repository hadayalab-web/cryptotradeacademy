// scripts/analyze-vercel-logs.js
// Vercelログを分析してエラーパターンを特定

const fs = require('fs');
const path = require('path');

async function analyzeLogs() {
  const logPath = process.argv[2] || path.join(__dirname, '../../Downloads/logs_result (1).json');
  
  console.log('📊 Vercelログ分析を開始...');
  console.log(`📁 ログファイル: ${logPath}`);
  
  if (!fs.existsSync(logPath)) {
    console.error(`❌ ログファイルが見つかりません: ${logPath}`);
    process.exit(1);
  }
  
  const logContent = fs.readFileSync(logPath, 'utf-8');
  const logs = JSON.parse(logContent);
  
  console.log(`✅ ${logs.length}件のログエントリを読み込みました\n`);
  
  // エラーパターンを分析
  const errors = [];
  const warnings = [];
  const xApiErrors = [];
  const rateLimitErrors = [];
  const failedPosts = [];
  const skippedPosts = [];
  
  logs.forEach((log, index) => {
    const message = log.message || '';
    const level = log.level || 'info';
    const statusCode = log.responseStatusCode;
    const requestPath = log.requestPath || '';
    
    // エラーレベルのログ
    if (level === 'error' || level === 'ERROR') {
      errors.push({
        index,
        timestamp: log.TimeUTC || log.timestamp,
        path: requestPath,
        message,
        statusCode,
      });
    }
    
    // 警告レベルのログ
    if (level === 'warn' || level === 'warning' || message.toLowerCase().includes('warn')) {
      warnings.push({
        index,
        timestamp: log.TimeUTC || log.timestamp,
        path: requestPath,
        message,
      });
    }
    
    // X API関連のエラー
    if (message.includes('X API') || message.includes('Twitter') || requestPath.includes('x-')) {
      if (message.includes('error') || message.includes('Error') || message.includes('failed') || message.includes('Failed')) {
        xApiErrors.push({
          index,
          timestamp: log.TimeUTC || log.timestamp,
          path: requestPath,
          message,
          statusCode,
        });
      }
    }
    
    // レート制限エラー（429）
    if (statusCode === 429 || message.includes('rate limit') || message.includes('Rate limit') || message.includes('429')) {
      rateLimitErrors.push({
        index,
        timestamp: log.TimeUTC || log.timestamp,
        path: requestPath,
        message,
      });
    }
    
    // 投稿失敗
    if (message.includes('Failed to post') || message.includes('failed to post') || message.includes('post failed')) {
      failedPosts.push({
        index,
        timestamp: log.TimeUTC || log.timestamp,
        path: requestPath,
        message,
      });
    }
    
    // スキップされた投稿
    if (message.includes('Skipping') || message.includes('skipping') || message.includes('skipped')) {
      skippedPosts.push({
        index,
        timestamp: log.TimeUTC || log.timestamp,
        path: requestPath,
        message,
      });
    }
  });
  
  // 結果を表示
  console.log('='.repeat(80));
  console.log('📊 エラー分析結果');
  console.log('='.repeat(80));
  
  console.log(`\n❌ エラーログ: ${errors.length}件`);
  if (errors.length > 0) {
    console.log('\n最初の10件:');
    errors.slice(0, 10).forEach((err, i) => {
      console.log(`\n[${i + 1}] ${err.timestamp || 'N/A'}`);
      console.log(`   パス: ${err.path || 'N/A'}`);
      console.log(`   メッセージ: ${err.message.substring(0, 200)}`);
      if (err.statusCode) console.log(`   ステータス: ${err.statusCode}`);
    });
  }
  
  console.log(`\n⚠️  警告ログ: ${warnings.length}件`);
  if (warnings.length > 0) {
    console.log('\n最初の10件:');
    warnings.slice(0, 10).forEach((warn, i) => {
      console.log(`\n[${i + 1}] ${warn.timestamp || 'N/A'}`);
      console.log(`   パス: ${warn.path || 'N/A'}`);
      console.log(`   メッセージ: ${warn.message.substring(0, 200)}`);
    });
  }
  
  console.log(`\n🐦 X API関連エラー: ${xApiErrors.length}件`);
  if (xApiErrors.length > 0) {
    console.log('\n最初の10件:');
    xApiErrors.slice(0, 10).forEach((err, i) => {
      console.log(`\n[${i + 1}] ${err.timestamp || 'N/A'}`);
      console.log(`   パス: ${err.path || 'N/A'}`);
      console.log(`   メッセージ: ${err.message.substring(0, 200)}`);
      if (err.statusCode) console.log(`   ステータス: ${err.statusCode}`);
    });
  }
  
  console.log(`\n⏱️  レート制限エラー (429): ${rateLimitErrors.length}件`);
  if (rateLimitErrors.length > 0) {
    console.log('\n最初の10件:');
    rateLimitErrors.slice(0, 10).forEach((err, i) => {
      console.log(`\n[${i + 1}] ${err.timestamp || 'N/A'}`);
      console.log(`   パス: ${err.path || 'N/A'}`);
      console.log(`   メッセージ: ${err.message.substring(0, 200)}`);
    });
  }
  
  console.log(`\n📝 投稿失敗: ${failedPosts.length}件`);
  if (failedPosts.length > 0) {
    console.log('\n最初の10件:');
    failedPosts.slice(0, 10).forEach((post, i) => {
      console.log(`\n[${i + 1}] ${post.timestamp || 'N/A'}`);
      console.log(`   パス: ${post.path || 'N/A'}`);
      console.log(`   メッセージ: ${post.message.substring(0, 200)}`);
    });
  }
  
  console.log(`\n⏭️  スキップされた投稿: ${skippedPosts.length}件`);
  if (skippedPosts.length > 0) {
    console.log('\n最初の10件:');
    skippedPosts.slice(0, 10).forEach((skip, i) => {
      console.log(`\n[${i + 1}] ${skip.timestamp || 'N/A'}`);
      console.log(`   パス: ${skip.path || 'N/A'}`);
      console.log(`   メッセージ: ${skip.message.substring(0, 200)}`);
    });
  }
  
  // パス別の統計
  const pathStats = {};
  logs.forEach(log => {
    const path = log.requestPath || 'unknown';
    if (!pathStats[path]) {
      pathStats[path] = { total: 0, errors: 0, warnings: 0, success: 0 };
    }
    pathStats[path].total++;
    const level = log.level || 'info';
    const statusCode = log.responseStatusCode;
    if (level === 'error' || statusCode >= 400) {
      pathStats[path].errors++;
    } else if (level === 'warn' || level === 'warning') {
      pathStats[path].warnings++;
    } else if (statusCode >= 200 && statusCode < 300) {
      pathStats[path].success++;
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('📈 パス別統計');
  console.log('='.repeat(80));
  Object.entries(pathStats)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 20)
    .forEach(([path, stats]) => {
      const errorRate = ((stats.errors / stats.total) * 100).toFixed(1);
      console.log(`\n${path}`);
      console.log(`  総リクエスト: ${stats.total}, 成功: ${stats.success}, エラー: ${stats.errors}, 警告: ${stats.warnings}`);
      console.log(`  エラー率: ${errorRate}%`);
    });
  
  // 推奨事項を出力
  console.log('\n' + '='.repeat(80));
  console.log('💡 推奨事項');
  console.log('='.repeat(80));
  
  if (rateLimitErrors.length > 0) {
    console.log('\n⚠️  レート制限エラーが多数発生しています:');
    console.log('   - リトライ間隔を増やす');
    console.log('   - 投稿頻度を調整する');
    console.log('   - レート制限ヘッダーを確認して適切に待機する');
  }
  
  if (xApiErrors.length > 0) {
    console.log('\n⚠️  X APIエラーが発生しています:');
    console.log('   - 認証情報を確認する');
    console.log('   - エラーハンドリングを強化する');
    console.log('   - リトライロジックを改善する');
  }
  
  if (skippedPosts.length > failedPosts.length * 2) {
    console.log('\n⚠️  スキップされた投稿が多すぎます:');
    console.log('   - ピーク時間の設定を確認する');
    console.log('   - 投稿制限の設定を緩和する');
    console.log('   - インプレッション最大化のため、より積極的に投稿する');
  }
  
  console.log('\n✅ 分析完了\n');
}

analyzeLogs().catch(error => {
  console.error('❌ 分析エラー:', error);
  process.exit(1);
});
