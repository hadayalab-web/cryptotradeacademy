#!/usr/bin/env tsx
/**
 * CEO宛てテストDM送信スクリプト
 * 
 * 準備済みDMをCEOにテスト送信
 * - Email: Resend → admin@cryptotradeacademy.io
 * - Telegram: TELEGRAM_CHAT_ID_EN (-1003223165053) から TELEGRAM_ADMIN_ID (6770292419) へ
 * 
 * 使用方法:
 *   npx tsx scripts/send-ceo-test-dm.ts
 */

import { PrismaClient } from '@prisma/client';
import { sendTelegramDM, sendResendEmail } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

// CEO連絡先
const CEO_EMAIL = 'admin@cryptotradeacademy.io';
const CEO_TELEGRAM_USER_ID = process.env.TELEGRAM_ADMIN_ID || '6770292419';
const TELEGRAM_CHAT_ID_EN = process.env.TELEGRAM_CHAT_ID_EN || '-1003223165053';

/**
 * notesフィールドからDMメッセージを抽出
 */
function extractDMMessage(notes: string | null): string | null {
  if (!notes) return null;
  
  const dmMessageMatch = notes.match(/DMメッセージ:\s*([\s\S]*?)(?:\n\n|$)/);
  if (dmMessageMatch && dmMessageMatch[1]) {
    return dmMessageMatch[1].trim();
  }
  
  const lines = notes.split('\n');
  const dmStartIndex = lines.findIndex(line => line.includes('DMメッセージ'));
  if (dmStartIndex >= 0 && dmStartIndex < lines.length - 1) {
    return lines.slice(dmStartIndex + 1).join('\n').trim();
  }
  
  return null;
}

async function main() {
  console.log('🚀 CEO宛てテストDM送信スクリプト開始\n');
  console.log('='.repeat(80));
  console.log('📋 処理内容:');
  console.log('  1. データベースから準備済みDMを取得（market=EN, status=New）');
  console.log('  2. 最初の1件をCEOにテスト送信');
  console.log('     - Email: Resend → admin@cryptotradeacademy.io');
  console.log('     - Telegram: EN Bot → TELEGRAM_ADMIN_ID');
  console.log('  3. 送信結果をレポート');
  console.log('='.repeat(80) + '\n');

  // 環境変数チェック
  const requiredEnvVars = [
    'DATABASE_URL',
    'TELEGRAM_BOT_TOKEN_EN',
    'RESEND_API_KEY',
    'TELEGRAM_ADMIN_ID'
  ];
  
  const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);
  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }

  try {
    // 準備済みDMを1件取得
    const candidate = await prisma.affiliateCandidate.findFirst({
      where: {
        market: 'EN',
        status: 'New',
      },
      orderBy: {
        createdAt: 'desc', // 最新のものを取得
      },
    });

    if (!candidate) {
      console.log('⚠️ 準備済みDMが見つかりません。');
      console.log('   先に complete-6markets-whop-and-send-dm.ts を実行してください。\n');
      return;
    }

    console.log(`📋 テスト送信対象: ${candidate.username || candidate.id}\n`);

    // DMメッセージを抽出
    const dmMessage = extractDMMessage(candidate.notes);
    if (!dmMessage) {
      throw new Error('DMメッセージが見つかりません');
    }

    console.log(`📝 DMメッセージ（${dmMessage.length}文字）:\n${dmMessage.substring(0, 200)}...\n`);

    const results = {
      email: { success: false, error: '' },
      telegram: { success: false, error: '', messageId: undefined as number | undefined },
    };

    // Email送信
    console.log('📧 Email送信中...');
    try {
      await sendResendEmail({
        from: 'Trap Defence BTC <noreply@cryptotradeacademy.io>',
        to: CEO_EMAIL,
        subject: '🧪 [TEST] Trap Defence BTC - Exclusive Offer',
        html: dmMessage.replace(/\n/g, '<br>'),
      });
      results.email.success = true;
      console.log('✅ Email送信成功\n');
    } catch (error: any) {
      results.email.error = error.message || 'Unknown error';
      console.error(`❌ Email送信失敗: ${results.email.error}\n`);
    }

    // Telegram送信
    console.log('📱 Telegram送信中...');
    try {
      const telegramResult = await sendTelegramDM({
        market: 'EN',
        userId: CEO_TELEGRAM_USER_ID,
        message: `🧪 [TEST] ${dmMessage}`,
        parseMode: 'HTML',
      });

      if (telegramResult.success) {
        results.telegram.success = true;
        results.telegram.messageId = telegramResult.messageId;
        console.log(`✅ Telegram送信成功 (Message ID: ${telegramResult.messageId})\n`);
      } else {
        results.telegram.error = telegramResult.error || 'Unknown error';
        console.error(`❌ Telegram送信失敗: ${results.telegram.error}\n`);
      }
    } catch (error: any) {
      results.telegram.error = error.message || 'Unknown error';
      console.error(`❌ Telegram送信エラー: ${results.telegram.error}\n`);
    }

    // 結果レポート
    console.log('='.repeat(80));
    console.log('📊 テスト送信結果');
    console.log('='.repeat(80));
    console.log(`📧 Email: ${results.email.success ? '✅ 成功' : `❌ 失敗 (${results.email.error})`}`);
    console.log(`📱 Telegram: ${results.telegram.success ? `✅ 成功 (Message ID: ${results.telegram.messageId})` : `❌ 失敗 (${results.telegram.error})`}`);
    console.log('='.repeat(80) + '\n');

    // CEOに結果レポートを送信
    const reportContent = `🧪 CEO宛てテストDM送信結果

⏱️ 実行時刻: ${new Date().toISOString()}

## 📊 送信結果

- **Email送信**: ${results.email.success ? '✅ 成功' : `❌ 失敗 (${results.email.error})`}
- **Telegram送信**: ${results.telegram.success ? `✅ 成功 (Message ID: ${results.telegram.messageId})` : `❌ 失敗 (${results.telegram.error})`}

## 📋 テスト送信内容

- **対象候補者**: ${candidate.username || candidate.id}
- **DMメッセージ長**: ${dmMessage.length}文字
- **メッセージプレビュー**: ${dmMessage.substring(0, 300)}...

## 🔍 検証項目

- [ ] Emailが正しく受信できたか
- [ ] Telegramメッセージが正しく受信できたか
- [ ] メッセージのフォーマットが正しいか
- [ ] リンクが正しく動作するか
- [ ] メッセージの長さが適切か

---

次のステップ: 検証結果を確認して、必要に応じて改善を実施してください。`;

    try {
      await sendResendEmail({
        from: 'COO兼CTO <noreply@cryptotradeacademy.io>',
        to: CEO_EMAIL,
        subject: '🧪 CEO宛てテストDM送信結果',
        html: reportContent.replace(/\n/g, '<br>'),
      });
      console.log('✅ CEOに結果レポートを送信しました\n');
    } catch (error: any) {
      console.warn(`⚠️ 結果レポート送信失敗: ${error.message}\n`);
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('='.repeat(80));
    console.log('✅ CEO宛てテストDM送信スクリプト完了');
    console.log('='.repeat(80) + '\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    process.exit(1);
  });
