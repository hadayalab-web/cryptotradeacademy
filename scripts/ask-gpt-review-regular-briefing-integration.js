// scripts/ask-gpt-review-regular-briefing-integration.js
// GPTにRegular Briefingの統合実装をレビューしてもらう

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
 * GPTにRegular Briefingの統合実装をレビューしてもらう
 */
async function reviewRegularBriefingIntegration() {
  // 実装したファイルを読み込む
  const integratedOptimizerPath = path.join(__dirname, '../services/integrated/grokGeminiOptimizer.js');
  const regularJaPath = path.join(__dirname, '../services/telegram/messages/user/ja/regular.ja.js');
  const regularEnPath = path.join(__dirname, '../services/telegram/messages/user/en/regular.en.js');
  const cronPath = path.join(__dirname, '../api/cron.js');

  const integratedOptimizerCode = fs.readFileSync(integratedOptimizerPath, 'utf-8');
  const regularJaCode = fs.readFileSync(regularJaPath, 'utf-8');
  const regularEnCode = fs.readFileSync(regularEnPath, 'utf-8');
  
  // cron.jsの関連部分のみを抽出（統合関数呼び出し部分）
  const cronCode = fs.readFileSync(cronPath, 'utf-8');
  const cronIntegrationMatch = cronCode.match(/\/\/ GrokとGeminiの統合最適化[\s\S]*?integratedOptimization = null;/);
  const cronIntegrationCode = cronIntegrationMatch ? cronIntegrationMatch[0] : 'Not found';

  const prompt = `あなたはコードレビューの専門家です。Regular Briefing（有料版）のデザイン修正実装をレビューしてください。

## 実装内容

### 1. 統合関数（services/integrated/grokGeminiOptimizer.js）
\`\`\`javascript
${integratedOptimizerCode}
\`\`\`

### 2. 日本語版Regular Briefing（services/telegram/messages/user/ja/regular.ja.js）
統合最適化結果を表示する部分:
\`\`\`javascript
${regularJaCode.match(/\/\/ ===== GrokとGeminiの統合最適化結果を表示[\s\S]*?lines\.push\(''\);[\s\S]*?lines\.push\(''\);/)?.[0] || 'Not found'}
\`\`\`

### 3. 英語版Regular Briefing（services/telegram/messages/user/en/regular.en.js）
統合最適化結果を表示する部分:
\`\`\`javascript
${regularEnCode.match(/\/\/ ===== GrokとGeminiの統合最適化結果を表示[\s\S]*?lines\.push\(''\);/)?.[0] || 'Not found'}
\`\`\`

### 4. API統合（api/cron.js）
統合関数呼び出し部分:
\`\`\`javascript
${cronIntegrationCode}
\`\`\`

## レビュー依頼事項

以下の観点からレビューをお願いします：

1. **実装の正確性**
   - 統合関数が正しくGrokとGeminiの解析結果を統合しているか
   - Regular Briefingのデザインに正しく統合されているか
   - エラーハンドリングが適切か

2. **統合の完全性**
   - GrokのXアルゴリズム解析とGeminiの深層心理解析が適切に統合されているか
   - フォールバック処理が適切か

3. **ネイティブな表現**
   - 日本語版のテキストが自然な日本語になっているか
   - 英語版のテキストが自然な英語になっているか
   - 専門用語の使い方が適切か

4. **デザインの一貫性**
   - 統合最適化結果の表示が既存のデザインと一貫しているか
   - ユーザー体験が向上しているか

5. **潜在的な問題**
   - バグやエラーの可能性
   - パフォーマンスの問題
   - セキュリティの問題

6. **改善提案**
   - より良い実装方法
   - コードの品質向上
   - ユーザー体験の向上

日本語で回答してください。`;

  try {
    console.log('🔄 GPTにRegular Briefing統合実装のレビューを依頼中...');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'You are an expert code reviewer specializing in JavaScript/Node.js applications, particularly for financial/crypto trading platforms. Review the code thoroughly and provide detailed feedback in Japanese.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: 4000,
      temperature: 0.3,
    });

    const reviewText = completion.choices[0].message.content;
    
    // レビュー結果をファイルに保存
    const outputPath = path.join(__dirname, '../docs/GPT_REVIEW_REGULAR_BRIEFING_INTEGRATION_2026-01-26.md');
    const outputContent = `# GPTレビュー: Regular Briefing統合実装（2026-01-26）

## レビュー結果

${reviewText}

---

## レビュー対象ファイル

- \`services/integrated/grokGeminiOptimizer.js\`
- \`services/telegram/messages/user/ja/regular.ja.js\`
- \`services/telegram/messages/user/en/regular.en.js\`
- \`api/cron.js\`

## レビュー日時

${new Date().toISOString()}
`;

    fs.writeFileSync(outputPath, outputContent, 'utf-8');
    
    console.log('✅ GPTレビュー完了');
    console.log(`📄 レビュー結果を保存しました: ${outputPath}`);
    console.log('\n--- レビュー結果 ---\n');
    console.log(reviewText);
    
    return reviewText;
  } catch (error) {
    console.error('❌ GPTレビューエラー:', error.message);
    throw error;
  }
}

// 実行
if (require.main === module) {
  reviewRegularBriefingIntegration()
    .then(() => {
      console.log('\n✅ レビュー完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { reviewRegularBriefingIntegration };
