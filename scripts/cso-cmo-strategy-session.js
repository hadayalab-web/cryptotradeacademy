#!/usr/bin/env node
/**
 * CSO（戦略責任者＝Cursor の AI、CTO 兼務）と CMO（Gemini / マーケティング責任者）の戦略セッション。
 * CSO がブリーフを渡し、Gemini を CMO として API で呼び出し、2 ラウンドで戦略を深掘りする。
 *
 * 実行: node scripts/cso-cmo-strategy-session.js
 * 環境変数: GEMINI_API_KEY（.env 推奨）
 *
 * 出力: docs/ai-analysis-results/CSO_CMO_STRATEGY_YYYY-MM-DDTHH-mm-ss.md
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

// ========== CSO ブリーフ（戦略責任者＝Cursor AI・CTO 兼務 から CMO への依頼） ==========
const CSO_BRIEF = `
## CSO から CMO へのブリーフ

あなたは当社の **CMO（Chief Marketing Officer）** です。私は **CSO（Chief Strategy Officer）かつ CTO（Chief Technology Officer）兼務**（Cursor 上の AI として戦略・技術両面を担当）として、以下の戦略的コンテキストと制約を共有し、あなたのマーケティング観点での戦略を求めます。

### 施策の目的
- X 上で**仕手Botの煽り投稿に寄生**し、CTA 付きリプライを投下する。そのスレに**群がるトレーダー**にリンクをクリックさせる。
- 成功指標は「リプライを刺す数」だけでなく、**インプレッションの最大化**と**CTA クリック→成約**。北極星は 100 成約/日。

### 現状の技術前提
- 1 本の Cron が 30 分ごとに /api/buzzweave-run を叩く。API 内で UTC から「この Run の言語」を 1 つ決めている。
- 検索: X Search API（tweets/search/recent）、lang:xx、-is:retweet、-is:reply。言語別キーワードと 30 分窓（低ボリューム言語は 60 分窓あり）。
- 候補選定: 品質フィルタ → 中央値フィルタ → クラスタ/危険度分類 → インプレ×hype×copyFit でスロット選定 → cap までリプライ投稿。
- 言語: en, es, pt, ja, ko, ar。日次配分（share_ratio）は en 40%, es 20%, pt 15%, ar 10%, ko 8%, ja 7%。48 Run/日を UTC 時間帯にマッピング。

### 観測事実
- 仕手系Botの煽り投稿は全言語圏で非常に多いが、**同一ロジックで全言語を扱うと抽出が粗い**（例: ar は 30 分で 9 件しか取れず、Bot 量と乖離）。
- 言語ごとに「どのキーワードでヒットするか」「いつスレが盛り上がるか」「どのトーンのコピーが刺さるか」が違う。
- 方針: **Cron も言語別に分け**、各言語で「いつ・何回 Run するか」を独立設計する。

### 制約
- Vercel（Cron 本数はおおよそ 20 前後まで）。API は 1 本（/api/buzzweave-run?lang=xx）。
- X API のレート制限と 1 Run あたりの処理時間を超えないこと。

---

## CMO への依頼（ラウンド1）

以下 1〜5 について、**CMO（マーケティング責任者）** の観点で、**表または番号付きリスト**で具体的に書いてください。インプレッション・CTA クリック・成約を最大化するための「誰に・何を・いつ・どう伝えるか」に焦点を当ててください。

1. **言語別の抽出ロジック（マーケ観点）**
   - 6 言語それぞれで、**「どのような投稿に寄生するとインプレ・クリックが伸びやすいか」**を表にまとめる。検索キーワード・時間窓・品質フィルタの緩め方の推奨。
   - 「データが少ないのに Bot は多い」言語（例: ar）で、ヒット数を増やすための仮説 2〜3 個と検証方法。

2. **言語別の時間帯設計**
   - 各言語の「トレーダーがスレに集まりやすく、CTA が刺さりやすい」現地時間帯（または UTC 帯）を 1〜2 個、根拠とともに示す。
   - Cron を言語別に分ける場合、各言語の Run を「UTC 何時〜何時」に何回/日配置するかの推奨表。

3. **コピー・CTA の言語別チューニング（CMO 本領）**
   - 各言語で「煽りへの同意」「希少性・緊急性」「リスク注意・NFA」のどれを強く出すとクリックに繋がりやすいか、仮説を表でまとめる。
   - テンプレの長さ・トーン・フックの種類について、言語別に優先して A/B 検証すべき軸を 1〜2 個ずつ示す。

4. **Cron 設計（Vercel 想定）**
   - 言語別 Cron の例を 6 行の表で（何分ごと・どの言語を固定で呼ぶか）。Vercel の Cron 本数制限内。

5. **ロールアウトと測定**
   - まずどの 1 言語でパイロットし、何を測ってから他言語に広げるか。戦略を見直すタイミング。

可能なら **Phase 1 でやること / Phase 2 でやること** に分け、**まず手を付けるべき 3 つ**を明示してください。出力は日本語で、実行に落とし込めるレベルで書いてください。
`;

// ========== ラウンド2: CSO 追い打ち（CMO の回答を受けての深掘り依頼） ==========
const CSO_FOLLOW_UP_TEMPLATE = (cmoRound1Text) => `
## CSO からの追い打ち（ラウンド2）

上記の CMO の回答を踏まえて、CSO から以下の論点で深掘りを依頼する。CMO として、再度具体的に（表・番号付きリストで）答えてください。

1. **インプレ最大化と CTR のトレードオフ**: 言語別に「リプライ本数を増やす」vs「1本あたりの質（刺さるコピー・刺さるスレ）を上げる」をどうバランスするか。どの言語で量を優先し、どの言語で質を優先するか、理由付きで。

2. **最初に手を付ける 1 言語**: 言語別ロジック・Cron 分離を段階的に入れるなら、**最初にパイロットする 1 言語とその理由**（データの取りやすさ・市場サイズ・コピー検証のしやすさ等）。

3. **コピーの刺さり方の測定**: クリック・成約はランディング側で計測できるが、**「どのテンプレ・トーンが刺さったか」**は直接は見えない。代理指標（インプレ・エンゲージメント・時間帯別 CTR 等）でどう見るか、言語別の推奨を簡潔に。

4. **CMO が追加で置きたい KPI**: 上記以外に、週次で CMO として見たい指標を 2〜3 個挙げ、なぜそれで戦略を修正できるかを 1 文ずつ。
`;

// ========== Gemini API 呼び出し ==========
async function callGeminiCMO(prompt, roundLabel = "CMO") {
  const model = geminiClient.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { temperature: 0.5, maxOutputTokens: 8192 }
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
  console.log("🚀 CSO / CMO 戦略セッション — Gemini を CMO として API で呼び出し\n");

  const cmoRole =
    "You are the CMO (Chief Marketing Officer) of a product that uses X (Twitter) to reply to pump/bot hype posts with CTAs, targeting traders who swarm those threads. Your counterpart is the CSO (Chief Strategy Officer) who also serves as CTO (Chief Technology Officer), implemented as an AI in Cursor. Answer in Japanese. Use tables and numbered lists. Be concrete and actionable so the engineering team can implement your recommendations.";

  // ---------- ラウンド1: CSO ブリーフ → CMO 回答 ----------
  console.log("📋 ラウンド1: CSO ブリーフを送信し、CMO（Gemini）の回答を取得中...");
  const round1Prompt = `${cmoRole}\n\n${CSO_BRIEF}`;
  let cmoRound1;
  try {
    cmoRound1 = await callGeminiCMO(round1Prompt, "CMO Round1");
    console.log("   ✅ CMO ラウンド1 取得完了");
  } catch (e) {
    console.error("   ❌ CMO ラウンド1 失敗:", e.message);
    cmoRound1 = { text: "", usage: {}, error: e.message };
  }

  // ---------- ラウンド2: CSO 追い打ち → CMO 再回答 ----------
  console.log("📋 ラウンド2: CSO 追い打ちを送信し、CMO の深掘り回答を取得中...");
  const followUpPrompt = `${cmoRole}\n\n---\n\n## CMO ラウンド1 の回答\n\n${cmoRound1.text}\n\n${CSO_FOLLOW_UP_TEMPLATE(cmoRound1.text)}`;
  let cmoRound2;
  try {
    cmoRound2 = await callGeminiCMO(followUpPrompt, "CMO Round2");
    console.log("   ✅ CMO ラウンド2 取得完了");
  } catch (e) {
    console.error("   ❌ CMO ラウンド2 失敗:", e.message);
    cmoRound2 = { text: "", usage: {}, error: e.message };
  }

  // ---------- 出力ドキュメント ----------
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join(__dirname, "..", "docs", "ai-analysis-results");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `CSO_CMO_STRATEGY_${ts}.md`);

  const csoSummary = `
## CSO 総括・次のアクション

- CMO の回答を Phase 1 / Phase 2 に分け、実装バックログに落とす。
- 「まず手を付ける 3 つ」を今週のタスクにし、言語別 Cron 分離または 1 言語パイロットのどちらから着手するか決める。
- 週次で言語別インプレ・CTR を確認し、2 週間で抽出パラメータまたはコピーを 1 回調整する。
`;

  const md = `# CSO / CMO 戦略セッション

**作成日時**: ${new Date().toISOString()}
**モデル**: ${GEMINI_MODEL}
**役割**: CSO = 戦略責任者（Cursor の AI・CTO 兼務）、CMO = マーケティング責任者（Gemini）

---

## 1. CSO ブリーフ（CMO への依頼）

${CSO_BRIEF.trim()}

---

## 2. CMO ラウンド1 の回答

**トークン**: ${usageStr(cmoRound1.usage)}
${cmoRound1.error ? `\n❌ エラー: ${cmoRound1.error}\n` : ""}

${cmoRound1.text || "—"}

---

## 3. CSO 追い打ち（ラウンド2 の依頼）

CMO の回答を受けて、CSO から「インプレとCTRのトレードオフ」「最初に手を付ける1言語」「コピー刺さり方の測定」「CMOが置きたいKPI」の 4 点で深掘りを依頼。

---

## 4. CMO ラウンド2 の回答

**トークン**: ${usageStr(cmoRound2.usage)}
${cmoRound2.error ? `\n❌ エラー: ${cmoRound2.error}\n` : ""}

${cmoRound2.text || "—"}

---
${csoSummary}

---

*scripts/cso-cmo-strategy-session.js で生成（CSO/CTO＝Cursor AI ブリーフ + Gemini CMO 2 ラウンド）*
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

module.exports = { main, CSO_BRIEF, callGeminiCMO };
