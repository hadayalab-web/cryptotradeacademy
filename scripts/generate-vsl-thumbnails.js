// scripts/generate-vsl-thumbnails.js
// VSL1 & VSL2用のサムネイル画像を生成するスクリプト（風刺画スタイル）
// 使用モデル: Gemini 3 Pro Image (Nano Banana Pro)
// スタイル: The Economist / The New Yorker風の風刺画

require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const { generateImage, EDITORIAL_CARTOON_STYLE } = require('../services/gemini/imageGenerator');

// スタイル定義は services/gemini/imageGenerator.js からインポート
// トンマナ統一のため、すべての風刺画生成でこのスタイル定義を使用

async function main() {
  console.log('🎨 Generating VSL Thumbnails (Le Monde × Japan Punch Style) using Nano Banana Pro...');
  console.log('📐 Style: Plantu (Le Monde) × Charles Wirgman (Japan Punch)');
  console.log('='.repeat(80));

  const outputDir = path.join(__dirname, '../public/images/thumbnails');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // VSL1: "SAME CAPITAL, DIFFERENT OUTCOME"（2人のトレーダー対比）
  // スタイル: ル・モンド（プランテュ）調 × ジャパン・パンチ（チャールズ・ワーグマン）調
  console.log('\n📸 Generating VSL1 Thumbnail (Le Monde × Japan Punch Style)...');
  const vsl1Prompt = `A satirical editorial cartoon in the style of Le Monde's Plantu and Charles Wirgman's Japan Punch, depicting two cryptocurrency traders who started with the same capital but ended with dramatically different outcomes.

Left side (Trader A - Failure): A stressed, exhausted trader sitting at a cluttered desk with multiple monitors showing red, crashing Bitcoin charts. He has his face buried in his hands, surrounded by crumpled papers, empty coffee cups, and a digital clock showing 3:14 AM. The atmosphere is chaotic, dark, and desperate. Money coins are visibly draining away from his account like water. The scene uses dramatic shadows and cross-hatching to emphasize despair, reminiscent of Plantu's critical visual commentary.

Right side (Trader B - Success): A calm, confident trader sitting comfortably in a modern office chair, holding a coffee cup, looking relaxed. Behind him, a large window shows a city skyline at dawn. His single monitor displays a green, upward-trending Bitcoin chart. The atmosphere is bright, organized, and successful. The composition uses light and shadow contrast, combining Plantu's sophisticated visual language with Japan Punch's clear narrative structure.

The two scenes are visually separated by a central dividing element (like a traditional Japanese screen or European editorial cartoon panel division) but connected through visual storytelling. The composition emphasizes the "same capital, different outcome" concept through the fusion of French satirical elegance and Japanese visual clarity.

${EDITORIAL_CARTOON_STYLE}`;
  
  const vsl1Image = await generateImage(vsl1Prompt, '16:9');
  if (vsl1Image) {
    const base64Data = vsl1Image.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(path.join(outputDir, 'vsl1_thumbnail.png'), base64Data, 'base64');
    const fileSizeKB = (Buffer.from(base64Data, 'base64').length / 1024).toFixed(2);
    console.log(`✅ VSL1 Thumbnail saved to public/images/thumbnails/vsl1_thumbnail.png (${fileSizeKB} KB)`);
  } else {
    console.error('❌ Failed to generate VSL1 Thumbnail');
  }

  // VSL2: "STOP LOSING. START WINNING"（風刺画スタイル）
  // スタイル: ル・モンド（プランテュ）調 × ジャパン・パンチ（チャールズ・ワーグマン）調
  console.log('\n📸 Generating VSL2 Thumbnail (Le Monde × Japan Punch Style)...');
  const vsl2Prompt = `A satirical editorial cartoon in the style of Le Monde's Plantu and Charles Wirgman's Japan Punch, depicting a cryptocurrency trader's transformation from being trapped by market manipulation to being protected by "Trap Defence".

Left side (Losing - The Trap): A small trader figure is caught in a large, menacing bear trap. The trap is filled with scattered coins and a broken "BUY" button. Above, a shadowy whale (representing market manipulators) looms menacingly, drawn with Plantu's characteristic dramatic shadows and cross-hatching. The trader looks panicked and helpless, his expression exaggerated in the Japan Punch tradition of clear emotional storytelling. The scene uses muted colors with red accents to symbolize danger, following Plantu's restrained palette.

Right side (Winning - The Shield): The same trader figure, now confident and protected, holds a glowing shield. The shield emits protective rays of light. Behind him, a path leads to a castle-like academy. Other traders are following him, walking away from the trap towards safety. The composition uses light and shadow contrast, combining Plantu's sophisticated visual language with Japan Punch's narrative clarity. Green accents symbolize protection and success.

The composition shows the journey from being prey to becoming a defender, divided by a visual element that references both European editorial cartoon panels and Japanese narrative scrolls. The contrast between vulnerability and protection is emphasized through the fusion of French satirical elegance and Japanese visual storytelling traditions.

${EDITORIAL_CARTOON_STYLE}`;

  const vsl2Image = await generateImage(vsl2Prompt, '16:9');
  if (vsl2Image) {
    const base64Data = vsl2Image.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(path.join(outputDir, 'vsl2_thumbnail.png'), base64Data, 'base64');
    const fileSizeKB = (Buffer.from(base64Data, 'base64').length / 1024).toFixed(2);
    console.log(`✅ VSL2 Thumbnail saved to public/images/thumbnails/vsl2_thumbnail.png (${fileSizeKB} KB)`);
  } else {
    console.error('❌ Failed to generate VSL2 Thumbnail');
  }

  console.log('\n' + '='.repeat(80));
  console.log('✨ VSL Thumbnail generation completed!');
  console.log('📁 Output directory: public/images/thumbnails/');
  console.log('='.repeat(80));
}

main().catch(console.error);
