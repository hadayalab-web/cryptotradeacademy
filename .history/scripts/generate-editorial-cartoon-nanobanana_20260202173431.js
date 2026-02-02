#!/usr/bin/env node
/**
 * Nano Banana Pro: Gemini 3 Pro Image プレビュー版で新聞風刺画風の画像を複数パターン生成する。
 * キャプションはENのみ。他言語では投稿テキストで補足して使いまわす。
 *
 * 実行:
 *   node scripts/generate-editorial-cartoon-nanobanana.js              … 全パターン（Pro）
 *   node scripts/generate-editorial-cartoon-nanobanana.js holding      … 指定パターンのみ
 *   node scripts/generate-editorial-cartoon-nanobanana.js --fast       … 高速モデルで全パターン
 *   node scripts/generate-editorial-cartoon-nanobanana.js holding --fast … 高速で1パターン
 * 環境変数: .env の GEMINI_API_KEY（ENV_PATH で上書き可）。FAST_IMAGE=1 で高速モデル。
 *
 * 注意: Pro は1枚あたり1〜2分かかることがあります。15秒ごとに「まだ待機中」と表示されます。
 *       遅い場合は --fast または FAST_IMAGE=1 で高速モデル（Nano Banana）を試してください。
 */

const path = require("path");
const fs = require("fs");

const ENV_PATH = process.env.ENV_PATH || path.join(__dirname, "..", ".env");
require("dotenv").config({ path: ENV_PATH });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const USE_FAST = process.argv.includes("--fast") || process.env.FAST_IMAGE === "1";
const MODEL = USE_FAST ? "gemini-2.5-flash-image" : "gemini-3-pro-image-preview";

const STYLE =
  "Create a single-panel editorial cartoon in the style of classic newspaper political cartoons (like The New Yorker or Herblock). Black and white ink drawing with clear line work and cross-hatching. No photos, no 3D. Keep it tasteful and editorial, not grotesque. Add a short fictional newspaper-style caption at the bottom in English only.";

// ローテーション用パターン（ENキャプションのみ・デザイン統一のため他言語はテキストで補足）
const PATTERNS = [
  {
    id: "holding-pattern",
    name: "Holding Pattern（思考停止・ホドり）",
    prompt: `${STYLE}

Scene: A crypto trader sits frozen in front of a large screen showing a crashing chart and red numbers (-40%). His face is blank, paralyzed. Around him: a small "whale" shadow on the chart, a clock stopped, a thought bubble with "UNREALIZED LOSS?" and a question mark. Mood: someone stuck in denial, unable to act. Caption at bottom: "MARKET MONDAY: THE HOLDING PATTERN."`
  },
  {
    id: "two-paths",
    name: "Two Paths（二つの道）",
    prompt: `${STYLE}

Scene: Two figures in the same room. One sits in a tidy chair, calm, with a small shield or "score" visible—the defender who waited. The other is on the floor next to a broken chair, chart papers scattered, a screen showing "LIQUIDATED." Contrast: same market, different outcome. Caption at bottom: "TWO PATHS."`
  },
  {
    id: "reality-check",
    name: "Reality Check（現実と向き合う）",
    prompt: `${STYLE}

Scene: A trader stares into a large mirror. In the mirror reflection we see "-40%" or "CRASH" or "LIQUIDATED" instead of his face, or the mirror shows a crumbling chart. He is frozen, unable to look away. Mood: facing the truth. Caption at bottom: "REALITY CHECK."`
  },
  {
    id: "same-day-different-game",
    name: "Same Day, Different Game（狩人と防衛者）",
    prompt: `${STYLE}

Scene: Split or two desks. Left: a figure slumped, screen red "LIQUIDATED," whale shadow—the prey. Right: another figure, same room, screen green or neutral, small shield icon—the defender. Same day, same market. Caption at bottom: "SAME DAY. DIFFERENT GAME."`
  },
  {
    id: "time-out",
    name: "Time Out（時が止まった）",
    prompt: `${STYLE}

Scene: A trader frozen at his desk, hand on mouse, eyes wide. Behind him a large wall clock has stopped. The screen shows a crashing chart and "-40%." Papers and coffee untouched. Mood: time stood still, paralysis. Caption at bottom: "TIME OUT."`
  }
];

const REQUEST_TIMEOUT_MS = 180000; // 3分（Nano Banana Pro は推論に時間がかかることがある）

async function generateImage(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set. Check .env or ENV_PATH.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: "4:3", imageSize: "2K" }
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const PROGRESS_INTERVAL_MS = 15000; // 15秒ごとにログ
  let elapsed = 0;
  const progressId = setInterval(() => {
    elapsed += PROGRESS_INTERVAL_MS / 1000;
    console.log(`  … まだ待機中 (${elapsed}s / 最大${REQUEST_TIMEOUT_MS / 60000}分)`);
  }, PROGRESS_INTERVAL_MS);

  console.log("  Sending request... (Pro: 1–2 min, Fast: 数十秒。最大3分でタイムアウト)");
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
      throw new Error(
        `Request timed out after ${REQUEST_TIMEOUT_MS / 60000} min. Try again or run a single pattern.`
      );
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
  throw new Error("No image in response. Response: " + JSON.stringify(data).slice(0, 800));
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--fast");
  const patternId = args[0]; // 省略時は全パターン
  const list = patternId ? PATTERNS.filter((p) => p.id === patternId) : PATTERNS;
  if (list.length === 0) {
    console.log("Usage: node generate-editorial-cartoon-nanobanana.js [patternId] [--fast]");
    console.log("Patterns:", PATTERNS.map((p) => p.id).join(", "));
    process.exit(1);
  }

  console.log(
    "📰 新聞風刺画風イメージを Nano Banana Pro で生成します（ENキャプションのみ・他言語はテキストで補足）\n"
  );
  console.log("ENV:", ENV_PATH);
  console.log("GEMINI_API_KEY:", GEMINI_API_KEY ? `${GEMINI_API_KEY.slice(0, 8)}...` : "not set");
  console.log("Model:", MODEL, USE_FAST ? "(--fast: 高速)" : "(Pro: 1〜2分かかることがあります)");
  console.log("Patterns to generate:", list.map((p) => p.id).join(", "), "\n");

  const outDir = path.join(__dirname, "..", "docs", "ai-analysis-results");
  ensureDir(outDir);

  for (let i = 0; i < list.length; i++) {
    const pat = list[i];
    console.log(`[${i + 1}/${list.length}] Generating: ${pat.id} — ${pat.name}`);
    try {
      const { buffer, ext } = await generateImage(pat.prompt);
      const filename = `editorial-cartoon-${pat.id}-${Date.now()}.${ext}`;
      const outPath = path.join(outDir, filename);
      fs.writeFileSync(outPath, buffer);
      console.log("  ✅", outPath);
    } catch (err) {
      console.error("  ❌", pat.id, err.message);
    }
    if (i < list.length - 1) await sleep(3000); // レート制限対策
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
