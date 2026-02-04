#!/usr/bin/env node
/**
 * 現在の市況（ドローダウン）を共有し、
 * - Grok (grok-4-1-fast-reasoning): Xセンチメント／アルゴリズム解析
 * - Gemini (gemini-3-flash-preview): 深層心理解析
 * を行い、結果を docs/ai-analysis-results に保存する（OSにインストール）。
 *
 * 実行: node scripts/drawdown-opportunity-grok-gemini.js
 * 環境変数: .env を ENV_PATH またはプロジェクト直下から読み込む。
 * 例（.env を指定）: ENV_PATH="C:\\Users\\chiba\\hadayalab-automation-platform\\cryptotradeacademy\\.env" node scripts/drawdown-opportunity-grok-gemini.js
 */

const path = require("path");
const fs = require("fs");

// 環境変数: ENV_PATH / ENV_FILE が指定されていればそれを使用、否则プロジェクト直下 .env
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
const GEMINI_MODEL = "gemini-3-flash-preview";

// 現在の市況（ユーザー共有の SoSoValue スクリーンショット準拠・2026年2月初旬）
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

const GROK_PROMPT = `あなたはX（Twitter）のアルゴリズムと crypto 界隈のXセンチメント解析の専門家です。

${MARKET_CONTEXT}

## 依頼内容（Xセンチメント・アルゴリズム）

1. **この市況下での X 上の crypto トレーダーセンチメント**を推測してください（FUD／ホドル／底値狩り／リベンジなど）。トレンドハッシュタグやバイラルになりやすいテーマは何か。
2. **X アルゴリズムの観点**で、今の相場で「インプレッション・エンゲージメント」を最大化する投稿の特徴（長さ・トーン・フック・CTA・ハッシュタグ）を 3〜5 点で簡潔に。
3. **「罠スコア」「トラップスタンバイ」「出口マップ」**のような防御系メッセージを打ち出すアカウントにとって、このドローダウンは最大のチャンスか。理由と、アルゴリズム的に有利な打ち出し方を 2〜3 文で。

出力は日本語で、実務で使える具体性を持たせてください。`;

const GEMINI_PROMPT = `あなたはトレード依存・ギャンブル依存に近い行動をするトレーダーの深層心理の専門家です。

${MARKET_CONTEXT}

## 依頼内容（深層心理）

1. **この市況（ATH から約 4 割下落・日足 bearish）で、トレード依存気味のトレーダー**はどのような心理状態にありがちか（否認・怒り・リベンジ・無力感・「今度こそ」など）。キーワードと短い説明を 5 つ程度。
2. **「罠を避ける」「スコアを見てから動く」「出口マップ」**といった防御・待ちのメッセージが、今なぜ刺さりやすいか。深層心理の観点で 2〜3 文で。
3. **このドローダウンを「最大のチャンス」とする**ために、訴求文・ヘッドライン・CTA で心がけるべき心理原則を 3 つ、簡潔に。

出力は日本語で、マーケティング・コンテンツ設計に転用できる形でまとめてください。`;

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
            "あなたはX（Twitter）アルゴリズムとcrypto界隈のXセンチメント解析の専門家です。データと実務に基づき簡潔に答えます。"
        },
        { role: "user", content: GROK_PROMPT }
      ],
      temperature: 0.5,
      max_tokens: 2000
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
    generationConfig: { temperature: 0.5, maxOutputTokens: 2000 }
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
    "📉 現在の市況を共有し、Grok（Xセンチメント/アルゴリズム）と Gemini（深層心理）に解析させます...\n"
  );
  console.log("ENV loaded from:", envPath);
  console.log("XAI_API_KEY:", XAI_API_KEY ? `${XAI_API_KEY.slice(0, 8)}...` : "not set");
  console.log("GEMINI_API_KEY:", GEMINI_API_KEY ? `${GEMINI_API_KEY.slice(0, 8)}...` : "not set\n");

  const grokResult = await askGrok();
  const geminiResult = await askGemini();

  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join(__dirname, "..", "docs", "ai-analysis-results");
  ensureDir(outDir);
  const outFile = path.join(outDir, `DRAWDOWN_OPPORTUNITY_GROK_GEMINI_${dateStr}.md`);

  let md = `# ドローダウン機会：Grok（Xセンチメント/アルゴリズム）＆ Gemini（深層心理）解析\n\n`;
  md += `**生成日時**: ${now.toISOString()}\n\n`;
  md += `**市況**: BTC $77,084（ATH から -38.95%）、日足 bearish。\n\n`;
  md += `---\n\n`;

  md += `## 共有した市況サマリ\n\n`;
  md += MARKET_CONTEXT.trim() + "\n\n---\n\n";

  md += `## Grok (${GROK_MODEL}) — Xセンチメント・アルゴリズム\n\n`;
  if (grokResult.success) {
    md += grokResult.analysis + "\n\n";
  } else {
    md += `\`\`\`\nError: ${grokResult.error}\n\`\`\`\n\n`;
  }

  md += `---\n\n`;
  md += `## Gemini (${GEMINI_MODEL}) — 深層心理\n\n`;
  if (geminiResult.success) {
    md += geminiResult.analysis + "\n\n";
  } else {
    md += `\`\`\`\nError: ${geminiResult.error}\n\`\`\`\n\n`;
  }

  md += `---\n\n*このファイルは scripts/drawdown-opportunity-grok-gemini.js で生成され、docs/ai-analysis-results にインストールされています。*\n`;

  fs.writeFileSync(outFile, md, "utf8");
  console.log("✅ 結果を保存しました:", outFile);
  console.log("\nGrok:", grokResult.success ? "OK" : grokResult.error);
  console.log("Gemini:", geminiResult.success ? "OK" : geminiResult.error);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
