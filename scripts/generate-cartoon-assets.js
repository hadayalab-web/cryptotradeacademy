const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { generateEditorialCartoon } = require('../services/gemini/imageGenerator');

// .envファイルを読み込む
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

async function generateAndSaveImage(concept, filename) {
  console.log(`\n🎨 Generating cartoon for concept: "${concept}"...`);
  try {
    const dataUrl = await generateEditorialCartoon(concept);
    
    if (!dataUrl) {
      console.error(`❌ Failed to generate image for "${concept}"`);
      return false;
    }

    // Data URLからBase64データを抽出
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    // 保存先ディレクトリを確認
    const outputDir = path.join(__dirname, '..', 'public', 'images', 'thumbnails');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ Saved image to: ${outputPath}`);
    return true;

  } catch (error) {
    console.error(`❌ Error generating/saving image for "${concept}":`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Cartoon Asset Generation...');

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is not set.');
    process.exit(1);
  }

  // VSL1用: クジラの罠（Whale Trap）
  await generateAndSaveImage('Whale Trap', 'vsl1_thumbnail.png');

  // VSL2用: FOMO群衆（FOMO Crowd）
  await generateAndSaveImage('FOMO Crowd', 'vsl2_thumbnail.png');

  // X/TG汎用: 市場操作（Market Manipulation）
  await generateAndSaveImage('Market Manipulation', 'cartoon_manipulation.png');

  console.log('\n✨ All cartoon assets generation tasks completed.');
}

main();
