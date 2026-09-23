#!/usr/bin/env tsx
/**
 * CEO宛てテストDM送信スクリプト（CSV + JSONベース）
 * 
 * CSVファイルからユーザーリストを読み込み、JSONファイルからDMメッセージを取得して
 * CEOにテスト送信（CEO宛て以外は送信しない）
 * - Email: Resend → admin@cryptotradeacademy.io
 * - Telegram: EN Bot → TELEGRAM_ADMIN_ID (6770292419)
 */

import { sendTelegramDM, sendResendEmail } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const CSV_FILE_PATH = join(__dirname, '..', 'data', 'user-list-en.csv');
const DM_MESSAGES_FILE_PATH = join(__dirname, '..', 'data', 'dm-messages-en.json');
const CEO_EMAIL = 'admin@cryptotradeacademy.io';
const CEO_TELEGRAM_USER_ID = process.env.TELEGRAM_ADMIN_ID || '6770292419';

interface CandidateRow {
  username: string;
  display_name?: string;
  market: string;
  telegram_user_id?: string;
  email?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

interface DMMessage {
  username: string;
  message_id: string;
  created_at: string;
  created_by: string;
  preferred_channel: string;
  dm_message: string;
}

interface DMMessagesFile {
  messages: DMMessage[];
}

function readCSV(): CandidateRow[] {
  if (!fs.existsSync(CSV_FILE_PATH)) {
    return [];
  }

  const content = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
  }) as CandidateRow[];
}

function readDMMessages(): DMMessagesFile {
  if (!fs.existsSync(DM_MESSAGES_FILE_PATH)) {
    return { messages: [] };
  }

  const content = fs.readFileSync(DM_MESSAGES_FILE_PATH, 'utf-8');
  try {
    return JSON.parse(content) as DMMessagesFile;
  } catch (e) {
    return { messages: [] };
  }
}

