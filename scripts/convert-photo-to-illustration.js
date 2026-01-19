// scripts/convert-photo-to-illustration.js
// リアル写真をイラスト風に変換するスクリプト
// 使用モデル: Gemini 3 Pro Image (NaonoBanana Pro)

require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const { convertPhotoToIllustration } = require('../services/gemini/imageGenerator');

/**
 * 画像をイラスト風に変換して保存
 * @param {string} inputPath - 入力画像のパス
 * @param {string} outputPath - 出力画像のパス
 * @param {string} style - スタイル（'anime', 'cartoon', 'watercolor', 'sketch', 'illustration'）
 * @param {string} aspectRatio - アスペクト比
 */
async function convertAndSave(inputPath, outputPath, style = 'anime', aspectRatio = '16:9') {
  console.log(`\n📝 Converting photo to ${style} illustration...`);
  console.log(`   Input: ${inputPath}`);
  console.log(`   Output: ${outputPath}`);
  
  const image = await convertPhotoToIllustration(inputPath, style, aspectRatio);
  
  if (image) {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, base64Data, 'base64');
    const fileSizeKB = (Buffer.from(base64Data, 'base64').length / 1024).toFixed(2);
    console.log(`✅ Illustration saved to ${outputPath} (${fileSizeKB} KB)`);
    return true;
  } else {
    console.error(`❌ Failed to convert photo to illustration`);
    return false;
  }
}

async function main() {
  console.log('🎨 Photo to Illustration Converter');
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
  
  if (args.length === 0) {
    console.log('\n使用方法:');
    console.log('  node scripts/convert-photo-to-illustration.js <入力画像パス> [出力画像パス] [スタイル] [アスペクト比]');
    console.log('\n例:');
    console.log('  node scripts/convert-photo-to-illustration.js input.jpg output.png anime 16:9');
    console.log('  node scripts/convert-photo-to-illustration.js photo.jpg illustration.png cartoon');
    console.log('\nスタイルオプション:');
    console.log('  - anime: アニメ風イラスト');
    console.log('  - cartoon: カートゥーン風イラスト');
    console.log('  - watercolor: 水彩画風イラスト');
    console.log('  - sketch: スケッチ風イラスト');
    console.log('  - illustration: デジタルイラスト（デフォルト）');
    console.log('\nアスペクト比オプション:');
    console.log('  - 1:1, 9:16, 16:9, 4:3, 3:4');
    process.exit(1);
  }

  const inputPath = args[0];
  const outputPath = args[1] || inputPath.replace(/(\.[^.]+)$/, '_illustration$1');
  const style = args[2] || 'anime';
  const aspectRatio = args[3] || '16:9';

  // 入力ファイルの存在確認
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    process.exit(1);
  }

  // スタイルの検証
  const validStyles = ['anime', 'cartoon', 'watercolor', 'sketch', 'illustration'];
  if (!validStyles.includes(style)) {
    console.error(`❌ Invalid style: ${style}`);
    console.log(`Valid styles: ${validStyles.join(', ')}`);
    process.exit(1);
  }

  // 変換実行
  const success = await convertAndSave(inputPath, outputPath, style, aspectRatio);

  console.log('\n' + '='.repeat(80));
  if (success) {
    console.log('✨ 画像の変換が完了しました！');
    console.log(`📁 保存先: ${outputPath}`);
  } else {
    console.log('⚠️ 画像の変換に失敗しました。');
    console.log('   - GEMINI_API_KEYを確認してください');
    console.log('   - 入力画像の形式を確認してください');
    process.exit(1);
  }
  console.log('='.repeat(80));
}

main().catch(console.error);
