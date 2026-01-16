// scripts/test-vsl1-reminder.js
// VSL1リマインドメッセージの手動テストスクリプト

require('dotenv').config();
const path = require('path');

// VSL1リマインド関数を直接インポート
const vsl1Reminder = require('../api/vsl1-reminder');
const { loadFreeUsers, getFreeUsersForVSL1Reminder } = require('../services/free-users/manager');

async function testVSL1Reminder() {
  console.log('🧪 VSL1リマインドメッセージの手動テスト開始...\n');
  
  // 環境変数チェック
  console.log('📋 環境変数チェック:');
  console.log(`  VSL1_YOUTUBE_LINK: ${process.env.VSL1_YOUTUBE_LINK || '❌ 未設定'}`);
  console.log(`  TELEGRAM_BOT_TOKEN_EN: ${process.env.TELEGRAM_BOT_TOKEN_EN || '❌ 未設定'}`);
  console.log(`  TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN || '❌ 未設定'}`);
  console.log('');
  
  // 無料版ユーザー状況を確認
  console.log('📊 無料版ユーザー状況:');
  const allUsers = loadFreeUsers();
  console.log(`  登録済みユーザー数: ${allUsers.length}`);
  
  const eligibleUsers = getFreeUsersForVSL1Reminder();
  console.log(`  VSL1リマインド対象ユーザー数（12-24時間経過・VSL2未送信）: ${eligibleUsers.length}`);
  
  if (eligibleUsers.length > 0) {
    console.log('\n  対象ユーザー:');
    eligibleUsers.slice(0, 5).forEach((user, idx) => {
      const joinedAt = new Date(user.joinedAt);
      const hoursAgo = Math.floor((Date.now() - joinedAt.getTime()) / (1000 * 60 * 60));
      console.log(`    ${idx + 1}. ChatID: ${user.chatId}, ユーザー名: ${user.userName || 'N/A'}, 参加から${hoursAgo}時間経過`);
    });
    if (eligibleUsers.length > 5) {
      console.log(`    ... 他${eligibleUsers.length - 5}名`);
    }
  } else {
    console.log('\n  ⚠️ VSL1リマインド対象ユーザーがいません。');
    console.log('  → テスト用にユーザーを追加する場合は、`scripts/test-add-free-user.js`を実行してください。');
  }
  console.log('');
  
  // Mock Request/Response
  const req = {
    method: 'GET',
    headers: {
      authorization: process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : undefined
    }
  };
  
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      console.log(`\n✅ レスポンス (Status: ${this.statusCode}):`);
      console.log(JSON.stringify(body, null, 2));
      return this;
    }
  };
  
  try {
    console.log('🚀 VSL1リマインドメッセージを実行中...\n');
    await vsl1Reminder(req, res);
    
    if (res.statusCode === 200) {
      console.log('\n✅ VSL1リマインドテスト完了！');
      if (res.body && res.body.sent > 0) {
        console.log(`📱 ${res.body.sent}件のVSL1リマインドを送信しました。`);
        console.log('📱 対象ユーザーのTelegramを確認してください。');
      } else {
        console.log('ℹ️ リマインド対象ユーザーがいませんでした。');
      }
    } else {
      console.log(`\n⚠️ ステータスコード: ${res.statusCode}`);
      console.log('レスポンス:', res.body);
    }
  } catch (error) {
    console.error('\n❌ エラー発生:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 実行
testVSL1Reminder();
