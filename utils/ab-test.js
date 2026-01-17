// utils/ab-test.js
// A/Bテストツール
// Grok CSO+CFO推奨: A/Bテストツール導入

const { kv } = require('@vercel/kv');

const AB_TEST_PREFIX = 'abtest:vsl';
const DEFAULT_SPLIT = 0.5; // 50/50分割

/**
 * A/Bテストのバリアントを決定
 * @param {string} testName - テスト名（例: 'vsl1-message', 'vsl2-cta'）
 * @param {string} userId - ユーザーID（chatIdなど）
 * @param {Array<string>} variants - バリアント名の配列（例: ['A', 'B']）
 * @param {Object} options - オプション
 * @param {number} options.split - 分割比率（デフォルト: 0.5 = 50/50）
 * @returns {Promise<string>} 選択されたバリアント名
 */
async function getVariant(testName, userId, variants = ['A', 'B'], options = {}) {
  const { split = DEFAULT_SPLIT } = options;
  
  try {
    if (!kv) {
      // KVが利用できない場合は、ユーザーIDのハッシュで決定
      return getVariantByHash(userId, variants, split);
    }

    const testKey = `${AB_TEST_PREFIX}:${testName}:${userId}`;
    
    // 既に割り当てられている場合はそれを返す
    const existingVariant = await kv.get(testKey);
    if (existingVariant && variants.includes(existingVariant)) {
      return existingVariant;
    }
    
    // 新規割り当て: ユーザーIDのハッシュで決定
    const variant = getVariantByHash(userId, variants, split);
    
    // KVに保存（30日間TTL）
    await kv.set(testKey, variant, { ex: 30 * 24 * 60 * 60 });
    
    return variant;
  } catch (error) {
    console.warn(`[AB Test] Failed to get variant, using hash: ${error.message}`);
    return getVariantByHash(userId, variants, split);
  }
}

/**
 * ユーザーIDのハッシュでバリアントを決定
 * @param {string} userId - ユーザーID
 * @param {Array<string>} variants - バリアント名の配列
 * @param {number} split - 分割比率
 * @returns {string} 選択されたバリアント名
 */
function getVariantByHash(userId, variants, split) {
  // 簡易ハッシュ関数
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit整数に変換
  }
  
  // ハッシュ値を0-1の範囲に正規化
  const normalized = Math.abs(hash) / 2147483647;
  
  // 分割比率に基づいてバリアントを決定
  if (variants.length === 2) {
    return normalized < split ? variants[0] : variants[1];
  }
  
  // 複数バリアントの場合、均等分割
  const index = Math.floor(normalized * variants.length);
  return variants[Math.min(index, variants.length - 1)];
}

/**
 * A/Bテストの結果を記録
 * @param {string} testName - テスト名
 * @param {string} variant - バリアント名
 * @param {string} eventType - イベントタイプ（'impression', 'click', 'conversion'など）
 * @param {Object} metadata - 追加メタデータ（オプション）
 */
async function recordABTestEvent(testName, variant, eventType, metadata = {}) {
  try {
    if (!kv) {
      console.warn('[AB Test] KV not available, event not recorded');
      return;
    }

    const eventKey = `${AB_TEST_PREFIX}:${testName}:${variant}:${eventType}`;
    const timestamp = new Date().toISOString();
    
    // イベントカウントをインクリメント
    const count = await kv.incr(`${eventKey}:count`) || 1;
    
    // イベントログを保存（最新100件まで）
    const logKey = `${eventKey}:logs`;
    const event = {
      timestamp,
      metadata,
    };
    await kv.lpush(logKey, JSON.stringify(event));
    await kv.ltrim(logKey, 0, 99); // 最新100件のみ保持
    
    console.log(`[AB Test] Event recorded: ${testName}/${variant}/${eventType} (count: ${count})`);
  } catch (error) {
    console.warn(`[AB Test] Failed to record event: ${error.message}`);
  }
}

/**
 * A/Bテストの結果を取得
 * @param {string} testName - テスト名
 * @param {Array<string>} variants - バリアント名の配列
 * @returns {Promise<Object>} テスト結果
 */
async function getABTestResults(testName, variants = ['A', 'B']) {
  try {
    if (!kv) {
      return {
        testName,
        variants: variants.reduce((acc, v) => {
          acc[v] = { impressions: 0, clicks: 0, conversions: 0, ctr: 0, conversionRate: 0 };
          return acc;
        }, {}),
      };
    }

    const results = {};
    
    for (const variant of variants) {
      const impressions = parseInt(await kv.get(`${AB_TEST_PREFIX}:${testName}:${variant}:impression:count`) || '0', 10);
      const clicks = parseInt(await kv.get(`${AB_TEST_PREFIX}:${testName}:${variant}:click:count`) || '0', 10);
      const conversions = parseInt(await kv.get(`${AB_TEST_PREFIX}:${testName}:${variant}:conversion:count`) || '0', 10);
      
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
      
      results[variant] = {
        impressions,
        clicks,
        conversions,
        ctr: Math.round(ctr * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
      };
    }
    
    return {
      testName,
      variants: results,
    };
  } catch (error) {
    console.error(`[AB Test] Failed to get results: ${error.message}`);
    return {
      testName,
      variants: variants.reduce((acc, v) => {
        acc[v] = { impressions: 0, clicks: 0, conversions: 0, ctr: 0, conversionRate: 0 };
        return acc;
      }, {}),
    };
  }
}

module.exports = {
  getVariant,
  recordABTestEvent,
  getABTestResults,
};
