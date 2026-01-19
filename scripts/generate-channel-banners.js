// scripts/generate-channel-banners.js
// YouTubeチャンネルバナーとXプロフィールバナーを生成するスクリプト
// Dr. Grok + CryptoQuantデータビジュアライゼーション統合版
// 使用モデル: Gemini 3 Pro Image (Nano Banana Pro)

require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const { generateImage, CHARACTER_3D_STYLE, HOLOGRAPHIC_DATA_VIZ_STYLE } = require('../services/gemini/imageGenerator');

/**
 * YouTubeチャンネルバナーを生成（2560x1440px相当、16:9）
 */
async function generateYouTubeBanner() {
  const prompt = `A YouTube channel banner image (16:9 aspect ratio, 2560x1440px equivalent) featuring Dr. Grok, a friendly Nintendo-style 3D animated character, integrated with a futuristic CryptoQuant on-chain data visualization.

COMPOSITION (VERY WIDE ANGLE - maximum pull back, Dr. Grok on RIGHT side):
- Left side (60%): CryptoQuant On-Chain Data Map visualization
  - Large, curved, transparent holographic screen with glowing blue edges
  - World map background with Bitcoin network flows
  - Orange/glowing lines: North America, Europe, parts of Asia (INSTITUTIONAL WALLETS, MINERS)
  - Light blue/cyan lines: East Asia, Southeast Asia (EXCHANGES, HODLers)
  - Top left: "+Q CryptoQuant" branding in white
  - Top center: "CRYPTOQUANT ON-CHAIN DATA MAP" and "BITCOIN NETWORK FLOWS" titles
  - Top right: Legend with colored dots (Orange: MINERS, Light Blue: EXCHANGES, Cyan: HODLers)
  - Bottom: Three data panels showing:
    * "TOTAL BTC BALANCE" with green upward arrow and progress bar
    * "TRANSACTION VOLUME" with green upward arrow and progress bar
    * "NETWORK ACTIVITY" with green upward arrow and progress bar

- Right side (40%): Dr. Grok character standing confidently, facing LEFT (toward the data visualization), FULL BODY visible
  - Nintendo-style 3D animated character (Dr. Mario-like)
  - Fair-skinned man with brown hair, large bright blue eyes, thick dark eyebrows, prominent rounded nose, thick dark brown mustache
  - Clean white doctor's lab coat with "DR. GROK" printed in blue on left chest pocket
  - White collared shirt, bright red necktie
  - Classic doctor's head mirror on forehead
  - Translucent blue futuristic AR glasses displaying:
    * Left lens: "FEAR & GREED INDEX" gauge pointing to "GREED"
    * Right lens: "X SENTIMENT" green upward-trending line graph
  - Maroon stethoscope around neck with golden Bitcoin 'B' emblem
  - White gloves, brown rounded shoes with light yellow soles
  - Confident, thoughtful pose with one hand on chin, facing LEFT toward the data visualization
  - FULL BODY visible from head to feet, with GENEROUS space above head (at least 25% of character height) and below feet (at least 20% of character height)
  - Character positioned in UPPER RIGHT area, NOT in lower right (to avoid profile picture overlap on X)
  - Character size: Much smaller scale (about 40-45% of frame height) to allow for maximum background visibility and cropping flexibility
  - Character isolated against semi-transparent background, allowing integration with data visualization
  - IMPORTANT: Character's face and upper body should be positioned in the upper-right quadrant, leaving lower areas clear

BACKGROUND (VERY WIDE SHOT - maximum pull back for maximum flexibility):
- Modern office environment FULLY visible, extending far beyond both character and visualization
- City skyline at night through large windows on BOTH left and right sides (blurred, bokeh effect)
- Dark wooden desk surface extending across the entire foreground (lower portion)
- EXTREMELY GENEROUS negative space:
  * Top: At least 25% of image height (clear sky/ceiling area, maximum breathing room)
  * Bottom: At least 30% of image height (desk surface and floor area, plenty of space)
  * Left: At least 15% of image width (clear space beyond data visualization)
  * Right: At least 15% of image width (clear space beyond Dr. Grok character)
- Lower-left quadrant (where profile picture typically overlays on X): Keep this area completely clear or with very subtle background elements only
- Lower-right quadrant: Also keep relatively clear for flexibility
- Cool blue and warm orange ambient lighting from the holographic screen
- Professional, high-tech atmosphere
- Camera angle pulled back EXTREMELY far (ultra-wide-angle view) to show maximum scene with maximum breathing room
- Composition optimized for maximum horizontal cropping flexibility (16:9, 3:1, etc.)
- Both Dr. Grok and data visualization should appear smaller relative to the frame, allowing for extensive background visibility

STYLE INTEGRATION:
- Dr. Grok: Nintendo character art style, bright, clean, polished 3D animation
- Data Visualization: Futuristic holographic interface, transparent, glowing
- Overall: Professional yet approachable, data-driven but friendly
- Color palette: Cool blues, whites, oranges/golds, with green accents for positive trends

TEXT ELEMENTS (if needed):
- "DR. GROK" branding visible on character's lab coat
- "CRYPTOQUANT" branding on data visualization
- All data labels and metrics clearly visible

${CHARACTER_3D_STYLE}

${HOLOGRAPHIC_DATA_VIZ_STYLE}`;

  console.log('\n📺 Generating YouTube Channel Banner (16:9)...');
  const image = await generateImage(prompt, '16:9');
  
  if (image) {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const outputDir = path.join(__dirname, '../public/images/banners');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, 'youtube-channel-banner.png');
    fs.writeFileSync(outputPath, base64Data, 'base64');
    const fileSizeKB = (Buffer.from(base64Data, 'base64').length / 1024).toFixed(2);
    console.log(`✅ YouTube banner saved to ${outputPath} (${fileSizeKB} KB)`);
    return true;
  } else {
    console.error('❌ Failed to generate YouTube banner');
    return false;
  }
}

