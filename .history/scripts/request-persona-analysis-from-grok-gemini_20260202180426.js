#!/usr/bin/env node
/**
 * ペルソナ解析を Grok (grok-4-1-fast-reasoning) と Gemini (gemini-3-pro-preview) に依頼する。
 * 既存のペルソナ文書を渡し、「狙い打つべきターゲット」と「備えるべき戦略・戦術」を強化する。
 *
 * 実行: node scripts/request-persona-analysis-from-grok-gemini.js
 * 環境変数: XAI_API_KEY, GEMINI_API_KEY（.env から読み込み）
 * 入力: docs/PERSONA_ANALYSIS_TRADE_ADDICTION_2026-02.md（なければプロンプト内の要約を使用）
 */

const path = require("path");
const fs = require("fs");

const DEFAULT_ENV_PATH = path.join(__dirname, "..", ".env");
const envPath = process.env.ENV_PATH || process.env.ENV_FILE || DEFAULT_ENV_PATH;
const loaded = require("dotenv").config({ path: envPath });
if (!loaded || loaded.error) {
  require("dotenv").config({ path: DEFAULT_ENV_PATH });
}

const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_BASE_URL = process.env.XAI_BASE_URL || "https://api.x.ai/v1";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GROK_MODEL = "grok-4-1-fast-reasoning";
const GEMINI_MODEL = "gemini-3-pro-preview";

const PERSONA_DOC_PATH = path.join(
  __dirname,
  "..",
  "docs",
  "PERSONA_ANALYSIS_TRADE_ADDICTION_2026-02.md"
);

const SYSTEM_INSTRUCTION = `You are a strategist for a crypto/BTC trading education product (Defenders Academy / Trap Defence BTC).
We have a persona document. Build on it and output in Japanese.

重要: 各セクションは十分な分量で具体的に書くこと。短い要約ではなく、実行・意思決定に使えるレベルで深く書く。

Output structure:
1. ペルソナ解析の深掘り（既存整理の強化・補足・反論。心理・行動・定量例を多めに）
2. 狙い打つべきターゲット（誰を・どの条件で・優先順位。セグメント名・具体例・除外条件も）
3. 備えるべき戦略・戦術（X / Whop / メッセージ / コンテンツ / 導線を、施策単位で具体的に。できるだけ多く列挙）

Use clear headings and bullets. Be actionable. 文字数は惜しまず、長く詳細に書く。`;

function getPersonaContext() {
  try {
    if (fs.existsSync(PERSONA_DOC_PATH)) {
      return fs.readFileSync(PERSONA_DOC_PATH, "utf8");
    }
  } catch (e) {
    console.warn("Could not read persona doc:", e.message);
  }
  return `（要約）前提市況: BTC -40%前後、含み損・思考停止・トレード依存の層がいる。
ペルソナ1: 含み損で思考停止中のトレード依存症（損切りもホドりも選べないが相場から離れられない）。
ペルソナ2: プログラム価格を「安い」と思い簡単に払える人（痛みが大きいほど解消への対価を安いと感じる）。
ペルソナ3: XユーザーかつWhopに抵抗がない人（ミレニアル〜Z、20代後半〜30代が中心）。
交差点: 上記3つが重なる「誰に・何を・どう届けるか」でX→Whopの導線を設計する。`;
}

function buildUserPrompt(personaContext) {
  return `以下は、暗号資産（BTC）トレード教育プログラム（Defenders Academy）のペルソナ解析文書です。
この内容を前提に、(1) ペルソナ解析の深掘り、(2) 狙い打つべきターゲット、(3) 備えるべき戦略・戦術 を出力してください。
実行可能で、OS（戦略の土台）を強化できるレベルで書いてください。

---
${personaContext}
---`;
}

async function askGrok(personaContext) {
  if (!XAI_API_KEY) return { success: false, error: "XAI_API_KEY is not set", model: GROK_MODEL };
  const client = new OpenAI({ apiKey: XAI_API_KEY, baseURL: XAI_BASE_URL });
  const userPrompt = buildUserPrompt(personaContext);
  try {
    const res = await client.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.6,
      max_tokens: 8192
    });
    const text = res.choices?.[0]?.message?.content?.trim() || "";
    return { success: true, analysis: text, model: GROK_MODEL };
  } catch (err) {
    return { success: false, error: err.message || String(err), model: GROK_MODEL };
  }
}

async function askGemini(personaContext) {
  if (!GEMINI_API_KEY)
    return { success: false, error: "GEMINI_API_KEY is not set", model: GEMINI_MODEL };
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { temperature: 0.6, maxOutputTokens: 4000 }
  });
  const userPrompt = buildUserPrompt(personaContext);
  const fullPrompt = `${SYSTEM_INSTRUCTION}\n\n${userPrompt}`;
  try {
    const result = await model.generateContent(fullPrompt);
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
  console.log("📋 ペルソナ解析を Grok と Gemini に依頼します（OS強化）\n");
  console.log("Grok model:", GROK_MODEL);
  console.log("Gemini model:", GEMINI_MODEL);
  console.log("Persona doc:", fs.existsSync(PERSONA_DOC_PATH) ? PERSONA_DOC_PATH : "(要約のみ)");
  console.log("XAI_API_KEY:", XAI_API_KEY ? `${XAI_API_KEY.slice(0, 8)}...` : "not set");
  console.log("GEMINI_API_KEY:", GEMINI_API_KEY ? `${GEMINI_API_KEY.slice(0, 8)}...` : "not set\n");

  const personaContext = getPersonaContext();

  const [grokResult, geminiResult] = await Promise.all([
    askGrok(personaContext),
    askGemini(personaContext)
  ]);

  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join(__dirname, "..", "docs", "ai-analysis-results");
  ensureDir(outDir);
  const outFile = path.join(outDir, `PERSONA_ANALYSIS_GROK_GEMINI_${dateStr}.md`);

  let md = `# ペルソナ解析 — Grok & Gemini（OS強化）\n\n`;
  md += `**生成日時**: ${now.toISOString()}\n\n`;
  md += `- **入力**: \`docs/PERSONA_ANALYSIS_TRADE_ADDICTION_2026-02.md\` を前提に、狙い打つべきターゲットと備えるべき戦略・戦術を深掘り\n`;
  md += `- **狙い**: ターゲットと戦略戦術をクリアにし、我々のOSを強化する\n\n`;
  md += `---\n\n`;

  md += `## Grok (${GROK_MODEL})\n\n`;
  if (grokResult.success) {
    md += grokResult.analysis + "\n\n";
  } else {
    md += `\`\`\`\nError: ${grokResult.error}\n\`\`\`\n\n`;
  }

  md += `---\n\n`;
  md += `## Gemini (${GEMINI_MODEL})\n\n`;
  if (geminiResult.success) {
    md += geminiResult.analysis + "\n\n";
  } else {
    md += `\`\`\`\nError: ${geminiResult.error}\n\`\`\`\n\n`;
  }

  md += `---\n\n*scripts/request-persona-analysis-from-grok-gemini.js で生成*\n`;

  fs.writeFileSync(outFile, md, "utf8");
  console.log("✅ 結果を保存しました:", outFile);
  console.log("\n--- Grok (全文) ---\n");
  console.log(grokResult.success ? grokResult.analysis : grokResult.error);
  console.log("\n--- Gemini (全文) ---\n");
  console.log(geminiResult.success ? geminiResult.analysis : geminiResult.error);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
