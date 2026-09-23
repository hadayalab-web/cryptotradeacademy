#!/usr/bin/env tsx
/**
 * GPT-5.2-2025-12-11を使用してLPのビルドエラーを解決するスクリプト
 */

import { callGPT52 } from '../api/unified-api.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function getBuildErrors(): Promise<string> {
  const lpPath = join(__dirname, '..', 'hadayalab-website-dev', 'cryptotradeacademy-lp-dev', 'cryptotradeacademy-lp-en');
  
  try {
    const output = execSync('npm run build', {
      cwd: lpPath,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    return '✅ ビルド成功！エラーなし';
  } catch (error: any) {
    return error.stdout || error.stderr || error.message;
  }
}

async function main() {
  console.log('🔍 ビルドエラーを確認中...\n');
  
  const buildOutput = await getBuildErrors();
  
  if (buildOutput.includes('✅ ビルド成功')) {
    console.log('✅ ビルドエラーはありません！');
    return;
  }
  
  console.log('📋 ビルドエラーを検出しました。GPT-5.2-2025-12-11に解決策を依頼します...\n');
  
  const prompt = `
あなたはGPT: CTO（gpt-5.2-2025-12-11）です。
Next.js 16.1.1 (Turbopack) のユーザー向けLPのビルドエラーを解決してください。

## ビルドエラー出力
${buildOutput}

## 要件
1. 各エラーの根本原因を特定
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
- ファイルパスは相対パスで指定（例: app/[market]/page.tsx）
`;

  console.log('🤖 GPT-5.2-2025-12-11に相談中...\n');
  
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
    const outputPath = join(__dirname, '..', 'docs', 'LP_BUILD_ERROR_SOLUTION.md');
    const content = `# GPT: CTO - LPビルドエラー解決策\n\n**相談日**: ${new Date().toISOString()}\n\n---\n\n## ビルドエラー出力\n\`\`\`\n${buildOutput}\n\`\`\`\n\n---\n\n## GPT: CTOからの解決策\n\n${result.text}\n`;
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
