#!/usr/bin/env tsx
/**
 * NanoBananaでVSLサムネイル生成スクリプト
 * 
 * 提供された画像を参照画像として使用し、NanoBananaで高品質なVSLサムネイルを生成
 * YouTube/Email/Telegram用の3種類を生成
 */

import { callNanoBananaPro } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const AVATARS_DIR = join(__dirname, '..', 'data', 'vsl-assets', 'avatars');
const LOGOS_DIR = join(__dirname, '..', 'data', 'vsl-assets', 'logos');
const ASSETS_DIR = join(__dirname, '..', 'data', 'whop-product-assets', 'images');
const OUTPUT_DIR = join(__dirname, '..', 'data', 'vsl-thumbnails');

// 参照画像のパス（引数で指定、なければCEOアバターから選択）
const REFERENCE_IMAGE_PATH = process.argv[2] || (() => {
  const avatars = [
    join(AVATARS_DIR, 'ceo-avatar-1.png'),
    join(AVATARS_DIR, 'ceo-avatar-2.png'),
  ].filter(path => fs.existsSync(path));
  return avatars.length > 0 ? avatars[0] : '';
})();

// 出力ディレクトリを作成
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

interface ThumbnailConfig {
  name: string;
  aspectRatio: '16:9' | '4:3' | '1:1' | '9:16';
  imageSize: '1K' | '2K' | '4K';
  prompt: string;
  width: number;
  height: number;
}

const thumbnailConfigs: ThumbnailConfig[] = [
  {
    name: 'youtube-thumbnail',
    aspectRatio: '16:9',
    imageSize: '2K',
    width: 1280,
    height: 720,
    prompt: `Professional YouTube thumbnail for a cryptocurrency trading video sales letter (VSL).

Base image style: Professional portrait of an East Asian man in his 40s-50s, wearing round dark-rimmed glasses, dark gray crew-neck sweater, seated at a modern office desk with a panoramic city skyline view through large windows.

Design requirements:
- Keep the professional portrait style and office setting from the reference image
- Add bold, eye-catching text overlay:
  * Top line: "Why Most Traders Lose Money" (large white text, bold, with black outline for visibility)
  * Middle line: "The Hidden Trap Defense Protocol" (large red text #FF0000, bold, with black outline)
  * Bottom: "▶ Watch Now" (large red YouTube play button style, bold)
- Add subtle branding elements in corners:
  * Top-left: CryptoQuant logo (authority, data reliability)
  * Bottom-left: AI Hybrid logo (intelligence, innovation)
- Maintain professional, trustworthy atmosphere
- High contrast for mobile visibility
- YouTube thumbnail best practices: bold text, clear focal point, emotional hook

Color scheme: Professional blue-gray office tones, red accents (#FF0000) for CTAs, white text for readability.`,
  },
  {
    name: 'email-thumbnail',
    aspectRatio: '4:3',
    imageSize: '2K',
    width: 600,
    height: 400,
    prompt: `Professional email thumbnail for cryptocurrency trading product promotion.

Base image style: Professional portrait of an East Asian man in his 40s-50s, wearing round dark-rimmed glasses, dark gray crew-neck sweater, seated at a modern office desk with a panoramic city skyline view.

Design requirements:
- Keep the professional portrait style from the reference image
- Add clear, readable text overlay:
  * "Trap Defence BTC" (white text, bold, medium size)
  * "Protect Your Trades" (red text #FF0000, bold, smaller)
- Add Telegram smartphone icon in bottom-right corner (convenience, mobile access)
- Email-friendly design: clear, not cluttered, professional
- Maintain trust and authority

Color scheme: Professional tones, red accents for CTAs, white text for email client compatibility.`,
  },
  {
    name: 'telegram-thumbnail',
    aspectRatio: '16:9',
    imageSize: '2K',
    width: 1200,
    height: 630,
    prompt: `Professional Telegram channel post thumbnail for cryptocurrency trading community.

Base image style: Professional portrait of an East Asian man in his 40s-50s, wearing round dark-rimmed glasses, dark gray crew-neck sweater, seated at a modern office desk with a panoramic city skyline view.

Design requirements:
- Keep the professional portrait style from the reference image
- Add bold text overlay:
  * "Trap Defence BTC" (large white text, bold, center)
  * "Watch Our VSL" (red text #FF0000, bold, below title)
- Add hexagonal shield icon in top-left (core intelligence, protection)
- Telegram-optimized: clear, engaging, community-focused
- Maintain professional credibility

Color scheme: Professional tones, red accents, white text for Telegram's dark/light theme compatibility.`,
  },
];

