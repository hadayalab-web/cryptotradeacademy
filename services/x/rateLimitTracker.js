// services/x/rateLimitTracker.js
// X APIレート制限追跡・管理サービス（KVストレージ）

// 🚀 シームレスなKVアクセス（utils/kv.js経由）
const { kv } = require('../../utils/kv');

// KVキーのプレフィックス
const RATE_LIMIT_KEY_PREFIX = 'x:api:rate_limit:';
const RATE_LIMIT_STATUS_KEY_PREFIX = 'x:api:rate_limit_status:';
const RATE_LIMIT_CONFIG_KEY = 'x:api:rate_limit_config';

/**
 * X APIレート制限設定（公式ドキュメント参照）
 * https://docs.x.com/x-api/fundamentals/rate-limits
 */
const RATE_LIMIT_CONFIG = {
  // Posts endpoints
  posts: {
    'POST /2/tweets': {
      perApp: { limit: 10000, window: '24hrs' },
      perUser: { limit: 100, window: '15min' },
    },
    'DELETE /2/tweets/:id': {
      perUser: { limit: 50, window: '15min' },
    },
    'GET /2/tweets': {
      perApp: { limit: 3500, window: '15min' },
      perUser: { limit: 5000, window: '15min' },
    },
    'GET /2/tweets/:id': {
      perApp: { limit: 450, window: '15min' },
      perUser: { limit: 900, window: '15min' },
    },
    'GET /2/tweets/search/recent': {
      perApp: { limit: 450, window: '15min' },
      perUser: { limit: 300, window: '15min' },
    },
    'GET /2/users/:id/tweets': {
      perApp: { limit: 10000, window: '15min' },
      perUser: { limit: 900, window: '15min' },
    },
  },
  
  // Users endpoints
  users: {
    'GET /2/users': {
      perApp: { limit: 300, window: '15min' },
      perUser: { limit: 900, window: '15min' },
    },
    'GET /2/users/:id': {
      perApp: { limit: 300, window: '15min' },
      perUser: { limit: 900, window: '15min' },
    },
    'GET /2/users/by/username/:username': {
      perApp: { limit: 300, window: '15min' },
      perUser: { limit: 900, window: '15min' },
    },
  },
  
  // Media endpoints
  media: {
    'POST /2/media/upload': {
      perApp: { limit: 50000, window: '24hrs' },
      perUser: { limit: 500, window: '15min' },
    },
  },
  
  // Direct Messages endpoints
  dm: {
    'POST /2/dm_conversations': {
      perApp: { limit: 1440, window: '24hrs' },
      perUser: { limit: 15, window: '15min' },
    },
  },
};

/**
 * レート制限設定をKVに保存
 */
async function saveRateLimitConfig() {
  if (!kv) {
    console.warn('[RateLimitTracker] KV not available, cannot save rate limit config');
    return false;
  }

  try {
    await kv.set(RATE_LIMIT_CONFIG_KEY, RATE_LIMIT_CONFIG, { ex: 86400 * 365 }); // 1年間保持
    console.log('[RateLimitTracker] ✅ Rate limit config saved to KV');
    return true;
  } catch (error) {
    console.error('[RateLimitTracker] ❌ Failed to save rate limit config:', error.message);
    return false;
  }
}

/**
 * レート制限設定をKVから取得
 */
async function getRateLimitConfig() {
  if (!kv) {
    return RATE_LIMIT_CONFIG; // フォールバック: メモリ内の設定を返す
  }

  try {
    const config = await kv.get(RATE_LIMIT_CONFIG_KEY);
    return config || RATE_LIMIT_CONFIG;
  } catch (error) {
    console.error('[RateLimitTracker] Failed to get rate limit config:', error.message);
    return RATE_LIMIT_CONFIG;
  }
}

/**
 * レート制限キーを生成
 * @param {string} endpoint - エンドポイント（例: 'POST /2/tweets'）
 * @param {string} authType - 認証タイプ（'app' または 'user'）
 * @returns {string} KVキー
 */
function getRateLimitKey(endpoint, authType = 'user') {
  const normalizedEndpoint = endpoint.replace(/\/:\w+/g, '/:id').replace(/\s+/g, '_');
  return `${RATE_LIMIT_KEY_PREFIX}${authType}:${normalizedEndpoint}`;
}

/**
 * レート制限ステータスキーを生成
 * @param {string} endpoint - エンドポイント
 * @param {string} authType - 認証タイプ
 * @returns {string} KVキー
 */
function getRateLimitStatusKey(endpoint, authType = 'user') {
  const normalizedEndpoint = endpoint.replace(/\/:\w+/g, '/:id').replace(/\s+/g, '_');
  return `${RATE_LIMIT_STATUS_KEY_PREFIX}${authType}:${normalizedEndpoint}`;
}

/**
 * ウィンドウの開始時刻を取得
 * @param {string} window - ウィンドウタイプ（'15min' または '24hrs'）
 * @returns {Date} ウィンドウの開始時刻
 */
