// scripts/check-impressions-detail.js
// インプレッションデータの詳細確認

const fs = require('fs');

const logFile = 'c:/Users/chiba/Downloads/logs_result (3).json';

async function checkImpressionsDetail() {
  console.log('='.repeat(100));
  console.log('📊 インプレッションデータ詳細確認');
  console.log('='.repeat(100));
  console.log();

  try {
    const fileContent = fs.readFileSync(logFile, 'utf8');
    const logs = JSON.parse(fileContent);
    console.log(`✅ ログエントリ数: ${logs.length.toLocaleString()}件`);
    console.log();

    // インプレッション関連のログを抽出
    const impressionLogs = [];
    
    for (const log of logs) {
      const message = log.message || log.text || '';
      const lowerMessage = message.toLowerCase();
      
      // インプレッション関連のキーワードを含むログ
      if (lowerMessage.includes('impression') || 
          lowerMessage.includes('impression_count') ||
          lowerMessage.includes('nonpublicmetrics') ||
          lowerMessage.includes('organicmetrics')) {
        impressionLogs.push({
          timestamp: log.TimeUTC || log.timestamp || '',
          endpoint: log.requestPath || log.function || '',
          message: message,
        });
      }
    }

    console.log(`インプレッション関連ログ: ${impressionLogs.length}件`);
    console.log();

    // 実際のインプレッション数を抽出
    const actualImpressions = [];
    const estimatedImpressions = [];
    const grokImpressions = [];

    for (const log of impressionLogs) {
      const message = log.message;
      
      // 1. X APIから取得した実際のインプレッション数（nonPublicMetrics/organicMetrics）
      const nonPublicMatch = message.match(/nonPublicMetrics[^}]*impression_count[:\s]+(\d+)/i);
      const organicMatch = message.match(/organicMetrics[^}]*impression_count[:\s]+(\d+)/i);
      const directMatch = message.match(/impression_count[:\s]+(\d+)/i);
      
      if (nonPublicMatch || organicMatch) {
        const count = parseInt(nonPublicMatch?.[1] || organicMatch?.[1] || '0');
        if (count > 0) {
          actualImpressions.push({
            count,
            source: nonPublicMatch ? 'nonPublicMetrics' : 'organicMetrics',
            timestamp: log.timestamp,
            endpoint: log.endpoint,
            message: message.substring(0, 500),
          });
        }
      } else if (directMatch && !message.includes('recentImpressions') && !message.includes('estimated')) {
        // 直接的なimpression_count（推定値でない場合）
        const count = parseInt(directMatch[1]);
        if (count > 0) {
          actualImpressions.push({
            count,
            source: 'direct',
            timestamp: log.timestamp,
            endpoint: log.endpoint,
            message: message.substring(0, 500),
          });
        }
      }
      
      // 2. Grokの推定インプレッション数
      const recentImpressionsMatch = message.match(/recentImpressions[:\s]+(\d+)/i);
      const estimatedMatch = message.match(/estimated[^0-9]*impressions?[:\s]+(\d+)/i);
      
      if (recentImpressionsMatch || estimatedMatch) {
        const count = parseInt(recentImpressionsMatch?.[1] || estimatedMatch?.[1] || '0');
        if (count > 0) {
          estimatedImpressions.push({
            count,
            source: recentImpressionsMatch ? 'recentImpressions' : 'estimated',
            timestamp: log.timestamp,
            endpoint: log.endpoint,
            message: message.substring(0, 500),
          });
        }
      }
      
      // 3. Grok関連のインプレッション
      if (message.includes('grok') && (recentImpressionsMatch || estimatedMatch)) {
        const count = parseInt(recentImpressionsMatch?.[1] || estimatedMatch?.[1] || '0');
        if (count > 0) {
          grokImpressions.push({
            count,
            timestamp: log.timestamp,
            endpoint: log.endpoint,
            message: message.substring(0, 500),
          });
        }
      }
    }

    console.log('='.repeat(100));
    console.log('📊 実際のX APIから取得したインプレッション数');
    console.log('='.repeat(100));
    
    if (actualImpressions.length > 0) {
      const totalActual = actualImpressions.reduce((sum, item) => sum + item.count, 0);
      console.log(`\n総数: ${totalActual.toLocaleString()}`);
      console.log(`件数: ${actualImpressions.length}件`);
      console.log('\n詳細:');
      actualImpressions.forEach((item, idx) => {
        console.log(`\n${idx + 1}. [${item.timestamp}] ${item.endpoint}`);
        console.log(`   ソース: ${item.source}`);
        console.log(`   インプレッション数: ${item.count.toLocaleString()}`);
        console.log(`   メッセージ: ${item.message.substring(0, 300)}...`);
      });
    } else {
      console.log('\n⚠️  実際のX APIから取得したインプレッション数が見つかりませんでした');
    }

    console.log('\n' + '='.repeat(100));
    console.log('📊 Grokの推定インプレッション数');
    console.log('='.repeat(100));
    
    if (estimatedImpressions.length > 0) {
      const totalEstimated = estimatedImpressions.reduce((sum, item) => sum + item.count, 0);
      console.log(`\n総数: ${totalEstimated.toLocaleString()}`);
      console.log(`件数: ${estimatedImpressions.length}件`);
      console.log('\n詳細:');
      estimatedImpressions.forEach((item, idx) => {
        console.log(`\n${idx + 1}. [${item.timestamp}] ${item.endpoint}`);
        console.log(`   ソース: ${item.source}`);
        console.log(`   インプレッション数: ${item.count.toLocaleString()}`);
        console.log(`   メッセージ: ${item.message.substring(0, 300)}...`);
      });
    } else {
      console.log('\n⚠️  Grokの推定インプレッション数が見つかりませんでした');
    }

    console.log('\n' + '='.repeat(100));
    console.log('📊 サマリー');
    console.log('='.repeat(100));
    
    const totalActual = actualImpressions.reduce((sum, item) => sum + item.count, 0);
    const totalEstimated = estimatedImpressions.reduce((sum, item) => sum + item.count, 0);
    
    console.log(`\n実際のX APIインプレッション: ${totalActual.toLocaleString()} (${actualImpressions.length}件)`);
    console.log(`Grok推定インプレッション: ${totalEstimated.toLocaleString()} (${estimatedImpressions.length}件)`);
    
    if (totalActual > 0 && totalEstimated > 0) {
      const difference = totalEstimated - totalActual;
      const differencePercent = (difference / totalEstimated) * 100;
      console.log(`\n差: ${difference.toLocaleString()} (${differencePercent.toFixed(1)}%)`);
    }
    
    // データソースの判定
    console.log('\n' + '='.repeat(100));
    console.log('🔍 データソース判定');
    console.log('='.repeat(100));
    
    if (totalActual > 0) {
      console.log('\n✅ 実際のX APIデータが検出されました');
      console.log(`   - nonPublicMetrics/organicMetricsから取得`);
      console.log(`   - これはX APIから直接取得した実データです`);
    } else if (totalEstimated > 0) {
      console.log('\n⚠️  Grokの推定データのみ検出されました');
      console.log(`   - recentImpressionsまたはestimatedから取得`);
      console.log(`   - これは推定値であり、実データではありません`);
    } else {
      console.log('\n❌ インプレッションデータが見つかりませんでした');
    }

  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

checkImpressionsDetail().catch(error => {
  console.error('❌ 実行エラー:', error);
  process.exit(1);
});
