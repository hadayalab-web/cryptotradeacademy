// scripts/ask-gpt-webhook-implementation-design.js
// GPT-5.2-2025-12-11によるWebhookデータ活用戦略の実装設計案の取得

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

/**
 * GPT-5.2-2025-12-11にWebhookデータ活用戦略の実装設計案を聞く
 */
async function askGPTWebhookImplementationDesign() {
  console.log('🔍 GPT-5.2-2025-12-11によるWebhookデータ活用戦略の実装設計案の取得を開始...\n');

  // Webhookデータ活用戦略を読み込む
  const strategyPath = path.join(__dirname, '..', 'docs', 'reports', 'webhook-data-utilization-strategy.md');
  let strategy = '';
  try {
    strategy = fs.readFileSync(strategyPath, 'utf-8');
    console.log(`✅ Webhookデータ活用戦略を読み込みました: ${strategyPath}`);
  } catch (error) {
    console.error(`❌ Webhookデータ活用戦略の読み込みに失敗: ${error.message}`);
    process.exit(1);
  }

  // 関連ファイルを読み込む
  const filesToRead = [
    'api/x-webhook.js',
    'api/x-engagement-metrics.js',
    'services/x/influencerRotation.js',
    'services/x/postTracker.js',
    'api/x-quote-repost.js',
  ];

  const fileContents = {};
  for (const file of filesToRead) {
    try {
      const filePath = path.join(__dirname, '..', file);
      fileContents[file] = fs.readFileSync(filePath, 'utf-8');
      console.log(`✅ ${file}を読み込みました`);
    } catch (error) {
      console.warn(`⚠️ ${file}の読み込みに失敗: ${error.message}`);
      fileContents[file] = null;
    }
  }

  const prompt = `あなたはX（旧Twitter）API Webhookデータ活用とエンゲージメント分析の実装設計の専門家です。以下のWebhookデータ活用戦略を基に、実装可能で実践的な設計案を提案してください。

## Webhookデータ活用戦略

${strategy}

## 現在の実装状況

### api/x-webhook.js
\`\`\`javascript
${fileContents['api/x-webhook.js']?.substring(0, 8000) || 'ファイル読み込み失敗'}
\`\`\`

### api/x-engagement-metrics.js
\`\`\`javascript
${fileContents['api/x-engagement-metrics.js']?.substring(0, 8000) || 'ファイル読み込み失敗'}
\`\`\`

### services/x/influencerRotation.js
\`\`\`javascript
${fileContents['services/x/influencerRotation.js']?.substring(0, 5000) || 'ファイル読み込み失敗'}
\`\`\`

### services/x/postTracker.js
\`\`\`javascript
${fileContents['services/x/postTracker.js']?.substring(0, 5000) || 'ファイル読み込み失敗'}
\`\`\`

### api/x-quote-repost.js（インフルエンサーマッピング部分）
\`\`\`javascript
${fileContents['api/x-quote-repost.js']?.substring(1000, 1050) || 'ファイル読み込み失敗'}
\`\`\`

## 実装設計の質問事項

### P0項目（即座に実装）

1. **インフルエンサー別エンゲージメント率の計算**
   - WebhookデータからインフルエンサーIDを取得する方法（\`x:post:influencer:{tweetId}\`マッピングの活用）
   - エンゲージメント率の計算式（いいね、リツイート、リプライの合計 / インプレッション数）
   - KVへの保存形式とキー設計（\`x:influencer:performance:{influencerUsername}:{lang}\`など）
   - 日次/週次/月次の集計方法
   - エラーハンドリングとデータ整合性の保証

2. **日次エンゲージメントレポートの拡張**
   - \`api/x-engagement-metrics.js\`の\`generateEngagementDashboard\`関数の拡張
   - インフルエンサー別パフォーマンスの追加（上位20%の特定、平均エンゲージメント率など）
   - 投稿タイミング別のエンゲージメント率の追加（UTC時間別の集計）
   - レポートデータ構造の設計（後方互換性を保つ）
   - KVへの保存形式とTTL設定

### P1項目（1週間以内）

3. **高パフォーマンスインフルエンサーの優先投稿**
   - エンゲージメント率>2%のインフルエンサーを優先するロジック
   - \`services/x/influencerRotation.js\`の\`selectInfluencersWithRotation\`関数への統合
   - 投稿頻度の動的調整（高パフォーマンス: 1日2回、低パフォーマンス: 1日1回）
   - 8時間クールダウンとの整合性

4. **投稿タイミング最適化**
   - 高エンゲージメントタイミングの特定方法
   - Cronスケジュールの動的調整（\`vercel.json\`の更新方法）
   - タイミング分析データの保存形式

## 期待される回答形式

以下の形式で回答してください：

### 1. エグゼクティブサマリー（200-300字）
実装設計の総合的な結論

### 2. P0-1: インフルエンサー別エンゲージメント率の計算

#### 2.1 データ取得と計算ロジック
- **WebhookデータからのインフルエンサーID取得**: 具体的な実装コード
- **エンゲージメント率の計算式**: 計算ロジックとエッジケースの処理
- **インプレッション数の取得**: X APIからの取得方法（\`api/x-engagement-metrics.js\`の\`getTweetMetrics\`との統合）

#### 2.2 KV保存設計
- **キー設計**: キー形式、命名規則、TTL設定
- **データ構造**: 保存するデータの構造（JSON形式）
- **更新頻度**: リアルタイム更新 vs バッチ更新

#### 2.3 実装コード
- **新規関数の追加**: \`services/x/influencerPerformance.js\`（新規作成）の完全な実装コード
- **既存コードの拡張**: \`api/x-webhook.js\`の\`updateEngagementStats\`関数の拡張コード
- **エラーハンドリング**: エラー時の挙動とログ出力

#### 2.4 テスト方法
- **ユニットテスト**: テストコードの例
- **統合テスト**: Webhookイベントからエンゲージメント率計算までの統合テスト

### 3. P0-2: 日次エンゲージメントレポートの拡張

#### 3.1 レポートデータ構造の設計
- **拡張後のデータ構造**: 現在の構造に追加するフィールド
- **後方互換性**: 既存のレポート利用者への影響

#### 3.2 実装コード
- **\`generateEngagementDashboard\`関数の拡張**: 具体的なコード変更（diff形式推奨）
- **インフルエンサー別パフォーマンスの集計**: 集計ロジックの実装コード
- **投稿タイミング別のエンゲージメント率**: UTC時間別の集計ロジック

#### 3.3 KV保存設計
- **保存キー**: レポートの保存キー形式
- **TTL設定**: データ保持期間

#### 3.4 テスト方法
- **ユニットテスト**: テストコードの例
- **統合テスト**: 日次レポート生成の統合テスト

### 4. P1-1: 高パフォーマンスインフルエンサーの優先投稿

#### 4.1 実装設計
- **エンゲージメント率による優先順位付け**: 具体的なロジック
- **\`selectInfluencersWithRotation\`関数への統合**: 統合コード（diff形式推奨）
- **投稿頻度の動的調整**: 1日2回 vs 1日1回の判定ロジック

#### 4.2 エラーハンドリング
- **エンゲージメント率データが取得できない場合**: フォールバック動作
- **データ不整合時の処理**: エラーハンドリング

### 5. P1-2: 投稿タイミング最適化

#### 5.1 タイミング分析の実装
- **高エンゲージメントタイミングの特定**: 分析ロジック
- **データ保存形式**: タイミング分析データの構造

#### 5.2 Cronスケジュールの動的調整
- **\`vercel.json\`の更新方法**: 手動更新 vs 自動更新
- **スケジュール変更の検証**: 変更後の動作確認方法

### 6. 実装順序とテスト戦略

#### 6.1 実装順序
- **フェーズ1**: P0-1（インフルエンサー別エンゲージメント率の計算）
- **フェーズ2**: P0-2（日次エンゲージメントレポートの拡張）
- **フェーズ3**: P1-1（高パフォーマンスインフルエンサーの優先投稿）
- **フェーズ4**: P1-2（投稿タイミング最適化）
- **各フェーズの依存関係**: フェーズ間の依存関係

#### 6.2 テスト戦略
- **ユニットテスト**: 各関数のテスト
- **統合テスト**: Webhookイベントからレポート生成までの統合テスト
- **ロールバック戦略**: 問題発生時のロールバック方法

### 7. パフォーマンスとスケーラビリティ

#### 7.1 KVアクセスの最適化
- **バッチ処理**: 複数KVアクセスの最適化
- **キャッシュ**: エンゲージメント率データのキャッシュ戦略
- **エラー処理**: KVエラー時の挙動

#### 7.2 データ整合性
- **同時更新の処理**: 複数のWebhookイベントが同時に来た場合の処理
- **データ不整合の検出**: 不整合データの検出と修正方法

### 8. リスク評価と対策

#### 8.1 実装リスク
- **リスク**: 各実装のリスク
- **対策**: リスク軽減策

#### 8.2 運用リスク
- **リスク**: 運用時のリスク（データ量増加、KV容量など）
- **対策**: リスク軽減策

### 9. 結論と次のアクション

- **総合的な結論**: 実装設計の最終結論
- **即座に実行すべき具体的なアクション**: 3-5項目

日本語で回答してください。`;

  try {
    console.log('🔄 GPT-5.2-2025-12-11に質問を送信中...\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'あなたはX（旧Twitter）API Webhookデータ活用とエンゲージメント分析の実装設計の専門家です。実装可能で実践的な設計案を提案してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_completion_tokens: 12000,
    });

    const responseText = completion.choices[0].message.content;
    const usage = completion.usage || {};

    // 結果を保存
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(__dirname, '..', 'docs', 'reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.join(outputDir, `gpt-webhook-implementation-design-${timestamp}.md`);
    const outputContent = `# Webhookデータ活用戦略の実装設計案（GPT-5.2-2025-12-11解析）
**作成日時**: ${new Date().toISOString()}
**解析AI**: GPT-5.2-2025-12-11
**目的**: Webhookデータ活用戦略のP0/P1項目の実装設計
**ベース**: webhook-data-utilization-strategy.md

---

${responseText}

---

## API使用量

- **入力トークン**: ${usage.prompt_tokens || 0}
- **出力トークン**: ${usage.completion_tokens || 0}
- **合計トークン**: ${usage.total_tokens || 0}
`;

    fs.writeFileSync(outputFile, outputContent, 'utf-8');

    console.log(`\n✅ 実装設計案を保存しました: ${outputFile}`);
    console.log(`\n📊 レスポンス長: ${responseText.length} chars`);
    console.log(`📈 API使用量:`);
    console.log(`  - 入力トークン: ${usage.prompt_tokens || 0}`);
    console.log(`  - 出力トークン: ${usage.completion_tokens || 0}`);
    console.log(`  - 合計トークン: ${usage.total_tokens || 0}`);
    console.log('\n' + '='.repeat(80));
    console.log(responseText);
    console.log('='.repeat(80));

    return responseText;
  } catch (error) {
    console.error('❌ GPTへの質問に失敗:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw error;
  }
}

// 実行
if (require.main === module) {
  askGPTWebhookImplementationDesign()
    .then(() => {
      console.log('\n✅ 完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { askGPTWebhookImplementationDesign };
