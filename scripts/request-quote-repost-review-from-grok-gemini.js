#!/usr/bin/env node
/**
 * 引用リポストの投稿実装を Grok (grok-4-1-fast-reasoning) と Gemini (gemini-3-pro-preview) に正確に共有し、
 * - Grok: Xアルゴリズム解析
 * - Gemini: 深層心理解析
 * を行い、CVR および LTV 獲得に向けたチート戦略を引き出す。
 *
 * 実行: node scripts/request-quote-repost-review-from-grok-gemini.js
 * 環境変数: XAI_API_KEY, GEMINI_API_KEY（.env から読み込み）
 */

const path = require("path");
const fs = require("fs");

const DEFAULT_ENV_PATH = path.join(__dirname, "..", ".env");
const envPath = process.env.ENV_PATH || process.env.ENV_FILE || DEFAULT_ENV_PATH;
require("dotenv").config({ path: envPath });

const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_BASE_URL = process.env.XAI_BASE_URL || "https://api.x.ai/v1";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GROK_MODEL = "grok-4-1-fast-reasoning";
const GEMINI_MODEL = "gemini-3-pro-preview";

// ========== 引用リポスト実装の正確な仕様 ==========
const IMPLEMENTATION_CONTEXT = `
## 引用リポスト実装の仕様（正確に共有）

### 1. フロー概要
- **トリガー**: cron による定期実行（api/cron.js → api/x-quote-repost.js）
- **言語**: 6言語（en, ja, es, pt-br, ar, ko）対応
- **本文生成**: Grok-4-1-fast-reasoning によるセールスレター（キャッシュ優先、未ヒット時はリアルタイム生成）
- **リンクブロック**: 言語別定型（getLinkBlockGrokStyle）を本文直下に付与
- **引用元**: インフルエンサーTLから Grok が発掘したツイートを引用

### 2. Grok プロンプト構造（buildGrokOnlyPrompt）
出力は5パート構成:
1) **HEADLINE** - 短い1行。問い・痛み・好奇心。Trap Score/市況を参照可
2) **PERSONA HOOK** - 「思考停止」「見るだけループ」「含み損」のペルソナを鷲掴み。共感・責めない
3) **PRODUCT INTRO** - 無料 Minimal（Trap Score, gut vs data, カード不要）＋ 有料 Regular（15分アラート, Exit Map, $99/月, 1日トライアル, コード defend50）
4) **OBJECTION HANDLING** - 「高い？また損する？今じゃない？」への反論。リアルタイムの価値・リスクゼロ
5) **HASHTAGS** - #BTC #TrapDefence 必須、#Crypto #Trading 等を追加可

### 3. ペルソナ（personaStrategy.js）
- ターゲット優先: 痛みピーク・即決ミレニアル（28-35歳、含み損$30k-$80k）、Z世代回復組、X世代移行組
- CORE_PHRASES.state（言語別）: 「含み損で見るだけループ？抜け道は枠組みだけ」系
- 価格フレーム: $99/月 = 含み損の0.2%。1日トライアルでリスクゼロ。defend50で50%オフ

### 4. リンクブロック（LINK_BLOCK_GROK_STYLE）
各リンクの直上にラベル。日本語例:
- ▼無料ビデオ（全体像はこちらでご確認ください）→ YouTube VSL
- ▼無料登録はこちら（カード不要・すぐにお試しいただけます）→ Whop 無料チェックアウト
- ▼有料版のご案内ビデオはこちら → YouTube Upgrade VSL
- ▼ Regular Briefing（コード DEFEND50）→ Whop 有料プラン

### 5. 導線設計
- 無料 Minimal → 有料 Regular の2段階
- 1投稿内で両方をチラ見せし、ツァイガルニク効果で「続きが気になる」を誘発
`;

