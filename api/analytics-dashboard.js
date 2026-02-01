// api/analytics-dashboard.js
// コンバージョン計測ダッシュボード（KPI追跡）
// 目標: 無料版150件/日、有料版50件/日

const { kv } = require('../utils/kv');

/**
 * 指定期間のコンバージョン数を取得
 * @param {string} conversionType - 'minimal' または 'regular'
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {Promise<number>} コンバージョン数
 */
async function getConversionCount(conversionType, dateString) {
  if (!kv) return 0;
  try {
    const key = `conversion:${conversionType}:${dateString}`;
    const count = await kv.get(key);
    return parseInt(count || '0', 10);
  } catch (error) {
    console.warn(`[Analytics] Failed to get conversion count for ${conversionType} on ${dateString}:`, error.message);
    return 0;
  }
}

/**
 * コンバージョン数を記録（Whop Webhookから呼び出される）
 * @param {string} conversionType - 'minimal' または 'regular'
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @param {Object} metadata - メタデータ（source, utm, etc）
 */
async function recordConversion(conversionType, dateString, metadata = {}) {
  if (!kv) return;
  try {
    const key = `conversion:${conversionType}:${dateString}`;
    const countKey = `conversion:${conversionType}:${dateString}:count`;
    
    // カウントをインクリメント
    const currentCount = await kv.get(countKey);
    const newCount = parseInt(currentCount || '0', 10) + 1;
    await kv.set(countKey, newCount, { ex: 86400 * 30 }); // 30日間保持
    
    // 詳細データを記録
    const timestamp = new Date().toISOString();
    const detailKey = `conversion:${conversionType}:${dateString}:${timestamp}`;
    await kv.set(detailKey, JSON.stringify({
      type: conversionType,
      date: dateString,
      timestamp,
      ...metadata,
    }), { ex: 86400 * 30 }); // 30日間保持
    
    console.log(`[Analytics] ✅ Conversion recorded: ${conversionType} on ${dateString} (total: ${newCount})`);
  } catch (error) {
    console.error(`[Analytics] ❌ Failed to record conversion:`, error.message);
  }
}

/**
 * 過去N日間のコンバージョンデータを取得
 * @param {number} days - 日数
 * @returns {Promise<Object>} コンバージョンデータ
 */
async function getConversionStats(days = 7) {
  const stats = {
    minimal: [],
    regular: [],
    totalMinimal: 0,
    totalRegular: 0,
    avgMinimalPerDay: 0,
    avgRegularPerDay: 0,
    targetMinimal: 150,
    targetRegular: 50,
  };
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    
    const minimalCount = await getConversionCount('minimal', dateString);
    const regularCount = await getConversionCount('regular', dateString);
    
    stats.minimal.push({ date: dateString, count: minimalCount });
    stats.regular.push({ date: dateString, count: regularCount });
    
    stats.totalMinimal += minimalCount;
    stats.totalRegular += regularCount;
  }
  
  stats.avgMinimalPerDay = Math.round(stats.totalMinimal / days);
  stats.avgRegularPerDay = Math.round(stats.totalRegular / days);
  
  // 目標達成率
  stats.minimalAchievementRate = ((stats.avgMinimalPerDay / stats.targetMinimal) * 100).toFixed(1);
  stats.regularAchievementRate = ((stats.avgRegularPerDay / stats.targetRegular) * 100).toFixed(1);
  
  return stats;
}

/**
 * ファネル別のコンバージョン数を取得
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {Promise<Object>} ファネル別コンバージョン
 */
async function getFunnelConversions(dateString) {
  if (!kv) return null;
  try {
    const funnels = {
      funnel1: { name: 'X → VSL1 → Minimal', count: 0, source: 'x_vsl1' },
      funnel2: { name: 'Minimal → VSL2 → Regular', count: 0, source: 'telegram_vsl2' },
      funnel3: { name: 'X → Regular Direct', count: 0, source: 'x_regular_direct' },
    };
    
    // KVからソース別のコンバージョン数を取得
    for (const [funnelKey, funnelData] of Object.entries(funnels)) {
      const key = `conversion:source:${funnelData.source}:${dateString}`;
      const count = await kv.get(key);
      funnels[funnelKey].count = parseInt(count || '0', 10);
    }
    
    return funnels;
  } catch (error) {
    console.warn(`[Analytics] Failed to get funnel conversions:`, error.message);
    return null;
  }
}

/**
 * X投稿のパフォーマンス統計を取得
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {Promise<Object>} X投稿統計
 */
