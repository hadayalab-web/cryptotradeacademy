// scripts/generate-3d-character.js
// 3Dキャラクター画像を生成するスクリプト
// 使用モデル: Gemini 3 Pro Image (Nano Banana Pro)
// スタイル: フレンドリーで親しみやすい3Dアニメーション風キャラクター

require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const { generate3DCharacter } = require('../services/gemini/imageGenerator');

/**
 * 3Dキャラクターを生成
 * @param {string} characterType - キャラクタータイプ
 * @param {string} filename - 出力ファイル名
 */
async function generateAndSave(characterType, filename) {
  console.log(`\n📝 Generating 3D character: ${characterType}...`);
  const image = await generate3DCharacter(characterType);
  
  if (image) {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const outputDir = path.join(__dirname, '../public/images/thumbnails');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, base64Data, 'base64');
    const fileSizeKB = (Buffer.from(base64Data, 'base64').length / 1024).toFixed(2);
    console.log(`✅ 3D character saved to ${outputPath} (${fileSizeKB} KB)`);
    return true;
  } else {
    console.error(`❌ Failed to generate 3D character`);
    return false;
  }
}

async function main() {
  console.log('🎭 Generating 3D Character Images');
  console.log('📐 Style: Dr. Grok (Nintendo Character Style)');
  console.log('='.repeat(80));

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is not set.');
    console.log('Please set GEMINI_API_KEY in your .env file.');
    process.exit(1);
  }

  // コマンドライン引数からキャラクタータイプを取得（デフォルト: Dr. Grok）
  const args = process.argv.slice(2);
  const characterTypes = args.length > 0 ? args : ['dr-grok'];

  const results = {};
  
  for (const characterType of characterTypes) {
    const filename = `3d_character_${characterType}.png`;
    results[characterType] = await generateAndSave(characterType, filename);
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 生成結果');
  console.log('='.repeat(80));
  Object.entries(results).forEach(([characterType, success]) => {
    console.log(`${characterType}: ${success ? '✅ 成功' : '❌ 失敗'}`);
  });
  
  const allSuccess = Object.values(results).every(r => r);
  if (allSuccess) {
    console.log('\n✨ すべての3Dキャラクターの生成が完了しました！');
    console.log('📁 保存先: public/images/thumbnails/');
  } else {
    console.log('\n⚠️ 一部の画像生成に失敗しました。');
  }
  
  console.log('='.repeat(80));
}

main().catch(console.error);
