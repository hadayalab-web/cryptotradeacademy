// scripts/gpt-grok-gemini-integration-strategy.js
// GPTにGrok×Gemini統合戦略を聞く → Grok/Geminiから実際の分析を取得 → GPTに返して戦略強化

const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const XAI_API_KEY = process.env.XAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set');
  process.exit(1);
}

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is not set');
  process.exit(1);
}

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const grokClient = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

const geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * GPTにGrok×Gemini統合戦略を聞く
 */
async function askGPTIntegrationStrategy() {
  const prompt = `あなたはTrap Defence BTCのマーケティング戦略専門家です。GrokのXアルゴリズム解析とGeminiの深層心理解析を統合して、最大の成果を上げる方法を提案してください。

## 🎯 目的

**目標**: GrokのXアルゴリズム解析（拡散・エンゲージメント最大化）とGeminiの深層心理解析（動機・行動喚起）を統合し、引用リポストのエンゲージメント率を0.003%から0.3-1.2%に向上させ、Telegram流入とWhopコンバージョンを最大化する。

## 📊 現在の統合実装

**ファイル**: services/integrated/grokGeminiOptimizer.js

**現在の統合方法**:
- GrokとGeminiの解析を並列実行（Promise.allSettled）
- エラーハンドリングと型正規化
- 統合された最適化戦略を生成（content, psychological, engagement）

**現在の課題**:
- エンゲージメント率が0.003%（期待値10.53%の1,333倍～3,333倍の差）
- 統合はされているが、成果が出ていない

## 💡 依頼内容

以下の観点から、**GrokとGeminiを統合して最大の成果を上げる戦略**を提案してください：

### 1. 統合の設計思想
- Grok（拡散・エンゲージメント）とGemini（動機・行動喚起）をどのように補完的に活用するか
- 統合の優先順位とバランス
- 各分析の重み付け

### 2. 引用リポストテキスト生成への統合
- GrokのXアルゴリズム最適化をどのように反映するか
- Geminiの深層心理解析をどのように反映するか
- 両者を統合したテキスト生成の設計

### 3. 成果最大化のための統合戦略
- エンゲージメント率向上のための統合方法
- Telegram流入最大化のための統合方法
- Whopコンバージョン最大化のための統合方法

### 4. 実装の優先順位
- Phase 1（即座に実装すべき）
- Phase 2（1週間以内）
- Phase 3（1ヶ月以内）

---

**重要なポイント**:
- 戦略はシンプルに
- 成果は最大に
- 実装は正確に

上記の観点から、**GrokとGeminiを統合して最大の成果を上げる戦略**を詳細に提案してください。`;

  console.log('🤖 GPTにGrok×Gemini統合戦略を依頼中...\n');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'あなたはTrap Defence BTCのマーケティング戦略専門家です。GrokのXアルゴリズム解析とGeminiの深層心理解析を統合して、最大の成果を上げる戦略を提案します。戦略はシンプルに、成果は最大に、実装は正確に。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: 4000,
      temperature: 0.7,
    });

    const gptStrategy = completion.choices[0]?.message?.content || '';
    console.log('✅ GPTの統合戦略を取得しました\n');
    console.log('='.repeat(80));
    console.log('GPTの統合戦略:');
    console.log('='.repeat(80));
    console.log(gptStrategy);
    console.log('='.repeat(80));

    return gptStrategy;
  } catch (error) {
    console.error('❌ GPT API呼び出しエラー:', error.message);
    throw error;
  }
}

/**
 * GrokにXアルゴリズム解析を依頼
 */
