#!/usr/bin/env tsx
/**
 * GPT（CTO/CPO）にコード内で使用するGPTとGrokモデルの最適化案を依頼するスクリプト
 * 再実装を開始する前に、最適なモデル選択と使用方法を決定する
 */

import { callGPT52 } from "../../scripts/direct-ai-api";
import fs from "fs";
import { join } from "path";

async function main() {
  try {
    // 現在のコード内でのGPT/Grok使用状況を確認
    const gptClientCode = fs.readFileSync(join(__dirname, "../services/gpt/client.js"), "utf-8");
    const grokClientCode = fs.readFileSync(join(__dirname, "../services/grok/client.js"), "utf-8");
    const cronCode = fs.readFileSync(join(__dirname, "../api/cron.js"), "utf-8");
    
    // SSOTの要件も確認
    const ssotPath = join(__dirname, "../docs/SSOT_TRAP_DEFENSE_BTC.md");
    const ssotContent = fs.readFileSync(ssotPath, "utf-8");
    
    const OPTIMIZATION_PROMPT = `
あなたはCTO兼CPOのGPTです。COO兼エンジニアから、コード内で使用するGPTとGrokモデルの最適化案を依頼されました。

【現在のコード実装状況】

1. GPTモデルの使用状況（services/gpt/client.js）:
\`\`\`javascript
// デフォルトモデル: gpt-4o-mini
const GPT_MODEL = process.env.GPT_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
// 使用箇所:
// - analyzeCryptoQuantData(): CryptoQuantデータ解析
// - generateCryptoQuantAnalysis(): CryptoQuant分析生成
// - generateNonUserImpactReport(): 非ユーザー影響レポート生成
\`\`\`

2. Grokモデルの使用状況（services/grok/client.js）:
\`\`\`javascript
// デフォルトモデル: grok-4-0709
const GROK_MODEL_REASONING = process.env.GROK_MODEL_REASONING || 'grok-4-0709';
const GROK_MODEL_LIVE = process.env.GROK_MODEL_LIVE || GROK_MODEL_REASONING;
// 使用箇所:
// - analyzeMarket(): 市場分析（Regular/Emergency配信）
// - analyzeXSentimentLive(): Xセンチメント解析（リアルタイム）
\`\`\`

3. 使用頻度と重要度:
- GPT: CryptoQuantデータ解析（定期配信6時間ごと、緊急配信時）
- Grok: 市場分析・Xセンチメント解析（定期配信6時間ごと、緊急配信時、高解像度解析）

【SSOT Trap Defense BTCの要件（抜粋）】
${ssotContent.split("\n").slice(0, 200).join("\n")}

【開発環境の方針】
- 開発環境ではGPT/Grok/Geminiともハイエンドモデルを選択してComposer（COO兼エンジニア）をサポートする
- 本番環境ではコスト効率とパフォーマンスのバランスを考慮

【最適化案の依頼内容】
CTO兼CPOとして、以下の観点からGPTとGrokモデルの最適化案を提案してください：

1. **モデル選択の最適化**
   - 現在の gpt-4o-mini と grok-4-0709 は適切か？
   - SSOTの要件（USP1/2/3）を満たすために、どのモデルが最適か？
   - 開発環境と本番環境でモデルを分けるべきか？

2. **使用箇所別の最適化**
   - CryptoQuantデータ解析（GPT）: どのモデルが最適か？
   - 市場分析（Grok）: どのモデルが最適か？
   - Xセンチメント解析（Grok）: どのモデルが最適か？
   - 高解像度解析（Grok）: どのモデルが最適か？

3. **コストとパフォーマンスのバランス**
   - ハイエンドモデル（GPT-5.2、Grok-4.1-fast-reasoning）の使用を推奨する箇所は？
   - コスト効率を重視すべき箇所は？
   - レート制限対策は？

4. **実装上の推奨事項**
   - 環境変数でのモデル切り替え方法
   - 開発/本番環境でのモデル分離方法
   - フォールバック戦略（API失敗時の代替モデル）

5. **SSOT準拠の観点**
   - SSOTの「精度/確度の追求」を実現するためのモデル選択
   - 「70%の時間、何もするな」戦略を実現するためのモデル選択
   - トラップ検出の高精度化のためのモデル選択

【追加情報】
- プロダクト名: Trap Defense BTC
- ブランド名: CryptoTradeAcademy
- タグライン: "70%の時間、何もするな。明確な優位性が出るまで防御。"
- プラットフォーム: Vercel（Serverless Functions）
- 6市場対応: EN/ES/PT-BR/AR/JA/KO
- 定期配信: 6時間ごと（0:00, 6:00, 12:00, 18:00 UTC）
- 緊急配信: trapScore>60 または liquidations>$500M 時

CTO兼CPOとして、技術的・戦略的・コスト効率の観点から、具体的で実装可能な最適化案を提案してください。特に、SSOTの要件を100%満たすためのモデル選択を重視してください。
`;

    console.log("🤖 GPT（CTO/CPO）にGPT/Grokモデルの最適化案を依頼中...");
    console.log(`📋 確認内容:`);
    console.log(`  - GPTモデル: 現在 gpt-4o-mini (デフォルト)`);
    console.log(`  - Grokモデル: 現在 grok-4-0709 (デフォルト)`);
    console.log(`  - 開発環境方針: ハイエンドモデルを使用\n`);
    
    const result = await callGPT52(OPTIMIZATION_PROMPT, {
      maxCompletionTokens: 6000, // 詳細な提案のため増量
    });
    
    console.log("\n" + "=".repeat(80));
    console.log("📝 GPT（CTO/CPO）からのGPT/Grokモデル最適化案:");
    console.log("=".repeat(80));
    console.log(result.text);
    console.log("=".repeat(80));
    console.log("\n📊 使用量:", JSON.stringify(result.usage, null, 2));
    
    // 最適化案をファイルに保存
    const outputPath = join(__dirname, "../docs/GPT_GROK_MODEL_OPTIMIZATION_GPT.md");
    const outputContent = `# GPT/Grokモデル最適化案（GPT CTO/CPO）

**レビュー日**: ${new Date().toISOString()}
**レビュアー**: GPT（CTO/CPO）
**目的**: コード内で使用するGPTとGrokモデルの最適化案

---

## 📝 最適化案

${result.text}

---

## 📊 API使用量

\`\`\`json
${JSON.stringify(result.usage, null, 2)}
\`\`\`

## 📋 現在の実装状況

- **GPTモデル**: \`gpt-4o-mini\` (デフォルト)
- **Grokモデル**: \`grok-4-0709\` (デフォルト)
- **使用箇所**:
  - GPT: CryptoQuantデータ解析
  - Grok: 市場分析、Xセンチメント解析
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
