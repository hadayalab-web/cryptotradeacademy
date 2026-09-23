#!/usr/bin/env tsx
/**
 * EN版DM送信スクリプト
 * 
 * データベースから準備済みDMを取得して送信
 * - market='EN'かつstatus='New'のレコードを取得
 * - notesフィールドからDMメッセージを抽出
 * - Telegram/Emailで送信
 * - 送信後、statusを'Contacted'に更新
 * - telegram_dm_historyテーブルに記録
 * 
 * レート制限対応: 20メッセージ/分を考慮して送信間隔を制御（3秒/件）
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

// レート制限: 20メッセージ/分 = 3秒/件（安全マージン込み）
const SEND_INTERVAL_MS = 3000;

/**
 * notesフィールドからDMメッセージを抽出
 */
function extractDMMessage(notes: string | null): string | null {
  if (!notes) return null;
  
  // notesの形式: "【配信準備完了 - GPT（CTO）】\n準備日時: ...\n...\n\nDMメッセージ:\n[実際のメッセージ]"
  const dmMessageMatch = notes.match(/DMメッセージ:\s*([\s\S]*?)(?:\n\n|$)/);
  if (dmMessageMatch && dmMessageMatch[1]) {
    return dmMessageMatch[1].trim();
  }
  
  // フォールバック: 最後の部分を取得
  const lines = notes.split('\n');
  const dmStartIndex = lines.findIndex(line => line.includes('DMメッセージ'));
  if (dmStartIndex >= 0 && dmStartIndex < lines.length - 1) {
    return lines.slice(dmStartIndex + 1).join('\n').trim();
  }
  
  return null;
}

/**
 * 優先チャネルを取得
 */
function getPreferredChannel(notes: string | null): 'TG' | 'Email' {
  if (!notes) return 'TG';
  
  const preferredChannelMatch = notes.match(/優先チャネル:\s*(\w+)/);
  if (preferredChannelMatch && preferredChannelMatch[1]) {
    const channel = preferredChannelMatch[1].toUpperCase();
    if (channel === 'EMAIL') return 'Email';
    return 'TG';
  }
  
  return 'TG';
}

