// services/x/abTesting.js
// A/Bテスト機能（Grok推奨: 複数パターンの投稿をテスト）

// Vercel KV（A/Bテスト結果追跡用）
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[A/B Testing] @vercel/kv not available:', error.message);
}

/**
 * A/Bテストバリアントを選択
 * @param {string} testName - テスト名（例: 'content_format', 'hashtag_strategy'）
 * @param {Array} variants - バリアント配列
 * @returns {string} 選択されたバリアント
 */
function selectABTestVariant(testName, variants) {
  if (!variants || variants.length === 0) {
    return null;
  }
  
  // ランダム選択（将来的にメトリクスに基づく最適化可能）
  const randomIndex = Math.floor(Math.random() * variants.length);
  return variants[randomIndex];
}

/**
 * A/Bテスト結果を記録
 * @param {string} testName - テスト名
 * @param {string} variant - バリアント
 * @param {Object} metrics - メトリクス（impressions, engagements, clicks等）
 * @returns {Promise<void>}
 */
async function recordABTestResult(testName, variant, metrics) {
  if (!kv) {
    console.warn('[A/B Testing] KV not available, skipping result recording');
    return;
  }
  
  try {
    const dateString = new Date().toISOString().split('T')[0];
    const key = `x:ab_test:${testName}:${variant}:${dateString}`;
    
    // メトリクスを記録
    await kv.set(key, JSON.stringify({
      testName,
      variant,
      date: dateString,
      metrics,
      recordedAt: new Date().toISOString(),
    }), { ex: 86400 * 30 }); // 30日間保持
    
    console.log(`[A/B Testing] Result recorded: ${testName}/${variant}`);
  } catch (error) {
    console.warn('[A/B Testing] Failed to record result:', error.message);
  }
}

/**
 * A/Bテスト結果を取得
 * @param {string} testName - テスト名
 * @param {number} days - 取得日数（デフォルト: 7）
 * @returns {Promise<Object>} バリアント別の集計結果
 */
async function getABTestResults(testName, days = 7) {
  if (!kv) {
    return {};
  }
  
  try {
    const results = {};
    const now = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      // すべてのバリアントを取得
      const keys = await kv.keys(`x:ab_test:${testName}:*:${dateString}`);
      
      for (const key of keys) {
        const data = await kv.get(key);
        if (data) {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          const variant = parsed.variant;
          
          if (!results[variant]) {
            results[variant] = {
              variant,
              totalImpressions: 0,
              totalEngagements: 0,
              totalClicks: 0,
              count: 0,
            };
          }
          
          results[variant].totalImpressions += parsed.metrics?.impressions || 0;
          results[variant].totalEngagements += parsed.metrics?.engagements || 0;
          results[variant].totalClicks += parsed.metrics?.clicks || 0;
          results[variant].count += 1;
        }
      }
    }
    
    // エンゲージメント率を計算
    for (const variant in results) {
      const r = results[variant];
      r.engagementRate = r.totalImpressions > 0 
        ? (r.totalEngagements / r.totalImpressions) * 100 
        : 0;
      r.clickRate = r.totalImpressions > 0 
        ? (r.totalClicks / r.totalImpressions) * 100 
        : 0;
    }
    
    return results;
  } catch (error) {
    console.warn('[A/B Testing] Failed to get results:', error.message);
    return {};
  }
}

/**
 * 最適なバリアントを取得（メトリクスに基づく）
 * @param {string} testName - テスト名
 * @returns {Promise<string>} 最適なバリアント
 */
async function getOptimalVariant(testName) {
  const results = await getABTestResults(testName, 7);
  
  if (Object.keys(results).length === 0) {
    return null; // データがない場合はnullを返す
  }
  
  // エンゲージメント率が最も高いバリアントを選択
  let optimalVariant = null;
  let maxEngagementRate = 0;
  
  for (const variant in results) {
    const engagementRate = results[variant].engagementRate || 0;
    if (engagementRate > maxEngagementRate) {
      maxEngagementRate = engagementRate;
      optimalVariant = variant;
    }
  }
  
  return optimalVariant;
}

module.exports = {
  selectABTestVariant,
  recordABTestResult,
  getABTestResults,
  getOptimalVariant,
};
