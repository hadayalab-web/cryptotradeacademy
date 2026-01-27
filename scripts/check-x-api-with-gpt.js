// scripts/check-x-api-with-gpt.js
// GPT-5.2-2025-12-11を使ってX API関連のすべてのコードを点検

const fs = require('fs');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';
const MODEL = 'gpt-5.2-2025-12-11';

const OUTPUT_DIR = path.join(__dirname, '../docs/reports');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'x-api-gpt-review.md');

// 出力ディレクトリが存在しない場合は作成
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * X API関連の主要ファイルを読み込む
 */
function loadXApiFiles() {
  const files = {};
  
  const filePaths = [
    // コア機能
    { path: 'api/x-quote-repost.js', name: 'x-quote-repost.js', description: '引用リポスト自動化（今回修正したファイル）' },
    { path: 'services/x/client.js', name: 'client.js', description: 'X APIクライアント（コア機能）' },
    { path: 'services/x/config.js', name: 'config.js', description: 'X API設定管理' },
    { path: 'api/x-webhook.js', name: 'x-webhook.js', description: 'X API Webhook処理' },
    
    // 最適化・ロジック
    { path: 'services/x/optimization.js', name: 'optimization.js', description: 'X API最適化ロジック' },
    { path: 'services/x/influencerStock.js', name: 'influencerStock.js', description: 'インフルエンサーストック管理' },
    { path: 'services/x/influencerRotation.js', name: 'influencerRotation.js', description: 'インフルエンサーローテーション' },
    { path: 'services/x/postTracker.js', name: 'postTracker.js', description: '投稿トラッキング' },
    { path: 'services/x/metrics.js', name: 'metrics.js', description: 'メトリクス取得' },
  ];
  
  filePaths.forEach(({ path: filePath, name, description }) => {
    const fullPath = path.join(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        files[name] = {
          content,
          description,
          path: filePath,
        };
        console.log(`✅ 読み込み完了: ${name}`);
      } catch (error) {
        console.warn(`⚠️ ファイルの読み込みに失敗: ${name}`, error.message);
      }
    } else {
      console.warn(`⚠️ ファイルが見つかりません: ${filePath}`);
    }
  });
  
  return files;
}

/**
 * GPT APIを呼び出してコードレビューを実行
 */
