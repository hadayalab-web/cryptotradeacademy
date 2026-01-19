// scripts/generate-ceo-anime-icon.js
// CEOの画像を日本のアニメ風アイコンに変換するスクリプト
// 使用モデル: Gemini 3 Pro Image (Nano Banana Pro)
// スタイル: 日本のアニメ風（アニメアイコン）

require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const { generateImage } = require('../services/gemini/imageGenerator');

/**
 * CEOのアニメ風アイコンを生成
 * 鳥山明の画風で、写真に近いリアルなスタイル、背景も含める
 */
async function generateCEOAnimeIcon() {
  const prompt = `Transform a real photographic portrait into an illustration-style image in Akira Toriyama's distinctive art style (from Dragon Ball, Sand Land). The image should look like a professional illustration with Toriyama's signature techniques, featuring a CEO character with full background, based on the following description:

CHARACTER DESCRIPTION:
- East Asian man in his 40s or 50s
- Warm, slightly tanned complexion
- Oval face with prominent nose and defined cheekbones
- Dark brown eyes visible behind glasses
- Thin, well-groomed eyebrows
- Gentle, almost imperceptible smile with closed lips
- Medium brown hair with subtle lighter highlights, curly or wavy
- Hair styled in a slightly messy but fashion-conscious way, swept back and to the sides, adding volume
- Round, dark tortoiseshell-patterned eyeglasses
- Calm, confident, and professional expression with a hint of warmth
- Wearing a dark gray, textured crew-neck sweater over a white t-shirt (white collar visible)

TORIYAMA ILLUSTRATION STYLE (PRIMARY - STRONG ADHERENCE TO AKIRA TORIYAMA'S SIGNATURE TECHNIQUES):

**LINE ART (MOST CRITICAL - TORIYAMA'S DEFINING FEATURE):**
- **Bold, Powerful Outlines**: Strong, consistent black outlines with varying thickness (thicker for foreground elements, thinner for details). Lines are powerful, readable, and unmistakably Toriyama. This is THE most defining characteristic of Toriyama's art style.
- **Clean Line Work**: Every line is deliberate and clear. No sketchy or rough lines. Professional, polished line art quality like Toriyama's published illustrations.
- **Depth Through Line Weight**: Thicker lines for outer contours, thinner lines for inner details. This creates depth and form, a signature Toriyama technique.

**SHADING AND LIGHTING (CELL SHADING TECHNIQUE):**
- **Distinct Cell Shading**: Sharp, clear boundaries between light and shadow areas. No gradual gradients - Toriyama uses flat color areas with hard edges between light and shadow.
- **Dramatic Lighting**: Strong directional lighting creating clear light and shadow zones. Similar to Toriyama's character illustrations with defined light sources.
- **Three-Dimensional Pop**: The cell shading creates a strong 3D effect, making characters and objects pop off the page.

**MATURE CHARACTER DESIGN (LIKE TRUNKS, ADULT GOHAN, OR OLDER GOKU FROM DRAGON BALL):**
- **Facial Structure**: Sharp, defined eyes (not overly large like younger characters), prominent nose, well-defined jawline, realistic proportions. The CEO should look like a mature Toriyama character.
- **Eye Design**: Eyes are detailed but not exaggerated. They convey intelligence and maturity, similar to Trunks or adult Gohan.
- **Facial Features**: Well-defined cheekbones, prominent nose bridge, realistic facial anatomy while maintaining Toriyama's distinctive style.

**HAIR RENDERING:**
- **Volume and Texture**: Hair has clear volume and texture, rendered with Toriyama's signature technique. Not gravity-defying spikes, but natural-looking with clear highlights and shadows.
- **Hair Highlights**: Distinct highlight areas following Toriyama's hair rendering method - clear light areas separated by shadow.

**CLOTHING AND FABRIC:**
- **Clear Folds**: Distinct folds and creases in clothing, rendered with Toriyama's attention to fabric detail. The sweater should show clear fold lines and texture.
- **Fabric Detail**: Clothing has texture and detail, following Toriyama's method of rendering fabric with clear lines and shading.

**BACKGROUND (DETAILED ENVIRONMENT LIKE SAND LAND OR DRAGON BALL BACKGROUNDS):**
- **Clean Line Art Background**: Office environment rendered with Toriyama's clean line art style. Bookshelf with visible book spines (each book clearly outlined), desk with clear wood grain lines, window with proper perspective lines.
- **Depth and Perspective**: Strong sense of depth and perspective, like Toriyama's detailed backgrounds in Sand Land or Dragon Ball.
- **Background Detail**: Every element is clearly defined with clean lines - books, furniture, architectural elements all follow Toriyama's illustrative quality.

**COLOR PALETTE:**
- **Muted Professional Tones**: Like Sand Land aesthetic - natural wood tones, grey walls, dark clothing. Not overly vibrant Dragon Ball colors, but Toriyama's more subdued, professional color sense.
- **Clear Color Separation**: Colors are distinct and separated by the bold outlines, maintaining Toriyama's characteristic look.

**OVERALL QUALITY:**
- **Professional Illustration Quality**: High-quality, polished illustration matching Toriyama's published artwork quality. The image should look like a professional manga/anime illustration, not a photograph.
- **Toriyama's Signature Style**: Bold outlines, cell shading, clean line work, and Toriyama's characteristic visual clarity throughout.

BACKGROUND AND SETTING (INCLUDE FULL OFFICE ENVIRONMENT):
- Modern office environment with the CEO positioned centrally, from chest up
- Left side: Large wooden bookshelf with multiple shelves filled with various books (visible book spines with colors)
- Black office chair partially visible in front of the bookshelf
- Right side: Polished wooden desk surface extending from foreground to background
- Behind the subject: Large window letting in soft, natural light (slightly overexposed)
- Adjacent to window: Light grey concrete wall with visible seams and markings (modern, industrial touch)
- Photographic depth of field: natural bokeh effect in background, subject remains sharp and in focus, exactly like a professional portrait photograph
- Natural, soft lighting highlighting the subject's features and hair
- Muted color palette: natural wood tones, grey walls, dark clothing, white t-shirt, subtle book colors

COMPOSITION AND VISUAL STYLE:
- Medium shot portrait: head and shoulders prominently featured
- Character facing forward, looking directly at viewer
- Subject centered in frame
- Professional and inviting ambiance
- High-quality, detailed illustration in Toriyama's style
- Square format (1:1 aspect ratio) suitable for profile picture/avatar
- Professional illustration quality with Toriyama's distinctive style
- Maintains all CEO's distinctive features (glasses, hair style, facial structure, clothing) in Toriyama illustration form

TECHNICAL SPECIFICATIONS:
- Square format (1:1 aspect ratio)
- High resolution suitable for icon use
- Toriyama's realistic, powerful art style
- Full background included (office environment)
- Character should be recognizable as the CEO, rendered in Toriyama's illustration style - bold outlines, cell shading, clean line work, and Toriyama's characteristic visual clarity. The image should look like a professional manga/anime illustration, not a photograph`;

  console.log('\n🎨 Generating CEO Icon (Akira Toriyama Illustration Style with Full Background)...');
  const image = await generateImage(prompt, '1:1');
  
  if (image) {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const outputDir = path.join(__dirname, '../public/images/icons');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, 'ceo-anime-icon.png');
    fs.writeFileSync(outputPath, base64Data, 'base64');
    const fileSizeKB = (Buffer.from(base64Data, 'base64').length / 1024).toFixed(2);
    console.log(`✅ CEO anime icon saved to ${outputPath} (${fileSizeKB} KB)`);
    return true;
  } else {
    console.error('❌ Failed to generate CEO anime icon');
    return false;
  }
}

