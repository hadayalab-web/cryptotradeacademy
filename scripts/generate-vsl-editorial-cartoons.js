// scripts/generate-vsl-editorial-cartoons.js
// VSL1 & VSL2用の風刺画スタイルサムネイル画像を生成するスクリプト
// 使用モデル: Gemini 3 Pro Image (Nano Banana Pro)
// スタイル: The Economist / The New Yorker風の風刺画

require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const { generateImage, EDITORIAL_CARTOON_STYLE } = require('../services/gemini/imageGenerator');

// スタイル定義は services/gemini/imageGenerator.js からインポート
// トンマナ統一のため、すべての風刺画生成でこのスタイル定義を使用

async function generateAndSaveImage(prompt, filename) {
  console.log(`\n🎨 Generating editorial cartoon: ${filename}...`);
  try {
    const imageDataUrl = await generateImage(prompt, '16:9');
    
    if (!imageDataUrl) {
      console.error(`❌ Failed to generate image for ${filename}`);
      return false;
    }

    // Data URLからBase64データを抽出
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // 保存先ディレクトリを確認
    const outputDir = path.join(__dirname, '..', 'public', 'images', 'thumbnails');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, buffer);
    
    const fileSizeKB = (buffer.length / 1024).toFixed(2);
    console.log(`✅ Saved image to: ${outputPath} (${fileSizeKB} KB)`);
    return true;

  } catch (error) {
    console.error(`❌ Error generating/saving image for ${filename}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting VSL Editorial Cartoon Generation...');
  console.log('='.repeat(80));

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is not set.');
    console.log('Please set GEMINI_API_KEY in your .env file.');
    process.exit(1);
  }

  // VSL1: "SAME CAPITAL, DIFFERENT OUTCOME"（2人のトレーダー対比）
  const vsl1Prompt = `
A satirical editorial cartoon depicting two cryptocurrency traders who started with the same capital but ended with dramatically different outcomes.

Left side: A stressed, exhausted trader (Trader A) sitting at a cluttered desk with multiple monitors showing red, crashing Bitcoin charts. He has his face buried in his hands, surrounded by crumpled papers, empty coffee cups, and a digital clock showing 3:14 AM. The atmosphere is chaotic, dark, and desperate. Money is visibly draining away from his account.

Right side: A calm, confident trader (Trader B) sitting comfortably in a modern office chair, holding a coffee cup, looking relaxed. Behind him, a large window shows a city skyline. His single monitor displays a green, upward-trending Bitcoin chart with "NEWS BITCOIN HITS NEW HIGH" visible. The atmosphere is bright, organized, and successful.

The two scenes are visually separated but connected, showing the stark contrast between failure and success. The composition emphasizes the "same capital, different outcome" concept through visual storytelling.

${EDITORIAL_CARTOON_STYLE}
`;

  // VSL2: "STOP LOSING. START WINNING"（サイバーパンク風を風刺画に）
  const vsl2Prompt = `
A satirical editorial cartoon depicting a cryptocurrency trader's transformation from being trapped by market manipulation to being protected by "Trap Defence".

Left side (Losing): A small trader figure is caught in a large, menacing bear trap labeled "WHALE TRAP". The trap is filled with scattered money and a broken "BUY" button. Above, a shadowy whale (representing market manipulators) looms menacingly. The trader looks panicked and helpless.

Right side (Winning): The same trader figure, now confident and protected, holds a glowing shield labeled "TRAP DEFENSE". The shield emits protective rays. Behind him, a path leads to a castle-like "DEFENDERS ACADEMY" with a banner reading "FREE TRAP SCORE EDITION". Other traders are following him, walking away from the trap towards safety.

The composition shows the journey from being prey to becoming a defender. The contrast between vulnerability and protection is emphasized through visual metaphor.

${EDITORIAL_CARTOON_STYLE}
`;

  console.log('\n📝 VSL1 Prompt Preview:');
  console.log('─'.repeat(80));
  console.log(vsl1Prompt.substring(0, 200) + '...');
  
  console.log('\n📝 VSL2 Prompt Preview:');
  console.log('─'.repeat(80));
  console.log(vsl2Prompt.substring(0, 200) + '...');

  // VSL1画像生成
  const vsl1Success = await generateAndSaveImage(vsl1Prompt, 'vsl1_thumbnail.png');

  // VSL2画像生成
  const vsl2Success = await generateAndSaveImage(vsl2Prompt, 'vsl2_thumbnail.png');

  console.log('\n' + '='.repeat(80));
  console.log('📊 生成結果');
  console.log('='.repeat(80));
  console.log(`VSL1 Thumbnail: ${vsl1Success ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`VSL2 Thumbnail: ${vsl2Success ? '✅ 成功' : '❌ 失敗'}`);
  
  if (vsl1Success && vsl2Success) {
    console.log('\n✨ すべての風刺画スタイルサムネイルの生成が完了しました！');
    console.log('📁 保存先: public/images/thumbnails/');
  } else {
    console.log('\n⚠️ 一部の画像生成に失敗しました。GEMINI_API_KEYを確認してください。');
  }
  
  console.log('='.repeat(80));
}

main().catch(console.error);
