#!/usr/bin/env tsx
/**
 * Phase 1-4の実装状況をGPT（CTO/CPO）にレビューしてもらうスクリプト
 */

import { callGPT52 } from '../../scripts/direct-ai-api';
import fs from 'fs';
import { join } from 'path';

async function main() {
  try {
    // 実装完了報告を読み込む
    const phase1Report = fs.readFileSync(join(__dirname, '../docs/FINAL_IMPLEMENTATION_PLAN_COO_DECISION.md'), 'utf-8');
    const phase3Report = fs.readFileSync(join(__dirname, '../docs/PHASE3_IMPLEMENTATION_COMPLETE.md'), 'utf-8');
    const phase4Report = fs.readFileSync(join(__dirname, '../docs/PHASE4_IMPLEMENTATION_COMPLETE.md'), 'utf-8');

    // 主要な実装ファイルの変更点を確認
    const implementationFiles = [
      'api/cron.js',
      'logic/core/signalQualityGate.js',
      'logic/core/trapDetector.js',
      'logic/core/divergenceDetector.js',
      'logic/eventTriggers.js',
      'services/gpt/client.js',
      'services/grok/client.js',
      'services/cryptoquant/capabilities.js',
      'services/cryptoquant/snapshot.js',
      'services/cryptoquant/client.js',
      'services/cryptoquant/rateLimiter.js',
      'services/binance/liquidations.js',
      'api/config/pricing.js',
    ];

    const REVIEW_PROMPT = `
あなたはCTO兼CPOのGPTです。COO兼エンジニアから、Phase 1-4の実装完了報告を受け取りました。

【実装完了報告】

Phase 1: 緊急修正
${phase1Report.split('\n').slice(0, 200).join('\n')}
... (以下省略)

Phase 3: CryptoQuant最適化
${phase3Report.split('\n').slice(0, 200).join('\n')}
... (以下省略)

Phase 4: SSOT完全準拠
${phase4Report.split('\n').slice(0, 200).join('\n')}
... (以下省略)

【実装ファイル一覧】
${implementationFiles.map(f => `- ${f}`).join('\n')}

【レビュー依頼内容】
CTO兼CPOとして、以下の観点からPhase 1-4の実装状況をレビューしてください：

1. **SSOT準拠状況の評価**
   - SSOT Trap Defense BTCの要件がコードに完全に反映されているか
   - 3つのUSP（Trap Defense Engine, Gemini Content Generation, Dr. Grok's Psychological Support）の実装状況
   - 統一品質ゲート（trapScore>=60 & multipleDivergences>=3）の実装状況
   - BUY/SELL/LONG/SHORTの完全削除とAVOID_LONG/AVOID_SHORT/STANDBYへの置き換え
   - 用語統一（BUG_STANDBY → TRAP_STANDBY）

2. **技術的実装の品質評価**
   - Phase 1: 緊急修正（未定義変数、スコープ問題、統一品質ゲート、用語統一、BUY/SELL削除）
   - Phase 2: モデル最適化（GPT/Grokモデルの用途別選択、開発/本番環境分離）
   - Phase 3: CryptoQuant最適化（404エンドポイント機能フラグ、getCQSnapshot()集約、キャッシュ導入、分散レート制限）
   - Phase 4: SSOT完全準拠（EMERGENCY/WATCH/STANDBY_BREAKトリガー、価格テーブル）

3. **アーキテクチャと設計の評価**
   - コードの保守性、拡張性、テスト容易性
   - エラーハンドリングとフォールバック戦略
   - パフォーマンス最適化（キャッシュ、レート制限、並列処理）

4. **SSOTとの整合性評価**
   - SSOTで定義されている技術仕様がコードに正確に反映されているか
   - 不足している実装や改善が必要な箇所
   - SSOTの要件とコードの実装が不一致な箇所

5. **総合評価と推奨事項**
   - 実装の完成度（0-100点で評価）
   - 本番環境へのデプロイ準備状況
   - 追加で必要な改善や修正事項
   - 次のステップの推奨事項

【追加情報】
- このSSOTは唯一の正しいSSOTとして確定されています
- プロダクト名: Trap Defense BTC
- ブランド名: CryptoTradeAcademy
- タグライン: "70%の時間、何もするな。明確な優位性が出るまで防御。"
- 開発環境ではGPT/Grok/Geminiともハイエンドモデルを選択してComposer（COO兼エンジニア）をサポートする方針です

CTO兼CPOとして、技術的・実装的な観点から、Phase 1-4の実装状況を徹底的にレビューし、CEOへの報告用に詳細な評価を提供してください。
`;

    console.log("🤖 GPT（CTO/CPO）にPhase 1-4の実装状況レビューを依頼中...");
    console.log(`📄 実装ファイル数: ${implementationFiles.length}ファイル`);
    console.log();

    const result = await callGPT52(REVIEW_PROMPT, {
      // reasoningEffort: "high", // GPT-5.2では未対応の可能性があるためコメントアウト
      // verbosity: "high", // GPT-5.2では未対応の可能性があるためコメントアウト
      maxCompletionTokens: 4000,
    });

    console.log("\n" + "=".repeat(80));
    console.log("📝 GPT（CTO/CPO）からのPhase 1-4実装状況レビュー:");
    console.log("=".repeat(80));
    console.log(result.text);
    console.log("=".repeat(80));
    console.log("\n📊 使用量:", JSON.stringify(result.usage, null, 2));

    // レビュー結果をファイルに保存
    const reviewOutputPath = join(__dirname, '../docs/PHASE1_4_IMPLEMENTATION_REVIEW_GPT.md');
    const reviewContent = `# Phase 1-4 実装状況レビュー（GPT CTO/CPO）

**レビュー日**: ${new Date().toISOString()}
**レビュアー**: GPT（CTO/CPO）
**実装者**: COO（Cursor/Composer）
**実装ファイル数**: ${implementationFiles.length}ファイル

---

## 📝 レビュー結果

${result.text}

---

## 📊 API使用量

\`\`\`json
${JSON.stringify(result.usage, null, 2)}
\`\`\`

## 📋 実装ファイル一覧

${implementationFiles.map(section => `- ${section}`).join("\n")}
`;

    fs.writeFileSync(reviewOutputPath, reviewContent, "utf-8");
    console.log(`\n💾 レビュー結果を保存しました: ${reviewOutputPath}`);

  } catch (error: any) {
    console.error("❌ エラー:", error.message);
    if (error.response) {
      console.error("APIレスポンス:", JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
