#!/usr/bin/env tsx
/**
 * SSOT Trap Defense BTCがコードに完全に再現されているかどうかを
 * GPT（CTO/CPO）に最終チェックしてもらうスクリプト
 */

import { callGPT52 } from "../../scripts/direct-ai-api";
import fs from "fs";
import { join } from "path";

async function main() {
  try {
    // SSOT Trap Defense BTCを読み込む（GPT-5.2の長いコンテキストウィンドウを活用）
    const ssotPath = join(__dirname, "../docs/SSOT_TRAP_DEFENSE_BTC.md");
    const ssotContent = fs.readFileSync(ssotPath, "utf-8");
    const totalLines = ssotContent.split("\n").length;
    
    // GPT-5.2は約40万トークンのコンテキストウィンドウを持つため、SSOT全体を渡す
    const ssotKeySections = ssotContent;
    
    // 主要なコードファイルを全体で読み込む（GPT-5.2の長いコンテキストウィンドウを活用）
    const codeFiles = {
      "api/cron.js": {
        path: join(__dirname, "../api/cron.js"),
        description: "メインの定期配信・緊急配信API。USP1/2/3の統合実装",
      },
      "logic/core/trapDetector.js": {
        path: join(__dirname, "../logic/core/trapDetector.js"),
        description: "USP1: Trap Defense Engineの核心ロジック",
      },
      "logic/core/divergenceDetector.js": {
        path: join(__dirname, "../logic/core/divergenceDetector.js"),
        description: "USP1: 複数ダイバージェンス検出ロジック",
      },
      "services/grok/psychologicalSupport.js": {
        path: join(__dirname, "../services/grok/psychologicalSupport.js"),
        description: "USP3: Dr. Grok's Psychological Supportの実装",
      },
      "services/grok/client.js": {
        path: join(__dirname, "../services/grok/client.js"),
        description: "USP1/3: Grok Xセンチメント解析",
      },
      "services/grok/highResolution.js": {
        path: join(__dirname, "../services/grok/highResolution.js"),
        description: "USP1: Grok X高解像度解析",
      },
      "services/gemini/imageGenerator.js": {
        path: join(__dirname, "../services/gemini/imageGenerator.js"),
        description: "USP2: Gemini NanoBanana Pro画像生成",
      },
      "services/gemini/videoGenerator.js": {
        path: join(__dirname, "../services/gemini/videoGenerator.js"),
        description: "USP2: Gemini Veo 3.1動画生成",
      },
      "services/telegram/messages/user/en/regular.en.js": {
        path: join(__dirname, "../services/telegram/messages/user/en/regular.en.js"),
        description: "ニュース番組構造のメッセージフォーマット（EN市場）",
      },
      "services/cryptoquant/highResolution.js": {
        path: join(__dirname, "../services/cryptoquant/highResolution.js"),
        description: "USP1: CryptoQuant高解像度データ取得（複数時間窓分析）",
      },
    };
    
    // ファイル全体を読み込む
    const codeSnippets: { [key: string]: string } = {};
    for (const [fileName, fileInfo] of Object.entries(codeFiles)) {
      try {
        const content = fs.readFileSync(fileInfo.path, "utf-8");
        codeSnippets[fileName] = content;
      } catch (error: any) {
        codeSnippets[fileName] = `// Error reading file: ${error.message}`;
      }
    }
    
    const VERIFICATION_PROMPT = `
あなたはCTO兼CPOのGPTです。COO兼エンジニアから、SSOT Trap Defense BTCがコードに完全に再現されているかどうかの最終チェックを依頼されました。

GPT-5.2の長いコンテキストウィンドウ（約40万トークン）を活用して、SSOT全体とコード全体を確認してください。

【SSOT Trap Defense BTC の全体（全${totalLines}行）】
\`\`\`markdown
${ssotKeySections}
\`\`\`

【現在のコード実装（ファイル全体）】

${Object.entries(codeSnippets).map(([fileName, content]) => `
=== ${fileName} ===
${codeFiles[fileName as keyof typeof codeFiles].description}

\`\`\`javascript
${content}
\`\`\`
`).join("\n\n")}

【最終チェック依頼内容】
1. SSOT Trap Defense BTCの3つのUSPがコードに完全に実装されているか確認してください
   - USP1: Trap Defense Engine（CryptoQuant + Grok X統合、AVOID_LONG/AVOID_SHORT/STANDBYアラート生成）
   - USP2: Gemini Content Generation（NanoBanana Pro画像生成、Veo 3.1動画生成）
   - USP3: Dr. Grok's Psychological Support（Xセンチメント分析 + 心理的サポート診断）

