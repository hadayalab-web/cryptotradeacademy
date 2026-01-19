// scripts/generate-vsl2-4koma-banner.js
// VSL2用4コマ漫画バナーを生成するスクリプト（ル・モンド風）
// 使用モデル: Gemini 3 Pro Image (Nano Banana Pro)
// スタイル: プランテュ（ル・モンド）風のエディトリアルカートゥン

require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const { generateImage, EDITORIAL_CARTOON_STYLE } = require('../services/gemini/imageGenerator');

/**
 * VSL2用4コマ漫画バナーを生成
 * ストーリー: クーポンコードを使って有料版（Regular Briefing）の利用開始を促す構成
 * - コマ1: 無料版（Minimal Version）を48時間使ってきたが、クジラは進化している。無料版は「ドア」を見せるだけ
 * - コマ2: 機関投資家のアルゴリズムが偽のシグナルを重ねてFOMOを引き起こす。最小のシールドでは不十分かもしれない
 * - コマ3: 完全版（Full Protocol）の価値を発見：4つのAIエンジン（Grok、GPT、Gemini、CryptoQuant）が同期、リアルタイムクジラ追跡、3秒の意思決定
 * - コマ4: 50%オフクーポンコード（DEFEND50）を使って有料版にアップグレード。1日1ドル未満で完全な機関投資家レベルの保護を獲得
 */
async function generateVSL2Banner() {
  const prompt = `A four-panel editorial cartoon in the style of Le Monde's Plantu (French satirical art tradition), telling the VSL2 story: "You've had the minimum edition for 48 hours. The whales are evolving. Upgrade to Full Protocol with 50% OFF coupon code DEFEND50."

Panel 1 (Top Left - Number "1" visible in top-left corner):
A trader has been using the "Minimal Version" (minimum edition) for the last 48 hours. He has seen the Trap Score and felt what it's like to have a shield. He sits at his desk, looking somewhat satisfied but also aware of limitations. The scene shows him with a basic shield (visual metaphor for Minimal Version protection). The scene uses Plantu's sophisticated visual storytelling with clear character distinction. The composition establishes that he has experienced the "door" (Minimal Version shows the door) but not the "entire room" (Full Protocol shows the entire room). The atmosphere is neutral, using Plantu's refined cross-hatching technique. Muted color palette suggesting he has basic protection but needs more.

Panel 2 (Top Right - Number "2" visible in top-left corner):
The trader watches as institutional algorithms layer fake signals to trigger FOMO. Shadowy whale figures in the background manipulate the market, creating false signals. The trader looks confused and vulnerable - his minimal shield might not be enough when the trap snaps. The scene uses Plantu's dramatic shadows and cross-hatching to emphasize danger and evolution of whale tactics. Red warning signs appear subtly in the background. The atmosphere is dark and threatening, showing that while watching the score, the whales are already evolving. The composition shows vulnerability - the Minimal Version shows the door, but institutional manipulation is becoming more sophisticated. Red accents symbolize danger and the need for stronger protection.

Panel 3 (Bottom Left - Number "3" visible in top-left corner):
The trader discovers the "Full Protocol" - the complete visual intelligence suite. Four AI engines (Grok, GPT, Gemini, CryptoQuant) work in sync, visible as interconnected systems around him. Real-time whale tracking, sentiment filters, and 3-second decision-making capabilities are visualized. A protective shield system appears around him, much stronger than the minimal version. He looks confident and protected. The scene combines Plantu's sophisticated visual language with clear visual storytelling, showing the transformation from "door" (Minimal) to "entire room" (Full Protocol). The contrast is emphasized: Minimal Version shows door (limited), Full Protocol shows entire room (complete protection). Green accents symbolize the "unfair advantage" - this isn't just trading, it's institutional-level protection.

Panel 4 (Bottom Right - Number "4" visible in top-left corner):
The trader uses the coupon code "DEFEND50" (50% OFF) to unlock the Full Protocol. A visual representation of the coupon code appears - "DEFEND50" in an elegant badge or coupon style. He upgrades his defense protocol, gaining full institutional protection for less than a dollar a day. The scene shows him successful and protected, with the Full Protocol's four AI engines working in sync around him. The composition emphasizes the transformation through Plantu's sophisticated visual language: from vulnerable (minimal shield) to fully protected (complete protocol). Green accents symbolize success and the "unfair advantage." The message is clear: "Don't leave your capital to chance. Upgrade your defense protocol. Use code DEFEND50 at checkout right now. Welcome to the full academy. Let's win together." The atmosphere is bright, organized, and successful, showing that the Full Protocol gives him institutional-level protection at an affordable price.

The four panels are arranged in a 2x2 grid layout:
- Top row: Panel 1 (left) → Panel 2 (right)
- Bottom row: Panel 3 (left) → Panel 4 (right)

IMPORTANT: Each panel must display a clear, visible reading order number in the top-left corner of the panel:
- Panel 1 (Top Left): Display number "1" in a small, elegant circle or badge, styled to match French editorial cartoon tradition
- Panel 2 (Top Right): Display number "2" in a small, elegant circle or badge
- Panel 3 (Bottom Left): Display number "3" in a small, elegant circle or badge
- Panel 4 (Bottom Right): Display number "4" in a small, elegant circle or badge

The numbers should be styled to match Plantu's editorial cartoon aesthetic - subtle but clearly visible, using muted colors that complement the overall palette. The numbers can be in a simple circle, badge, or corner marker style that fits the sophisticated French editorial cartoon tradition of Le Monde.

Visual flow: The story progresses from left to right, top to bottom (1 → 2 → 3 → 4), like a sequential narrative. Each panel uses Plantu's sophisticated cross-hatching, dramatic shadows, and refined French satirical art technique. Muted color palette with symbolic accent colors (red for stress/limitation, green for protection/success). The reading order numbers are the only text elements allowed - all other storytelling must be purely visual, following Plantu's tradition of visual metaphor and intellectual critique.

Composition: Cinematic perspective, clear visual metaphor. European editorial cartoon structure with Plantu's artistic value and critical perspective. Professional magazine cover quality with historical depth, honoring Le Monde's satirical tradition.

${EDITORIAL_CARTOON_STYLE}`;

  console.log('\n📺 Generating VSL2 4-Panel Banner (Le Monde Style)...');
  const image = await generateImage(prompt, '16:9');
  
  if (image) {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const outputDir = path.join(__dirname, '../public/images/thumbnails');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, 'vsl2_thumbnail.png');
    fs.writeFileSync(outputPath, base64Data, 'base64');
    const fileSizeKB = (Buffer.from(base64Data, 'base64').length / 1024).toFixed(2);
    console.log(`✅ VSL2 banner saved to ${outputPath} (${fileSizeKB} KB)`);
    return true;
  } else {
    console.error('❌ Failed to generate VSL2 banner');
    return false;
  }
}

