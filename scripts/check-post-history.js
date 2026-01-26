// scripts/check-post-history.js
// X投稿履歴の正確性確認

const fs = require('fs');

const logFile = 'c:/Users/chiba/Downloads/logs_result (3).json';

async function checkPostHistory() {
  console.log('='.repeat(100));
  console.log('📱 X投稿履歴の正確性確認');
  console.log('='.repeat(100));
  console.log();

  try {
    const fileContent = fs.readFileSync(logFile, 'utf8');
    const logs = JSON.parse(fileContent);
    console.log(`✅ ログエントリ数: ${logs.length.toLocaleString()}件`);
    console.log();

    // 投稿関連のログを抽出
    const postLogs = [];
    const quoteRepostLogs = [];
    const freeReportLogs = [];
    const minimalVersionLogs = [];

    for (const log of logs) {
      const message = log.message || log.text || '';
      const lowerMessage = message.toLowerCase();
      const endpoint = log.requestPath || log.function || '';
      
      // 1. 一般的な投稿ログ
      if (lowerMessage.includes('posted') || 
          lowerMessage.includes('tweet') ||
          lowerMessage.includes('successfully posted') ||
          lowerMessage.includes('post success')) {
        postLogs.push({
          timestamp: log.TimeUTC || log.timestamp || '',
          endpoint,
          message,
        });
      }
      
      // 2. Quote Repost投稿ログ
      if (lowerMessage.includes('quote repost') && 
          (lowerMessage.includes('posted') || 
           lowerMessage.includes('successfully') ||
           lowerMessage.includes('actually posted'))) {
        quoteRepostLogs.push({
          timestamp: log.TimeUTC || log.timestamp || '',
          endpoint,
          message,
        });
      }
      
      // 3. Free Report投稿ログ
      if (endpoint.includes('x-post-free-report') || 
          (lowerMessage.includes('free report') && lowerMessage.includes('posted'))) {
        freeReportLogs.push({
          timestamp: log.TimeUTC || log.timestamp || '',
          endpoint,
          message,
        });
      }
      
      // 4. Minimal Version投稿ログ
      if (endpoint.includes('x-post-minimal-version') || 
          (lowerMessage.includes('minimal version') && lowerMessage.includes('posted'))) {
        minimalVersionLogs.push({
          timestamp: log.TimeUTC || log.timestamp || '',
          endpoint,
          message,
        });
      }
    }

    console.log('='.repeat(100));
    console.log('📊 投稿ログの集計');
    console.log('='.repeat(100));
    
    console.log(`\n一般的な投稿ログ: ${postLogs.length}件`);
    console.log(`Quote Repost投稿ログ: ${quoteRepostLogs.length}件`);
    console.log(`Free Report投稿ログ: ${freeReportLogs.length}件`);
    console.log(`Minimal Version投稿ログ: ${minimalVersionLogs.length}件`);

    // ツイートIDを抽出
    const tweetIds = new Set();
    const tweetDetails = [];

    for (const log of [...postLogs, ...quoteRepostLogs, ...freeReportLogs, ...minimalVersionLogs]) {
      const message = log.message;
      // ツイートIDのパターン（18-19桁の数字）
      const tweetIdMatches = message.match(/\b\d{18,19}\b/g);
      if (tweetIdMatches) {
        tweetIdMatches.forEach(id => {
          if (!tweetIds.has(id)) {
            tweetIds.add(id);
            tweetDetails.push({
              tweetId: id,
              timestamp: log.timestamp,
              endpoint: log.endpoint,
              type: log.message.toLowerCase().includes('quote repost') ? 'Quote Repost' :
                    log.message.toLowerCase().includes('free report') ? 'Free Report' :
                    log.message.toLowerCase().includes('minimal') ? 'Minimal Version' :
                    'Regular Post',
            });
          }
        });
      }
    }

    console.log('\n' + '='.repeat(100));
    console.log('📱 抽出されたツイートID');
    console.log('='.repeat(100));
    
    console.log(`\nユニークなツイートID数: ${tweetIds.size}件`);
    
    if (tweetDetails.length > 0) {
      console.log('\n詳細（最初の20件）:');
      tweetDetails.slice(0, 20).forEach((detail, idx) => {
        console.log(`\n${idx + 1}. Tweet ID: ${detail.tweetId}`);
        console.log(`   タイプ: ${detail.type}`);
        console.log(`   タイムスタンプ: ${detail.timestamp}`);
        console.log(`   エンドポイント: ${detail.endpoint}`);
      });
    }

    // 投稿成功の詳細ログを表示
    console.log('\n' + '='.repeat(100));
    console.log('✅ Quote Repost投稿成功ログ');
    console.log('='.repeat(100));
    
    if (quoteRepostLogs.length > 0) {
      quoteRepostLogs.slice(0, 10).forEach((log, idx) => {
        console.log(`\n${idx + 1}. [${log.timestamp}] ${log.endpoint}`);
        console.log(`   ${log.message.substring(0, 500)}`);
      });
    } else {
      console.log('\n⚠️  Quote Repost投稿成功ログが見つかりませんでした');
    }

    // エンドポイント別の実行回数
    console.log('\n' + '='.repeat(100));
    console.log('📊 エンドポイント別実行回数');
    console.log('='.repeat(100));
    
    const endpointCounts = {};
    for (const log of logs) {
      const endpoint = log.requestPath || log.function || 'unknown';
      if (endpoint.includes('x-post') || endpoint.includes('quote-repost')) {
        endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + 1;
      }
    }
    
    for (const [endpoint, count] of Object.entries(endpointCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${endpoint}: ${count}回`);
    }

    // サマリー
    console.log('\n' + '='.repeat(100));
    console.log('📊 サマリー');
    console.log('='.repeat(100));
    
    console.log(`\n✅ ユニークなツイートID: ${tweetIds.size}件`);
    console.log(`📱 Quote Repost投稿成功ログ: ${quoteRepostLogs.length}件`);
    console.log(`📱 Free Report投稿ログ: ${freeReportLogs.length}件`);
    console.log(`📱 Minimal Version投稿ログ: ${minimalVersionLogs.length}件`);
    
    // 投稿タイプ別の集計
    const typeCounts = {};
    tweetDetails.forEach(detail => {
      typeCounts[detail.type] = (typeCounts[detail.type] || 0) + 1;
    });
    
    if (Object.keys(typeCounts).length > 0) {
      console.log('\n投稿タイプ別:');
      for (const [type, count] of Object.entries(typeCounts)) {
        console.log(`   ${type}: ${count}件`);
      }
    }

  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

checkPostHistory().catch(error => {
  console.error('❌ 実行エラー:', error);
  process.exit(1);
});
