// services/free-users/manager.js
// 無料版ユーザー管理システム（シンプルなTelegramチャットIDリスト管理）

const fs = require('fs');
const path = require('path');

// 無料版ユーザーリストの保存先
const FREE_USERS_FILE = path.join(__dirname, '../../data/free-users.json');

/**
 * 無料版ユーザーリストを読み込む
 * @returns {Array<string>} TelegramチャットIDの配列
 */
function loadFreeUsers() {
  try {
    if (fs.existsSync(FREE_USERS_FILE)) {
      const data = fs.readFileSync(FREE_USERS_FILE, 'utf8');
      const users = JSON.parse(data);
      return Array.isArray(users) ? users : [];
    }
    return [];
  } catch (error) {
    console.error('[FreeUsers] Error loading free users:', error.message);
    return [];
  }
}

/**
 * 無料版ユーザーリストを保存する
 * @param {Array<string>} users - TelegramチャットIDの配列
 */
function saveFreeUsers(users) {
  try {
    // ディレクトリが存在しない場合は作成
    const dir = path.dirname(FREE_USERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // 重複を除去して保存
    const uniqueUsers = [...new Set(users)];
    fs.writeFileSync(FREE_USERS_FILE, JSON.stringify(uniqueUsers, null, 2), 'utf8');
    console.log(`[FreeUsers] Saved ${uniqueUsers.length} free users`);
    return uniqueUsers;
  } catch (error) {
    console.error('[FreeUsers] Error saving free users:', error.message);
    throw error;
  }
}

/**
 * 無料版ユーザーを追加する
 * @param {string} chatId - TelegramチャットID
 * @returns {boolean} 追加に成功したかどうか
 */
function addFreeUser(chatId) {
  if (!chatId) {
    console.warn('[FreeUsers] Invalid chatId:', chatId);
    return false;
  }
  
  const users = loadFreeUsers();
  if (!users.includes(chatId)) {
    users.push(chatId);
    saveFreeUsers(users);
    console.log(`[FreeUsers] Added free user: ${chatId}`);
    return true;
  }
  console.log(`[FreeUsers] User already exists: ${chatId}`);
  return false;
}

/**
 * 無料版ユーザーを削除する（有料版にアップグレードした場合など）
 * @param {string} chatId - TelegramチャットID
 * @returns {boolean} 削除に成功したかどうか
 */
function removeFreeUser(chatId) {
  if (!chatId) {
    return false;
  }
  
  const users = loadFreeUsers();
  const index = users.indexOf(chatId);
  if (index !== -1) {
    users.splice(index, 1);
    saveFreeUsers(users);
    console.log(`[FreeUsers] Removed free user: ${chatId}`);
    return true;
  }
  return false;
}

/**
 * 無料版ユーザーかどうかを確認する
 * @param {string} chatId - TelegramチャットID
 * @returns {boolean}
 */
function isFreeUser(chatId) {
  if (!chatId) {
    return false;
  }
  const users = loadFreeUsers();
  return users.includes(chatId);
}

/**
 * 無料版ユーザーの総数を取得する
 * @returns {number}
 */
function getFreeUserCount() {
  return loadFreeUsers().length;
}

module.exports = {
  loadFreeUsers,
  saveFreeUsers,
  addFreeUser,
  removeFreeUser,
  isFreeUser,
  getFreeUserCount,
};
