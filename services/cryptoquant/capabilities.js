// services/cryptoquant/capabilities.js
// Phase 3: CryptoQuant APIエンドポイントの利用可能性チェック（capability check）
// 起動時に一度だけ確認し、結果をキャッシュして以降は機能フラグで制御

const { fetchCryptoQuant } = require('./client');
const { kv } = require('@vercel/kv');

// キャッシュキー
const CAPABILITIES_CACHE_KEY = 'cryptoquant:capabilities';
const CAPABILITIES_CACHE_TTL = 24 * 60 * 60; // 24時間

// チェック対象エンドポイント（現在は空 - 404エンドポイントは削除済み）
// 注意: Liquidations と NUPL は CryptoQuant API で提供されていないため削除
const ENDPOINTS_TO_CHECK = {
  // 将来、新しい404エンドポイントが追加された場合はここに追加
};

// キャッシュされたcapabilities（メモリキャッシュ）
let cachedCapabilities = null;

/**
 * エンドポイントの利用可能性をチェック
 * @param {string} endpoint - エンドポイントパス
 * @param {object} params - パラメータ
 * @returns {Promise<boolean>} 利用可能な場合 true
 */
async function checkEndpointAvailability(endpoint, params = {}) {
  try {
    const data = await fetchCryptoQuant(endpoint, params);
    // 200 OK かつデータが存在する場合、利用可能と判定
    return data && data.result && data.result.data && data.result.data.length > 0;
  } catch (error) {
    // 404エラーまたはデータなしの場合は利用不可
    if (error.message && (error.message.includes('404') || error.message.includes('API Error: 404'))) {
      return false;
    }
    // その他のエラーは一時的なものとみなし、デフォルトでfalseを返す
    console.warn(`[capabilities] Error checking endpoint ${endpoint}:`, error.message);
    return false;
  }
}

/**
 * すべてのエンドポイントの利用可能性をチェック
 * @returns {Promise<Object>} capabilitiesオブジェクト
 */
async function checkAllCapabilities() {
  // 現在、チェック対象のエンドポイントはない（404エンドポイントは削除済み）
  // 将来、新しいエンドポイントが追加された場合はここにチェックロジックを追加
  const capabilities = {};
  return capabilities;
}

/**
 * KVからcapabilitiesを取得
 * @returns {Promise<Object|null>} capabilitiesオブジェクトまたはnull
 */
async function getCapabilitiesFromKV() {
  try {
    if (!kv) return null;
    const cached = await kv.get(CAPABILITIES_CACHE_KEY);
    return cached;
  } catch (error) {
    console.warn('[capabilities] Error reading from KV:', error.message);
    return null;
  }
}

/**
 * KVにcapabilitiesを保存
 * @param {Object} capabilities - capabilitiesオブジェクト
 */
async function saveCapabilitiesToKV(capabilities) {
  try {
    if (!kv) return false;
    await kv.set(CAPABILITIES_CACHE_KEY, capabilities, { ex: CAPABILITIES_CACHE_TTL });
    return true;
  } catch (error) {
    console.warn('[capabilities] Error saving to KV:', error.message);
    return false;
  }
}

/**
 * capabilitiesを取得（キャッシュ優先）
 * @returns {Promise<Object>} capabilitiesオブジェクト
 */
async function getCapabilities() {
  // メモリキャッシュがあればそれを使用
  if (cachedCapabilities) {
    return cachedCapabilities;
  }
  
  // KVキャッシュをチェック
  const kvCapabilities = await getCapabilitiesFromKV();
  if (kvCapabilities) {
    cachedCapabilities = kvCapabilities;
    return kvCapabilities;
  }
  
  // キャッシュがない場合は新規チェック
  const capabilities = await checkAllCapabilities();
  
  // キャッシュに保存
  cachedCapabilities = capabilities;
  await saveCapabilitiesToKV(capabilities);
  
  return capabilities;
}

/**
 * エンドポイントが利用可能かどうかを確認
 * @param {string} endpointKey - ENDPOINTS_TO_CHECKのキー（例: 'LIQUIDATIONS_LONG'）
 * @returns {Promise<boolean>} 利用可能な場合 true
 */
async function isEndpointAvailable(endpointKey) {
  const capabilities = await getCapabilities();
  return capabilities[endpointKey] === true;
}

/**
 * capabilitiesを初期化（起動時に一度だけ呼び出す）
 * @returns {Promise<Object>} capabilitiesオブジェクト
 */
async function initializeCapabilities() {
  console.log('[capabilities] Initializing CryptoQuant endpoint capabilities...');
  const capabilities = await getCapabilities();
  console.log('[capabilities] Capabilities initialized:', capabilities);
  return capabilities;
}

module.exports = {
  getCapabilities,
  isEndpointAvailable,
  initializeCapabilities,
  ENDPOINTS_TO_CHECK,
};
