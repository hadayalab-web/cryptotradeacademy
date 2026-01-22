// services/free-users/manager.js
// 無料版ユーザー管理システム（参加日時・VSL2送信済みフラグ管理）
// Vercel KV対応（永続化）

const fs = require('fs');
const path = require('path');
const { hasTimePassed, isWithinTimeRange } = require('../../utils/timezone');

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
const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

function normalizeLang(value) {
  if (!value) return null;
  const base = String(value).trim().toLowerCase().split('.')[0].replace('_', '-');
  return SUPPORTED_LANGS.includes(base) ? base : null;
}

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
          vsl2LastCallSent: false,
          lang: null,
        }));
      }
      
      // 後方互換性: オブジェクト配列だがvsl2LastCallSentが未定義の場合
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(user => {
          if (typeof user === 'object') {
            return {
              ...user,
              vsl2LastCallSent: user.vsl2LastCallSent ?? false,
              lang: normalizeLang(user.lang) || user.lang || null,
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
        vsl2LastCallSent: false,
        lang: null,
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
 * Grok CSO+CFO推奨: ユニークchatIdチェック強化
 * @param {string} chatId - TelegramチャットID
 * @param {string} userName - ユーザー名（オプション）
 * @param {string} lang - 言語コード（オプション）
 * @param {string} source - ソース（'telegram', 'x_direct', 'x_quote'など、オプション）
 * @returns {Promise<boolean>} 追加に成功したかどうか（新規ユーザーの場合true）
 */
async function addFreeUser(chatId, userName = null, lang = null, source = null) {
  if (!chatId) {
    console.warn('[FreeUsers] Invalid chatId:', chatId);
    return false;
  }

  // chatIdの正規化（文字列として扱う）
  const normalizedChatId = String(chatId).trim();
  if (!normalizedChatId) {
    console.warn('[FreeUsers] Empty chatId after normalization');
    return false;
  }

  const normalizedLang = normalizeLang(lang);
  const users = await loadFreeUsers();
  
  // ユニークチェック: chatIdで厳密に検索（Grok CSO+CFO推奨）
  const existingUserIndex = users.findIndex(u => {
    const userChatId = typeof u === 'string' ? u : (u.chatId ? String(u.chatId).trim() : null);
    return userChatId === normalizedChatId;
  });
  
  if (existingUserIndex === -1) {
    // 新規ユーザーを追加
    users.push({
      chatId: normalizedChatId,
      joinedAt: new Date().toISOString(),
      vsl2Sent: false,
      vsl2LastCallSent: false,
      vsl1ReminderSent: false,
      userName: userName || null,
      lang: normalizedLang,
      source: source || 'telegram', // ソース追跡
    });
    await saveFreeUsers(users);
    console.log(`[FreeUsers] Added free user: ${normalizedChatId} (lang: ${normalizedLang || 'unknown'}, source: ${source || 'telegram'}, joinedAt: ${new Date().toISOString()})`);
    return true;
  } else {
    // 既存ユーザーの場合、joinedAtは更新しない（初回参加日時を保持）
    const existingUser = users[existingUserIndex];
    let updated = false;
    if (typeof existingUser === 'object') {
      // 言語情報の補完（既存ユーザーに言語が無い場合）
      if (normalizedLang && !existingUser.lang) {
        existingUser.lang = normalizedLang;
        updated = true;
        console.log(`[FreeUsers] Updated lang for existing user: ${normalizedChatId} -> ${normalizedLang}`);
      }
      // ユーザー名の補完
      if (userName && !existingUser.userName) {
        existingUser.userName = userName;
        updated = true;
      }
      // ソース情報の補完（既存ユーザーにソースが無い場合）
      if (source && !existingUser.source) {
        existingUser.source = source;
        updated = true;
        console.log(`[FreeUsers] Updated source for existing user: ${normalizedChatId} -> ${source}`);
      }
      // chatIdの正規化（既存データの整合性確保）
      if (existingUser.chatId !== normalizedChatId) {
        existingUser.chatId = normalizedChatId;
        updated = true;
      }
    } else {
      // 旧形式（文字列）を新形式（オブジェクト）に変換
      users[existingUserIndex] = {
        chatId: normalizedChatId,
        joinedAt: new Date().toISOString(),
        vsl2Sent: false,
        vsl2LastCallSent: false,
        vsl1ReminderSent: false,
        userName: userName || null,
        lang: normalizedLang,
        source: source || existingUser.source || 'telegram', // ソース追跡
      };
      updated = true;
    }
    if (updated) {
      await saveFreeUsers(users);
    }
    console.log(`[FreeUsers] User already exists: ${normalizedChatId} (duplicate prevented)`);
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
  
  return users
    .filter(user => {
      const userObj = typeof user === 'string' ? {
        chatId: user,
        joinedAt: new Date(0).toISOString(), // 旧形式は0時点
        vsl2Sent: false,
        lang: null,
      } : user;
      
      // Grok CSO+CFO推奨: タイムゾーン補正を使用（UTC基準で厳密に判定）
      const is24HoursPassed = hasTimePassed(userObj.joinedAt, 24);
      const isNotSent = !userObj.vsl2Sent;
      
      return is24HoursPassed && isNotSent;
    })
    .map(user => {
      const userObj = typeof user === 'string' ? {
        chatId: user,
        joinedAt: new Date(0).toISOString(),
        vsl2Sent: false,
        lang: null,
      } : user;
      
      return {
        chatId: userObj.chatId,
        joinedAt: userObj.joinedAt,
        userName: userObj.userName || null,
        lang: normalizeLang(userObj.lang) || null,
      };
    });
}

/**
 * 12-24時間経過した無料版ユーザーを取得（VSL1リマインド対象）
 * Gemini CMO提案: 12時間後にリマインドメッセージを送信
 * Grok CSO+CFO推奨: タイムゾーン補正追加
 * @returns {Promise<Array<Object>>} {chatId, joinedAt, userName}
 */
async function getFreeUsersForVSL1Reminder() {
  const users = await loadFreeUsers();
  
  return users
    .filter(user => {
      const userObj = typeof user === 'string' ? {
        chatId: user,
        joinedAt: new Date(0).toISOString(),
        vsl2Sent: false,
        lang: null,
      } : user;
      
      // Grok CSO+CFO推奨: タイムゾーン補正を使用（UTC基準で厳密に判定）
      // 12時間以上経過、かつ24時間未満（VSL2送信前）
      const isWithinRange = isWithinTimeRange(userObj.joinedAt, 12, 24);
      const isNotSent = !userObj.vsl2Sent;
      
      return isWithinRange && isNotSent;
    })
    .map(user => {
      const userObj = typeof user === 'string' ? {
        chatId: user,
        joinedAt: new Date(0).toISOString(),
        vsl2Sent: false,
        lang: null,
      } : user;
      
      return {
        chatId: userObj.chatId,
        joinedAt: userObj.joinedAt,
        userName: userObj.userName || null,
        lang: normalizeLang(userObj.lang) || null,
      };
    });
}

/**
 * 22時間経過した無料版ユーザーを取得（VSL2 Last Call対象）
 * Gemini CMO提案: 24時間経過の2時間前（22時間後）に通知を送信
 * Grok CSO+CFO推奨: タイムゾーン補正追加
 * @returns {Promise<Array<Object>>} {chatId, joinedAt, userName}
 */
async function getFreeUsersForVSL2LastCall() {
  const users = await loadFreeUsers();
  
  return users
    .filter(user => {
      const userObj = typeof user === 'string' ? {
        chatId: user,
        joinedAt: new Date(0).toISOString(),
        vsl2Sent: false,
        vsl2LastCallSent: false,
        lang: null,
      } : user;
      
      // Grok CSO+CFO推奨: タイムゾーン補正を使用（UTC基準で厳密に判定）
      // 22時間以上経過、かつ24時間未満（VSL2送信前、Last Call対象）
      const isWithinRange = isWithinTimeRange(userObj.joinedAt, 22, 24);
      const isNotSent = !userObj.vsl2Sent;
      const isLastCallNotSent = !userObj.vsl2LastCallSent; // Last Call未送信
      
      return isWithinRange && isNotSent && isLastCallNotSent;
    })
    .map(user => {
      const userObj = typeof user === 'string' ? {
        chatId: user,
        joinedAt: new Date(0).toISOString(),
        vsl2Sent: false,
        vsl2LastCallSent: false,
        lang: null,
      } : user;
      
      return {
        chatId: userObj.chatId,
        joinedAt: userObj.joinedAt,
        userName: userObj.userName || null,
        lang: normalizeLang(userObj.lang) || null,
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
        vsl2LastCallSent: false,
        lang: null,
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
        vsl2LastCallSent: true,
        lang: null,
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
