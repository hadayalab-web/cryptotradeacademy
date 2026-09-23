#!/usr/bin/env tsx
/**
 * GPT: CTOにビルドエラーの解決策を相談するスクリプト
 */

import { callGPT52 } from '../api/unified-api.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const buildErrors = `
Next.js 16.1.1 (Turbopack) ビルドエラー一覧:

1. VideoPlayer.tsx - ReactPlayer型エラー
   - Property 'url' does not exist on type 'IntrinsicAttributes & Omit<ReactPlayerProps, "ref"> & RefAttributes<HTMLVideoElement>'

2. app/[market]/layout.tsx - params型エラー
   - Property 'market' is missing in type 'Promise<{ market: string; }>'
   - Next.js 16ではparamsがPromise型になった

3. app/[market]/orientation/page.tsx - インポートエラー
   - Module has no default export (HeroSection, RegistrationForm)
   - paramsがPromise型に対応していない

4. app/checkout/[planId]/page.tsx - WHOP_PLAN_IDS構造エラー
   - Property 'MONTHLY' does not exist on type
   - WHOP_PLAN_IDSは言語別構造（EN.MONTHLY形式）

5. app/page.tsx - CVR_DATA構造エラー
   - Property 'copy' does not exist on type 'Record<Market, CVRData>'
   - CVR_DATA[market]を使用する必要がある

6. components/whop/WhopCheckoutEmbed.tsx - window.gtag型エラー
   - Property 'gtag' does not exist on type 'Window & typeof globalThis'

7. lib/infisical/client.ts - InfisicalSDK型エラー
   - Property 'token' does not exist in type 'InfisicalSDKOptions'

8. lib/notion/client.ts - 複数の型エラー
   - search filter型エラー
   - createPage title型エラー
   - searchPages params型エラー

9. lib/notion/database-export.ts - database.title型エラー
   - Property 'title' does not exist on type 'GetDatabaseResponse'

10. lib/notion/database-id-saver.ts - database.properties型エラー
    - Property 'properties' does not exist on type 'GetDatabaseResponse'

11. lib/resend/purchase-confirmation.ts - 関数パラメータ順序エラー
    - A required parameter cannot follow an optional parameter
    - body関数のパラメータ順序が間違っている

12. lib/resend/trial-reminder.ts - 関数パラメータ順序エラー
    - A required parameter cannot follow an optional parameter

13. lib/sosovalue/client.ts - getETFFlow型エラー
    - Argument of type 'string' is not assignable to parameter of type '"us-btc-spot" | "us-eth-spot" | undefined'

14. lib/whop/affiliate-links.ts - Market型エラー
    - Module '"./constants"' has no exported member 'Market'
`;

  const prompt = `
あなたはGPT: CTO（gpt-5.2-2025-12-11）です。
Next.js 16.1.1 (Turbopack) のビルドエラーを解決してください。

## エラー一覧
${buildErrors}

## 要件
1. 各エラーの根本原因を特定
2. 効率的な解決策を提示（型アサーションは最小限に）
3. Next.js 16の新しい型定義に対応
4. 優先順位をつけて、最も影響の大きいエラーから解決

## 出力形式
以下の形式で回答してください：

### 優先順位1: [エラー番号] [エラー名]
**原因**: [根本原因]
**解決策**: [具体的な修正方法]
**修正コード**: [修正後のコード例]

### 優先順位2: [エラー番号] [エラー名]
...

## 注意事項
- TypeScriptの型安全性を保ちつつ、実用的な解決策を提示
- 型アサーション（as any）は最後の手段として使用
- Next.js 16の新しい型定義を理解した上で解決策を提示
`;

  console.log('🤖 GPT: CTOに相談中...\n');
  console.log('📝 プロンプト長:', prompt.length, '文字');
  console.log('⏳ API呼び出しを開始します...\n');
  
  try {
    const result = await callGPT52(prompt, {
      temperature: 0.3,
      maxCompletionTokens: 4000,
    });

    console.log('\n✅ API呼び出し成功！\n');
    console.log('📋 GPT: CTOからの回答:\n');
    console.log('='.repeat(80));
    console.log('回答テキスト長:', result.text?.length || 0);
    console.log('回答テキスト:', result.text || '(空)');
    console.log('='.repeat(80));
    
    if (result.usage) {
      console.log('\n📊 API使用量:', JSON.stringify(result.usage, null, 2));
    }
    
    // 回答をファイルに保存
    const outputPath = join(__dirname, '../docs/CTO_BUILD_ERROR_SOLUTION.md');
    const content = `# GPT: CTO - ビルドエラー解決策\n\n**相談日**: ${new Date().toISOString()}\n\n---\n\n${result.text}\n`;
    fs.writeFileSync(outputPath, content, 'utf-8');
    console.log(`\n✅ 回答を保存しました: ${outputPath}`);
    
    // 標準出力にも確実に出力
    process.stdout.write('\n\n=== GPT: CTO 回答完了 ===\n\n');
    
  } catch (error: any) {
    console.error('\n❌ エラー発生:');
    console.error('エラーメッセージ:', error.message);
    if (error.stack) {
      console.error('エラースタック:', error.stack);
    }
    if (error.response) {
      console.error('APIレスポンス:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみmainを実行
main().catch((error) => {
  console.error('致命的なエラー:', error);
  process.exit(1);
});
