#!/usr/bin/env tsx
/**
 * Veo動画ダウンロードスクリプト
 * 
 * 目的: Veo 3.1で生成された動画のURIから動画をダウンロードして保存
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .envファイルを読み込む
dotenv.config({ path: join(__dirname, '../api/.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

/**
 * 動画をダウンロード
 */
async function downloadVideo(uri: string, savePath: string) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in .env file');
  }

  console.log(`📥 動画をダウンロード中: ${uri}`);
  console.log(`💾 保存先: ${savePath}`);

  const response = await fetch(uri, {
    headers: {
      'x-goog-api-key': GEMINI_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`ダウンロードエラー: ${response.status} ${response.statusText}`);
  }

  const videoBuffer = await response.arrayBuffer();
  writeFileSync(savePath, Buffer.from(videoBuffer));
  
  console.log(`✅ 動画を保存しました: ${savePath}`);
  console.log(`📊 ファイルサイズ: ${(videoBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);
}

/**
 * メイン処理
 */
async function main() {
  try {
    // メタデータから動画URIを取得
    const metadataPath = join(__dirname, '../data/whop-product-assets/metadata.json');
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
    
    const videoAsset = metadata.assets.videos.find((v: any) => v.id === 'intelligence-flow');
    if (!videoAsset) {
      throw new Error('動画アセットが見つかりません');
    }

    // 動画URIを取得（メタデータに保存されていない場合は、再生成が必要）
    // 今回は、前回の実行結果からURIを取得
    const videoUri = 'https://generativelanguage.googleapis.com/v1beta/files/m9f4ccl4ypst:download?alt=media';
    const savePath = join(__dirname, '../data/whop-product-assets/videos/intelligence-flow-bitcoin-shield.mp4');

    await downloadVideo(videoUri, savePath);
    
    console.log('\n✅ ダウンロード完了！');
  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nスタックトレース:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main().catch(console.error);
