import { callGPT52 } from '../api/unified-api';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const affiliateDmPath = join(__dirname, '..', 'hadayalab-website-dev', 'cryptotradeacademy-lp-dev', 'cryptotradeacademy-lp-ja', 'app', 'api', 'workflows', 'affiliate-dm', 'route.ts');
const unifiedApiPath = join(__dirname, '..', 'api', 'unified-api.ts');

const affiliateDmCode = fs.existsSync(affiliateDmPath) ? fs.readFileSync(affiliateDmPath, 'utf-8') : 'ファイルが見つかりませんでした';
const unifiedApiCode = fs.existsSync(unifiedApiPath) ? fs.readFileSync(unifiedApiPath, 'utf-8') : 'ファイルが見つかりませんでした';

const generateWhopMatch = unifiedApiCode.match(/export async function generateWhopAffiliateLink[\s\S]*?^}/m);
const generateWhopCode = generateWhopMatch ? generateWhopMatch[0] : '関数が見つかりませんでした';

const whopRequestMatch = unifiedApiCode.match(/async function whopRequest[\s\S]*?^}/m);
const whopRequestCode = whopRequestMatch ? whopRequestMatch[0] : '関数が見つかりませんでした';

const prompt = `あなたはCTO: GPT (Architect)です。以下のコードレビューを実施してください。

## レビュー対象

### 1. affiliate-dmワークフロー

ファイル: hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-ja/app/api/workflows/affiliate-dm/route.ts

\`\`\`typescript
${affiliateDmCode.substring(0, 4000)}
\`\`\`

### 2. api/unified-api.tsのWhop関連関数

#### whopRequest関数
\`\`\`typescript
${whopRequestCode}
\`\`\`

#### generateWhopAffiliateLink関数
\`\`\`typescript
${generateWhopCode}
\`\`\`

## レビュー観点

1. **コードの重複（DRY原則）**
   - affiliate-dmワークフロー内でWhop APIを直接呼び出す実装があるか？
   - api/unified-api.tsの関数を活用できているか？

2. **api/unified-api.tsの活用**
   - affiliate-dmワークフローにWhopアフィリエイトリンク生成機能を統合する場合、api/unified-api.tsのgenerateWhopAffiliateLink関数を使用すべきか？
   - ワークフロー内で直接実装すべきか？

3. **エラーハンドリング**
   - 適切なエラーハンドリングが実装されているか？
   - フォールバック処理は適切か？

4. **型安全性**
   - TypeScript型定義は適切か？
   - 型の一貫性は保たれているか？

5. **パフォーマンス**
   - API呼び出しの最適化は適切か？
   - 不要なAPI呼び出しはないか？

6. **メンテナンス性**
   - コードの可読性は高いか？
   - 将来の変更に対応しやすい構造か？

## 出力形式

以下の形式でレビュー結果を返してください：

# CTOレビュー: affiliate-dmワークフロー + Whop統合

## 1. コードの重複（DRY原則）

## 2. api/unified-api.tsの活用

## 3. エラーハンドリング

## 4. 型安全性

## 5. パフォーマンス

## 6. メンテナンス性

## 推奨事項

## 結論

レビュー結果を日本語で、構造化された形式で返してください。`;

async function main() {
  try {
    console.log('📋 CTO: GPT (Architect)にレビューを依頼中...\n');
    const result = await callGPT52(prompt, {
      maxCompletionTokens: 4000,
      temperature: 0.7,
    });
    
    console.log('='.repeat(80));
    console.log('CTOレビュー結果');
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
    
    const outputPath = join(__dirname, '..', 'docs', 'CTO_REVIEW_AFFILIATE_DM_OFFICIAL.md');
    const output = `# CTOレビュー: affiliate-dmワークフロー + Whop統合

**レビュー日**: ${new Date().toISOString()}  
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
    console.log(`\n✅ レビュー結果を保存しました: ${outputPath}`);
  } catch (error: any) {
    console.error('❌ エラーが発生しました:');
    console.error(error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

main();