// ========== 直近の日本語版投稿サンプル（スクショ実物） ==========
const SAMPLE_POST_JA = `
## 直近の日本語版引用リポスト（実投稿・スクショ）

**アカウント**: CryptoTrade Academy | Trap Defence @trapdefence
**引用元**: @btc_status のツイートを引用

---

**本文:**

Trap Score 0/100。BTC 78,612ドルで固まってる?

含み損抱えて「ただ見てるだけ」のループ。君だけじゃないよ。Trap Score 0/100の今、直感じゃなくデータで抜け出す枠組みがある。

【無料 Minimal Version】
Trap Scoreとon-chainデータ (Exchange Netflow 2,897、Whale Ratio 0.57)。直感を捨てデータで判断。カード不要、今すぐアクセス。

【有料 Regular Briefing】
15分アラート+Exit Mapで即行動。$95/月($50k損失の0.2%)。1日トライアルでレポート見てキャンセル可、リスクゼロ。コードdefend50で初回50%オフ。

高い? また損する? 今じゃない?わかるよ。このインテルはリアルタイムでしか効かない。枠組み持つか否かでエッジかギャンブルか決まる。1日トライアルで確かめて。

#BTC #TrapDefence #Crypto #Trading

---

**リンク誘導:**
- ▼無料ビデオ(全体像はこちらでご確認ください) → youtu.be/OqvqngJOiXc
- ▼無料登録はこちら(カード不要・すぐにお試しいただけます) → whop.com/checkout/plan_...
- ▼有料版のご案内ビデオはこちら → youtu.be/fXgVsKhqDjI
- ▼ Regular Briefing (コード DEFEND50) → whop.com/trapdefence/bt...
`;

// ========== Grok 用プロンプト（Xアルゴリズム解析） ==========
const GROK_SYSTEM = `あなたはX（Twitter）のアルゴリズム解析の専門家です。引用リポストの実装仕様と実際の投稿サンプルを正確に踏まえ、Xアルゴリズムの観点でインプレッション・エンゲージメント・導線効率を最大化する「チート戦略」を引き出してください。`;

const GROK_USER_PROMPT = `${IMPLEMENTATION_CONTEXT}
${SAMPLE_POST_JA}

---

## 依頼（Xアルゴリズム解析 → CVR/LTVチート戦略）

上記の**実装仕様**と**実際の日本語投稿サンプル**を正確に共有しました。レビューし、以下を出力してください。

### 1. アルゴリズム適合性
- この投稿構造（ヘッドライン→ペルソナフック→製品紹介→反論処理→ハッシュタグ→リンク）はXアルゴリズムに有利か。理由と根拠を2〜3点。
- 引用リポスト形式（他アカウントのツイートを引用）のメリット・デメリット。インプレッション拡大にどう寄与するか。

### 2. 改善提案（アルゴリズム視点）
- 長さ・トーン・フックの位置・CTAの数・ハッシュタグの選び方など、アルゴリズム的にチューニングすべき点を3〜5点、具体的に。
- 「今の実装のままで良い点」と「変えるべき点」を明確に区別。

### 3. CVR/LTV獲得のチート戦略
- Xアルゴリズムを味方につけつつ、Whopへのクリック・サインアップ・有料転換を最大化する「チート」的な工夫を5つ以上列挙。
- 実装に落とし込み可能なレベルで具体的に（例: ヘッドラインの文字数、反論処理の配置、リンクの順番など）。

出力は日本語で、実務で即適用できる形にしてください。`;

// ========== Gemini 用プロンプト（深層心理解析） ==========
const GEMINI_SYSTEM = `あなたはトレード依存・含み損で思考停止しているトレーダーの深層心理の専門家です。引用リポストの実装仕様と実際の投稿サンプルを正確に踏まえ、心理的に刺さる「チート戦略」を引き出してください。`;

