// services/x/costTracker.js
// X APIコスト追跡・記録サービス（KVストレージ）

// 🚀 シームレスなKVアクセス（utils/kv.js経由）
const { kv } = require('../../utils/kv');
const pricing = require('../../config/xApiPricing');

// KVキーのプレフィックス
const COST_KEY_PREFIX = 'x:api:cost:';
const DAILY_COST_KEY_PREFIX = 'x:api:cost:daily:';
const MONTHLY_COST_KEY_PREFIX = 'x:api:cost:monthly:';
const OPERATION_COST_KEY_PREFIX = 'x:api:cost:operation:';

/**
 * 日付文字列を取得（YYYY-MM-DD形式）
 * @param {Date} date - 日付オブジェクト（省略時は今日）
 * @returns {string} 日付文字列
 */
function getDateString(date = null) {
  const targetDate = date || new Date();
  return targetDate.toISOString().split('T')[0];
}

/**
 * 月次キーを取得（YYYY-MM形式）
 * @param {Date} date - 日付オブジェクト（省略時は今日）
 * @returns {string} 月次キー
 */
function getMonthKey(date = null) {
  const targetDate = date || new Date();
  return targetDate.toISOString().substring(0, 7); // YYYY-MM
}

/**
 * X API操作のコストを記録
 * @param {string} operation - 操作タイプ（'post', 'userRead', 'search', 'followers', 'profile', 'message', 'imageUpload', 'videoUpload'）
 * @param {number} count - 操作回数（デフォルト: 1）
 * @param {Object} metadata - 追加メタデータ（lang, jobId, tweetIdなど）
 * @returns {Promise<Object>} 記録されたコスト情報
 */
