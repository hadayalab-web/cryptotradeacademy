// services/free-users/manager.js
// 無料版ユーザー管理システム（参加日時・VSL2送信済みフラグ管理）
// Vercel KV対応（永続化）

const fs = require('fs');
const path = require('path');

// 無料版ユーザーリストの保存先（フォールバック用）
const FREE_USERS_FILE = path.join(__dirname, '../../data/free-users.json');

// Vercel KVストレージ（優先）
let kvStorage = null;
try {
  kvStorage = require('./kv-storage');
} catch (error) {
  console.warn('[FreeUsers] KV storage not available, using file storage:', error.message);
}

// ストレージタイプを判定（KVが利用可能かどうか）
const USE_KV = kvStorage && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

/**
 * 無料版ユーザーリストを読み込む
 * @returns {Promise<Array<Object>>|Array<Object>} ユーザーオブジェクトの配列 {chatId, joinedAt, vsl2Sent}
 */
async function loadFreeUsers() {
  // Vercel KVが利用可能な場合はKVから読み込む
  if (USE_KV && kvStorage) {
    try {
      return await kvStorage.loadFreeUsers();
    } catch (error) {
      console.error('[FreeUsers] KV load failed, falling back to file storage:', error.message);
      // フォールバック: ファイルストレージにフォールバック
    }
  }

  // フォールバック: ファイルストレージ
  try {
    if (fs.existsSync(FREE_USERS_FILE)) {
      const data = fs.readFileSync(FREE_USERS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      
      // 後方互換性: 配列が文字列の場合は旧形式
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
        // 旧形式を新形式に変換
        return parsed.map(chatId => ({
          chatId,
          joinedAt: new Date().toISOString(), // 既存ユーザーは現在時刻を設定
          vsl2Sent: false,
          vsl2LastCallSent: false
        }));
      }
      
      // 後方互換性: オブジェクト配列だがvsl2LastCallSentが未定義の場合
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(user => {
          if (typeof user === 'object' && user.vsl2LastCallSent === undefined) {
            return {
              ...user,
              vsl2LastCallSent: false
            };
          }
          return user;
        });
      }
      
      // 新形式（オブジェクト配列）
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch (error) {
    console.error('[FreeUsers] Error loading free users:', error.message);
    return [];
  }
  }
}

/**
 * 無料版ユーザーリストを保存する
 * @param {Array<Object>} users - ユーザーオブジェクトの配列
 * @returns {Promise<Array<Object>>|Array<Object>} 保存されたユーザー配列
 */
async function saveFreeUsers(users) {
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
        vsl2LastCallSent: false
      } : user);
    }
  }

  // Vercel KVが利用可能な場合はKVに保存
  if (USE_KV && kvStorage) {
    try {
      return await kvStorage.saveFreeUsers(uniqueUsers);
    } catch (error) {
      console.error('[FreeUsers] KV save failed, falling back to file storage:', error.message);
      // フォールバック: ファイルストレージにフォールバック
    }
  }

  // フォールバック: ファイルストレージ
  try {
    // ディレクトリが存在しない場合は作成
    const dir = path.dirname(FREE_USERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(FREE_USERS_FILE, JSON.stringify(uniqueUsers, null, 2), 'utf8');
    console.log(`[FreeUsers] Saved ${uniqueUsers.length} free users to file`);
    return uniqueUsers;
  } catch (error) {
    console.error('[FreeUsers] Error saving free users:', error.message);
    throw error;
  }
}

/**
 * 無料版ユーザーを追加する
 * @param {string} chatId - TelegramチャットID
 * @param {string} userName - ユーザー名（オプション）
 * @returns {Promise<boolean>} 追加に成功したかどうか（新規ユーザーの場合true）
 */
async function addFreeUser(chatId, userName = null) {
  if (!chatId) {
    console.warn('[FreeUsers] Invalid chatId:', chatId);
    return false;
  }
  
  const users = await loadFreeUsers();
  const existingUserIndex = users.findIndex(u => (typeof u === 'string' ? u : u.chatId) === chatId);
  
  if (existingUserIndex === -1) {
    // 新規ユーザーを追加
      users.push({
        chatId,
        joinedAt: new Date().toISOString(),
        vsl2Sent: false,
        vsl2LastCallSent: false,
        userName: userName || null
      });
    await saveFreeUsers(users);
    console.log(`[FreeUsers] Added free user: ${chatId} (joinedAt: ${new Date().toISOString()})`);
    return true;
  } else {
    // 既存ユーザーの場合、joinedAtは更新しない（初回参加日時を保持）
    console.log(`[FreeUsers] User already exists: ${chatId}`);
    return false;
  }
}

