/**
 * Trap Defence BTC VSL - YouTubeサムネイル生成（Nano Banana Pro）
 *
 * VSLのストーリーに基づき、私（CEO）とDr.Grokを登場させ、
 * 任天堂ゲームパッケージ風のサムネイルを生成します。
 * 盾はブランドロゴです。
 *
 * 実行: GEMINI_API_KEY=xxx node scripts/generate-vsl-thumbnail-nanobanana.js
 *
 * オプション環境変数:
 *   CEO_AVATAR_PATH   - CEOアバター画像パス
 *   DR_GROK_PATH      - Dr.Grokキャラ画像パス
 *   BRAND_SHIELD_PATH - ブランドロゴ（盾）画像パス
 *   OUTPUT_PATH       - 出力ファイルパス
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-pro-image-preview"; // Nano Banana Pro

// 画像パス（環境変数またはデフォルト）
const ROOT = path.join(__dirname, "..");
const ASSETS = path.join(ROOT, "assets", "vsl-thumbnail");

function resolveImagePath(envPath, candidates) {
  if (envPath && fs.existsSync(envPath)) return envPath;
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0]; // 存在しなくてもパスを返す（スキップ用）
}

const CEO_AVATAR = resolveImagePath(process.env.CEO_AVATAR_PATH, [
  path.join(ASSETS, "ceo_avatar.png"),
  path.join(ROOT, "public", "images", "icons", "ceo-anime-icon.png"),
]);
const DR_GROK = resolveImagePath(process.env.DR_GROK_PATH, [
  path.join(ASSETS, "dr_grok.png"),
  path.join(ROOT, "public", "images", "thumbnails", "3d_character_dr-grok.png"),
]);
const BRAND_SHIELD = resolveImagePath(process.env.BRAND_SHIELD_PATH, [
  path.join(ASSETS, "brand_shield.png"),
  path.join(ROOT, "public", "images", "icons", "brand-logo-shield.png"),
]);
const OUTPUT = process.env.OUTPUT_PATH || path.join(ROOT, "output", "vsl_trap_defence_btc_thumbnail.png");

// 参考: VSL「Trap Defence BTC」ストーリー
// - 2人のトレーダー: 1人はホエールトラップで全資産清算、もう1人は防御システムで$5,000利益
// - テーマ: Stop being the prey, become the defender
// - Defenders Academy, trap score

const PROMPT = `Create a professional YouTube thumbnail (16:9) in the style of a Nintendo game package / game box art.

**Theme**: "Trap Defence BTC" - A crypto trading defense system that protects traders from whale traps. Story: two traders, one loses everything to whale traps, the other uses the system and profits. "Stop being the prey, become the defender."

**Required elements**:
1. **CEO / Founder** (Person 1): An Asian man in his 30s-40s, wavy brown hair, tortoiseshell glasses, serious expression, wearing dark gray/charcoal crewneck sweater. Manga/anime illustration style. He represents the "Defender" who uses the system.

2. **Dr.Grok** (Person 2): A Mario-style 3D character, doctor outfit with white lab coat, "DR. GROK" on chest, head mirror, stethoscope with Bitcoin symbol, smart glasses showing charts. Friendly, knowledgeable vibe. He is the AI advisor/mentor.

3. **Brand logo (Shield)**: A shield containing golden candle chart elements - represents protection and crypto trading. Place it prominently as the brand badge.

**Visual style**:
- Nintendo game package aesthetic: bold borders, vibrant colors, game cover layout
- Composition: Both characters positioned like game protagonists, dynamic poses
- Background: Crypto/trading themed (subtle charts, BTC elements) but not cluttered
- Title text area: "TRAP DEFENCE BTC" in bold game-style typography
- Subtitle: "Defenders Academy" or "Become the Defender"
- High contrast, eye-catching, suitable for YouTube CTR
- 16:9 aspect ratio, professional quality

**Mood**: Empowering, defensive, strategic - like a hero selecting their weapon before battle.`;

function toBase64(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  return buf.toString("base64");
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
    console.error("   .env に設定するか、環境変数で渡してください。");
    process.exit(1);
  }

  console.log("🎮 Trap Defence BTC - YouTubeサムネイル生成（Nano Banana Pro）\n");
  console.log(`モデル: ${MODEL}`);
  console.log(`出力: ${OUTPUT}\n`);

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  // 参考画像を読み込み（オプション: 存在するものだけ使用）
  const contents = [{ text: PROMPT }];

  const refImages = [
    { path: CEO_AVATAR, label: "CEO Avatar" },
    { path: DR_GROK, label: "Dr.Grok" },
    { path: BRAND_SHIELD, label: "Brand Shield" },
  ];

  for (const { path: imgPath, label } of refImages) {
    if (fs.existsSync(imgPath)) {
      const b64 = toBase64(imgPath);
      const mime = getMimeType(imgPath);
      contents.push({
        inlineData: { mimeType: mime, data: b64 },
      });
      console.log(`✅ 参考画像: ${label} (${path.basename(imgPath)})`);
    } else {
      console.log(`⚠️ スキップ（未存在）: ${label} - ${imgPath}`);
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
      if (part.text) {
        console.log("📝 モデル応答:", part.text);
      }
      if (part.inlineData?.data) {
        const buffer = Buffer.from(part.inlineData.data, "base64");
        const outDir = path.dirname(OUTPUT);
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }
        fs.writeFileSync(OUTPUT, buffer);
        console.log(`\n✅ サムネイルを保存しました: ${OUTPUT}`);
        saved = true;
      }
    }

    if (!saved) {
      console.error("❌ 画像が生成されませんでした。応答を確認してください。");
      console.log(JSON.stringify(response, null, 2));
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ エラー:", err.message);
    if (err.response) {
      console.error("応答:", JSON.stringify(err.response, null, 2));
    }
    process.exit(1);
  }
}

main();
