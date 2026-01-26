// scripts/check-quote-repost-logs.js
// Quote Repost投稿成功ログの詳細確認

const fs = require('fs');

const logFile = 'c:/Users/chiba/Downloads/logs_result (3).json';

try {
  const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  
  console.log('='.repeat(100));
  console.log('📱 Quote Repost投稿成功ログの詳細確認');
  console.log('='.repeat(100));
  console.log();
  
  // 様々なパターンで検索
  const patterns = [
    'successfully posted',
    'actually posted',
    'confirmed',
    'quote repost',
    '[quote repost]',
    'quote tweet id',
    'quote repost for',
  ];
  
  const foundLogs = [];
  
  for (const log of logs) {
    const message = (log.message || log.text || '').toLowerCase();
    const fullMessage = log.message || log.text || '';
    
    for (const pattern of patterns) {
      if (message.includes(pattern)) {
        foundLogs.push({
          timestamp: log.TimeUTC || log.timestamp || '',
          endpoint: log.requestPath || log.function || '',
          pattern,
          message: fullMessage,
        });
        break; // 1つのログに複数のパターンがマッチしても1回だけ追加
      }
    }
  }
  
  console.log(`検出されたログ: ${foundLogs.length}件`);
  console.log();
  
  if (foundLogs.length > 0) {
    console.log('詳細（最初の20件）:');
    foundLogs.slice(0, 20).forEach((log, idx) => {
      console.log(`\n${idx + 1}. [${log.timestamp}] ${log.endpoint}`);
      console.log(`   パターン: ${log.pattern}`);
      console.log(`   メッセージ: ${log.message.substring(0, 600)}`);
    });
  } else {
    console.log('⚠️  Quote Repost投稿成功ログが見つかりませんでした');
  }
  
  // x-quote-repostエンドポイントのログを全て確認
  console.log('\n' + '='.repeat(100));
  console.log('📊 x-quote-repostエンドポイントの全ログ');
  console.log('='.repeat(100));
  
  const quoteRepostEndpointLogs = logs.filter(log => {
    const endpoint = log.requestPath || log.function || '';
    return endpoint.includes('x-quote-repost');
  });
  
  console.log(`\nx-quote-repostエンドポイントのログ: ${quoteRepostEndpointLogs.length}件`);
  
  if (quoteRepostEndpointLogs.length > 0) {
    console.log('\n詳細（最初の10件）:');
    quoteRepostEndpointLogs.slice(0, 10).forEach((log, idx) => {
      const msg = (log.message || log.text || '').substring(0, 500);
      console.log(`\n${idx + 1}. [${log.TimeUTC || log.timestamp}]`);
      console.log(`   ${msg}`);
    });
  }
  
  // ツイートIDを含むログを確認
  console.log('\n' + '='.repeat(100));
  console.log('📱 ツイートIDを含むログ');
  console.log('='.repeat(100));
  
  const tweetIdLogs = [];
  for (const log of logs) {
    const message = log.message || log.text || '';
    const tweetIdMatch = message.match(/\b\d{18,19}\b/);
    if (tweetIdMatch && (message.toLowerCase().includes('quote') || message.toLowerCase().includes('repost'))) {
      tweetIdLogs.push({
        timestamp: log.TimeUTC || log.timestamp || '',
        endpoint: log.requestPath || log.function || '',
        tweetId: tweetIdMatch[0],
        message: message.substring(0, 400),
      });
    }
  }
  
  console.log(`\nツイートIDを含むQuote Repost関連ログ: ${tweetIdLogs.length}件`);
  
  if (tweetIdLogs.length > 0) {
    console.log('\n詳細:');
    tweetIdLogs.forEach((log, idx) => {
      console.log(`\n${idx + 1}. Tweet ID: ${log.tweetId}`);
      console.log(`   [${log.timestamp}] ${log.endpoint}`);
      console.log(`   ${log.message}`);
    });
  }
  
} catch (error) {
  console.error('❌ エラー:', error.message);
  process.exit(1);
}
