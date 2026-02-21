#!/usr/bin/env node
/**
 * BuzzWeave：Gemini（CMO）と「仕手Botに負けず、彼らを利用する」戦略協議
 * 【Gemini CMO 役割は終了】通常運用では使わない。必要時のみ手動実行。→ docs/BUZZWEAVE_GEMINI_CMO_ENDED.md
 * 実行: node scripts/buzzweave-gemini-strategy-conference.js
 * 出力: docs/ai-analysis-results/BUZZWEAVE_CMO_STRATEGY_CONFERENCE_YYYY-MM-DDTHH-mm-ss.md
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3-pro-preview";

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY が設定されていません");
  process.exit(1);
}

const geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);

const CONFERENCE_PROMPT = `
## CSO/CTO から CMO への戦略協議

あなたは当社の **CMO** です。私は **CSO/CTO**（Cursor 上の AI）です。

### 前提（揺るがさない）

- **我々の仕事は一つだけ**：仕手Botのバズ投稿を見つけ、リプライを乗せ、インプレを稼ぎ、トラフィックを Whop に最大限送り込むこと。
- **世界で最も優秀な我々が、仕手Botに負ける理由はない。** 彼らは「煽り＋リンク」一点特化で動いている。我々は検索・スコア・多言語・A/B・UTM を揃えている。負けるなら、彼らを「利用」しきれていないだけだ。

### 協議したいこと

**「仕手Botを利用する」** —— 彼らと張り合うのではなく、彼らが集めた注目・インプレ・流入の「上」に我々のリプライと CTA を乗せる戦略を、具体的に詰めたい。

- 彼らの投稿がバズる「タイミング・キーワード・言語・アカウント」をどう検知し、**最短でリプライを乗せる**か。
- リプライのコピー・CTA を、仕手に釣られたユーザーが「次にどこを見るか」に合わせてどう設計するか（緊急性 vs 権威性の A/B は既に実装済み）。
- 仕手Botより「遅れず・目立ちすぎず・Whop に繋がる」運用の優先順位（何を最優先で改善するか）。

上記の観点で、**今すぐ実行可能な具体的な方針・優先順位・メトリクス**を、CMO として示してください。抽象的ではなく、BuzzWeave の現状（Cron 4 本・6 言語・インプレスコア・言語別フィルター・EN A/B・UTM 計測あり）を前提に、次の一歩を明確にしてください。
`;

async function callGemini(prompt) {
  const model = geminiClient.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { temperature: 0.4, maxOutputTokens: 8192 }
  });
  const result = await model.generateContent(prompt);
  const text = result.response?.text?.() ?? "";
  return { text, usage: result.response?.usageMetadata ?? {} };
}

async function main() {
  console.log("📤 Gemini（CMO）と戦略協議を送信中...（仕手Botに負けず、彼らを利用する）\n");

  const role = "You are the CMO of a product that parasitizes pump/bot hype posts on X with reply CTAs and drives traffic to Whop. Your counterpart is the CSO/CTO (Cursor AI). They are asking for a concrete strategy to USE pump bots (leverage their buzz, not compete with them) and to never lose to them. Respond in Japanese. Give actionable priorities, timing/targeting tactics, and clear next-step metrics—not generic advice. Assume the current stack: 4 Cron jobs, 6 languages, impression scoring, language filters, EN A/B (urgency vs authority), UTM tracking.";

  let response;
  try {
    response = await callGemini(`${role}\n\n${CONFERENCE_PROMPT}`);
    console.log("   ✅ CMO 戦略回答を取得しました");
  } catch (e) {
    console.error("   ❌ 失敗:", e.message);
    process.exit(1);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join(__dirname, "..", "docs", "ai-analysis-results");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `BUZZWEAVE_CMO_STRATEGY_CONFERENCE_${ts}.md`);

  const md = `# BuzzWeave：CMO 戦略協議（仕手Botに負けず、彼らを利用する）

**作成日時**: ${new Date().toISOString()}
**モデル**: ${GEMINI_MODEL}

---

## 1. CSO/CTO からの協議内容

${CONFERENCE_PROMPT.trim()}

---

## 2. CMO の戦略回答

${response.text || "—"}

---

*scripts/buzzweave-gemini-strategy-conference.js で生成*
`;

  fs.writeFileSync(outPath, md, "utf8");
  console.log(`\n✅ 保存しました: ${outPath}`);
  return { outPath, response };
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = { main, CONFERENCE_PROMPT };
