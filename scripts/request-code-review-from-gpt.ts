#!/usr/bin/env tsx
/**
 * GPT（CTO/CPO）にコードレビューを依頼するスクリプト
 * SSOT Trap Defense BTCの主要コードファイルの品質と実装をレビューしてもらう
 */

import { callGPT52 } from "../../scripts/direct-ai-api";
import fs from "fs";
import { join } from "path";

async function main() {
  try {
    // 主要なコードファイルを読み込む
    const codeFiles = {
      "api/cron.js": {
        path: join(__dirname, "../api/cron.js"),
        description: "メインの定期配信・緊急配信API。USP1/2/3の統合実装",
        lines: 1616,
      },
      "logic/core/trapDetector.js": {
        path: join(__dirname, "../logic/core/trapDetector.js"),
        description: "USP1: Trap Defense Engineの核心ロジック",
        lines: 192,
      },
      "services/grok/psychologicalSupport.js": {
        path: join(__dirname, "../services/grok/psychologicalSupport.js"),
        description: "USP3: Dr. Grok's Psychological Supportの実装",
        lines: 566,
      },
      "services/gemini/imageGenerator.js": {
        path: join(__dirname, "../services/gemini/imageGenerator.js"),
        description: "USP2: Gemini NanoBanana Pro画像生成",
        lines: 91,
      },
      "services/gemini/videoGenerator.js": {
        path: join(__dirname, "../services/gemini/videoGenerator.js"),
        description: "USP2: Gemini Veo 3.1動画生成",
        lines: 200,
      },
      "services/telegram/messages/user/en/regular.en.js": {
        path: join(__dirname, "../services/telegram/messages/user/en/regular.en.js"),
        description: "ニュース番組構造のメッセージフォーマット（EN市場）",
        lines: 375,
      },
    };
    
    // GPT-5.2は約40万トークンのコンテキストウィンドウを持つため、ファイル全体を渡す
    const codeSnippets: { [key: string]: string } = {};
    
    for (const [fileName, fileInfo] of Object.entries(codeFiles)) {
      try {
        const content = fs.readFileSync(fileInfo.path, "utf-8");
        // ファイル全体を読み込む（GPT-5.2の長いコンテキストウィンドウを活用）
        codeSnippets[fileName] = content;
      } catch (error: any) {
        codeSnippets[fileName] = `// Error reading file: ${error.message}`;
      }
    }
    
    // SSOTの核心要件も含める（GPT-5.2の長いコンテキストウィンドウを活用）
    const ssotPath = join(__dirname, "../docs/SSOT_TRAP_DEFENSE_BTC.md");
    const ssotContent = fs.readFileSync(ssotPath, "utf-8");
    // SSOT全体を渡す（GPT-5.2は約40万トークンまで処理可能）
    const ssotKeySections = ssotContent;
    
    const CODE_REVIEW_PROMPT = `
あなたはCTO兼CPOのGPTです。COO兼エンジニアから、SSOT Trap Defense BTCのコードレビューを依頼されました。

【SSOT Trap Defense BTC の核心要件（抜粋）】
${ssotKeySections}

【レビュー対象コードファイル】

${Object.entries(codeSnippets).map(([fileName, content]) => `
=== ${fileName} ===
${codeFiles[fileName as keyof typeof codeFiles].description}
総行数: ${codeFiles[fileName as keyof typeof codeFiles].lines}行

\`\`\`javascript
${content}
\`\`\`
`).join("\n\n")}

【コードレビュー依頼内容】
CTO兼CPOとして、以下の観点からコードレビューを実施してください：

1. **コード品質とアーキテクチャ**
   - コードの可読性、保守性、拡張性
   - アーキテクチャの一貫性と設計パターンの適切性
   - エラーハンドリングと堅牢性

2. **SSOTとの整合性**
   - SSOTで定義された要件がコードに正確に反映されているか
   - USP1/2/3の実装がSSOTの仕様通りか
   - メッセージング（「70%の時間、何もするな」）がコードに反映されているか

3. **パフォーマンスと最適化**
   - API呼び出しの効率性（CryptoQuant、Grok、Gemini）
   - レート制限対策とリトライロジック
   - メモリ使用量と処理時間の最適化

4. **セキュリティとベストプラクティス**
   - APIキーの管理と環境変数の使用
   - 入力検証とサニタイゼーション
   - エラーメッセージの情報漏洩リスク

5. **実装の改善提案**
   - リファクタリングが必要な箇所
   - コードの重複やDRY原則違反
   - テストカバレッジの不足箇所

6. **技術的負債とリスク**
   - 将来の拡張性を阻害する可能性のある実装
   - パフォーマンスボトルネックの可能性
   - 保守性の観点からの懸念点

【追加情報】
- プロダクト名: Trap Defense BTC
- ブランド名: CryptoTradeAcademy
- タグライン: "70%の時間、何もするな。明確な優位性が出るまで防御。"
- プラットフォーム: Vercel（Serverless Functions）
- 6市場対応: EN/ES/PT-BR/AR/JA/KO

CTO兼CPOとして、技術的・実装的な観点から、建設的で具体的なコードレビューを提供してください。特に、SSOTとの整合性と、実運用での堅牢性を重視してください。
`;

    console.log("🤖 GPT（CTO/CPO）にコードレビューを依頼中...");
    console.log(`📋 レビュー対象ファイル: ${Object.keys(codeFiles).length}ファイル\n`);
    Object.entries(codeFiles).forEach(([fileName, fileInfo]) => {
      console.log(`  - ${fileName} (${fileInfo.lines}行): ${fileInfo.description}`);
    });
    console.log();
    
    const result = await callGPT52(CODE_REVIEW_PROMPT, {
      reasoningEffort: "high",
      verbosity: "high",
      maxCompletionTokens: 4000,
    });
    
    console.log("\n" + "=".repeat(80));
    console.log("📝 GPT（CTO/CPO）からのコードレビュー結果:");
    console.log("=".repeat(80));
    console.log(result.text);
    console.log("=".repeat(80));
    console.log("\n📊 使用量:", JSON.stringify(result.usage, null, 2));
    
    // レビュー結果をファイルに保存
    const reviewOutputPath = join(__dirname, "../docs/SSOT_TRAP_DEFENSE_BTC_CODE_REVIEW_GPT.md");
    const reviewContent = `# SSOT Trap Defense BTC - コードレビュー（GPT CTO/CPO）

**レビュー日**: ${new Date().toISOString()}
**レビュアー**: GPT（CTO/CPO）
**SSOTファイル**: docs/SSOT_TRAP_DEFENSE_BTC.md

---

## 📋 レビュー対象ファイル

${Object.entries(codeFiles).map(([fileName, fileInfo]) => 
  `- **\`${fileName}\`** (${fileInfo.lines}行): ${fileInfo.description}`
).join("\n")}

---

## 📝 コードレビュー結果

${result.text}

---

## 📊 API使用量

\`\`\`json
${JSON.stringify(result.usage, null, 2)}
\`\`\`
`;
    
    fs.writeFileSync(reviewOutputPath, reviewContent, "utf-8");
    console.log(`\n💾 コードレビュー結果を保存しました: ${reviewOutputPath}`);
    
  } catch (error: any) {
    console.error("❌ エラー:", error.message);
    if (error.response) {
      console.error("APIレスポンス:", JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
