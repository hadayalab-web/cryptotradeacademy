#!/usr/bin/env tsx
/**
 * CMO: Gemini (Marketing) レビュー依頼スクリプト
 * 
 * api/unified-api.tsを使ってGemini: CMO（gemini-3-flash-preview）にレビューを依頼
 */

import { callGemini3Pro } from '../api/unified-api';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// .envファイルを読み込む
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// レビュー対象のドキュメントを読み込む
const projectRoot = join(__dirname, '..');
const whopArchitecturePrinciplesPath = join(projectRoot, 'docs', 'WHOP_CENTRIC_ARCHITECTURE_PRINCIPLES.md');

let whopArchitecturePrinciplesContent = '';

try {
  whopArchitecturePrinciplesContent = fs.readFileSync(whopArchitecturePrinciplesPath, 'utf-8');
} catch (error) {
  console.warn(`Failed to read WHOP_CENTRIC_ARCHITECTURE_PRINCIPLES.md: ${error}`);
  whopArchitecturePrinciplesContent = 'ファイルが見つかりませんでした';
}

const reviewPrompt = `あなたはCMO（Chief Marketing Officer）として、以下のWhop中心アーキテクチャの3つの基本原則について、マーケティング戦略の観点からレビューしてください。

## レビュー対象: Whop中心アーキテクチャ - 3つの基本原則

${whopArchitecturePrinciplesContent}

## レビュー依頼事項

CMOの視点から、以下の点についてレビューをお願いします：

1. **この3つの基本原則で十分か？**
   - マーケティング戦略の観点から、追加すべき原則はあるか？
   - 既存の原則に不足している要素はあるか？

2. **LPの実装状況は十分か？**
   - CVR最適化の観点から、改善すべき点はあるか？
   - アフィリエイターリクルートLPの効果は十分か？

3. **アフィリエイターリクルート戦略は効果的か？**
   - スカウト自動化ワークフローの効果は十分か？
   - Hidden Enemy × Island Invitationストーリーの効果は十分か？

4. **統合アーキテクチャは適切か？**
   - Whop中心のアーキテクチャは、マーケティング目標を達成するのに適切か？
   - 外部機能とLPの役割分担は明確か？

5. **その他の改善提案**
   - マーケティングの観点から、追加すべき要素はあるか？
   - CVR最適化の観点から、改善すべき点はあるか？

## 出力形式

以下の形式でレビュー結果を返してください：

# CMOレビュー: Whop中心アーキテクチャ - 3つの基本原則

## 📊 レビュー結果サマリー（総合評価）

## ✅ 評価: 十分な点

## ⚠️ 改善提案

## 🎯 結論（推奨アクション）

レビュー結果を日本語で、構造化された形式で返してください。`;

async function main() {
  try {
    console.log('📋 CMO: Gemini (Marketing)にレビューを依頼中...\n');
    
    const result = await callGemini3Pro(reviewPrompt, {
      thinkingLevel: 'high',
      temperature: 0.7,
      maxOutputTokens: 4000,
    });
    
    console.log('='.repeat(80));
    console.log('CMOレビュー結果');
    console.log('='.repeat(80));
    console.log('\n');
    console.log(result.text);
    console.log('\n');
    console.log('='.repeat(80));
    
    if (result.usage) {
      console.log('\n📊 使用量:');
      console.log(`  - Prompt Tokens: ${(result.usage as any).promptTokenCount || 'N/A'}`);
      console.log(`  - Completion Tokens: ${(result.usage as any).candidatesTokenCount || 'N/A'}`);
      console.log(`  - Total Tokens: ${(result.usage as any).totalTokenCount || 'N/A'}`);
      console.log(`  - Thinking Level: ${result.thinkingLevel || 'N/A'}`);
    }
    
    // 結果をファイルに保存
    const outputPath = join(__dirname, '..', 'docs', 'CMO_REVIEW_RESULT_WHOP_ARCHITECTURE_PRINCIPLES.md');
    const output = `# CMOレビュー結果: Whop中心アーキテクチャ - 3つの基本原則

**レビュー日**: ${new Date().toISOString()}  
**レビュー者**: Gemini: CMO (gemini-3-flash-preview)  
**依頼者**: COO: Cursor (Composer)

---

${result.text}

---

## 使用量

${result.usage ? `
- Prompt Tokens: ${(result.usage as any).promptTokenCount || 'N/A'}
- Completion Tokens: ${(result.usage as any).candidatesTokenCount || 'N/A'}
- Total Tokens: ${(result.usage as any).totalTokenCount || 'N/A'}
- Thinking Level: ${result.thinkingLevel || 'N/A'}
` : 'N/A'}

---

**最終更新**: ${new Date().toISOString()}
`;
    
    fs.writeFileSync(outputPath, output, 'utf-8');
    console.log(`\n✅ レビュー結果を保存しました: ${outputPath}`);
    
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
