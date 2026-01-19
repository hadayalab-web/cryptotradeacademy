// scripts/generate-vsl1-reminder-thumbnail.js
// VSL1リマインドメッセージ用のサムネイル画像を生成するスクリプト（風刺画スタイル）
// 使用モデル: Gemini 3 Pro Image (Nano Banana Pro)
// スタイル: The Economist / The New Yorker風の風刺画
// トーン: VSL1メッセージと一貫性を保ちつつ、緊急性とFOMO要素を強調

require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const { generateImage, EDITORIAL_CARTOON_STYLE } = require('../services/gemini/imageGenerator');

async function main() {
  console.log('🎨 Generating VSL1 Reminder Thumbnail (Le Monde × Japan Punch Style) using Nano Banana Pro...');
  console.log('📐 Style: Plantu (Le Monde) × Charles Wirgman (Japan Punch)');
  console.log('🎯 Tone: Urgency + FOMO + Social Proof (consistent with VSL1)');
  console.log('='.repeat(80));

  const outputDir = path.join(__dirname, '../public/images/thumbnails');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // VSL1リマインド: "TIME IS RUNNING OUT - PROTECT YOURSELF NOW"
  // スタイル: ル・モンド（プランテュ）調 × ジャパン・パンチ（チャールズ・ワーグマン）調
  // トーン: 緊急性 + FOMO + 社会的証明（VSL1メッセージと一貫）
  // 重要: 画像内に「VSL1」「VSL2」などの内部用語を含めない。ユーザー向けの表現のみを使用。
  console.log('\n📸 Generating VSL1 Reminder Thumbnail (Le Monde × Japan Punch Style)...');
  const vsl1ReminderPrompt = `A satirical editorial cartoon in the style of Le Monde's Plantu and Charles Wirgman's Japan Punch, depicting the urgency of protecting one's capital before it's too late. The composition emphasizes time running out and the consequences of inaction.

CRITICAL: Do NOT include any internal project codes, abbreviations, or technical identifiers like "VSL1", "VSL2", or similar terms anywhere in the image. Only use user-facing language and concepts.

Central focus: A large, dramatic antique clock with Roman numerals, positioned prominently in the upper center. The clock hands indicate urgency, and the overall appearance conveys a sense of time running out. The clock has a distressed, urgent appearance, combining Plantu's dramatic visual language with Japan Punch's clear narrative emphasis. Do NOT display any text like "X HOURS LEFT" on the clock itself - let the visual composition convey urgency.

Left side (Inaction - Loss): A trader figure sits passively at a desk, ignoring warning signs. Behind him, a shadowy hooded figure labeled "MARKET TRAPS" looms menacingly, drawn with Plantu's characteristic dramatic shadows and cross-hatching. Papers on the desk show "WARNING: MARKET TURBULENCE" and "COMPLACENCY". A piggy bank labeled "YOUR CAPITAL" is visibly bleeding coins that fall into a pool labeled "LOSS". The scene uses muted colors with red accents to symbolize danger and loss, following Plantu's restrained but impactful palette. The trader's expression shows complacency and regret, exaggerated in the Japan Punch tradition.

Right side (Action - Protection): The same trader figure, now alert and protected, stands confidently in front of a computer monitor. He is enveloped in a glowing, transparent green spherical shield that emits protective rays of light. The shield should NOT contain any text like "VSL1" or "VSL2". The computer monitor displays only "TRAP DEFENCE" (not "VSL1" or any internal codes). Behind this protected figure, a green, winding path leads uphill towards a secure-looking fortress or castle in the distance, with another silhouette of a person ascending the path, symbolizing a path to safety and prosperity. The composition uses light and shadow contrast, combining Plantu's sophisticated visual language with Japan Punch's narrative clarity. Green accents symbolize protection and success.

The composition shows the contrast between inaction (loss) and action (protection), divided by the central clock element that references both European editorial cartoon panels and Japanese narrative scrolls. The urgency is emphasized through the fusion of French satirical elegance and Japanese visual storytelling traditions. The message is clear: "Time is running out - protect yourself now before it's too late."

IMPORTANT RESTRICTIONS:
- NO text containing "VSL1", "VSL2", or any similar internal project codes
- NO technical abbreviations visible to users
- Only user-facing concepts: "TRAP DEFENCE", "PROTECT", "MARKET TRAPS", "YOUR CAPITAL", "LOSS"
- The shield should be visually protective but contain NO text labels
- The clock should convey urgency visually, not through text labels

${EDITORIAL_CARTOON_STYLE}`;
  
  const vsl1ReminderImage = await generateImage(vsl1ReminderPrompt, '16:9');
  if (vsl1ReminderImage) {
    const base64Data = vsl1ReminderImage.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(path.join(outputDir, 'vsl1_reminder_thumbnail.png'), base64Data, 'base64');
    const fileSizeKB = (Buffer.from(base64Data, 'base64').length / 1024).toFixed(2);
    console.log(`✅ VSL1 Reminder Thumbnail saved to public/images/thumbnails/vsl1_reminder_thumbnail.png (${fileSizeKB} KB)`);
  } else {
    console.error('❌ Failed to generate VSL1 Reminder Thumbnail');
  }

  console.log('\n' + '='.repeat(80));
  console.log('✨ VSL1 Reminder Thumbnail generation completed!');
  console.log('📁 Output directory: public/images/thumbnails/');
  console.log('='.repeat(80));
}

main().catch(console.error);
