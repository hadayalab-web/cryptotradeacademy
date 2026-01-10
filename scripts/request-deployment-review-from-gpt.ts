#!/usr/bin/env tsx
/**
 * Step 1-2実装完了報告とデプロイ前レビュー依頼スクリプト
 * GPT（CTO/CPO）に実装完了報告とレビューを依頼し、デプロイエラーが発生しないように担保する
 */

import { callGPT52 } from "../../scripts/direct-ai-api";
import fs from "fs";
import { join } from "path";

async function main() {
  try {
    // 実装完了したファイルのリスト
    const implementedFiles = {
      "services/gpt/client.js": {
        path: join(__dirname, "../services/gpt/client.js"),
        description: "JSON出力スキーマ検証（zod）+ フェイルクローズ実装",
        changes: [
          "GPTAnalysisSchema（zod）を追加",
          "JSONパース後にスキーマ検証を実装",
          "検証失敗時はDEFAULT_STANDBY_RESPONSEを返す（フェイルクローズ）",
        ],
      },
      "services/cryptoquant/rateLimiter.js": {
        path: join(__dirname, "../services/cryptoquant/rateLimiter.js"),
        description: "KV不調時のレート制限フォールバック強化（ローカル最小制限）",
        changes: [
          "ローカルレート制限（メモリベース）を実装",
          "KV不調時はローカル最小制限にフォールバック（Professional: 10 req/min, Premium: 30 req/min）",
          "プロセス単位のレート制限を実現",
        ],
      },
      "services/cryptoquant/client.js": {
        path: join(__dirname, "../services/cryptoquant/client.js"),
        description: "EMERGENCY判定指標のキャッシュバイパス対応",
        changes: [
          "fetchCryptoQuantにskipCacheオプションを追加",
          "skipCache=trueの場合はキャッシュをスキップして常に最新データを取得",
        ],
      },
      "services/cryptoquant/deepMetrics.js": {
        path: join(__dirname, "../services/cryptoquant/deepMetrics.js"),
        description: "EMERGENCY判定指標のキャッシュバイパス対応",
        changes: [
          "getLiquidationsとgetWhaleFlowsにskipCacheオプションを追加",
          "getCQDeepMetricsにskipCacheオプションを追加",
        ],
      },
      "services/cryptoquant/highResolution.js": {
        path: join(__dirname, "../services/cryptoquant/highResolution.js"),
        description: "EMERGENCY判定指標のキャッシュバイパス対応",
        changes: [
          "getHighResolutionCQDataにskipCacheオプションを追加",
          "getExchangeNetflowMultiTimeframeとgetMPIMultiTimeframeにskipCacheオプションを追加",
        ],
      },
      "api/cron.js": {
        path: join(__dirname, "../api/cron.js"),
        description: "EMERGENCY判定指標のキャッシュバイパス統合",
        changes: [
          "イベント駆動配信時にskipCache: trueを設定",
          "EMERGENCY判定指標（trapScore, liquidations, kimchiPremium）は常に最新データを使用",
        ],
      },
      "logic/eventTriggers.js": {
        path: join(__dirname, "../logic/eventTriggers.js"),
        description: "SSOT閾値統一（trapScore >= 60）",
        changes: [
          "EMERGENCYトリガーのtrapScore閾値を>=60に統一（品質ゲートと統一）",
        ],
      },
      "scripts/lint-forbidden-words.js": {
        path: join(__dirname, "../scripts/lint-forbidden-words.js"),
        description: "禁止語lint実装",
        changes: [
          "buy/sell/long/shortの検出スクリプトを実装",
          "例外パターンを定義（APIエンドポイント名、テンプレート表示など）",
        ],
      },
    };

    // 実装ファイルの内容を読み込む（デプロイエラー検出のため）
    const fileContents: { [key: string]: string } = {};
    for (const [fileName, fileInfo] of Object.entries(implementedFiles)) {
      try {
        fileContents[fileName] = fs.readFileSync(fileInfo.path, "utf-8");
      } catch (error: any) {
        fileContents[fileName] = `// Error reading file: ${error.message}`;
      }
    }

    const DEPLOYMENT_REVIEW_PROMPT = `
あなたはCTO兼CPOのGPTです。COO兼エンジニアから、Step 1-2の実装完了報告とデプロイ前レビューを依頼されました。

【実装完了内容】

## Step 1: SSOT閾値統一 ✅
- trapScore閾値を>=60に統一（品質ゲートとEMERGENCYトリガーを統一）
- logic/eventTriggers.jsを修正

## Step 2: Production Hardening ✅

### Step 2-1: 禁止語lint実装 ✅
- scripts/lint-forbidden-words.jsを実装
- buy/sell/long/shortの検出スクリプト
- 例外パターンを定義（APIエンドポイント名、テンプレート表示など）

### Step 2-2: JSON出力スキーマ検証（zod）+ フェイルクローズ ✅
- services/gpt/client.jsにGPTAnalysisSchema（zod）を追加
- JSONパース後にスキーマ検証を実装
- 検証失敗時はDEFAULT_STANDBY_RESPONSEを返す（フェイルクローズ）

### Step 2-3: KV不調時のレート制限フォールバック強化 ✅
- services/cryptoquant/rateLimiter.jsにローカルレート制限を実装
- KV不調時はローカル最小制限にフォールバック（Professional: 10 req/min, Premium: 30 req/min）
- メモリベースのカウンターでプロセス単位のレート制限を実現

### Step 2-4: EMERGENCY判定指標のキャッシュバイパス ✅
- services/cryptoquant/client.jsのfetchCryptoQuantにskipCacheオプションを追加
- services/cryptoquant/deepMetrics.jsのgetLiquidationsとgetWhaleFlowsにskipCacheオプションを追加
- services/cryptoquant/highResolution.jsの各関数にskipCacheオプションを追加
- api/cron.jsでイベント駆動配信時にskipCache: trueを設定

【実装ファイル（デプロイエラー検出のため）】

${Object.entries(fileContents)
  .map(
    ([fileName, content]) => `
=== ${fileName} (${content.split("\n").length}行) ===
\`\`\`javascript
${content.substring(0, 2000)}${content.length > 2000 ? "\n... (以下省略)" : ""}
\`\`\`
`
  )
  .join("\n")}

