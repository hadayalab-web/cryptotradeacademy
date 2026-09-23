/**
 * GPTコードレビュー - Vercelデプロイ前の健全性チェック（詳細版）
 * 
 * デバッグ炎上を防ぐための綿密なコードレビュー
 */

import { callGPT52 } from '../../../scripts/direct-ai-api.js';
import * as fs from 'fs';
import * as path from 'path';

// 主要ファイルを読み込む
const readCodeFile = (filePath: string): string => {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    // ファイルが大きすぎる場合は最初の5000行に制限
    const lines = content.split('\n');
    if (lines.length > 5000) {
      return lines.slice(0, 5000).join('\n') + '\n... (truncated)';
    }
    return content;
  } catch (error: any) {
    return `[Error reading file: ${error.message}]`;
  }
};

const codeReviewPrompt = `あなたは世界最高レベルのエンジニアです。Vercelデプロイ前のコードレビューを依頼します。

以下のコードベースについて、**デバッグ炎上を防ぐ**観点から、綿密なレビューをお願いします。

## レビュー対象コードベース

### 1. 型定義 (src/types/index.ts)
\`\`\`typescript
${readCodeFile('src/types/index.ts')}
\`\`\`

### 2. APIクライアント (src/utils/api-client.ts)
\`\`\`typescript
${readCodeFile('src/utils/api-client.ts')}
\`\`\`

### 3. バリデーション (src/utils/validation.ts)
\`\`\`typescript
${readCodeFile('src/utils/validation.ts')}
\`\`\`

### 4. Tri-Force統合ワークフロー (src/workflows/tri-force-synergy.ts)
\`\`\`typescript
${readCodeFile('src/workflows/tri-force-synergy.ts')}
\`\`\`

### 5. Grokエンハンスト (src/utils/grok-enhanced.ts)
\`\`\`typescript
${readCodeFile('src/utils/grok-enhanced.ts')}
\`\`\`

### 6. GPTエンハンスト (src/utils/gpt-enhanced.ts)
\`\`\`typescript
${readCodeFile('src/utils/gpt-enhanced.ts')}
\`\`\`

### 7. Geminiエンハンスト (src/utils/gemini-enhanced.ts)
\`\`\`typescript
${readCodeFile('src/utils/gemini-enhanced.ts')}
\`\`\`

## Vercelデプロイ前の確認ポイント

### 1. エラーハンドリング
- [ ] すべての非同期処理にtry-catchがあるか
- [ ] エラーメッセージが具体的でデバッグしやすいか
- [ ] エラーが適切に伝播されているか
- [ ] 予期しないエラーが発生してもクラッシュしないか

### 2. Vercel制限への対応
- [ ] タイムアウト設定がVercelの制限（10秒/60秒）を考慮しているか
- [ ] メモリ使用量が適切か（Vercel Hobby: 1GB, Pro: 8GB）
- [ ] 関数の実行時間が適切か（Hobby: 10秒, Pro: 60秒）
- [ ] 大きなデータ構造をメモリに保持していないか

### 3. 環境変数の管理
- [ ] 必須環境変数がチェックされているか
- [ ] 環境変数のデフォルト値が適切か
- [ ] 本番環境と開発環境の違いが考慮されているか

### 4. API呼び出しの安全性
- [ ] レート制限が適切に実装されているか
- [ ] リトライロジックが過剰でないか
- [ ] タイムアウトが適切に設定されているか
- [ ] APIキーが漏洩する可能性がないか

### 5. 非同期処理の適切性
- [ ] Promise.allの使用が適切か（エラーハンドリング含む）
- [ ] 並列処理が過剰でないか（API制限を考慮）
- [ ] 非同期処理のエラーが適切に処理されているか

### 6. 型安全性
- [ ] any型の使用が最小限か
- [ ] 型アサーションが安全か
- [ ] 型ガードが適切に使用されているか

### 7. メモリリークの可能性
- [ ] イベントリスナーのクリーンアップがあるか
- [ ] 大きな配列やオブジェクトが適切に解放されるか
- [ ] キャッシュのサイズ制限があるか

### 8. ログ出力とデバッグ
- [ ] 本番環境で機密情報がログに出力されないか
- [ ] デバッグ情報が適切に管理されているか
- [ ] エラーログが有用な情報を含んでいるか

### 9. 入力検証
- [ ] すべての外部入力が検証されているか
- [ ] SQLインジェクションやXSSのリスクがないか
- [ ] 不正なデータがクラッシュを引き起こさないか

### 10. デプロイ時の問題
- [ ] ビルドエラーの可能性がないか
- [ ] 依存関係が正しく定義されているか
- [ ] 環境固有のコードがないか

## レビュー依頼

以下の観点から、**デバッグ炎上を防ぐ**ための具体的な改善提案をお願いします：

1. **致命的な問題（Critical）**: デプロイ後に即座にクラッシュする可能性がある問題
2. **重大な問題（High）**: 特定の条件下でクラッシュやデータ損失を引き起こす問題
3. **中程度の問題（Medium）**: パフォーマンスやユーザー体験に影響する問題
4. **軽微な問題（Low）**: コード品質や保守性に影響する問題

各問題について：
- 問題の説明
- 影響範囲
- 再現手順（可能な場合）
- 修正提案（コード例を含む）
- 優先度

特に、以下の点を重点的に確認してください：
- Vercelのタイムアウト制限（10秒/60秒）を超える処理がないか
- メモリリークの可能性
- エラーハンドリングの不完全性
- 環境変数の不足チェック
- 非同期処理の適切性
- JSON.parse/JSON.stringifyのエラーハンドリング
- 無限ループの可能性
- レート制限違反の可能性

実際のコードを確認して、具体的な問題点と修正案を提示してください。

日本語で回答してください。`;

