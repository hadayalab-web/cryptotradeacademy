#!/usr/bin/env node
/**
 * VSL1 サムネイル生成: Stop Being the Prey — Free Trap Score | Trap Defence BTC
 * ポリティカル・カートゥーン風で NanoBanana Pro (gemini-3-pro-image-preview) を使用。
 * ペルソナ: 含み損を抱え思考停止中のトレード依存症。VSLスクリプトのテーマを反映。
 *
 * 実行: node scripts/generate-vsl1-thumbnail-nanobanana.js
 *       node scripts/generate-vsl1-thumbnail-nanobanana.js --fast  … 高速モデル
 * 出力: public/images/thumbnails/vsl1_thumbnail.png（既存は .bak に退避）
 * 環境変数: .env の GEMINI_API_KEY
 *
 * YouTube サムネイル: 2MB 以内でないとアップロード不可。超過時は JPEG 圧縮で vsl1_thumbnail.jpg を出力。
 */

const path = require("path");
const fs = require("fs");

const ENV_PATH = process.env.ENV_PATH || path.join(__dirname, "..", ".env");
require("dotenv").config({ path: ENV_PATH });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const USE_FAST = process.argv.includes("--fast") || process.env.FAST_IMAGE === "1";
const MODEL = USE_FAST ? "gemini-2.5-flash-image" : "gemini-3-pro-image-preview";

// ポリティカル・カートゥーン風スタイル（Gemini提案: 世の中の矛盾を暴く・ニュースの裏側＝ポリティカル・カートゥーン）
const STYLE =
  "Create a single-panel editorial cartoon in the style of classic newspaper political cartoons (The New Yorker, Herblock). Black and white ink with clear line work and cross-hatching. No photos, no 3D. Tasteful and editorial. Suitable as a YouTube thumbnail: bold composition, readable at small size. Characters: traders of varied ages (20s–40s) and genders so viewers see themselves.";

// ペルソナ（含み損・思考停止・トレード依存症）+ VSL「Stop Being the Prey」+ スクリプトテーマ（trap score, shield, whales, door vs room）
const VSL1_THUMBNAIL_PROMPT = `${STYLE}

Theme: "Stop Being the Prey — Free Trap Score" (Trap Defence BTC). Persona: a trader stuck with unrealized loss, mentally frozen, addicted to watching—the "prey." Visual contrast: one figure paralyzed in front of a red chart and "UNREALIZED LOSS" or "-40%", a stopped clock, thought bubble "just watching"; nearby or in shadow, a subtle "whale" shape or institutional signal. The twist: a small shield or "TRAP SCORE" badge offered like a door out—minimum edition shows the door, full protocol shows the room. Mood: satirical but recognizable—someone stuck in denial who could choose the shield. No text overlays in the image; purely visual. Caption at bottom in English only: "STOP BEING THE PREY."`;

const REQUEST_TIMEOUT_MS = 300000; // 5分（Pro は 2〜4 分かかることがある）
const OUT_DIR = path.join(__dirname, "..", "public", "images", "thumbnails");
const OUT_FILE = "vsl1_thumbnail.png";
const OUT_FILE_JPG = "vsl1_thumbnail.jpg";
const YOUTUBE_THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024; // 2MB（YouTube 上限）

async function generateImage(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set. Check .env or ENV_PATH.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: "16:9", imageSize: "2K" } // YouTube thumbnail 16:9
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const PROGRESS_INTERVAL_MS = 15000;
  let elapsed = 0;
  const progressId = setInterval(() => {
    elapsed += PROGRESS_INTERVAL_MS / 1000;
    console.log(
      `  … 待機中 (${elapsed}s / 最大${REQUEST_TIMEOUT_MS / 60000}分). タイムアウトする場合は --fast を試してください`
    );
  }, PROGRESS_INTERVAL_MS);

  console.log("  Sending request... (Pro: 2–5 min, --fast: 数十秒・推奨)");
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (err) {
    clearInterval(progressId);
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 60000} min.`);
    }
    throw err;
  }
  clearInterval(progressId);
  clearTimeout(timeoutId);

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    const raw = part.inlineData || part.inline_data;
    if (raw) {
      const b64 = raw.data;
      const mime = raw.mimeType || raw.mime_type || "image/png";
      const ext = mime.includes("png") ? "png" : "jpg";
      return { buffer: Buffer.from(b64, "base64"), ext, mime };
    }
  }
  throw new Error("No image in response. " + JSON.stringify(data).slice(0, 500));
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * buffer を JPEG に圧縮して 2MB 以内に収める。canvas が使えない場合は null。
 */
async function compressToJpegUnderLimit(buffer, maxBytes) {
  try {
    const { createCanvas, loadImage } = require("canvas");
    const img = await loadImage(
      Buffer.isBuffer(buffer) ? `data:image/png;base64,${buffer.toString("base64")}` : buffer
    );
    const w = img.width;
    const h = img.height;
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    for (let q = 0.9; q >= 0.5; q -= 0.1) {
      const jpeg = canvas.toBuffer("image/jpeg", { quality: q });
      if (jpeg.length <= maxBytes) return jpeg;
    }
    return canvas.toBuffer("image/jpeg", { quality: 0.5 });
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log("📰 VSL1 サムネイル生成: Stop Being the Prey — Free Trap Score | Trap Defence BTC\n");
  console.log("  Style: ポリティカル・カートゥーン風 (NanoBanana Pro)");
  console.log("  Persona: 含み損・思考停止・トレード依存症");
  console.log("  ENV:", ENV_PATH);
  console.log("  Model:", MODEL, USE_FAST ? "(--fast)" : "(Pro)\n");

  ensureDir(OUT_DIR);

  const outPath = path.join(OUT_DIR, OUT_FILE);
  const bakPath = path.join(OUT_DIR, `vsl1_thumbnail.${Date.now()}.bak.png`);

  if (fs.existsSync(outPath)) {
    fs.copyFileSync(outPath, bakPath);
    console.log("  既存サムネを退避:", bakPath);
  }

  try {
    const { buffer, ext } = await generateImage(VSL1_THUMBNAIL_PROMPT);
    const finalPath = path.join(OUT_DIR, OUT_FILE);
    fs.writeFileSync(finalPath, buffer);
    let sizeBytes = fs.statSync(finalPath).size;
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
    console.log("  ✅ 保存:", finalPath, `(${sizeMB} MB)`);

    if (sizeBytes > YOUTUBE_THUMBNAIL_MAX_BYTES) {
      console.log("  YouTube 2MB 超過のため JPEG 圧縮を試行...");
      const jpegBuffer = await compressToJpegUnderLimit(buffer, YOUTUBE_THUMBNAIL_MAX_BYTES);
      if (jpegBuffer && jpegBuffer.length <= YOUTUBE_THUMBNAIL_MAX_BYTES) {
        const jpgPath = path.join(OUT_DIR, OUT_FILE_JPG);
        fs.writeFileSync(jpgPath, jpegBuffer);
        const jpgMB = (jpegBuffer.length / (1024 * 1024)).toFixed(2);
        console.log("  ✅ YouTube用（2MB以内）:", jpgPath, `(${jpgMB} MB)`);
      } else {
        console.warn(
          "  ⚠️ YouTube サムネは 2MB 以内が必要です。現在",
          sizeMB,
          "MB。手動で圧縮するか、--fast で再生成してください。"
        );
      }
    }
  } catch (err) {
    console.error("  ❌", err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
