// services/lead-discovery/duplicatePrevention.js
// 重複送信防止システム

const { kv } = require('@vercel/kv');

const SENT_KEY_PREFIX = 'vsl1:sent';
const TTL_DAYS = 7; // 7日間保持

/**
 * リードにVSL1が送信済みかチェック
 * @param {Object} lead - リード情報
 * @returns {Promise<boolean>} 送信済みの場合true
 */
async function hasSentVSL1(lead) {
  if (!kv || !lead) return false;

  try {
    // リードの一意キーを生成
    const key = generateSentKey(lead);
    const sent = await kv.get(key);
    return !!sent;
  } catch (error) {
    console.warn('[Duplicate Prevention] Failed to check sent status:', error.message);
    // エラー時は送信済みとみなさない（安全側に倒す）
    return false;
  }
}

/**
 * VSL1送信済みをマーク
 * @param {Object} lead - リード情報
 * @returns {Promise<void>}
 */
async function markVSL1Sent(lead) {
  if (!kv || !lead) return;

  try {
    const key = generateSentKey(lead);
    const ttlSeconds = TTL_DAYS * 24 * 60 * 60;
    await kv.set(key, '1', { ex: ttlSeconds });
    console.log(`[Duplicate Prevention] Marked VSL1 as sent: ${key}`);
  } catch (error) {
    console.warn('[Duplicate Prevention] Failed to mark VSL1 as sent:', error.message);
  }
}

/**
 * リードの一意キーを生成
 * @param {Object} lead - リード情報
 * @returns {string} KVキー
 */
function generateSentKey(lead) {
  // tweetIdがある場合はtweetIdを使用（Xリード）
  if (lead.tweetId) {
    return `${SENT_KEY_PREFIX}:tweet:${lead.tweetId}`;
  }
  
  // userIdがある場合はuserIdを使用（Telegramリード）
  if (lead.userId) {
    return `${SENT_KEY_PREFIX}:user:${lead.userId}`;
  }
  
  // フォールバック: username + timestamp
  const timestamp = lead.timestamp || Date.now();
  return `${SENT_KEY_PREFIX}:fallback:${lead.username || 'unknown'}:${timestamp}`;
}

module.exports = {
  hasSentVSL1,
  markVSL1Sent,
};
