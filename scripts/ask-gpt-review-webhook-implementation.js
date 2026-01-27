// scripts/ask-gpt-review-webhook-implementation.js
// GPT-5.2-2025-12-11によるWebhookデータ活用戦略の実装コードレビュー

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
 * GPT-5.2-2025-12-11に実装コードのレビューを依頼
 */
async function askGPTReviewImplementation() {
  console.log('🔍 GPT-5.2-2025-12-11による実装コードレビューを開始...\n');

  // 実装ファイルを読み込む
  const filesToRead = [
    'services/x/influencerPerformance.js',
    'api/x-webhook.js',
    'api/x-engagement-metrics.js',
  ];

  const fileContents = {};
  for (const file of filesToRead) {
    try {
      const filePath = path.join(__dirname, '..', file);
      fileContents[file] = fs.readFileSync(filePath, 'utf-8');
      console.log(`✅ ${file}を読み込みました`);
    } catch (error) {
      console.error(`❌ ${file}の読み込みに失敗: ${error.message}`);
      fileContents[file] = null;
    }
  }

  // GPT-5.2の実装設計を読み込む（レビュー基準として）
  const designPath = path.join(__dirname, '..', 'docs', 'reports', 'gpt-webhook-implementation-design-2026-01-27T04-41-02-996Z.md');
  let designDoc = '';
  try {
    designDoc = fs.readFileSync(designPath, 'utf-8');
    console.log(`✅ GPT-5.2実装設計を読み込みました`);
  } catch (error) {
    console.warn(`⚠️ 実装設計の読み込みに失敗: ${error.message}`);
  }

  const prompt = `あなたはX（旧Twitter）API Webhookデータ活用とエンゲージメント分析の実装コードレビューの専門家です。以下の実装コードをレビューし、設計仕様との整合性、バグ、パフォーマンス、エラーハンドリング、セキュリティ、ベストプラクティスをチェックしてください。

## GPT-5.2実装設計（レビュー基準）

${designDoc.substring(0, 5000)}

## 実装コード

### services/x/influencerPerformance.js
\`\`\`javascript
${fileContents['services/x/influencerPerformance.js'] || 'ファイル読み込み失敗'}
\`\`\`

### api/x-webhook.js（updateEngagementStats関数周辺）
\`\`\`javascript
${fileContents['api/x-webhook.js']?.substring(2500, 4000) || 'ファイル読み込み失敗'}
\`\`\`

### api/x-engagement-metrics.js（拡張部分）
\`\`\`javascript
${fileContents['api/x-engagement-metrics.js']?.substring(280, 500) || 'ファイル読み込み失敗'}
\`\`\`

## レビュー項目

1. **設計仕様との整合性**
   - GPT-5.2の設計仕様と実装が一致しているか
   - キー設計、データ構造、TTL設定が正しいか
   - 関数の役割分担が適切か

2. **バグ・エラー**
   - 潜在的なバグやエッジケースの処理不足
   - エラーハンドリングの不備
   - 型安全性の問題

3. **パフォーマンス**
   - KVアクセスの最適化
   - ループ処理の効率性
   - メモリ使用量

4. **エラーハンドリング**
   - エラー時の適切な処理
   - ログ出力の適切性
   - フォールバック動作

5. **セキュリティ**
   - 入力値の検証
   - KVキーの命名規則
   - データ漏洩リスク

6. **ベストプラクティス**
   - コードの可読性
   - コメントの適切性
   - モジュール化の適切性

7. **改善提案**
   - 具体的な改善点とその理由
   - 優先度（P0/P1/P2）付き

## 期待される回答形式

以下の形式で回答してください：

### 1. エグゼクティブサマリー（200-300字）
実装コードの総合的な評価と主要な問題点

### 2. 設計仕様との整合性チェック

#### 2.1 キー設計
- 問題点と修正案

#### 2.2 データ構造
- 問題点と修正案

#### 2.3 関数の役割分担
- 問題点と修正案

### 3. バグ・エラー

#### 3.1 潜在的なバグ
- **P0**: 即座に修正すべき致命的な問題
- **P1**: 早急に修正すべき重要な問題
- **P2**: 改善推奨の問題

#### 3.2 エッジケースの処理不足
- 問題点と修正案

### 4. パフォーマンス

#### 4.1 KVアクセス
- 問題点と最適化案

#### 4.2 ループ処理
- 問題点と最適化案

### 5. エラーハンドリング

#### 5.1 エラー処理の不備
- 問題点と修正案

#### 5.2 ログ出力
- 問題点と改善案

### 6. セキュリティ

#### 6.1 入力値検証
- 問題点と修正案

#### 6.2 データ漏洩リスク
- 問題点と対策

### 7. ベストプラクティス

#### 7.1 コードの可読性
- 改善提案

#### 7.2 コメント
- 改善提案

### 8. 優先度付き改善提案

#### P0（即座に修正）
1. **問題**: 具体的な問題点
   - **影響**: どのような影響があるか
   - **修正案**: 具体的な修正コード（可能なら）

#### P1（早急に修正）
1. **問題**: 具体的な問題点
   - **影響**: どのような影響があるか
   - **修正案**: 具体的な修正コード（可能なら）

#### P2（改善推奨）
1. **問題**: 具体的な問題点
   - **改善案**: 具体的な改善コード（可能なら）

### 9. 結論と次のアクション

- **総合評価**: 実装コードの総合的な評価
- **即座に実行すべきアクション**: 3-5項目（優先度順）

日本語で回答してください。`;

  try {
    console.log('🔄 GPT-5.2-2025-12-11にレビューを依頼中...\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'あなたはX（旧Twitter）API Webhookデータ活用とエンゲージメント分析の実装コードレビューの専門家です。設計仕様との整合性、バグ、パフォーマンス、エラーハンドリング、セキュリティ、ベストプラクティスを厳密にチェックしてください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
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

    const outputFile = path.join(outputDir, `gpt-webhook-implementation-review-${timestamp}.md`);
    const outputContent = `# Webhookデータ活用戦略の実装コードレビュー（GPT-5.2-2025-12-11）
**作成日時**: ${new Date().toISOString()}
**レビューAI**: GPT-5.2-2025-12-11
**目的**: P0項目の実装コードレビュー
**レビュー対象**:
- services/x/influencerPerformance.js
- api/x-webhook.js（拡張部分）
- api/x-engagement-metrics.js（拡張部分）

---

${responseText}

---

## API使用量

- **入力トークン**: ${usage.prompt_tokens || 0}
- **出力トークン**: ${usage.completion_tokens || 0}
- **合計トークン**: ${usage.total_tokens || 0}
`;

    fs.writeFileSync(outputFile, outputContent, 'utf-8');

    console.log(`\n✅ レビュー結果を保存しました: ${outputFile}`);
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
    console.error('❌ GPTへのレビュー依頼に失敗:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw error;
  }
}

// 実行
if (require.main === module) {
  askGPTReviewImplementation()
    .then(() => {
      console.log('\n✅ 完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { askGPTReviewImplementation };
