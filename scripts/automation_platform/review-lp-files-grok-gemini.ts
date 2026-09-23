#!/usr/bin/env tsx
/**
 * GrokとGeminiにLPファイルのレビューを依頼するスクリプト
 * 実際のファイル内容を送ってレビューしてもらう
 */

import { callGrok41FastReasoning, callGemini3Pro } from '../api/unified-api.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// LPファイルのパス
const userLPPath = join(__dirname, '..', 'hadayalab-website-dev', 'cryptotradeacademy-lp-dev', 'cryptotradeacademy-lp-en', 'app', '[market]', 'page.tsx');
const affiliateLPPath = join(__dirname, '..', 'hadayalab-website-dev', 'cryptotradeacademy-lp-dev', 'cryptotradeacademy-lp-en', 'app', 'affiliate', '[market]', 'page.tsx');
const cvrDataPath = join(__dirname, '..', 'hadayalab-website-dev', 'cryptotradeacademy-lp-dev', 'cryptotradeacademy-lp-en', 'lib', 'cvr-data.ts');

// ファイルの存在確認
if (!fs.existsSync(userLPPath)) {
  throw new Error(`ユーザー向けLPファイルが見つかりません: ${userLPPath}`);
}
if (!fs.existsSync(affiliateLPPath)) {
  throw new Error(`アフィリエイター向けLPファイルが見つかりません: ${affiliateLPPath}`);
}
if (!fs.existsSync(cvrDataPath)) {
  throw new Error(`CVRデータファイルが見つかりません: ${cvrDataPath}`);
}

// ファイルを読み込む
const userLPContent = fs.readFileSync(userLPPath, 'utf-8');
const affiliateLPContent = fs.readFileSync(affiliateLPPath, 'utf-8');
const cvrDataContent = fs.readFileSync(cvrDataPath, 'utf-8');

// Grokに依頼するプロンプト（詳細レビュー）
const grokPrompt = `以下のLPファイルの実装をレビューしてください。

## レビュー対象

### 1. ユーザー向けLP
ファイルパス: app/[market]/page.tsx
\`\`\`typescript
${userLPContent.substring(0, 15000)}${userLPContent.length > 15000 ? '\n... (ファイルが長いため一部省略) ...' : ''}
\`\`\`

### 2. アフィリエイター向けLP
ファイルパス: app/affiliate/[market]/page.tsx
\`\`\`typescript
${affiliateLPContent.substring(0, 15000)}${affiliateLPContent.length > 15000 ? '\n... (ファイルが長いため一部省略) ...' : ''}
\`\`\`

### 3. CVRデータ
ファイルパス: lib/cvr-data.ts
\`\`\`typescript
${cvrDataContent.substring(0, 5000)}${cvrDataContent.length > 5000 ? '\n... (ファイルが長いため一部省略) ...' : ''}
\`\`\`

## レビュー観点

1. **実装の正確性**: ファイルが正しく実装されているか
2. **要件の充足**: Two Young Menストーリー、VSL、アフィリエイター向けLPの「隠された敵」×「島への招待」ハイブリッド戦略が実装されているか
3. **コード品質**: TypeScriptの型安全性、エラーハンドリング、パフォーマンス
4. **SSOT準拠**: SSOTドキュメントに基づく用語統一と構造の一致
5. **プロダクション品質**: SEO、アクセシビリティ、モバイル対応

## レビュー形式

以下の形式でレビューしてください：

### ✅ 正しく実装されている点
- [具体的な点を列挙]

### ❌ 問題点・改善が必要な点
- [具体的な問題点と修正方法]

### ⚠️ 注意が必要な点
- [潜在的な問題や将来のリスク]

### 📊 総合評価
- 実装の正確性: X/10
- 要件の充足: X/10
- コード品質: X/10
- プロダクション品質: X/10

**このファイルが本当に正しいLP実装かどうかを厳格に評価してください。ごまかさず、問題があれば指摘してください。**`;

