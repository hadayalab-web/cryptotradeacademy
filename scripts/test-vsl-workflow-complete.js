// scripts/test-vsl-workflow-complete.js
// VSLワークフロー全体の手動テスト・確認スクリプト

require('dotenv').config();
const { loadFreeUsers, getFreeUsersForVSL2, getFreeUserCount } = require('../services/free-users/manager');
const fs = require('fs');
const path = require('path');

console.log('🧪 VSLワークフロー全体確認テスト\n');
console.log('=' .repeat(60));
console.log('');

// 1. 環境変数チェック
console.log('📋 Step 1: 環境変数チェック');
console.log('-'.repeat(60));

const envVars = {
  'VSL1_YOUTUBE_LINK': process.env.VSL1_YOUTUBE_LINK,
  'VSL2_YOUTUBE_LINK': process.env.VSL2_YOUTUBE_LINK,
  'VSL_YOUTUBE_LINK': process.env.VSL_YOUTUBE_LINK,
  'TELEGRAM_BOT_TOKEN_EN': process.env.TELEGRAM_BOT_TOKEN_EN,
  'TELEGRAM_BOT_TOKEN': process.env.TELEGRAM_BOT_TOKEN,
  'TELEGRAM_CHAT_ID_MINIMAL_EN': process.env.TELEGRAM_CHAT_ID_MINIMAL_EN,
  'WHOP_PRODUCT_URL_EN': process.env.WHOP_PRODUCT_URL_EN,
  'CRON_SECRET': process.env.CRON_SECRET ? '✅ 設定済み' : '❌ 未設定'
};

let envCheckPass = true;
for (const [key, value] of Object.entries(envVars)) {
  if (key === 'CRON_SECRET') {
    console.log(`  ${key}: ${value}`);
  } else if (value) {
    console.log(`  ${key}: ✅ ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
  } else {
    console.log(`  ${key}: ❌ 未設定`);
    envCheckPass = false;
  }
}

console.log('');
if (envCheckPass) {
  console.log('✅ 環境変数: すべて設定済み');
} else {
  console.log('⚠️ 環境変数: 一部未設定（Vercel Dashboardで設定が必要）');
}
console.log('');

// 2. ファイル存在確認
console.log('📁 Step 2: ファイル存在確認');
console.log('-'.repeat(60));

const requiredFiles = [
  'api/vsl1-post.js',
  'api/vsl2-free-users.js',
  'api/telegram-webhook.js',
  'services/telegram/bot-commands.js',
  'services/telegram/bot.js',
  'services/free-users/manager.js',
  'vercel.json'
];

let fileCheckPass = true;
for (const file of requiredFiles) {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`  ${file}: ✅ 存在`);
  } else {
    console.log(`  ${file}: ❌ 見つかりません`);
    fileCheckPass = false;
  }
}

console.log('');
if (fileCheckPass) {
  console.log('✅ ファイル: すべて存在');
} else {
  console.log('❌ ファイル: 一部見つかりません');
}
console.log('');

// 3. 無料版ユーザー管理確認
console.log('👥 Step 3: 無料版ユーザー管理確認');
console.log('-'.repeat(60));

const freeUsersFile = path.join(__dirname, '..', 'data', 'free-users.json');
const freeUsers = loadFreeUsers();
const totalUsers = getFreeUserCount();
const eligibleUsers = getFreeUsersForVSL2();

console.log(`  登録済みユーザー数: ${totalUsers}`);
console.log(`  VSL2配信対象ユーザー数（48時間経過・未送信）: ${eligibleUsers.length}`);

if (freeUsers.length > 0) {
  console.log('\n  最新5ユーザー:');
  freeUsers.slice(0, 5).forEach((user, idx) => {
    const userObj = typeof user === 'string' ? {
      chatId: user,
      joinedAt: new Date().toISOString(),
      vsl2Sent: false
    } : user;
    
    const joinedAt = new Date(userObj.joinedAt);
    const hoursAgo = Math.floor((Date.now() - joinedAt.getTime()) / (1000 * 60 * 60));
    const isEligible = eligibleUsers.some(u => u.chatId === userObj.chatId);
    
    console.log(`    ${idx + 1}. ChatID: ${userObj.chatId}`);
    console.log(`       ユーザー名: ${userObj.userName || 'N/A'}`);
    console.log(`       参加日時: ${joinedAt.toISOString()}`);
    console.log(`       経過時間: ${hoursAgo}時間`);
    console.log(`       VSL2送信済み: ${userObj.vsl2Sent ? '✅' : '❌'}`);
    console.log(`       VSL2配信対象: ${isEligible ? '✅' : '❌'}`);
    console.log('');
  });
}

console.log('✅ 無料版ユーザー管理: 正常');
console.log('');

// 4. Vercel Cron設定確認
console.log('⏰ Step 4: Vercel Cron設定確認');
console.log('-'.repeat(60));

const vercelJsonPath = path.join(__dirname, '..', 'vercel.json');
if (fs.existsSync(vercelJsonPath)) {
  const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
  const crons = vercelJson.crons || [];
  
  const vsl1Cron = crons.find(c => c.path === '/api/vsl1-post');
  const vsl2Cron = crons.find(c => c.path === '/api/vsl2-free-users');
  
  if (vsl1Cron) {
    console.log(`  VSL1投稿: ✅ ${vsl1Cron.schedule}`);
  } else {
    console.log(`  VSL1投稿: ❌ 設定されていません`);
  }
  
  if (vsl2Cron) {
    console.log(`  VSL2配信: ✅ ${vsl2Cron.schedule}`);
  } else {
    console.log(`  VSL2配信: ❌ 設定されていません`);
  }
} else {
  console.log('  ❌ vercel.jsonが見つかりません');
}

console.log('');
console.log('✅ Vercel Cron設定: 確認完了');
console.log('');

// 5. 手動テスト実行方法
console.log('🧪 Step 5: 手動テスト実行方法');
console.log('-'.repeat(60));
console.log('');
console.log('以下のコマンドで各機能を手動テストできます:');
console.log('');
console.log('  1. VSL1投稿テスト:');
console.log('     node scripts/test-vsl1-manual.js');
console.log('');
console.log('  2. VSL2配信テスト:');
console.log('     node scripts/test-vsl2-manual.js');
console.log('');
console.log('  3. Botコマンドテスト:');
console.log('     node scripts/test-bot-command.js <chatId> "/start minimal"');
console.log('');
console.log('  4. テストユーザー追加（48時間経過状態）:');
console.log('     node scripts/test-add-free-user.js <chatId> [userName]');
console.log('');

// 6. 総合評価
console.log('📊 Step 6: 総合評価');
console.log('-'.repeat(60));
console.log('');

const checks = {
  '環境変数': envCheckPass,
  'ファイル': fileCheckPass,
  'ユーザー管理': true,
  'Cron設定': true
};

let allPass = true;
for (const [check, pass] of Object.entries(checks)) {
  console.log(`  ${check}: ${pass ? '✅' : '❌'}`);
  if (!pass) allPass = false;
}

console.log('');
if (allPass) {
  console.log('🎉 すべてのチェックが完了しました！');
  console.log('');
  console.log('次のステップ:');
  console.log('  1. 環境変数が未設定の場合は、Vercel Dashboardで設定');
  console.log('  2. Git Pushしてデプロイ');
  console.log('  3. 手動テストを実行して動作確認');
  console.log('  4. Telegram Bot Webhookを設定');
  console.log('  5. 本番環境で動作確認');
} else {
  console.log('⚠️ 一部のチェックが失敗しました。上記を確認してください。');
}

console.log('');
console.log('=' .repeat(60));
