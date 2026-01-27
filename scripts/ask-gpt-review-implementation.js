// scripts/ask-gpt-review-implementation.js
// GPT-5.2-2025-12-11による実装コードのレビュー

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
  console.log('🔍 GPT-5.2-2025-12-11による実装コードのレビューを開始...\n');

  // 実装したファイルを読み込む
  const filesToRead = [
    'services/x/influencerRotation.js',
    'api/x-quote-repost.js',
    'utils/scheduler.js',
    'api/vsl1-post.js',
    'api/x-post-minimal-version-cron.js',
    'api/x-post-minimal-version.js',
    'api/x-post-free-report.js',
    'vercel.json',
  ];

  const fileContents = {};
  for (const file of filesToRead) {
    try {
      const filePath = path.join(__dirname, '..', file);
      const content = fs.readFileSync(filePath, 'utf-8');
      // ファイルが大きい場合は一部のみ（最初の3000行）
      fileContents[file] = content.split('\n').slice(0, 3000).join('\n');
      console.log(`✅ ${file}を読み込みました (${content.split('\n').length}行)`);
    } catch (error) {
      console.warn(`⚠️ ${file}の読み込みに失敗: ${error.message}`);
      fileContents[file] = null;
    }
  }

  const prompt = `あなたはX（旧Twitter）の投稿戦略とスケジューリングの実装コードレビューの専門家です。以下の実装コードをレビューし、問題点、改善点、潜在的なバグを指摘してください。

## 実装したファイル

### 1. services/x/influencerRotation.js
8時間クールダウン機能を追加しました。
\`\`\`javascript
${fileContents['services/x/influencerRotation.js']?.substring(0, 4000) || 'ファイル読み込み失敗'}
\`\`\`

### 2. api/x-quote-repost.js
8時間クールダウンチェックを統合しました。
\`\`\`javascript
${fileContents['api/x-quote-repost.js']?.substring(0, 4000) || 'ファイル読み込み失敗'}
\`\`\`

### 3. utils/scheduler.js
ジッターと言語間ウェイトの共通ユーティリティを作成しました。
\`\`\`javascript
${fileContents['utils/scheduler.js'] || 'ファイル読み込み失敗'}
\`\`\`

### 4. api/vsl1-post.js
ジッターと言語間ウェイトを追加しました。
\`\`\`javascript
${fileContents['api/vsl1-post.js']?.substring(0, 3000) || 'ファイル読み込み失敗'}
\`\`\`

### 5. api/x-post-minimal-version-cron.js
ジッターを追加しました。
\`\`\`javascript
${fileContents['api/x-post-minimal-version-cron.js'] || 'ファイル読み込み失敗'}
\`\`\`

### 6. api/x-post-minimal-version.js
言語間ウェイトを追加しました。
\`\`\`javascript
${fileContents['api/x-post-minimal-version.js']?.substring(0, 3000) || 'ファイル読み込み失敗'}
\`\`\`

### 7. api/x-post-free-report.js
ジッターと言語間ウェイトを追加しました。
\`\`\`javascript
${fileContents['api/x-post-free-report.js']?.substring(0, 3000) || 'ファイル読み込み失敗'}
\`\`\`

### 8. vercel.json
Cronスケジュールを最適化案に更新しました。
\`\`\`json
${fileContents['vercel.json'] || 'ファイル読み込み失敗'}
\`\`\`

## レビュー依頼事項

1. **8時間クールダウンの実装**
   - \`getLastPostedAt\`、\`markLastPostedAt\`、\`isInCooldown\`の実装に問題はないか？
   - KVキー設計、エラーハンドリング、タイムゾーン処理は適切か？
   - \`api/x-quote-repost.js\`への統合は正しいか？

2. **ジッターと言語間ウェイトの実装**
   - \`utils/scheduler.js\`の実装は適切か？
   - 各投稿スクリプトへの統合は正しいか？
   - maxDuration制約（60秒）を考慮した実装になっているか？

3. **Cronスケジュールの変更**
   - \`vercel.json\`の変更は最適化案と一致しているか？
   - 既存のスケジュールとの互換性は保たれているか？

4. **潜在的なバグや問題点**
   - エラーハンドリングに不足はないか？
   - タイムアウトやレート制限のリスクはないか？
   - 並行実行時の競合リスクはないか？

5. **パフォーマンスとスケーラビリティ**
   - KVアクセスの最適化は十分か？
   - メモリリークやリソースリークのリスクはないか？

## 期待される回答形式

以下の形式で回答してください：

### 1. エグゼクティブサマリー（200-300字）
レビューの総合的な結論

### 2. 重大な問題（P0）
- バグ、セキュリティリスク、データ損失リスクなど
- 各問題について、具体的なコード箇所と修正案を提示

### 3. 改善推奨（P1）
- パフォーマンス、可読性、保守性の改善
- 各改善について、具体的なコード箇所と修正案を提示

### 4. 軽微な改善（P2）
- コメント、命名規則、コードスタイルなど

### 5. 実装の良い点
- 適切に実装されている箇所を評価

### 6. 結論と次のアクション
- 総合的な評価
- 即座に修正すべき項目（3-5項目）

日本語で回答してください。`;

  try {
    console.log('🔄 GPT-5.2-2025-12-11にレビュー依頼を送信中...\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'あなたはX（旧Twitter）の投稿戦略とスケジューリングの実装コードレビューの専門家です。実装コードを詳細にレビューし、問題点、改善点、潜在的なバグを指摘してください。',
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

    const outputFile = path.join(outputDir, `gpt-implementation-review-${timestamp}.md`);
    const outputContent = `# 実装コードレビュー（GPT-5.2-2025-12-11）
**作成日時**: ${new Date().toISOString()}
**レビューAI**: GPT-5.2-2025-12-11
**目的**: X投稿戦略の最適化実装コードのレビュー

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