/**
 * 無料版ユーザーを削除する（有料版にアップグレードした場合など）
 * @param {string} chatId - TelegramチャットID
 * @returns {Promise<boolean>} 削除に成功したかどうか
 */
async function removeFreeUser(chatId) {
  if (!chatId) {
    return false;
  }
  
  const users = await loadFreeUsers();
  const index = users.findIndex(u => (typeof u === 'string' ? u : u.chatId) === chatId);
  if (index !== -1) {
    users.splice(index, 1);
    await saveFreeUsers(users);
    console.log(`[FreeUsers] Removed free user: ${chatId}`);
    return true;
  }
  return false;
}

/**
 * 無料版ユーザーかどうかを確認する
 * @param {string} chatId - TelegramチャットID
 * @returns {Promise<boolean>}
 */
async function isFreeUser(chatId) {
  if (!chatId) {
    return false;
  }
  const users = await loadFreeUsers();
  return users.some(u => (typeof u === 'string' ? u : u.chatId) === chatId);
}

/**
 * 無料版ユーザーの総数を取得する
 * @returns {Promise<number>}
 */
async function getFreeUserCount() {
  const users = await loadFreeUsers();
  return users.length;
}

/**
 * 24時間経過した無料版ユーザーを取得（VSL2未送信）
 * Gemini CMO提案: 48時間→24時間に短縮（ユーザーの熱量が高いうちにアプローチ）
 * @returns {Promise<Array<Object>>} {chatId, joinedAt, userName}
 */
async function getFreeUsersForVSL2() {
  const users = await loadFreeUsers();
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 48時間→24時間に変更
  
  return users
    .filter(user => {
      const userObj = typeof user === 'string' ? {
        chatId: user,
        joinedAt: new Date(0).toISOString(), // 旧形式は0時点
        vsl2Sent: false
      } : user;
      
      const joinedAt = new Date(userObj.joinedAt);
      const is24HoursPassed = joinedAt <= twentyFourHoursAgo; // 48時間→24時間に変更
      const isNotSent = !userObj.vsl2Sent;
      
      return is24HoursPassed && isNotSent;
    })
    .map(user => {
      const userObj = typeof user === 'string' ? {
        chatId: user,
        joinedAt: new Date(0).toISOString(),
        vsl2Sent: false
      } : user;
      
      return {
        chatId: userObj.chatId,
        joinedAt: userObj.joinedAt,
        userName: userObj.userName || null
      };
    });
}

/**
 * 12-24時間経過した無料版ユーザーを取得（VSL1リマインド対象）
 * Gemini CMO提案: 12時間後にリマインドメッセージを送信
 * @returns {Promise<Array<Object>>} {chatId, joinedAt, userName}
 */
async function getFreeUsersForVSL1Reminder() {
  const users = await loadFreeUsers();
  const now = new Date();
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  return users
    .filter(user => {
      const userObj = typeof user === 'string' ? {
        chatId: user,
        joinedAt: new Date(0).toISOString(),
        vsl2Sent: false
      } : user;
      
      const joinedAt = new Date(userObj.joinedAt);
      // 12時間以上経過、かつ24時間未満（VSL2送信前）
      const is12HoursPassed = joinedAt <= twelveHoursAgo;
      const isLessThan24Hours = joinedAt > twentyFourHoursAgo;
      const isNotSent = !userObj.vsl2Sent;
      
      return is12HoursPassed && isLessThan24Hours && isNotSent;
    })
    .map(user => {
      const userObj = typeof user === 'string' ? {
        chatId: user,
        joinedAt: new Date(0).toISOString(),
        vsl2Sent: false
      } : user;
      
      return {
        chatId: userObj.chatId,
        joinedAt: userObj.joinedAt,
        userName: userObj.userName || null
      };
    });
}

/**
 * 22時間経過した無料版ユーザーを取得（VSL2 Last Call対象）
 * Gemini CMO提案: 24時間経過の2時間前（22時間後）に通知を送信
 * @returns {Promise<Array<Object>>} {chatId, joinedAt, userName}
 */
