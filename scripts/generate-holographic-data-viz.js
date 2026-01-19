// scripts/generate-holographic-data-viz.js
// ホログラフィック・データビジュアライゼーション画像を生成するスクリプト
// 使用モデル: Gemini 3 Pro Image (Nano Banana Pro)
// スタイル: CryptoQuant風のホログラフィックインターフェース

require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const { generateHolographicDataViz } = require('../services/gemini/imageGenerator');

/**
 * ホログラフィックデータビジュアライゼーションを生成
 * @param {string} dataType - データタイプ
 * @param {string} filename - 出力ファイル名
 */
async function generateAndSave(dataType, filename) {
  console.log(`\n📝 Generating holographic data visualization: ${dataType}...`);
  const image = await generateHolographicDataViz(dataType);
  
  if (image) {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const outputDir = path.join(__dirname, '../public/images/thumbnails');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, base64Data, 'base64');
    const fileSizeKB = (Buffer.from(base64Data, 'base64').length / 1024).toFixed(2);
    console.log(`✅ Holographic data viz saved to ${outputPath} (${fileSizeKB} KB)`);
    return true;
  } else {
    console.error(`❌ Failed to generate holographic data visualization`);
    return false;
  }
}

async function main() {
  console.log('🌐 Generating Holographic Data Visualizations');
  console.log('📐 Style: CryptoQuant-inspired holographic interface');
  console.log('='.repeat(80));

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is not set.');
    console.log('Please set GEMINI_API_KEY in your .env file.');
    process.exit(1);
  }

  // コマンドライン引数からデータタイプを取得（デフォルト: すべて生成）
  const args = process.argv.slice(2);
  const dataTypes = args.length > 0 ? args : ['bitcoin-network-flows', 'on-chain-analysis', 'institutional-wallets'];

  const results = {};
  
  for (const dataType of dataTypes) {
    const filename = `holographic_${dataType}.png`;
    results[dataType] = await generateAndSave(dataType, filename);
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 生成結果');
  console.log('='.repeat(80));
  Object.entries(results).forEach(([dataType, success]) => {
    console.log(`${dataType}: ${success ? '✅ 成功' : '❌ 失敗'}`);
  });
  
  const allSuccess = Object.values(results).every(r => r);
  if (allSuccess) {
    console.log('\n✨ すべてのホログラフィックデータビジュアライゼーションの生成が完了しました！');
    console.log('📁 保存先: public/images/thumbnails/');
  } else {
    console.log('\n⚠️ 一部の画像生成に失敗しました。');
  }
  
  console.log('='.repeat(80));
}

main().catch(console.error);
