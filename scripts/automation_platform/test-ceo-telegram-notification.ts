#!/usr/bin/env tsx
/**
 * CEO Telegram通知テスト
 * 
 * CEO（人間）にテストメッセージを送信して、通知が正常に届くか確認
 */

import { sendTelegramMessageToCEO } from '../api/unified-api.js';

async function testCEONotification() {
  console.log('📱 CEO Telegram通知テスト開始\n');

  try {
    // テストメッセージ
    const testMessage = `🧪 CEO通知テスト

これはCOO（Cursor/Composer 1）からのテスト通知です。

✅ このメッセージが届いていれば、通知機能は正常に動作しています。

📊 今後、以下の通知が自動で届きます：
- 日次KPIレポート（毎日10:00）
- 週末$100K達成確率シミュレーション結果
- 異常・エラー発生時の通知

🤖 世界最強のAIチーム（Grok CSO、Gemini CMO、GPT CTO、COO）があなたをサポートします。

テスト送信時刻: ${new Date().toISOString()}`;

    console.log('📤 CEOにテストメッセージを送信中...');
    const result = await sendTelegramMessageToCEO(testMessage);

    if (result.success) {
      console.log('✅ CEO通知テスト成功！');
      console.log(`   - メッセージID: ${result.messageId}`);
      console.log(`   - チャットID: ${result.chatId}`);
      console.log(`   - 送信時刻: ${result.sentAt}\n`);
      console.log('📱 CEOのTelegramを確認してください。');
      return true;
    } else {
      console.error('❌ CEO通知テスト失敗');
      return false;
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    
    if (error.message.includes('TELEGRAM_CHAT_ID_CEO')) {
      console.error('\n⚠️ 環境変数が設定されていません:');
      console.error('   .envファイルに以下を追加してください:');
      console.error('   TELEGRAM_CHAT_ID_CEO=あなたのTelegramチャットID');
      console.error('   TELEGRAM_BOT_TOKEN_CEO=あなたのTelegram Bot Token（またはTELEGRAM_BOT_TOKEN_EN）\n');
      console.error('📋 チャットIDの取得方法:');
      console.error('   1. Telegram Botにメッセージを送信（/start）');
      console.error('   2. ブラウザで以下にアクセス:');
      console.error('      https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates');
      console.error('   3. レスポンスのchat.idをコピー');
      console.error('   4. .envファイルに追加: TELEGRAM_CHAT_ID_CEO=<chat.id>\n');
    }

    if (error.message.includes('TELEGRAM_BOT_TOKEN')) {
      console.error('\n⚠️ Bot Tokenが設定されていません:');
      console.error('   .envファイルに以下を追加してください:');
      console.error('   TELEGRAM_BOT_TOKEN_CEO=あなたのTelegram Bot Token');
      console.error('   または既存のBot Tokenを使用:');
      console.error('   TELEGRAM_BOT_TOKEN_EN=既存のBot Token\n');
    }

    return false;
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('test-ceo-telegram-notification')) {
  testCEONotification()
    .then((success) => {
      if (success) {
        console.log('\n✅ テスト完了');
        process.exit(0);
      } else {
        console.log('\n❌ テスト失敗');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n❌ テストエラー:', error.message);
      process.exit(1);
    });
}

export { testCEONotification };
