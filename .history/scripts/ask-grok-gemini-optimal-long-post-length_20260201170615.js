#!/usr/bin/env node
/**
 * X 長文ポスト（最大25,000文字）の最適文字数を Grok（Xアルゴリズム）と Gemini（深層心理）に聞く。
 * 引用リポスト／長文ポスト用テンプレの文字数設計の参考用。
 *
 * 実行: node scripts/ask-grok-gemini-optimal-long-post-length.js
 * 出力: コンソール + docs/ai-analysis-results/OPTIMAL_LONG_POST_LENGTH_*.md
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_BASE_URL = process.env.XAI_BASE_URL || "https://api.x.ai/v1";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GROK_MODEL = "grok-4-1-fast-reasoning";
const GEMINI_MODEL = "gemini-3-pro-preview";

const GROK_PROMPT = `あなたはX（Twitter）アルゴリズム解析の専門家です。Xプレミアムの長文ポスト（最大25,000文字）について、**アルゴリズムの観点**で最適な文字数を教えてください。

## 前提
- アカウントはXプレミアム（旧Twitter Blue）で、長文ポストが利用可能（最大25,000文字）。
- 用途: 引用リポストまたは通常の長文ポストで、BTC/暗号トレードのファネル（無料版オプトイン・有料版直導線）への誘導。
- 目標: インプレッション・エンゲージメント・クリック率の最大化。

## 依頼内容
1. **アルゴリズム的に有利な文字数帯**は何文字くらいか（例: 500文字、1,000文字、2,000文字など）。理由（タイムライン表示・完読率・シェアされやすさ等）を簡潔に。
2. **避けるべき文字数**（長すぎて離脱、短すぎて情報不足など）があれば。
3. **結論として「〇〇文字前後を推奨」**のように1本の数値（または範囲）で答えてください。

出力は日本語で、結論を冒頭に明示し、そのあと理由を簡潔に書いてください。`;

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

async function askGrok() {
  if (!XAI_API_KEY) return { success: false, error: "XAI_API_KEY is not set", model: GROK_MODEL };
  const client = new OpenAI({ apiKey: XAI_API_KEY, baseURL: XAI_BASE_URL });
  try {
    const res = await client.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        {
          role: "system",
          content:
            "あなたはX（Twitter）アルゴリズム解析の専門家です。データと実務に基づき簡潔に答えます。"
        },
        { role: "user", content: GROK_PROMPT }
      ],
      temperature: 0.5,
      max_tokens: 1500
    });
    const text = res.choices?.[0]?.message?.content?.trim() || "";
    return { success: true, analysis: text, model: GROK_MODEL };
  } catch (err) {
    return { success: false, error: err.message || String(err), model: GROK_MODEL };
  }
}

async function askGemini() {
  if (!GEMINI_API_KEY)
    return { success: false, error: "GEMINI_API_KEY is not set", model: GEMINI_MODEL };
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { temperature: 0.5, maxOutputTokens: 1500 }
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
  console.log(
    "🔄 長文ポスト最適文字数を Grok（Xアルゴリズム）と Gemini（深層心理）に質問します...\n"
  );

  const [grokResult, geminiResult] = await Promise.all([askGrok(), askGemini()]);

  console.log("---\n## Grok（Xアルゴリズム）\n");
  if (grokResult.success) console.log(grokResult.analysis);
  else console.log("❌", grokResult.error);

  console.log("\n---\n## Gemini（深層心理）\n");
  if (geminiResult.success) console.log(geminiResult.analysis);
  else console.log("❌", geminiResult.error);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `OPTIMAL_LONG_POST_LENGTH_${timestamp}.md`;
  const dir = path.join(__dirname, "..", "docs", "ai-analysis-results");
  ensureDir(dir);
  const filepath = path.join(dir, filename);
  const body = [
    "# 長文ポスト最適文字数 — Grok（Xアルゴリズム） / Gemini（深層心理）",
    "",
    `生成日時: ${new Date().toISOString()}`,
    "",
    "---",
    "",
    "## Grok（grok-4-1-fast-reasoning）",
    "",
    grokResult.success ? grokResult.analysis : `エラー: ${grokResult.error}`,
    "",
    "---",
    "",
    "## Gemini（gemini-3-pro-preview）",
    "",
    geminiResult.success ? geminiResult.analysis : `エラー: ${geminiResult.error}`,
    ""
  ].join("\n");
  fs.writeFileSync(filepath, body, "utf8");
  console.log(`\n📁 保存: ${filepath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
