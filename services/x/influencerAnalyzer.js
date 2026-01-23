// services/x/influencerAnalyzer.js
// インフルエンサー分析機能（どのインフルエンサーが最も効果的か分析）

// Vercel KV（インフルエンサーメトリクス追跡用）
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[Influencer Analyzer] @vercel/kv not available:', error.message);
}

/**
 * インフルエンサーの引用リポストメトリクスを記録
 * @param {string} influencerUsername - インフルエンサーのユーザー名
 * @param {string} quoteTweetId - 引用リポストのツイートID
 * @param {Object} metrics - メトリクス（impressions, engagements, clicks等）
 * @returns {Promise<void>}
 */
async function recordInfluencerMetrics(influencerUsername, quoteTweetId, metrics) {
  if (!kv) {
    console.warn('[Influencer Analyzer] KV not available, skipping metrics recording');
    return;
  }
  
  try {
    const dateString = new Date().toISOString().split('T')[0];
    const key = `x:influencer:${influencerUsername}:${dateString}`;
    
    // 既存のメトリクスを取得
    const existing = await kv.get(key);
    const influencerData = existing ? (typeof existing === 'string' ? JSON.parse(existing) : existing) : {
      username: influencerUsername,
      date: dateString,
      quoteReposts: [],
      totalImpressions: 0,
      totalEngagements: 0,
      totalClicks: 0,
      count: 0,
    };
    
    // 新しい引用リポストを追加
    influencerData.quoteReposts.push({
      quoteTweetId,
      metrics,
      recordedAt: new Date().toISOString(),
    });
    
    // 集計を更新
    influencerData.totalImpressions += metrics?.impressions || 0;
    influencerData.totalEngagements += metrics?.engagements || 0;
    influencerData.totalClicks += metrics?.clicks || 0;
    influencerData.count += 1;
    
    // エンゲージメント率を計算
    influencerData.avgEngagementRate = influencerData.totalImpressions > 0
      ? (influencerData.totalEngagements / influencerData.totalImpressions) * 100
      : 0;
    influencerData.avgClickRate = influencerData.totalImpressions > 0
      ? (influencerData.totalClicks / influencerData.totalImpressions) * 100
      : 0;
    
    // KVストレージに保存（30日間保持）
    await kv.set(key, JSON.stringify(influencerData), { ex: 86400 * 30 });
    
    console.log(`[Influencer Analyzer] Metrics recorded for @${influencerUsername}: ${influencerData.count} quote reposts`);
  } catch (error) {
    console.warn('[Influencer Analyzer] Failed to record metrics:', error.message);
  }
}

/**
 * インフルエンサーの効果を分析（過去N日間）
 * @param {number} days - 分析日数（デフォルト: 7）
 * @returns {Promise<Array>} インフルエンサー効果ランキング
 */
async function analyzeInfluencerPerformance(days = 7) {
  if (!kv) {
    return [];
  }
  
  try {
    const results = {};
    const now = new Date();
    
    // 過去N日間のデータを取得
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      // すべてのインフルエンサーを取得
      const keys = await kv.keys(`x:influencer:*:${dateString}`);
      
      for (const key of keys) {
        const data = await kv.get(key);
        if (data) {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          const username = parsed.username;
          
          if (!results[username]) {
            results[username] = {
              username,
              totalImpressions: 0,
              totalEngagements: 0,
              totalClicks: 0,
              count: 0,
              dates: [],
            };
          }
          
          results[username].totalImpressions += parsed.totalImpressions || 0;
          results[username].totalEngagements += parsed.totalEngagements || 0;
          results[username].totalClicks += parsed.totalClicks || 0;
          results[username].count += parsed.count || 0;
          results[username].dates.push(dateString);
        }
      }
    }
    
    // エンゲージメント率を計算してランキング
    const ranking = Object.values(results)
      .map(influencer => ({
        ...influencer,
        avgEngagementRate: influencer.totalImpressions > 0
          ? (influencer.totalEngagements / influencer.totalImpressions) * 100
          : 0,
        avgClickRate: influencer.totalImpressions > 0
          ? (influencer.totalClicks / influencer.totalImpressions) * 100
          : 0,
      }))
      .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate); // エンゲージメント率でソート
    
    return ranking;
  } catch (error) {
    console.warn('[Influencer Analyzer] Failed to analyze performance:', error.message);
    return [];
  }
}

/**
 * 最適なインフルエンサーを取得（メトリクスに基づく）
 * @param {string} lang - 言語コード
 * @param {number} days - 分析日数（デフォルト: 7）
 * @returns {Promise<Array>} 最適なインフルエンサーのリスト
 */
async function getOptimalInfluencers(lang, days = 7) {
  const ranking = await analyzeInfluencerPerformance(days);
  
  // エンゲージメント率が高いインフルエンサーを優先
  // 最低3%のエンゲージメント率を要求
  const optimalInfluencers = ranking.filter(inf => inf.avgEngagementRate >= 3.0);
  
  return optimalInfluencers.slice(0, 10); // トップ10を返す
}

/**
 * インフルエンサー効果レポートを生成
 * @param {number} days - 分析日数（デフォルト: 7）
 * @returns {Promise<string>} レポートテキスト
 */
async function generateInfluencerReport(days = 7) {
  const ranking = await analyzeInfluencerPerformance(days);
  
  if (ranking.length === 0) {
    return 'No influencer data available.';
  }
  
  let report = `# インフルエンサー効果分析レポート（過去${days}日間）\n\n`;
  report += `## トップ10インフルエンサー\n\n`;
  
  ranking.slice(0, 10).forEach((inf, index) => {
    report += `${index + 1}. **@${inf.username}**\n`;
    report += `   - エンゲージメント率: ${inf.avgEngagementRate.toFixed(2)}%\n`;
    report += `   - クリック率: ${inf.avgClickRate.toFixed(2)}%\n`;
    report += `   - 総インプレッション: ${inf.totalImpressions.toLocaleString()}\n`;
    report += `   - 引用リポスト数: ${inf.count}\n\n`;
  });
  
  return report;
}

module.exports = {
  recordInfluencerMetrics,
  analyzeInfluencerPerformance,
  getOptimalInfluencers,
  generateInfluencerReport,
};
