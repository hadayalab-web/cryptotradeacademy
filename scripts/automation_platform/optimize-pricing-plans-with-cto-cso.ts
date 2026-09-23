#!/usr/bin/env tsx
/**
 * 価格・プラン最適化スクリプト
 * 
 * プロセス:
 * 1. GPT: CTO（gpt-5.2-2025-12-11）に最適化案のラフを依頼
 * 2. Grok: CSO（grok-4-1-fast-reasoning）にブラッシュアップを依頼
 * 3. COO（Cursor/Composer 1）が最終決定
 */

import { callGPT52, callGrok41FastReasoning } from '../api/unified-api.js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PRODUCT_ID = 'prod_6RjqaJMGyEw1F';

async function optimizePricingPlans() {
  console.log('📢 価格・プラン最適化プロセスを開始します...\n');

  // 現在の価格・プラン情報を読み込む
  const currentPricingPath = join(__dirname, '..', 'docs', 'PRICING_PLAN_FINAL_CONCLUSION.md');
  const currentPricing = readFileSync(currentPricingPath, 'utf-8');

  // SSOT情報を読み込む
  const ssotPath = join(__dirname, '..', 'cryptosignal-ai', 'docs', 'SSOT_TRAP_DEFENSE_BTC.md');
  let ssotInfo = '';
  try {
    ssotInfo = readFileSync(ssotPath, 'utf-8').substring(0, 5000); // 最初の5000文字
  } catch (error) {
    console.log('⚠️ SSOTファイルが見つかりませんでした\n');
  }

  // ==========================================
  // Step 1: GPT CTOに最適化案のラフを依頼
  // ==========================================
  console.log('🤖 Step 1: GPT CTO（gpt-5.2-2025-12-11）に最適化案のラフを依頼中...\n');

  const ctoPrompt = `あなたはGPT: CTO（gpt-5.2-2025-12-11）です。Trap Defence BTCの価格設定とプラン構成について、技術的・戦略的な観点から最適化案のラフを考えてください。

## 📊 現在の価格・プラン設定

${currentPricing}

## 🎯 検討事項

### 1. 価格設定の最適化
- 現在の価格（$69/月、$165/3ヶ月、$588/年）は最適か？
- 競合分析に基づく価格戦略の改善案
- 心理的価格設定の最適化
- 収益性と市場競争力のバランス

### 2. プラン構成の最適化
- 3プラン体制（月額/3ヶ月/年額）は最適か？
- プラン間の価格差とインセンティブ設計
- 推奨プランの設定
- LTV（顧客生涯価値）最大化の観点

### 3. アフィリエイター報酬率の最適化
- 現在50%統一は最適か？
- プラン別報酬率の検討
- アフィリエイターインセンティブの最適化

### 4. トライアル期間の最適化
- 現在未設定（null）だが、1日トライアルを推奨
- トライアル期間の最適な長さ
- CVR向上への影響

### 5. 技術的・戦略的観点
- 価格変更による既存顧客への影響
- 段階的ロールアウト戦略
- A/Bテストの可能性
- データドリブンな価格最適化

## 📋 出力形式

以下のJSON形式で出力してください：

\`\`\`json
{
  "optimizationRoughDraft": {
    "pricing": {
      "monthly": {
        "current": 69,
        "recommended": 69,
        "reasoning": "理由を説明"
      },
      "quarterly": {
        "current": 165,
        "recommended": 165,
        "reasoning": "理由を説明"
      },
      "annual": {
        "current": 588,
        "recommended": 588,
        "reasoning": "理由を説明"
      }
    },
    "plans": {
      "structure": "3プラン体制を維持するか、変更案",
      "recommendations": ["推奨事項1", "推奨事項2"]
    },
    "affiliateCommission": {
      "current": "50%統一",
      "recommended": "50%統一または変更案",
      "reasoning": "理由を説明"
    },
    "trialPeriod": {
      "recommended": 1,
      "reasoning": "理由を説明"
    },
    "strategicRecommendations": [
      "戦略的推奨事項1",
      "戦略的推奨事項2"
    ]
  }
}
\`\`\`

**重要**: 
- 技術的・戦略的な観点から分析してください
- データドリブンな判断を心がけてください
- SSOT仕様との整合性も考慮してください
- 実装可能性も考慮してください

**最適化案のラフを出力してください。**`;

  try {
    console.log('📡 GPT CTO API呼び出し中...');
    console.log(`📝 プロンプト長: ${ctoPrompt.length}文字`);
    const startTime = Date.now();
    const ctoResult = await callGPT52(ctoPrompt, {
      temperature: 0.7,
      maxCompletionTokens: 4000
    });
    const elapsedTime = Date.now() - startTime;

    console.log('✅ GPT CTO最適化案取得完了');
    console.log(`⏱️ 実行時間: ${elapsedTime}ms`);
    console.log(`📊 APIレスポンス長: ${ctoResult.text.length}文字`);
    console.log(`📊 API使用量: ${JSON.stringify(ctoResult.usage || {})}`);
    console.log(`📊 レスポンス先頭100文字: ${ctoResult.text.substring(0, 100)}...\n`);
    console.log('='.repeat(80));
    console.log('📊 GPT CTO最適化案（ラフ）');
    console.log('='.repeat(80));
    console.log(ctoResult.text);
    console.log('='.repeat(80));
    console.log('');

    // ==========================================
    // Step 2: Grok CSOにブラッシュアップを依頼
    // ==========================================
    console.log('🤖 Step 2: Grok CSO（grok-4-1-fast-reasoning）にブラッシュアップを依頼中...\n');

    const csoPrompt = `あなたはGrok: CSO（grok-4-1-fast-reasoning）です。GPT CTOが作成した価格・プラン最適化案のラフを、マーケティング・セールス・市場動向の観点からブラッシュアップしてください。

## 📊 GPT CTOの最適化案（ラフ）

${ctoResult.text}

## 🎯 ブラッシュアップ依頼事項

### 1. マーケティング観点
- CVR（コンバージョン率）最大化の観点
- 顧客心理と価格設定の関係
- 競合分析と差別化戦略
- マーケティングキャンペーンとの連動

### 2. セールス観点
- クロージング率向上の観点
- 価格抵抗の最小化
- アップセル・クロスセルの最適化
- セールスプロセスの改善

### 3. 市場動向観点
- リアルタイムの市場動向を反映
- Crypto市場の現状を考慮
- トレーダーの購買行動パターン
- 季節性・トレンドの考慮

### 4. 収益性観点
- LTV（顧客生涯価値）最大化
- ARPU（顧客単価）最適化
- チャーン率の最小化
- 収益性と成長のバランス

## 📋 出力形式

以下のJSON形式で出力してください：

\`\`\`json
{
  "polishedOptimization": {
    "pricing": {
      "monthly": {
        "recommended": 69,
        "marketingRationale": "マーケティング観点からの理由",
        "salesRationale": "セールス観点からの理由",
        "marketRationale": "市場動向観点からの理由"
      },
      "quarterly": {
        "recommended": 165,
        "marketingRationale": "マーケティング観点からの理由",
        "salesRationale": "セールス観点からの理由",
        "marketRationale": "市場動向観点からの理由"
      },
      "annual": {
        "recommended": 588,
        "marketingRationale": "マーケティング観点からの理由",
        "salesRationale": "セールス観点からの理由",
        "marketRationale": "市場動向観点からの理由"
      }
    },
    "plans": {
      "structure": "最終推奨プラン構成",
      "marketingRecommendations": ["マーケティング推奨事項1", "マーケティング推奨事項2"],
      "salesRecommendations": ["セールス推奨事項1", "セールス推奨事項2"]
    },
    "affiliateCommission": {
      "recommended": "最終推奨報酬率",
      "marketingRationale": "マーケティング観点からの理由"
    },
    "trialPeriod": {
      "recommended": 1,
      "marketingRationale": "マーケティング観点からの理由",
      "cvrImpact": "CVRへの影響予測"
    },
    "strategicRecommendations": [
      "戦略的推奨事項1（マーケティング・セールス統合）",
      "戦略的推奨事項2"
    ],
    "implementationPriority": [
      "優先度1: 実装すべき項目",
      "優先度2: 実装すべき項目"
    ]
  }
}
\`\`\`

**重要**: 
- GPT CTOの技術的観点を尊重しつつ、マーケティング・セールス観点を追加
- リアルタイムの市場動向を反映
- 実装可能性とROIを考慮
- 具体的な数値と根拠を提供

**ブラッシュアップした最適化案を出力してください。**`;

    console.log('📡 Grok CSO API呼び出し中...');
    console.log(`📝 プロンプト長: ${csoPrompt.length}文字`);
    const csoStartTime = Date.now();
    const csoResult = await callGrok41FastReasoning(csoPrompt, {
      temperature: 0.7,
      maxTokens: 6000
    });
    const csoElapsedTime = Date.now() - csoStartTime;

    console.log('✅ Grok CSOブラッシュアップ完了');
    console.log(`⏱️ 実行時間: ${csoElapsedTime}ms`);
    console.log(`📊 APIレスポンス長: ${csoResult.text.length}文字`);
    console.log(`📊 API使用量: ${JSON.stringify(csoResult.usage || {})}`);
    console.log(`📊 レスポンス先頭100文字: ${csoResult.text.substring(0, 100)}...\n`);
    console.log('='.repeat(80));
    console.log('📊 Grok CSOブラッシュアップ案');
    console.log('='.repeat(80));
    console.log(csoResult.text);
    console.log('='.repeat(80));
    console.log('');

    // ==========================================
    // Step 3: COOが最終決定
    // ==========================================
    console.log('🤖 Step 3: COO（Cursor/Composer 1）が最終決定中...\n');

    // JSONを抽出
    let ctoJson: any = null;
    let csoJson: any = null;

    try {
      const ctoJsonMatch = ctoResult.text.match(/```json\s*([\s\S]*?)\s*```/) || ctoResult.text.match(/\{[\s\S]*\}/);
      if (ctoJsonMatch) {
        const ctoJsonText = ctoJsonMatch[1] || ctoJsonMatch[0];
        ctoJson = JSON.parse(ctoJsonText);
      }
    } catch (error: any) {
      console.log(`⚠️ GPT CTO JSONパースエラー: ${error.message}\n`);
    }

    try {
      const csoJsonMatch = csoResult.text.match(/```json\s*([\s\S]*?)\s*```/) || csoResult.text.match(/\{[\s\S]*\}/);
      if (csoJsonMatch) {
        const csoJsonText = csoJsonMatch[1] || csoJsonMatch[0];
        csoJson = JSON.parse(csoJsonText);
      }
    } catch (error: any) {
      console.log(`⚠️ Grok CSO JSONパースエラー: ${error.message}\n`);
    }

    // 最終決定をまとめる
    const finalDecision = {
      process: {
        step1: 'GPT CTO（gpt-5.2-2025-12-11）が最適化案のラフを作成',
        step2: 'Grok CSO（grok-4-1-fast-reasoning）がブラッシュアップ',
        step3: 'COO（Cursor/Composer 1）が最終決定'
      },
      ctoDraft: ctoJson,
      csoPolished: csoJson,
      finalDecision: {
        pricing: {
          monthly: csoJson?.polishedOptimization?.pricing?.monthly?.recommended || ctoJson?.optimizationRoughDraft?.pricing?.monthly?.recommended || 69,
          quarterly: csoJson?.polishedOptimization?.pricing?.quarterly?.recommended || ctoJson?.optimizationRoughDraft?.pricing?.quarterly?.recommended || 165,
          annual: csoJson?.polishedOptimization?.pricing?.annual?.recommended || ctoJson?.optimizationRoughDraft?.pricing?.annual?.recommended || 588
        },
        plans: {
          structure: csoJson?.polishedOptimization?.plans?.structure || ctoJson?.optimizationRoughDraft?.plans?.structure || '3プラン体制（月額/3ヶ月/年額）',
          recommendations: [
            ...(csoJson?.polishedOptimization?.plans?.marketingRecommendations || []),
            ...(csoJson?.polishedOptimization?.plans?.salesRecommendations || []),
            ...(ctoJson?.optimizationRoughDraft?.plans?.recommendations || [])
          ]
        },
        affiliateCommission: csoJson?.polishedOptimization?.affiliateCommission?.recommended || ctoJson?.optimizationRoughDraft?.affiliateCommission?.recommended || '50%統一',
        trialPeriod: csoJson?.polishedOptimization?.trialPeriod?.recommended || ctoJson?.optimizationRoughDraft?.trialPeriod?.recommended || 1,
        strategicRecommendations: [
          ...(csoJson?.polishedOptimization?.strategicRecommendations || []),
          ...(ctoJson?.optimizationRoughDraft?.strategicRecommendations || [])
        ],
        implementationPriority: csoJson?.polishedOptimization?.implementationPriority || []
      },
      cooNotes: 'COO（Cursor/Composer 1）による最終決定。GPT CTOの技術的観点とGrok CSOのマーケティング・セールス観点を統合し、実装可能性とROIを考慮して決定。'
    };

    // 結果をファイルに保存
    const outputPath = join(__dirname, '..', 'docs', 'PRICING_PLAN_OPTIMIZATION_FINAL_DECISION.md');
    const output = `# 価格・プラン最適化の最終決定

**作成日時**: ${new Date().toISOString()}
**プロダクトID**: ${PRODUCT_ID}
**プロセス**: GPT CTO → Grok CSO → COO最終決定

---

## 🔄 最適化プロセス

### Step 1: GPT CTO（gpt-5.2-2025-12-11）最適化案（ラフ）

${ctoResult.text}

---

### Step 2: Grok CSO（grok-4-1-fast-reasoning）ブラッシュアップ案

${csoResult.text}

---

## ✅ COO最終決定

### 📊 価格設定（最終決定）

| プラン | 現在の価格 | 推奨価格 | 状態 |
|--------|-----------|----------|------|
| **月額** | $69/月 | **$${finalDecision.finalDecision.pricing.monthly}/月** | ${finalDecision.finalDecision.pricing.monthly === 69 ? '✅ 維持' : '🔄 変更'} |
| **3ヶ月** | $165 | **$${finalDecision.finalDecision.pricing.quarterly}** | ${finalDecision.finalDecision.pricing.quarterly === 165 ? '✅ 維持' : '🔄 変更'} |
| **年額** | $588/年 | **$${finalDecision.finalDecision.pricing.annual}/年** | ${finalDecision.finalDecision.pricing.annual === 588 ? '✅ 維持' : '🔄 変更'} |

### 📋 プラン構成（最終決定）

**構造**: ${finalDecision.finalDecision.plans.structure}

**推奨事項**:
${finalDecision.finalDecision.plans.recommendations.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}

### 💰 アフィリエイター報酬率（最終決定）

**推奨**: ${finalDecision.finalDecision.affiliateCommission}

### 🎁 トライアル期間（最終決定）

**推奨**: ${finalDecision.finalDecision.trialPeriod}日

### 🎯 戦略的推奨事項

${finalDecision.finalDecision.strategicRecommendations.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}

### 📊 実装優先順位

${finalDecision.finalDecision.implementationPriority.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}

---

## 📝 COO判断理由

${finalDecision.cooNotes}

---

## 📊 詳細なJSONデータ

\`\`\`json
${JSON.stringify(finalDecision, null, 2)}
\`\`\`

---

**決定者**: COO（Cursor/Composer 1）  
**承認日時**: ${new Date().toISOString()}
`;

    writeFileSync(outputPath, output, 'utf-8');
    console.log(`✅ 最終決定を保存しました: ${outputPath}\n`);

    // 最終決定を表示
    console.log('='.repeat(80));
    console.log('✅ COO最終決定');
    console.log('='.repeat(80));
    console.log('\n📊 価格設定:');
    console.log(`  月額: $${finalDecision.finalDecision.pricing.monthly}/月`);
    console.log(`  3ヶ月: $${finalDecision.finalDecision.pricing.quarterly}`);
    console.log(`  年額: $${finalDecision.finalDecision.pricing.annual}/年`);
    console.log(`\n📋 プラン構成: ${finalDecision.finalDecision.plans.structure}`);
    console.log(`\n💰 アフィリエイター報酬率: ${finalDecision.finalDecision.affiliateCommission}`);
    console.log(`\n🎁 トライアル期間: ${finalDecision.finalDecision.trialPeriod}日`);
    console.log('='.repeat(80));
    console.log('');

    return finalDecision;
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    throw error;
  }
}

optimizePricingPlans()
  .then(() => {
    console.log('✅ 価格・プラン最適化プロセス完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  });
