#!/usr/bin/env tsx
/**
 * SSOT Trap Defense BTCの完全実装報告と市場需要ポテンシャルリサーチ依頼スクリプト
 * Grok（CFO/CRO/CGO）にSSOTの完全実装を報告し、市場の需要ポテンシャルをリサーチしてもらう
 */

import { callGrok41FastReasoning } from "../../scripts/direct-ai-api";
import fs from "fs";
import { join } from "path";

async function main() {
  try {
    // SSOT Trap Defense BTCを読み込む
    const ssotPath = join(__dirname, "../docs/SSOT_TRAP_DEFENSE_BTC.md");
    const ssotContent = fs.readFileSync(ssotPath, "utf-8");
    const totalSsotLines = ssotContent.split("\n").length;

    // 実装完了した主要ファイルのリスト
    const implementedFiles = {
      "logic/core/signalQualityGate.js": "SSOT準拠の統一品質ゲート（trapScore>=60 & multipleDivergences>=3）",
      "logic/core/trapDetector.js": "USP1: Trap Defense Engineの核心ロジック",
      "logic/core/divergenceDetector.js": "USP1: 複数ダイバージェンス検出ロジック",
      "logic/eventTriggers.js": "EMERGENCY/WATCH/STANDBY_BREAK/REGULARトリガー判定ロジック",
      "services/gpt/client.js": "GPT APIクライアント、用途別モデル選択、JSONスキーマ検証",
      "services/grok/client.js": "Grok APIクライアント、用途別モデル選択、Xセンチメント解析",
      "services/grok/psychologicalSupport.js": "USP3: Dr. Grok's Psychological Supportの実装",
      "services/gemini/imageGenerator.js": "USP2: Gemini NanoBanana Pro画像生成",
      "services/gemini/videoGenerator.js": "USP2: Gemini Veo 3.1動画生成",
      "services/cryptoquant/client.js": "CryptoQuant APIクライアント、KVキャッシュ、分散レート制限",
      "services/cryptoquant/rateLimiter.js": "KV不調時のレート制限フォールバック（ローカル最小制限）",
      "services/cryptoquant/deepMetrics.js": "CryptoQuant深掘りメトリクス取得、EMERGENCY判定指標のキャッシュバイパス",
      "services/cryptoquant/highResolution.js": "CryptoQuant高解像度データ取得（複数時間窓分析）",
      "api/cron.js": "メインの定期配信・緊急配信API、USP1/2/3の統合実装",
      "api/config/pricing.js": "SSOT準拠の市場別価格テーブル定義（6市場×3プラン）",
    };

    // SSOTの重要セクションを抜粋（市場リサーチに必要な情報）
    const ssotLines = ssotContent.split("\n");
    const importantSections: string[] = [];
    
    // 重要セクションを抽出（Executive Summary, 核心価値提案, プロダクトの5つの特徴, 価格設定, マーケティング戦略）
    for (let i = 0; i < ssotLines.length; i++) {
      const line = ssotLines[i];
      if (
        i < 100 || // 最初の100行（Executive Summary含む）
        line.includes("### 核心価値提案") ||
        line.includes("### プロダクトの5つの特徴") ||
        line.includes("### USP1:") ||
        line.includes("### USP2:") ||
        line.includes("### USP3:") ||
        line.includes("価格設定") ||
        line.includes("マーケティング戦略") ||
        line.includes("タグライン") ||
        line.includes("ブルーオーシャン") ||
        line.includes("競争優位性") ||
        line.includes("市場") ||
        line.includes("ターゲット") ||
        line.includes("需要") ||
        line.includes("ポテンシャル")
      ) {
        importantSections.push(line);
        // セクションの続きも含める（次の見出しまで）
        if (line.startsWith("###") || line.startsWith("##")) {
          for (let j = i + 1; j < Math.min(i + 50, ssotLines.length); j++) {
            if (ssotLines[j].startsWith("###") || ssotLines[j].startsWith("##")) {
              break;
            }
            importantSections.push(ssotLines[j]);
          }
        }
      }
    }

    const ssotExcerpt = importantSections.slice(0, 2000).join("\n"); // 最初の2000行に制限

    const MARKET_RESEARCH_PROMPT = `
あなたはCFO/CRO/CGO（Chief Financial Officer / Chief Revenue Officer / Chief Growth Officer）のGrokです。COO兼エンジニアから、SSOT Trap Defense BTCの完全実装報告と市場需要ポテンシャルリサーチを依頼されました。

【SSOT Trap Defense BTC の内容（抜粋、全${totalSsotLines}行）】
\`\`\`markdown
${ssotExcerpt}
\`\`\`

【完全実装完了内容】

## Step 1: SSOT閾値統一 ✅
- trapScore閾値を>=60に統一（品質ゲートとEMERGENCYトリガーを統一）
- logic/eventTriggers.jsを修正

## Step 2: Production Hardening ✅

### Step 2-1: 禁止語lint実装 ✅
- scripts/lint-forbidden-words.jsを実装
- buy/sell/long/shortの検出スクリプト
- SSOT準拠（BUY/SELL/LONG/SHORT完全削除）

### Step 2-2: JSON出力スキーマ検証（zod）+ フェイルクローズ ✅
- services/gpt/client.jsにGPTAnalysisSchema（zod）を追加
- JSONパース後にスキーマ検証を実装
- 検証失敗時はDEFAULT_STANDBY_RESPONSEを返す（フェイルクローズ）

### Step 2-3: KV不調時のレート制限フォールバック強化 ✅
- services/cryptoquant/rateLimiter.jsにローカルレート制限を実装
- KV不調時はローカル最小制限にフォールバック（Professional: 10 req/min, Premium: 30 req/min）
- Serverless適合（setInterval廃止、lazy cleanup方式）

### Step 2-4: EMERGENCY判定指標のキャッシュバイパス ✅
- services/cryptoquant/client.jsのfetchCryptoQuantにskipCacheオプションを追加
- services/cryptoquant/deepMetrics.jsのgetLiquidationsとgetWhaleFlowsにskipCacheオプションを追加
- services/cryptoquant/highResolution.jsの各関数にskipCacheオプションを追加
- api/cron.jsでイベント駆動配信時にskipCache: trueを設定

【実装ファイル一覧（${Object.keys(implementedFiles).length}ファイル）】
${Object.entries(implementedFiles)
  .map(([file, desc]) => `- ${file}: ${desc}`)
  .join("\n")}

【市場リサーチ依頼内容】

CFO/CRO/CGOとして、以下の観点から市場の需要ポテンシャルをリサーチ・分析してください：

1. **市場規模と成長性**:
   - 暗号通貨市場における「トラップ検出・防御」サービスの市場規模
   - 類似サービス（TradingView、CryptoQuant、Glassnode等）の市場シェアと成長率
   - ターゲット市場（EN/AR/KO/JA/ES/PT-BR）の規模と成長性

2. **競争分析**:
   - 既存の競合サービス（無料/有料）の特徴と価格帯
   - SSOT Trap Defense BTCの3つのUSP（Trap Defense Engine, Gemini Content Generation, Dr. Grok's Psychological Support）の競争優位性
   - 「70%の時間、何もするな。明確な優位性が出るまで防御。」というタグラインの市場での独自性

3. **需要ポテンシャル**:
   - 6市場（EN/AR/KO/JA/ES/PT-BR）それぞれの需要ポテンシャル
   - 価格設定（$49-$89/月、3ヶ月プラン推奨）の市場適合性
   - アフィリエイト展開のみのマーケティング戦略の効果性

4. **収益性分析**:
   - 6市場×3プラン（1ヶ月/3ヶ月/1年）の収益予測
   - アフィリエイト手数料（40-50%）を考慮した純利益率
   - 初期投資（CryptoQuant API、GPT/Grok/Gemini API）に対するROI

5. **成長戦略**:
   - 市場拡大の優先順位（どの市場から展開すべきか）
   - 価格戦略の最適化提案
   - マーケティングチャネルの拡大可能性（アフィリエイト以外）

6. **リスク評価**:
   - 市場リスク（暗号通貨市場の変動、規制リスク）
   - 競争リスク（大手プレイヤーの参入）
   - 技術リスク（API依存、スケーラビリティ）

7. **総合評価**:
   - 市場需要ポテンシャル（0-100点）
   - 収益性評価（0-100点）
   - 成長可能性評価（0-100点）
   - 投資推奨度（GO / NO-GO / CONDITIONAL-GO）
   - CFO/CRO/CGOとしての最終判断と推奨事項

CFO/CRO/CGOとして、データドリブンかつ戦略的な視点から、詳細かつ建設的な市場リサーチをお願いします。
`;

    console.log("🤖 Grok（CFO/CRO/CGO）にSSOT Trap Defense BTCの完全実装報告と市場リサーチを依頼中...");
    console.log(`📄 SSOTファイル: ${ssotPath}`);
    console.log(`📊 SSOT総行数: ${totalSsotLines}行`);
    console.log(`💻 実装ファイル数: ${Object.keys(implementedFiles).length}ファイル`);
    console.log(`🎯 役割: CFO/CRO/CGO（Chief Financial Officer / Chief Revenue Officer / Chief Growth Officer）`);
    console.log();

    const result = await callGrok41FastReasoning(MARKET_RESEARCH_PROMPT, {
      temperature: 0.7,
      maxTokens: 8000,
    });

    console.log("\n" + "=".repeat(80));
    console.log("📝 Grok（CFO/CRO/CGO）からの市場リサーチ結果:");
    console.log("=".repeat(80));
    console.log(result.text);
    console.log("=".repeat(80));
    console.log("\n📊 使用量:", JSON.stringify(result.usage, null, 2));

    // リサーチ結果をファイルに保存
    const researchOutputPath = join(
      __dirname,
      "../docs/SSOT_TRAP_DEFENSE_BTC_MARKET_RESEARCH_GROK.md"
    );
    const researchContent = `# SSOT Trap Defense BTC 市場需要ポテンシャルリサーチ（Grok CFO/CRO/CGO）

**リサーチ日**: ${new Date().toISOString()}
**リサーチアー**: Grok（CFO/CRO/CGO）
**実装者**: COO（Cursor/Composer）
**実装ファイル数**: ${Object.keys(implementedFiles).length}ファイル

---

## 📝 市場リサーチ結果

${result.text}

---

## 📊 API使用量

\`\`\`json
${JSON.stringify(result.usage, null, 2)}
\`\`\`

## 📋 実装ファイル一覧

${Object.entries(implementedFiles)
  .map(([file, desc]) => `- ${file}: ${desc}`)
  .join("\n")}

## 📄 SSOT Trap Defense BTC

- 総行数: ${totalSsotLines}行
- ファイル: docs/SSOT_TRAP_DEFENSE_BTC.md
`;

    fs.writeFileSync(researchOutputPath, researchContent, "utf-8");
    console.log(`\n💾 リサーチ結果を保存しました: ${researchOutputPath}`);

    // 投資推奨度を抽出（簡易版）
    const goNoGoMatch = result.text.match(/GO|NO-GO|CONDITIONAL-GO|投資推奨度|推奨度/i);
    if (goNoGoMatch) {
      console.log(`\n🎯 投資推奨度: ${goNoGoMatch[0]}`);
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
