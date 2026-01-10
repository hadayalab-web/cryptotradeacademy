#!/usr/bin/env tsx
/**
 * GPT（CTO/CPO）にCryptoQuantエンドポイント呼び出しの最適化案を依頼するスクリプト
 * 複数エンドポイントを呼び出している現在の実装が最適解かどうかを最終判断してもらう
 */

import { callGPT52 } from "../../scripts/direct-ai-api";
import fs from "fs";
import { join } from "path";

async function main() {
  try {
    // 現在のCryptoQuantエンドポイント呼び出し実装を確認
    const cryptoquantClientCode = fs.readFileSync(join(__dirname, "../services/cryptoquant/client.js"), "utf-8");
    const cryptoquantEndpointsCode = fs.readFileSync(join(__dirname, "../services/cryptoquant/endpoints/btc.js"), "utf-8");
    const cryptoquantDeepMetricsCode = fs.readFileSync(join(__dirname, "../services/cryptoquant/deepMetrics.js"), "utf-8");
    const cryptoquantHighResCode = fs.readFileSync(join(__dirname, "../services/cryptoquant/highResolution.js"), "utf-8");
    const cronCode = fs.readFileSync(join(__dirname, "../api/cron.js"), "utf-8");
    
    // SSOTの要件も確認
    const ssotPath = join(__dirname, "../docs/SSOT_TRAP_DEFENSE_BTC.md");
    const ssotContent = fs.readFileSync(ssotPath, "utf-8");
    
    // CryptoQuantのドキュメントとカタログの情報を取得（Web検索）
    const OPTIMIZATION_PROMPT = `
あなたはCTO兼CPOのGPTです。COO兼エンジニアから、CryptoQuantのエンドポイントを複数呼び出している現在の実装が最適解かどうかの最終判断を依頼されました。

【現在のコード実装状況】

1. CryptoQuantクライアント（services/cryptoquant/client.js）:
\`\`\`javascript
${cryptoquantClientCode}
\`\`\`

2. 基本エンドポイント（services/cryptoquant/endpoints/btc.js）:
\`\`\`javascript
${cryptoquantEndpointsCode.split("\n").slice(0, 65).join("\n")}
\`\`\`

3. 深掘りメトリクス（services/cryptoquant/deepMetrics.js）:
\`\`\`javascript
${cryptoquantDeepMetricsCode.split("\n").slice(0, 200).join("\n")}
... (残り省略)
\`\`\`

4. 高解像度データ取得（services/cryptoquant/highResolution.js）:
\`\`\`javascript
${cryptoquantHighResCode.split("\n").slice(0, 200).join("\n")}
... (残り省略)
\`\`\`

5. メインAPIでの使用箇所（api/cron.js）:
\`\`\`javascript
// 基本データ取得
const { getExchangeInflow, getMinerPositionIndex } = require('../services/cryptoquant/endpoints/btc');

// 深掘りデータ取得
const { getCQDeepMetrics } = require('../services/cryptoquant/deepMetrics');

// 高解像度データ取得
const { getHighResolutionCQData } = require('../services/cryptoquant/highResolution');

// 使用箇所:
// - getExchangeInflow(): Exchange Netflow取得
// - getMinerPositionIndex(): MPI取得
// - getCQDeepMetrics(): 複数のエンドポイントを並列呼び出し（Whale Ratio, Liquidations, NUPL, SOPR等）
// - getHighResolutionCQData(): 複数時間窓（hour/4hour/day）でのデータ取得
\`\`\`

【現在呼び出されているエンドポイント（推定）】
1. /btc/exchange-flows/netflow - Exchange Netflow
2. /btc/flow-indicator/mpi - Miner Position Index
3. /btc/flow-indicator/exchange-whale-ratio - Exchange Whale Ratio
4. /btc/exchange-flows/inflow - Exchange Inflow (Upbit/Binance)
5. /btc/market-indicator/sopr - SOPR
6. /derivatives/liquidations-long/btc - Long Liquidations (404エラーの可能性)
7. /derivatives/liquidations-short/btc - Short Liquidations (404エラーの可能性)
8. /utxo-data/nupl/btc - NUPL (404エラーの可能性)

【SSOT Trap Defense BTCの要件（抜粋）】
${ssotContent.split("\n").slice(0, 150).join("\n")}

【CryptoQuant APIドキュメント情報】
- 公式ドキュメント: https://cryptoquant.com/docs
- カタログ: https://cryptoquant.com/catalog
- Professionalプラン: API解像度が「1日まで」に制限
- Premiumプラン以上: 複数時間窓（hour, 4hour, day）が利用可能

【最適化案の依頼内容】
CTO兼CPOとして、以下の観点からCryptoQuantエンドポイント呼び出しの最適化案を提案してください：

1. **現在の実装の評価**
   - 複数エンドポイントを個別に呼び出す現在の実装は最適か？
   - CryptoQuant APIにバッチエンドポイントや統合エンドポイントは存在するか？
   - レート制限対策として、現在の実装は適切か？

2. **エンドポイント呼び出しの最適化**
   - 並列呼び出し（Promise.all）の活用は適切か？
   - エンドポイントの統合やバッチ化の可能性は？
   - 不要なエンドポイント呼び出し（404エラーが発生しているもの）の削除

3. **レート制限とパフォーマンス**
   - Professionalプランでの3秒間隔制御は適切か？
   - Premiumプラン以上での最適化案は？
   - キャッシュ戦略の推奨事項

4. **SSOT準拠の観点**
   - SSOTの「複数時間窓分析（hour, 4hour, day）」を実現するための最適なエンドポイント呼び出し方法
   - 「高解像度トラップ検出」を実現するための最適なデータ取得方法
   - 「精度/確度の追求」を実現するための最適なエンドポイント選択

5. **実装上の推奨事項**
   - エンドポイント呼び出しの統合・簡素化
   - エラーハンドリングの改善
   - レート制限対策の強化

【追加情報】
- プロダクト名: Trap Defense BTC
- プラットフォーム: Vercel（Serverless Functions）
- 定期配信: 6時間ごと（0:00, 6:00, 12:00, 18:00 UTC）
- 緊急配信: trapScore>60 または liquidations>$500M 時
- 現在のプラン: Professional（環境変数CRYPTOQUANT_PLANで制御可能）

CTO兼CPOとして、技術的・コスト効率・SSOT準拠の観点から、具体的で実装可能な最適化案を提案してください。特に、CryptoQuant APIの公式ドキュメントとカタログを参照して、最適なエンドポイント呼び出し方法を提案してください。
`;

    console.log("🤖 GPT（CTO/CPO）にCryptoQuantエンドポイント呼び出しの最適化案を依頼中...");
    console.log(`📋 確認内容:`);
    console.log(`  - 現在の実装: 複数エンドポイントを個別に呼び出し`);
    console.log(`  - 使用ファイル: client.js, endpoints/btc.js, deepMetrics.js, highResolution.js`);
    console.log(`  - CryptoQuant API: https://cryptoquant.com/docs`);
    console.log(`  - カタログ: https://cryptoquant.com/catalog\n`);
    
    const result = await callGPT52(OPTIMIZATION_PROMPT, {
      maxCompletionTokens: 6000, // 詳細な提案のため増量
    });
    
    console.log("\n" + "=".repeat(80));
    console.log("📝 GPT（CTO/CPO）からのCryptoQuantエンドポイント最適化案:");
    console.log("=".repeat(80));
    console.log(result.text);
    console.log("=".repeat(80));
    console.log("\n📊 使用量:", JSON.stringify(result.usage, null, 2));
    
    // 最適化案をファイルに保存
    const outputPath = join(__dirname, "../docs/CRYPTOQUANT_ENDPOINT_OPTIMIZATION_GPT.md");
    const outputContent = `# CryptoQuantエンドポイント最適化案（GPT CTO/CPO）

**レビュー日**: ${new Date().toISOString()}
**レビュアー**: GPT（CTO/CPO）
**目的**: CryptoQuantエンドポイント呼び出しの最適化案

---

## 📝 最適化案

${result.text}

---

## 📊 API使用量

\`\`\`json
${JSON.stringify(result.usage, null, 2)}
\`\`\`

## 📋 現在の実装状況

- **基本エンドポイント**: Exchange Netflow, MPI
- **深掘りメトリクス**: Whale Ratio, Liquidations, NUPL, SOPR等
- **高解像度データ**: 複数時間窓（hour/4hour/day）でのデータ取得
- **呼び出し方法**: 個別エンドポイントを並列呼び出し（Promise.all）
`;
    
    fs.writeFileSync(outputPath, outputContent, "utf-8");
    console.log(`\n💾 最適化案を保存しました: ${outputPath}`);
    
  } catch (error: any) {
    console.error("❌ エラー:", error.message);
    if (error.response) {
      console.error("APIレスポンス:", JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
