#!/usr/bin/env node
/**
 * 次のフェーズ戦略: Grok（Xアルゴリズム）と Gemini（深層心理）に意見交換させ、
 * 「Xアルゴリズム × 人間の深層心理をハッキングしてチートプログラムを実装する」流れに特化した戦略を出す。
 *
 * 使い方: node scripts/ask-grok-gemini-next-phase-strategy.js
 * 必要: .env に XAI_API_KEY, GEMINI_API_KEY
 *
 * 出力: docs/NEXT_PHASE_STRATEGY_GROK_GEMINI_YYYY-MM-DDTHH-mm-ss.md
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GROK_MODEL = 'grok-4-1-fast-reasoning';
const GEMINI_MODEL = 'gemini-3-pro-preview';

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is not set');
  process.exit(1);
}
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set');
  process.exit(1);
}

const grokClient = new OpenAI({ apiKey: XAI_API_KEY, baseURL: XAI_BASE_URL });
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({
  model: GEMINI_MODEL,
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 8192,
  },
});

async function askGrok(messages) {
  const completion = await grokClient.chat.completions.create({
    model: GROK_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 8192,
  });
  return completion.choices[0].message.content;
}

async function askGemini(prompt) {
  const result = await geminiModel.generateContent(prompt);
  const response = result.response;
  if (!response || !response.text) {
    throw new Error('Gemini returned no text');
  }
  return response.text();
}

// ---------- Phase 1: Grok に「次のフェーズ（Xアルゴリズム × チート）」を聞く ----------
const grokPhase1System = `You are an expert X (Twitter) algorithm reverse engineer and growth hacker. Your role is to propose the NEXT PHASE strategy for a product that specializes in "hacking the X algorithm and human deep psychology to implement a cheat program."

Current context:
- 824 high-quality influencers, 6 languages (EN, ES, PT-BR, AR, JA, KO).
- Free tier (Minimal Version) = "reagent" (triage/entry). Paid tier (Regular Briefing) = "prescription" (deep analysis, signals, psychology).
- Design goal: not to "cure" traders but to make them dependent on our distribution (配信がないと回らなくなる).
- CronJobs: 15-min TG (free+paid), X minimal/free-report/quote-repost, 100/15min cap, peak maps, jitter.

Focus on: X algorithm hacking, ranking factors, engagement velocity, spam/rate-limit edge cases, and how to align the next phase of the "cheat program" with the existing 試薬/処方箋 design. Be concrete and actionable.`;

const grokPhase1User = `We are moving into a next phase that specializes in: hacking the X algorithm AND human deep psychology to implement a "cheat program" (チートプログラム).

From the X ALGORITHM side only, propose the next-phase strategy. Include:
1. Where the current implementation already "cheats" the algorithm (and what to double down on).
2. New algorithmic loopholes or ranking hacks we should implement next (timing, content format, engagement signals, multi-language, influencer usage).
3. How the "reagent" (free) and "prescription" (paid) flow should interact with X's algorithm (e.g., free posts that drive replies/saves, paid conversion signals).
4. Concrete 3–5 priorities for the next 1–2 quarters, with implementation hints.

Write in clear sections. Output in English or Japanese as you prefer.`;

// ---------- Phase 2: Gemini に「次のフェーズ（深層心理 × チート）」を聞く ----------
const geminiPhase1Prompt = `あなたは人間の深層心理とコンテンツ戦略の専門家です。次のフェーズ戦略の提案を求めます。

コンテキスト:
- 製品は「Xアルゴリズムと人間の深層心理をハッキングしてチートプログラムを実装する」流れに特化していく。
- ターゲット: トレード依存症のトレーダー（絶望的な最適化者）。
- 無料版（Minimal Version）= 試薬（トリアージ・入口）。有料版（Regular Briefing）= 処方箋（深い分析・シグナル・心理サポート）。
- 設計意図: 完治させない。我々の配信がないと回らなくする（依存先を「市場の衝動」から「Trap Defence の配信」へ）。
- 既存の言語化: TRADING_ADDICTION_DEPENDENCY_STRATEGY_COMPLETE（治療のファサード、依存関係構築、専有メトリクス、15分配信とFOMO）。

深層心理・コンテンツ戦略の観点から、次のフェーズの戦略を提案してください。含めること:
1. 現状の「心理ハック」で既に効いている部分（強化すべき点）。
2. 新たに実装すべき心理トリガー・依存深化メカニズム（間欠的強化、サンクコスト、権威バイアス、命綱感覚など）。
3. 試薬（無料）と処方箋（有料）のコンテンツ・メッセージングで、次にやるべきこと（「治さないが離れられなくする」設計）。
4. 具体的な 3–5 の優先事項（今後 1–2 四半期）、実装のヒント付き。

セクション分けして明確に書いてください。日本語で出力してください。`;

// ---------- Phase 3: Grok に Gemini の回答を見せて意見を求める ----------
function grokPhase2User(geminiText) {
  return `Below is the next-phase strategy from our psychology/content strategy expert (Gemini), focusing on deep psychology and the "試薬/処方箋" design.

---
GEMINI'S PROPOSAL (excerpt):
${geminiText.slice(0, 6000)}
---

As the X algorithm expert, please:
1. Where do you agree or disagree with Gemini's view?
2. What X-algorithm tactics should we add or adjust to support Gemini's psychology-side priorities (e.g., timing, format, engagement signals)?
3. One paragraph: combined "algorithm + psychology" next-step priority you recommend.

Write concisely. English or Japanese.`;
}

// ---------- Phase 4: Gemini に Grok の回答を見せて意見を求める ----------
function geminiPhase2Prompt(grokText) {
  return `以下は、Xアルゴリズム専門家（Grok）による次のフェーズ戦略の提案です。

---
GROK'S PROPOSAL (抜粋):
${grokText.slice(0, 6000)}
---

深層心理・コンテンツ戦略の専門家として:
1. Grokの提案のどこに賛成・反対しますか？
2. Grokのアルゴリズム側の優先事項を実現するために、心理・メッセージング側で追加・調整すべきことは何か？
3. 1段落で: 「アルゴリズム × 心理」を統合した、あなたが推す次の一歩の優先事項を書いてください。

簡潔に。日本語で出力してください。`;
}

// ---------- Phase 5: 統合サマリー（Gemini に短いサマリーを書かせる） ----------
function synthesisPrompt(grok1, gemini1, grok2, gemini2) {
  return `以下の4つの発言は、Xアルゴリズム専門家（Grok）と深層心理・コンテンツ戦略専門家（Gemini）の意見交換です。

【Grok 第1ラウンド】
${grok1.slice(0, 3000)}

【Gemini 第1ラウンド】
${gemini1.slice(0, 3000)}

【Grok 第2ラウンド（Geminiへの返答）】
${grok2.slice(0, 2000)}

【Gemini 第2ラウンド（Grokへの返答）】
${gemini2.slice(0, 2000)}

上記を踏まえ、「次のフェーズ戦略」として、以下を1ページ以内でまとめてください。日本語で。
1. 共通認識（両者が合意している方向性）
2. 次のフェーズの優先事項 3–5 個（アルゴリズム・心理の両面を反映）
3. 直近で着手すべきアクション 2–3 個`;
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const docsDir = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  const outPath = path.join(docsDir, `NEXT_PHASE_STRATEGY_GROK_GEMINI_${timestamp}.md`);

  console.log('📌 Step 1/5: Asking Grok (X algorithm) for next-phase strategy...\n');
  const grok1 = await askGrok([
    { role: 'system', content: grokPhase1System },
    { role: 'user', content: grokPhase1User },
  ]);

  console.log('📌 Step 2/5: Asking Gemini (deep psychology) for next-phase strategy...\n');
  const gemini1 = await askGemini(geminiPhase1Prompt);

  console.log('📌 Step 3/5: Asking Grok to respond to Gemini...\n');
  const grok2 = await askGrok([
    { role: 'system', content: grokPhase1System },
    { role: 'user', content: grokPhase2User(gemini1) },
  ]);

  console.log('📌 Step 4/5: Asking Gemini to respond to Grok...\n');
  const gemini2 = await askGemini(geminiPhase2Prompt(grok1));

  console.log('📌 Step 5/5: Asking Gemini for synthesis...\n');
  let synthesis = '';
  try {
    synthesis = await askGemini(synthesisPrompt(grok1, gemini1, grok2, gemini2));
  } catch (e) {
    synthesis = `(Synthesis skipped: ${e.message})`;
  }

  const md = `# 次のフェーズ戦略（Grok × Gemini 意見交換）

**作成日時**: ${new Date().toISOString()}  
**Grok**: ${GROK_MODEL}  
**Gemini**: ${GEMINI_MODEL}  
**目的**: Xアルゴリズムと人間の深層心理をハッキングしてチートプログラムを実装する流れに特化した、次のフェーズの戦略を整理する。

---

## 1. Grok（Xアルゴリズム）第1ラウンド

${grok1}

---

## 2. Gemini（深層心理・コンテンツ戦略）第1ラウンド

${gemini1}

---

## 3. Grok 第2ラウンド（Geminiへの返答）

${grok2}

---

## 4. Gemini 第2ラウンド（Grokへの返答）

${gemini2}

---

## 5. 統合サマリー（次のフェーズ戦略）

${synthesis}
`;

  fs.writeFileSync(outPath, md, 'utf8');
  console.log(`\n✅ Written: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
