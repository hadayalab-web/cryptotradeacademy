// scripts/ask-gpt-review-grok-gemini-integration.js
// GPTにGrok×Gemini最適化統合の実装レビューを依頼

require('dotenv').config({ path: '.env' });
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

async function reviewImplementation() {
  console.log('🔍 GPTにGrok×Gemini最適化統合の実装レビューを依頼中...\n');

  // 関連ファイルを読み込む
  const contentOptimizerCode = fs.readFileSync(
    path.join(__dirname, '../services/x/contentOptimizer.js'),
    'utf-8'
  );
  
  // generateQuoteRepostText関数の部分を抽出
  const grokClientCode = fs.readFileSync(
    path.join(__dirname, '../services/grok/client.js'),
    'utf-8'
  );
  const generateQuoteRepostTextStart = grokClientCode.indexOf('async function generateQuoteRepostText');
  const generateQuoteRepostTextEnd = grokClientCode.indexOf('module.exports', generateQuoteRepostTextStart);
  const generateQuoteRepostTextCode = grokClientCode.substring(
    generateQuoteRepostTextStart,
    generateQuoteRepostTextEnd !== -1 ? generateQuoteRepostTextEnd : grokClientCode.length
  );
  
  // optimizeContentAndFunnel呼び出し部分を抽出
  const quoteRepostCode = fs.readFileSync(
    path.join(__dirname, '../api/x-quote-repost.js'),
    'utf-8'
  );
  const optimizeCallStart = quoteRepostCode.indexOf('// CRITICAL: GrokのXアルゴリズムハッキング');
  const optimizeCallEnd = quoteRepostCode.indexOf('return quoteText;', optimizeCallStart);
  const optimizeCallCode = quoteRepostCode.substring(
    optimizeCallStart,
    optimizeCallEnd !== -1 ? optimizeCallEnd + 20 : quoteRepostCode.length
  );

  const prompt = `あなたは経験豊富なソフトウェアエンジニアです。GrokのXアルゴリズム分析とGeminiの心理分析を統合して、X（Twitter）投稿のコンテンツとファネルを最適化する実装をレビューしてください。

## 実装の目的
- Grok（grok-4-1-fast-reasoning）でXアルゴリズム分析を実行
- Gemini（gemini-3.1-pro-preview）で心理分析を実行
- 両者の分析結果を統合して最適化戦略を生成
- 生成された最適化戦略を投稿生成プロンプトに反映

## 実装ファイル

### 1. services/x/contentOptimizer.js
\`\`\`javascript
${contentOptimizerCode.substring(0, 8000)}
\`\`\`

### 2. services/grok/client.js（generateQuoteRepostText関数）
\`\`\`javascript
${generateQuoteRepostTextCode.substring(0, 4000)}
\`\`\`

### 3. api/x-quote-repost.js（optimizeContentAndFunnel呼び出し部分）
\`\`\`javascript
${optimizeCallCode}
\`\`\`

## レビュー依頼事項

1. **実装の正確性**
   - optimizeContentAndFunnel関数の実装は正しいか？
   - GrokとGeminiのAPI呼び出しは適切か？
   - エラーハンドリングは適切か？
   - 統合ロジックは正しいか？

2. **統合の完全性**
   - api/x-quote-repost.jsでoptimizeContentAndFunnelが正しく呼び出されているか？
   - 生成された最適化戦略がservices/grok/client.jsのgenerateQuoteRepostTextに正しく渡されているか？
   - プロンプトに最適化戦略が正しく反映されているか？

3. **エラーハンドリング**
   - APIキーが設定されていない場合の処理は適切か？
   - API呼び出しが失敗した場合の処理は適切か？
   - フォールバック処理は適切か？

4. **パフォーマンス**
   - 各投稿生成時にGrokとGeminiの両方を呼び出すのは適切か？
   - キャッシュ戦略は必要か？
   - レート制限対策は必要か？

5. **コード品質**
   - コードの可読性は良いか？
   - コメントは適切か？
   - 命名規則は適切か？

6. **潜在的な問題**
   - 実装に潜在的なバグはないか？
   - 改善すべき点はないか？
   - セキュリティ上の懸念はないか？

7. **具体的な改善提案**
   - 実装を改善するための具体的な提案
   - コードの修正が必要な箇所
   - 追加すべき機能やチェック

以下の形式でレビュー結果を出力してください：

## レビュー結果

### 1. 実装の正確性
[評価とコメント]

### 2. 統合の完全性
[評価とコメント]

### 3. エラーハンドリング
[評価とコメント]

### 4. パフォーマンス
[評価とコメント]

### 5. コード品質
[評価とコメント]

### 6. 潜在的な問題
[発見された問題とその影響]

### 7. 具体的な改善提案
[改善提案と修正コード例]

### 総合評価
[総合的な評価と推奨事項]`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'あなたは経験豊富なソフトウェアエンジニアです。コードレビューを丁寧に行い、実装の正確性、統合の完全性、エラーハンドリング、パフォーマンス、コード品質を評価してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: 4000,
      temperature: 0.3,
    });

    const review = completion?.choices?.[0]?.message?.content?.trim();
    
    if (!review) {
      throw new Error('GPT review failed: empty response');
    }

    // レビュー結果をファイルに保存
    const outputDir = path.join(__dirname, '../docs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const outputFile = path.join(outputDir, `GPT_REVIEW_GROK_GEMINI_INTEGRATION_${timestamp}.md`);
    fs.writeFileSync(outputFile, review, 'utf-8');
    
    console.log('✅ GPTレビュー完了');
    console.log(`📄 レビュー結果を保存: ${outputFile}\n`);
    console.log('='.repeat(80));
    console.log(review);
    console.log('='.repeat(80));

    return review;
  } catch (error) {
    console.error('❌ GPTレビューエラー:', error.message);
    console.error(error.stack);
    throw error;
  }
}

// スクリプト実行
if (require.main === module) {
  reviewImplementation()
    .then(() => {
      console.log('\n✅ スクリプト実行完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ スクリプト実行エラー:', error);
      console.error(error.stack);
      process.exit(1);
    });
}

module.exports = { reviewImplementation };
