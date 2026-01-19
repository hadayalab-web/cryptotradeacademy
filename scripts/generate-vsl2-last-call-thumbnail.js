// scripts/generate-vsl2-last-call-thumbnail.js
// VSL2 Last Call（終了直前リマインド）メッセージ用のサムネイル画像を生成するスクリプト
// 使用モデル: Gemini 3 Pro Image (Nano Banana Pro)
// スタイル: Le Monde / Plantu風のエディトリアルカートゥン（4コマ形式）
// トーン: 高CVR仕様 - 緊急性・FOMO・社会的証明・損失回避を強調

require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const { generateImage, EDITORIAL_CARTOON_STYLE } = require('../services/gemini/imageGenerator');

async function main() {
  console.log('🎨 Generating VSL2 Last Call Thumbnail (High CVR Specification) using Nano Banana Pro...');
  console.log('📐 Style: Plantu (Le Monde) - French Satirical Art Tradition');
  console.log('🎯 Tone: Urgency + FOMO + Social Proof + Loss Aversion (High CVR)');
  console.log('='.repeat(80));

  const outputDir = path.join(__dirname, '../public/images/thumbnails');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // VSL2 Last Call: "LAST CHANCE - FINAL REMINDER - 50% OFF ENDS SOON"
  // スタイル: ル・モンド（プランテュ）調の4コマエディトリアルカートゥン
  // トーン: 緊急性 + FOMO + 社会的証明 + 損失回避（高CVR仕様）
  // 重要: 画像内に「VSL1」「VSL2」などの内部用語を含めない。ユーザー向けの表現のみを使用。
  console.log('\n📸 Generating VSL2 Last Call Thumbnail (High CVR - Le Monde Style)...');
  const vsl2LastCallPrompt = `A four-panel editorial cartoon in the style of Le Monde's Plantu (French satirical art tradition), telling the "LAST CALL" story with maximum urgency and conversion optimization. The composition emphasizes final opportunity, scarcity, and the consequences of missing the 50% OFF offer.

CRITICAL: Do NOT include any internal project codes, abbreviations, or technical identifiers like "VSL1", "VSL2", or similar terms anywhere in the image. Only use user-facing language and concepts.

Panel 1 (Top Left - Number "1" visible in top-left corner):
A trader sits at his desk, looking at a large wall clock showing "22:00" (22 hours have passed). The clock has a distressed, urgent appearance with red accents. Papers on his desk show "MINIMAL VERSION - LIMITED PROTECTION" and "WHALES ARE EVOLVING". He holds a small, basic shield labeled "TRAP SCORE" but looks concerned and vulnerable. The scene uses Plantu's sophisticated visual storytelling with dramatic shadows and cross-hatching. Muted colors with red warning accents symbolize the limited time and growing danger. The atmosphere conveys awareness of limitations and the need for stronger protection.

Panel 2 (Top Right - Number "2" visible in top-left corner):
The same trader watches as shadowy whale figures and institutional algorithms create increasingly sophisticated traps. Warning signs flash "MARKET MANIPULATION" and "FALSE SIGNALS". The trader's minimal shield is cracking under pressure. Behind him, a countdown timer shows "2 HOURS LEFT" in dramatic red numbers. The scene uses Plantu's dramatic visual language to emphasize urgency and danger. Red and orange accents dominate, creating a sense of impending loss. The composition shows that time is running out and the minimal protection is insufficient against evolving threats.

Panel 3 (Bottom Left - Number "3" visible in top-left corner):
The trader discovers the "FULL PROTOCOL" - a complete visual intelligence suite with four AI engines (Grok, GPT, Gemini, CryptoQuant) working in sync around him. A strong, glowing protective shield system envelops him. He looks confident and protected. The scene combines Plantu's sophisticated visual language with clear visual storytelling, showing the transformation from vulnerability to complete protection. Green accents symbolize the "unfair advantage" and institutional-level protection. The contrast is emphasized: minimal shield (cracking) vs. full protocol (unbreakable protection).

Panel 4 (Bottom Right - Number "4" visible in top-left corner):
The trader holds up a prominent coupon badge labeled "DEFEND50" with "50% OFF" clearly visible. A clock in the background shows the final countdown. Other silhouettes of successful traders are visible in the background, all protected by the full protocol shield, symbolizing social proof. The scene emphasizes urgency: "LAST CHANCE - FINAL REMINDER". The composition uses Plantu's sophisticated visual language to show success and protection through immediate action. Green and gold accents symbolize success, while red countdown elements create FOMO. The message is clear: "Act now before the offer expires. Join the protected traders. Use code DEFEND50 at checkout right now."

The four panels are arranged in a 2x2 grid layout:
- Top row: Panel 1 (left) → Panel 2 (right)
- Bottom row: Panel 3 (left) → Panel 4 (right)

IMPORTANT: Each panel must display a clear, visible reading order number in the top-left corner of the panel:
- Panel 1 (Top Left): Display number "1" in a small, elegant circle or badge, styled to match French editorial cartoon tradition
- Panel 2 (Top Right): Display number "2" in a small, elegant circle or badge
- Panel 3 (Bottom Left): Display number "3" in a small, elegant circle or badge
- Panel 4 (Bottom Right): Display number "4" in a small, elegant circle or badge

Visual flow: The story progresses from left to right, top to bottom (1 → 2 → 3 → 4), like a sequential narrative. Each panel uses Plantu's sophisticated cross-hatching, dramatic shadows, and refined French satirical art technique. Color psychology: muted base palette with strategic accent colors - red/orange for urgency and danger, green/gold for protection and success. The reading order numbers are the only text elements allowed - all other storytelling must be purely visual, following Plantu's tradition of visual metaphor and intellectual critique.

High CVR Optimization Elements:
- Urgency: Countdown timers, distressed clocks, "LAST CHANCE" visual cues
- FOMO: Other successful traders in background (Panel 4), "time running out" atmosphere
- Social Proof: Silhouettes of protected traders using full protocol (Panel 4)
- Loss Aversion: Cracking shield (Panel 2), growing threats, consequences of inaction
- Clear CTA: Prominent DEFEND50 coupon badge (Panel 4), immediate action emphasis

IMPORTANT RESTRICTIONS:
- NO text containing "VSL1", "VSL2", or any similar internal project codes
- NO technical abbreviations visible to users
- Only user-facing concepts: "TRAP DEFENCE", "FULL PROTOCOL", "DEFEND50", "50% OFF", "LAST CHANCE", "MINIMAL VERSION"
- The coupon badge should be visually prominent but contain NO internal codes
- Countdown timers should convey urgency visually, not through text labels like "VSL2"

Composition: Cinematic perspective, clear visual metaphor. European editorial cartoon structure with Plantu's artistic value and critical perspective. Professional magazine cover quality with historical depth, honoring Le Monde's satirical tradition. Maximum conversion optimization through visual storytelling.

${EDITORIAL_CARTOON_STYLE}`;
  
  const vsl2LastCallImage = await generateImage(vsl2LastCallPrompt, '16:9');
  if (vsl2LastCallImage) {
    const base64Data = vsl2LastCallImage.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(path.join(outputDir, 'vsl2_last_call_thumbnail.png'), base64Data, 'base64');
    const fileSizeKB = (Buffer.from(base64Data, 'base64').length / 1024).toFixed(2);
    console.log(`✅ VSL2 Last Call Thumbnail saved to public/images/thumbnails/vsl2_last_call_thumbnail.png (${fileSizeKB} KB)`);
  } else {
    console.error('❌ Failed to generate VSL2 Last Call Thumbnail');
  }

  console.log('\n' + '='.repeat(80));
  console.log('✨ VSL2 Last Call Thumbnail generation completed!');
  console.log('📁 Output directory: public/images/thumbnails/');
  console.log('🎯 High CVR Specification: Urgency + FOMO + Social Proof + Loss Aversion');
  console.log('='.repeat(80));
}

main().catch(console.error);
