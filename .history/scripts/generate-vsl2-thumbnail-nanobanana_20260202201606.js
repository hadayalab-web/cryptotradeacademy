#!/usr/bin/env node
/**
 * VSL2 サムネイル生成: Upgrade Trap Defence: 50% Off — Code DEFEND50 | Next 50 Only
 * https://youtu.be/fXgVsKhqDjI
 * ポリティカル・カートゥーン風で NanoBanana Pro (gemini-3-pro-image-preview) を使用。
 * ペルソナ: 22–35 歳（おっさんにしない）。VSLスクリプト（Minimal Coupon）のテーマを反映。
 *
 * 実行: node scripts/generate-vsl2-thumbnail-nanobanana.js  … NanoBanana Pro（推奨）
 *       node scripts/generate-vsl2-thumbnail-nanobanana.js --fast  … 高速モデル（Flash）
 * 出力: public/images/thumbnails/vsl2_thumbnail.png（既存は .bak に退避）
 * 環境変数: .env の GEMINI_API_KEY
 *
 * YouTube サムネイル: 2MB 以内。超過時は JPEG 圧縮で vsl2_thumbnail.jpg を出力。
 */

const path = require("path");
const fs = require("fs");

const ENV_PATH = process.env.ENV_PATH || path.join(__dirname, "..", ".env");
require("dotenv").config({ path: ENV_PATH });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const USE_FAST = process.argv.includes("--fast") || process.env.FAST_IMAGE === "1";
const MODEL = USE_FAST ? "gemini-2.5-flash-image" : "gemini-3-pro-image-preview";

// ペルソナ: 痛みピーク・即決ミレニアル 28-35、Z世代 22-27。おっさん・中年男性にしない。
const PERSONA_CHARACTERS =
  "CRITICAL – Character design: Primary target is millennials (28–35) and Z-gen (22–27). Draw figures as YOUNG ADULTS in their 20s or early 30s. Do NOT draw middle-aged or older men ('ossan'). Diverse genders. Viewers must see themselves as 22–35.";

const STYLE =
  "Create a single-panel editorial cartoon in the style of classic newspaper political cartoons (The New Yorker, Herblock). Black and white ink with clear line work and cross-hatching. No photos, no 3D. Tasteful and editorial. Suitable as a YouTube thumbnail: bold composition, readable at small size. " +
  PERSONA_CHARACTERS;

// VSLスクリプトテーマ: minimum edition vs full protocol, whales evolving, 50% off, next 50 only, DEFEND50, institutional protection, don't leave capital to chance
const VSL2_THUMBNAIL_PROMPT = `${STYLE}

Theme: "Upgrade Trap Defence: 50% Off — Code DEFEND50 | Next 50 Only" (Trap Defence BTC). Script themes: minimum edition shows the door, full protocol shows the entire room; while you watch the score, whales are already evolving; institutional algorithms trigger FOMO; next 50 people only, then link expires and price doubles. Visual: a young trader (22–35, any gender) at a desk—one side or path shows "MINIMUM" / small shield / door; the other shows "FULL PROTOCOL" / four AI engines / whale tracking / "50% OFF" or "NEXT 50 ONLY" or badge "DEFEND50". Contrast: same person at a crossroads—stay on minimum vs upgrade before the 50 spots are gone. Mood: urgency but editorial, not grotesque. No text overlays in the image; purely visual. Caption at bottom in English only: "50% OFF — NEXT 50 ONLY." or "UPGRADE YOUR DEFENCE."`;

const REQUEST_TIMEOUT_MS = 300000;
const OUT_DIR = path.join(__dirname, "..", "public", "images", "thumbnails");
const OUT_FILE = "vsl2_thumbnail.png";
const OUT_FILE_JPG = "vsl2_thumbnail.jpg";
const YOUTUBE_THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024;

async function generateImage(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set. Check .env or ENV_PATH.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig: { aspectRatio: "16:9", imageSize: "2K" }
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let elapsed = 0;
  const progressId = setInterval(() => {
    elapsed += 15;
    console.log(`  … 待機中 (${elapsed}s / 最大${REQUEST_TIMEOUT_MS / 60000}分).`);
  }, 15000);

  console.log("  Sending request to", MODEL, "... (Pro: 2–5 min, --fast: 数十秒)");
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },
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

async function compressToJpegUnderLimit(buffer, maxBytes) {
  try {
    const { createCanvas, loadImage } = require("canvas");
    const img = await loadImage(
      Buffer.isBuffer(buffer) ? `data:image/png;base64,${buffer.toString("base64")}` : buffer
    );
    const canvas = createCanvas(img.width, img.height);
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
  console.log(
    "📰 VSL2 サムネイル生成: Upgrade Trap Defence: 50% Off — Code DEFEND50 | Next 50 Only\n"
  );
  console.log("  Style: ポリティカル・カートゥーン風");
  console.log("  Persona: 22–35 歳（おっさんにしない）");
  console.log("  ENV:", ENV_PATH);
  console.log("  Model:", MODEL, USE_FAST ? "(Flash)" : "(NanoBanana Pro)\n");

  ensureDir(OUT_DIR);

  const outPath = path.join(OUT_DIR, OUT_FILE);
  const bakPath = path.join(OUT_DIR, `vsl2_thumbnail.${Date.now()}.bak.png`);

  if (fs.existsSync(outPath)) {
    fs.copyFileSync(outPath, bakPath);
    console.log("  既存サムネを退避:", bakPath);
  }

  try {
    const { buffer } = await generateImage(VSL2_THUMBNAIL_PROMPT);
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