async function main() {
  try {
    console.log('🔍 GPTコードレビュー開始（詳細版）...\n');
    console.log('=' .repeat(60));
    console.log('');
    
    const result = await callGPT52(codeReviewPrompt, {
      reasoningEffort: 'high', // 深い推論でレビュー
      temperature: 0.3, // 一貫性のため低め
      maxTokens: 8000,
    });
    
    console.log('📝 GPTコードレビュー結果:');
    console.log('');
    console.log(result.text);
    console.log('');
    console.log('=' .repeat(60));
    console.log('');
    
    if (result.usage) {
      console.log('📊 使用量:');
      console.log(`  - Prompt Tokens: ${result.usage.promptTokens || 'N/A'}`);
      console.log(`  - Completion Tokens: ${result.usage.completionTokens || 'N/A'}`);
      console.log(`  - Total Tokens: ${result.usage.totalTokens || 'N/A'}`);
      console.log('');
    }
    
    // 結果をファイルに保存
    const outputPath = path.join(process.cwd(), 'GPT_CODE_REVIEW_DETAILED.md');
    
    const output = `# GPTコードレビュー - Vercelデプロイ前の健全性チェック（詳細版）

**レビュー日**: ${new Date().toISOString()}  
**レビュー方法**: direct-ai-api.ts経由  
**モデル**: GPT-5.2 (reasoningEffort: high)

---

## レビュー対象

- src/types/index.ts
- src/utils/api-client.ts
- src/utils/validation.ts
- src/workflows/tri-force-synergy.ts
- src/utils/grok-enhanced.ts
- src/utils/gpt-enhanced.ts
- src/utils/gemini-enhanced.ts

---

## GPTのレビュー結果

${result.text}

---

## 使用量

${result.usage ? `
- Prompt Tokens: ${result.usage.promptTokens || 'N/A'}
- Completion Tokens: ${result.usage.completionTokens || 'N/A'}
- Total Tokens: ${result.usage.totalTokens || 'N/A'}
` : 'N/A'}

---

**最終更新**: ${new Date().toISOString()}
`;
    
    fs.writeFileSync(outputPath, output, 'utf-8');
    console.log(`✅ 結果を保存しました: ${outputPath}`);
    
  } catch (error: any) {
    console.error('❌ エラーが発生しました:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
