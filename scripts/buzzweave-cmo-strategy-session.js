#!/usr/bin/env node
/**
 * BuzzWeave 戦略：CSO（Cursor）が Gemini（CMO）を呼び出し、推奨ごとに根拠を求める。
 * 【Gemini CMO 役割は終了】通常運用では使わない。→ docs/BUZZWEAVE_GEMINI_CMO_ENDED.md
 * 「思い込みで適当に対応」を防ぎ、Copilot レポート同様に根拠なき主張にしないため。
 *
 * 実行: node scripts/buzzweave-cmo-strategy-session.js
 * 環境変数: GEMINI_API_KEY（.env 推奨）
 * 出力: docs/ai-analysis-results/BUZZWEAVE_CMO_STRATEGY_YYYY-MM-DDTHH-mm-ss.md
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

// ========== BuzzWeave 用 CSO ブリーフ（根拠を明示させる依頼） ==========
const BUZZWEAVE_CSO_BRIEF = `
## CSO から CMO へのブリーフ（BuzzWeave：仕手Bot寄生・インプレ/CTR 最大化）

あなたは当社の **CMO** です。私は **CSO/CTO**（Cursor 上の AI）です。以下の現状実装と戦略意図を共有するので、**各推奨に「根拠」を必ず付けて**回答してください。根拠とは、業界知見・プラットフォームの仕様・行動経済学・既存文献・A/B の考え方・論理的推論のいずれかで、「なぜその数値・その優先順位か」を説明するものです。根拠のない推奨は採用しない方針です。

### 戦略の目的
- 全言語圏に存在する**仕手Bot**（多額集客の煽り投稿）に**寄生**し、リプライの**インプレッション**と**CTR**を最大限稼ぐ。
- 群がるトレーダーには当社の救済（構造確認・手遅れ回避の CTA）を届け、クリック→成約に繋げる。

### 現状の実装（要約）
- **検索**: X Search API、lang:en|es|pt|ja|ko|ar。言語別キーワード（pump/moon/100x 系＋各言語の煽り語）。30 分窓（ar/ko/ja は 60 分窓）。
- **インプレスコア**: velocity / conversation / repost / freshness の重みに加え、**投稿者フォロワー数（author reach）**を log10(1+followers)/6 で 0〜1 に正規化し、重み 0.2 で加算。フォロワーが多い＝集客力の大きい Bot の投稿を優先する意図。
- **選定スコア**: engagement × (1 + 0.6×imp) × (1 + 0.8×hype) × (1 + 0.4×copyFit)。hype＝煽りキーワード含有、copyFit＝CTA が刺さるテーマ（速さ・罠・構造・確認等）の含有。
- **品質キーワード**: COPY_FIT_KEYWORDS / HYPE_BONUS_KEYWORDS を 6 言語分拡張済み。TOPIC_KEYWORDS に AR 等を追加済み。

### 依頼（ラウンド1）— 根拠必須

以下 1〜4 について、**表または番号付きリスト**で具体的に書き、**各項目ごとに「根拠」を 1〜2 文で明示**してください。

1. **投稿者リーチ（フォロワー数）の重み付け**
   - 現在 IMPRESSION_WEIGHT_AUTHOR_REACH = 0.2、正規化は log10(1+followers)/6（約 100 万フォロワーで 1）。この重み 0.2 と正規化式は妥当か。上げる/下げる/変える場合、その**根拠**（X のアルゴリズム・インフルエンサーリーチの知見等）を書いてください。

2. **インプレスコアの重み配分**
   - 現在 velocity 0.4 / conversation 0.25 / repost 0.2 / freshness 0.15 / author_reach 0.2。インプレ最大化を最優先する場合、この配分を変えるべきか。変える場合の**根拠**を書いてください。

3. **hype と copyFit のバランス（CTR 最大化）**
   - 現在 HYPE_BOOST=0.8、CTR_BOOST=0.4。煽りスレに寄生しつつ「救済 CTA が刺さる」投稿を選ぶため、hype を強くしすぎると質が落ちる懸念がある。このバランスの**根拠**ある推奨（数値または比率）を書いてください。

4. **言語別キーワード・時間窓の優先度**
   - 6 言語の検索キーワードは既に拡張済み。さらに「ヒット数が少ない言語でヒットを増やす」ために、**根拠付き**で優先すべき追加キーワードまたは時間窓の変更（1 言語あたり 1〜2 点）を表で示してください。

最後に「まず手を付けるべき 2 つ」と、それぞれの**根拠**を 1 文ずつ書いてください。
`;

// ラウンド2: 根拠の抜け漏れ確認と実装優先順位
const BUZZWEAVE_FOLLOW_UP_TEMPLATE = (cmoRound1Text) => `
## CSO からの追い打ち（ラウンド2）

上記の CMO の回答を踏まえて、以下に答えてください。

1. **根拠の確認**: ラウンド1 の各推奨について、根拠が「業界知見・プラットフォーム仕様・論理推論」のどれに該当するかを表で整理し、根拠が弱い項目があれば「検証方法（何を測れば納得できるか）」を 1 文で補足してください。

2. **実装優先順位**: エンジニアが今週実装する場合、**優先順位 1〜3** と、それぞれ「何をどう変えるか」「期待される効果」「根拠の要約」を 1 行ずつ書いてください。
`;

async function callGeminiCMO(prompt, roundLabel = "CMO") {
  const model = geminiClient.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { temperature: 0.4, maxOutputTokens: 8192 }
  });
  const result = await model.generateContent(prompt);
  const text = result.response?.text?.() ?? "";
  const usage = result.response?.usageMetadata ?? {};
  return { text, usage };
}

function usageStr(u) {
  if (!u || typeof u !== "object") return "—";
  const p = u.promptTokenCount ?? u.prompt_tokens ?? 0;
  const c = u.candidatesTokenCount ?? u.completionTokenCount ?? u.completion_tokens ?? 0;
  return `入力 ${p} / 出力 ${c}`;
}

async function main() {
  console.log("🚀 BuzzWeave CSO/CMO 戦略セッション — Gemini に根拠付き推奨を取得\n");

  const cmoRole =
    "You are the CMO of a product that parasitizes pump/bot hype posts on X with reply CTAs, maximizing impressions and CTR. Your counterpart is the CSO/CTO (Cursor AI). Answer in Japanese. Use tables and numbered lists. For every recommendation you must state the **根拠 (rationale)** — industry knowledge, platform behavior, behavioral economics, or logical reasoning — so we do not implement unsupported claims.";

  let cmoRound1;
  console.log("📋 ラウンド1: 根拠付き推奨を依頼中...");
  try {
    cmoRound1 = await callGeminiCMO(`${cmoRole}\n\n${BUZZWEAVE_CSO_BRIEF}`, "CMO Round1");
    console.log("   ✅ CMO ラウンド1 取得完了");
  } catch (e) {
    console.error("   ❌ CMO ラウンド1 失敗:", e.message);
    cmoRound1 = { text: "", usage: {}, error: e.message };
  }

  let cmoRound2;
  console.log("📋 ラウンド2: 根拠確認・実装優先順位を依頼中...");
  try {
    const followUpPrompt = `${cmoRole}\n\n---\n\n## CMO ラウンド1 の回答\n\n${cmoRound1.text}\n\n${BUZZWEAVE_FOLLOW_UP_TEMPLATE(cmoRound1.text)}`;
    cmoRound2 = await callGeminiCMO(followUpPrompt, "CMO Round2");
    console.log("   ✅ CMO ラウンド2 取得完了");
  } catch (e) {
    console.error("   ❌ CMO ラウンド2 失敗:", e.message);
    cmoRound2 = { text: "", usage: {}, error: e.message };
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join(__dirname, "..", "docs", "ai-analysis-results");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `BUZZWEAVE_CMO_STRATEGY_${ts}.md`);

  const md = `# BuzzWeave CSO/CMO 戦略セッション（根拠付き）

**作成日時**: ${new Date().toISOString()}
**モデル**: ${GEMINI_MODEL}
**目的**: 仕手Bot寄生・インプレ/CTR 最大化のパラメータと優先順位を、**根拠付き**で CMO（Gemini）に求める。

---

## 1. CSO ブリーフ

${BUZZWEAVE_CSO_BRIEF.trim()}

---

## 2. CMO ラウンド1 の回答

**トークン**: ${usageStr(cmoRound1.usage)}
${cmoRound1.error ? `\n❌ エラー: ${cmoRound1.error}\n` : ""}

${cmoRound1.text || "—"}

---

## 3. CSO 追い打ち（ラウンド2）

根拠の抜け漏れ確認と実装優先順位の依頼。

---

## 4. CMO ラウンド2 の回答

**トークン**: ${usageStr(cmoRound2.usage)}
${cmoRound2.error ? `\n❌ エラー: ${cmoRound2.error}\n` : ""}

${cmoRound2.text || "—"}

---

*scripts/buzzweave-cmo-strategy-session.js で生成。実装と根拠の対応は docs/BUZZWEAVE_STRATEGY_RATIONALE.md に記載すること。*
`;

  fs.writeFileSync(outPath, md, "utf8");
  console.log(`\n✅ 保存しました: ${outPath}`);
  return { outPath, cmoRound1, cmoRound2 };
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = { main, BUZZWEAVE_CSO_BRIEF, callGeminiCMO };
