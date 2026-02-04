#!/usr/bin/env node
/**
 * X 長文ポスト（最大25,000文字）の最適文字数を Gemini（gemini-3-flash-preview）に聞く。
 * 深層心理の観点で引用リポスト／長文ポスト用テンプレの文字数設計の参考用。
 *
 * 実行: node scripts/ask-gemini-optimal-long-post-length.js
 * 出力: コンソール + docs/ai-analysis-results/OPTIMAL_LONG_POST_LENGTH_GEMINI_*.md
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-3-flash-preview";

const GEMINI_PROMPT = `あなたは深層心理とマーケティングの専門家です。Xプレミアムの長文ポスト（最大25,000文字）について、**深層心理の観点**で最適な文字数を教えてください。

## 前提
- ターゲット: トレード依存気味のトレーダー。有名ヘッドライン風のフック・ツァイガルニク効果（切り抜きチラ見せ）・CTAで誘導。
- 用途: 無料版（Minimal）オプトインまたは有料版（Regular）直導線への長文ポスト。
- 目標: 読み進めてもらう・感情を揺さぶる・行動（クリック・登録）を促す。

## 依頼内容
1. **心理的に「読み切り・行動したくなる」文字数帯**は何文字くらいか（例: 300文字、800文字、1,500文字など）。理由（注意持続・ツァイガルニク・認知負荷等）を簡潔に。
2. **長すぎる場合の心理的リスク**（飽き・離脱・説教感など）、**短すぎる場合のリスク**（信頼感不足・誘導不足など）。
3. **結論として「〇〇文字前後を推奨」**のように1本の数値（または範囲）で答えてください。

出力は日本語で、結論を冒頭に明示し、そのあと理由を簡潔に書いてください。`;

async function askGemini() {
  if (!GEMINI_API_KEY) {
    return { success: false, error: "GEMINI_API_KEY is not set", model: GEMINI_MODEL };
  }
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { temperature: 0.5, maxOutputTokens: 3000 }
  });
  try {
    const result = await model.generateContent(GEMINI_PROMPT);
    const response = result.response;
    const text = response ? response.text() : "";
    return { success: true, analysis: text.trim(), model: GEMINI_MODEL };
  } catch (err) {
    return { success: false, error: err.message || String(err), model: GEMINI_MODEL };
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  console.log("🔄 長文ポスト最適文字数を Gemini（gemini-3-flash-preview）に質問します...\n");

  const result = await askGemini();

  console.log("---\n## Gemini（gemini-3-flash-preview）\n");
  if (result.success) console.log(result.analysis);
  else console.log("❌", result.error);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `OPTIMAL_LONG_POST_LENGTH_GEMINI_${timestamp}.md`;
  const dir = path.join(__dirname, "..", "docs", "ai-analysis-results");
  ensureDir(dir);
  const filepath = path.join(dir, filename);
  const body = [
    "# 長文ポスト最適文字数 — Gemini（深層心理）",
    "",
    `生成日時: ${new Date().toISOString()}`,
    `モデル: ${GEMINI_MODEL}`,
    "",
    "---",
    "",
    result.success ? result.analysis : `エラー: ${result.error}`,
    ""
  ].join("\n");
  fs.writeFileSync(filepath, body, "utf8");
  console.log(`\n📁 保存: ${filepath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
