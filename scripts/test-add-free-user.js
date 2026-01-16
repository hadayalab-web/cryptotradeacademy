// scripts/test-add-free-user.js
// テスト用に無料版ユーザーを追加するスクリプト

require('dotenv').config();
const { addFreeUser, loadFreeUsers } = require('../services/free-users/manager');

// コマンドライン引数からchatIdを取得
const chatId = process.argv[2];
const userName = process.argv[3] || 'TestUser';

if (!chatId) {
  console.log('❌ 使用方法: node scripts/test-add-free-user.js <chatId> [userName]');
  console.log('');
  console.log('例:');
  console.log('  node scripts/test-add-free-user.js 123456789 TestUser');
  console.log('  node scripts/test-add-free-user.js 123456789 "John Doe"');
  process.exit(1);
}

console.log('🧪 テスト用無料版ユーザー追加...\n');
console.log(`  ChatID: ${chatId}`);
console.log(`  ユーザー名: ${userName}`);
console.log('');

// 48時間前の日時に設定（VSL2配信テスト用）
const users = loadFreeUsers();
const existingIndex = users.findIndex(u => (typeof u === 'string' ? u : u.chatId) === chatId);

if (existingIndex !== -1) {
  // 既存ユーザーの場合、joinedAtを48時間前に更新
  const user = users[existingIndex];
  const userObj = typeof user === 'string' ? {
    chatId: user,
    joinedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    vsl2Sent: false
  } : user;
  
  userObj.joinedAt = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  userObj.vsl2Sent = false; // リセット
  userObj.userName = userName;
  
  users[existingIndex] = userObj;
  require('../services/free-users/manager').saveFreeUsers(users);
  
  console.log('✅ 既存ユーザーを更新しました（joinedAtを48時間前に設定、vsl2Sentをリセット）');
} else {
  // 新規ユーザーを追加（48時間前の日時で）
  const { addFreeUser } = require('../services/free-users/manager');
  
  // 直接ファイルに書き込む（48時間前の日時で）
  const newUser = {
    chatId,
    joinedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    vsl2Sent: false,
    userName
  };
  
  users.push(newUser);
  require('../services/free-users/manager').saveFreeUsers(users);
  
  console.log('✅ 新規ユーザーを追加しました（joinedAtを48時間前に設定）');
}

console.log('');
console.log('📊 現在の無料版ユーザー数:', loadFreeUsers().length);
console.log('');
console.log('💡 次のステップ:');
console.log('  node scripts/test-vsl2-manual.js を実行してVSL2配信をテストできます。');
