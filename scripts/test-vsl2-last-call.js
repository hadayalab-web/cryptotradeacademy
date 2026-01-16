// scripts/test-vsl2-last-call.js
// VSL2 Last Call（22時間後通知）の手動テストスクリプト

require('dotenv').config();
const path = require('path');

// VSL2 Last Call関数を直接インポート
const vsl2LastCall = require('../api/vsl2-last-call');
const { loadFreeUsers, getFreeUsersForVSL2LastCall } = require('../services/free-users/manager');

async function testVSL2LastCall() {
  console.log('🧪 VSL2 Last Call（22時間後通知）の手動テスト開始...\n');
  
  // 環境変数チェック
  console.log('📋 環境変数チェック:');
  console.log(`  TELEGRAM_BOT_TOKEN_EN: ${process.env.TELEGRAM_BOT_TOKEN_EN ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`  TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`  VSL2_YOUTUBE_LINK: ${process.env.VSL2_YOUTUBE_LINK || process.env.VSL_YOUTUBE_LINK || '❌ 未設定（デフォルト使用）'}`);
  console.log(`  WHOP_PRODUCT_URL_EN: ${process.env.WHOP_PRODUCT_URL_EN || '❌ 未設定（デフォルト使用）'}`);
  console.log(`  CRON_SECRET: ${process.env.CRON_SECRET ? '✅ 設定済み' : '⚠️ 未設定（ローカルテストでは不要）'}`);
  console.log('');
  
  // 無料版ユーザー状況を確認
  console.log('📊 無料版ユーザー状況:');
  const allUsers = loadFreeUsers();
  console.log(`  登録済みユーザー数: ${allUsers.length}`);
  
  const eligibleUsers = getFreeUsersForVSL2LastCall();
  console.log(`  VSL2 Last Call対象ユーザー数（22-24時間経過・VSL2未送信・Last Call未送信）: ${eligibleUsers.length}`);
  
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
    console.log('\n  ⚠️ VSL2 Last Call対象ユーザーがいません。');
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
    console.log('🚀 VSL2 Last Callを実行中...\n');
    console.log('📝 対象ユーザー: 22時間経過した無料版ユーザー（VSL2未送信、Last Call未送信）\n');
    
    await vsl2LastCall(req, res);
    
    if (res.statusCode === 200) {
      console.log('\n✅ VSL2 Last Callテスト成功！');
      console.log('📱 Telegram Botで対象ユーザーにメッセージが送信されたか確認してください。');
      console.log('');
      console.log('💡 このメッセージは：');
      console.log('  • 22時間経過した無料版ユーザーに送信されます');
      console.log('  • 「残り2時間で50%オフが終了します」という緊急性を強調');
      console.log('  • インラインボタンでワンタップアクセスが可能');
      console.log('  • VSL2送信前の「最後のチャンス」として機能');
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
testVSL2LastCall();