/**
 * 参照画像をBase64に変換
 */
function imageToBase64(imagePath: string): { mimeType: string; data: string } {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`参照画像が見つかりません: ${imagePath}`);
  }
  
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
  
  return { mimeType, data: base64 };
}

/**
 * NanoBananaでサムネイルを生成
 */
async function generateThumbnail(config: ThumbnailConfig, referenceImagePath: string): Promise<string> {
  console.log(`🎨 ${config.name}をNanoBananaで生成中...`);
  console.log(`   アスペクト比: ${config.aspectRatio}, サイズ: ${config.imageSize}`);

  try {
    // 参照画像をBase64に変換
    const referenceImage = imageToBase64(referenceImagePath);
    
    // プロンプトに参照画像の情報を追加
    const enhancedPrompt = `${config.prompt}

Use the provided reference image as the base style and composition. Maintain the professional portrait style, office setting, and overall atmosphere from the reference image while adding the requested text overlays and branding elements.`;

    // NanoBananaで画像生成（参照画像を含む）
    const result = await callNanoBananaPro(enhancedPrompt, {
      aspectRatio: config.aspectRatio,
      imageSize: config.imageSize,
      referenceImages: [referenceImage], // 参照画像を送信
    });

    if (!result.images || result.images.length === 0) {
      throw new Error('画像が生成されませんでした');
    }

    // 生成された画像を保存
    const outputPath = join(OUTPUT_DIR, `${config.name}.png`);
    const imageData = result.images[0].base64Data;
    const imageBuffer = Buffer.from(imageData, 'base64');
    
    // 必要に応じてリサイズ
    await sharp(imageBuffer)
      .resize(config.width, config.height, {
        fit: 'cover',
        position: 'center',
      })
      .png({ quality: 90 })
      .toFile(outputPath);

    console.log(`✅ ${config.name}を保存: ${outputPath}`);
    return outputPath;
  } catch (error: any) {
    console.error(`❌ ${config.name}の生成に失敗: ${error.message}`);
    throw error;
  }
}

/**
 * whop-product-assetsの画像をオーバーレイとして追加
 */
async function addOverlayAssets(thumbnailPath: string, config: ThumbnailConfig): Promise<string> {
  console.log(`  📎 オーバーレイアセットを追加中...`);

  let image = sharp(thumbnailPath);

  // YouTube用のオーバーレイ
  if (config.name === 'youtube-thumbnail') {
    const overlays = [
      // CryptoTradeAcademyロゴ（右上）
      { path: join(LOGOS_DIR, 'cryptotradeacademy-logo-transparent.png'), x: config.width - 250, y: 50, width: 200, height: 200 },
      // CryptoQuantロゴ（左上）
      { path: join(ASSETS_DIR, 'cryptoquant-authority-data-reliability.png'), x: 50, y: 50, width: 150, height: 75 },
      // AI Hybridロゴ（左上、CryptoQuantの下）
      { path: join(ASSETS_DIR, 'ai-hybrid-nexus-intelligence.png'), x: 50, y: 140, width: 150, height: 75 },
    ];

    for (const overlay of overlays) {
      if (fs.existsSync(overlay.path)) {
        const overlayImage = await sharp(overlay.path)
          .resize(overlay.width, overlay.height)
          .toBuffer();

        image = image.composite([
          {
            input: overlayImage,
            left: overlay.x,
            top: overlay.y,
          },
        ]);
      }
    }
  }

  // Email用のオーバーレイ
  if (config.name === 'email-thumbnail') {
    const overlayPath = join(ASSETS_DIR, 'telegram-smartphone-convenience.png');
    if (fs.existsSync(overlayPath)) {
      const overlayImage = await sharp(overlayPath)
        .resize(120, 120)
        .toBuffer();

      image = image.composite([
        {
          input: overlayImage,
          left: 450,
          top: 250,
        },
      ]);
    }
  }

  // Telegram用のオーバーレイ
  if (config.name === 'telegram-thumbnail') {
    const overlays = [
      // CryptoTradeAcademyロゴ（右上）
      { path: join(LOGOS_DIR, 'cryptotradeacademy-logo-transparent.png'), x: config.width - 200, y: 50, width: 150, height: 150 },
      // ヘキサゴナルシールド（左上）
      { path: join(ASSETS_DIR, 'core-intelligence-hexagonal-shield.png'), x: 50, y: 50, width: 120, height: 120 },
    ];

    for (const overlay of overlays) {
      if (fs.existsSync(overlay.path)) {
        const overlayImage = await sharp(overlay.path)
          .resize(overlay.width, overlay.height)
          .toBuffer();

        image = image.composite([
          {
            input: overlayImage,
            left: overlay.x,
            top: overlay.y,
          },
        ]);
      }
    }
  }

  // 最終画像を保存
  const finalPath = join(OUTPUT_DIR, `${config.name}-final.png`);
  await image.png({ quality: 90 }).toFile(finalPath);
  
  return finalPath;
}

