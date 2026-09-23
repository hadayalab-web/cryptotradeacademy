#!/usr/bin/env tsx
/**
 * Telegramチャンネル投稿スクリプト
 * 
 * 生成された投稿コンテンツをTelegramチャンネルに投稿
 * サムネイル画像も含めて投稿可能
 */

import { sendTelegramChannelPost } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const POSTING_CONTENT_DIR = join(__dirname, '..', 'data', 'posting-content');
const MARKET = process.argv[2] || 'EN';
const CONTENT_FILE = process.argv[3]; // 投稿コンテンツファイル（オプション）

interface PostingContent {
  platform: 'telegram' | 'x' | 'discord';
  contentType: string;
  market: string;
  content: string;
  thumbnailPath?: string;
  hashtags?: string[];
  created_at: string;
  created_by: string;
}

/**
 * 最新の投稿コンテンツを読み込む
 */
function loadLatestPostingContent(market: string, contentType?: string): PostingContent | null {
  if (!fs.existsSync(POSTING_CONTENT_DIR)) {
    return null;
  }

  const files = fs.readdirSync(POSTING_CONTENT_DIR)
    .filter(file => file.startsWith('telegram-') && file.includes(market))
    .filter(file => !contentType || file.includes(contentType))
    .map(file => ({
      path: join(POSTING_CONTENT_DIR, file),
      mtime: fs.statSync(join(POSTING_CONTENT_DIR, file)).mtime,
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  if (files.length === 0) {
    return null;
  }

  const content = fs.readFileSync(files[0].path, 'utf-8');
  return JSON.parse(content) as PostingContent;
}

/**
 * 指定されたファイルから投稿コンテンツを読み込む
 */
function loadPostingContentFromFile(filepath: string): PostingContent {
  if (!fs.existsSync(filepath)) {
    throw new Error(`投稿コンテンツファイルが見つかりません: ${filepath}`);
  }

  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content) as PostingContent;
}

async function main() {
  console.log('📱 Telegramチャンネル投稿スクリプト開始\n');
  console.log('='.repeat(80));
  console.log('📋 処理内容:');
  console.log(`  1. 市場: ${MARKET}`);
  console.log('  2. 投稿コンテンツを読み込み');
  console.log('  3. Telegramチャンネルに投稿');
  console.log('  4. 結果をレポート');
  console.log('='.repeat(80) + '\n');

  // 環境変数チェック
  const requiredEnvVars = [`TELEGRAM_BOT_TOKEN_${MARKET}`];
  const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);
  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }

  // 投稿コンテンツを読み込む
  let postingContent: PostingContent;
  
  if (CONTENT_FILE) {
    postingContent = loadPostingContentFromFile(CONTENT_FILE);
  } else {
    const latest = loadLatestPostingContent(MARKET);
    if (!latest) {
      throw new Error(`投稿コンテンツが見つかりません。先に生成してください: npx tsx scripts/generate-posting-content.ts ${MARKET}`);
    }
    postingContent = latest;
  }

  console.log(`📝 投稿コンテンツ:`);
  console.log(`   プラットフォーム: ${postingContent.platform}`);
  console.log(`   コンテンツタイプ: ${postingContent.contentType}`);
  console.log(`   市場: ${postingContent.market}`);
  console.log(`   長さ: ${postingContent.content.length}文字`);
  console.log(`   サムネイル: ${postingContent.thumbnailPath || 'なし'}\n`);

  // Telegramチャンネルに投稿
  console.log('📱 Telegramチャンネルに投稿中...');
  
  try {
    const result = await sendTelegramChannelPost({
      market: MARKET as 'EN' | 'AR' | 'KO' | 'JA' | 'ES' | 'PT-BR',
      message: postingContent.content,
      parseMode: 'HTML',
      photoPath: postingContent.thumbnailPath && fs.existsSync(postingContent.thumbnailPath) 
        ? postingContent.thumbnailPath 
        : undefined,
      disableWebPagePreview: false,
    });

    if (result.success) {
      console.log(`✅ Telegram投稿成功 (Message ID: ${result.messageId})\n`);
    } else {
      console.error(`❌ Telegram投稿失敗: ${result.error}\n`);
    }

    // 結果レポート
    console.log('='.repeat(80));
    console.log('📊 投稿結果');
    console.log('='.repeat(80));
    console.log(`📱 Telegram: ${result.success ? `✅ 成功 (Message ID: ${result.messageId})` : `❌ 失敗 (${result.error})`}`);
    console.log('='.repeat(80) + '\n');
  } catch (error: any) {
    console.error(`❌ 投稿エラー: ${error.message}\n`);
    if (error.stack) {
      console.error('スタックトレース:', error.stack.substring(0, 500));
    }
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('✅ Telegramチャンネル投稿スクリプト完了\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    process.exit(1);
  });