async function getFreeUsersForVSL2LastCall() {
  const users = await loadFreeUsers();
  const now = new Date();
  const twentyTwoHoursAgo = new Date(now.getTime() - 22 * 60 * 60 * 1000); // 22時間前
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24時間前
  
  return users
    .filter(user => {
      const userObj = typeof user === 'string' ? {
        chatId: user,
        joinedAt: new Date(0).toISOString(),
        vsl2Sent: false,
        vsl2LastCallSent: false
      } : user;
      
      const joinedAt = new Date(userObj.joinedAt);
      // 22時間以上経過、かつ24時間未満（VSL2送信前、Last Call対象）
      const is22HoursPassed = joinedAt <= twentyTwoHoursAgo;
      const isLessThan24Hours = joinedAt > twentyFourHoursAgo;
      const isNotSent = !userObj.vsl2Sent;
      const isLastCallNotSent = !userObj.vsl2LastCallSent; // Last Call未送信
      
      return is22HoursPassed && isLessThan24Hours && isNotSent && isLastCallNotSent;
    })
    .map(user => {
      const userObj = typeof user === 'string' ? {
        chatId: user,
        joinedAt: new Date(0).toISOString(),
        vsl2Sent: false,
        vsl2LastCallSent: false
      } : user;
      
      return {
        chatId: userObj.chatId,
        joinedAt: userObj.joinedAt,
        userName: userObj.userName || null
      };
    });
}

/**
 * VSL2送信済みフラグを設定
 * @param {string} chatId - TelegramチャットID
 * @returns {Promise<boolean>} 更新に成功したかどうか
 */
async function markVSL2Sent(chatId) {
  if (!chatId) {
    return false;
  }
  
  const users = await loadFreeUsers();
  const userIndex = users.findIndex(u => (typeof u === 'string' ? u : u.chatId) === chatId);
  
  if (userIndex !== -1) {
    const user = users[userIndex];
    if (typeof user === 'string') {
      users[userIndex] = {
        chatId: user,
        joinedAt: new Date().toISOString(),
        vsl2Sent: true,
        vsl2LastCallSent: false
      };
    } else {
      users[userIndex].vsl2Sent = true;
      // vsl2LastCallSentが未定義の場合はfalseを設定（後方互換性）
      if (users[userIndex].vsl2LastCallSent === undefined) {
        users[userIndex].vsl2LastCallSent = false;
      }
    }
    await saveFreeUsers(users);
    console.log(`[FreeUsers] Marked VSL2 sent for user: ${chatId}`);
    return true;
  }
  
  return false;
}

/**
 * VSL2 Last Call送信済みフラグを設定
 * Gemini CMO提案: Last Call送信済みフラグを管理
 * @param {string} chatId - TelegramチャットID
 * @returns {Promise<boolean>} 更新に成功したかどうか
 */
async function markVSL2LastCallSent(chatId) {
  if (!chatId) {
    return false;
  }
  
  const users = await loadFreeUsers();
  const userIndex = users.findIndex(u => (typeof u === 'string' ? u : u.chatId) === chatId);
  
  if (userIndex !== -1) {
    const user = users[userIndex];
    if (typeof user === 'string') {
      users[userIndex] = {
        chatId: user,
        joinedAt: new Date().toISOString(),
        vsl2Sent: false,
        vsl2LastCallSent: true
      };
    } else {
      users[userIndex].vsl2LastCallSent = true;
      // vsl2Sentが未定義の場合はfalseを設定（後方互換性）
      if (users[userIndex].vsl2Sent === undefined) {
        users[userIndex].vsl2Sent = false;
      }
    }
    await saveFreeUsers(users);
    console.log(`[FreeUsers] Marked VSL2 Last Call sent for user: ${chatId}`);
    return true;
  }
  
  return false;
}

module.exports = {
  loadFreeUsers,
  saveFreeUsers,
  addFreeUser,
  removeFreeUser,
  isFreeUser,
  getFreeUserCount,
  getFreeUsersForVSL2,
  getFreeUsersForVSL1Reminder,
  getFreeUsersForVSL2LastCall,
  markVSL2Sent,
  markVSL2LastCallSent,
};
