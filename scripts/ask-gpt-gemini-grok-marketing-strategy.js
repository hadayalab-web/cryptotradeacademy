#!/usr/bin/env node
/**
 * 本気のマーケティング戦略: GPT-5.2 / Gemini-3-pro / Grok-4-1 からアイデアを収集
 *
 * 実行: node scripts/ask-gpt-gemini-grok-marketing-strategy.js
 * 環境変数: OPENAI_API_KEY, GEMINI_API_KEY, XAI_API_KEY（.env 推奨）
 *
 * 使用モデル:
 *   - gpt-5.2-2025-12-11
 *   - gemini-3-pro-preview（戦略テキスト用。画像案は gemini-3-pro-image-preview で別途可）
 *   - grok-4-1-fast-reasoning
 *
 * 出力: docs/ai-analysis-results/MARKETING_STRATEGY_3AI_YYYY-MM-DDTHH-mm-ss.md
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
const GEMINI_MODEL = "gemini-3-pro-preview";
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
## 現状の資産・実装（CryptoTrade Academy / Trap Defence BTC）

### X・引用リポスト
- **約800投稿/日**（直近で2倍化済み: 1回あたり EN 12, ES 6, PT-BR 4, AR 6, KO 4, JA 4、全時間帯フル配分）
- **6言語**: EN, ES, PT-BR, AR, JA, KO
- **インフルエンサーストック**: 約300人（EN 124, ES 48, PT-BR 35, AR 52, KO 30, JA 11）
- **Cron**: 毎時 6 言語を分散実行（:04 EN, :09 ES, :14 PT-BR, :19 AR, :24 JA, :29 KO）
- **導線**: 引用リポスト → 無料版（Minimal / Trap Score）＋有料版（Regular / Whop）を1投稿に統合
- **Grok**: セールスレター・引用リポスト文案生成、キャッシュあり

### その他X
- **Free Report**: 無料レポート投稿（メイン＋スレッド）、6言語
- **Minimal Version**: Trap Score＋簡易分析のリードマグネット投稿

### ファネル・収益
- **Telegram**: 無料版（Minimal）オプトイン、有料版（Regular）トライアル・Pro 50% OFF
- **Whop**: 月$99トライアル、PRO 50% OFF 等
- **ペルソナ**: 含み損・トレード依存・「痛みが大きいほど対価を安いと感じる」層

### 技術
- X API Webhook 実装済み（エンゲージメント追跡）
- Vercel Cron / KV、6言語別デプロイ可能
- CryptoQuant データ → Trap Score、市況コンテンツ
`;

const SYSTEM_PROMPT = `You are an expert growth and marketing strategist for a crypto/BTC trading education product (CryptoTrade Academy / Trap Defence). Your goal is to propose a SERIOUS, comprehensive marketing strategy that maximizes revenue and reach.

**Context**: The product already has:
- ~800 X quote reposts per day (influencer-style) in 6 languages
- ~300 influencer stock, Telegram funnel, Whop paid offers
- Trap Score (proprietary metric), free Minimal vs paid Regular

**Instructions**:
1. Propose EVERYTHING else we can do — no idea is too bold if it's actionable.
2. Prioritize: immediate revenue, then traffic/conversion, then brand/retention.
3. Be specific: channels, tactics, copy angles, metrics, and quick wins.
4. Consider: X algorithm, multi-language, paid vs free funnel, Telegram, Whop, partnerships, content, paid ads, community, retention, upsells.
5. Output in Japanese. Use clear sections and bullets.`;

const USER_PROMPT = `以下は、CryptoTrade Academy（Trap Defence BTC）の現状です。**本気のマーケティング戦略**として「他にできることすべて」をアイデア出ししてください。

${CURRENT_STATE}

## 依頼内容

1. **即効で収益・リーチを伸ばす施策**（明日〜1週間で着手できるもの）
2. **中期で効かせる施策**（1ヶ月〜3ヶ月、仕組み化・スケール）
3. **大胆な施策**（予算・工数は一旦無視して「やるなら何があるか」を列挙）
4. **X以外のチャネル**（Telegram深化、広告、アフィリエイト、コラボ、PR、SEO等）
5. **コンバージョン・LTV向上**（CTA、ランディング、オンボーディング、リテンション、アップセル）
6. **測定・PDCA**（何をKPIにし、どうABテスト・改善するか）

出力形式は自由ですが、以下のセクションを含めてください（見出しで区切ること）:
- エグゼクティブサマリー（3〜5行）
- 即効施策（5〜10個、具体的に）
- 中期施策（5〜10個）
- 大胆アイデア（5個以上）
- チャネル別・施策別の優先順位とロードマップ
- 結論・トップ5アクション（明日からやること）

文字数は惜しまず、実行に落とし込めるレベルで書いてください。`;

async function askGPT() {
  try {
    console.log(`🔄 GPT (${GPT_MODEL}) にマーケティング戦略を依頼中...`);
    const completion = await openaiClient.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: USER_PROMPT }
      ],
      temperature: 0.7
      // gpt-5.2 は max_completion_tokens のみ対応。SDK が max_tokens を送ると 400 になるため上限は未指定（API デフォルト）
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
    console.log(`🔄 Gemini (${GEMINI_MODEL}) にマーケティング戦略を依頼中...`);
    const model = geminiClient.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { temperature: 0.7, maxOutputTokens: 8000 }
    });
    const result = await model.generateContent(`${SYSTEM_PROMPT}\n\n${USER_PROMPT}`);
    const text = result.response?.text?.() || "";
    const usage = result.response?.usageMetadata || {};
    return {
      model: GEMINI_MODEL,
      response: text,
      usage
    };
  } catch (e) {
    console.error("❌ Gemini failed:", e.message);
    return { model: GEMINI_MODEL, response: null, error: e.message };
  }
}

async function askGrok() {
  try {
    console.log(`🔄 Grok (${GROK_MODEL}) にマーケティング戦略を依頼中...`);
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
  console.log("🚀 本気のマーケティング戦略 — GPT / Gemini / Grok からアイデア収集\n");

  const [gpt, gemini, grok] = await Promise.all([
    askGPT(),
    askGemini(),
    askGrok()
  ]);

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join(__dirname, "..", "docs", "ai-analysis-results");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `MARKETING_STRATEGY_3AI_${ts}.md`);

  const md = `# 本気のマーケティング戦略 — 3AI アイデア収集

**作成日時**: ${new Date().toISOString()}
**モデル**: ${GPT_MODEL} / ${GEMINI_MODEL} / ${GROK_MODEL}

---

## 📊 GPT (${GPT_MODEL})

**トークン**: ${usageStr(gpt.usage)}

${gpt.error ? `\n❌ エラー: ${gpt.error}\n` : ""}

${gpt.response || "—"}

---

## 📊 Gemini (${GEMINI_MODEL})

**トークン**: ${usageStr(gemini.usage)}

${gemini.error ? `\n❌ エラー: ${gemini.error}\n` : ""}

${gemini.response || "—"}

---

## 📊 Grok (${GROK_MODEL})

**トークン**: ${usageStr(grok.usage)}

${grok.error ? `\n❌ エラー: ${grok.error}\n` : ""}

${grok.response || "—"}

---

## 次のステップ

- \`docs/SERIOUS_MARKETING_STRATEGY_2026-02-06.md\` に上記を反映し、優先順位・ロードマップを更新する。
- 即効施策から1つ選び、今週中に実装する。
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
