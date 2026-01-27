// scripts/ask-gpt-review-jitter-implementation.js
// GPT-5.2-2025-12-11によるジッター実装のコードレビュー

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
 * GPT-5.2-2025-12-11にジッター実装のレビューを依頼
 */
async function askGPTReviewJitterImplementation() {
  console.log('🔍 GPT-5.2-2025-12-11によるジッター実装のコードレビューを開始...\n');

  // 実装ファイルを読み込む
  const filesToRead = [
    'utils/scheduler.js',
    'api/x-quote-repost.js',
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

  // 関連ドキュメントを読み込む
  const relatedDocs = {
    'gemini-posting-schedule': path.join(__dirname, '..', 'docs', 'reports', 'gemini-posting-schedule-2026-01-27T03-59-01-377Z.md'),
    'gpt-implementation-design': path.join(__dirname, '..', 'docs', 'reports', 'gpt-implementation-design-2026-01-27T04-09-34-950Z.md'),
    'gpt-implementation-review': path.join(__dirname, '..', 'docs', 'reports', 'gpt-implementation-review-2026-01-27T04-15-55-719Z.md'),
  };

  const docContents = {};
  for (const [key, docPath] of Object.entries(relatedDocs)) {
    try {
      docContents[key] = fs.readFileSync(docPath, 'utf-8');
      console.log(`✅ ${key}を読み込みました`);
    } catch (error) {
      console.warn(`⚠️ ${key}の読み込みに失敗: ${error.message}`);
      docContents[key] = '';
    }
  }

  // x-quote-repost.jsの変更箇所を抽出
  const quoteRepostContent = fileContents['api/x-quote-repost.js'] || '';
  const importLine = quoteRepostContent.match(/\/\/ ジッター.*\nconst \{ applyJitter, applyLanguageWait \} = require\([^)]+\);/) || [''];
  const functionSignature = quoteRepostContent.match(/async function postQuoteRepostsForLang\([^)]+\)/)?.[0] || '';
  
  // 変更箇所を抽出（行番号ベースではなく、コードパターンベース）
  const jitterUsage1 = quoteRepostContent.match(/\/\/ レート制限対策.*?await applyJitter\(\{[^}]+\}\);/s)?.[0] || '';
  const jitterUsage2 = quoteRepostContent.match(/\/\/ P0 FIX: レート制限対策.*?await applyJitter\(\{[^}]+\}\);/s)?.[0] || '';
  const languageWaitUsage = quoteRepostContent.match(/\/\/ 言語間の待機時間.*?await applyLanguageWait\(\{[^}]+\}\);/s)?.[0] || '';

  const prompt = `あなたはX（旧Twitter）API投稿戦略の実装コードレビューの専門家です。以下のジッター（ランダム遅延）実装をレビューし、設計仕様との整合性、バグ、パフォーマンス、エラーハンドリング、maxDuration制約への対応をチェックしてください。

## 背景

### 当初の構想（Gemini推奨）
- **推奨値**: 1-15分のランダム遅延（機械的な投稿タイミングを排除）
- **目的**: スパム判定リスクを低減

### GPTの実装設計・レビュー
- **設計**: \`utils/scheduler.js\`に\`applyJitter\`関数を作成（デフォルト1-15分）
- **レビュー指摘**: Vercel Functionsの\`maxDuration=60秒\`の制約により、1-15分のジッターは実現不可能
- **修正**: デフォルトを3-10秒に短縮、\`deadlineMs\`パラメータを追加

### 実装漏れの修正
- **問題**: \`api/x-quote-repost.js\`でジッターが未実装だった
- **対応**: 固定待機時間を\`applyJitter\`/\`applyLanguageWait\`に置き換え

## 関連ドキュメント

### Gemini推奨スケジュール
${docContents['gemini-posting-schedule']?.substring(0, 2000) || '未読み込み'}

### GPT実装設計
${docContents['gpt-implementation-design']?.substring(0, 3000) || '未読み込み'}

### GPTレビュー
${docContents['gpt-implementation-review']?.substring(0, 2000) || '未読み込み'}

## 実装コード

### utils/scheduler.js（全体）
\`\`\`javascript
${fileContents['utils/scheduler.js'] || 'ファイル読み込み失敗'}
\`\`\`

### api/x-quote-repost.js（変更箇所）

#### インポート追加
\`\`\`javascript
${importLine[0] || '未検出'}
\`\`\`

#### 関数シグネチャ変更
\`\`\`javascript
${functionSignature}
\`\`\`

#### 変更箇所1: 投稿後の待機（1297行目付近）
\`\`\`javascript
${jitterUsage1.substring(0, 500) || '未検出'}
\`\`\`

#### 変更箇所2: 同一言語内の待機（1793行目付近）
\`\`\`javascript
${jitterUsage2.substring(0, 500) || '未検出'}
\`\`\`

#### 変更箇所3: 言語間の待機（1822行目付近）
\`\`\`javascript
${languageWaitUsage.substring(0, 500) || '未検出'}
\`\`\`

## レビュー項目

### P0（致命的な問題）
1. **deadlineMsの渡し方**: \`postQuoteRepostsForLang\`関数内で\`deadlineMs\`が正しく使用されているか？
   - \`postQuoteRepostsForLang\`関数のシグネチャに\`deadlineMs\`が追加されているか？
   - 呼び出し元で\`deadlineMs\`が正しく渡されているか？
   - \`applyJitter\`/\`applyLanguageWait\`に\`deadlineMs\`が正しく渡されているか？

2. **タイムアウト処理**: maxDuration=60秒の制約を考慮した実装になっているか？
   - \`utils/scheduler.js\`の\`deadlineMs\`処理は適切か？
   - 残り時間が不足している場合の処理は適切か？

3. **エラーハンドリング**: \`applyJitter\`や\`applyLanguageWait\`が失敗した場合の処理は適切か？
   - エラー時に投稿処理が継続できるか？
   - エラーログは適切に出力されているか？

### P1（重要な問題）
4. **ジッターの範囲**: 3-10秒のジッターでスパム判定リスクを低減できるか？
   - Gemini推奨の1-15分との差の影響は？
   - Cronスケジュール（2時間ごと）で分散されているため、ジッターの重要性は低いか？

5. **言語間ウェイト**: 0-3秒で十分か？
   - Gemini推奨30-60秒との差の影響は？
   - maxDuration=60秒の制約を考慮した適切な値か？

6. **パフォーマンス**: ジッター追加による実行時間への影響は？
   - maxDuration=60秒を超えるリスクは？
   - タイムアウトのリスクは？

### P2（改善提案）
7. **ログ出力**: ジッター適用時のログは適切か？
8. **テスト容易性**: ジッターをモックしてテストできるか？
9. **コードの一貫性**: 他の投稿API（\`vsl1-post.js\`, \`x-post-free-report.js\`など）との一貫性は？

## 期待される回答形式

以下の形式で回答してください：

### 1. エグゼクティブサマリー（200-300字）
実装コードの総合的な評価と主要な問題点

### 2. P0問題のリスト（あれば）
- **問題**: 具体的な問題点
- **影響**: どのような影響があるか
- **修正案**: 具体的な修正コード（可能なら）

### 3. P1問題のリスト（あれば）
- **問題**: 具体的な問題点
- **影響**: どのような影響があるか
- **修正案**: 具体的な修正コード（可能なら）

### 4. P2改善提案（あれば）
- **改善点**: 具体的な改善提案

### 5. 総合評価
- **実装品質**: 評価（100点満点）
- **推奨アクション**: 3-5項目（優先度順）

日本語で回答してください。`;

  try {
    console.log('🔄 GPT-5.2-2025-12-11にレビューを依頼中...\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'あなたはX（旧Twitter）API投稿戦略の実装コードレビューの専門家です。設計仕様との整合性、バグ、パフォーマンス、エラーハンドリング、maxDuration制約への対応を厳密にチェックしてください。',
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

    const outputFile = path.join(outputDir, `gpt-jitter-implementation-review-${timestamp}.md`);
    const outputContent = `# ジッター（ランダム遅延）実装のコードレビュー（GPT-5.2-2025-12-11）
**作成日時**: ${new Date().toISOString()}
**レビューAI**: GPT-5.2-2025-12-11
**目的**: ジッター実装漏れの修正コードレビュー
**レビュー対象**:
- utils/scheduler.js
- api/x-quote-repost.js（変更箇所）

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
  askGPTReviewJitterImplementation()
    .then(() => {
      console.log('\n✅ 完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { askGPTReviewJitterImplementation };
