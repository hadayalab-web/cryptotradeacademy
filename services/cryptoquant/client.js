// services/cryptoquant/client.js
// Node.js 18+ Native Fetchを使用
// Phase 3: キャッシュ導入と分散レート制限対応

const BASE_URL = "https://api.cryptoquant.com/v1";
const API_KEY = process.env.CRYPTOQUANT_API_KEY;
// 🚀 シームレスなKVアクセス（utils/kv.js経由）
const { kv } = require('../../utils/kv');

// Phase 3: 分散レート制限（Professionalプラン: concurrency=1, Premium以上: concurrency=2-3）
const CRYPTOQUANT_PLAN = process.env.CRYPTOQUANT_PLAN || 'professional';
const CONCURRENCY = CRYPTOQUANT_PLAN === 'premium' || CRYPTOQUANT_PLAN === 'enterprise' ? 2 : 1;

// Phase 3: p-limitの動的インポート（ES Module対応）
// p-limitはES Moduleのため動的インポートを使用
let pLimit = null;
async function getPLimit() {
  if (!pLimit) {
    try {
      const pLimitModule = await import('p-limit');
      pLimit = pLimitModule.default || pLimitModule;
    } catch (error) {
      console.warn('[CQ Client] p-limit import failed, using fallback implementation:', error.message);
      // フォールバック: シンプルなキュー実装（concurrency制御）
      pLimit = (concurrency) => {
        let running = 0;
        const queue = [];
        
        const processQueue = async () => {
          if (running >= concurrency || queue.length === 0) return;
          
          running++;
          const { fn, resolve, reject } = queue.shift();
          
          try {
            const result = await fn();
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            running--;
            processQueue();
          }
        };
        
        return async (fn) => {
          return new Promise((resolve, reject) => {
            queue.push({ fn, resolve, reject });
            processQueue();
          });
        };
      };
    }
  }
  return pLimit;
}

// rateLimitQueueは使用時に初期化（p-limitの動的インポート対応）
let rateLimitQueue = null;
async function getRateLimitQueue() {
  if (!rateLimitQueue) {
    const limit = await getPLimit();
    rateLimitQueue = limit(CONCURRENCY);
  }
  return rateLimitQueue;
}
const { checkTokenBucket } = require('./rateLimiter');

// Phase 3: キャッシュキー生成
function buildCacheKey(endpoint, params) {
  const normalized = {
    endpoint,
    params: Object.keys(params).sort().reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {}),
  };
  return `cq:cache:${Buffer.from(JSON.stringify(normalized)).toString('base64url')}`;
}

// Phase 3: TTL計算（windowパラメータに基づいて決定）
function getCacheTTL(params) {
  const window = params.window || 'day';
  
  // day/window=day&limit=1 系: TTL 2〜6時間（cron周期に合わせる）
  if (window === 'day') {
    // 支払失効/プラン切替の「つなぎ」では、キャッシュが枯れると品質が落ちるため TTL を延長できるようにする
    // 例: CQ_GRACE_DAYS=3 → 3日保持（Advancedトライアルを耐える）
    const graceDays = Number(process.env.CQ_GRACE_DAYS || 0);
    if (Number.isFinite(graceDays) && graceDays > 0) {
      return Math.max(4 * 60 * 60, Math.round(graceDays * 86400));
    }
    return 4 * 60 * 60; // 4時間（通常）
  }
  
  // hour/4hour 系: TTL 5〜15分（Premium時のみ）
  if (window === 'hour' || window === '4hour') {
    return 10 * 60; // 10分
  }
  
  // デフォルト: 1時間
  return 60 * 60;
}

// Phase 3: KVからキャッシュを取得
async function getKVCache(key) {
  try {
    if (!kv) return null;
    const cached = await kv.get(key);
    if (cached) {
      console.log(`💾 Cache hit: ${key.substring(0, 50)}...`);
    }
    return cached;
  } catch (error) {
    console.warn('[CQ Cache] Error reading from KV:', error.message);
    return null;
  }
}

// Phase 3: KVにキャッシュを保存
async function setKVCache(key, value, ttlSeconds) {
  try {
    if (!kv) return false;
    await kv.set(key, value, { ex: ttlSeconds });
    return true;
  } catch (error) {
    console.warn('[CQ Cache] Error saving to KV:', error.message);
    return false;
  }
}