2. SSOTで定義されている技術仕様がコードに正確に反映されているか確認してください
   - トラップスコア60以上 + 複数ダイバージェンス3つ以上同時発生の条件
   - 複数時間窓分析（hour, 4hour, day）
   - ニュース番組構造（Opening → Data Presentation → Commentator → Closing）

3. SSOTで定義されているメッセージングがコードに反映されているか確認してください
   - 「70%の時間、何もするな」というタグラインの実装
   - BUY/SELL/LONG/SHORTの完全削除
   - AVOID_LONG、AVOID_SHORT、STANDBYのみのアラート生成

4. 価格設定（6市場別）の実装状況を確認してください
   - 6独立デプロイメントの実装
   - 市場別の価格設定

5. 不足している実装や改善が必要な箇所を具体的に指摘してください
   - SSOTで定義されているがコードに実装されていない機能
   - SSOTの要件とコードの実装が不一致な箇所
   - 改善が必要な実装箇所

6. コードの品質とSSOTとの整合性を総合的に評価してください

【追加情報】
- このSSOTは唯一の正しいSSOTとして確定されています
- プロダクト名: Trap Defense BTC
- ブランド名: CryptoTradeAcademy
- タグライン: "70%の時間、何もするな。明確な優位性が出るまで防御。"
- Gemini（CMO/CKO）もレビュー済みで、Cursor（Composer 1）との相性が抜群と評価されています

CTO兼CPOとして、技術的・実装的な観点から、SSOTとコードの整合性を徹底的に検証し、取りこぼしのないよう完璧な最終チェックを実施してください。いよいよ大詰めのフェーズです。
`;

    console.log("🤖 GPT（CTO/CPO）にSSOT Trap Defense BTCのコード実装最終チェックを依頼中...");
    console.log(`📄 SSOTファイル: ${ssotPath}`);
    console.log(`📊 SSOT総行数: ${totalLines}行（全体を確認）`);
    console.log(`💻 コードファイル確認: ${Object.keys(codeSnippets).length}ファイル（全体を確認）`);
    Object.entries(codeFiles).forEach(([fileName, fileInfo]) => {
      const lines = codeSnippets[fileName]?.split("\n").length || 0;
      console.log(`  - ${fileName} (${lines}行): ${fileInfo.description}`);
    });
    console.log();
    
    // GPT-5.2のAPIがreasoningパラメータをサポートしていない可能性があるため、一旦シンプルに
    const result = await callGPT52(VERIFICATION_PROMPT, {
      // reasoningEffort: "high", // APIがサポートするまで一時的に無効化
      // verbosity: "high", // APIがサポートするまで一時的に無効化
      maxCompletionTokens: 8000, // 詳細なレビューのため増量
    });
    
    console.log("\n" + "=".repeat(80));
    console.log("📝 GPT（CTO/CPO）からのSSOT Trap Defense BTCコード実装最終チェック結果:");
    console.log("=".repeat(80));
    console.log(result.text);
    console.log("=".repeat(80));
    console.log("\n📊 使用量:", JSON.stringify(result.usage, null, 2));
    
    // レビュー結果をファイルに保存
    const reviewOutputPath = join(__dirname, "../docs/SSOT_TRAP_DEFENSE_BTC_CODE_VERIFICATION_GPT.md");
    const reviewContent = `# SSOT Trap Defense BTC - コード実装最終チェック（GPT CTO/CPO）

**レビュー日**: ${new Date().toISOString()}
**レビュアー**: GPT（CTO/CPO）
**SSOTファイル**: docs/SSOT_TRAP_DEFENSE_BTC.md
**SSOT総行数**: ${totalLines}行（全体を確認）
**確認コードファイル数**: ${Object.keys(codeSnippets).length}ファイル（全体を確認）

---

## 📝 最終チェック結果

${result.text}

---

## 📊 API使用量

\`\`\`json
${JSON.stringify(result.usage, null, 2)}
\`\`\`

## 📋 確認したコードファイル

${Object.entries(codeFiles).map(([fileName, fileInfo]) => {
  const lines = codeSnippets[fileName]?.split("\n").length || 0;
  return `- **\`${fileName}\`** (${lines}行): ${fileInfo.description}`;
}).join("\n")}
`;
    
    fs.writeFileSync(reviewOutputPath, reviewContent, "utf-8");
    console.log(`\n💾 最終チェック結果を保存しました: ${reviewOutputPath}`);
    
  } catch (error: any) {
    console.error("❌ エラー:", error.message);
    if (error.response) {
      console.error("APIレスポンス:", JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
