// utils/kv.js
// シームレスなKVアクセスユーティリティ
// Redis.fromEnv()のような使い勝手を提供

let kvInstance = null;
let kvInitialized = false;

/**
 * KVインスタンスを初期化（シングルトンパターン）
 * 環境変数から自動的に設定を読み込む
 * 
 * @returns {Object|null} KVインスタンス（利用不可の場合はnull）
 */
function initKV() {
  if (kvInitialized) {
    return kvInstance;
  }

  kvInitialized = true;

  try {
    // @vercel/kvを試す（Vercel環境で自動的に環境変数が設定される）
    const kvModule = require('@vercel/kv');
    kvInstance = kvModule.kv;
    
    // 環境変数が設定されているか確認
    if (!process.env.KV_REST_API_URL && !process.env.KV_URL) {
      console.warn('[KV] KV環境変数が設定されていません（KV_REST_API_URL または KV_URL）');
      // インスタンスはnullのまま（フォールバック動作）
      kvInstance = null;
    } else {
      console.log('[KV] ✅ KVインスタンス初期化成功（@vercel/kv）');
    }
  } catch (error) {
    console.warn('[KV] @vercel/kv not available:', error.message);
    kvInstance = null;
  }

  return kvInstance;
}

/**
 * KVインスタンスを取得（シームレスアクセス）
 * Redis.fromEnv()のような使い勝手
 * 
 * @returns {Object|null} KVインスタンス
 */
function getKV() {
  if (!kvInitialized) {
    return initKV();
  }
  return kvInstance;
}

/**
 * KVが利用可能かチェック
 * 
 * @returns {boolean} KVが利用可能な場合true
 */
function isKVAvailable() {
  const kv = getKV();
  return kv !== null;
}

/**
 * KV接続をテスト
 * 
 * @returns {Promise<boolean>} 接続成功時true
 */
async function testKVConnection() {
  try {
    const kv = getKV();
    if (!kv) {
      return false;
    }

    // テストキーで接続確認
    const testKey = '__kv_connection_test__';
    await kv.set(testKey, 'test', { ex: 1 }); // 1秒TTL
    await kv.get(testKey);
    await kv.del(testKey);
    
    return true;
  } catch (error) {
    console.error('[KV] Connection test failed:', error.message);
    return false;
  }
}

/**
 * KV操作のラッパー（エラーハンドリング付き）
 */
const kv = {
  /**
   * 値を取得
   * @param {string} key - キー
   * @returns {Promise<any>} 値（存在しない場合はnull）
   */
  async get(key) {
    const instance = getKV();
    if (!instance) {
      console.warn(`[KV] KV not available, get('${key}') skipped`);
      return null;
    }
    try {
      return await instance.get(key);
    } catch (error) {
      console.error(`[KV] Error getting '${key}':`, error.message);
      return null;
    }
  },

  /**
   * 値を設定
   * @param {string} key - キー
   * @param {any} value - 値
   * @param {Object} options - オプション（ex: TTL秒数など）
   * @returns {Promise<boolean>} 成功時true
   */
  async set(key, value, options = {}) {
    const instance = getKV();
    if (!instance) {
      console.warn(`[KV] KV not available, set('${key}') skipped`);
      return false;
    }
    try {
      await instance.set(key, value, options);
      return true;
    } catch (error) {
      console.error(`[KV] Error setting '${key}':`, error.message);
      return false;
    }
  },

  /**
   * 値を削除
   * @param {string} key - キー
   * @returns {Promise<boolean>} 成功時true
   */
  async del(key) {
    const instance = getKV();
    if (!instance) {
      console.warn(`[KV] KV not available, del('${key}') skipped`);
      return false;
    }
    try {
      await instance.del(key);
      return true;
    } catch (error) {
      console.error(`[KV] Error deleting '${key}':`, error.message);
      return false;
    }
  },

  /**
   * 値をインクリメント
   * @param {string} key - キー
   * @param {number} amount - インクリメント量（デフォルト: 1）
   * @returns {Promise<number|null>} インクリメント後の値（失敗時null）
   */
  async incr(key, amount = 1) {
    const instance = getKV();
    if (!instance) {
      console.warn(`[KV] KV not available, incr('${key}') skipped`);
      return null;
    }
    try {
      // @vercel/kvのincrメソッドは引数を1つしか受け付けない
      // 複数回呼び出してamount分インクリメント
      if (typeof instance.incr === 'function') {
        let result = null;
        for (let i = 0; i < amount; i++) {
          result = await instance.incr(key);
        }
        return result;
      }
      // フォールバック: get → set
      const current = (await instance.get(key)) || 0;
      const newValue = Number(current) + amount;
      await instance.set(key, newValue);
      return newValue;
    } catch (error) {
      console.error(`[KV] Error incrementing '${key}':`, error.message);
      return null;
    }
  },

  /**
   * キーの存在確認
   * @param {string} key - キー
   * @returns {Promise<boolean>} 存在する場合true
   */
  async exists(key) {
    const instance = getKV();
    if (!instance) {
      return false;
    }
    try {
      const value = await instance.get(key);
      return value !== null;
    } catch (error) {
      console.error(`[KV] Error checking existence of '${key}':`, error.message);
      return false;
    }
  },

  /**
   * キーのTTLを取得
   * @param {string} key - キー
   * @returns {Promise<number|null>} TTL秒数（存在しない場合null）
   */
  async ttl(key) {
    const instance = getKV();
    if (!instance) {
      return null;
    }
    try {
      // @vercel/kvのttlメソッドが存在するか確認
      if (typeof instance.ttl === 'function') {
        return await instance.ttl(key);
      }
      // フォールバック: 存在確認のみ
      const exists = await this.exists(key);
      return exists ? -1 : null; // -1は永続キーを意味
    } catch (error) {
      console.error(`[KV] Error getting TTL for '${key}':`, error.message);
      return null;
    }
  },

  /**
   * 生のKVインスタンスを取得（高度な操作が必要な場合）
   * @returns {Object|null} KVインスタンス
   */
  getInstance() {
    return getKV();
  }
};

// 初期化を実行
initKV();

module.exports = {
  kv,
  getKV,
  isKVAvailable,
  testKVConnection,
  // 後方互換性: 直接kvをエクスポート
  ...kv
};