// Phase 3: stale-while-revalidate 対応のキャッシュ取得
async function getCacheWithStaleRevalidate(key, ttlSeconds) {
  const cached = await getKVCache(key);
  if (cached) {
    // stale-while-revalidate: 古い値を返しつつ、バックグラウンドで更新
    // 今回はシンプルに、キャッシュがあればそれを返す
    return cached;
  }
  return null;
}

/**
 * Generic Fetch Wrapper for CryptoQuant
 * Phase 3: キャッシュ導入と分散レート制限対応
 * Step 2-4: EMERGENCY判定指標のキャッシュバイパス/強制更新ポリシー
 * 
 * @param {string} endpoint 
 * @param {object} params 
 * @param {object} options - オプション
 * @param {boolean} options.skipCache - キャッシュをスキップするか（EMERGENCY判定時など）
 */
function validateCQParams(endpoint, params) {
  if (endpoint == null || String(endpoint).trim() === "") {
    console.log("[CQ] CQ_PARAM_ERROR", { reason: "endpoint missing or empty" });
    return false;
  }
  const requiredParamKeys = ["window", "limit", "symbol", "interval"];
  for (const key of requiredParamKeys) {
    if (Object.prototype.hasOwnProperty.call(params, key) && (params[key] == null || params[key] === "")) {
      console.log("[CQ] CQ_PARAM_ERROR", { reason: `${key} is null or empty`, params: { ...params, [key]: params[key] } });
      return false;
    }
  }
  return true;
}