async function main() {
  console.log('🎨 NanoBanana VSLサムネイル生成スクリプト開始\n');
  console.log('='.repeat(80));

  // 参照画像の確認
  if (!fs.existsSync(REFERENCE_IMAGE_PATH)) {
    console.error(`❌ 参照画像が見つかりません: ${REFERENCE_IMAGE_PATH}`);
    console.log('\n使用方法:');
    console.log('  npx tsx scripts/generate-vsl-thumbnail-nanobanana.ts [参照画像のパス]');
    console.log('\n注意: 参照画像を指定しない場合、CEOアバターが自動的に選択されます');
    console.log('  利用可能なアバター:');
    const avatars = [
      join(AVATARS_DIR, 'ceo-avatar-1.png'),
      join(AVATARS_DIR, 'ceo-avatar-2.png'),
    ].filter(path => fs.existsSync(path));
    avatars.forEach(avatar => console.log(`    - ${avatar}`));
    if (avatars.length === 0) {
      console.log('    ⚠️ CEOアバターが見つかりません');
    }
    process.exit(1);
  }

  console.log(`📷 参照画像: ${REFERENCE_IMAGE_PATH}`);
  console.log(`📁 CEOアバター: ${AVATARS_DIR}`);
  console.log(`📁 ロゴ: ${LOGOS_DIR}`);
  console.log(`📁 アセットディレクトリ: ${ASSETS_DIR}`);
  console.log(`📁 出力ディレクトリ: ${OUTPUT_DIR}`);
  
  // 環境変数の確認
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEYが設定されていません');
    process.exit(1);
  }
  console.log('✅ GEMINI_API_KEY: 設定済み\n');

  // 各サムネイルを生成
  const results: string[] = [];
  for (const config of thumbnailConfigs) {
    try {
      const thumbnailPath = await generateThumbnail(config, REFERENCE_IMAGE_PATH);
      
      // オーバーレイアセットを追加
      const finalPath = await addOverlayAssets(thumbnailPath, config);
      results.push(finalPath);
    } catch (error: any) {
      console.error(`❌ ${config.name}の処理に失敗: ${error.message}`);
      if (error.stack) {
        console.error('スタックトレース:', error.stack.substring(0, 500));
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 生成結果');
  console.log('='.repeat(80));
  console.log(`✅ 成功: ${results.length}件`);
  console.log(`❌ 失敗: ${thumbnailConfigs.length - results.length}件`);
  console.log('\n生成されたサムネイル:');
  results.forEach((path) => console.log(`  - ${path}`));
  console.log('='.repeat(80) + '\n');
}

main()
  .then(() => {
    console.log('✅ NanoBanana VSLサムネイル生成スクリプト完了\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  });
