// services/api/sales.js
// API販売機能の実装

/**
 * API価格設定
 */
const API_PRICING = {
  perRequest: 0.01, // $0.01 per request
  monthlyLimit: {
    free: 100, // 無料版: 100リクエスト/月
    regular: 10000, // Regular Briefing: 10,000リクエスト/月
    premium: 1000000, // Premium Tier: 1,000,000リクエスト/月
    enterprise: -1, // エンタープライズ: 無制限
  },
  overageRate: 0.015, // 超過分は$0.015/リクエスト
};

/**
 * APIリクエストを記録
 */
function recordAPIRequest(apiKey, endpoint, params = {}) {
  // 実際の実装では、データベースに記録
  // ここでは簡易的な実装
  const request = {
    apiKey,
    endpoint,
    params,
    timestamp: new Date().toISOString(),
    cost: API_PRICING.perRequest,
  };

  // TODO: データベースに保存
  // await db.apiRequests.insert(request);

  return request;
}

/**
 * API使用量をチェック
 */
function checkAPIUsage(apiKey, userTier = 'free') {
  const monthlyLimit = API_PRICING.monthlyLimit[userTier] || API_PRICING.monthlyLimit.free;
  
  // 実際の実装では、データベースから今月の使用量を取得
  // const currentMonthUsage = await db.apiRequests.count({
  //   apiKey,
  //   timestamp: { $gte: startOfMonth() }
  // });

  // 仮の実装
  const currentMonthUsage = 0; // TODO: データベースから取得

  return {
    used: currentMonthUsage,
    limit: monthlyLimit,
    remaining: monthlyLimit === -1 ? -1 : Math.max(0, monthlyLimit - currentMonthUsage),
    overage: monthlyLimit !== -1 && currentMonthUsage > monthlyLimit 
      ? currentMonthUsage - monthlyLimit 
      : 0,
  };
}

/**
 * APIリクエストのコストを計算
 */
function calculateAPICost(apiKey, userTier = 'free') {
  const usage = checkAPIUsage(apiKey, userTier);
  
  if (usage.limit === -1) {
    // エンタープライズ: 無制限
    return { cost: 0, overage: 0 };
  }

  if (usage.used <= usage.limit) {
    // 制限内
    return { 
      cost: usage.used * API_PRICING.perRequest,
      overage: 0,
    };
  }

  // 超過分
  const baseCost = usage.limit * API_PRICING.perRequest;
  const overageCost = usage.overage * API_PRICING.overageRate;

  return {
    cost: baseCost + overageCost,
    overage: usage.overage,
    overageCost,
  };
}

/**
 * APIキーを生成
 */
function generateAPIKey(userId, userTier = 'free') {
  const prefix = {
    free: 'td_free',
    regular: 'td_reg',
    premium: 'td_prem',
    enterprise: 'td_ent',
  }[userTier] || 'td_free';

  const randomPart = require('crypto').randomBytes(32).toString('hex');
  return `${prefix}_${userId}_${randomPart}`;
}

/**
 * APIキーを検証
 */
function validateAPIKey(apiKey) {
  // APIキーの形式をチェック
  const parts = apiKey.split('_');
  if (parts.length < 3) {
    return { valid: false, error: 'Invalid API key format' };
  }

  const tier = parts[1];
  const userId = parts[2];

  // 実際の実装では、データベースでAPIキーを検証
  // const user = await db.users.findOne({ id: userId, apiKey });

  return {
    valid: true,
    tier,
    userId,
  };
}

/**
 * APIレート制限をチェック
 */
function checkRateLimit(apiKey, userTier = 'free') {
  const rateLimits = {
    free: { requestsPerMinute: 10, requestsPerHour: 100 },
    regular: { requestsPerMinute: 60, requestsPerHour: 1000 },
    premium: { requestsPerMinute: 300, requestsPerHour: 10000 },
    enterprise: { requestsPerMinute: 1000, requestsPerHour: 100000 },
  };

  const limits = rateLimits[userTier] || rateLimits.free;

  // 実際の実装では、Redisなどでレート制限を管理
  // const currentMinuteRequests = await redis.get(`api:${apiKey}:minute:${currentMinute()}`);
  // const currentHourRequests = await redis.get(`api:${apiKey}:hour:${currentHour()}`);

  return {
    allowed: true, // TODO: 実際のレート制限チェック
    limits,
  };
}

/**
 * APIエンドポイント: 市場データ取得
 */
async function getMarketDataAPI(apiKey, params = {}) {
  // APIキーを検証
  const validation = validateAPIKey(apiKey);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // レート制限をチェック
  const rateLimit = checkRateLimit(apiKey, validation.tier);
  if (!rateLimit.allowed) {
    throw new Error('Rate limit exceeded');
  }

  // 使用量をチェック
  const usage = checkAPIUsage(apiKey, validation.tier);
  if (usage.remaining === 0 && usage.limit !== -1) {
    throw new Error('Monthly API limit exceeded. Please upgrade your plan.');
  }

  // リクエストを記録
  recordAPIRequest(apiKey, '/api/market-data', params);

  // 実際のデータ取得（CryptoQuant APIなど）
  // const marketData = await fetchMarketData(params);
  
  // 仮のレスポンス
  return {
    price: 88600,
    change24h: -0.81,
    trapScore: 8,
    exchangeNetflow: -40.9,
    mpi: -1.55,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  API_PRICING,
  recordAPIRequest,
  checkAPIUsage,
  calculateAPICost,
  generateAPIKey,
  validateAPIKey,
  checkRateLimit,
  getMarketDataAPI,
};
