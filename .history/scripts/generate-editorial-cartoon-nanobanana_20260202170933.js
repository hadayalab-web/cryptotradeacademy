#!/usr/bin/env node
/**
 * Gemini Nano Banana（gemini-2.5-flash-image）で新聞風刺画風の画像を生成する。
 * テーマ: 含み損を抱えて思考停止中のトレード依存症
 *
 * 実行: node scripts/generate-editorial-cartoon-nanobanana.js
 * 環境変数: .env の GEMINI_API_KEY（ENV_PATH で上書き可）
 */

const path = require("path");
const fs = require("fs");

const ENV_PATH = process.env.ENV_PATH || path.join(__dirname, "..", ".env");
require("dotenv").config({ path: ENV_PATH });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash-image";

// 有名な新聞・風刺画のスタイルを参考にしたプロンプト（英語で指定／ドキュメント推奨）
const PROMPT = `Create a single-panel editorial cartoon in the style of classic newspaper political cartoons (like The New Yorker or Herblock). Black and white ink drawing with clear line work and cross-hatching. No photos, no 3D.

Scene: A crypto trader sits frozen in front of a large screen showing a crashing chart and red numbers (-40%). His face is blank, paralyzed. Around him are subtle visual metaphors: a small "whale" shadow on the chart, a clock stopped, a thought bubble with "unrealized loss" and a question mark. The mood is satirical but recognizable—someone stuck in denial, unable to act. One clear message: the trap of holding and not moving. Keep it tasteful and editorial, not grotesque. Add a short fictional newspaper-style caption at the bottom if it fits the style, e.g. "Market Monday."`;

async function generateImage() {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set. Check .env or ENV_PATH.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: PROMPT }] }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"]
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

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

async function main() {
  console.log("📰 新聞風刺画風イメージを Nano Banana (gemini-2.5-flash-image) で生成します...\n");
  console.log("ENV:", ENV_PATH);
  console.log("GEMINI_API_KEY:", GEMINI_API_KEY ? `${GEMINI_API_KEY.slice(0, 8)}...` : "not set");

  const { buffer, ext } = await generateImage();
  const outDir = path.join(__dirname, "..", "docs", "ai-analysis-results");
  ensureDir(outDir);
  const filename = `editorial-cartoon-trade-addiction-${Date.now()}.${ext}`;
  const outPath = path.join(outDir, filename);
  fs.writeFileSync(outPath, buffer);
  console.log("\n✅ 保存しました:", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
