// scripts/generate-vsl1-4koma-banner.js
// VSL1用4コマ漫画バナーを生成するスクリプト（ル・モンド風）
// 使用モデル: Gemini 3 Pro Image (Nano Banana Pro)
// スタイル: プランテュ（ル・モンド）風のエディトリアルカートゥン

require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const { generateImage, EDITORIAL_CARTOON_STYLE } = require('../services/gemini/imageGenerator');

/**
 * VSL1用4コマ漫画バナーを生成
 * ストーリー: 無料版（Minimal Version）のオプトインを促す構成
 * - コマ1: 2人のトレーダーが同じ日にビットコインのトレードを始める（同じスタート地点）
 * - コマ2: トレーダーAは12時間チャートに張り付き、クジラの罠に捕まる（獲物になる）
 * - コマ3: トレーダーBはTrap Defence BTC（無料版）を使って罠を可視化し、回避する（ディフェンダーになる）
 * - コマ4: トレーダーBは家族と夕食を楽しみ、ぐっすり眠り、翌朝$5,000の利益で目覚める。無料でTrap Scoreを入手できることを示す
 */
async function generateVSL1Banner() {
  const prompt = `A four-panel editorial cartoon in the style of Le Monde's Plantu (French satirical art tradition), telling the VSL1 story: "Stop being the prey. Become the defender. Get Trap Defence BTC FREE (Minimal Version)."

Panel 1 (Top Left - Number "1" visible in top-left corner):
Two traders start Bitcoin trading on the exact same day. They are shown side by side, both looking optimistic and ready with their trading setups. The scene uses Plantu's sophisticated visual storytelling with clear character distinction. The composition establishes the "same starting point" concept. Both traders have equal capital represented visually (coins or charts showing same amount). The atmosphere is bright and hopeful, using Plantu's refined cross-hatching technique. Muted color palette with subtle warm tones suggesting opportunity. Both traders are at the same starting line, unaware of what lies ahead.

Panel 2 (Top Right - Number "2" visible in top-left corner):
Trader A (left side) is obsessively glued to his computer screen for 12 hours straight, frantically chasing every green pump, staring at candles. Multiple monitors show chaotic green upward arrows, FOMO indicators, and "BUY" notifications. He looks stressed, exhausted, with empty coffee cups around him. The scene uses Plantu's dramatic shadows and cross-hatching to emphasize desperation and obsession. Suddenly, a massive "WHALE TRAP" appears - a large bear trap labeled with institutional manipulation symbols. His coins are draining away, liquidated. He looks desperate, defeated, and helpless - he has become "the prey." The scene uses Plantu's restrained color palette with red accents symbolizing danger and loss. Dramatic shadows emphasize vulnerability. The composition shows Trader A as prey, caught in the trap set by market manipulators (represented as shadowy whale figures in the background).

Panel 3 (Bottom Left - Number "3" visible in top-left corner):
Trader B discovers "Trap Defence BTC" - the free Minimal Version that visualizes the invisible traps. A protective shield or visualization system appears around him, showing green protective indicators and on-chain data flows revealing whale movements before they hit. He uses the "Trap Score" (minimum edition) to spot institutional manipulation before it hits his P&L. He analyzes the market calmly, avoiding the trap. The scene combines Plantu's sophisticated visual language with clear visual storytelling, showing the transformation from potential prey to defender. The contrast is emphasized: Trader A caught in trap (red accents), Trader B protected (green accents). The "FREE" aspect is subtly suggested - no credit card, no barriers, just the raw truth of the market visualized.

Panel 4 (Bottom Right - Number "4" visible in top-left corner):
Trader A sits at a messy, chaotic desk surrounded by red charts, empty coffee cups, and despair. He looks defeated, his head in his hands - he remains "the prey." The scene uses Plantu's dramatic shadows and muted colors to emphasize loss and failure. Meanwhile, Trader B enjoys dinner with his family (shown in a warm, peaceful scene), then sleeps soundly, and wakes up the next morning with $5,000 profit displayed on his monitor. His office is organized, calm, and successful. He has become "the defender" - using the free Trap Defence BTC Minimal Version to stay safe until the odds are in his favor. The two scenes are visually separated but connected, showing the stark contrast: "same capital, different outcome." The composition emphasizes the transformation through Plantu's sophisticated visual language: Trader A defeated (dark, chaotic, prey), Trader B successful (bright, organized, defender). Green accents symbolize success and protection for Trader B. The message is clear: "Stop being the prey, become the defender" - and it's FREE.

The four panels are arranged in a 2x2 grid layout:
- Top row: Panel 1 (left) → Panel 2 (right)
- Bottom row: Panel 3 (left) → Panel 4 (right)

IMPORTANT: Each panel must display a clear, visible reading order number in the top-left corner of the panel:
- Panel 1 (Top Left): Display number "1" in a small, elegant circle or badge, styled to match French editorial cartoon tradition
- Panel 2 (Top Right): Display number "2" in a small, elegant circle or badge
- Panel 3 (Bottom Left): Display number "3" in a small, elegant circle or badge
- Panel 4 (Bottom Right): Display number "4" in a small, elegant circle or badge

The numbers should be styled to match Plantu's editorial cartoon aesthetic - subtle but clearly visible, using muted colors that complement the overall palette. The numbers can be in a simple circle, badge, or corner marker style that fits the sophisticated French editorial cartoon tradition of Le Monde.

Visual flow: The story progresses from left to right, top to bottom (1 → 2 → 3 → 4), like a sequential narrative. Each panel uses Plantu's sophisticated cross-hatching, dramatic shadows, and refined French satirical art technique. Muted color palette with symbolic accent colors (red for danger/loss, green for protection/success). The reading order numbers are the only text elements allowed - all other storytelling must be purely visual, following Plantu's tradition of visual metaphor and intellectual critique.

Composition: Cinematic perspective, clear visual metaphor. European editorial cartoon structure with Plantu's artistic value and critical perspective. Professional magazine cover quality with historical depth, honoring Le Monde's satirical tradition.

${EDITORIAL_CARTOON_STYLE}`;

  console.log('\n📺 Generating VSL1 4-Panel Banner (Le Monde Style)...');
  const image = await generateImage(prompt, '16:9');
  
  if (image) {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const outputDir = path.join(__dirname, '../public/images/thumbnails');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, 'vsl1_thumbnail.png');
    fs.writeFileSync(outputPath, base64Data, 'base64');
    const fileSizeKB = (Buffer.from(base64Data, 'base64').length / 1024).toFixed(2);
    console.log(`✅ VSL1 banner saved to ${outputPath} (${fileSizeKB} KB)`);
    return true;
  } else {
    console.error('❌ Failed to generate VSL1 banner');
    return false;
  }
}

