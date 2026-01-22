// scripts/review-new-vsl-workflow-with-grok.js
// 新しいVSLワークフロー構想をGrokにレビューさせる

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// コマンドライン引数からAPIキーを取得（優先）
const args = process.argv.slice(2);
const apiKeyFromArgs = args.find(arg => arg.startsWith('--api-key='))?.split('=')[1];
const XAI_API_KEY = apiKeyFromArgs || process.env.XAI_API_KEY;
const XAI_BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is not set');
  console.error('使用方法: node scripts/review-new-vsl-workflow-with-grok.js --api-key=YOUR_API_KEY');
  console.error('または環境変数 XAI_API_KEY を設定してください');
  process.exit(1);
}

const grokClient = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: XAI_BASE_URL,
});

/**
 * 新しいVSLワークフロー構想をGrokにレビューさせる
 */
async function reviewNewVSLWorkflow() {
  const prompt = `あなたはTrap Defence BTCのCOO（Chief Operating Officer）として、新しいVSLワークフロー構想をレビューしてください。

## 📋 背景：既存ワークフローの課題

COO（Cursor/Composer 1）からの報告：
- **既存ワークフローが機能しなかった**
- **原因**: タスクが複雑化しすぎて詰まってしまった可能性が高い

### 既存のVSLワークフロー（機能しなかった）
- **VSL1投稿**: Telegram MINIMALチャンネル + X投稿（1日2回: 9時、21時 UTC）
- **VSL2配信**: Telegram DM（24時間後）
- **VSL1リマインダー**: Telegram DM（12時間後）
- **VSL2ラストコール**: Telegram DM（22時間後）
- **Grok連携**: Xセンチメント分析で投稿内容を最適化

**問題点**: 複数のタスクが複雑に絡み合い、システムが詰まってしまった

---

## 🚀 新しいVSLワークフロー構想

### 設計コンセプト
**シンプル化**: 複雑なタスクをGrokに任せて、シンプルなフローに再設計

### 新しいワークフロー

#### 1. GrokがXのアルゴリズムを解析
- Xのアルゴリズムがインプレッションを最大化する要因を分析
- どのような投稿、タイミング、エンゲージメントがインプレッションを伸ばすかを理解

#### 2. Grokが6言語ごとにインフルエンサーアカウントを発掘
- **6言語**: en, es, pt-br, ar, ja, ko
- 各言語でインプレッションが伸びやすいインフルエンサーアカウントを特定
- **発掘基準**: Grokが最適解を判断（フォロワー数、エンゲージメント率、過去のインプレッション実績など）

#### 3. ユーザーがXアカウントに6言語版の無料版メッセージを投稿
- 各言語版のVSL1メッセージ（無料版オプトイン誘導）を投稿
- ユーザーが手動または自動で投稿

#### 4. GrokがX APIを使って引用リポスト
- 発掘したインフルエンサーアカウントに引用リポスト
- **タイミング**: Grokが最適解を判断（投稿後すぐ、数時間後など）
- **頻度**: Grokが最適解を判断（1投稿あたり何人に引用リポストするか）

#### 5. Grokが引用リポストの文章を最適化
- インプレッション数が最大化するように解析して文章を作成
- 元投稿を引用しつつ、インプレッション最大化を狙う文章を生成

#### 6. インプレッションからトラフィックを獲得
- 引用リポスト経由でVSL1への流入を増やす
- インプレッション → クリック → VSL1視聴 → 無料版オプトイン

---

## 📊 投稿スケジュール設計

### 新しいスケジュール
- **6言語 × 2人 × 2投稿 = 24投稿/日**
- **1時間に1投稿**
- **各市場の最適な時間帯に設定**

**例**:
- 日本語市場: JST 9時、21時
- 英語市場: UTC 9時、21時
- スペイン語市場: UTC 14時、2時（翌日）
- など、各市場のアクティブ時間に合わせて分散

---

## 🤖 Grokに任せる判断事項

以下の判断をGrokに任せることで、シンプル化を実現：

1. **インフルエンサー発掘の基準**
   - フォロワー数、エンゲージメント率、過去のインプレッション実績など
   - どの基準でインフルエンサーを選ぶべきか

2. **引用リポストのタイミング**
   - 投稿後すぐ、数時間後、翌日など
   - どのタイミングがインプレッション最大化に最適か

3. **引用リポストの頻度**
   - 1投稿あたり何人に引用リポストするか
   - 過度な引用リポストによるスパム判定を避けつつ、インプレッションを最大化

4. **引用リポストの文章生成**
   - インプレッション最大化のための最適な文章
   - 元投稿の内容、インフルエンサーの特徴、市場の状況を考慮

---

## 📋 レビュー依頼事項

以下の視点から、新しいVSLワークフロー構想をレビューしてください：

### 1. 戦略的視点（COO）

#### 1.1 シンプル化の評価
- 既存ワークフローの複雑さを解消できているか
- Grokに任せる判断事項が適切か
- システムが詰まるリスクを回避できているか

#### 1.2 実現可能性の評価
- 技術的に実現可能か
- X APIの制限（レート制限、スパム判定など）を考慮できているか
- 6言語 × 2人 × 2投稿 = 24投稿/日のスケジュールは現実的か

#### 1.3 効果予測
- インプレッション最大化の可能性
- トラフィック獲得の見込み
- 既存ワークフローとの比較

### 2. 技術的視点（CTO）

#### 2.1 アーキテクチャ設計
- Grok + X API連携のデータフロー設計
- エラーハンドリングとフォールバック戦略
- レート制限対策

#### 2.2 実装の複雑さ
- 実装の難易度
- 既存コードベースとの統合方法
- 段階的実装の可能性（MVP → 本番）

#### 2.3 リスク評価
- X APIのスパム判定リスク
- インフルエンサーへの過度な引用リポストによるリスク
- システムダウンのリスク

### 3. 運用視点（COO）

#### 3.1 運用の複雑さ
- 日常的な運用負荷
- 監視すべき指標
- トラブルシューティングの方法

#### 3.2 スケーラビリティ
- 24投稿/日からさらに拡張する場合の対応
- インフルエンサー数の増減への対応
- 言語数の追加への対応

### 4. 改善提案

#### 4.1 設計の改善点
- よりシンプルにできる部分
- より効果的にできる部分
- リスクを減らせる部分

#### 4.2 段階的実装プラン
- MVP（最小限の実装）の提案
- Phase 1, 2, 3... の段階的実装プラン
- 各フェーズでの検証方法

---

## 📋 出力形式

以下の形式でレビュー結果を出力してください：

### 1. エグゼクティブサマリー（300-400字）
新しいVSLワークフロー構想の総合評価と、既存ワークフローとの比較

### 2. 戦略的視点（COO）のレビュー
- シンプル化の評価
- 実現可能性の評価
- 効果予測

### 3. 技術的視点（CTO）のレビュー
- アーキテクチャ設計の評価
- 実装の複雑さの評価
- リスク評価

### 4. 運用視点（COO）のレビュー
- 運用の複雑さの評価
- スケーラビリティの評価

### 5. 改善提案
- 設計の改善点（3-5項目）
- 段階的実装プラン（Phase 1-3）

### 6. 結論と推奨事項
- 総合的な結論
- 実装を進めるべきか、設計を見直すべきか
- 即座に実行すべき具体的なアクション（3-5項目）

日本語で回答してください。`;

  try {
    console.log('🔄 Grok COO（grok-4-1-fast-reasoning）で新しいVSLワークフロー構想をレビュー中...');
    console.log('📋 レビュー内容:');
    console.log('  - 既存ワークフローの課題分析');
    console.log('  - 新しいワークフロー構想の評価');
    console.log('  - シンプル化の効果');
    console.log('  - 実現可能性とリスク評価');
    console.log('  - 改善提案と段階的実装プラン');
    console.log('');

    const completion = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'あなたはTrap Defence BTCのCOO（Chief Operating Officer）です。新しいVSLワークフロー構想を戦略的・技術的・運用の視点からレビューし、実現可能性と改善提案を提供してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });

    const reviewText = completion?.choices?.[0]?.message?.content?.trim();

    if (!reviewText) {
      console.error('❌ Grokからのレビューが空です');
      return null;
    }

    // レビュー結果をファイルに保存
    const outputDir = path.join(process.cwd(), 'docs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const outputFile = path.join(outputDir, `GROK_REVIEW_NEW_VSL_WORKFLOW_${timestamp}.md`);

    const markdownContent = `# Grok COOによる新しいVSLワークフロー構想レビュー
**作成日時**: ${new Date().toISOString()}  
**レビューAI**: Grok COO（grok-4-1-fast-reasoning）  
**目的**: 新しいVSLワークフロー構想の戦略的・技術的・運用レビュー

---

${reviewText}

---

**レビュー完了**: ${new Date().toISOString()}
`;

    fs.writeFileSync(outputFile, markdownContent, 'utf-8');

    console.log('✅ Grokレビュー完了');
    console.log(`📄 レビュー結果を保存: ${outputFile}`);
    console.log('');
    console.log('📊 レビュー結果:');
    console.log('─'.repeat(80));
    console.log(reviewText);
    console.log('─'.repeat(80));

    return {
      success: true,
      review: reviewText,
      outputFile,
    };
  } catch (error) {
    console.error('❌ Grokレビュー失敗:', error.message);
    if (error.status === 429) {
      console.error('⚠️ レート制限エラー。しばらく待ってから再試行してください。');
    }
    throw error;
  }
}

// 実行
if (require.main === module) {
  reviewNewVSLWorkflow()
    .then((result) => {
      if (result) {
        console.log('✅ レビュー完了');
        process.exit(0);
      } else {
        console.error('❌ レビュー失敗');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { reviewNewVSLWorkflow };
