// scripts/ask-gpt-optimal-posting-strategy.js
// GPT-5.2-2025-12-11による70リストへの最適な投稿戦略の分析

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// レビュー対象ファイル
const FILES_TO_REVIEW = [
  'api/x-quote-repost.js',
  'services/x/influencerRotation.js',
  'services/x/influencerStock.js',
  'services/x/optimization.js',
  'config/influencerStrategy.js',
];

/**
 * ファイルを読み込む
 */
function readFile(filePath) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    return fs.readFileSync(fullPath, 'utf-8');
  } catch (error) {
    console.error(`❌ Failed to read ${filePath}:`, error.message);
    return null;
  }
}

/**
 * GPT-5.2に最適な投稿戦略を質問
 */
async function askGPTForOptimalStrategy() {
  console.log('🔍 GPT-5.2-2025-12-11による70リストへの最適な投稿戦略の分析を開始...\n');

  // ファイルを読み込む
  const files = {};
  for (const filePath of FILES_TO_REVIEW) {
    const content = readFile(filePath);
    if (content) {
      files[filePath] = content;
      console.log(`✅ Loaded: ${filePath} (${content.length} chars)`);
    }
  }

  console.log(`\n📊 Total files: ${Object.keys(files).length}\n`);

  // 現在の実装状況と質問内容をまとめる
  const problemDescription = `
## 70リストへの最適な投稿戦略の分析依頼

### 現状の実装状況

#### 1. インフルエンサーストック管理
- **70リスト**: 高品質なインフルエンサーリスト（言語別に分散）
- **ストック管理**: Vercel KVに保存（24時間TTL）
- **ストック更新**: Grokが各インフルエンサーの最新ホットツイート（tweetId）を発掘
- **更新頻度**: 24時間ごと（または手動更新）
- **各インフルエンサー**: 1つのtweetIdを持つ（最新のホットツイート）

#### 2. ローテーション機能（services/x/influencerRotation.js）
- **今日の投稿済みリスト**: 今日既に投稿したインフルエンサーを除外
- **柔軟なローテーション**: 利用可能なインフルエンサーが不足 → 投稿済みも含める（ローテーションリセット）
- **制限**: 「1日1回」という制限ではなく、「今日の投稿済みリストから除外」という仕組み
- **ローテーションインデックス**: 循環的にインフルエンサーを選択

#### 3. 重複投稿防止（api/x-quote-repost.js）
- **tweetIdベース**: 過去24時間の同じtweetIdへの投稿を防止
- **新しいツイート**: 新しいツイートが投稿されれば、同じインフルエンサーに複数回投稿可能
- **重複チェック**: 過去24時間の投稿履歴をSetで高速検索

#### 4. タイミングチェック（services/x/optimization.js）
- **緩和された制限**: 60分以内であれば投稿を許可
- **ピーク時間**: UTC 0,1,20,21,22であれば60分を超えても投稿を許可
- **タイミングチェック**: shouldPostQuoteRepost関数で実装

#### 5. X APIレート制限（公式ドキュメント参照）
- **Per User (OAuth 1.0a)**: 100/15min = 理論上9,600/24時間
- **Per App (Bearer Token)**: 10,000/24hrs
- **エンドポイント**: POST /2/tweets（引用リポストもこのエンドポイントを使用）
- **参考**: https://docs.x.com/x-api/fundamentals/rate-limits

#### 6. X APIトークンコスト（画像から取得）
- **引用リポスト**: 5クレジット/投稿 = $0.005/投稿
- **AIコンテンツ生成**: 10クレジット/投稿 = $0.01/投稿
- **インプレッション収集**: 1クレジット/1000インプレッション = $0.001/1000

### 現在の設定

#### 言語別インフルエンサー数（config/influencerStrategy.js）
- **EN**: 10人（ピーク時間）、4人（オフピーク時間）
- **その他言語（ES, PT-BR, AR, KO, JA）**: 2人（ピーク時間）、1人（オフピーク時間）
- **合計**: 約70人（言語別に分散）

#### 日次投稿数制限
- **環境変数**: X_MAX_DAILY_POSTS = 100（デフォルト）
- **実装値**: api/x-quote-repost.jsで50にハードコード（古い戦略）

### 質問事項

#### 1. インフルエンサー1人あたりの最適な投稿数
- **現在の仮説**: 2投稿/日（70人 × 2 = 140投稿/日）
- **質問**: この仮説は正しいですか？ それとも、もっと多く投稿できますか？
- **考慮要素**:
  - 高品質なインフルエンサーは1日複数回ツイートする可能性
  - ストック更新時に新しいツイートが追加される可能性
  - ローテーション機能により、同じインフルエンサーに複数回投稿可能
  - 重複投稿防止はtweetIdベース（新しいツイートなら投稿可能）

#### 2. スパム判定を避けるための最適な投稿間隔
- **質問**: 同一インフルエンサーへの投稿間隔は最低何時間必要ですか？
- **考慮要素**:
  - X APIのスパム判定アルゴリズム
  - 同一インフルエンサーへの連続投稿のリスク
  - 時間帯による影響（ピーク時間 vs オフピーク時間）

#### 3. 最適な日次投稿数
- **質問**: 70リストに対して、1日の最適な投稿数は何件ですか？
- **考慮要素**:
  - X APIレート制限（Per User: 100/15min, Per App: 10,000/24hrs）
  - スパム判定リスク
  - インプレッション最大化
  - トークンコスト効率

#### 4. 時間配分戦略
- **質問**: 140投稿/日（またはそれ以上）を24時間に分散する最適な方法は？
- **考慮要素**:
  - 15分単位の分散（100/15minの制限内）
  - ピーク時間への集中 vs 均等分散
  - 言語別ローテーション

#### 5. ストック更新戦略
- **質問**: ストック更新頻度を上げることで、同じインフルエンサーに複数回投稿できますか？
- **考慮要素**:
  - ストック更新コスト（Grok API）
  - 新しいツイートの取得頻度
  - 投稿数の増加可能性

### 期待される回答

以下の観点から、最適な実装案を提案してください：

1. **インフルエンサー1人あたりの最適な投稿数**
   - 2投稿/日？ 3投稿/日？ 4投稿/日？ それとも動的に決定？
   - 根拠とリスク分析

2. **日次投稿数の最適値**
   - 70リストに対して、1日の最適な投稿数
   - X APIレート制限との整合性
   - スパム判定リスクの評価

3. **時間配分戦略**
   - 24時間への分散方法
   - 15分単位の分散戦略
   - ピーク時間への集中度

4. **ローテーション機能の最適化**
   - 現在の実装の改善点
   - 同一インフルエンサーへの複数回投稿の実現方法

5. **ストック更新戦略**
   - 更新頻度の最適化
   - 新しいツイート取得による投稿数増加の可能性

6. **実装の優先順位**
   - P0（即座に実装）: 何を？
   - P1（短期）: 何を？
   - P2（中期）: 何を？

7. **リスク評価**
   - スパム判定リスク
   - X APIレート制限超過リスク
   - コスト増加リスク

### コードレビュー

以下のファイルをレビューして、最適な実装案を提案してください：

${Object.keys(files).map(filePath => `- ${filePath}`).join('\n')}
`;

  const prompt = `あなたはGPT-5.2-2025-12-11です。70リストへの最適な投稿戦略について、コードレビューと実装案の提案を実施してください。

${problemDescription}

## レビュー観点

1. **現在の実装の理解**: 投稿ファネルの仕組みを正確に理解しているか
2. **最適な投稿数の判断**: インフルエンサー1人あたりの最適な投稿数は？
3. **X APIレート制限との整合性**: レート制限内で最大限の投稿数を実現できるか
4. **スパム判定リスク**: どの程度の投稿数まで安全か
5. **時間配分戦略**: 24時間への最適な分散方法
6. **ローテーション機能の最適化**: 現在の実装の改善点
7. **ストック更新戦略**: 更新頻度による投稿数増加の可能性
8. **実装の優先順位**: 何を優先的に実装すべきか

## 出力形式

以下の形式でレビュー結果を出力してください：

### 1. エグゼクティブサマリー（300-400字）
70リストへの最適な投稿戦略の総合的な結論

### 2. 現在の実装の理解
- 投稿ファネルの仕組み
- ローテーション機能の動作
- 重複投稿防止の仕組み
- タイミングチェックの仕組み

### 3. 最適な投稿数の判断
- **インフルエンサー1人あたりの最適な投稿数**: X投稿/日（根拠とリスク分析）
- **日次投稿数の最適値**: X投稿/日（70リスト全体）
- **X APIレート制限との整合性**: レート制限内で実現可能か
- **スパム判定リスク**: リスク評価と対策

### 4. 時間配分戦略
- **24時間への分散方法**: 具体的な時間配分
- **15分単位の分散戦略**: レート制限（100/15min）を考慮
- **ピーク時間への集中度**: 集中 vs 均等分散

### 5. ローテーション機能の最適化
- **現在の実装の改善点**: 具体的な改善提案
- **同一インフルエンサーへの複数回投稿**: 実現方法
- **投稿間隔の最適化**: 最低何時間間隔が必要か

### 6. ストック更新戦略
- **更新頻度の最適化**: どのくらいの頻度で更新すべきか
- **新しいツイート取得による投稿数増加**: 可能性とコスト

### 7. 実装の優先順位
- **P0（即座に実装）**: 具体的な実装項目
- **P1（短期）**: 具体的な実装項目
- **P2（中期）**: 具体的な実装項目

### 8. リスク評価
- **スパム判定リスク**: リスクレベルと対策
- **X APIレート制限超過リスク**: リスクレベルと対策
- **コスト増加リスク**: リスクレベルと対策

### 9. 具体的な実装案
- **コード変更の提案**: 具体的なコード変更内容
- **設定値の推奨**: 環境変数の推奨値
- **実装手順**: ステップバイステップの実装手順

### 10. 結論と次のアクション
- **総合的な結論**: 最適な投稿戦略の最終結論
- **即座に実行すべき具体的なアクション**: 3-5項目

日本語で回答してください。`;

  try {
    console.log('🔄 GPT-5.2-2025-12-11に質問を送信中...\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'あなたはGPT-5.2-2025-12-11です。X APIの投稿戦略について、技術的・戦略的な観点から最適な実装案を提案してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_completion_tokens: 8000,
      temperature: 0.3,
    });

    const responseText = completion.choices[0].message.content;
    
    // 結果を保存
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(__dirname, '..', 'docs', 'reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFile = path.join(outputDir, `optimal-posting-strategy-review-${timestamp}.md`);
    const outputContent = `# 70リストへの最適な投稿戦略レビュー（GPT-5.2-2025-12-11）
**作成日時**: ${new Date().toISOString()}
**レビューAI**: GPT-5.2-2025-12-11

---

${responseText}

---

## レビュー対象ファイル

${Object.keys(files).map(filePath => `### ${filePath}
\`\`\`javascript
${files[filePath].substring(0, 5000)}...
\`\`\`
`).join('\n\n')}
`;

    fs.writeFileSync(outputFile, outputContent, 'utf-8');
    
    console.log(`\n✅ レビュー結果を保存しました: ${outputFile}`);
    console.log(`\n📊 レスポンス長: ${responseText.length} chars\n`);
    console.log('='.repeat(80));
    console.log(responseText);
    console.log('='.repeat(80));
    
    return responseText;
  } catch (error) {
    console.error('❌ GPT-5.2への質問に失敗:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw error;
  }
}

// 実行
if (require.main === module) {
  askGPTForOptimalStrategy()
    .then(() => {
      console.log('\n✅ 完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { askGPTForOptimalStrategy };