async function main() {
  console.log('🚀 EN版DM送信スクリプト開始\n');
  console.log('='.repeat(80));
  console.log('📋 処理内容:');
  console.log('  1. データベースから準備済みDMを取得（market=EN, status=New）');
  console.log('  2. Telegram/Emailで送信');
  console.log('  3. 送信状態を更新（status=Contacted）');
  console.log('  4. telegram_dm_historyテーブルに記録');
  console.log('='.repeat(80) + '\n');

  // データベースの状態確認
  const totalCount = await prisma.affiliateCandidate.count({
    where: {
      market: 'EN',
      status: 'New',
    },
  });

  console.log(`📊 準備済みDM数: ${totalCount}件\n`);

  if (totalCount === 0) {
    console.log('⚠️ 送信対象のDMがありません。先にcomplete-6markets-whop-and-send-dm.tsを実行してください。\n');
    await prisma.$disconnect();
    return;
  }

  // テストモード: 環境変数TEST_MODEが設定されている場合は1-2件のみ送信
  const testMode = process.env.TEST_MODE === 'true';
  const maxSendCount = testMode ? 2 : 1000;

  // 準備済みDMを取得
  const candidates = await prisma.affiliateCandidate.findMany({
    where: {
      market: 'EN',
      status: 'New',
    },
    take: maxSendCount, // 一度に送信する最大件数（レート制限を考慮）
  });

  if (testMode) {
    console.log('🧪 テストモード: 最大2件のみ送信します\n');
  }

  console.log(`📤 送信開始: ${candidates.length}件\n`);

  let sentCount = 0;
  let failedCount = 0;
  const errors: Array<{ username: string; error: string }> = [];

  // 各候補者に対してDM送信
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const progress = `[${i + 1}/${candidates.length}]`;
    
    try {
      // DMメッセージを抽出
      const dmMessage = extractDMMessage(candidate.notes);
      if (!dmMessage) {
        console.warn(`${progress} ⚠️ ${candidate.username || candidate.id}: DMメッセージが見つかりません`);
        failedCount++;
        errors.push({ username: candidate.username || String(candidate.id), error: 'DMメッセージが見つかりません' });
        continue;
      }

      // 優先チャネルを取得
      const preferredChannel = getPreferredChannel(candidate.notes);
      
      let sendSuccess = false;
      let messageId: number | undefined;
      let sendError: string | undefined;

      // Telegram送信
      if (preferredChannel === 'TG' && candidate.telegramUserId) {
        try {
          const result = await sendTelegramDM({
            market: 'EN',
            userId: candidate.telegramUserId,
            message: dmMessage,
            parseMode: 'HTML',
          });

          if (result.success) {
            sendSuccess = true;
            messageId = result.messageId;
            console.log(`${progress} ✅ ${candidate.username || candidate.id}: Telegram送信成功 (Message ID: ${messageId})`);
          } else {
            sendError = result.error || 'Unknown error';
            console.warn(`${progress} ⚠️ ${candidate.username || candidate.id}: Telegram送信失敗 - ${sendError}`);
            
            // Telegram送信失敗時、Emailにフォールバック
            if (candidate.email) {
              try {
                await sendResendEmail({
                  from: 'Trap Defence BTC <noreply@cryptotradeacademy.io>',
                  to: candidate.email,
                  subject: 'Trap Defence BTC - Exclusive Offer',
                  html: dmMessage.replace(/\n/g, '<br>'),
                });
                sendSuccess = true;
                console.log(`${progress} ✅ ${candidate.username || candidate.id}: Email送信成功（フォールバック）`);
              } catch (emailError: any) {
                sendError = `Telegram失敗 + Email失敗: ${emailError.message}`;
                console.error(`${progress} ❌ ${candidate.username || candidate.id}: Email送信も失敗 - ${emailError.message}`);
              }
            }
          }
        } catch (error: any) {
          sendError = error.message || 'Unknown error';
          console.error(`${progress} ❌ ${candidate.username || candidate.id}: Telegram送信エラー - ${sendError}`);
        }
      }
      // Email送信
      else if (preferredChannel === 'Email' && candidate.email) {
        try {
          await sendResendEmail({
            from: 'Trap Defence BTC <noreply@cryptotradeacademy.io>',
            to: candidate.email,
            subject: 'Trap Defence BTC - Exclusive Offer',
            html: dmMessage.replace(/\n/g, '<br>'),
          });
          sendSuccess = true;
          console.log(`${progress} ✅ ${candidate.username || candidate.id}: Email送信成功`);
        } catch (error: any) {
          sendError = error.message || 'Unknown error';
          console.error(`${progress} ❌ ${candidate.username || candidate.id}: Email送信エラー - ${sendError}`);
        }
      }
      else {
        sendError = '連絡先情報がありません（Telegram User IDもEmailもなし）';
        console.warn(`${progress} ⚠️ ${candidate.username || candidate.id}: ${sendError}`);
      }

      // 送信成功時のみ状態を更新
      if (sendSuccess) {
        // statusを'Contacted'に更新
        await prisma.affiliateCandidate.update({
          where: { id: candidate.id },
          data: { status: 'Contacted' },
        });

        // telegram_dm_historyテーブルに記録
        try {
          await prisma.telegramDmHistory.create({
            data: {
              recipientUserId: candidate.telegramUserId || candidate.email || String(candidate.id),
              recipientUsername: candidate.username,
              messageType: 'text',
              content: dmMessage,
              status: 'sent',
              sentAt: new Date(),
            },
          });
        } catch (historyError: any) {
          console.warn(`${progress} ⚠️ 送信履歴の記録に失敗: ${historyError.message}`);
        }

        sentCount++;
      } else {
        failedCount++;
        errors.push({ username: candidate.username || String(candidate.id), error: sendError || 'Unknown error' });
      }

      // レート制限対応: 送信間隔を制御（最後の1件以外）
      if (i < candidates.length - 1) {
        await new Promise(resolve => setTimeout(resolve, SEND_INTERVAL_MS));
      }
    } catch (error: any) {
      console.error(`${progress} ❌ ${candidate.username || candidate.id}: 処理エラー - ${error.message}`);
      failedCount++;
      errors.push({ username: candidate.username || String(candidate.id), error: error.message });
    }
  }

  // 結果レポート
  console.log('\n' + '='.repeat(80));
  console.log('📊 送信結果サマリー');
  console.log('='.repeat(80));
  console.log(`✅ 送信成功: ${sentCount}件`);
  console.log(`❌ 送信失敗: ${failedCount}件`);
  console.log(`📈 成功率: ${totalCount > 0 ? ((sentCount / totalCount) * 100).toFixed(1) : 0}%\n`);

  if (errors.length > 0) {
    console.log('❌ エラー詳細:');
    errors.slice(0, 10).forEach(({ username, error }) => {
      console.log(`  - ${username}: ${error}`);
    });
    if (errors.length > 10) {
      console.log(`  ... 他${errors.length - 10}件のエラー`);
    }
    console.log('');
  }

  // CEOにメール報告
  const emailContent = `🚀 EN版DM送信完了

⏱️ 実行時刻: ${new Date().toISOString()}

## 📊 送信結果

- **送信対象**: ${totalCount}件
- **送信成功**: ${sentCount}件
- **送信失敗**: ${failedCount}件
- **成功率**: ${totalCount > 0 ? ((sentCount / totalCount) * 100).toFixed(1) : 0}%

## 📋 処理内容

1. データベースから準備済みDMを取得（market=EN, status=New）
2. Telegram/Emailで送信
3. 送信状態を更新（status=Contacted）
4. telegram_dm_historyテーブルに記録

${errors.length > 0 ? `\n## ⚠️ エラー詳細\n\n${errors.slice(0, 20).map(({ username, error }) => `- ${username}: ${error}`).join('\n')}${errors.length > 20 ? `\n... 他${errors.length - 20}件のエラー` : ''}\n` : ''}

詳細はログを確認してください。`;

  try {
    await sendResendEmail({
      from: 'COO兼CTO <noreply@cryptotradeacademy.io>',
      to: 'admin@cryptotradeacademy.io',
      subject: '🚀 EN版DM送信完了',
      html: emailContent.replace(/\n/g, '<br>'),
    });
    console.log('✅ CEOにメール報告完了\n');
  } catch (error: any) {
    console.warn(`⚠️ CEOメール通知失敗: ${error.message}\n`);
  }

  console.log('='.repeat(80));
  console.log('✅ EN版DM送信スクリプト完了');
  console.log('='.repeat(80) + '\n');

  await prisma.$disconnect();
}

main()
  .then(() => {
    console.log('\n✅ 処理完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  });
