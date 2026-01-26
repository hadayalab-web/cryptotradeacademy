// scripts/gpt-design-high-cvr-strategy.js
// GPTに高エンゲージメント率インフルエンサーデータを活用した高CVR設計を依頼

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

/**
 * GPTに高CVR設計を依頼
 */
async function designHighCVRStrategy() {
  // インフルエンサーデータを読み込む
  const influencerDataPath = path.join(__dirname, '../docs/INFLUENCER_DATA_SUMMARY_ALL_LANGUAGES_2026-01-26.md');
  const engagementExpectationsPath = path.join(__dirname, '../docs/INFLUENCER_ENGAGEMENT_RATE_EXPECTATIONS_2026-01-26.md');
  const stockValuePath = path.join(__dirname, '../docs/INFLUENCER_STOCK_VALUE_ANALYSIS_2026-01-25.md');

  let influencerData = '';
  let engagementExpectations = '';
  let stockValue = '';

  try {
    influencerData = fs.readFileSync(influencerDataPath, 'utf-8');
  } catch (error) {
    console.warn('⚠️ インフルエンサーデータファイルが見つかりません:', influencerDataPath);
  }

  try {
    engagementExpectations = fs.readFileSync(engagementExpectationsPath, 'utf-8');
  } catch (error) {
    console.warn('⚠️ エンゲージメント期待値ファイルが見つかりません:', engagementExpectationsPath);
  }

  try {
    stockValue = fs.readFileSync(stockValuePath, 'utf-8');
  } catch (error) {
    console.warn('⚠️ ストック価値分析ファイルが見つかりません:', stockValuePath);
  }

  const prompt = `あなたはTrap Defence BTCのマーケティング戦略専門家として、高エンゲージメント率のインフルエンサーデータを活用して、最高のCVR（コンバージョン率）を引き出す設計を提案してください。

## 🎯 目的

**目標**: リストアップされた高エンゲージメント率のインフルエンサーデータを最大限に活用し、Telegramへの流入とWhopでの有料プランへのコンバージョンを最大化する。

## 📊 現在のインフルエンサーデータ

### 全体サマリー

${influencerData}

### エンゲージメント率期待値

${engagementExpectations}

### ストック機能の価値

${stockValue}

## 🔍 現状の課題

1. **エンゲージメント率のギャップ**
   - 期待値: 4.0-10.0%（平均10.53%）
   - 実績: 0.003%（期待値の1,333倍～3,333倍の差）

2. **CVRの低さ**
   - インプレッションは目標達成（10,440,000/日）
   - しかし、Telegram流入やWhopコンバージョンが低い

3. **引用リポストの効果が限定的**
   - 高エンゲージメント率インフルエンサーを選定しているが、CVRが低い
   - コンテンツが受動的でインタラクション喚起が不十分

## 💡 依頼内容

以下の観点から、**高CVRを引き出す設計**を提案してください：

### 1. インフルエンサー選択戦略の最適化

- **言語別の最適化**: 各言語（EN, ES, PT-BR, AR, JA, KO）の特性を活かしたインフルエンサー選択
- **CVR重視の選定基準**: エンゲージメント率だけでなく、CVRに直結する要因を考慮
- **タイミング最適化**: インフルエンサーの投稿タイミングと引用リポストのタイミングの最適化

### 2. コンテンツ戦略の最適化

- **CTA設計**: Telegram流入を最大化するCTAの設計
- **心理的トリガー**: 各言語・文化に適した心理的トリガーの活用
- **ファネル設計**: X → Telegram → Whopのコンバージョンファネル最適化
- **ソーシャルプルーフ**: 保護者数などのソーシャルプルーフの効果的な活用

### 3. 引用リポストテキストの最適化

- **言語別最適化**: 各言語のネイティブ表現と文化的ニュアンス
- **質問CTA**: リプライ誘導とTelegram流入を両立する質問設計
- **リンク配置**: Telegram Deep LinkとWhopリンクの最適な配置
- **ハッシュタグ戦略**: アルゴリズム最適化とCVR向上の両立

### 4. タイミング戦略

- **インフルエンサー投稿後の最適タイミング**: 引用リポストの投稿タイミング
- **言語別ピーク時間**: 各言語のオーディエンスが最もアクティブな時間帯
- **エンゲージメント爆発の最大化**: 初期エンゲージメントを最大化するタイミング

### 5. メトリクスとPDCA

- **CVR追跡**: Telegram流入数、Whopコンバージョン数の追跡方法
- **A/Bテスト設計**: コンテンツ、CTA、タイミングのA/Bテスト設計
- **改善サイクル**: PDCAサイクルを回すためのメトリクス設計

## 📋 期待する出力形式

以下の構造で設計を提案してください：

### 1. エグゼクティブサマリー
- 提案の核心と期待されるCVR向上率

### 2. インフルエンサー選択戦略
- 言語別の最適化
- CVR重視の選定基準
- 具体的な選定ロジック

### 3. コンテンツ戦略
- CTA設計
- 心理的トリガー
- ファネル設計
- ソーシャルプルーフ活用

### 4. 引用リポストテキスト設計
- 言語別テンプレート例
- 質問CTAの設計
- リンク配置戦略
- ハッシュタグ戦略

### 5. タイミング戦略
- インフルエンサー投稿後の最適タイミング
- 言語別ピーク時間
- エンゲージメント爆発の最大化

### 6. メトリクスとPDCA
- CVR追跡方法
- A/Bテスト設計
- 改善サイクル

### 7. 実装優先順位
- Phase 1（即座に実装すべき）
- Phase 2（1週間以内）
- Phase 3（1ヶ月以内）

### 8. 期待される成果
- CVR向上率の予測
- Telegram流入数の予測
- Whopコンバージョン数の予測

## 🎯 重要なポイント

1. **データドリブン**: 提供されたインフルエンサーデータを最大限に活用
2. **言語別最適化**: 各言語の特性と文化的ニュアンスを考慮
3. **CVR最大化**: エンゲージメント率だけでなく、CVRに直結する設計
4. **実装可能性**: 現在の技術スタックで実装可能な設計
5. **測定可能性**: PDCAサイクルを回せるメトリクス設計

---

上記の観点から、**高CVRを引き出す設計**を詳細に提案してください。`;

  console.log('🤖 GPTに高CVR設計を依頼中...\n');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'あなたはTrap Defence BTCのマーケティング戦略専門家です。高エンゲージメント率のインフルエンサーデータを活用して、最高のCVR（コンバージョン率）を引き出す設計を提案します。データドリブンで実装可能な具体的な戦略を提供します。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: 8000,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || '';

    // 結果をファイルに保存
    const outputDir = path.join(__dirname, '../docs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(outputDir, `GPT_HIGH_CVR_STRATEGY_${timestamp}.md`);

    const output = `# GPT提案: 高CVR戦略設計

**作成日時**: ${new Date().toISOString()}
**モデル**: gpt-5.2-2025-12-11

---

${response}

---

**生成日時**: ${new Date().toISOString()}
`;

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputFile, output, 'utf-8');

    console.log('✅ GPTの提案を取得しました');
    console.log(`📄 結果を保存しました: ${outputFile}\n`);
    console.log('='.repeat(80));
    console.log('GPTの提案:');
    console.log('='.repeat(80));
    console.log(response);
    console.log('='.repeat(80));

    return response;
  } catch (error) {
    console.error('❌ GPT API呼び出しエラー:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw error;
  }
}

// 実行
if (require.main === module) {
  designHighCVRStrategy()
    .then(() => {
      console.log('\n✅ 完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ エラー:', error.message);
      process.exit(1);
    });
}

module.exports = { designHighCVRStrategy };