/**
 * Xプロフィールバナーを生成（1500x500px相当、3:1）
 */
async function generateXBanner() {
  const prompt = `An X (Twitter) profile banner image (3:1 aspect ratio, 1500x500px equivalent) featuring Dr. Grok, a friendly Nintendo-style 3D animated character, integrated with a futuristic CryptoQuant on-chain data visualization.

COMPOSITION (VERY WIDE ANGLE - maximum pull back, Dr. Grok on RIGHT side for X banner):
- Left side (65%): CryptoQuant On-Chain Data Map visualization (condensed but clear view)
  - Curved, transparent holographic screen with glowing blue edges
  - World map with Bitcoin network flows (simplified for banner format)
  - Orange/glowing lines: North America, Europe (INSTITUTIONAL WALLETS, MINERS)
  - Light blue/cyan lines: East Asia (EXCHANGES, HODLers)
  - "+Q CryptoQuant" branding visible
  - "BITCOIN NETWORK FLOWS" title
  - Key metrics displayed: BTC Balance, Transaction Volume, Network Activity with green upward arrows

- Right side (35%): Dr. Grok character FULL BODY, facing LEFT (toward the data visualization)
  - Nintendo-style 3D animated character (Dr. Mario-like)
  - Fair-skinned man with brown hair, large bright blue eyes, thick dark eyebrows, prominent rounded nose, thick dark brown mustache
  - Clean white doctor's lab coat with "DR. GROK" printed in blue on left chest pocket
  - White collared shirt, bright red necktie
  - Classic doctor's head mirror on forehead
  - Translucent blue futuristic AR glasses displaying:
    * Left lens: "FEAR & GREED INDEX" gauge pointing to "GREED"
    * Right lens: "X SENTIMENT" green upward-trending line graph
  - Maroon stethoscope around neck with golden Bitcoin 'B' emblem
  - White gloves, brown rounded shoes with light yellow soles
  - Confident, thoughtful pose with one hand on chin, facing LEFT toward the data visualization
  - FULL BODY visible from head to feet, with GENEROUS space above head (at least 25% of character height) and below feet (at least 20% of character height)
  - Character positioned in UPPER RIGHT area, NOT in lower right (to avoid profile picture overlap)
  - Character size: Much smaller scale (about 35-40% of frame height) for maximum background visibility and cropping flexibility
  - IMPORTANT: Character's face and upper body should be positioned in the upper-right quadrant, leaving lower-left quadrant completely clear for profile picture overlay

BACKGROUND (VERY WIDE SHOT - maximum pull back for X banner composition):
- Modern office environment FULLY visible, extending far beyond both character and visualization
- City skyline at night visible through windows on BOTH sides (blurred, bokeh effect)
- Dark wooden desk surface in foreground (lower portion)
- EXTREMELY GENEROUS negative space:
  * Top: At least 25% of image height (maximum breathing room)
  * Bottom: At least 30% of image height (especially lower-left quadrant for profile picture)
  * Left: At least 15% of image width (clear space beyond data visualization)
  * Right: At least 15% of image width (clear space beyond Dr. Grok)
- Lower-left quadrant: Keep COMPLETELY clear or with very subtle background only (profile picture overlay area)
- Lower-right quadrant: Also keep relatively clear for flexibility
- Dark, professional atmosphere
- Cool blue and warm orange lighting from holographic screen
- Camera angle pulled back EXTREMELY far (ultra-wide-angle view) to show maximum scene with maximum breathing room
- Composition optimized for maximum 3:1 horizontal cropping flexibility
- Both Dr. Grok and data visualization should appear smaller relative to the frame

STYLE INTEGRATION:
- Dr. Grok: Nintendo character art style, bright, clean, polished 3D animation
- Data Visualization: Futuristic holographic interface, transparent, glowing
- Overall: Professional yet approachable, data-driven but friendly
- Optimized for horizontal banner format (3:1)

${CHARACTER_3D_STYLE}

${HOLOGRAPHIC_DATA_VIZ_STYLE}`;

  console.log('\n🐦 Generating X Profile Banner (3:1)...');
  const image = await generateImage(prompt, '16:9'); // Gemini API doesn't support 3:1, using 16:9 and will note aspect ratio in prompt
  
  if (image) {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const outputDir = path.join(__dirname, '../public/images/banners');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, 'x-profile-banner.png');
    fs.writeFileSync(outputPath, base64Data, 'base64');
    const fileSizeKB = (Buffer.from(base64Data, 'base64').length / 1024).toFixed(2);
    console.log(`✅ X banner saved to ${outputPath} (${fileSizeKB} KB)`);
    console.log('⚠️  Note: Generated as 16:9. Crop to 3:1 (1500x500px) for X profile banner.');
    return true;
  } else {
    console.error('❌ Failed to generate X banner');
    return false;
  }
}

