// scripts/test-vsl1-manual.js
// VSL1投稿の手動テストスクリプト

require('dotenv').config();
const path = require('path');

// VSL1投稿関数を直接インポート
const vsl1Post = require('../api/vsl1-post');

async function testVSL1Post() {
  console.log('🧪 VSL1投稿の手動テスト開始...\n');
  
  // 環境変数チェック
  console.log('📋 環境変数チェック:');
  console.log(`  VSL1_YOUTUBE_LINK: ${process.env.VSL1_YOUTUBE_LINK || '❌ 未設定'}`);
  console.log(`  TELEGRAM_CHAT_ID_MINIMAL_EN: ${process.env.TELEGRAM_CHAT_ID_MINIMAL_EN || '❌ 未設定'}`);
  console.log(`  TELEGRAM_BOT_TOKEN_EN: ${process.env.TELEGRAM_BOT_TOKEN_EN || '❌ 未設定'}`);
  console.log(`  TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN || '❌ 未設定'}`);
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
    console.log('🚀 VSL1投稿を実行中...\n');
    await vsl1Post(req, res);
    
    if (res.statusCode === 200) {
      console.log('\n✅ VSL1投稿テスト成功！');
      console.log('📱 Telegram MINIMALチャンネル（EN）を確認してください。');
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
testVSL1Post();