async function main() {
  console.log('🎨 Generating CEO Icon');
  console.log('📐 Style: Akira Toriyama Illustration Style (Bold Lines, Cell Shading, Clean Line Art)');
  console.log('🎯 Purpose: Profile Icon/Avatar with Full Office Background');
  console.log('='.repeat(80));

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is not set.');
    console.log('Please set GEMINI_API_KEY in your .env file.');
    process.exit(1);
  }

  const success = await generateCEOAnimeIcon();

  console.log('\n' + '='.repeat(80));
  console.log('📊 生成結果');
  console.log('='.repeat(80));
  console.log(`CEO Anime Icon: ${success ? '✅ 成功' : '❌ 失敗'}`);
  
  if (success) {
    console.log('\n✨ CEOのアイコン（鳥山明イラスト風・背景付き）の生成が完了しました！');
    console.log('📁 保存先: public/images/icons/ceo-anime-icon.png');
    console.log('\n💡 使用方法:');
    console.log('  - プロフィール画像やアバターとして使用');
    console.log('  - Telegram/Xのプロフィール画像として使用');
    console.log('  - アプリケーションのアイコンとして使用');
  } else {
    console.log('\n⚠️ 画像生成に失敗しました。');
  }
  
  console.log('='.repeat(80));
}

main().catch(console.error);
