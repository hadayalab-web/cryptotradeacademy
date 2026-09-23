#!/usr/bin/env tsx
/**
 * GPT: CTOにreasoningEffort/verbosityパラメータ問題の包括的解決策を依頼
 */

import { callGPT52 } from '../api/unified-api';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const problemSummary = `
## 問題の概要

GPT-5.2-2025-12-11のAPIが\`reasoningEffort\`と\`verbosity\`パラメータをサポートしていないため、以下のエラーが発生しています：

\`\`\`
400 Unknown parameter: 'reasoning'.
Error: 400 Unknown parameter: 'reasoning'.
\`\`\`

## 影響を受けるコード

以下のファイルで\`reasoningEffort\`と\`verbosity\`パラメータが使用されています：

1. **api/unified-api.ts**
   - \`callGPT52\`関数の型定義に\`reasoningEffort\`と\`verbosity\`が含まれている
   - 戻り値に\`reasoningEffort\`と\`verbosity\`が含まれている（常にundefined）

2. **workflows/affiliate-recruitment/src/utils/gpt-enhanced.ts**
   - \`enhanceGrokAnalysisWithGPT\`: \`reasoningEffort: 'high'\`を使用
   - \`generateHighQualityDMWithGPT\`: \`reasoningEffort: 'high'\`を使用

3. **workflows/affiliate-recruitment/scripts/ask-gpt-synergy.ts**
   - \`reasoningEffort: 'high'\`を使用

4. **workflows/affiliate-recruitment/scripts/gpt-code-review.ts**
   - \`reasoningEffort: 'high'\`を使用

5. **scripts/request-cto-review.ts**
   - \`reasoningEffort: 'high', verbosity: 'high'\`を使用

6. **scripts/call-cto-review.mjs**
   - \`reasoningEffort: 'high', verbosity: 'high'\`を使用

7. **scripts/cto-review-direct.ts**
   - \`reasoningEffort: 'high', verbosity: 'high'\`を使用

8. **scripts/request-cto-review-simple.ts**
   - \`reasoningEffort: 'high', verbosity: 'high'\`を使用

9. **docs/HIGH_END_MODELS_CONFIGURATION.md**
   - 誤った情報が記載されている（\`reasoning.effort\`と\`verbosity\`がサポートされていると記載）

10. **docs/DIRECT_AI_API_USAGE.md**
    - 誤った使用例が記載されている

## 現在の修正状況

- \`api/unified-api.ts\`: \`reasoning\`と\`verbosity\`の設定部分はコメントアウト済み
- \`scripts/cto-review.ts\`: パラメータを削除して成功

## 要求事項

1. **包括的な解決策の提案**
   - すべてのコードを修正する方法
   - 後方互換性を保つ方法（オプション）
   - エラーハンドリングの改善

2. **修正の優先順位**
   - どのファイルから修正すべきか
   - 影響範囲の評価

3. **ドキュメントの更新方針**
   - どのドキュメントを更新すべきか
   - どのように更新すべきか

4. **テスト戦略**
   - どのようにテストすべきか
   - エラーケースのテスト方法
`;

const currentApiCode = fs.readFileSync(
  join(__dirname, '..', 'api', 'unified-api.ts'),
  'utf-8'
).substring(164, 212);

const prompt = `あなたはCTO: GPT (Architect)です。以下の問題を徹底的に解決してください。

${problemSummary}

## 現在のapi/unified-api.tsの実装

\`\`\`typescript
${currentApiCode}
\`\`\`

## レビュー観点

1. **包括的な解決策**
   - すべてのコードを修正する方法
   - 後方互換性を保つ方法（オプション）
   - エラーハンドリングの改善

2. **修正の優先順位**
   - どのファイルから修正すべきか
   - 影響範囲の評価

3. **ドキュメントの更新方針**
   - どのドキュメントを更新すべきか
   - どのように更新すべきか

4. **テスト戦略**
   - どのようにテストすべきか
   - エラーケースのテスト方法

5. **再発防止策**
   - 同じ問題が再発しないようにする方法
   - コードレビューの改善

## 出力形式

以下の形式で解決策を返してください：

# GPT-5.2 APIパラメータ問題 包括的解決策

## 1. 問題の根本原因

## 2. 包括的な解決策

### 2.1 コード修正方針

### 2.2 修正の優先順位

### 2.3 後方互換性の考慮

## 3. 実装計画

### 3.1 修正対象ファイル一覧

### 3.2 修正手順

### 3.3 テスト計画

## 4. ドキュメント更新計画

## 5. 再発防止策

## 6. 結論

解決策を日本語で、構造化された形式で返してください。`;

async function main() {
  try {
    console.log('📋 CTO: GPT (Architect)に包括的解決策を依頼中...\n');
    
    const result = await callGPT52(prompt, {
      maxCompletionTokens: 4000,
      temperature: 0.7,
    });
    
    console.log('='.repeat(80));
    console.log('CTO解決策');
    console.log('='.repeat(80));
    console.log('\n');
    console.log(result.text);
    console.log('\n');
    console.log('='.repeat(80));
    
    if (result.usage) {
      console.log('\n📊 使用量:');
      console.log(`  - Prompt Tokens: ${result.usage.prompt_token_count || 'N/A'}`);
      console.log(`  - Completion Tokens: ${result.usage.completion_token_count || 'N/A'}`);
      console.log(`  - Total Tokens: ${result.usage.total_token_count || 'N/A'}`);
    }
    
    const outputPath = join(__dirname, '..', 'docs', 'CTO_SOLUTION_REASONING_PARAMS.md');
    const output = `# GPT-5.2 APIパラメータ問題 包括的解決策

**作成日**: ${new Date().toISOString()}  
**レビュー者**: GPT: CTO (gpt-5.2-2025-12-11)  
**依頼者**: COO: Cursor (Composer)

---

${result.text}

---

## 使用量

${result.usage ? `
- Prompt Tokens: ${result.usage.prompt_token_count || 'N/A'}
- Completion Tokens: ${result.usage.completion_token_count || 'N/A'}
- Total Tokens: ${result.usage.total_token_count || 'N/A'}
` : 'N/A'}

---

**最終更新**: ${new Date().toISOString()}
`;
    
    fs.writeFileSync(outputPath, output, 'utf-8');
    console.log(`\n✅ 解決策を保存しました: ${outputPath}`);
  } catch (error: any) {
    console.error('❌ エラーが発生しました:');
    console.error(error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

main();
