// scripts/analyze-x-performance.js
// X投稿の実測パフォーマンス分析（インプレッション、エンゲージメント、CVR）

const { getDailyEngagementMetrics, generateEngagementDashboard } = require('../api/x-engagement-metrics');

// Vercel KV
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[Performance Analyzer] @vercel/kv not available:', error.message);
}

/**
 * 過去N日間のパフォーマンスデータを取得
 */
async function getPerformanceData(days = 7) {
  const results = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - i);
    const dateString = date.toISOString().split('T')[0];
    
    const metrics = await getDailyEngagementMetrics(dateString);
    if (metrics) {
      results.push({
        date: dateString,
        ...metrics,
      });
    }
  }
  
  return results;
}

/**
 * パフォーマンス分析を実行
 */
async function analyzePerformance() {
  console.log('[X Performance Analyzer] ========================================');
  console.log('[X Performance Analyzer] Analyzing X performance data...');
  console.log('[X Performance Analyzer] ========================================');
  
  try {
    // 過去7日間のデータを取得
    const performanceData = await getPerformanceData(7);
    
    if (performanceData.length === 0) {
      console.log('[X Performance Analyzer] ⚠️ No performance data available');
      console.log('[X Performance Analyzer] This might be because:');
      console.log('[X Performance Analyzer] 1. Deployment just completed (data not yet collected)');
      console.log('[X Performance Analyzer] 2. Cron jobs have not run yet');
      console.log('[X Performance Analyzer] 3. Metrics recording is not working');
      return;
    }
    
    // 集計
    const totalImpressions = performanceData.reduce((sum, d) => sum + (d.totalImpressions || 0), 0);
    const totalEngagements = performanceData.reduce((sum, d) => sum + (d.totalEngagements || 0), 0);
    const totalClicks = performanceData.reduce((sum, d) => sum + (d.totalClicks || 0), 0);
    const totalTweets = performanceData.reduce((sum, d) => sum + (d.tweets?.length || 0), 0);
    
    // 平均値
    const avgImpressionsPerTweet = totalTweets > 0 ? totalImpressions / totalTweets : 0;
    const avgEngagementsPerTweet = totalTweets > 0 ? totalEngagements / totalTweets : 0;
    const avgClicksPerTweet = totalTweets > 0 ? totalClicks / totalTweets : 0;
    
    // 率
    const engagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;
    const clickRate = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    
    // CVR（クリック→コンバージョン率）は、クリック数とTelegram Deep Linkのstartイベントから計算
    // 注意: CVRの正確な計算には、Telegram Botのstartイベントデータが必要
    // ここでは、クリック率をCVRの代理指標として使用
    
    console.log('\n📊 X Performance Analysis Results');
    console.log('========================================');
    console.log(`📅 Analysis Period: ${performanceData.length} days`);
    console.log(`📝 Total Tweets: ${totalTweets.toLocaleString()}`);
    console.log('\n📈 Impressions (インプレッション数)');
    console.log(`   Total: ${totalImpressions.toLocaleString()}`);
    console.log(`   Average per Tweet: ${avgImpressionsPerTweet.toLocaleString()}`);
    
    console.log('\n💬 Engagements (エンゲージメント数)');
    console.log(`   Total: ${totalEngagements.toLocaleString()}`);
    console.log(`   Average per Tweet: ${avgEngagementsPerTweet.toLocaleString()}`);
    console.log(`   Engagement Rate: ${engagementRate.toFixed(2)}%`);
    
    console.log('\n🖱️ Clicks (クリック数)');
    console.log(`   Total: ${totalClicks.toLocaleString()}`);
    console.log(`   Average per Tweet: ${avgClicksPerTweet.toLocaleString()}`);
    console.log(`   Click Rate (CTR): ${clickRate.toFixed(2)}%`);
    
    // 日別の推移
    console.log('\n📅 Daily Breakdown');
    console.log('========================================');
    performanceData.forEach((data, index) => {
      const dailyEngagementRate = data.totalImpressions > 0 
        ? (data.totalEngagements / data.totalImpressions) * 100 
        : 0;
      const dailyClickRate = data.totalImpressions > 0 
        ? (data.totalClicks / data.totalImpressions) * 100 
        : 0;
      
      console.log(`\n${data.date} (${index === 0 ? 'Today' : `${index} days ago`})`);
      console.log(`  Tweets: ${data.tweets?.length || 0}`);
      console.log(`  Impressions: ${(data.totalImpressions || 0).toLocaleString()}`);
      console.log(`  Engagements: ${(data.totalEngagements || 0).toLocaleString()} (${dailyEngagementRate.toFixed(2)}%)`);
      console.log(`  Clicks: ${(data.totalClicks || 0).toLocaleString()} (${dailyClickRate.toFixed(2)}%)`);
    });
    
    // 期待値との比較（Grok推奨値）
    console.log('\n🎯 Expected vs Actual Comparison');
    console.log('========================================');
    console.log('Expected (Grok推奨値):');
    console.log('  EN Impressions: 100,000 - 200,000 per post');
    console.log('  Other Languages: 50,000 - 100,000 per post');
    console.log('  Engagement Rate: 2-5%');
    console.log('  Click Rate: 3-8%');
    console.log('\nActual (実測値):');
    console.log(`  Average Impressions per Tweet: ${avgImpressionsPerTweet.toLocaleString()}`);
    console.log(`  Engagement Rate: ${engagementRate.toFixed(2)}%`);
    console.log(`  Click Rate: ${clickRate.toFixed(2)}%`);
    
    // 改善率の計算（ベースラインがないため、期待値との比較）
    const expectedEngagementRate = 3.5; // 期待値の中間値
    const expectedClickRate = 5.5; // 期待値の中間値
    const engagementRateImprovement = ((engagementRate - expectedEngagementRate) / expectedEngagementRate) * 100;
    const clickRateImprovement = ((clickRate - expectedClickRate) / expectedClickRate) * 100;
    
    console.log('\n📊 Improvement vs Expected');
    console.log('========================================');
    console.log(`  Engagement Rate: ${engagementRateImprovement >= 0 ? '+' : ''}${engagementRateImprovement.toFixed(2)}%`);
    console.log(`  Click Rate: ${clickRateImprovement >= 0 ? '+' : ''}${clickRateImprovement.toFixed(2)}%`);
    
    // 最新の実装（Velocity Boost, Carousel等）の効果推定
    console.log('\n🚀 Latest Implementation Impact (推定)');
    console.log('========================================');
    console.log('実装済み機能:');
    console.log('  ✅ Velocity Boost (初期エンゲージメント爆速化)');
    console.log('  ✅ Carousel Media Stacking (動画+画像カルーセル)');
    console.log('  ✅ GPT Analysis → RealTimeOptimizer Pipeline');
    console.log('\n期待される効果:');
    console.log('  📈 Impressions: +20-30% (Velocity Boost)');
    console.log('  ⏱️ Dwell Time: +15% (Carousel Media)');
    console.log('  💬 Engagement: +10% (Carousel Media)');
    console.log('  🎯 Adaptation Speed: 2x (GPT Pipeline)');
    
    return {
      summary: {
        totalTweets,
        totalImpressions,
        totalEngagements,
        totalClicks,
        avgImpressionsPerTweet,
        avgEngagementsPerTweet,
        avgClicksPerTweet,
        engagementRate,
        clickRate,
      },
      daily: performanceData,
      comparison: {
        expectedEngagementRate,
        expectedClickRate,
        engagementRateImprovement,
        clickRateImprovement,
      },
    };
  } catch (error) {
    console.error('[X Performance Analyzer] ❌ Error:', error.message);
    console.error('[X Performance Analyzer] Stack:', error.stack);
    throw error;
  }
}

// 実行
if (require.main === module) {
  analyzePerformance()
    .then((result) => {
      if (result) {
        console.log('\n✅ Analysis completed successfully');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to analyze performance:', error);
      process.exit(1);
    });
}

module.exports = { analyzePerformance, getPerformanceData };