function getWindowStartTime(window) {
  const now = new Date();
  
  if (window === '15min') {
    // 15分単位で切り捨て
    const minutes = now.getUTCMinutes();
    const roundedMinutes = Math.floor(minutes / 15) * 15;
    const windowStart = new Date(now);
    windowStart.setUTCMinutes(roundedMinutes);
    windowStart.setUTCSeconds(0);
    windowStart.setUTCMilliseconds(0);
    return windowStart;
  } else if (window === '24hrs') {
    // 日単位で切り捨て（UTC）
    const windowStart = new Date(now);
    windowStart.setUTCHours(0);
    windowStart.setUTCMinutes(0);
    windowStart.setUTCSeconds(0);
    windowStart.setUTCMilliseconds(0);
    return windowStart;
  }
  
  return now;
}

/**
 * レート制限情報を記録
 * @param {string} endpoint - エンドポイント（例: 'POST /2/tweets'）
 * @param {string} authType - 認証タイプ（'app' または 'user'）
 * @param {Object} headers - レスポンスヘッダー（x-rate-limit-*を含む）
 * @returns {Promise<Object>} 記録されたレート制限情報
 */
async function recordRateLimit(endpoint, authType = 'user', headers = {}) {
  if (!kv) {
    console.warn('[RateLimitTracker] KV not available, cannot record rate limit');
    return null;
  }

  try {
    const limit = parseInt(headers['x-rate-limit-limit'] || headers['x-ratelimit-limit'] || '0', 10);
    const remaining = parseInt(headers['x-rate-limit-remaining'] || headers['x-ratelimit-remaining'] || '0', 10);
    const reset = parseInt(headers['x-rate-limit-reset'] || headers['x-ratelimit-reset'] || '0', 10);
    
    if (limit === 0) {
      // レート制限情報がヘッダーにない場合、設定から取得
      const config = await getRateLimitConfig();
      const endpointConfig = findEndpointConfig(config, endpoint, authType);
      if (endpointConfig) {
        const window = endpointConfig.window || '15min';
        const configLimit = endpointConfig.limit || 0;
        const windowStart = getWindowStartTime(window);
        const resetTime = window === '15min' 
          ? windowStart.getTime() / 1000 + 15 * 60 
          : windowStart.getTime() / 1000 + 24 * 60 * 60;
        
        const rateLimitData = {
          endpoint,
          authType,
          limit: configLimit,
          remaining: configLimit, // 初期値
          reset: resetTime,
          window,
          lastUpdated: new Date().toISOString(),
        };
        
        const key = getRateLimitKey(endpoint, authType);
        await kv.set(key, rateLimitData, { ex: 86400 }); // 24時間保持
        
        return rateLimitData;
      }
      return null;
    }
    
    const rateLimitData = {
      endpoint,
      authType,
      limit,
      remaining,
      reset,
      window: reset > Date.now() / 1000 + 3600 ? '24hrs' : '15min', // 推定
      lastUpdated: new Date().toISOString(),
    };
    
    const key = getRateLimitKey(endpoint, authType);
    await kv.set(key, rateLimitData, { ex: 86400 }); // 24時間保持
    
    // ステータスも更新（簡易版）
    const statusKey = getRateLimitStatusKey(endpoint, authType);
    const status = {
      endpoint,
      authType,
      limit,
      remaining,
      reset,
      isLimited: remaining === 0,
      resetTime: new Date(reset * 1000).toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    await kv.set(statusKey, status, { ex: 86400 }); // 24時間保持
    
    if (remaining === 0) {
      console.warn(`[RateLimitTracker] ⚠️ Rate limit reached for ${endpoint} (${authType}): ${limit}/${limit}`);
    } else if (remaining < limit * 0.1) {
      console.warn(`[RateLimitTracker] ⚠️ Rate limit warning for ${endpoint} (${authType}): ${remaining}/${limit} remaining`);
    }
    
    return rateLimitData;
  } catch (error) {
    console.error(`[RateLimitTracker] ❌ Failed to record rate limit for ${endpoint}:`, error.message);
    return null;
  }
}

/**
 * エンドポイント設定を検索
 * @param {Object} config - レート制限設定
 * @param {string} endpoint - エンドポイント
 * @param {string} authType - 認証タイプ
 * @returns {Object|null} エンドポイント設定
 */
function findEndpointConfig(config, endpoint, authType) {
  // エンドポイントを正規化（例: 'POST /2/tweets/:id' → 'POST /2/tweets/:id'）
  const normalizedEndpoint = endpoint.replace(/\/:\w+/g, '/:id');
  
  // カテゴリごとに検索
  for (const category of Object.values(config)) {
    if (category[normalizedEndpoint]) {
      const endpointConfig = category[normalizedEndpoint];
      const authConfig = authType === 'app' ? endpointConfig.perApp : endpointConfig.perUser;
      if (authConfig) {
        return {
          limit: authConfig.limit,
          window: authConfig.window,
        };
      }
    }
  }
  
  return null;
}

/**
 * レート制限情報を取得
 * @param {string} endpoint - エンドポイント
 * @param {string} authType - 認証タイプ（'app' または 'user'）
 * @returns {Promise<Object|null>} レート制限情報
 */
async function getRateLimit(endpoint, authType = 'user') {
  if (!kv) {
    return null;
  }

  try {
    const key = getRateLimitKey(endpoint, authType);
    const rateLimit = await kv.get(key);
    
    if (rateLimit && rateLimit.reset) {
      // リセット時刻をチェック
      const resetTime = rateLimit.reset * 1000;
      const now = Date.now();
      
      if (now >= resetTime) {
        // ウィンドウがリセットされている場合、設定から再取得
        const config = await getRateLimitConfig();
        const endpointConfig = findEndpointConfig(config, endpoint, authType);
        if (endpointConfig) {
          const window = endpointConfig.window || '15min';
          const limit = endpointConfig.limit || 0;
          const windowStart = getWindowStartTime(window);
          const reset = window === '15min' 
            ? windowStart.getTime() / 1000 + 15 * 60 
            : windowStart.getTime() / 1000 + 24 * 60 * 60;
          
          return {
            endpoint,
            authType,
            limit,
            remaining: limit,
            reset,
            window,
            lastUpdated: new Date().toISOString(),
          };
        }
      }
    }
    
    return rateLimit;
  } catch (error) {
    console.error(`[RateLimitTracker] Failed to get rate limit for ${endpoint}:`, error.message);
    return null;
  }
}

/**
 * レート制限ステータスを取得
 * @param {string} endpoint - エンドポイント
 * @param {string} authType - 認証タイプ
 * @returns {Promise<Object|null>} レート制限ステータス
 */
async function getRateLimitStatus(endpoint, authType = 'user') {
  if (!kv) {
    return null;
  }

  try {
    const key = getRateLimitStatusKey(endpoint, authType);
    const status = await kv.get(key);
    return status;
  } catch (error) {
    console.error(`[RateLimitTracker] Failed to get rate limit status for ${endpoint}:`, error.message);
    return null;
  }
}

/**
 * レート制限に達しているかチェック
 * @param {string} endpoint - エンドポイント
 * @param {string} authType - 認証タイプ
 * @returns {Promise<boolean>} レート制限に達している場合true
 */
async function isRateLimited(endpoint, authType = 'user') {
  const rateLimit = await getRateLimit(endpoint, authType);
  if (!rateLimit) {
    return false; // 情報がない場合は制限なしとみなす
  }
  
  return rateLimit.remaining === 0;
}

/**
 * レート制限の残りリクエスト数を取得
 * @param {string} endpoint - エンドポイント
 * @param {string} authType - 認証タイプ
 * @returns {Promise<number>} 残りリクエスト数
 */
async function getRemainingRequests(endpoint, authType = 'user') {
  const rateLimit = await getRateLimit(endpoint, authType);
  return rateLimit ? rateLimit.remaining : null;
}

/**
 * レート制限のリセット時刻を取得
 * @param {string} endpoint - エンドポイント
 * @param {string} authType - 認証タイプ
 * @returns {Promise<Date|null>} リセット時刻
 */
async function getResetTime(endpoint, authType = 'user') {
  const rateLimit = await getRateLimit(endpoint, authType);
  if (!rateLimit || !rateLimit.reset) {
    return null;
  }
  
  return new Date(rateLimit.reset * 1000);
}

/**
 * すべてのレート制限ステータスを取得
 * @returns {Promise<Array>} レート制限ステータスの配列
 */
async function getAllRateLimitStatuses() {
  if (!kv) {
    return [];
  }

  try {
    // 注意: KVはキーの一覧取得ができない場合があるため、
    // 主要なエンドポイントを直接取得する
    const endpoints = [
      { endpoint: 'POST /2/tweets', authType: 'user' },
      { endpoint: 'GET /2/tweets/:id', authType: 'user' },
      { endpoint: 'GET /2/users/:id', authType: 'user' },
      { endpoint: 'POST /2/media/upload', authType: 'user' },
    ];
    
    const statuses = [];
    for (const { endpoint, authType } of endpoints) {
      const status = await getRateLimitStatus(endpoint, authType);
      if (status) {
        statuses.push(status);
      }
    }
    
    return statuses;
  } catch (error) {
    console.error('[RateLimitTracker] Failed to get all rate limit statuses:', error.message);
    return [];
  }
}

module.exports = {
  RATE_LIMIT_CONFIG,
  saveRateLimitConfig,
  getRateLimitConfig,
  recordRateLimit,
  getRateLimit,
  getRateLimitStatus,
  isRateLimited,
  getRemainingRequests,
  getResetTime,
  getAllRateLimitStatuses,
  getRateLimitKey,
  getRateLimitStatusKey,
};