【レビュー依頼内容】

1. **デプロイエラー検出**:
   - 構文エラー（SyntaxError）がないか確認
   - 未定義変数・関数の参照がないか確認
   - インポート/エクスポートの不整合がないか確認
   - 型エラー（TypeScript/JavaScript）がないか確認
   - 循環依存がないか確認

2. **実装の整合性評価**:
   - Step 1-2の実装がSSOT Trap Defense BTCの要件を満たしているか
   - 各ステップの実装が正しく統合されているか
   - エラーハンドリングが適切か（フェイルクローズ、フォールバック）

3. **パフォーマンス・リソース評価**:
   - レート制限の実装が適切か（KV不調時のフォールバック）
   - キャッシュバイパスの実装が適切か（EMERGENCY判定時のみ）
   - メモリリークのリスクがないか（ローカルレート制限のカウンター）

4. **本番デプロイ準備状況**:
   - デプロイエラーが発生する可能性のある箇所を特定
   - 修正が必要な箇所があれば具体的に指摘
   - デプロイ前の最終チェック項目を提示

5. **総合評価**:
   - 実装完成度（0-100点）
   - デプロイ可否判定（GO / NO-GO）
   - デプロイ前の推奨事項（優先度順）

CTO兼CPOとして、デプロイエラーが発生しないよう、徹底的にレビューしてください。特に、Vercel Serverless環境での実行を前提とした検証をお願いします。
`;

    console.log("🤖 GPT（CTO/CPO）に実装完了報告とデプロイ前レビューを依頼中...");
    console.log(`📄 実装ファイル数: ${Object.keys(implementedFiles).length}ファイル`);
    console.log();

    const result = await callGPT52(DEPLOYMENT_REVIEW_PROMPT, {
      maxCompletionTokens: 8000,
    });

    console.log("\n" + "=".repeat(80));
    console.log("📝 GPT（CTO/CPO）からの実装完了報告とデプロイ前レビュー:");
    console.log("=".repeat(80));
    console.log(result.text);
    console.log("=".repeat(80));
    console.log("\n📊 使用量:", JSON.stringify(result.usage, null, 2));

    // レビュー結果をファイルに保存
    const reviewOutputPath = join(
      __dirname,
      "../docs/STEP1_2_DEPLOYMENT_REVIEW_GPT.md"
    );
    const reviewContent = `# Step 1-2 実装完了報告とデプロイ前レビュー（GPT CTO/CPO）

**レビュー日**: ${new Date().toISOString()}
**レビュアー**: GPT（CTO/CPO）
**実装者**: COO（Cursor/Composer）
**実装ファイル数**: ${Object.keys(implementedFiles).length}ファイル

---

## 📝 レビュー結果

${result.text}

---

## 📊 API使用量

\`\`\`json
${JSON.stringify(result.usage, null, 2)}
\`\`\`

## 📋 実装ファイル一覧

${Object.keys(implementedFiles)
  .map((file) => `- ${file}: ${implementedFiles[file].description}`)
  .join("\n")}
`;

    fs.writeFileSync(reviewOutputPath, reviewContent, "utf-8");
    console.log(`\n💾 レビュー結果を保存しました: ${reviewOutputPath}`);

    // デプロイ可否判定を抽出（簡易版）
    const goNoGoMatch = result.text.match(/GO|NO-GO|デプロイ可否|デプロイ.*可否/i);
    if (goNoGoMatch) {
      console.log(`\n🎯 デプロイ可否判定: ${goNoGoMatch[0]}`);
    }
  } catch (error: any) {
    console.error("❌ エラー:", error.message);
    if (error.response) {
      console.error("APIレスポンス:", JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
