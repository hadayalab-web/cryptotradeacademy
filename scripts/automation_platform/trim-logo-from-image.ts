#!/usr/bin/env tsx
/**
 * 画像からロゴ部分を正確にトリミングするスクリプト
 * 
 * 目的: 添付画像からシールドエンブレム（ロゴ）部分のみを抽出
 * - 背景透過版
 * - 白背景版
 * 
 * 注意: このスクリプトは画像処理ライブラリが必要です
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 出力ディレクトリ
const OUTPUT_DIR = join(__dirname, '../data/whop-profile-assets');
const IMAGES_DIR = join(OUTPUT_DIR, 'images');

/**
 * 画像処理ライブラリの確認と使用
 */
async function trimLogoFromImage() {
  try {
    // sharpライブラリを試す
    let sharp: any;
    try {
      sharp = (await import('sharp')).default;
      console.log('✅ sharpライブラリを使用します');
    } catch (error) {
      console.log('⚠️ sharpライブラリが見つかりません。インストールが必要です。');
      console.log('💡 実行: npm install sharp');
      throw new Error('sharpライブラリが必要です。npm install sharp を実行してください。');
    }

    // 入力画像のパス（ユーザーが指定する必要があります）
    const inputImagePath = process.argv[2] || join(IMAGES_DIR, 'profile-banner-cryptotradeacademy-1188x396.png');
    
    if (!existsSync(inputImagePath)) {
      console.error(`❌ 入力画像が見つかりません: ${inputImagePath}`);
      console.log('💡 使用方法: npx tsx scripts/trim-logo-from-image.ts <入力画像のパス>');
      process.exit(1);
    }

    console.log(`📷 入力画像: ${inputImagePath}`);
    
    // 画像のメタデータを取得
    const metadata = await sharp(inputImagePath).metadata();
    console.log(`📊 画像サイズ: ${metadata.width}x${metadata.height}`);
    console.log(`📊 画像形式: ${metadata.format}`);

    // ロゴの位置とサイズを推定（画像の説明に基づく）
    // 中央の白いオーバーレイ内のロゴを想定
    // 実際の座標は画像を確認して調整が必要です
    
    const imageWidth = metadata.width;
    const imageHeight = metadata.height;
    
    // 中央部分を推定（実際の画像を確認して調整が必要）
    const logoWidth = Math.floor(imageWidth * 0.15); // 画像幅の15%をロゴ幅と仮定
    const logoHeight = logoWidth; // 正方形
    const logoX = Math.floor((imageWidth - logoWidth) / 2); // 中央
    const logoY = Math.floor(imageHeight * 0.3); // 上から30%の位置（白いオーバーレイ内）

    console.log(`\n🎯 推定ロゴ領域:`);
    console.log(`  - X: ${logoX}, Y: ${logoY}`);
    console.log(`  - 幅: ${logoWidth}, 高さ: ${logoHeight}`);

    // ロゴ部分を抽出（背景透過版）
    const logoTransparentPath = join(IMAGES_DIR, 'profile-logo-cryptotradeacademy-trimmed-transparent.png');
    
    await sharp(inputImagePath)
      .extract({
        left: logoX,
        top: logoY,
        width: logoWidth,
        height: logoHeight
      })
      .png() // PNG形式で保存（透過対応）
      .toFile(logoTransparentPath);
    
    console.log(`✅ ロゴ画像（背景透過版）を保存: ${logoTransparentPath}`);

    // ロゴ部分を抽出（白背景版）
    const logoWhiteBgPath = join(IMAGES_DIR, 'profile-logo-cryptotradeacademy-trimmed-white-bg.png');
    
    await sharp(inputImagePath)
      .extract({
        left: logoX,
        top: logoY,
        width: logoWidth,
        height: logoHeight
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } }) // 白背景を追加
      .png()
      .toFile(logoWhiteBgPath);
    
    console.log(`✅ ロゴ画像（白背景版）を保存: ${logoWhiteBgPath}`);

    console.log('\n✅ トリミング完了！');
    console.log('\n📝 次のステップ:');
    console.log('1. 生成された画像を確認');
    console.log('2. 必要に応じて座標を調整（スクリプト内のlogoX, logoY, logoWidth, logoHeightを変更）');
    console.log('3. 背景透過版で背景が透過されていない場合、画像編集ソフトで背景を削除');

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

// スクリプトとして実行された場合のみ実行
trimLogoFromImage().catch(console.error);

export { trimLogoFromImage };
