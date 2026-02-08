/**
 * Trap Score 28/100 - 高CTR YouTubeサムネイル生成（Nano Banana Pro）
 *
 * テーマ: 暗号危機、データ駆動分析、Trap Defence ブランド
 * 全言語対応、グローバル暗号トレーダー向け
 *
 * 実行: GEMINI_API_KEY=xxx node scripts/generate-thumbnail-trap-score.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-pro-image-preview"; // Nano Banana Pro

const ROOT = path.join(__dirname, "..");
const CURSOR_ASSETS = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  ".cursor",
  "projects",
  "c-Users-chiba-hadayalab-automation-platform-cryptotradeacademy",
  "assets"
);
const PROJECT_ASSETS = path.join(ROOT, "assets", "vsl-thumbnail");

function resolvePath(envPath, candidates) {
  if (envPath && fs.existsSync(envPath)) return envPath;
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

const BRAND_SHIELD = resolvePath(process.env.BRAND_SHIELD_PATH, [
  path.join(PROJECT_ASSETS, "brand_shield.png"),
  path.join(CURSOR_ASSETS, "c__Users_chiba_AppData_Roaming_Cursor_User_workspaceStorage_81230dadf808bdffba38e79893c7a1a5_images_logo_cryptotradeacademy_transparent-ea23c74a-afd0-46fa-9528-2bc23c3fae50.png"),
  path.join(ROOT, "public", "images", "icons", "brand-logo-shield.png"),
]);
const DR_GROK = resolvePath(process.env.DR_GROK_PATH, [
  path.join(PROJECT_ASSETS, "dr_grok.png"),
  path.join(CURSOR_ASSETS, "c__Users_chiba_AppData_Roaming_Cursor_User_workspaceStorage_81230dadf808bdffba38e79893c7a1a5_images_3d_character_dr-grok-d1c4e58c-2d4b-462d-9d77-78dd861117bd.png"),
  path.join(ROOT, "public", "images", "thumbnails", "3d_character_dr-grok.png"),
]);
const OUTPUT = process.env.OUTPUT_PATH || path.join(ROOT, "output", "trap_score_28_thumbnail.png");

const PROMPT = `Create a high-CTR YouTube thumbnail in 1280x720 (16:9), optimized for global audiences and matching the Trap Defence brand identity.

**Visual style**:
- Deep red background (#C40000) with faint candlestick chart patterns (very low opacity)
- High contrast black gradient edges (#000000) for a crisis atmosphere
- Large bold white text (#FFFFFF) with black outline: "28/100"
- Below it, bold text: "Trap Score"
- Secondary line: "Stability is a disguise"
- Bottom-left small data text: "Whale Ratio 0.42 / Negative Netflow"
- Place the Trap Defence shield logo (gold #D4AF37 + black) in the top-left corner, small but sharp
- On the right side, include a dark silhouette of a calm, expressionless analyst/doctor figure (Dr. Grok style), occupying 60–70% of the right vertical space
- Use bold sans-serif fonts, extremely high contrast, smartphone-readable
- Leave the bottom-right area empty for YouTube's timestamp
- Color palette: red (#C40000), black (#000000), white (#FFFFFF), gold (#D4AF37)

**Mood**: Cold, analytical, data-driven, with a sense of hidden danger beneath apparent stability.

**Composition**:
- Left: giant "28/100"
- Center: "Trap Score" + "Stability is a disguise"
- Bottom-left: data metrics
- Top-left: Trap Defence logo
- Right: silhouette of Dr. Grok (60–70% of right vertical space)
- Background: faint candlestick chart or network-flow lines

**Goal**: A universal, high-impact thumbnail that communicates "danger disguised as stability," maximizes click-through rate, and aligns perfectly with the Trap Defence brand across all languages.

**Final refinement (apply only these adjustments; do not redesign)**:
1. Move "28/100" slightly upward for cleaner visual hierarchy
2. Center "Trap Score" more precisely beneath the number
3. Move "Stability is a disguise" slightly downward to improve spacing between lines
4. Reduce background candlestick patterns to 5–10% opacity (subtle)
5. Trap Defence shield logo: about 80% of current size
6. Dr. Grok silhouette: increase size so it fills 60–70% of the right vertical space
7. Maintain red–black gradient background, high-contrast white text, minimalist style
8. Keep bottom-right area empty for YouTube's timestamp
9. Do not alter the text, colors, fonts, or overall theme
Only refine spacing, sizing, and visual balance. Do not redesign or reinterpret the thumbnail.

Use the reference images: (1) Trap Defence shield logo for top-left, (2) Dr. Grok character as reference for the silhouette on the right - render as a dark silhouette, not full color.`;

function toBase64(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath).toString("base64");
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

async function main() {
  if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY が設定されていません。");
    process.exit(1);
  }

  console.log("📊 Trap Score 28/100 - 高CTR YouTubeサムネイル生成（Nano Banana Pro）\n");
  console.log(`モデル: ${MODEL}`);
  console.log(`出力: ${OUTPUT}\n`);

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const contents = [{ text: PROMPT }];

  const refImages = [
    { path: BRAND_SHIELD, label: "Trap Defence Shield Logo" },
    { path: DR_GROK, label: "Dr. Grok" },
  ];

  for (const { path: imgPath, label } of refImages) {
    if (fs.existsSync(imgPath)) {
      contents.push({
        inlineData: { mimeType: getMimeType(imgPath), data: toBase64(imgPath) },
      });
      console.log(`✅ 参考画像: ${label}`);
    } else {
      console.log(`⚠️ スキップ: ${label}`);
    }
  }

  console.log("\n🔄 生成中...\n");

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "2K",
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    let saved = false;

    for (const part of parts) {
      if (part.text) console.log("📝", part.text);
      if (part.inlineData?.data) {
        const buffer = Buffer.from(part.inlineData.data, "base64");
        const outDir = path.dirname(OUTPUT);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(OUTPUT, buffer);
        console.log(`\n✅ 保存: ${OUTPUT}`);
        saved = true;
      }
    }

    if (!saved) {
      console.error("❌ 画像が生成されませんでした");
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ エラー:", err.message);
    process.exit(1);
  }
}

main();
