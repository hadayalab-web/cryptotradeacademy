#!/usr/bin/env tsx
/**
 * CMOレビュー実行スクリプト
 * api/unified-api.tsを使用してGemini APIを呼び出し、CMOレビューを実行
 */

import { callGemini3Pro } from '../api/unified-api.js';
import * as fs from 'fs';
import * as path from 'path';

const reviewPrompt = `あなたはCMO（Chief Marketing Officer）として、以下のWhop中心アーキテクチャの3つの基本原則について、マーケティング戦略の観点からレビューしてください。

## レビュー対象: Whop中心アーキテクチャ - 3つの基本原則

### 1. Whop APIで制御できないことは外部機能を配置
- PuppeteerによるWhopダッシュボード自動化（アフィリエイター作成）
- アフィリエイタースカウト自動化ワークフロー（候補検索・分析・DM送信）

### 2. Whopの表現不足をLPで強化
- ユーザー向けLP: Two Young Menストーリー + CVR最適化 + Whop Checkout統合
- アフィリエイターリクルートLP: Hidden Enemy × Island Invitationストーリー + AFFILIATE_COPY_DATA統合
- 6言語対応: EN, AR, ES, JA, KO, PT-BR
- 統合機能: VSL統合、登録フォーム、CVR_DATA統合

### 3. Whop BotがユーザーのTelegramチャットグループ管理を担当
- メンバーシップ有効化時: 自動的にTelegramチャットグループに追加
- メンバーシップキャンセル時: 自動的にTelegramチャットグループから削除
- 6言語別のTelegramチャットグループ管理

## 実装状況
- ✅ PuppeteerによるWhopダッシュボード自動化（実装済み）
- ✅ アフィリエイタースカウト自動化ワークフロー（実装済み）
- ✅ ユーザー向けLP（7プロジェクト × 6言語 = 42 LP）（実装済み）
- ✅ アフィリエイターリクルートLP（実装済み）
- ✅ CVR_DATA / AFFILIATE_COPY_DATA統合（実装済み）
- ✅ Whop Checkout統合（実装済み）
- ✅ Whop BotによるTelegramチャットグループ管理（設定済み）

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

レビュー結果は、マークダウン形式で構造化して出力してください。以下のセクションを含めてください：
- 📊 レビュー結果サマリー（総合評価）
- ✅ 評価: 十分な点
- ⚠️ 改善提案
- 🎯 結論（推奨アクション）`;

async function main() {
  try {
    console.log('🤖 CMO (gemini-3-flash-preview) レビューを実行中...\n');
    
    const result = await callGemini3Pro(reviewPrompt, {
      thinkingLevel: 'high',
      temperature: 0.7,
      maxOutputTokens: 4000
    });

    console.log('📝 CMOレビュー結果:\n');
    console.log(result.text);
    console.log('\n📊 使用量:', result.usage);
    console.log('🧠 Thinking Level:', result.thinkingLevel);
    
    // 結果をファイルに保存
    const outputPath = join(__dirname, '..', 'docs', 'CMO_REVIEW_RESULT_WHOP_ARCHITECTURE_PRINCIPLES.md');
    
    const outputContent = `# CMOレビュー結果: Whop中心アーキテクチャ - 3つの基本原則

**レビュー日**: ${new Date().toISOString().split('T')[0]}  
**レビュー担当**: CMO (gemini-3-flash-preview)  
**レビュー対象**: \`docs/WHOP_CENTRIC_ARCHITECTURE_PRINCIPLES.md\`

---

${result.text}

---

**レビュー担当**: CMO (gemini-3-flash-preview)  
**レビュー日**: ${new Date().toISOString().split('T')[0]}  
**ステータス**: ✅ レビュー完了
**使用量**: ${JSON.stringify(result.usage, null, 2)}
**Thinking Level**: ${result.thinkingLevel}
`;

    fs.writeFileSync(outputPath, outputContent, 'utf-8');
    console.log(`\n✅ レビュー結果を保存しました: ${outputPath}`);
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  }
}

main();
