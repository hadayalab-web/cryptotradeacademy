#!/usr/bin/env node
/**
 * X引用リポスト + X広告 + Google広告 の戦略を Grok-4-1-fast-reasoning と Gemini-3-pro-preview に聞く。
 *
 * 実行: node scripts/ask-grok-gemini-ads-strategy.js
 * 環境変数: XAI_API_KEY, GEMINI_API_KEY（.env 推奨）
 *
 * 出力: docs/ai-analysis-results/ADS_STRATEGY_GROK_GEMINI_YYYY-MM-DDTHH-mm-ss.md
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const XAI_API_KEY = process.env.XAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const XAI_BASE_URL = process.env.XAI_BASE_URL || "https://api.x.ai/v1";

const GROK_MODEL = "grok-4-1-fast-reasoning";
const GEMINI_MODEL = "gemini-3.1-pro-preview";

if (!XAI_API_KEY || !GEMINI_API_KEY) {
  console.error("❌ 必要なAPIキーが設定されていません");
  console.error("XAI_API_KEY:", XAI_API_KEY ? "✅" : "❌");
  console.error("GEMINI_API_KEY:", GEMINI_API_KEY ? "✅" : "❌");
  process.exit(1);
}

const grokClient = new OpenAI({ apiKey: XAI_API_KEY, baseURL: XAI_BASE_URL });
const geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);

const CONTEXT = `
## 現状・前提（CryptoTrade Academy / Trap Defence BTC）

- **X 引用リポスト**: 約800投稿/日、6言語（EN, ES, PT-BR, AR, JA, KO）。インフルエンサー約300人ストック。Grok がセールスレター・引用文案を生成。継続する。
- **着地**: 投稿からクリックすると **Whop**（Minimal チェックアウト or Regular 商品ページ）または VSL（YouTube）。LP（別ドメイン）や Telegram 直リンクは本番の引用リポストには含まれない。
- **これからやること**: **X引用リポスト** に加えて **X広告** と **Google広告** の 3 本立てで回す。
- **制約**: 広告の着地も Whop。6言語は同時にやらず、まず EN から。テスト期の予算は月 $500〜1,500 を 1〜2 言語に集中。YouTube/TikTok/Reels は広告の主軸にしない。
`;

const USER_PROMPT = `${CONTEXT}

## 依頼内容

**「X引用リポスト + X広告 + Google広告」の 3 本立てで回すときの戦略**を、実行に落とし込めるレベルで書いてください。

1. **3 本の役割分担**: 引用リポスト・X広告・Google広告をどう役割分担させるか（リーチの重ねがけ、リマーケ、検索捕捉など）。
2. **クリエイティブ・着地**: X広告は何をプロモするか（引用リポスト or 固定ポスト等）、Google はどのキーワード・どのランディング（Whop）にするか。UTM の付け方。
3. **言語・予算の割り振り**: EN から始め、2言語目をいつ・どの基準で追加するか。予算の目安（テスト期）。
4. **KPI・計測**: 何を週次で見るか（クリック単価、Whop 到達、必要ならオプトイン数）。
5. **よくある失敗・避けること**: この 3 本立てでやりがちな失敗と、避けるべきポイント。
6. **明日からやる 3 つ**: 具体的に「何をいつまでにやるか」を 3 つ。

出力は日本語。セクション分けと箇条書きで読みやすく。文字数は惜しまず、実行に落とし込めるレベルで書いてください。`;

async function askGrok() {
  try {
    console.log(`🔄 Grok (${GROK_MODEL}) に戦略を依頼中...`);
    const completion = await grokClient.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an expert in paid and organic growth for a crypto/BTC trading education product. Output in Japanese. Be concrete and actionable for execution."
        },
        { role: "user", content: USER_PROMPT }
      ],
      temperature: 0.6,
      max_tokens: 8000
    });
    return {
      model: GROK_MODEL,
      response: completion.choices[0].message.content,
      usage: completion.usage
    };
  } catch (e) {
    console.error("❌ Grok failed:", e.message);
    return { model: GROK_MODEL, response: null, error: e.message };
  }
}

async function askGemini() {
  try {
    console.log(`🔄 Gemini (${GEMINI_MODEL}) に戦略を依頼中...`);
    const model = geminiClient.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { temperature: 0.6, maxOutputTokens: 8000 }
    });
    const result = await model.generateContent(
      `You are an expert in paid and organic growth for a crypto/BTC trading education product. Output in Japanese. Be concrete and actionable for execution.\n\n${USER_PROMPT}`
    );
    const text = result.response?.text?.() || "";
    const usage = result.response?.usageMetadata || {};
    return { model: GEMINI_MODEL, response: text, usage };
  } catch (e) {
    console.error("❌ Gemini failed:", e.message);
    return { model: GEMINI_MODEL, response: null, error: e.message };
  }
}

function usageStr(u) {
  if (!u) return "—";
  const p = u.prompt_tokens ?? u.promptTokenCount ?? 0;
  const c =
    u.completion_tokens ?? u.candidatesTokenCount ?? u.completionTokenCount ?? 0;
  return `入力 ${p} / 出力 ${c}`;
}

async function main() {
  console.log(
    "🚀 X引用リポスト + X広告 + Google広告 — Grok / Gemini に戦略を依頼\n"
  );

  const [grok, gemini] = await Promise.all([askGrok(), askGemini()]);

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join(__dirname, "..", "docs", "ai-analysis-results");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `ADS_STRATEGY_GROK_GEMINI_${ts}.md`);

  const md = `# X引用リポスト + X広告 + Google広告 — 戦略（Grok / Gemini）

**作成日時**: ${new Date().toISOString()}
**モデル**: ${GROK_MODEL} / ${GEMINI_MODEL}
**前提**: 3本立てで回す。着地は Whop。EN から。参照: docs/ADS_STRATEGY_CONSTRAINED_2026-02-06.md

---

## Grok (${GROK_MODEL})

**トークン**: ${usageStr(grok.usage)}

${grok.error ? `\n❌ エラー: ${grok.error}\n` : ""}

${grok.response || "—"}

---

## Gemini (${GEMINI_MODEL})

**トークン**: ${usageStr(gemini.usage)}

${gemini.error ? `\n❌ エラー: ${gemini.error}\n` : ""}

${gemini.response || "—"}

---

*scripts/ask-grok-gemini-ads-strategy.js で生成*
`;

  fs.writeFileSync(outPath, md, "utf8");
  console.log(`\n✅ 保存しました: ${outPath}`);
  return { grok, gemini, outPath };
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = { main, askGrok, askGemini };
