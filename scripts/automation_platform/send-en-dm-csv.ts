#!/usr/bin/env tsx
/**
 * EN版DM送信スクリプト（CSVベース）
 * 
 * 用途: Trap Defence BTCの直接販売 - ユーザーにDMを送り、Whopページで商品を購入してもらう
 * 
 * CSVファイルから準備済みDMを読み込んで送信
 * - market='EN'かつstatus='New'のレコードを取得
 * - notesフィールドからDMメッセージを抽出
 * - Telegram/Emailで送信
 * - 送信後、statusを'Contacted'に更新してCSVに保存
 * 
 * レート制限対応: 20メッセージ/分を考慮して送信間隔を制御（3秒/件）
 */

import { sendTelegramDM, sendResendEmail } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

// CSVファイルパス
const CSV_FILE_PATH = join(__dirname, '..', 'data', 'user-list-en.csv');
const CEO_EMAIL = 'admin@cryptotradeacademy.io';

// レート制限: 20メッセージ/分 = 3秒/件（安全マージン込み）
const SEND_INTERVAL_MS = 3000;

interface CandidateRow {
  username: string;
  display_name?: string;
  market: string;
  telegram_user_id?: string;
  email?: string;
  status: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * CSVファイルを読み込む
 */
function readCSV(): CandidateRow[] {
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.log(`⚠️ CSVファイルが見つかりません: ${CSV_FILE_PATH}`);
    console.log(`   空のCSVファイルを作成します。\n`);
    
    // 空のCSVファイルを作成
    const header = 'username,display_name,market,telegram_user_id,email,status,notes,created_at,updated_at\n';
    fs.writeFileSync(CSV_FILE_PATH, header, 'utf-8');
    return [];
  }

  const content = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
  }) as CandidateRow[];

  return records;
}

/**
 * CSVファイルに書き込む
 */
