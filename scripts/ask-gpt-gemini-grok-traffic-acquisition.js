#!/usr/bin/env node
/**
 * トラフィック獲得: GPT-5.2 / Gemini-3-pro / Grok-4-1 に「トラフィックを集めるあらゆる方法」を聞く
 *
 * 実行: node scripts/ask-gpt-gemini-grok-traffic-acquisition.js
 * 環境変数: OPENAI_API_KEY, GEMINI_API_KEY, XAI_API_KEY（.env 推奨）
 *
 * 使用モデル: gpt-5.2-2025-12-11, gemini-3.1-pro-preview, grok-4-1-fast-reasoning
 * 出力: docs/ai-analysis-results/TRAFFIC_ACQUISITION_3AI_YYYY-MM-DDTHH-mm-ss.md
 *
 * 注: X引用リポスト作戦は Copilot が発見。再現性・即効性でソートして実験していく前提。
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_BASE_URL = process.env.XAI_BASE_URL || "https://api.x.ai/v1";

const GPT_MODEL = "gpt-5.2-2025-12-11";
const GEMINI_MODEL = "gemini-3.1-pro-preview";
const GROK_MODEL = "grok-4-1-fast-reasoning";

if (!OPENAI_API_KEY || !GEMINI_API_KEY || !XAI_API_KEY) {
  console.error("❌ 必要なAPIキーが設定されていません");
  console.error("OPENAI_API_KEY:", OPENAI_API_KEY ? "✅" : "❌");
  console.error("GEMINI_API_KEY:", GEMINI_API_KEY ? "✅" : "❌");
  console.error("XAI_API_KEY:", XAI_API_KEY ? "✅" : "❌");
  process.exit(1);
}

const openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });
const geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
const grokClient = new OpenAI({ apiKey: XAI_API_KEY, baseURL: XAI_BASE_URL });

const CURRENT_STATE = `
## 現状（CryptoTrade Academy / Trap Defence BTC）

- **X 引用リポスト**: 約800投稿/日、6言語（EN, ES, PT-BR, AR, JA, KO）、インフルエンサー約300人ストック。Grok がセールスレター・引用文案を生成。※この「X引用リポスト作戦」は Copilot が発見した施策。
- **その他 X**: Free Report（無料レポート・スレッド）、Minimal Version（Trap Score リードマグネット）の Cron あり。
- **ファネル**: 投稿 → クリック → Telegram（Minimal オプトイン）→ Whop（有料）。Trap Score という独自指標あり。
- **技術**: X API Webhook、Vercel Cron/KV、CryptoQuant データ。6言語対応。
`;

const SYSTEM_PROMPT = `You are an expert in traffic acquisition and growth for a crypto/BTC trading education product (CryptoTrade Academy / Trap Defence). Your ONLY focus is: how to get MORE traffic (impressions, clicks, visits to Telegram/LP). Do NOT focus on conversion, pricing, or retention — only on "getting people to see and click."

**Instructions**:
1. List EVERY possible method to gather traffic — X, other channels, algorithm hacks, content, partnerships, ads, SEO, virality, etc.
2. For each method, you will later sort by: **再現性 (reproducibility)** and **即効性 (immediacy)** so we can run experiments. So be concrete and actionable.
3. Output in Japanese. Use clear sections and bullets.`;

const USER_PROMPT = `以下は CryptoTrade Academy（Trap Defence BTC）の現状です。**トラフィックを集めるあらゆる方法**を列挙してください。コンバージョンや売上化の話は不要です。「いかに見てもらい、クリックしてもらうか」に絞ってください。

${CURRENT_STATE}

## 依頼内容

1. **トラフィック獲得のあらゆる方法**を列挙する（X に限定しない。X・YouTube・TikTok・SEO・広告・コラボ・PR・バイラル・コミュニティ・その他すべて）。
2. 各方法について、次の 2 軸で評価し、**実験しやすいようにソート可能な形**で書く:
   - **即効性**: 高 = 明日〜1週間で試せる / 中 = 1ヶ月以内 / 低 = 数ヶ月かかる
   - **再現性**: 高 = 同じ手順で再現しやすい / 中 = 条件依存 / 低 = 運や外部要因に依存
3. X アルゴリズムで「インプレ・クリック」を増やす具体的な手口（文案・時刻・メディア・エンゲージメント誘発・インフルエンサー活用・トレンド・ハッシュタグ等）も漏れなく挙げる。
4. 既にやっている「X 引用リポスト 800投稿/日」以外の方法を特に重視する（引用リポストの細かい最適化も可）。

## 出力形式（必須）

以下のセクションを設け、**各施策に「即効性: 高/中/低」「再現性: 高/中/低」を明記**すること。最後に「再現性・即効性でソートした実験優先リスト」を 1 つ出してください。

- エグゼクティブサマリー（3〜5行）
- X でトラフィックを増やす方法（各項目に 即効性・再現性 を付与）
- X 以外のチャネルでトラフィックを集める方法（各項目に 即効性・再現性 を付与）
- アルゴリズム・バイラル・コンテンツ系（各項目に 即効性・再現性 を付与）
- 実験優先リスト（再現性高×即効性高 → 再現性高×即効性中 → … の順でソートしたトップ15〜20）
- 結論・明日から試す 3 つ

文字数は惜しまず、実行に落とし込めるレベルで書いてください。`;

async function askGPT() {
  try {
    console.log(`🔄 GPT (${GPT_MODEL}) にトラフィック獲得を依頼中...`);
    const completion = await openaiClient.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: USER_PROMPT }
      ],
      temperature: 0.7
    });
    return {
      model: GPT_MODEL,
      response: completion.choices[0].message.content,
      usage: completion.usage
    };
  } catch (e) {
    console.error("❌ GPT failed:", e.message);
    return { model: GPT_MODEL, response: null, error: e.message };
  }
}

async function askGemini() {
  try {
    console.log(`🔄 Gemini (${GEMINI_MODEL}) にトラフィック獲得を依頼中...`);
    const model = geminiClient.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { temperature: 0.7, maxOutputTokens: 8000 }
    });
    const result = await model.generateContent(`${SYSTEM_PROMPT}\n\n${USER_PROMPT}`);
    const text = result.response?.text?.() || "";
    const usage = result.response?.usageMetadata || {};
    return { model: GEMINI_MODEL, response: text, usage };
  } catch (e) {
    console.error("❌ Gemini failed:", e.message);
    return { model: GEMINI_MODEL, response: null, error: e.message };
  }
}

async function askGrok() {
  try {
    console.log(`🔄 Grok (${GROK_MODEL}) にトラフィック獲得を依頼中...`);
    const completion = await grokClient.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: USER_PROMPT }
      ],
      temperature: 0.7,
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

function usageStr(u) {
  if (!u) return "—";
  const p = u.prompt_tokens ?? u.promptTokenCount ?? 0;
  const c = u.completion_tokens ?? u.candidatesTokenCount ?? u.completionTokenCount ?? 0;
  return `入力 ${p} / 出力 ${c}`;
}

async function main() {
  console.log("🚀 トラフィック獲得 — 3AI に「あらゆる方法」を依頼（再現性・即効性でソートして実験）\n");

  const [gpt, gemini, grok] = await Promise.all([
    askGPT(),
    askGemini(),
    askGrok()
  ]);

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join(__dirname, "..", "docs", "ai-analysis-results");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `TRAFFIC_ACQUISITION_3AI_${ts}.md`);

  const md = `# トラフィック獲得 — 3AI 回答（再現性・即効性で実験用）

**作成日時**: ${new Date().toISOString()}
**モデル**: ${GPT_MODEL} / ${GEMINI_MODEL} / ${GROK_MODEL}
**前提**: X引用リポスト作戦は Copilot 発見。再現性と即効性でソートして実験していく。

---

## GPT (${GPT_MODEL})

**トークン**: ${usageStr(gpt.usage)}

${gpt.error ? `\n❌ エラー: ${gpt.error}\n` : ""}

${gpt.response || "—"}

---

## Gemini (${GEMINI_MODEL})

**トークン**: ${usageStr(gemini.usage)}

${gemini.error ? `\n❌ エラー: ${gemini.error}\n` : ""}

${gemini.response || "—"}

---

## Grok (${GROK_MODEL})

**トークン**: ${usageStr(grok.usage)}

${grok.error ? `\n❌ エラー: ${grok.error}\n` : ""}

${grok.response || "—"}

---

## 次のステップ

- 各モデルの「実験優先リスト」「明日から試す 3 つ」を抽出し、再現性高×即効性高から順に実験する。
- 結果（インプレ・クリック数）を記録し、再現性を検証する。
`;

  fs.writeFileSync(outPath, md, "utf8");
  console.log(`\n✅ 保存しました: ${outPath}`);
  return { gpt, gemini, grok, outPath };
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = { main, askGPT, askGemini, askGrok };