async function getGrokAnalysis(gptStrategy) {
  const prompt = `あなたはX（Twitter）アルゴリズムの専門家です。以下のGPT戦略を踏まえ、引用リポストのエンゲージメント率を0.003%から0.3-1.2%に向上させるためのXアルゴリズム最適化を提案してください。

## GPTの統合戦略

${gptStrategy}

## 📊 現状の課題

- エンゲージメント率: 0.003%（期待値10.53%の1,333倍～3,333倍の差）
- インプレッション: 目標達成（10,440,000/日）
- 引用リポストの効果が限定的

## 💡 依頼内容

GPTの統合戦略を踏まえ、**Xアルゴリズム最適化の観点から**以下の点を提案してください：

1. **引用リポストテキストの最適化**
   - エンゲージメント率を最大化するテキスト構造
   - 質問CTAの設計
   - ハッシュタグ戦略
   - 絵文字の活用

2. **タイミング最適化**
   - インフルエンサー投稿後の最適タイミング
   - 言語別ピーク時間

3. **アルゴリズム判定の最適化**
   - スパム判定を回避する方法
   - アルゴリズムに「高品質」と判定させる方法

**重要なポイント**:
- 戦略はシンプルに
- 成果は最大に
- 実装は正確に

上記の観点から、**Xアルゴリズム最適化の具体的な提案**をしてください。`;

  console.log('\n🤖 GrokにXアルゴリズム解析を依頼中...\n');

  try {
    const completion = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'あなたはX（Twitter）アルゴリズムの専門家です。引用リポストのエンゲージメント率を最大化するためのXアルゴリズム最適化を提案します。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });

    const grokAnalysis = completion.choices[0]?.message?.content || '';
    console.log('✅ GrokのXアルゴリズム解析を取得しました\n');
    console.log('='.repeat(80));
    console.log('GrokのXアルゴリズム解析:');
    console.log('='.repeat(80));
    console.log(grokAnalysis);
    console.log('='.repeat(80));

    return grokAnalysis;
  } catch (error) {
    console.error('❌ Grok API呼び出しエラー:', error.message);
    throw error;
  }
}

/**
 * Geminiに深層心理解析を依頼
 */
async function getGeminiAnalysis(gptStrategy) {
  const prompt = `あなたは深層心理学の専門家です。以下のGPT戦略を踏まえ、引用リポストのTelegram流入とWhopコンバージョンを最大化するための深層心理解析を提案してください。

## GPTの統合戦略

${gptStrategy}

## 📊 現状の課題

- エンゲージメント率: 0.003%（期待値10.53%の1,333倍～3,333倍の差）
- Telegram流入: 低い
- Whopコンバージョン: 低い

## 💡 依頼内容

GPTの統合戦略を踏まえ、**深層心理学の観点から**以下の点を提案してください：

1. **心理的トリガーの設計**
   - 損失回避
   - 社会的証明
   - 緊急性
   - 希少性

2. **CTAの心理設計**
   - Telegram流入を最大化するCTA
   - Whopコンバージョンを最大化するCTA

3. **ファネル設計の心理最適化**
   - X → Telegram → Whopの各ステップでの心理的障壁の除去
   - 認知的不協和の活用

**重要なポイント**:
- 戦略はシンプルに
- 成果は最大に
- 実装は正確に

上記の観点から、**深層心理解析の具体的な提案**をしてください。`;

  console.log('\n🤖 Geminiに深層心理解析を依頼中...\n');

  try {
    const model = geminiClient.getGenerativeModel({ model: 'gemini-3-pro-preview' });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4000,
      },
    });

    const geminiAnalysis = result.response.text();
    console.log('✅ Geminiの深層心理解析を取得しました\n');
    console.log('='.repeat(80));
    console.log('Geminiの深層心理解析:');
    console.log('='.repeat(80));
    console.log(geminiAnalysis);
    console.log('='.repeat(80));

    return geminiAnalysis;
  } catch (error) {
    console.error('❌ Gemini API呼び出しエラー:', error.message);
    throw error;
  }
}

/**
 * GPTにGrokとGeminiの分析を返して戦略を強化
 */