async function main() {
  console.log('🎨 Generating VSL1 4-Panel Banner (Le Monde Style)');
  console.log('📐 Style: Plantu (Le Monde) - French Satirical Art Tradition');
  console.log('📖 Story: Stop being the prey. Become the defender. Get Trap Defence BTC FREE (Minimal Version).');
  console.log('='.repeat(80));

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is not set.');
    console.log('Please set GEMINI_API_KEY in your .env file.');
    process.exit(1);
  }

  const success = await generateVSL1Banner();

  console.log('\n' + '='.repeat(80));
  console.log('📊 生成結果');
  console.log('='.repeat(80));
  console.log(`VSL1 Banner: ${success ? '✅ 成功' : '❌ 失敗'}`);
  
  if (success) {
    console.log('\n✨ VSL1バナー画像の生成が完了しました！');
    console.log('📁 保存先: public/images/thumbnails/vsl1_thumbnail.png');
    console.log('\n💡 使用方法:');
    console.log('  - Telegram/X投稿時にこの画像をVSL1メッセージと一緒に使用');
    console.log('  - 4コマ漫画形式で「無料版（Minimal Version）のオプトイン」を視覚化');
    console.log('  - 「獲物になるのをやめ、ディフェンダーになろう」というメッセージを強調');
  } else {
    console.log('\n⚠️ 画像生成に失敗しました。');
  }
  
  console.log('='.repeat(80));
}

main().catch(console.error);
