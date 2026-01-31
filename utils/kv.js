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
    // 環境変数の確認（詳細ログ）
    const hasRestApiUrl = !!process.env.KV_REST_API_URL;
    const hasKvUrl = !!process.env.KV_URL;
    const hasRestApiToken = !!process.env.KV_REST_API_TOKEN;
    
    console.log('[KV] 🔵 KV初期化開始...');
    console.log('[KV] 環境変数確認:');
    console.log(`[KV]   KV_REST_API_URL: ${hasRestApiUrl ? '✅ 設定済み' : '❌ 未設定'}`);
    console.log(`[KV]   KV_REST_API_TOKEN: ${hasRestApiToken ? '✅ 設定済み' : '❌ 未設定'}`);
    console.log(`[KV]   KV_URL: ${hasKvUrl ? '✅ 設定済み' : '❌ 未設定'}`);
    
    if (!hasRestApiUrl && !hasKvUrl) {
      console.error('[KV] ❌ CRITICAL: KV環境変数が設定されていません');
      console.error('[KV] 💡 以下の環境変数を設定してください:');
      console.error('[KV]   - KV_REST_API_URL または KV_URL');
      console.error('[KV]   - KV_REST_API_TOKEN（KV_REST_API_URL使用時）');
      kvInstance = null;
      return kvInstance;
    }
    
    // @vercel/kvを試す（Vercel環境で自動的に環境変数が設定される）
    const kvModule = require('@vercel/kv');
    kvInstance = kvModule.kv;
    
    if (!kvInstance) {
      console.error('[KV] ❌ CRITICAL: @vercel/kv.kv が null です');
      kvInstance = null;
      return kvInstance;
    }
    
    console.log('[KV] ✅ KVインスタンス初期化成功（@vercel/kv）');
    
    // 接続テスト（初期化時に実行）
    (async () => {
      try {
        const testKey = `__kv_init_test__${Date.now()}`;
        await kvInstance.set(testKey, { test: true }, { ex: 1 });
        const testValue = await kvInstance.get(testKey);
        if (testValue && testValue.test === true) {
          await kvInstance.del(testKey);
          console.log('[KV] ✅ KV接続テスト成功（初期化時）');
        } else {
          console.error('[KV] ⚠️ KV接続テスト警告: 保存した値が取得できません');
        }
      } catch (testError) {
        console.error('[KV] ⚠️ KV接続テスト警告（初期化時）:', testError.message);
        // 接続テスト失敗でも続行（環境変数が後で設定される可能性がある）
      }
    })();
    
  } catch (error) {
    console.error('[KV] ❌ @vercel/kv 初期化エラー:', error.message);
    console.error('[KV] Stack:', error.stack);
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
      console.error(`[KV] ❌ KV not available, set('${key}') failed`);
      console.error(`[KV] 💡 Check KV environment variables: KV_REST_API_URL, KV_REST_API_TOKEN`);
      return false;
    }
    try {
      // CRITICAL: @vercel/kvのsetメソッドはPromise<void>を返す
      await instance.set(key, value, options);
      console.log(`[KV] ✅ Successfully set '${key}' (value type: ${Array.isArray(value) ? `Array[${value.length}]` : typeof value})`);
      return true;
    } catch (error) {
      console.error(`[KV] ❌ Error setting '${key}':`, error.message);
      console.error(`[KV] Stack:`, error.stack);
      console.error(`[KV] Value type:`, Array.isArray(value) ? `Array[${value.length}]` : typeof value);
      if (Array.isArray(value) && value.length > 0) {
        console.error(`[KV] Sample value:`, JSON.stringify(value[0], null, 2));
      }
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