async function fetchCryptoQuant(endpoint, params = {}, options = {}) {
    if (!API_KEY) {
        console.error("⚠️ CRYPTOQUANT_API_KEY is not set in .env.local");
        return null;
    }
    // /stablecoin/* は token 必須。CQ によっては USDT を期待（大文字で試す）
    const path = String(endpoint || "").toLowerCase();
    if (path.includes("stablecoin") && (params.token == null || params.token === "")) {
      params = { ...params, token: "USDT" };
    }
    if (!validateCQParams(endpoint, params)) {
      return null;
    }

    // Phase 3: キャッシュキー生成
    const cacheKey = buildCacheKey(endpoint, params);
    const ttlSeconds = getCacheTTL(params);
    
    // Step 2-4: EMERGENCY判定指標のキャッシュバイパス
    // skipCache=true でも「エラー時はキャッシュへフォールバック」できるようにする（プラン失効/一時制限の耐性）
    const allowCacheFallbackOnError =
      options.allowCacheFallbackOnError === false ? false : true; // default true
    const cachedForFallback = allowCacheFallbackOnError ? await getKVCache(cacheKey) : null;

    // skipCacheオプションがtrueの場合は事前キャッシュヒットでは返さない（常に最新を取りに行く）
    if (!options.skipCache) {
      const cached = await getCacheWithStaleRevalidate(cacheKey, ttlSeconds);
      if (cached) return cached;
    } else {
      console.log(`[CQ Client] Cache bypassed for EMERGENCY indicators: ${endpoint}`);
    }

    const url = new URL(`${BASE_URL}${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    // Phase 3: 分散レート制限（キュー + トークンバケットで制御）
    const queue = await getRateLimitQueue();
    const data = await queue(async () => {
      // トークンバケットでレート制限チェック
      const canProceed = await checkTokenBucket();
      if (!canProceed) {
        // レート制限超過の場合は待機
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3秒待機
        // 再チェック
        const retryCanProceed = await checkTokenBucket();
        if (!retryCanProceed) {
          throw new Error('Rate limit exceeded');
        }
      }
      
      console.log(`🌐 Fetching: ${url.toString()}`);
      
      try {
        // Node.js標準のfetchを使用 (require不要)
        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
          if (response.status === 404) {
            // つなぎ運用: 404（プラン/権限/カタログ差分）時は、KVキャッシュがあればそれを返す
            if (cachedForFallback) {
              console.warn(`[CQ Client] 404 Not Found: ${endpoint} — using cached value (fallback)`);
              return cachedForFallback;
            }
            console.warn(`[CQ Client] 404 Not Found: ${endpoint} — returning null (fallback)`);
            return null;
          }
          if (response.status === 403) {
            // 403（権限不足）もキャッシュフォールバック
            if (cachedForFallback) {
              console.warn(`[CQ Client] 403 Forbidden: ${endpoint} — using cached value (fallback)`);
              return cachedForFallback;
            }
            return null;
          }
          if (response.status === 400) {
            let body = null;
            try {
              const text = await response.text();
              try { body = JSON.parse(text); } catch { body = text; }
            } catch (_) {}
            console.log("[CQ] CQ_ERROR", { status: 400, body, endpoint });
            return null;
          }
          let body = null;
          try {
            const text = await response.text();
            try { body = JSON.parse(text); } catch { body = text; }
          } catch (_) {}
          console.log("[CQ] CQ_ERROR", { status: response.status, body, endpoint });
          return null;
        }

        const data = await response.json();
        
        // Phase 3: キャッシュに保存
        await setKVCache(cacheKey, data, ttlSeconds);
        
        return data;

      } catch (error) {
        if (error.message && String(error.message).includes("404")) {
          if (cachedForFallback) {
            console.warn(`[CQ Client] 404 for ${endpoint} — using cached value (fallback)`);
            return cachedForFallback;
          }
          console.warn(`[CQ Client] 404 for ${endpoint}:`, error.message);
          return null;
        }
        // ネットワーク例外などもキャッシュフォールバック
        if (cachedForFallback) {
          console.warn(`[CQ Client] Exception for ${endpoint} — using cached value (fallback):`, error?.message || String(error));
          return cachedForFallback;
        }
        const m = error.message && String(error.message).match(/API Error: (\d+)/);
        const status = m ? m[1] : null;
        console.log("[CQ] CQ_ERROR", { status: status || "exception", body: error?.message || String(error), endpoint });
        return null;
      }
    });

    if (data === null) return null;
    return data;
}

// Multi-Asset: schema-based call
let _schema = null;
function loadSchema() {
  if (_schema) return _schema;
  try {
    const path = require('path');
    const schemaPath = path.join(__dirname, '../../data/cryptoquant/schema.json');
    _schema = require(schemaPath);
    return _schema;
  } catch (e) {
    console.warn('[CQ Client] Schema not loaded:', e.message);
    return null;
  }
}

const ASSET_SCHEMA_KEY = { BTC: 'Bitcoin', ETH: 'Ethereum', XRP: 'Xrp', TRX: 'TRX', STABLECOIN: 'Stablecoin', ERC20: 'ERC20', ALT: 'Alt' };

/**
 * Call CQ endpoint by category (asset), group, and endpoint name (from schema.json)
 * @param {string} category - Asset: BTC, ETH, XRP, TRX, STABLECOIN, ERC20, Alt
 * @param {string} group - Category: Exchange-Flows, Flow-Indicator, Market-Indicator, etc.
 * @param {string} endpointName - e.g. netflow, mpi, exchange_whale_ratio
 * @param {Object} params - Override default params (window, limit, exchange)
 * @param {Object} options - { skipCache }
 * @returns {Promise<any|null>}
 */
async function callCQ(category, group, endpointName, params = {}, options = {}) {
  const schema = loadSchema();
  if (!schema) return fetchCryptoQuant(`/${category.toLowerCase()}/${String(group).toLowerCase().replace(/_/g, '-')}/${String(endpointName).replace(/_/g, '-')}`, { ...params, window: params.window || 'day', limit: params.limit || 100 }, options);

  const assetKey = ASSET_SCHEMA_KEY[String(category).toUpperCase()] || (category.charAt(0).toUpperCase() + category.slice(1).toLowerCase());
  const cat = schema[assetKey];
  if (!cat) return null;

  const endpoints = cat[group];
  if (!endpoints || !Array.isArray(endpoints)) return null;

  const nameNorm = String(endpointName || '').replace(/-/g, '_').toLowerCase();
  const ep = endpoints.find((e) => (e.name || '').replace(/-/g, '_').toLowerCase() === nameNorm);
  if (!ep) return null;

  const pathStr = (ep.path || '').replace(/^\/v1/, '') || `/${category.toLowerCase()}/${String(group).toLowerCase().replace(/_/g, '-')}/${(ep.name || '').replace(/_/g, '-')}`;
  const mergedParams = { ...(ep.params || {}), ...params };
  return fetchCryptoQuant(pathStr, mergedParams, options);
}

module.exports = { fetchCryptoQuant, callCQ, loadSchema };