async function getXPostStats(dateString) {
  if (!kv) return null;
  try {
    const stats = {
      totalPosts: 0,
      totalImpressions: 0,
      totalEngagements: 0,
      totalClicks: 0,
      avgCTR: 0,
      avgEngagementRate: 0,
    };
    
    // KVから当日の全投稿を取得
    const postsKey = `x:posts:${dateString}:*`;
    // Note: KVでワイルドカードスキャンは直接サポートされていないため、
    // 個別のキーを列挙する必要がある（実装は次のフェーズ）
    
    return stats;
  } catch (error) {
    console.warn(`[Analytics] Failed to get X post stats:`, error.message);
    return null;
  }
}

/**
 * ダッシュボードHTMLを生成
 * @param {Object} stats - 統計データ
 * @returns {string} HTML
 */
function generateDashboardHTML(stats) {
  const minimalProgress = Math.min((stats.avgMinimalPerDay / stats.targetMinimal) * 100, 100);
  const regularProgress = Math.min((stats.avgRegularPerDay / stats.targetRegular) * 100, 100);
  
  const minimalColor = minimalProgress >= 100 ? '#10b981' : minimalProgress >= 50 ? '#f59e0b' : '#ef4444';
  const regularColor = regularProgress >= 100 ? '#10b981' : regularProgress >= 50 ? '#f59e0b' : '#ef4444';
  
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KPI Dashboard - Trap Defence BTC</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      color: #1f2937;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      background: white;
      border-radius: 16px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    }
    .header h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .header p {
      font-size: 16px;
      color: #6b7280;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: white;
      border-radius: 16px;
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    }
    .stat-card h2 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #374151;
    }
    .stat-value {
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    .stat-target {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 20px;
    }
    .progress-bar {
      width: 100%;
      height: 12px;
      background: #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 10px;
    }
    .progress-fill {
      height: 100%;
      transition: width 0.3s ease;
    }
    .achievement-rate {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 5px;
    }
    .chart {
      background: white;
      border-radius: 16px;
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    }
    .chart h2 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #374151;
    }
    .day-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .day-row:last-child {
      border-bottom: none;
    }
    .day-label {
      font-weight: 500;
      color: #374151;
    }
    .day-value {
      font-weight: 600;
      color: #667eea;
    }
    .refresh-info {
      text-align: center;
      margin-top: 20px;
      padding: 15px;
      background: white;
      border-radius: 12px;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 KPI Dashboard - Trap Defence BTC</h1>
      <p>リアルタイムコンバージョン追跡（過去7日間平均）</p>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card">
        <h2>🆓 無料版（Minimal Version）</h2>
        <div class="stat-value" style="color: ${minimalColor};">${stats.avgMinimalPerDay}</div>
        <div class="stat-target">目標: ${stats.targetMinimal}件/日</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${minimalProgress}%; background: ${minimalColor};"></div>
        </div>
        <div class="achievement-rate" style="color: ${minimalColor};">${stats.minimalAchievementRate}% 達成</div>
      </div>
      
      <div class="stat-card">
        <h2>💎 有料版（Regular Briefing）</h2>
        <div class="stat-value" style="color: ${regularColor};">${stats.avgRegularPerDay}</div>
        <div class="stat-target">目標: ${stats.targetRegular}件/日</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${regularProgress}%; background: ${regularColor};"></div>
        </div>
        <div class="achievement-rate" style="color: ${regularColor};">${stats.regularAchievementRate}% 達成</div>
      </div>
    </div>
    
    <div class="chart">
      <h2>📊 過去7日間の推移</h2>
      ${stats.minimal.reverse().map((day, index) => `
        <div class="day-row">
          <span class="day-label">${day.date}</span>
          <span class="day-value">
            🆓 ${day.count}件 / 💎 ${stats.regular.reverse()[index].count}件
          </span>
        </div>
      `).join('')}
    </div>
    
    <div class="refresh-info">
      最終更新: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} JST
      <br>
      自動更新: 15分ごと
    </div>
  </div>
</body>
</html>`;
}

/**
 * ダッシュボードAPIハンドラー
 */
const handler = async (req, res) => {
  try {
    // 統計データを取得
    const stats = await getConversionStats(7);
    
    // HTMLを生成
    const html = generateDashboardHTML(stats);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(200).send(html);
  } catch (error) {
    console.error('[Dashboard] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = handler;
module.exports.getConversionCount = getConversionCount;
module.exports.recordConversion = recordConversion;
module.exports.getConversionStats = getConversionStats;
module.exports.getFunnelConversions = getFunnelConversions;