async function main() {
  console.log('🎨 Generating Channel Banners');
  console.log('📐 Integrating: Dr. Grok + CryptoQuant Data Visualization');
  console.log('='.repeat(80));

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is not set.');
    console.log('Please set GEMINI_API_KEY in your .env file.');
    process.exit(1);
  }

  const results = {};
  
  // YouTubeバナー生成
  results.youtube = await generateYouTubeBanner();
  
  // Xバナー生成
  results.x = await generateXBanner();

  console.log('\n' + '='.repeat(80));
  console.log('📊 生成結果');
  console.log('='.repeat(80));
  console.log(`YouTube Channel Banner: ${results.youtube ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`X Profile Banner: ${results.x ? '✅ 成功' : '❌ 失敗'}`);
  
  if (results.youtube && results.x) {
    console.log('\n✨ すべてのバナー画像の生成が完了しました！');
    console.log('📁 保存先: public/images/banners/');
    console.log('\n💡 使用方法:');
    console.log('  - YouTube: public/images/banners/youtube-channel-banner.png');
    console.log('  - X: public/images/banners/x-profile-banner.png (16:9で生成、3:1にクロップ推奨)');
  } else {
    console.log('\n⚠️ 一部の画像生成に失敗しました。');
  }
  
  console.log('='.repeat(80));
}

main().catch(console.error);
