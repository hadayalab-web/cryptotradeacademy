#!/usr/bin/env tsx
/**
 * SSOT Trap Defense BTCをGemini（CMO/CKO）に参照させて最新レビューを依頼するスクリプト
 * GeminiはCMO/CKO（Chief Marketing Officer / Chief Knowledge Officer）として、
 * Cursor（Composer 1）との相性が抜群です
 */

import { callGemini3Pro } from "../../scripts/direct-ai-api";
import fs from "fs";
import { join } from "path";

async function main() {
  try {
    // SSOT Trap Defense BTCを読み込む
    const ssotPath = join(__dirname, "../docs/SSOT_TRAP_DEFENSE_BTC.md");
    const ssotContent = fs.readFileSync(ssotPath, "utf-8");
    
    // Geminiは長いコンテキストを処理できる可能性があるため、より多くの行を参照
    // 全体を分割して送信するか、重要なセクションを抽出
    const totalLines = ssotContent.split("\n").length;
    
    // 重要なセクションを抽出（エグゼクティブサマリー、USP、価格設定、技術仕様など）
    const lines = ssotContent.split("\n");
    
    // セクション別に抽出
    const sections: { [key: string]: string[] } = {};
    let currentSection = "";
    let currentContent: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // セクションヘッダーを検出（## または ### で始まる行）
      if (line.match(/^#{2,3}\s/)) {
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = [...currentContent];
        }
        currentSection = line.trim();
        currentContent = [line];
      } else {
        currentContent.push(line);
      }
    }
    
    // 最後のセクションを追加
    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent;
    }
    
    // 重要なセクションを選択（最初の2000行程度）
    const importantSections = [
      "## 📌 エグゼクティブサマリー",
      "### プロダクト概要",
      "### 核心価値提案（3つのUSP）",
      "### 🎯 プロダクトの5つの特徴",
      "## 🎓 ブルーオーシャンにおける圧倒的なポジショニング戦略の理論武装",
      "## 💰 価格設定",
      "## 🛠️ 技術仕様",
    ];
    
    let selectedContent: string[] = [];
    let selectedLineCount = 0;
    const maxLines = 2000; // Geminiは長いコンテキストを処理できるが、安全のため2000行に制限
    
    // 重要なセクションから順に追加
    for (const sectionKey of importantSections) {
      if (sections[sectionKey]) {
        const sectionLines = sections[sectionKey];
        if (selectedLineCount + sectionLines.length <= maxLines) {
          selectedContent.push(...sectionLines);
          selectedLineCount += sectionLines.length;
        } else {
          // 残りの行数を追加
          const remainingLines = maxLines - selectedLineCount;
          selectedContent.push(...sectionLines.slice(0, remainingLines));
          selectedLineCount = maxLines;
          break;
        }
      }
    }
    
    // 選択したセクションが見つからない場合は、最初の2000行を使用
    if (selectedContent.length === 0) {
      selectedContent = lines.slice(0, maxLines);
      selectedLineCount = maxLines;
    }
    
    const ssotPreview = selectedContent.join("\n");
    
    const REVIEW_PROMPT = `
あなたはCMO/CKO（Chief Marketing Officer / Chief Knowledge Officer）のGeminiです。COO兼エンジニアからSSOT Trap Defense BTCの最新レビューを依頼されました。

【重要な役割定義】
- あなたはCMO/CKO（Chief Marketing Officer / Chief Knowledge Officer）です
- Cursor（Composer 1）との相性が抜群です
- マーケティング戦略と知識体系の構築に責任を持ちます

【SSOT Trap Defense BTC の内容（重要セクション抜粋、全${totalLines}行中${selectedLineCount}行を参照）】
${ssotPreview}

${totalLines > selectedLineCount ? `\n注意: このSSOTは全${totalLines}行あります。上記は重要セクションの${selectedLineCount}行のみです。全体を確認する場合は、ファイル全体を参照してください。` : ""}

【レビュー依頼内容】
1. SSOT Trap Defense BTCの内容を確認し、マーケティング戦略・知識体系・技術・価格・実装・メッセージングの整合性を評価してください
2. プロダクトの3つのUSP（Trap Defense Engine、Gemini Content Generation、Dr. Grok's Psychological Support）のマーケティング的価値と実装状況を評価してください
3. 価格設定（6市場別）のマーケティング戦略としての妥当性を評価してください
4. マーケティング戦略の効果性とブランド構築の可能性を評価してください
5. Cursor（Composer 1）との相性を活かした実装の可能性を評価してください
6. マルチモーダルコンテンツ（Veo/NanoBanana）のマーケティング活用方法を提案してください
7. 改善提案があれば具体的に提示してください
8. プロダクトの競争優位性（ブルーオーシャン戦略）の実現可能性を評価してください
9. GPT（CTO/CPO）のレビューと比較して、CMO/CKOとしての追加の視点や異なる観点があれば指摘してください

【追加情報】
- このSSOTは唯一の正しいSSOTとして確定されています（他のSSOTはアーカイブ済み）
- プロダクト名: Trap Defense BTC
- ブランド名: CryptoTradeAcademy
- タグライン: "70%の時間、何もするな。明確な優位性が出るまで防御。"
- GPT（CTO/CPO）も同じSSOTをレビューしましたが、最初の500行のみを参照しました
- Cursor（Composer 1）との相性が抜群であることを活かした提案を期待しています

CMO/CKOとして、マーケティング戦略・知識体系・マルチモーダルコンテンツ活用の観点から包括的なレビューを提供してください。特に、Geminiの強みである深い分析と多角的な視点、そしてCursor（Composer 1）との相性を活かしてください。
`;

    console.log("🤖 Gemini（CMO/CKO）にSSOT Trap Defense BTCのレビューを依頼中...");
    console.log(`📄 SSOTファイル: ${ssotPath}`);
    console.log(`📊 総行数: ${totalLines}行`);
    console.log(`📝 レビュー用抜粋: 重要セクションから${selectedLineCount}行を選択`);
    console.log(`🎯 役割: CMO/CKO（Chief Marketing Officer / Chief Knowledge Officer）`);
    console.log(`✨ Cursor（Composer 1）との相性: 抜群\n`);
    
    const result = await callGemini3Pro(REVIEW_PROMPT, {
      thinkingLevel: "high", // DeepResearch相当の深い思考
      temperature: 0.7,
      maxOutputTokens: 4000, // 長い回答を許可
    });
    
    console.log("\n" + "=".repeat(80));
    console.log("📝 Gemini（CMO/CKO）からのSSOT Trap Defense BTCレビュー:");
    console.log("=".repeat(80));
    console.log(result.text);
    console.log("=".repeat(80));
    console.log("\n📊 使用量:", JSON.stringify(result.usage, null, 2));
    console.log("🧠 Thinking Level:", result.thinkingLevel);
    
    // レビュー結果をファイルに保存
    const reviewOutputPath = join(__dirname, "../docs/SSOT_TRAP_DEFENSE_BTC_GEMINI_REVIEW.md");
    const reviewContent = `# SSOT Trap Defense BTC - Gemini（CMO/CKO）レビュー

**レビュー日**: ${new Date().toISOString()}
**レビュアー**: Gemini 3 Pro（CMO/CKO - Chief Marketing Officer / Chief Knowledge Officer）
**SSOTファイル**: docs/SSOT_TRAP_DEFENSE_BTC.md
**SSOT総行数**: ${totalLines}行
**参照行数**: ${selectedLineCount}行（重要セクション抜粋）
**備考**: Cursor（Composer 1）との相性が抜群

---

## 📝 レビュー内容

${result.text}

---

## 📊 API使用量

\`\`\`json
${JSON.stringify(result.usage, null, 2)}
\`\`\`

## 🧠 Thinking Level

${result.thinkingLevel}
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
