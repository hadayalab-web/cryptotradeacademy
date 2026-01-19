// scripts/generate-4koma-cartoon.js
// 4コマ漫画を生成するスクリプト（ル・モンド × ジャパン・パンチスタイル）
// 使用モデル: Gemini 3 Pro Image (Nano Banana Pro)
// スタイル: プランテュ（ル・モンド） × チャールズ・ワーグマン（ジャパン・パンチ）

require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const { generateImage, EDITORIAL_CARTOON_STYLE } = require('../services/gemini/imageGenerator');

/**
 * 4コマ漫画を生成
 * @param {string} theme - テーマ（例: "whale-trap", "trap-defence", "trader-journey"）
 * @param {string} filename - 出力ファイル名
 */
async function generate4Koma(theme, filename) {
  const themes = {
    'whale-trap': {
      title: 'Whale Trap Story',
      panels: {
        panel1: 'Panel 1 (Top Left): A small cryptocurrency trader excitedly sees Bitcoin price rising on his phone. He is smiling, surrounded by green upward arrows and "BUY" notifications. The atmosphere is optimistic, using bright lighting. The scene uses Japan Punch\'s clear emotional expression of excitement.',
        panel2: 'Panel 2 (Top Right): The same trader, now panicked, watches as a massive shadowy whale (representing market manipulators) appears above the chart. The price suddenly crashes. Red downward arrows fill the screen. The trader\'s expression is exaggerated fear, following Japan Punch\'s tradition. Plantu\'s dramatic shadows and cross-hatching emphasize the danger.',
        panel3: 'Panel 3 (Bottom Left): The trader is caught in a large bear trap labeled "WHALE TRAP". Coins are scattered around him. He looks helpless and desperate. The scene uses muted colors with red accents (Plantu\'s restrained palette) to symbolize danger. The composition shows vulnerability.',
        panel4: 'Panel 4 (Bottom Right): The same trader, now protected, holds a glowing shield labeled "TRAP DEFENCE". Other traders are following him toward safety. The atmosphere is bright and hopeful. Green accents symbolize protection and success. The composition combines Plantu\'s sophisticated visual language with Japan Punch\'s narrative clarity, showing the transformation from prey to defender.'
      }
    },
    'trap-defence': {
      title: 'Trap Defence Journey',
      panels: {
        panel1: 'Panel 1 (Top Left): A trader sits at a cluttered desk, staring at multiple monitors showing chaotic red charts. He looks stressed and exhausted, with empty coffee cups around him. The scene uses Plantu\'s dramatic shadows and cross-hatching to emphasize despair. The atmosphere is dark and desperate.',
        panel2: 'Panel 2 (Top Right): The trader discovers "Trap Defence" on his screen. A light bulb appears above his head (visual metaphor). His expression changes from confusion to curiosity. The scene uses Japan Punch\'s clear emotional storytelling. The composition introduces hope through subtle lighting changes.',
        panel3: 'Panel 3 (Bottom Left): The trader activates Trap Defence. A protective shield appears around him, emitting green protective rays. The chaotic charts on his monitors start to stabilize. His expression shows relief and growing confidence. The scene combines Plantu\'s sophisticated visual language with Japan Punch\'s narrative clarity.',
        panel4: 'Panel 4 (Bottom Right): The trader, now calm and confident, sits in an organized office. His single monitor shows a green, upward-trending chart. He holds a coffee cup, looking relaxed. Behind him, a window shows a city skyline at dawn. The atmosphere is bright, organized, and successful. Green accents symbolize protection and success. The composition shows the complete transformation.'
      }
    },
    'trader-journey': {
      title: 'Trader\'s Journey',
      panels: {
        panel1: 'Panel 1 (Top Left): Two traders start with the same capital. They are shown side by side, both looking optimistic and ready. The scene uses Japan Punch\'s clear visual storytelling. The composition establishes the "same starting point" concept.',
        panel2: 'Panel 2 (Top Right): Trader A (left) panics and buys at the peak, surrounded by FOMO indicators and red warning signs. Trader B (right) calmly observes, holding back. The scene uses Plantu\'s dramatic shadows for Trader A and calm lighting for Trader B. Red accents for danger, muted colors for caution.',
        panel3: 'Panel 3 (Bottom Left): Trader A is caught in a bear trap, coins draining away. He looks desperate and defeated. Trader B uses "Trap Defence" tools, analyzing the market calmly. The contrast is emphasized through Plantu\'s sophisticated visual language and Japan Punch\'s clear emotional expressions.',
        panel4: 'Panel 4 (Bottom Right): Trader A sits at a messy desk, defeated, surrounded by red charts. Trader B sits comfortably, his monitor showing green profits. The two scenes are visually separated but connected, showing the stark contrast. The composition emphasizes "same capital, different outcome" through the fusion of French satirical elegance and Japanese visual clarity.'
      }
    }
  };

  const selectedTheme = themes[theme];
  if (!selectedTheme) {
    console.error(`❌ Unknown theme: ${theme}`);
    console.log(`Available themes: ${Object.keys(themes).join(', ')}`);
    return false;
  }

  const prompt = `A four-panel editorial cartoon in the style of Le Monde's Plantu and Charles Wirgman's Japan Punch, telling a sequential story about ${selectedTheme.title}.

${selectedTheme.panels.panel1}

${selectedTheme.panels.panel2}

${selectedTheme.panels.panel3}

${selectedTheme.panels.panel4}

The four panels are arranged in a 2x2 grid layout:
- Top row: Panel 1 (left) → Panel 2 (right)
- Bottom row: Panel 3 (left) → Panel 4 (right)

IMPORTANT: Each panel must display a clear, visible reading order number in the top-left corner of the panel:
- Panel 1 (Top Left): Display number "1" in a small, elegant circle or badge
- Panel 2 (Top Right): Display number "2" in a small, elegant circle or badge
- Panel 3 (Bottom Left): Display number "3" in a small, elegant circle or badge
- Panel 4 (Bottom Right): Display number "4" in a small, elegant circle or badge

The numbers should be styled to match the editorial cartoon aesthetic - subtle but clearly visible, using muted colors that complement the overall palette. The numbers can be in a simple circle, badge, or corner marker style that fits the sophisticated French editorial cartoon tradition.

Visual flow: The story progresses from left to right, top to bottom (1 → 2 → 3 → 4), like a Japanese manga but with the refined aesthetic of French editorial cartoons. Each panel uses Plantu's sophisticated cross-hatching and dramatic shadows combined with Japan Punch's clear emotional expressions and narrative clarity. Muted color palette with symbolic accent colors (red for danger, green for protection/success). The reading order numbers are the only text elements allowed - all other storytelling must be purely visual.

${EDITORIAL_CARTOON_STYLE}`;

  console.log(`\n📝 Generating 4-panel cartoon: ${selectedTheme.title}...`);
  const image = await generateImage(prompt, '16:9');
  
  if (image) {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const outputDir = path.join(__dirname, '../public/images/thumbnails');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, base64Data, 'base64');
    const fileSizeKB = (Buffer.from(base64Data, 'base64').length / 1024).toFixed(2);
    console.log(`✅ 4-panel cartoon saved to ${outputPath} (${fileSizeKB} KB)`);
    return true;
  } else {
    console.error(`❌ Failed to generate 4-panel cartoon`);
    return false;
  }
}

