#!/usr/bin/env tsx
/**
 * VSLサムネイル作成スクリプト
 * 
 * 提供された画像とwhop-product-assetsの素材を組み合わせて、
 * YouTube/Email/Telegram用のVSLサムネイルを作成
 */

import sharp from 'sharp';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const BASE_IMAGE_PATH = process.argv[2] || join(__dirname, '..', 'data', 'vsl-thumbnail-base.jpg');
const ASSETS_DIR = join(__dirname, '..', 'data', 'whop-product-assets', 'images');
const OUTPUT_DIR = join(__dirname, '..', 'data', 'vsl-thumbnails');

// 出力ディレクトリを作成
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

interface ThumbnailConfig {
  name: string;
  width: number;
  height: number;
  overlay?: {
    image: string;
    position: { x: number; y: number };
    size?: { width: number; height: number };
  }[];
  text?: {
    content: string;
    position: { x: number; y: number };
    fontSize: number;
    color: string;
    fontWeight?: 'normal' | 'bold';
  }[];
}

const thumbnailConfigs: ThumbnailConfig[] = [
  {
    name: 'youtube-thumbnail',
    width: 1280,
    height: 720,
    overlay: [
      {
        image: join(ASSETS_DIR, 'cryptoquant-authority-data-reliability.png'),
        position: { x: 50, y: 50 },
        size: { width: 200, height: 100 },
      },
      {
        image: join(ASSETS_DIR, 'ai-hybrid-nexus-intelligence.png'),
        position: { x: 50, y: 170 },
        size: { width: 200, height: 100 },
      },
    ],
    text: [
      {
        content: 'Why Most Traders Lose Money',
        position: { x: 640, y: 200 },
        fontSize: 64,
        color: '#FFFFFF',
        fontWeight: 'bold',
      },
      {
        content: 'The Hidden Trap Defense Protocol',
        position: { x: 640, y: 280 },
        fontSize: 48,
        color: '#FF0000',
        fontWeight: 'bold',
      },
      {
        content: '▶ Watch Now',
        position: { x: 640, y: 600 },
        fontSize: 56,
        color: '#FF0000',
        fontWeight: 'bold',
      },
    ],
  },
  {
    name: 'email-thumbnail',
    width: 600,
    height: 400,
    overlay: [
      {
        image: join(ASSETS_DIR, 'telegram-smartphone-convenience.png'),
        position: { x: 400, y: 200 },
        size: { width: 150, height: 150 },
      },
    ],
    text: [
      {
        content: 'Trap Defence BTC',
        position: { x: 300, y: 150 },
        fontSize: 36,
        color: '#FFFFFF',
        fontWeight: 'bold',
      },
      {
        content: 'Protect Your Trades',
        position: { x: 300, y: 200 },
        fontSize: 24,
        color: '#FF0000',
        fontWeight: 'bold',
      },
    ],
  },
  {
    name: 'telegram-thumbnail',
    width: 1200,
    height: 630,
    overlay: [
      {
        image: join(ASSETS_DIR, 'core-intelligence-hexagonal-shield.png'),
        position: { x: 50, y: 50 },
        size: { width: 150, height: 150 },
      },
    ],
    text: [
      {
        content: 'Trap Defence BTC',
        position: { x: 600, y: 250 },
        fontSize: 56,
        color: '#FFFFFF',
        fontWeight: 'bold',
      },
      {
        content: 'Watch Our VSL',
        position: { x: 600, y: 320 },
        fontSize: 40,
        color: '#FF0000',
        fontWeight: 'bold',
      },
    ],
  },
];

/**
 * SVGテキストを生成
 */
function createTextSVG(text: string, x: number, y: number, fontSize: number, color: string, fontWeight: 'normal' | 'bold' = 'normal'): string {
  return `
    <svg width="${x + 1000}" height="${y + 200}">
      <text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${color}" stroke="#000000" stroke-width="2">
        ${text}
      </text>
    </svg>
  `;
}

/**
 * サムネイルを作成
 */
async function createThumbnail(config: ThumbnailConfig, baseImagePath: string): Promise<string> {
  console.log(`📸 ${config.name}を作成中...`);

  // ベース画像を読み込み、リサイズ
  let image = sharp(baseImagePath)
    .resize(config.width, config.height, {
      fit: 'cover',
      position: 'center',
    });

  // オーバーレイ画像を追加
  if (config.overlay) {
    for (const overlay of config.overlay) {
      if (fs.existsSync(overlay.image)) {
        const overlaySize = overlay.size || { width: 200, height: 200 };
        const overlayImage = await sharp(overlay.image)
          .resize(overlaySize.width, overlaySize.height)
          .toBuffer();

        image = image.composite([
          {
            input: overlayImage,
            left: overlay.position.x,
            top: overlay.position.y,
          },
        ]);
      } else {
        console.warn(`⚠️ オーバーレイ画像が見つかりません: ${overlay.image}`);
      }
    }
  }

  // テキストを追加
  if (config.text) {
    const textBuffers = await Promise.all(
      config.text.map((text) =>
        sharp(Buffer.from(createTextSVG(text.content, text.position.x, text.position.y, text.fontSize, text.color, text.fontWeight)))
          .resize(config.width, config.height)
          .toBuffer()
      )
    );

    for (const textBuffer of textBuffers) {
      image = image.composite([
        {
          input: textBuffer,
          left: 0,
          top: 0,
        },
      ]);
    }
  }

  // 出力パス
  const outputPath = join(OUTPUT_DIR, `${config.name}.jpg`);

  // 保存
  await image
    .jpeg({ quality: 90 })
    .toFile(outputPath);

  console.log(`✅ ${config.name}を保存: ${outputPath}`);
  return outputPath;
}

async function main() {
  console.log('🎨 VSLサムネイル作成スクリプト開始\n');
  console.log('='.repeat(80));

  // ベース画像の確認
  if (!fs.existsSync(BASE_IMAGE_PATH)) {
    console.error(`❌ ベース画像が見つかりません: ${BASE_IMAGE_PATH}`);
    console.log('\n使用方法:');
    console.log('  npx tsx scripts/create-vsl-thumbnail.ts <ベース画像のパス>');
    console.log('\nまたは、環境変数で指定:');
    console.log('  VSL_THUMBNAIL_BASE_IMAGE=path/to/image.jpg');
    process.exit(1);
  }

  console.log(`📷 ベース画像: ${BASE_IMAGE_PATH}`);
  console.log(`📁 アセットディレクトリ: ${ASSETS_DIR}`);
  console.log(`📁 出力ディレクトリ: ${OUTPUT_DIR}\n`);

  // 各サムネイルを作成
  const results: string[] = [];
  for (const config of thumbnailConfigs) {
    try {
      const outputPath = await createThumbnail(config, BASE_IMAGE_PATH);
      results.push(outputPath);
    } catch (error: any) {
      console.error(`❌ ${config.name}の作成に失敗: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 作成結果');
  console.log('='.repeat(80));
  console.log(`✅ 成功: ${results.length}件`);
  console.log(`❌ 失敗: ${thumbnailConfigs.length - results.length}件`);
  console.log('\n作成されたサムネイル:');
  results.forEach((path) => console.log(`  - ${path}`));
  console.log('='.repeat(80) + '\n');
}

main()
  .then(() => {
    console.log('✅ VSLサムネイル作成スクリプト完了\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  });