const GEMINI_USER_PROMPT = `${IMPLEMENTATION_CONTEXT}
${SAMPLE_POST_JA}

---

## 依頼（深層心理解析 → CVR/LTVチート戦略）

上記の**実装仕様**と**実際の日本語投稿サンプル**を正確に共有しました。レビューし、以下を出力してください。

### 1. 深層心理の刺さり度
- 「含み損」「ただ見てるだけ」「君だけじゃない」といったフレーズが、思考停止中のトレーダーにどう響くか。深層心理の観点で3点。
- 反論処理（高い? また損する? 今じゃない?）の効き目。何が「許可」を与え、何が「行動」を後押しするか。

### 2. 心理的ボトルネック
- 無料→有料の導線で、心理的に「落ちる」ポイントはどこか。どの段階で離脱しがちか、なぜか。
- 枠組み・データ・リアルタイムといったメッセージが、ターゲットの「痛み」とどう接続しているか。

### 3. CVR/LTV獲得のチート戦略
- 深層心理を刺激しつつ、無料登録・有料転換・継続課金（LTV）を最大化する「チート」的な工夫を5つ以上列挙。
- コピー・構造・CTA・価格フレームなど、実装に落とし込み可能なレベルで具体的に。

出力は日本語で、マーケティング・コンテンツ設計に転用できる形にしてください。`;

async function askGrok() {
  if (!XAI_API_KEY) return { success: false, error: "XAI_API_KEY is not set", model: GROK_MODEL };
  const client = new OpenAI({ apiKey: XAI_API_KEY, baseURL: XAI_BASE_URL });
  try {
    const res = await client.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        { role: "system", content: GROK_SYSTEM },
        { role: "user", content: GROK_USER_PROMPT }
      ],
      temperature: 0.5,
      max_tokens: 8192
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
    generationConfig: { temperature: 0.5, maxOutputTokens: 8192 }
  });
  try {
    const result = await model.generateContent(GEMINI_USER_PROMPT);
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
  console.log("📋 引用リポスト実装を Grok & Gemini に共有し、CVR/LTVチート戦略を依頼します\n");
  console.log("Grok model:", GROK_MODEL, "（Xアルゴリズム解析）");
  console.log("Gemini model:", GEMINI_MODEL, "（深層心理解析）");
  console.log("XAI_API_KEY:", XAI_API_KEY ? `${XAI_API_KEY.slice(0, 8)}...` : "not set");
  console.log("GEMINI_API_KEY:", GEMINI_API_KEY ? `${GEMINI_API_KEY.slice(0, 8)}...` : "not set\n");

  const [grokResult, geminiResult] = await Promise.all([askGrok(), askGemini()]);

  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join(__dirname, "..", "docs", "ai-analysis-results");
  ensureDir(outDir);
  const outFile = path.join(outDir, `QUOTE_REPOST_CHEAT_STRATEGY_${dateStr}.md`);

  let md = `# 引用リポスト CVR/LTV チート戦略 — Grok & Gemini\n\n`;
  md += `**生成日時**: ${now.toISOString()}\n\n`;
  md += `- **入力**: 引用リポスト実装仕様 + 直近の日本語投稿サンプル（スクショ）\n`;
  md += `- **Grok**: Xアルゴリズム解析 → インプレッション・エンゲージメント・導線のチート戦略\n`;
  md += `- **Gemini**: 深層心理解析 → 心理刺さり・ボトルネック・CVR/LTVチート戦略\n\n`;
  md += `---\n\n`;

  md += `## Grok (${GROK_MODEL}) — Xアルゴリズム解析\n\n`;
  if (grokResult.success) {
    md += grokResult.analysis + "\n\n";
  } else {
    md += `\`\`\`\nError: ${grokResult.error}\n\`\`\`\n\n`;
  }

  md += `---\n\n`;
  md += `## Gemini (${GEMINI_MODEL}) — 深層心理解析\n\n`;
  if (geminiResult.success) {
    md += geminiResult.analysis + "\n\n";
  } else {
    md += `\`\`\`\nError: ${geminiResult.error}\n\`\`\`\n\n`;
  }

  md += `---\n\n*scripts/request-quote-repost-review-from-grok-gemini.js で生成*\n`;

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