async function main() {
  console.log('🚀 CEO宛てテストDM送信スクリプト開始（CSVベース）\n');
  console.log('='.repeat(80));
  console.log('📋 処理内容:');
  console.log('  1. CSVファイルから準備済みDMを取得（market=EN, status=New）');
  console.log('  2. 最初の1件をCEOにテスト送信');
  console.log('     - Email: Resend → admin@cryptotradeacademy.io');
  console.log('     - Telegram: EN Bot → TELEGRAM_ADMIN_ID');
  console.log('  3. 送信結果をレポート');
  console.log('='.repeat(80) + '\n');

  // 環境変数チェック
  const requiredEnvVars = [
    'TELEGRAM_BOT_TOKEN_EN',
    'RESEND_API_KEY',
    'TELEGRAM_ADMIN_ID'
  ];
  
  const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);
  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }

  // CSVファイルとJSONファイルを読み込む
  const allRows = readCSV();
  const dmMessagesFile = readDMMessages();
  
  // 準備済みユーザーを取得（market=EN, status=New）
  const candidates = allRows
    .filter(row => row.market === 'EN' && row.status === 'New')
    .sort((a, b) => {
      // 最新のものを取得（created_atでソート）
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

  if (candidates.length === 0) {
    console.log('⚠️ 準備済みユーザーが見つかりません。');
    console.log('   CSVファイルにデータを追加してください。\n');
    return;
  }

  // DMメッセージが存在するユーザーを探す
  const candidate = candidates.find(c => 
    dmMessagesFile.messages.some(msg => msg.username === c.username)
  );

  if (!candidate) {
    console.log('⚠️ DMメッセージが見つかりません。');
    console.log('   Gemini CMOがDMメッセージを作成してください。');
    console.log('   実行: npx tsx scripts/generate-dm-messages-en.ts\n');
    return;
  }

  // DMメッセージを取得
  const dmMessageData = dmMessagesFile.messages.find(msg => msg.username === candidate.username);
  if (!dmMessageData || !dmMessageData.dm_message) {
    throw new Error('DMメッセージが見つかりません');
  }

  const dmMessage = dmMessageData.dm_message;
  console.log(`📋 テスト送信対象: ${candidate.username} (${candidate.display_name || 'N/A'})\n`);
  console.log(`📝 DMメッセージ（${dmMessage.length}文字）:\n${dmMessage.substring(0, 200)}...\n`);

  const results = {
    email: { success: false, error: '' },
    telegram: { success: false, error: '', messageId: undefined as number | undefined },
  };

  // Email送信（Gmailはiframeをブロックするため、VSL URLをリンクに変換）
  console.log('📧 Email送信中...');
  try {
    // VSL URLを取得（YouTube優先、なければHeyGen）
    const youtubeVslUrl = process.env.YOUTUBE_VSL_URL;
    const heygenVslUrl = process.env.HEYGEN_VSL_SHARE_URL || 'https://app.heygen.com/videos/3aaf47b98f4b49c59c14999a16038af3';
    const vslUrl = youtubeVslUrl || heygenVslUrl;
    
    const emailMessage = dmMessage
      // iframeタグをクリック可能なボタンリンクに変換
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, () => {
        return `<div style="margin: 20px 0; text-align: center;">
          <a href="${vslUrl}" style="display: inline-block; padding: 15px 30px; background-color: #ff0000; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
            ${youtubeVslUrl ? '▶️ Watch on YouTube' : '📹 Watch Our VSL Video'}
          </a>
        </div>`;
      })
      // YouTube埋め込みURLを共有リンクに変換（念のため）
      .replace(/https:\/\/www\.youtube\.com\/embed\/([a-zA-Z0-9_-]+)/g, (match, videoId) => {
        return `https://www.youtube.com/watch?v=${videoId}`;
      })
      // 改行を<br>に変換
      .replace(/\n/g, '<br>');

    await sendResendEmail({
      from: 'Trap Defence BTC <noreply@cryptotradeacademy.io>',
      to: CEO_EMAIL,
      subject: '🧪 [TEST] Trap Defence BTC - Exclusive Offer',
      html: emailMessage,
    });
    results.email.success = true;
    console.log('✅ Email送信成功\n');
  } catch (error: any) {
    results.email.error = error.message || 'Unknown error';
    console.error(`❌ Email送信失敗: ${results.email.error}\n`);
  }

  // Telegram送信（iframeタグを削除し、VSL URLをテキストリンクに変換）
  console.log('📱 Telegram送信中...');
  try {
    // VSL URLを取得（YouTube優先、なければHeyGen）
    const youtubeVslUrl = process.env.YOUTUBE_VSL_URL;
    const heygenVslUrl = process.env.HEYGEN_VSL_SHARE_URL || 'https://app.heygen.com/videos/3aaf47b98f4b49c59c14999a16038af3';
    const vslUrl = youtubeVslUrl || heygenVslUrl;
    
    // Telegram用メッセージ: iframeタグを削除し、VSL URLをテキストリンクに変換
    let telegramMessage = dmMessage
      // iframeタグ全体を削除
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      // YouTube埋め込みURLを共有リンクに変換
      .replace(/https:\/\/www\.youtube\.com\/embed\/([a-zA-Z0-9_-]+)/g, (match, videoId) => {
        return `https://www.youtube.com/watch?v=${videoId}`;
      })
      // HeyGen埋め込みURLを共有リンクURLに置換
      .replace(/https:\/\/app\.heygen\.com\/embedded-player\/[^\s"<>]+/g, vslUrl)
      // 空行を整理
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
    
    // VSLリンクが含まれていない場合、追加する（"Watch this brief VSL"の後に追加）
    if (!telegramMessage.includes(vslUrl)) {
      // "Watch this brief VSL"または類似のテキストの後にVSLリンクを追加
      telegramMessage = telegramMessage.replace(
        /(Watch this brief VSL[^:]*:?)/gi,
        `$1 ${vslUrl}`
      );
      
      // それでも含まれていない場合は、メッセージの最後に追加
      if (!telegramMessage.includes(vslUrl)) {
        telegramMessage = `${telegramMessage}\n\n📹 Watch VSL: ${vslUrl}`;
      }
    }
    
    const telegramResult = await sendTelegramDM({
      market: 'EN',
      userId: CEO_TELEGRAM_USER_ID,
      message: `🧪 [TEST]\n\n${telegramMessage}`,
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
  const reportContent = `🧪 CEO宛てテストDM送信結果（CSVベース）

⏱️ 実行時刻: ${new Date().toISOString()}

## 📊 送信結果

- **Email送信**: ${results.email.success ? '✅ 成功' : `❌ 失敗 (${results.email.error})`}
- **Telegram送信**: ${results.telegram.success ? `✅ 成功 (Message ID: ${results.telegram.messageId})` : `❌ 失敗 (${results.telegram.error})`}

## 📋 テスト送信内容

- **対象ユーザー**: ${candidate.username} (${candidate.display_name || 'N/A'})
- **DMメッセージID**: ${dmMessageData?.message_id || 'N/A'}
- **作成者**: ${dmMessageData?.created_by || 'N/A'}
- **優先チャネル**: ${dmMessageData?.preferred_channel || 'N/A'}
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
      subject: '🧪 CEO宛てテストDM送信結果（CSVベース）',
      html: reportContent.replace(/\n/g, '<br>'),
    });
    console.log('✅ CEOに結果レポートを送信しました\n');
  } catch (error: any) {
    console.warn(`⚠️ 結果レポート送信失敗: ${error.message}\n`);
  }
}

main()
  .then(() => {
    console.log('='.repeat(80));
    console.log('✅ CEO宛てテストDM送信スクリプト完了（CSVベース）');
    console.log('='.repeat(80) + '\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    process.exit(1);
  });