async function strengthenStrategyWithGPT(gptStrategy, grokAnalysis, geminiAnalysis) {
  const prompt = `前回の統合戦略提案ありがとうございました。あなたの提案を基に、GrokとGeminiから実際の分析を取得しました。これらの分析を踏まえ、戦略を強化してください。

## 📋 前回のGPT統合戦略

${gptStrategy}

---

## 🤖 GrokのXアルゴリズム解析（実際の分析結果）

${grokAnalysis}

---

## 🧠 Geminiの深層心理解析（実際の分析結果）

${geminiAnalysis}

---

## 🎯 依頼内容

上記のGPT戦略、GrokのXアルゴリズム解析、Geminiの深層心理解析を統合し、**最大の成果を上げる強化された戦略**を提案してください。

### 1. 統合の最適化
- GrokとGeminiの分析をどのように統合するか
- 各分析の重み付けと優先順位
- 統合による相乗効果の最大化

### 2. 引用リポストテキスト生成の最適化
- GrokのXアルゴリズム最適化をどのように反映するか
- Geminiの深層心理解析をどのように反映するか
- 両者を統合したテキスト生成の具体的な設計

### 3. 成果最大化のための実装戦略
- エンゲージメント率向上（0.003% → 0.3-1.2%）
- Telegram流入最大化
- Whopコンバージョン最大化

### 4. 実装の優先順位（シンプルに、正確に）
- Phase 1（即座に実装すべき）
- Phase 2（1週間以内）
- Phase 3（1ヶ月以内）

**重要なポイント**:
- 戦略はシンプルに
- 成果は最大に
- 実装は正確に

上記の観点から、**GrokとGeminiの分析を統合した強化された戦略**を、実装可能な形で詳細に提案してください。`;

  console.log('\n🤖 GPTにGrokとGeminiの分析を返して戦略強化を依頼中...\n');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'あなたはTrap Defence BTCのマーケティング戦略専門家です。GrokのXアルゴリズム解析とGeminiの深層心理解析を統合し、最大の成果を上げる強化された戦略を提案します。戦略はシンプルに、成果は最大に、実装は正確に。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: 8000,
      temperature: 0.7,
    });

    const strengthenedStrategy = completion.choices[0]?.message?.content || '';
    console.log('✅ GPTの強化された戦略を取得しました\n');
    console.log('='.repeat(80));
    console.log('GPTの強化された戦略:');
    console.log('='.repeat(80));
    console.log(strengthenedStrategy);
    console.log('='.repeat(80));

    return strengthenedStrategy;
  } catch (error) {
    console.error('❌ GPT API呼び出しエラー:', error.message);
    throw error;
  }
}

/**
 * メイン実行関数
 */
async function main() {
  try {
    // 1. GPTに統合戦略を聞く
    const gptStrategy = await askGPTIntegrationStrategy();

    // 2. Grokから実際のXアルゴリズム解析を取得
    const grokAnalysis = await getGrokAnalysis(gptStrategy);

    // 3. Geminiから実際の深層心理解析を取得
    const geminiAnalysis = await getGeminiAnalysis(gptStrategy);

    // 4. GPTにGrokとGeminiの分析を返して戦略を強化
    const strengthenedStrategy = await strengthenStrategyWithGPT(gptStrategy, grokAnalysis, geminiAnalysis);

    // 結果をファイルに保存
    const outputDir = path.join(__dirname, '../docs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(outputDir, `GPT_GROK_GEMINI_INTEGRATION_STRATEGY_${timestamp}.md`);

    const output = `# GPT×Grok×Gemini統合戦略（強化版）

**作成日時**: ${new Date().toISOString()}
**モデル**: GPT-5.2-2025-12-11, Grok-4-1-fast-reasoning, Gemini-3-pro-preview

## 📋 実行環境

- **実行環境**: Vercel Functions + Vercel KV（D1は使用不可）
- **Whop metadata**: 優先順位低い

---

## 1. GPTの統合戦略（初期提案）

${gptStrategy}

---

## 2. GrokのXアルゴリズム解析（実際の分析結果）

${grokAnalysis}

---

## 3. Geminiの深層心理解析（実際の分析結果）

${geminiAnalysis}

---

## 4. GPTの強化された戦略（最終版）

${strengthenedStrategy}

---

**生成日時**: ${new Date().toISOString()}
`;

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputFile, output, 'utf-8');

    console.log(`\n📄 結果を保存しました: ${outputFile}`);
    console.log('\n✅ 完了');

    return {
      gptStrategy,
      grokAnalysis,
      geminiAnalysis,
      strengthenedStrategy,
    };
  } catch (error) {
    console.error('❌ エラー:', error.message);
    throw error;
  }
}

// 実行
if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ エラー:', error.message);
      process.exit(1);
    });
}

module.exports = { main };