async function main() {
  console.log('🎨 Generating 4-Panel Cartoons (Le Monde × Japan Punch Style)');
  console.log('📐 Style: Plantu (Le Monde) × Charles Wirgman (Japan Punch)');
  console.log('='.repeat(80));

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is not set.');
    console.log('Please set GEMINI_API_KEY in your .env file.');
    process.exit(1);
  }

  // コマンドライン引数からテーマを取得（デフォルト: すべて生成）
  const args = process.argv.slice(2);
  const themesToGenerate = args.length > 0 ? args : ['whale-trap', 'trap-defence', 'trader-journey'];

  const results = {};
  
  for (const theme of themesToGenerate) {
    const filename = `4koma_${theme}.png`;
    results[theme] = await generate4Koma(theme, filename);
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 生成結果');
  console.log('='.repeat(80));
  Object.entries(results).forEach(([theme, success]) => {
    console.log(`${theme}: ${success ? '✅ 成功' : '❌ 失敗'}`);
  });
  
  const allSuccess = Object.values(results).every(r => r);
  if (allSuccess) {
    console.log('\n✨ すべての4コマ漫画の生成が完了しました！');
    console.log('📁 保存先: public/images/thumbnails/');
  } else {
    console.log('\n⚠️ 一部の画像生成に失敗しました。');
  }
  
  console.log('='.repeat(80));
}

main().catch(console.error);
