#!/usr/bin/env node
/**
 * 市況を共有し、Gemini (gemini-3-flash-preview) に深層心理解析を再度依頼する。
 * 前回回答が途中で切れたため、maxOutputTokens を増やして完全な回答を取得。
 *
 * 実行: node scripts/drawdown-opportunity-gemini-only.js
 */

const path = require("path");
const fs = require("fs");

const DEFAULT_ENV_PATH = path.join(__dirname, "..", ".env");
const envPath = process.env.ENV_PATH || process.env.ENV_FILE || DEFAULT_ENV_PATH;
const loaded = require("dotenv").config({ path: envPath });
if (!loaded || loaded.error) {
  require("dotenv").config({ path: DEFAULT_ENV_PATH });
}

const { GoogleGenerativeAI } = require("@google/generative-ai");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-3-flash-preview";

const MARKET_CONTEXT = `
## 現在の Crypto 市況（共有データ）

### 全体
- **Total Market Cap**: $2,673.65 Billion（24h -2.83%）
- **24h Volume**: $158.90 Billion

### BTC
- **価格**: $77,084（24h -2.14%）
- **ATH**: $126,199.6 USDT（2025-10-06）
- **ATH からの下落**: **-38.95%**
- **24h High**: $79,220.72 / **24h Low**: $75,700
- **MA**: MA5 80,340 / MA10 84,449 / MA30 89,718 / MA60 89,254 → 現在価格は全MAを下回り強い bearish
- **Volume**: 3.932K（VOL MA5 26.889K, MA10 19.832K, MA20 17.345K）

### その他
- ETH: $2,285.38（-6.84%）
- 主要アルトも軒並みマイナス
- ニュース例: 「インフレ率0.86%に低下、米ドル再び力強い上昇の可能性」「1月VCが暗号市場に14億ドル投資、機関インフラ人気」

### 解釈
- 市況は「ひどい」状態。BTC は ATH から約 4 割下落し、日足で下落トレンド継続。
- トレーダーは含み損・連敗・リベンジトレード・FUD に晒されやすい局面。
`;

const GEMINI_PROMPT = `あなたはトレード依存・ギャンブル依存に近い行動をするトレーダーの深層心理の専門家です。

${MARKET_CONTEXT}

## 依頼内容（深層心理）— 以下3点を**漏れなく全て**含めてください

1. **この市況（ATH から約 4 割下落・日足 bearish）で、トレード依存気味のトレーダー**はどのような心理状態にありがちか（否認・怒り・リベンジ・無力感・「今度こそ」など）。キーワードと短い説明を 5 つ程度。

2. **「罠を避ける」「スコアを見てから動く」「出口マップ」**といった防御・待ちのメッセージが、今なぜ刺さりやすいか。深層心理の観点で 2〜3 文で。

3. **このドローダウンを「最大のチャンス」とする**ために、訴求文・ヘッドライン・CTA で心がけるべき心理原則を 3 つ、簡潔に。

出力は日本語で、マーケティング・コンテンツ設計に転用できる形でまとめてください。前回は回答が途中で切れたため、上記 1〜3 をすべて完結した形で書いてください。`;

async function askGemini() {
  if (!GEMINI_API_KEY)
    return { success: false, error: "GEMINI_API_KEY is not set", model: GEMINI_MODEL };
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { temperature: 0.5, maxOutputTokens: 8192 }
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
  console.log("🔄 Gemini (gemini-3-flash-preview) に深層心理解析を再度依頼します...\n");
  console.log("ENV loaded from:", envPath);
  console.log("GEMINI_API_KEY:", GEMINI_API_KEY ? `${GEMINI_API_KEY.slice(0, 8)}...` : "not set\n");

  const result = await askGemini();

  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join(__dirname, "..", "docs", "ai-analysis-results");
  ensureDir(outDir);
  const outFile = path.join(outDir, `DRAWDOWN_OPPORTUNITY_GEMINI_ONLY_${dateStr}.md`);

  let md = `# ドローダウン機会：Gemini（深層心理）再解析\n\n`;
  md += `**生成日時**: ${now.toISOString()}\n\n`;
  md += `**市況**: BTC $77,084（ATH から -38.95%）、日足 bearish。\n\n`;
  md += `---\n\n`;
  md += `## 共有した市況サマリ\n\n`;
  md += MARKET_CONTEXT.trim() + "\n\n---\n\n";
  md += `## Gemini (${GEMINI_MODEL}) — 深層心理（再取得・完全版）\n\n`;

  if (result.success) {
    md += result.analysis + "\n\n";
  } else {
    md += `\`\`\`\nError: ${result.error}\n\`\`\`\n\n`;
  }

  md += `---\n\n*scripts/drawdown-opportunity-gemini-only.js で生成。*\n`;

  fs.writeFileSync(outFile, md, "utf8");
  console.log("✅ 結果を保存しました:", outFile);
  console.log(result.success ? "Gemini: OK" : "Gemini: " + result.error);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
