// scripts/test-bot-command.js
// Botコマンドの手動テストスクリプト

require('dotenv').config();
const { handleBotCommand } = require('../services/telegram/bot-commands');

// コマンドライン引数からchatIdとコマンドを取得
const chatId = process.argv[2];
const command = process.argv[3] || '/start minimal';

if (!chatId) {
  console.log('❌ 使用方法: node scripts/test-bot-command.js <chatId> [command]');
  console.log('');
  console.log('例:');
  console.log('  node scripts/test-bot-command.js 123456789 "/start minimal"');
  console.log('  node scripts/test-bot-command.js 123456789 "/free"');
  console.log('  node scripts/test-bot-command.js 123456789 "/upgrade"');
  console.log('  node scripts/test-bot-command.js 123456789 "/status"');
  process.exit(1);
}

console.log('🧪 Botコマンドの手動テスト...\n');
console.log(`  ChatID: ${chatId}`);
console.log(`  コマンド: ${command}`);
console.log('');

// Mock Telegram Updateオブジェクト
const update = {
  update_id: Date.now(),
  message: {
    message_id: 1,
    date: Math.floor(Date.now() / 1000),
    chat: {
      id: parseInt(chatId),
      type: 'private'
    },
    from: {
      id: parseInt(chatId),
      is_bot: false,
      first_name: 'Test',
      username: 'testuser'
    },
    text: command
  }
};

async function testBotCommand() {
  try {
    console.log('🚀 Botコマンドを実行中...\n');
    const result = await handleBotCommand(update);
    
    console.log('✅ 結果:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ Botコマンドテスト成功！');
      console.log('📱 実際のTelegram Botに送信するには、Webhookを設定してください。');
    } else {
      console.log('\n⚠️ エラー:', result.error);
    }
  } catch (error) {
    console.error('\n❌ エラー発生:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testBotCommand();