// Geminiに依頼するプロンプト（マーケティング・CVR観点）
const geminiPrompt = `以下のLPファイルの実装を、マーケティング戦略とCVR最適化の観点からレビューしてください。

## レビュー対象

### 1. ユーザー向けLP
ファイルパス: app/[market]/page.tsx
\`\`\`typescript
${userLPContent.substring(0, 15000)}${userLPContent.length > 15000 ? '\n... (ファイルが長いため一部省略) ...' : ''}
\`\`\`

### 2. アフィリエイター向けLP
ファイルパス: app/affiliate/[market]/page.tsx
\`\`\`typescript
${affiliateLPContent.substring(0, 15000)}${affiliateLPContent.length > 15000 ? '\n... (ファイルが長いため一部省略) ...' : ''}
\`\`\`

### 3. CVRデータ
ファイルパス: lib/cvr-data.ts
\`\`\`typescript
${cvrDataContent.substring(0, 5000)}${cvrDataContent.length > 5000 ? '\n... (ファイルが長いため一部省略) ...' : ''}
\`\`\`

## レビュー観点（CMO/CKO視点）

1. **マーケティング戦略の実装**: Two Young Menストーリー、VSL、アフィリエイター向けLPの「隠された敵」×「島への招待」ハイブリッド戦略が適切に実装されているか
2. **CVR最大化**: コンバージョン率を最大化するための要素（AIDA構造、緊急性、希少性、リスクリバーサルなど）が実装されているか
3. **ストーリーテリング**: 感情喚起と論理的説得のバランス
4. **ユーザー体験**: モバイルファースト、スクロール体験、CTAの配置

## レビュー形式

以下の形式でレビューしてください：

### ✅ 優れている点（マーケティング・CVR観点）
- [具体的な点を列挙]

### ❌ 改善が必要な点
- [具体的な問題点と改善提案]

### 💡 CVR向上のための提案
- [具体的な改善提案と期待されるCVR向上率]

### 📊 総合評価
- マーケティング戦略の実装: X/10
- CVR最大化の実装: X/10
- ストーリーテリング: X/10
- ユーザー体験: X/10

**このファイルが本当に正しいLP実装かどうかを、マーケティングとCVR最適化の観点から厳格に評価してください。ごまかさず、問題があれば指摘してください。**`;

async function main() {
  console.log('🚀 GrokとGeminiにLPファイルのレビューを依頼します...\n');
  console.log(`📄 ユーザー向けLP: ${userLPPath}`);
  console.log(`📄 アフィリエイター向けLP: ${affiliateLPPath}`);
  console.log(`📄 CVRデータ: ${cvrDataPath}\n`);

  try {
    // Grokを呼び出す
    console.log('📊 Grokにレビューを依頼中...');
    const grokResult = await callGrok41FastReasoning(grokPrompt, {
      temperature: 0.3,
      maxTokens: 4096
    });
    console.log('✅ Grok完了');

    // Geminiを呼び出す
    console.log('🎨 Geminiにレビューを依頼中...');
    const geminiResult = await callGemini3Pro(geminiPrompt, {
      thinkingLevel: 'high',
      temperature: 0.7,
      maxOutputTokens: 4096
    });
    console.log('✅ Gemini完了');

    // 結果を保存
    const timestamp = Date.now();
    const outputDir = join(__dirname, '..', 'hadayalab-website-dev', 'cryptotradeacademy-lp-dev', 'results', 'lp-reviews');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const grokOutputPath = join(outputDir, `grok-lp-file-review-${timestamp}.md`);
    const geminiOutputPath = join(outputDir, `gemini-lp-file-review-${timestamp}.md`);

    fs.writeFileSync(grokOutputPath, `# Grok LPファイルレビュー（厳格評価）

**生成日時**: ${new Date().toISOString()}
**レビュー対象**:
- ユーザー向けLP: app/[market]/page.tsx
- アフィリエイター向けLP: app/affiliate/[market]/page.tsx
- CVRデータ: lib/cvr-data.ts

---

${grokResult.text}
`);

    fs.writeFileSync(geminiOutputPath, `# Gemini LPファイルレビュー（マーケティング・CVR観点）

**生成日時**: ${new Date().toISOString()}
**レビュー対象**:
- ユーザー向けLP: app/[market]/page.tsx
- アフィリエイター向けLP: app/affiliate/[market]/page.tsx
- CVRデータ: lib/cvr-data.ts

---

${geminiResult.text}
`);

    console.log('\n✅ レビュー完了！');
    console.log(`📄 Grokレビュー: ${grokOutputPath}`);
    console.log(`📄 Geminiレビュー: ${geminiOutputPath}`);
    console.log('\n📊 Grokレビュー結果:');
    console.log('---');
    console.log(grokResult.text);
    console.log('\n🎨 Geminiレビュー結果:');
    console.log('---');
    console.log(geminiResult.text);

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  }
}

main();
