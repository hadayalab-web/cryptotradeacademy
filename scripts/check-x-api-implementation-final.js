// scripts/check-x-api-implementation-final.js
// GPT-5.2-2025-12-11によるX投稿戦略実装の最終チェック

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
  'services/x/client.js',
  'api/x-webhook.js',
  'services/x/postTracker.js',
  'api/x-quote-repost.js',
  'utils/common.js',
  'services/x/config.js',
  'package.json',
  'vercel.json',
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
 * GPT-5.2にレビューを依頼
 */
async function reviewWithGPT() {
  console.log('🔍 GPT-5.2-2025-12-11によるX投稿戦略実装の最終チェックを開始...\n');

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

  // レビュープロンプトを作成
  const prompt = `あなたはGPT-5.2-2025-12-11です。X投稿戦略の実装を完璧に仕上げるための最終コードレビューを実施してください。

## レビュー対象ファイル

${Object.keys(files).map((path, idx) => `${idx + 1}. ${path}`).join('\n')}

## 実装された修正内容

### P0: 重大な問題
1. **OAuth 1.0a署名の修正**: GETリクエストのクエリパラメータをOAuth署名に含める
2. **実行ランタイム互換性**: Node 18+を固定、FormDataの存在チェック
3. **Webhook署名検証**: 本番環境で必須化、タイミング攻撃対策
4. **postTracker.savePostId()**: KV失敗時は警告に落として継続（投稿成功と分離）

### P1: 重要な問題
1. **エラーハンドリング**: 429以外のネットワークエラーもリトライ対象
2. **タイムアウト設定**: AbortControllerで30秒/60秒のタイムアウト
3. **ログ改善**: runId/stepを全ログに付与、tweet IDを必ず記録
4. **テンプレート修正**: 外部リンクを1つに制限（Whopのみ）

### P2: 軽微な問題
1. **共通化**: parseBoolean/normalizeLangをutils/common.jsに共通化
2. **重複防止**: 同一tweetIdに対して24時間以内の投稿済みチェック

## レビュー観点

1. **コードの正確性**: 実装が仕様通りに動作するか
2. **X API統合**: OAuth署名、リクエスト/レスポンス処理が正しいか
3. **エラーハンドリング**: 適切なエラー処理とリトライロジックか
4. **ログ設計**: runId/stepによる追跡が完璧か
5. **非同期処理**: fetchタイムアウト、リトライ方針が適切か
6. **データフロー**: KV保存、投稿トラッキングの流れが正しいか
7. **パフォーマンス**: 不要な処理がないか、最適化されているか
8. **セキュリティ**: Webhook署名検証、認証情報の取り扱いが適切か

## 出力形式

以下の形式でレビュー結果を出力してください：

### 総合評価
- 実装品質: [A/B/C/D]
- 動作可能性: [高/中/低]
- 重大な問題: [有/無]
- 軽微な問題: [有/無]

### 発見された問題（優先度順）

#### P0: 重大な問題
1. [問題の説明]
   - ファイル: [ファイル名]
   - 行番号: [行番号]
   - 問題: [詳細]
   - 影響: [影響範囲]
   - 修正案: [修正方法]

#### P1: 重要な問題
[同様の形式]

#### P2: 軽微な問題
[同様の形式]

### 推奨される改善点

### 結論
[総合的な評価と推奨事項]

---

以下、各ファイルのコードです：

${Object.entries(files).map(([filePath, content]) => `\n## ${filePath}\n\`\`\`javascript\n${content}\n\`\`\``).join('\n\n')}`;

  try {
    console.log('📤 GPT-5.2にレビューを依頼中...\n');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'あなたはGPT-5.2-2025-12-11です。X (Twitter) API統合の専門家として、コードレビューを実施してください。実装の正確性、エラーハンドリング、ログ設計、パフォーマンス、セキュリティの観点から徹底的にレビューしてください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: 8000,
      temperature: 0.3,
    });

    const reviewResult = response.choices[0]?.message?.content;
    if (!reviewResult) {
      console.error('❌ GPT-5.2からのレスポンスが空です');
      console.error('Response:', JSON.stringify(response, null, 2));
      return;
    }

    // 結果を保存
    const outputDir = path.join(__dirname, '..', 'docs', 'reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(outputDir, `x-api-implementation-final-review-${timestamp}.md`);
    
    const markdown = `# X投稿戦略実装の最終レビュー結果
生成日時: ${new Date().toISOString()}
モデル: gpt-5.2-2025-12-11

${reviewResult}

---

## レビュー対象ファイル

${Object.keys(files).map((filePath) => `- ${filePath}`).join('\n')}
`;

    fs.writeFileSync(outputPath, markdown, 'utf-8');
    console.log(`\n✅ レビュー結果を保存しました: ${outputPath}\n`);
    console.log('📋 レビュー結果:\n');
    console.log(reviewResult);
    
  } catch (error) {
    console.error('❌ GPT-5.2レビュー中にエラーが発生しました:', error.message);
    if (error.response) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// 実行
if (require.main === module) {
  reviewWithGPT().catch(console.error);
}

module.exports = { reviewWithGPT };
