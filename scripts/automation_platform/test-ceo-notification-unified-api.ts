#!/usr/bin/env tsx
/**
 * CEO Telegram通知テスト（unified-api.tsの関数を使用）
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { sendTelegramMessageToCEO } from '../api/unified-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .envファイルを読み込む
dotenv.config({ path: join(__dirname, '..', '.env') });

async function testCEONotificationUnifiedAPI() {
  console.log('📱 CEO Telegram通知テスト開始（unified-api.ts使用）\n');

  try {
    const testMessage = `🧪 CEO通知テスト（unified-api.ts経由）

これはCOO（Cursor/Composer 1）からのテスト通知です。

✅ unified-api.tsのsendTelegramMessageToCEO()関数を使用して送信しました。

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
    console.error('スタック:', error.stack);
    return false;
  }
}

testCEONotificationUnifiedAPI()
  .then((success) => {
    if (success) {
      console.log('\n✅ テスト完了 - unified-api.ts経由での送信成功を確認しました');
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
