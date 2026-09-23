#!/usr/bin/env tsx
/**
 * CMO: Gemini (Marketing) レビュー依頼スクリプト
 * 
 * api/unified-api.tsを使ってGemini: CMO（gemini-3-flash-preview）に
 * COOのアフィリエイター募集フロー改善策をレビューしてもらう
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
const cooReviewPath = join(projectRoot, 'docs', 'COO_REVIEW_AFFILIATE_RECRUITMENT_FLOW.md');
const whopArchitecturePath = join(projectRoot, 'docs', 'WHOP_CENTRIC_ARCHITECTURE_PRINCIPLES.md');
const affiliateTrackingFlowPath = join(projectRoot, 'docs', 'AFFILIATE_TRACKING_FLOW_COMPLETE.md');

let cooReviewContent = '';
let whopArchitectureContent = '';
let affiliateTrackingFlowContent = '';

try {
  cooReviewContent = fs.readFileSync(cooReviewPath, 'utf-8');
} catch (error) {
  console.warn(`Failed to read COO_REVIEW_AFFILIATE_RECRUITMENT_FLOW.md: ${error}`);
  cooReviewContent = 'ファイルが見つかりませんでした';
}

try {
  whopArchitectureContent = fs.readFileSync(whopArchitecturePath, 'utf-8');
} catch (error) {
  console.warn(`Failed to read WHOP_CENTRIC_ARCHITECTURE_PRINCIPLES.md: ${error}`);
  whopArchitectureContent = 'ファイルが見つかりませんでした';
}

try {
  affiliateTrackingFlowContent = fs.readFileSync(affiliateTrackingFlowPath, 'utf-8');
} catch (error) {
  console.warn(`Failed to read AFFILIATE_TRACKING_FLOW_COMPLETE.md: ${error}`);
  affiliateTrackingFlowContent = 'ファイルが見つかりませんでした';
}

const reviewPrompt = `あなたはCMO（Chief Marketing Officer）として、COO（Cursor/Composer 1）が作成したアフィリエイター募集フローの改善策について、マーケティング戦略の観点からレビューしてください。

## レビュー対象: COOのアフィリエイター募集フロー改善策

### COOレビュー結果
${cooReviewContent}

### Whop中心アーキテクチャの原則（参考）
${whopArchitectureContent}

### アフィリエイトトラッキング完全フロー（参考）
${affiliateTrackingFlowContent}

## レビュー依頼事項

CMOの視点から、以下の点についてレビューをお願いします：

1. **改善後のフローはマーケティング戦略として適切か？**
   - アフィリエイターリクルートの効果は十分か？
   - CVR最適化の観点から、改善すべき点はあるか？

2. **DM送信のタイミングと内容は適切か？**
   - ステップ2でリクルートLPへのリンクのみを送信するのは効果的か？
   - アフィリエイトリンクを後から送信するのは適切か？

3. **リクルートLPでの登録フォームは効果的か？**
   - 登録フォームのUI/UXは最適化されているか？
   - コンバージョン率を向上させる改善案はあるか？

4. **アフィリエイター登録の自動化は適切か？**
   - Puppeteer自動化でWhopダッシュボードに登録するのは効果的か？
   - 大規模運用（毎日50人×6市場 = 300人）に対応できるか？

5. **アフィリエイトリンク生成と送信のタイミングは適切か？**
   - 登録完了後すぐにリンクを送信するのは効果的か？
   - アフィリエイターのエンゲージメントを高める改善案はあるか？

6. **その他の改善提案**
   - マーケティングの観点から、追加すべき要素はあるか？
   - CVR最適化の観点から、改善すべき点はあるか？
   - アフィリエイターのリテンションを高める施策はあるか？

## 出力形式

以下の形式でレビュー結果を返してください：

# CMOレビュー: アフィリエイター募集フロー改善策

## 📊 レビュー結果サマリー（総合評価）

## ✅ 評価: 十分な点

## ⚠️ 改善提案

## 🎯 結論（推奨アクション）

レビュー結果を日本語で、構造化された形式で返してください。`;

async function main() {
  try {
    console.log('📋 CMO: Gemini (Marketing)にCOOの改善策をレビュー依頼中...\n');
    
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
    const outputPath = join(__dirname, '..', 'docs', 'CMO_REVIEW_RESULT_AFFILIATE_RECRUITMENT_FLOW.md');
    const output = `# CMOレビュー結果: アフィリエイター募集フロー改善策

**レビュー日**: ${new Date().toISOString()}  
**レビュー者**: Gemini: CMO (gemini-3-flash-preview)  
**依頼者**: COO: Cursor (Composer 1)  
**レビュー対象**: COOのアフィリエイター募集フロー改善策

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
