// scripts/gpt-review-influencer-workflow.js
// GPTにインフルエンサー引用リポストワークフローをレビューしてもらう

const OpenAI = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

/**
 * GPTにインフルエンサー引用リポストワークフローをレビューしてもらう
 */
async function reviewInfluencerWorkflow() {
  const prompt = `あなたはTrap Defence BTCのインフルエンサー引用リポストワークフローの専門家として、現状の実装をレビューし、成果が出ない根本原因を特定してください。

## 🎯 現状の課題

**問題**: 高エンゲージメント率のインフルエンサーに引用リポストしてトラフィックを獲得するワークフローを実装・運用しているが、成果がなかなか出ない。

## 📋 現在の実装状況

### 1. インフルエンサー発掘とストック管理

**実装ファイル**: \`services/x/influencerStock.js\`, \`services/grok/client.js\`

**プロセス**:
1. Grok API（\`discoverInfluencersForQuoteRepost\`）でインフルエンサーを発掘
   - エンゲージメント率7%+を優先
   - インプレッション数: EN 10万-30万+, その他 5万-20万+
   - フォロワー数: 1万-50万（最適範囲）
   - tweetId必須（引用リポストに必要）

2. ストック管理（KVストレージ）
   - 言語別にストック保存（EN: 20人、その他: 10人）
   - TTL: 24時間
   - エンゲージメント率4%以上でフィルタリング
   - 好反応率重視の選択戦略（\`selectInfluencersForHighEngagement\`）

3. 投稿用選択（\`selectInfluencersForImpressionTarget\`）
   - インプレッション規模で選択
   - EN: 4人/日、その他: 2人/日
   - 目標インプレッション: EN 10万-20万、その他 5万-10万

**確認済み**: インフルエンサーは既に発掘されてリスト化されている

### 2. 引用リポスト生成

**実装ファイル**: \`api/x-quote-repost.js\`, \`services/grok/client.js\`

**プロセス**:
1. Grokが引用リポストテキストを生成（\`generateQuoteRepostText\`）
   - モデル: \`grok-4-1-fast-reasoning\`
   - 140文字以内（引用リポスト制限）
   - Xアルゴリズム最適化:
     - 質問CTA必須（20-30%の投稿を占める）
     - リンク最適化（1投稿1リンク、Telegram Deep Link優先）
     - ハッシュタグ最適化（2-3個: トレンド1+ニッチ2）
     - 絵文字最適化（3-5個）
     - 心理的トリガー（FOMO、損失回避、社会的証明等）

2. Grok×Gemini統合最適化（\`optimizeContentAndFunnel\`）
   - Grok: Xアルゴリズム分析
   - Gemini: 心理分析
   - 統合戦略をプロンプトに反映

3. フォールバックテンプレート
   - Grok生成失敗時はテンプレート使用
   - 言語別テンプレート（6言語対応）

### 3. 投稿タイミングとスケジューリング

**実装ファイル**: \`api/x-quote-repost.js\`, \`services/x/optimization.js\`

**プロセス**:
1. ピーク時間チェック
   - UTC 0, 1, 20, 21時（引用リポスト専用ピーク時間）
   - \`shouldPostQuoteRepost\`関数でタイミング判定
   - インフルエンサーのツイート投稿後10-20分以内を推奨

2. 投稿数制限
   - 1日45投稿まで（インプレッション最大化）
   - 1時間4投稿まで（レート制限対策）
   - 言語別: EN 4本/日、その他 2本/日

3. スケジューリング
   - Vercel Cron: 1時間ごと
   - \`getLanguagesForCurrentHour\`で言語別に処理

### 4. メトリクス追跡

**実装ファイル**: \`api/x-quote-repost-metrics.js\`, \`services/x/metricsTracker.js\`, \`api/x-engagement-metrics.js\`

**プロセス**:
1. 投稿直後の初期メトリクス記録
   - X APIから取得（\`non_public_metrics\`優先）
   - インプレッション数、エンゲージメント数、クリック数

2. 定期追跡（Cron Job）
   - 1時間ごとに過去24時間の引用リポストを追跡
   - メトリクス更新

3. インフルエンサー別メトリクス記録
   - \`recordInfluencerMetrics\`で記録
   - パフォーマンス分析用

### 5. コンテンツ最適化

**実装ファイル**: \`services/x/contentOptimizer.js\`

**プロセス**:
1. Grok Xアルゴリズム分析
   - エンゲージメント率の根本原因分析
   - アルゴリズム最適化戦略

2. Gemini心理分析
   - 高エンゲージメント率の心理的アルゴリズム
   - 高CVRの心理的アルゴリズム

3. 統合最適化戦略生成
   - GrokとGeminiの結果を統合
   - コンテンツ、タイミング、フォーマット、ファネル最適化

## 📊 現在のメトリクス（推定）

- **インプレッション**: 目標達成（EN 10万-20万、その他 5万-10万）
- **エンゲージメント率**: 低い（目標: 1.0%+、現状: 0.003%程度）
- **クリック率**: 不明（追跡は実装済み）
- **コンバージョン率**: 不明（Telegramオプトイン、Whopコンバージョン）

## 🔍 レビュー依頼事項

以下の視点から、成果が出ない根本原因を特定し、改善策を提案してください：

### 1. ワークフロー全体の効果性

- **インフルエンサー選定**: 選定基準は適切か？エンゲージメント率7%+のインフルエンサーを選んでいるが、実際に引用リポストで成果が出るか？
- **引用リポストコンテンツ**: Grok生成のコンテンツは魅力的か？140文字制限内で効果的なCTAが含まれているか？
- **タイミング**: ピーク時間（UTC 0,1,20,21）とインフルエンサーのツイート投稿後10-20分以内のタイミングは最適か？
- **エンゲージメントループ**: 引用リポスト後のエンゲージメントを最大化する仕組みがあるか？

### 2. コンテンツ戦略

- **質問CTA**: 必須としているが、実際に効果的か？オープンエンド質問がリプライを誘発しているか？
- **リンク配置**: Telegram Deep Linkの配置は最適か？140文字制限内で効果的に配置されているか？
- **ハッシュタグ**: 2-3個の使用は適切か？トレンドとニッチのバランスは？
- **心理的トリガー**: FOMO、損失回避、社会的証明等が効果的に使われているか？

### 3. ファネル最適化

- **Telegramオプトイン**: 引用リポストからTelegramへの導線は明確か？Deep Linkが効果的に機能しているか？
- **Whopコンバージョン**: 引用リポストからWhopへの導線はあるか？プロモーションコード（DEFEND50）は効果的に使われているか？
- **クロスポリネーション**: Minimal Versionポストへのリンクは効果的か？

### 4. メトリクスと分析

- **追跡精度**: メトリクス追跡は正確か？インプレッション数、エンゲージメント数、クリック数は正確に取得できているか？
- **分析不足**: どのメトリクスが低いのか？インプレッションは高いがエンゲージメントが低い理由は？
- **A/Bテスト**: コンテンツ、タイミング、フォーマットのA/Bテストは実施されているか？

### 5. 技術的な問題

- **エラーハンドリング**: Grok生成失敗時のフォールバックは適切か？
- **レート制限**: X APIのレート制限に引っかかっていないか？
- **パフォーマンス**: 投稿タイミングが遅れていないか？

## 📋 期待される出力

以下の形式で分析結果を出力してください：

### 1. 根本原因分析（Root Cause Analysis）

**主要な根本原因（3-5項目）**:
1. [原因1]: [詳細説明]
2. [原因2]: [詳細説明]
3. [原因3]: [詳細説明]

**影響度の高い順に並べてください**

### 2. 改善推奨事項（Improvement Recommendations）

**即座に実行すべき改善（3-5項目）**:
1. [改善1]: [具体的な実装方法]
2. [改善2]: [具体的な実装方法]
3. [改善3]: [具体的な実装方法]

**優先度の高い順に並べてください**

### 3. 代替戦略（Alternative Strategies）

**検討すべき代替アプローチ（2-3項目）**:
1. [代替戦略1]: [説明]
2. [代替戦略2]: [説明]

### 4. KPI推奨事項（KPI Recommendations）

**追跡すべきメトリクス（5-7項目）**:
1. [メトリクス1]: [目標値]
2. [メトリクス2]: [目標値]

### 5. 実装優先度（Implementation Priority）

**Phase 1（即座）**: [3-5項目]
**Phase 2（1週間以内）**: [3-5項目]
**Phase 3（1ヶ月以内）**: [3-5項目]

日本語で回答してください。`;

  try {
    console.log('🔄 GPTにインフルエンサー引用リポストワークフローをレビュー依頼中...');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-2024-11-20',
      messages: [
        {
          role: 'system',
          content: 'あなたはTrap Defence BTCのインフルエンサー引用リポストワークフローの専門家です。現状の実装を詳細に分析し、成果が出ない根本原因を特定し、具体的な改善策を提案します。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });

    const response = completion?.choices?.[0]?.message?.content?.trim();
    if (!response) {
      throw new Error('GPT review failed: empty response');
    }

    // 結果をファイルに保存
    const fs = require('fs');
    const path = require('path');
    const outputDir = path.join(__dirname, '../docs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(outputDir, `GPT_INFLUENCER_WORKFLOW_REVIEW_${timestamp}.md`);

    const output = `# GPTレビュー: インフルエンサー引用リポストワークフロー

**レビュー日時**: ${new Date().toISOString()}
**モデル**: gpt-4o-2024-11-20

---

${response}

---

**生成日時**: ${new Date().toISOString()}
`;

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputFile, output, 'utf-8');

    console.log(`✅ GPTレビュー完了`);
    console.log(`📄 結果を保存しました: ${outputFile}`);
    console.log(`\n${'='.repeat(80)}`);
    console.log(response);
    console.log(`${'='.repeat(80)}\n`);

    return response;
  } catch (error) {
    console.error('❌ GPTレビュー失敗:', error.message);
    if (error.response) {
      console.error('Error response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// 実行
if (require.main === module) {
  reviewInfluencerWorkflow()
    .then(() => {
      console.log('✅ レビュー完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ エラー:', error.message);
      process.exit(1);
    });
}

module.exports = { reviewInfluencerWorkflow };
