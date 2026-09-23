#!/usr/bin/env tsx
/**
 * CEO Telegram通知テスト（直接実行版）
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .envファイルを読み込む
dotenv.config({ path: join(__dirname, '..', '.env') });

const TELEGRAM_CHAT_ID_CEO = process.env.TELEGRAM_CHAT_ID_CEO || '';
const TELEGRAM_BOT_TOKEN_CEO = process.env.TELEGRAM_BOT_TOKEN_CEO || process.env.TELEGRAM_BOT_TOKEN_EN || process.env.TELEGRAM_BOT_TOKEN || '';

async function testCEONotification() {
  console.log('📱 CEO Telegram通知テスト開始\n');

  // 環境変数チェック
  if (!TELEGRAM_CHAT_ID_CEO) {
    console.error('❌ エラー: TELEGRAM_CHAT_ID_CEOが設定されていません');
    console.error('\n📋 設定方法:');
    console.error('   1. .envファイルに以下を追加:');
    console.error('      TELEGRAM_CHAT_ID_CEO=あなたのTelegramチャットID');
    console.error('\n   2. チャットIDの取得方法:');
    console.error('      - Telegram Botにメッセージを送信（/start）');
    console.error('      - ブラウザで以下にアクセス:');
    console.error('        https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates');
    console.error('      - レスポンスのchat.idをコピー');
    process.exit(1);
  }

  if (!TELEGRAM_BOT_TOKEN_CEO) {
    console.error('❌ エラー: TELEGRAM_BOT_TOKEN_CEOが設定されていません');
    console.error('\n📋 設定方法:');
    console.error('   .envファイルに以下を追加:');
    console.error('   TELEGRAM_BOT_TOKEN_CEO=あなたのTelegram Bot Token');
    console.error('   または既存のBot Tokenを使用:');
    console.error('   TELEGRAM_BOT_TOKEN_EN=既存のBot Token');
    process.exit(1);
  }

  console.log('✅ 環境変数確認完了');
  console.log(`   - Bot Token: ${TELEGRAM_BOT_TOKEN_CEO.substring(0, 10)}...`);
  console.log(`   - Chat ID: ${TELEGRAM_CHAT_ID_CEO}\n`);

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
    
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN_CEO}/sendMessage`;
    const response = await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID_CEO,
      text: testMessage,
      parse_mode: 'HTML'
    });

    if (response.data.ok) {
      console.log('✅ CEO通知テスト成功！');
      console.log(`   - メッセージID: ${response.data.result.message_id}`);
      console.log(`   - チャットID: ${TELEGRAM_CHAT_ID_CEO}`);
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
      console.error('APIレスポンス:', error.response.data);
      
      if (error.response.data.description?.includes('chat not found')) {
        console.error('\n⚠️ チャットIDが正しくありません。');
        console.error('   Botにメッセージを送信してから、再度試してください。');
      }
      
      if (error.response.data.description?.includes('Unauthorized')) {
        console.error('\n⚠️ Bot Tokenが正しくありません。');
        console.error('   .envファイルのTELEGRAM_BOT_TOKEN_CEOを確認してください。');
      }
    }
    
    return false;
  }
}

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