async function reviewWithGPT(files) {
  console.log('🤖 GPT-5.2-2025-12-11でX API関連コードを点検中...\n');
  
  // ファイル内容を整理
  const fileContents = Object.entries(files).map(([name, data]) => {
    return `## ${name} (${data.description})
\`\`\`javascript
${data.content.substring(0, 8000)}${data.content.length > 8000 ? '\n// ... (truncated)' : ''}
\`\`\`
`;
  }).join('\n\n');
  
  const prompt = `あなたは経験豊富なソフトウェアエンジニアで、X API (Twitter API) の専門家です。以下のX API関連のコードを徹底的にレビューし、正常に動作するか、潜在的な問題がないかを点検してください。

## 背景
- X APIへの投稿が正常に動作していない可能性がある
- X APIのクレジットが減っていない
- Cron Jobsは実行されているが、X APIへの実際の投稿が0件
- 以前の分析で「Assignment to constant variable」エラーが発生していた

## 今回の修正内容
- \`api/x-quote-repost.js\`に以下の改善を実装：
  1. runIdとGIT_SHAの追加（デプロイ確認用）
  2. 言語単位の例外ハンドリング強化（どのステップで落ちたかをログ）
  3. ローテーション選択のログ強化
  4. スキップを成功に埋めない（指標を分ける）
  5. フロー観測可能なログ設計（runIdを全ログに付与、stepキーで統一）

## レビュー対象ファイル

${fileContents}

## 点検してほしいこと

### 1. コードの正確性
- 構文エラー、論理エラー、潜在的なバグはないか？
- 変数のスコープ、再代入、const/letの使い方は正しいか？
- エラーハンドリングは適切か？

### 2. X API統合の正確性
- X APIの呼び出し方法は正しいか？
- OAuth 1.0a認証は正しく実装されているか？
- APIエンドポイント、リクエスト形式、レスポンス処理は正しいか？
- レート制限の処理は適切か？

### 3. エラーハンドリング
- エラーが適切にキャッチされているか？
- エラーメッセージは有用か？
- エラー時のフォールバック処理は適切か？

### 4. ログとデバッグ
- ログは適切に出力されているか？
- デバッグに必要な情報は含まれているか？
- runIdやstepキーは適切に使用されているか？

### 5. 非同期処理
- Promise/async-awaitの使い方は正しいか？
- エラーハンドリングは適切か？
- タイムアウト処理は適切か？

### 6. データフロー
- データの流れは論理的か？
- 変数の初期化、更新、使用は正しいか？
- 状態管理は適切か？

### 7. パフォーマンス
- 不要なAPI呼び出しはないか？
- 効率的な実装になっているか？

## 出力形式
以下の形式でレビュー結果を出力してください：

# X API関連コードレビュー結果

## 総合評価
- 正常に動作する可能性: [高/中/低]
- 重大な問題: [有/無]
- 軽微な問題: [有/無]

## 発見された問題

### P0: 重大な問題（即座に修正が必要）
1. [問題の説明]
   - ファイル: [ファイル名]
   - 行番号: [行番号]
   - 問題: [詳細]
   - 影響: [影響範囲]
   - 修正案: [修正方法]

### P1: 重要な問題（早急に修正推奨）
1. [問題の説明]
   - ファイル: [ファイル名]
   - 行番号: [行番号]
   - 問題: [詳細]
   - 影響: [影響範囲]
   - 修正案: [修正方法]

### P2: 軽微な問題（改善推奨）
1. [問題の説明]
   - ファイル: [ファイル名]
   - 行番号: [行番号]
   - 問題: [詳細]
   - 修正案: [修正方法]

## 各ファイルの詳細レビュー

### [ファイル名]
- 評価: [良い点/問題点]
- 問題: [具体的な問題]
- 推奨事項: [改善提案]

## 動作確認チェックリスト
- [ ] X API認証が正しく動作するか
- [ ] 投稿機能が正しく動作するか
- [ ] Webhook処理が正しく動作するか
- [ ] エラーハンドリングが適切か
- [ ] ログ出力が適切か
- [ ] 非同期処理が正しく実装されているか

## 推奨される修正アクション
優先順位順に、具体的な修正アクションをリストアップしてください。

## 結論
X API関連のコードが正常に動作するか、総合的な評価と推奨事項を記載してください。`;

  try {
    console.log('📡 GPT APIにリクエストを送信中...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'あなたは経験豊富なソフトウェアエンジニアで、X API (Twitter API) の専門家です。コードレビューを徹底的に行い、問題点を明確に指摘してください。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_completion_tokens: 8000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GPT API error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    console.log('✅ GPT APIからのレスポンスを受信しました\n');
    
    // レスポンスのデバッグ情報を出力
    if (data.choices && data.choices.length > 0) {
      const choice = data.choices[0];
      console.log('📊 レスポンス情報:');
      console.log(`  - Finish reason: ${choice.finish_reason}`);
      console.log(`  - Tokens used: ${data.usage?.total_tokens || 'N/A'}`);
      console.log(`  - Completion tokens: ${data.usage?.completion_tokens || 'N/A'}\n`);
      
      if (choice.finish_reason === 'length') {
        console.warn('⚠️ レスポンスが長すぎて途中で切れている可能性があります');
      }
      
      const reviewContent = choice.message?.content || '';
      
      if (!reviewContent) {
        throw new Error('GPT APIからのレスポンスが空です');
      }
      
      // レビュー結果をファイルに保存
      const output = `# X API関連コードレビュー結果
生成日時: ${new Date().toISOString()}
モデル: ${MODEL}

${reviewContent}
`;
      
      fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
      console.log(`✅ レビュー結果を保存しました: ${OUTPUT_FILE}`);
      
      // コンソールにも出力（最初の2000文字）
      console.log('\n📄 レビュー結果（抜粋）:');
      console.log('='.repeat(80));
      console.log(reviewContent.substring(0, 2000));
      if (reviewContent.length > 2000) {
        console.log('\n... (続きはファイルを確認してください)');
      }
      console.log('='.repeat(80));
      
      return reviewContent;
    } else {
      throw new Error('GPT APIからのレスポンスにchoicesが含まれていません');
    }
  } catch (error) {
    console.error('❌ GPT API呼び出しエラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    throw error;
  }
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('='.repeat(80));
    console.log('X API関連コードレビュー開始');
    console.log('='.repeat(80));
    console.log('');
    
    // ファイルを読み込む
    console.log('📂 X API関連ファイルを読み込み中...\n');
    const files = loadXApiFiles();
    
    if (Object.keys(files).length === 0) {
      console.error('❌ 読み込めるファイルがありません');
      process.exit(1);
    }
    
    console.log(`\n✅ ${Object.keys(files).length}個のファイルを読み込みました\n`);
    
    // GPTでレビュー
    await reviewWithGPT(files);
    
    console.log('\n' + '='.repeat(80));
    console.log('レビュー完了');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  }
}

// スクリプトを実行
if (require.main === module) {
  main();
}

module.exports = { loadXApiFiles, reviewWithGPT };
