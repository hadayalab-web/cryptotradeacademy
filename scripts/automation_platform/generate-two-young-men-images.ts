#!/usr/bin/env tsx
/**
 * Two Young Men画像生成スクリプト
 * 
 * 目的: NanoBanana Proを使用して、LP用のTwo Young Men画像を生成
 * - Trader A（損失）: 感情的な失敗をするトレーダー
 * - Trader B（成功）: 防御を固めて成功するトレーダー
 */

import { callNanoBananaPro } from '../api/unified-api.js';
import { writeFileSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 出力ディレクトリ
const OUTPUT_DIR = join(__dirname, '../data/lp-assets');
const IMAGES_DIR = join(OUTPUT_DIR, 'images');
const LP_PUBLIC_DIR = join(__dirname, '../hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-en/public/images');

// プロンプト定義
const PROMPTS = {
  traderA: `A desperate trader sitting in a dark room, frustrated expression, looking at a red declining chart on multiple monitors. The room is dimly lit with dramatic lighting. The trader's face shows stress and disappointment. Red bearish candlesticks dominate the screens. The atmosphere is tense and dramatic. Professional photography style, cinematic lighting, 8k resolution, photorealistic.`,
  
  traderB: `A confident trader sitting in a bright modern office, relaxed expression, sipping coffee while looking at a green rising chart on a sleek monitor. The trader's face shows calm confidence and satisfaction. Green bullish candlesticks dominate the screen. The atmosphere is calm and professional. Natural lighting from large windows, modern workspace, 8k resolution, photorealistic.`,
};

/**
 * ディレクトリを作成
 */
function ensureDirectories() {
  [OUTPUT_DIR, IMAGES_DIR, LP_PUBLIC_DIR].forEach(dir => {
    try {
      mkdirSync(dir, { recursive: true });
      console.log(`✅ ディレクトリ作成: ${dir}`);
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  });
}

/**
 * Trader A画像を生成
 */
async function generateTraderAImage() {
  console.log('\n🎨 Trader A（損失）画像を生成中...');
  console.log(`プロンプト: ${PROMPTS.traderA.substring(0, 100)}...`);

  try {
    const savePath = join(IMAGES_DIR, 'trader-a-lost-profits.png');
    const result = await callNanoBananaPro(PROMPTS.traderA, {
      aspectRatio: '16:9',
      imageSize: '4K',
      savePath
    });

    console.log(`✅ Trader A画像生成成功:`);
    console.log(`  - 画像数: ${result.images.length}`);
    result.images.forEach((img, idx) => {
      console.log(`  - 画像 ${idx + 1}:`);
      console.log(`    - MIME Type: ${img.mimeType}`);
      console.log(`    - 保存先: ${img.filePath || 'N/A'}`);
    });

    // LPのpublicディレクトリにコピー
    if (result.images[0]?.filePath) {
      const publicPath = join(LP_PUBLIC_DIR, 'trader-a-lost-profits.png');
      copyFileSync(result.images[0].filePath, publicPath);
      console.log(`✅ LP publicディレクトリにコピー: ${publicPath}`);
    }

    return result;
  } catch (error: any) {
    console.error(`❌ Trader A画像生成失敗: ${error.message}`);
    throw error;
  }
}

/**
 * Trader B画像を生成
 */
async function generateTraderBImage() {
  console.log('\n🎨 Trader B（成功）画像を生成中...');
  console.log(`プロンプト: ${PROMPTS.traderB.substring(0, 100)}...`);

  try {
    const savePath = join(IMAGES_DIR, 'trader-b-earned-profits.png');
    const result = await callNanoBananaPro(PROMPTS.traderB, {
      aspectRatio: '16:9',
      imageSize: '4K',
      savePath
    });

    console.log(`✅ Trader B画像生成成功:`);
    console.log(`  - 画像数: ${result.images.length}`);
    result.images.forEach((img, idx) => {
      console.log(`  - 画像 ${idx + 1}:`);
      console.log(`    - MIME Type: ${img.mimeType}`);
      console.log(`    - 保存先: ${img.filePath || 'N/A'}`);
    });

    // LPのpublicディレクトリにコピー
    if (result.images[0]?.filePath) {
      const publicPath = join(LP_PUBLIC_DIR, 'trader-b-earned-profits.png');
      copyFileSync(result.images[0].filePath, publicPath);
      console.log(`✅ LP publicディレクトリにコピー: ${publicPath}`);
    }

    return result;
  } catch (error: any) {
    console.error(`❌ Trader B画像生成失敗: ${error.message}`);
    throw error;
  }
}

/**
 * メタデータを保存
 */
function saveMetadata(traderA: any, traderB: any) {
  const metadata = {
    generatedAt: new Date().toISOString(),
    purpose: 'Two Young Menストーリーの視覚化',
    images: [
      {
        id: 'trader-a',
        name: 'Trader A - Lost Profits',
        file: 'trader-a-lost-profits.png',
        prompt: PROMPTS.traderA,
        description: '感情的な失敗をするトレーダー。損失を被り、フラストレーションを感じている様子',
        usage: 'Hero SectionのTwo Young Menセクション（左側）',
        generated: true,
      },
      {
        id: 'trader-b',
        name: 'Trader B - Earned Profits',
        file: 'trader-b-earned-profits.png',
        prompt: PROMPTS.traderB,
        description: '防御を固めて成功するトレーダー。コーヒーを飲みながらリラックスしている様子',
        usage: 'Hero SectionのTwo Young Menセクション（右側）',
        generated: true,
      },
    ],
  };

  const metadataPath = join(OUTPUT_DIR, 'two-young-men-metadata.json');
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
  console.log(`✅ メタデータ保存: ${metadataPath}`);
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 Two Young Men画像生成を開始...\n');

  try {
    // ディレクトリ作成
    ensureDirectories();

    // 画像生成
    const traderA = await generateTraderAImage();
    const traderB = await generateTraderBImage();

    // メタデータ保存
    saveMetadata(traderA, traderB);

    console.log('\n✅ すべての画像生成が完了しました！');
    console.log('\n📋 次のステップ:');
    console.log('1. 生成された画像を確認: data/lp-assets/images/');
    console.log('2. LPのpublicディレクトリにコピー済み: hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-en/public/images/');
    console.log('3. TwoYoungMenコンポーネントが自動的に画像を読み込みます');
  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

// スクリプト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