async function main() {
  console.log('🎨 Generating VSL2 4-Panel Banner (Le Monde Style)');
  console.log('📐 Style: Plantu (Le Monde) - French Satirical Art Tradition');
  console.log('📖 Story: Upgrade to Full Protocol with 50% OFF coupon code DEFEND50.');
  console.log('='.repeat(80));

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is not set.');
    console.log('Please set GEMINI_API_KEY in your .env file.');
    process.exit(1);
  }

  const success = await generateVSL2Banner();

  console.log('\n' + '='.repeat(80));
  console.log('📊 生成結果');
  console.log('='.repeat(80));
  console.log(`VSL2 Banner: ${success ? '✅ 成功' : '❌ 失敗'}`);
  
  if (success) {
    console.log('\n✨ VSL2バナー画像の生成が完了しました！');
    console.log('📁 保存先: public/images/thumbnails/vsl2_thumbnail.png');
    console.log('\n💡 使用方法:');
    console.log('  - Telegram投稿時にこの画像をVSL2メッセージと一緒に使用');
    console.log('  - 4コマ漫画形式で「クーポンコード（DEFEND50）を使った有料版（Regular Briefing）の利用開始」を視覚化');
    console.log('  - 「無料版はドアを見せるだけ、完全版は部屋全体を見せる」というメッセージを強調');
  } else {
    console.log('\n⚠️ 画像生成に失敗しました。');
  }
  
  console.log('='.repeat(80));
}

main().catch(console.error);