function writeCSV(rows: CandidateRow[]) {
  const csvContent = stringify(rows, {
    header: true,
    columns: ['username', 'display_name', 'market', 'telegram_user_id', 'email', 'status', 'notes', 'created_at', 'updated_at'],
  });

  // ディレクトリが存在しない場合は作成
  const dir = dirname(CSV_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(CSV_FILE_PATH, csvContent, 'utf-8');
}

/**
 * notesフィールドからDMメッセージを抽出
 */
function extractDMMessage(notes: string | null | undefined): string | null {
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

/**
 * 優先チャネルを取得
 */
function getPreferredChannel(notes: string | null | undefined): 'TG' | 'Email' {
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
  console.log('🚀 EN版DM送信スクリプト開始（CSVベース）\n');
  console.log('='.repeat(80));
  console.log('📋 処理内容:');
  console.log('  1. CSVファイルから準備済みDMを取得（market=EN, status=New）');
  console.log('  2. Telegram/Emailで送信');
  console.log('  3. 送信状態を更新（status=Contacted）');
  console.log('  4. CSVファイルに保存');
  console.log('='.repeat(80) + '\n');

  // 環境変数チェック
  const requiredEnvVars = [
    'TELEGRAM_BOT_TOKEN_EN',
    'RESEND_API_KEY',
  ];
  
  const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);
  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }

  // CSVファイルを読み込む
  console.log(`📂 CSVファイル読み込み中: ${CSV_FILE_PATH}\n`);
  const allRows = readCSV();

  if (allRows.length === 0) {
    console.log('⚠️ CSVファイルにデータがありません。');
    console.log('   先に complete-6markets-whop-and-send-dm.ts を実行してデータを準備してください。\n');
    return;
  }

  // 準備済みDMを取得（market=EN, status=New）
  const candidates = allRows.filter(row => 
    row.market === 'EN' && row.status === 'New'
  );

  if (candidates.length === 0) {
    console.log('⚠️ 準備済みDMが見つかりません（market=EN, status=New）。\n');
    return;
  }

  // テストモード確認
  const testMode = process.env.TEST_MODE === 'true';
  const maxSendCount = testMode ? 2 : 1000;

  if (testMode) {
    console.log('🧪 テストモード: 最大2件のみ送信します\n');
  }

  console.log(`📤 送信開始: ${Math.min(candidates.length, maxSendCount)}件\n`);

  let sentCount = 0;
  let failedCount = 0;
  const errors: Array<{ username: string; error: string }> = [];

  // 各ユーザーに対してDM送信
  for (let i = 0; i < Math.min(candidates.length, maxSendCount); i++) {
    const candidate = candidates[i];
    const progress = `[${i + 1}/${Math.min(candidates.length, maxSendCount)}]`;
    
    try {
      // DMメッセージを抽出
      const dmMessage = extractDMMessage(candidate.notes);
      if (!dmMessage) {
        console.warn(`${progress} ⚠️ ${candidate.username}: DMメッセージが見つかりません`);
        failedCount++;
        errors.push({ username: candidate.username, error: 'DMメッセージが見つかりません' });
        continue;
      }

      // 優先チャネルを取得
      const preferredChannel = getPreferredChannel(candidate.notes);
      
      let sendSuccess = false;
      let messageId: number | undefined;
      let sendError: string | undefined;

      // Telegram送信
      if (preferredChannel === 'TG' && candidate.telegram_user_id) {
        try {
          const result = await sendTelegramDM({
            market: 'EN',
            userId: candidate.telegram_user_id,
            message: dmMessage,
            parseMode: 'HTML',
          });

          if (result.success) {
            sendSuccess = true;
            messageId = result.messageId;
            console.log(`${progress} ✅ ${candidate.username}: Telegram送信成功 (Message ID: ${messageId})`);
          } else {
            sendError = result.error || 'Unknown error';
            console.warn(`${progress} ⚠️ ${candidate.username}: Telegram送信失敗 - ${sendError}`);
            
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
                console.log(`${progress} ✅ ${candidate.username}: Email送信成功（フォールバック）`);
              } catch (emailError: any) {
                sendError = `Telegram失敗 + Email失敗: ${emailError.message}`;
                console.error(`${progress} ❌ ${candidate.username}: Email送信も失敗 - ${emailError.message}`);
              }
            }
          }
        } catch (error: any) {
          sendError = error.message || 'Unknown error';
          console.error(`${progress} ❌ ${candidate.username}: Telegram送信エラー - ${sendError}`);
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
          console.log(`${progress} ✅ ${candidate.username}: Email送信成功`);
        } catch (error: any) {
          sendError = error.message || 'Unknown error';
          console.error(`${progress} ❌ ${candidate.username}: Email送信エラー - ${sendError}`);
        }
      }
      else {
        sendError = '連絡先情報がありません（Telegram User IDもEmailもなし）';
        console.warn(`${progress} ⚠️ ${candidate.username}: ${sendError}`);
      }

      // 送信成功時のみ状態を更新
      if (sendSuccess) {
        // statusを'Contacted'に更新
        candidate.status = 'Contacted';
        candidate.updated_at = new Date().toISOString();
        sentCount++;
      } else {
        failedCount++;
        errors.push({ username: candidate.username, error: sendError || 'Unknown error' });
      }

      // レート制限対応: 送信間隔を制御（最後の1件以外）
      if (i < Math.min(candidates.length, maxSendCount) - 1) {
        await new Promise(resolve => setTimeout(resolve, SEND_INTERVAL_MS));
      }
    } catch (error: any) {
      console.error(`${progress} ❌ ${candidate.username}: 処理エラー - ${error.message}`);
      failedCount++;
      errors.push({ username: candidate.username, error: error.message });
    }
  }

  // CSVファイルを更新
  console.log('\n💾 CSVファイルを更新中...\n');
  writeCSV(allRows);
  console.log('✅ CSVファイル更新完了\n');

  // 結果レポート
  console.log('='.repeat(80));
  console.log('📊 送信結果サマリー');
  console.log('='.repeat(80));
  console.log(`✅ 送信成功: ${sentCount}件`);
  console.log(`❌ 送信失敗: ${failedCount}件`);
  console.log(`📈 成功率: ${candidates.length > 0 ? ((sentCount / candidates.length) * 100).toFixed(1) : 0}%\n`);

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
  const emailContent = `🚀 EN版DM送信完了（CSVベース）

⏱️ 実行時刻: ${new Date().toISOString()}

## 📊 送信結果

- **送信対象**: ${candidates.length}件
- **送信成功**: ${sentCount}件
- **送信失敗**: ${failedCount}件
- **成功率**: ${candidates.length > 0 ? ((sentCount / candidates.length) * 100).toFixed(1) : 0}%

## 📋 処理内容

1. CSVファイルから準備済みDMを取得（market=EN, status=New）
2. Telegram/Emailで送信
3. 送信状態を更新（status=Contacted）
4. CSVファイルに保存

${errors.length > 0 ? `\n## ⚠️ エラー詳細\n\n${errors.slice(0, 20).map(({ username, error }) => `- ${username}: ${error}`).join('\n')}${errors.length > 20 ? `\n... 他${errors.length - 20}件のエラー` : ''}\n` : ''}

詳細はログを確認してください。`;

  try {
    await sendResendEmail({
      from: 'COO兼CTO <noreply@cryptotradeacademy.io>',
      to: CEO_EMAIL,
      subject: '🚀 EN版DM送信完了（CSVベース）',
      html: emailContent.replace(/\n/g, '<br>'),
    });
    console.log('✅ CEOにメール報告完了\n');
  } catch (error: any) {
    console.warn(`⚠️ CEOメール通知失敗: ${error.message}\n`);
  }

  console.log('='.repeat(80));
  console.log('✅ EN版DM送信スクリプト完了（CSVベース）');
  console.log('='.repeat(80) + '\n');
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
