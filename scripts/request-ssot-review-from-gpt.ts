#!/usr/bin/env tsx
/**
 * SSOT Trap Defense BTCをCTO兼CPOのGPTに参照させて最新レビューを依頼するスクリプト
 */

import { callGPT52 } from "../../scripts/direct-ai-api";
import fs from "fs";
import { join } from "path";

async function main() {
  try {
    // SSOT Trap Defense BTCを読み込む
    const ssotPath = join(__dirname, "../docs/SSOT_TRAP_DEFENSE_BTC.md");
    const ssotContent = fs.readFileSync(ssotPath, "utf-8");
    
    // SSOTの最初の500行を取得（全体が長すぎる場合のため）
    const ssotPreview = ssotContent.split("\n").slice(0, 500).join("\n");
    const totalLines = ssotContent.split("\n").length;
    
    const REVIEW_PROMPT = `
あなたはCTO兼CPOのGPTです。COO兼エンジニアからSSOT Trap Defense BTCの最新レビューを依頼されました。

【SSOT Trap Defense BTC の内容（最初の500行、全${totalLines}行）】
${ssotPreview}

${totalLines > 500 ? `\n注意: このSSOTは全${totalLines}行あります。上記は最初の500行のみです。全体を確認する場合は、ファイル全体を参照してください。` : ""}

【レビュー依頼内容】
1. SSOT Trap Defense BTCの内容を確認し、戦略・技術・価格・実装・メッセージングの整合性を評価してください
2. プロダクトの3つのUSP（Trap Defense Engine、Gemini Content Generation、Dr. Grok's Psychological Support）の実装状況を評価してください
3. 価格設定（6市場別）の妥当性を評価してください
4. マーケティング戦略の効果性を評価してください
5. 技術実装の現状とSSOTとの整合性を評価してください
6. 改善提案があれば具体的に提示してください
7. プロダクトの競争優位性（ブルーオーシャン戦略）の実現可能性を評価してください

【追加情報】
- このSSOTは唯一の正しいSSOTとして確定されています（他のSSOTはアーカイブ済み）
- プロダクト名: Trap Defense BTC
- ブランド名: CryptoTradeAcademy
- タグライン: "70%の時間、何もするな。明確な優位性が出るまで防御。"

CTO兼CPOとして、戦略的・技術的・マーケティング的な観点から包括的なレビューを提供してください。
`;

    console.log("🤖 CTO兼CPOのGPTにSSOT Trap Defense BTCのレビューを依頼中...");
    console.log(`📄 SSOTファイル: ${ssotPath}`);
    console.log(`📊 総行数: ${totalLines}行`);
    console.log(`📝 レビュー用プレビュー: 最初の500行\n`);
    
    const result = await callGPT52(REVIEW_PROMPT, {
      reasoningEffort: "high",
      verbosity: "high",
      maxCompletionTokens: 3000,
    });
    
    console.log("\n" + "=".repeat(80));
    console.log("📝 CTO兼CPOのGPTからのSSOT Trap Defense BTCレビュー:");
    console.log("=".repeat(80));
    console.log(result.text);
    console.log("=".repeat(80));
    console.log("\n📊 使用量:", JSON.stringify(result.usage, null, 2));
    
    // レビュー結果をファイルに保存
    const reviewOutputPath = join(__dirname, "../docs/SSOT_TRAP_DEFENSE_BTC_GPT_REVIEW.md");
    const reviewContent = `# SSOT Trap Defense BTC - GPT（CTO兼CPO）レビュー

**レビュー日**: ${new Date().toISOString()}
**レビュアー**: GPT（CTO兼CPO）
**SSOTファイル**: docs/SSOT_TRAP_DEFENSE_BTC.md
**SSOT総行数**: ${totalLines}行

---

## 📝 レビュー内容

${result.text}

---

## 📊 API使用量

\`\`\`json
${JSON.stringify(result.usage, null, 2)}
\`\`\`
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
