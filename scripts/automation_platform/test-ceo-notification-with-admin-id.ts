#!/usr/bin/env tsx
/**
 * CEO Telegram通知テスト（TELEGRAM_ADMIN_IDを使用）
 * 
 * 提供された環境変数から、TELEGRAM_ADMIN_IDをCEOのIDとして使用してテスト送信
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .envファイルを読み込む
dotenv.config({ path: join(__dirname, '..', '.env') });

const TELEGRAM_ADMIN_ID = process.env.TELEGRAM_ADMIN_ID || '';
const TELEGRAM_BOT_TOKEN_EN = process.env.TELEGRAM_BOT_TOKEN_EN || '';
const TELEGRAM_BOT_TOKEN_CEO = process.env.TELEGRAM_BOT_TOKEN_CEO || TELEGRAM_BOT_TOKEN_EN;

async function testCEONotificationWithAdminID() {
  console.log('📱 CEO Telegram通知テスト開始（TELEGRAM_ADMIN_ID使用）\n');

  // 環境変数チェック
  if (!TELEGRAM_ADMIN_ID) {
    console.error('❌ エラー: TELEGRAM_ADMIN_IDが設定されていません');
    process.exit(1);
  }

  if (!TELEGRAM_BOT_TOKEN_EN) {
    console.error('❌ エラー: TELEGRAM_BOT_TOKEN_ENが設定されていません');
    process.exit(1);
  }

  console.log('✅ 環境変数確認完了');
  console.log(`   - Admin ID (CEO IDとして使用): ${TELEGRAM_ADMIN_ID}`);
  console.log(`   - Bot Token: ${TELEGRAM_BOT_TOKEN_EN.substring(0, 10)}...\n`);

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

  try {
    console.log('📤 CEOにテストメッセージを送信中...');
    
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN_EN}/sendMessage`;
    const response = await axios.post(url, {
      chat_id: TELEGRAM_ADMIN_ID,
      text: testMessage,
      parse_mode: 'HTML'
    });

    if (response.data.ok) {
      console.log('✅ CEO通知テスト成功！');
      console.log(`   - メッセージID: ${response.data.result.message_id}`);
      console.log(`   - チャットID: ${TELEGRAM_ADMIN_ID}`);
      console.log(`   - 送信時刻: ${new Date().toISOString()}\n`);
      console.log('📱 CEOのTelegramを確認してください。');
      return true;
    } else {
      console.error('❌ CEO通知テスト失敗');
      console.error('レスポンス:', response.data);
      return false;
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    
    if (error.response) {
      console.error('APIレスポンス:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.data.description?.includes('chat not found')) {
        console.error('\n⚠️ チャットIDが正しくありません。');
        console.error('   Botにメッセージを送信してから、再度試してください。');
      }
      
      if (error.response.data.description?.includes('Unauthorized')) {
        console.error('\n⚠️ Bot Tokenが正しくありません。');
      }

      if (error.response.data.description?.includes('bot was blocked')) {
        console.error('\n⚠️ Botがブロックされています。');
        console.error('   Botのブロックを解除してから、再度試してください。');
      }
    }
    
    return false;
  }
}

testCEONotificationWithAdminID()
  .then((success) => {
    if (success) {
      console.log('\n✅ テスト完了 - 送信成功を確認しました');
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
