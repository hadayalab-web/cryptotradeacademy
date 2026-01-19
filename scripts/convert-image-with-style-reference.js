// scripts/convert-image-with-style-reference.js
// 参照画像のスタイルを適用して画像を変換するスクリプト
// 使用モデル: Gemini 3 Pro Image (NaonoBanana Pro)

require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const { convertImageWithStyleReference } = require('../services/gemini/imageGenerator');

/**
 * 参照画像のスタイルを適用して画像を変換して保存
 * @param {string} inputPath - 入力画像のパス
 * @param {string} referencePath - 参照画像（スタイル元）のパス
 * @param {string} outputPath - 出力画像のパス
 * @param {string} aspectRatio - アスペクト比
 */
async function convertAndSave(inputPath, referencePath, outputPath, aspectRatio = '16:9') {
  console.log(`\n📝 Converting image with style reference...`);
  console.log(`   Input: ${inputPath}`);
  console.log(`   Reference: ${referencePath}`);
  console.log(`   Output: ${outputPath}`);
  
  const image = await convertImageWithStyleReference(inputPath, referencePath, aspectRatio);
  
  if (image) {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, base64Data, 'base64');
    const fileSizeKB = (Buffer.from(base64Data, 'base64').length / 1024).toFixed(2);
    console.log(`✅ Converted image saved to ${outputPath} (${fileSizeKB} KB)`);
    return true;
  } else {
    console.error(`❌ Failed to convert image with style reference`);
    return false;
  }
}

async function main() {
  console.log('🎨 Image Style Transfer Converter');
  console.log('📐 Using: NaonoBanana Pro (Gemini 3 Pro Image)');
  console.log('='.repeat(80));

  // APIキーの確認
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is not set.');
    console.log('Please set GEMINI_API_KEY in your .env file or as an environment variable.');
    process.exit(1);
  }

  // コマンドライン引数の解析
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('\n使用方法:');
    console.log('  node scripts/convert-image-with-style-reference.js <入力画像パス> <参照画像パス> [出力画像パス] [アスペクト比]');
    console.log('\n例:');
    console.log('  node scripts/convert-image-with-style-reference.js input.jpg reference.jpg output.png 16:9');
    console.log('  node scripts/convert-image-with-style-reference.js photo.png style.jpg');
    console.log('\nアスペクト比オプション:');
    console.log('  - 1:1, 9:16, 16:9, 4:3, 3:4 (デフォルト: 16:9)');
    process.exit(1);
  }

  const inputPath = args[0];
  const referencePath = args[1];
  const outputPath = args[2] || inputPath.replace(/(\.[^.]+)$/, '_styled$1');
  const aspectRatio = args[3] || '16:9';

  // 入力ファイルの存在確認
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    process.exit(1);
  }

  // 参照ファイルの存在確認
  if (!fs.existsSync(referencePath)) {
    console.error(`❌ Reference file not found: ${referencePath}`);
    process.exit(1);
  }

  // 変換実行
  const success = await convertAndSave(inputPath, referencePath, outputPath, aspectRatio);

  console.log('\n' + '='.repeat(80));
  if (success) {
    console.log('✨ 画像の変換が完了しました！');
    console.log(`📁 保存先: ${outputPath}`);
  } else {
    console.log('⚠️ 画像の変換に失敗しました。');
    console.log('   - GEMINI_API_KEYを確認してください');
    console.log('   - 入力画像と参照画像の形式を確認してください');
    process.exit(1);
  }
  console.log('='.repeat(80));
}

main().catch(console.error);
