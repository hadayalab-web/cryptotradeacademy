// scripts/ask-gpt-implementation-design.js
// GPT-5.2-2025-12-11による実装設計案の取得

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
 * GPT-5.2-2025-12-11に実装設計案を聞く
 */
async function askGPTImplementationDesign() {
  console.log('🔍 GPT-5.2-2025-12-11による実装設計案の取得を開始...\n');

  // 最適化案を読み込む
  const optimizationPlanPath = path.join(__dirname, '..', 'docs', 'reports', 'final-optimization-plan.md');
  let optimizationPlan = '';
  try {
    optimizationPlan = fs.readFileSync(optimizationPlanPath, 'utf-8');
    console.log(`✅ 最適化案を読み込みました: ${optimizationPlanPath}`);
  } catch (error) {
    console.error(`❌ 最適化案の読み込みに失敗: ${error.message}`);
    process.exit(1);
  }

  // 関連ファイルを読み込む
  const filesToRead = [
    'api/x-quote-repost.js',
    'services/x/influencerRotation.js',
    'vercel.json',
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

  const prompt = `あなたはX（旧Twitter）の投稿戦略とスケジューリングの実装設計の専門家です。以下の最適化案を基に、実装可能で実践的な設計案を提案してください。

## 最適化案

${optimizationPlan}

## 現在の実装状況

### api/x-quote-repost.js
\`\`\`javascript
${fileContents['api/x-quote-repost.js']?.substring(0, 5000) || 'ファイル読み込み失敗'}
\`\`\`

### services/x/influencerRotation.js
\`\`\`javascript
${fileContents['services/x/influencerRotation.js'] || 'ファイル読み込み失敗'}
\`\`\`

### vercel.json
\`\`\`json
${fileContents['vercel.json'] || 'ファイル読み込み失敗'}
\`\`\`

## 実装設計の質問事項

1. **8時間クールダウンの実装設計**
   - \`services/x/influencerRotation.js\`に\`getLastPostedAt\`、\`markLastPostedAt\`、\`isInCooldown\`関数を追加する具体的な実装コード
   - \`api/x-quote-repost.js\`に8時間クールダウンチェックを統合する具体的な実装コード
   - KVキー設計、エラーハンドリング、タイムゾーン処理の詳細

2. **Cronスケジュールの変更**
   - \`vercel.json\`の具体的な変更内容
   - 既存のスケジュールとの互換性

3. **ジッター（揺らぎ）の実装設計**
   - 各投稿スクリプト（\`api/vsl1-post.js\`、\`api/x-post-minimal-version-cron.js\`、\`api/x-post-free-report.js\`）への実装方法
   - エラーハンドリングとタイムアウト処理

4. **言語間ウェイトの実装設計**
   - 6言語投稿時のループ処理への実装方法
   - エラーハンドリングとタイムアウト処理

5. **実装順序とテスト戦略**
   - P0項目の実装順序
   - 各実装のテスト方法
   - ロールバック戦略

6. **パフォーマンスとスケーラビリティ**
   - KVアクセスの最適化
   - 並行処理の考慮
   - レート制限の管理

## 期待される回答形式

以下の形式で回答してください：

### 1. エグゼクティブサマリー（200-300字）
実装設計の総合的な結論

### 2. 8時間クールダウンの実装設計

#### 2.1 services/x/influencerRotation.jsへの追加
- **実装コード**: 完全な関数実装（コメント付き）
- **KVキー設計**: キー形式、TTL、命名規則
- **エラーハンドリング**: エラー時の挙動
- **テスト方法**: ユニットテストの例

#### 2.2 api/x-quote-repost.jsへの統合
- **統合ポイント**: どの関数のどの位置に追加するか
- **実装コード**: 具体的なコード変更（diff形式推奨）
- **エラーハンドリング**: エラー時の挙動
- **テスト方法**: 統合テストの例

### 3. Cronスケジュールの変更

#### 3.1 vercel.jsonの変更内容
- **変更前後の比較**: diff形式
- **変更理由**: 各変更の根拠
- **互換性**: 既存スケジュールとの互換性

### 4. ジッター（揺らぎ）の実装設計

#### 4.1 実装方法
- **実装コード**: 各スクリプトへの追加コード（コメント付き）
- **エラーハンドリング**: エラー時の挙動
- **タイムアウト処理**: タイムアウト時の挙動

#### 4.2 テスト方法
- **ユニットテスト**: テストコードの例
- **統合テスト**: 統合テストの例

### 5. 言語間ウェイトの実装設計

#### 5.1 実装方法
- **実装コード**: 各スクリプトへの追加コード（コメント付き）
- **エラーハンドリング**: エラー時の挙動
- **タイムアウト処理**: タイムアウト時の挙動

#### 5.2 テスト方法
- **ユニットテスト**: テストコードの例
- **統合テスト**: 統合テストの例

### 6. 実装順序とテスト戦略

#### 6.1 実装順序
- **フェーズ1**: 8時間クールダウンの実装
- **フェーズ2**: Cronスケジュールの変更
- **フェーズ3**: ジッターと言語間ウェイトの追加
- **各フェーズの依存関係**: フェーズ間の依存関係

#### 6.2 テスト戦略
- **ユニットテスト**: 各関数のテスト
- **統合テスト**: エンドツーエンドのテスト
- **ロールバック戦略**: 問題発生時のロールバック方法

### 7. パフォーマンスとスケーラビリティ

#### 7.1 KVアクセスの最適化
- **バッチ処理**: 複数KVアクセスの最適化
- **キャッシュ**: キャッシュ戦略
- **エラー処理**: KVエラー時の挙動

#### 7.2 並行処理の考慮
- **同時実行**: 複数言語の同時処理
- **レート制限**: X APIレート制限の管理
- **タイムアウト**: タイムアウト処理

### 8. リスク評価と対策

#### 8.1 実装リスク
- **リスク**: 各実装のリスク
- **対策**: リスク軽減策

#### 8.2 運用リスク
- **リスク**: 運用時のリスク
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
          content: 'あなたはX（旧Twitter）の投稿戦略とスケジューリングの実装設計の専門家です。実装可能で実践的な設計案を提案してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_completion_tokens: 8000,
    });

    const responseText = completion.choices[0].message.content;
    const usage = completion.usage || {};

    // 結果を保存
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(__dirname, '..', 'docs', 'reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.join(outputDir, `gpt-implementation-design-${timestamp}.md`);
    const outputContent = `# 実装設計案（GPT-5.2-2025-12-11解析）
**作成日時**: ${new Date().toISOString()}
**解析AI**: GPT-5.2-2025-12-11
**目的**: X投稿戦略の最適化案に基づく実装設計
**ベース**: final-optimization-plan.md

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
  askGPTImplementationDesign()
    .then(() => {
      console.log('\n✅ 完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { askGPTImplementationDesign };