async function recordCost(operation, count = 1, metadata = {}) {
  if (!kv) {
    console.warn('[CostTracker] KV not available, cannot record cost');
    return null;
  }

  try {
    const dateString = getDateString();
    const monthKey = getMonthKey();
    const cost = calculateOperationCost(operation, count);
    
    // 日次コストを更新
    const dailyKey = `${DAILY_COST_KEY_PREFIX}${dateString}`;
    const dailyCost = await kv.get(dailyKey) || {
      date: dateString,
      total: 0,
      operations: {},
      postCount: 0,
    };
    
    dailyCost.total = (dailyCost.total || 0) + cost;
    dailyCost.operations[operation] = (dailyCost.operations[operation] || 0) + count;
    if (operation === 'post') {
      dailyCost.postCount = (dailyCost.postCount || 0) + count;
    }
    
    // メタデータを保存
    if (!dailyCost.metadata) {
      dailyCost.metadata = [];
    }
    dailyCost.metadata.push({
      operation,
      count,
      cost,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
    
    // 最新100件のメタデータのみ保持（メモリ節約）
    if (dailyCost.metadata.length > 100) {
      dailyCost.metadata = dailyCost.metadata.slice(-100);
    }
    
    await kv.set(dailyKey, dailyCost, { ex: 86400 * 7 }); // 7日間保持
    
    // 月次コストを更新
    const monthlyKey = `${MONTHLY_COST_KEY_PREFIX}${monthKey}`;
    const monthlyCost = await kv.get(monthlyKey) || {
      month: monthKey,
      total: 0,
      operations: {},
      postCount: 0,
      dailyBreakdown: {},
    };
    
    monthlyCost.total = (monthlyCost.total || 0) + cost;
    monthlyCost.operations[operation] = (monthlyCost.operations[operation] || 0) + count;
    if (operation === 'post') {
      monthlyCost.postCount = (monthlyCost.postCount || 0) + count;
    }
    
    // 日次内訳を更新
    monthlyCost.dailyBreakdown[dateString] = (monthlyCost.dailyBreakdown[dateString] || 0) + cost;
    
    await kv.set(monthlyKey, monthlyCost, { ex: 86400 * 93 }); // 93日間保持（約3ヶ月）
    
    // 操作別コストを記録（統計用）
    const operationKey = `${OPERATION_COST_KEY_PREFIX}${operation}:${dateString}`;
    const operationCost = await kv.get(operationKey) || {
      operation,
      date: dateString,
      count: 0,
      totalCost: 0,
    };
    
    operationCost.count += count;
    operationCost.totalCost += cost;
    
    await kv.set(operationKey, operationCost, { ex: 86400 * 7 }); // 7日間保持
    
    console.log(`[CostTracker] ✅ Recorded ${operation} cost: $${cost.toFixed(4)} (count: ${count})`);
    
    return {
      operation,
      count,
      cost,
      date: dateString,
      month: monthKey,
      dailyTotal: dailyCost.total,
      monthlyTotal: monthlyCost.total,
    };
  } catch (error) {
    console.error(`[CostTracker] ❌ Failed to record cost for ${operation}:`, error.message);
    return null;
  }
}

/**
 * 操作のコストを計算
 * @param {string} operation - 操作タイプ
 * @param {number} count - 操作回数
 * @returns {number} コスト（USD）
 */
function calculateOperationCost(operation, count = 1) {
  const costMap = {
    post: pricing.write.post, // $0.005
    userRead: pricing.read.user, // $0.002
    search: pricing.read.search, // $0.002
    followers: pricing.read.followers, // $0.01
    profile: pricing.read.profile, // $0.002
    message: pricing.write.message, // $0.01
    imageUpload: pricing.write.imageUpload, // $0.005
    videoUpload: pricing.write.videoUpload, // $0.01
  };
  
  const unitCost = costMap[operation] || 0;
  return unitCost * count;
}

/**
 * 日次コストを取得
 * @param {string} dateString - 日付文字列（YYYY-MM-DD、省略時は今日）
 * @returns {Promise<Object>} 日次コスト情報
 */
async function getDailyCost(dateString = null) {
  if (!kv) {
    return null;
  }

  try {
    const targetDate = dateString || getDateString();
    const dailyKey = `${DAILY_COST_KEY_PREFIX}${targetDate}`;
    const dailyCost = await kv.get(dailyKey);
    
    return dailyCost || {
      date: targetDate,
      total: 0,
      operations: {},
      postCount: 0,
      metadata: [],
    };
  } catch (error) {
    console.error(`[CostTracker] Failed to get daily cost for ${dateString}:`, error.message);
    return null;
  }
}

/**
 * 月次コストを取得
 * @param {string} monthKey - 月次キー（YYYY-MM、省略時は今月）
 * @returns {Promise<Object>} 月次コスト情報
 */
async function getMonthlyCost(monthKey = null) {
  if (!kv) {
    return null;
  }

  try {
    const targetMonth = monthKey || getMonthKey();
    const monthlyKey = `${MONTHLY_COST_KEY_PREFIX}${targetMonth}`;
    const monthlyCost = await kv.get(monthlyKey);
    
    return monthlyCost || {
      month: targetMonth,
      total: 0,
      operations: {},
      postCount: 0,
      dailyBreakdown: {},
    };
  } catch (error) {
    console.error(`[CostTracker] Failed to get monthly cost for ${monthKey}:`, error.message);
    return null;
  }
}

/**
 * 期間のコストを取得
 * @param {Date} startDate - 開始日
 * @param {Date} endDate - 終了日
 * @returns {Promise<Object>} 期間コスト情報
 */
async function getCostForPeriod(startDate, endDate) {
  if (!kv) {
    return null;
  }

  try {
    const costs = [];
    const currentDate = new Date(startDate);
    let totalCost = 0;
    let totalPosts = 0;
    const operations = {};
    
    while (currentDate <= endDate) {
      const dateString = getDateString(currentDate);
      const dailyCost = await getDailyCost(dateString);
      
      if (dailyCost && dailyCost.total > 0) {
        costs.push(dailyCost);
        totalCost += dailyCost.total;
        totalPosts += dailyCost.postCount || 0;
        
        // 操作別の集計
        for (const [operation, count] of Object.entries(dailyCost.operations || {})) {
          operations[operation] = (operations[operation] || 0) + count;
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return {
      startDate: getDateString(startDate),
      endDate: getDateString(endDate),
      totalCost,
      totalPosts,
      operations,
      dailyBreakdown: costs,
    };
  } catch (error) {
    console.error(`[CostTracker] Failed to get cost for period:`, error.message);
    return null;
  }
}

/**
 * コストサマリーを取得（日次・月次・期間）
 * @param {Object} options - オプション
 * @param {string} options.dateString - 日付文字列（日次取得用）
 * @param {string} options.monthKey - 月次キー（月次取得用）
 * @param {Date} options.startDate - 開始日（期間取得用）
 * @param {Date} options.endDate - 終了日（期間取得用）
 * @returns {Promise<Object>} コストサマリー
 */
async function getCostSummary(options = {}) {
  const { dateString, monthKey, startDate, endDate } = options;
  
  const summary = {
    daily: null,
    monthly: null,
    period: null,
  };
  
  if (dateString) {
    summary.daily = await getDailyCost(dateString);
  }
  
  if (monthKey) {
    summary.monthly = await getMonthlyCost(monthKey);
  }
  
  if (startDate && endDate) {
    summary.period = await getCostForPeriod(startDate, endDate);
  }
  
  return summary;
}

module.exports = {
  recordCost,
  calculateOperationCost,
  getDailyCost,
  getMonthlyCost,
  getCostForPeriod,
  getCostSummary,
  getDateString,
  getMonthKey,
};
