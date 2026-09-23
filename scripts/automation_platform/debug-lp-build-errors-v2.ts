#!/usr/bin/env tsx
/**
 * GPT-5.2-2025-12-11を使用してLPのビルドエラーを解決するスクリプト（v2）
 * createContextエラーに特化
 */

import { callGPT52 } from '../api/unified-api.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const buildError = `
Error: Failed to collect configuration for /[market]/orientation
    at ignore-listed frames {
  [cause]: TypeError: (0 , c.createContext) is not a function
      at module evaluation (C:\\Users\\chiba\\hadayalab-automation-platform\\hadayalab-website-dev\\cryptotradeacademy-lp-dev\\cryptotradeacademy-lp-en\\.next\\server\\chunks\\ssr\\79729_adayalab-website-dev_cryptotradeacademy-lp-dev_cryptotradeacademy-lp-en_1fb4bb5f._.js:1:268017)
      at instantiateModule (C:\\Users\\chiba\\hadayalab-automation-platform\\hadayalab-website-dev\\cryptotradeacademy-lp-dev\\cryptotradeacademy-lp-en\\.next\\server\\chunks\\ssr\\[turbopack]_runtime.js:740:9)
      at getOrInstantiateModuleFromParent (C:\\Users\\chiba\\hadayalab-automation-platform\\hadayalab-website-dev\\cryptotradeacademy-lp-dev\\cryptotradeacademy-lp-en\\.next\\server\\chunks\\ssr\\[turbopack]_runtime.js:763:12)
      at Context.commonJsRequire [as r] (C:\\Users\\chiba\\hadayalab-automation-platform\\hadayalab-website-dev\\cryptotradeacademy-lp-dev\\cryptotradeacademy-lp-en\\.next\\server\\chunks\\ssr\\[turbopack]_runtime.js:249:12)
      at module evaluation (C:\\Users\\chiba\\hadayalab-automation-platform\\hadayalab-website-dev\\cryptotradeacademy-lp-dev\\cryptotradeacademy-lp-en\\.next\\server\\chunks\\ssr\\79729_adayalab-website-dev_cryptotradeacademy-lp-dev_cryptotradeacademy-lp-en_1fb4bb5f._.js:1:280818)
      at instantiateModule (C:\\Users\\chiba\\hadayalab-automation-platform\\hadayalab-website-dev\\cryptotradeacademy-lp-dev\\cryptotradeacademy-lp-en\\.next\\server\\chunks\\ssr\\[turbopack]_runtime.js:740:9)
      at getOrInstantiateModuleFromParent (C:\\Users\\chiba\\hadayalab-automation-platform\\hadayalab-website-dev\\cryptotradeacademy-lp-dev\\cryptotradeacademy-lp-en\\.next\\server\\chunks\\ssr\\[turbopack]_runtime.js:763:12)
      at Context.commonJsRequire [as r] (C:\\Users\\chiba\\hadayalab-automation-platform\\hadayalab-website-dev\\cryptotradeacademy-lp-dev\\cryptotradeacademy-lp-en\\.next\\server\\chunks\\ssr\\[turbopack]_runtime.js:249:12)
      at module evaluation (C:\\Users\\chiba\\hadayalab-automation-platform\\hadayalab-website-dev\\cryptotradeacademy-lp-dev\\cryptotradeacademy-lp-en\\.next\\server\\chunks\\ssr\\79729_adayalab-website-dev_cryptotradeacademy-lp-dev_cryptotradeacademy-lp-en_1fb4bb5f._.js:1:283553)
      at instantiateModule (C:\\Users\\chiba\\hadayalab-automation-platform\\hadayalab-website-dev\\cryptotradeacademy-lp-dev\\cryptotradeacademy-lp-en\\.next\\server\\chunks\\ssr\\[turbopack]_runtime.js:740:9)
}
> Build error occurred
Error: Failed to collect page data for /[market]/orientation
`;

async function main() {
  console.log('🤖 GPT-5.2-2025-12-11にcreateContextエラーを報告中...\n');
  
  const prompt = `
あなたはGPT: CTO（gpt-5.2-2025-12-11）です。
Next.js 16.1.1 (Turbopack) + React 19.2.3 のユーザー向けLPで、以下のエラーが発生しています。

## エラー詳細
${buildError}

## 環境情報
- Next.js: 16.1.1 (Turbopack)
- React: 19.2.3
- React DOM: 19.2.3
- エラー発生ページ: app/[market]/orientation/page.tsx
- エラー発生タイミング: Collecting page data（静的生成/SSRのデータ収集）中

## 使用している主要ライブラリ
- @radix-ui/react-slot, @radix-ui/react-dialog など（Radix UI）
- next-i18next: ^15.4.3
- class-variance-authority

## エラーの特徴
- \`createContext\`が関数ではないというエラー
- サーバーサイドレンダリング（SSR）中に発生
- Turbopackのバンドル済みコード内で発生

## 要件
1. 根本原因を特定（React 19とNext.js 16の互換性問題か、ライブラリの問題か）
2. 効率的な解決策を提示（型アサーションは最小限に）
3. Next.js 16の新しい型定義に対応
4. 優先順位をつけて、最も影響の大きいエラーから解決

## 出力形式
以下の形式で回答してください：

### 優先順位1: [エラー名]
**原因**: [根本原因]
**解決策**: [具体的な修正方法]
**修正コード**: [修正後のコード例（ファイルパスとコード）]

### 優先順位2: [エラー名]
...

## 注意事項
- TypeScriptの型安全性を保ちつつ、実用的な解決策を提示
- 型アサーション（as any）は最後の手段として使用
- Next.js 16の新しい型定義を理解した上で解決策を提示
- React 19とNext.js 16の互換性を考慮
`;

  try {
    const result = await callGPT52(prompt, {
      temperature: 0.3,
      maxCompletionTokens: 4000,
    });

    console.log('\n✅ GPT: CTOからの回答:\n');
    console.log('='.repeat(80));
    console.log(result.text);
    console.log('='.repeat(80));
    
    // 回答をファイルに保存
    const outputPath = join(__dirname, '..', 'docs', 'LP_BUILD_ERROR_SOLUTION_V2.md');
    const content = `# GPT: CTO - LPビルドエラー解決策（createContextエラー）\n\n**相談日**: ${new Date().toISOString()}\n\n---\n\n## エラー詳細\n\`\`\`\n${buildError}\n\`\`\`\n\n---\n\n## GPT: CTOからの解決策\n\n${result.text}\n`;
    fs.writeFileSync(outputPath, content, 'utf-8');
    console.log(`\n✅ 回答を保存しました: ${outputPath}`);
    
  } catch (error: any) {
    console.error('\n❌ エラー発生:');
    console.error('エラーメッセージ:', error.message);
    if (error.stack) {
      console.error('エラースタック:', error.stack);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('致命的なエラー:', error);
  process.exit(1);
});
