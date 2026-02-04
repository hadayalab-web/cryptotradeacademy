#!/usr/bin/env node
/**
 * Grok（grok-4-1-fast-reasoning）と Gemini（gemini-3-flash-preview）に
 * 「いつ・誰に・Minimal と Regular のどちらを出すか」のルールを聞く。
 * 300インフルエンサー × 2種類のX投稿パターンをぐるぐる回す戦略の確立用。
 *
 * 実行: node scripts/ask-grok-gemini-minimal-vs-regular-rule.js
 * 出力: コンソール + docs/ai-analysis-results/MINIMAL_VS_REGULAR_RULE_*.md
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
const GEMINI_MODEL = "gemini-3-flash-preview";

const SHARED_PROMPT = `あなたはTrap Defence BTCのマーケティング戦略担当です。X（Twitter）での引用リポスト戦略について、**実装可能な1本のルール**を提案してください。

## 前提

- **インフルエンサー**: 約300人（6言語でストック、フォロワー数・エンゲージメント率は言語ごとにばらつきあり）
- **投稿パターンは2種類**:
  1. **Minimal オプトイン**: 無料版（Minimal Version）への導線。VSL視聴 → Whop Minimal 無料登録。リスト取り・認知拡大向け。
  2. **Regular 直導線**: 有料版（Regular Briefing）への直導線。VSL視聴 → プロモコード defend50 → Whop Regular。即コンバージョン向け。

- **目標**: 300人 × 2パターンを「ぐるぐる回す」ことで、リーチとファネル両方を最大化する。同じ人に同じメッセージが連続しないようにしつつ、**いつ・誰に・Minimal と Regular のどちらを出すか**を決めるルールが必要です。

## 依頼内容

**「いつ・誰に・Minimal と Regular のどちらを出すか」を決める、シンプルで実装しやすいルールを1本提案してください。**

以下の観点を含めてください（すべてでなくてよいです。実装可能なルールに絞ってよいです）:

1. **いつ（タイミング）**: 時間帯・曜日・ピーク/オフピークで Minimal と Regular を振り分けるか？
2. **誰（インフルエンサー）**: フォロワー数・エンゲージメント率・言語で Minimal 向き / Regular 向きを分けるか？
3. **どちら（Minimal vs Regular）**: ランダム50%・時間帯で固定・インフルエンサー属性で固定・ローテーション表のいずれか（または組み合わせ）で決めるか？
4. **実装の具体性**: そのルールをコード（if/else や設定ファイル）に落とす場合、どう書くか（疑似コードや条件式でOK）。

出力は日本語で、**結論のルールを冒頭に1〜3文で明示**し、そのあと理由・補足を簡潔に書いてください。`;

async function askGrok() {
  if (!XAI_API_KEY) {
    return { success: false, error: "XAI_API_KEY is not set", model: GROK_MODEL };
  }
  const client = new OpenAI({ apiKey: XAI_API_KEY, baseURL: XAI_BASE_URL });
  try {
    const res = await client.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        {
          role: "system",
          content:
            "あなたはX（Twitter）マーケティングとアルゴリズムに詳しい戦略家です。実装可能なルールを簡潔に提案します。"
        },
        { role: "user", content: SHARED_PROMPT }
      ],
      temperature: 0.6,
      max_tokens: 2000
    });
    const text = res.choices?.[0]?.message?.content?.trim() || "";
    return { success: true, analysis: text, model: GROK_MODEL };
  } catch (err) {
    return { success: false, error: err.message || String(err), model: GROK_MODEL };
  }
}

async function askGemini() {
  if (!GEMINI_API_KEY) {
    return { success: false, error: "GEMINI_API_KEY is not set", model: GEMINI_MODEL };
  }
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { temperature: 0.6, maxOutputTokens: 2000 }
  });
  try {
    const result = await model.generateContent(SHARED_PROMPT);
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

function writeResult(filename, grokResult, geminiResult) {
  const dir = path.join(__dirname, "..", "docs", "ai-analysis-results");
  ensureDir(dir);
  const filepath = path.join(dir, filename);
  const lines = [
    "# いつ・誰に・Minimal vs Regular を出すか — Grok / Gemini 回答",
    "",
    `生成日時: ${new Date().toISOString()}`,
    "",
    "---",
    "",
    "## 共通プロンプト（要約）",
    "",
    "- 300インフルエンサー × 2パターン（Minimal オプトイン / Regular 直導線）をぐるぐる回す。",
    "- 「いつ・誰に・Minimal と Regular のどちらを出すか」を決める**実装可能な1本のルール**を提案してほしい。",
    "",
    "---",
    "",
    `## Grok（${GROK_MODEL}）`,
    "",
    grokResult.success ? grokResult.analysis : `エラー: ${grokResult.error}`,
    "",
    "---",
    "",
    `## Gemini（${GEMINI_MODEL}）`,
    "",
    geminiResult.success ? geminiResult.analysis : `エラー: ${geminiResult.error}`,
    ""
  ];
  fs.writeFileSync(filepath, lines.join("\n"), "utf8");
  console.log(`\n📁 保存: ${filepath}`);
}

async function main() {
  console.log("🔄 「いつ・誰に・Minimal vs Regular」ルールを Grok と Gemini に質問します...\n");

  const [grokResult, geminiResult] = await Promise.all([askGrok(), askGemini()]);

  console.log("---\n## Grok\n");
  if (grokResult.success) {
    console.log(grokResult.analysis);
  } else {
    console.log("❌", grokResult.error);
  }

  console.log("\n---\n## Gemini\n");
  if (geminiResult.success) {
    console.log(geminiResult.analysis);
  } else {
    console.log("❌", geminiResult.error);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `MINIMAL_VS_REGULAR_RULE_${timestamp}.md`;
  writeResult(filename, grokResult, geminiResult);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
