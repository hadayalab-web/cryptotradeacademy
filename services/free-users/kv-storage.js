// services/free-users/kv-storage.js
// Vercel KVを使用した無料版ユーザー管理（永続化対応）

let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[FreeUsers KV] @vercel/kv not available:', error.message);
}

const FREE_USERS_KEY = 'free_users';

/**
 * 無料版ユーザーリストをKVから読み込む
 * @returns {Promise<Array<Object>>} ユーザーオブジェクトの配列 {chatId, joinedAt, vsl2Sent, vsl2LastCallSent, userName}
 */
async function loadFreeUsers() {
  try {
    // Vercel KVが利用可能かチェック
    if (!kv) {
      console.warn('[FreeUsers KV] Vercel KV not available, falling back to file storage');
      return [];
    }

    const users = await kv.get(FREE_USERS_KEY);
    
    if (!users) {
      return [];
    }

    // 後方互換性: 配列が文字列の場合は旧形式
    if (Array.isArray(users) && users.length > 0 && typeof users[0] === 'string') {
      // 旧形式を新形式に変換
      return users.map(chatId => ({
        chatId,
        joinedAt: new Date().toISOString(),
        vsl2Sent: false,
        vsl2LastCallSent: false,
        userName: null
      }));
    }

    // 後方互換性: オブジェクト配列だがvsl2LastCallSentが未定義の場合
    if (Array.isArray(users) && users.length > 0) {
      return users.map(user => {
        if (typeof user === 'object' && user.vsl2LastCallSent === undefined) {
          return {
            ...user,
            vsl2LastCallSent: false
          };
        }
        return user;
      });
    }

    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.error('[FreeUsers KV] Error loading free users:', error.message);
    // エラー時は空配列を返す（フォールバック）
    return [];
  }
}

/**
 * 無料版ユーザーリストをKVに保存する
 * @param {Array<Object>} users - ユーザーオブジェクトの配列
 * @returns {Promise<Array<Object>>} 保存されたユーザー配列
 */
async function saveFreeUsers(users) {
  try {
    // Vercel KVが利用可能かチェック
    if (!kv) {
      console.warn('[FreeUsers KV] Vercel KV not available, cannot save');
      throw new Error('Vercel KV not available');
    }

    // 重複を除去（chatIdで）
    const uniqueUsers = [];
    const seenChatIds = new Set();
    for (const user of users) {
      const chatId = typeof user === 'string' ? user : user.chatId;
      if (!seenChatIds.has(chatId)) {
        seenChatIds.add(chatId);
        uniqueUsers.push(typeof user === 'string' ? {
          chatId: user,
          joinedAt: new Date().toISOString(),
          vsl2Sent: false,
          vsl2LastCallSent: false,
          userName: null
        } : user);
      }
    }

    // KVに保存
    await kv.set(FREE_USERS_KEY, uniqueUsers);
    console.log(`[FreeUsers KV] Saved ${uniqueUsers.length} free users to KV`);
    return uniqueUsers;
  } catch (error) {
    console.error('[FreeUsers KV] Error saving free users:', error.message);
    throw error;
  }
}

module.exports = {
  loadFreeUsers,
  saveFreeUsers,
};
