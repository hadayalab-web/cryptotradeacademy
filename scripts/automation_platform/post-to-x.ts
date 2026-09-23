#!/usr/bin/env tsx
/**
 * X (Twitter) 投稿スクリプト
 * 
 * 生成された投稿コンテンツをX (Twitter) に投稿
 * Twitter API v2を使用
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const POSTING_CONTENT_DIR = join(__dirname, '..', 'data', 'posting-content');
const CONTENT_FILE = process.argv[2]; // 投稿コンテンツファイル

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
 * X API v2でツイートを投稿
 */
async function postToX(content: string, mediaIds?: string[]): Promise<{
  success: boolean;
  tweetId?: string;
  error?: string;
}> {
  const X_API_KEY = process.env.X_API_KEY;
  const X_API_SECRET = process.env.X_API_SECRET;
  const X_ACCESS_TOKEN = process.env.X_ACCESS_TOKEN;
  const X_ACCESS_SECRET = process.env.X_ACCESS_SECRET;
  const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN;

  if (!X_BEARER_TOKEN && (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_SECRET)) {
    throw new Error('X (Twitter) API認証情報が設定されていません。X_BEARER_TOKENまたはX_API_KEY/X_API_SECRET/X_ACCESS_TOKEN/X_ACCESS_SECRETを設定してください。');
  }

  // Bearer Tokenを使用（推奨）
  if (X_BEARER_TOKEN) {
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${X_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: content,
        ...(mediaIds && mediaIds.length > 0 ? { media: { media_ids: mediaIds } } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `X API error: ${response.status} ${response.statusText} - ${errorText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      tweetId: data.data?.id,
    };
  }

  // OAuth 1.0aを使用（Bearer Tokenがない場合）
  // 注意: 実装が複雑なため、Bearer Tokenの使用を推奨
  throw new Error('OAuth 1.0a認証は未実装です。X_BEARER_TOKENを設定してください。');
}

/**
 * 画像をアップロードしてmedia_idを取得
 */
async function uploadMediaToX(imagePath: string): Promise<string | null> {
  const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN;
  
  if (!X_BEARER_TOKEN) {
    console.warn('⚠️ X_BEARER_TOKENが設定されていないため、画像アップロードをスキップします');
    return null;
  }

  if (!fs.existsSync(imagePath)) {
    console.warn(`⚠️ 画像ファイルが見つかりません: ${imagePath}`);
    return null;
  }

  // 画像をBase64に変換
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  // メディアアップロード（Twitter API v1.1）
  const response = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${X_BEARER_TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      media_data: base64Image,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.warn(`⚠️ 画像アップロード失敗: ${errorText}`);
    return null;
  }

  const data = await response.json();
  return data.media_id_string || null;
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
  console.log('🐦 X (Twitter) 投稿スクリプト開始\n');
  console.log('='.repeat(80));

  if (!CONTENT_FILE) {
    console.error('❌ 投稿コンテンツファイルが指定されていません');
    console.log('\n使用方法:');
    console.log('  npx tsx scripts/post-to-x.ts <投稿コンテンツファイルのパス>');
    console.log('\n例:');
    console.log('  npx tsx scripts/post-to-x.ts data/posting-content/x-vsl-post-EN-1234567890.json');
    process.exit(1);
  }

  // 投稿コンテンツを読み込む
  const postingContent = loadPostingContentFromFile(CONTENT_FILE);

  if (postingContent.platform !== 'x') {
    console.warn(`⚠️ このコンテンツはX用ではありません（platform: ${postingContent.platform}）`);
  }

  console.log(`📝 投稿コンテンツ:`);
  console.log(`   コンテンツタイプ: ${postingContent.contentType}`);
  console.log(`   市場: ${postingContent.market}`);
  console.log(`   長さ: ${postingContent.content.length}文字`);
  console.log(`   サムネイル: ${postingContent.thumbnailPath || 'なし'}\n`);

  // 画像をアップロード（ある場合）
  let mediaId: string | null = null;
  if (postingContent.thumbnailPath && fs.existsSync(postingContent.thumbnailPath)) {
    console.log('📸 画像をアップロード中...');
    mediaId = await uploadMediaToX(postingContent.thumbnailPath);
    if (mediaId) {
      console.log(`✅ 画像アップロード成功 (Media ID: ${mediaId})\n`);
    }
  }

  // Xに投稿
  console.log('🐦 X (Twitter) に投稿中...');
  
  try {
    const result = await postToX(
      postingContent.content,
      mediaId ? [mediaId] : undefined
    );

    if (result.success) {
      console.log(`✅ X投稿成功 (Tweet ID: ${result.tweetId})\n`);
    } else {
      console.error(`❌ X投稿失敗: ${result.error}\n`);
    }

    // 結果レポート
    console.log('='.repeat(80));
    console.log('📊 投稿結果');
    console.log('='.repeat(80));
    console.log(`🐦 X (Twitter): ${result.success ? `✅ 成功 (Tweet ID: ${result.tweetId})` : `❌ 失敗 (${result.error})`}`);
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
    console.log('✅ X (Twitter) 投稿スクリプト完了\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    process.exit(1);
  });
