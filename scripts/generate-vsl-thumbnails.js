// scripts/generate-vsl-thumbnails.js
// VSL1 & VSL2用のサムネイル画像を生成するスクリプト
// 使用モデル: Gemini 3 Pro Image (Nano Banana Pro)

require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const { generateImage } = require('../services/gemini/imageGenerator');

async function main() {
  console.log('🎨 Generating VSL Thumbnails using Nano Banana Pro...');

  const outputDir = path.join(__dirname, '../public/images/thumbnails');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // VSL1 Thumbnail
  console.log('\nGenerating VSL1 Thumbnail...');
  const vsl1Prompt = `Cinematic YouTube thumbnail for a Bitcoin trading video. 
  Split screen comparison. 
  Left side: A stressed trader looking at a red crashing chart, losing money, chaotic atmosphere. Label: 'Trader A'.
  Right side: A relaxed, confident trader drinking coffee, looking at a green profitable chart, calm atmosphere. Label: 'Trader B'.
  Big bold text overlay in the center: 'SAME CAPITAL, DIFFERENT OUTCOME'.
  Style: High contrast, hyper-realistic, professional financial broadcast quality, 4k resolution.`;
  
  const vsl1Image = await generateImage(vsl1Prompt, '16:9');
  if (vsl1Image) {
    const base64Data = vsl1Image.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(path.join(outputDir, 'vsl1_thumbnail.png'), base64Data, 'base64');
    console.log('✅ VSL1 Thumbnail saved to public/images/thumbnails/vsl1_thumbnail.png');
  } else {
    console.error('❌ Failed to generate VSL1 Thumbnail');
  }

  // VSL2 Thumbnail
  console.log('\nGenerating VSL2 Thumbnail...');
  const vsl2Prompt = `Cinematic YouTube thumbnail for a professional crypto trading tool 'Trap Defence'.
  Futuristic holographic HUD interface showing a Bitcoin chart pattern with a detected 'BULL TRAP'.
  A digital shield protecting the user's balance.
  Big bold text overlay: 'STOP LOSING. START WINNING.' and '50% OFF LIMITED'.
  Style: Cyberpunk, glowing neon green and dark blue, high tech, matrix style, 4k resolution.`;

  const vsl2Image = await generateImage(vsl2Prompt, '16:9');
  if (vsl2Image) {
    const base64Data = vsl2Image.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(path.join(outputDir, 'vsl2_thumbnail.png'), base64Data, 'base64');
    console.log('✅ VSL2 Thumbnail saved to public/images/thumbnails/vsl2_thumbnail.png');
  } else {
    console.error('❌ Failed to generate VSL2 Thumbnail');
  }
}

main().catch(console.error);
