#!/usr/bin/env tsx
/**
 * リードマグネット戦略役員会議
 * 
 * CEOの案を基に、各役員（Grok CSO、Gemini CMO、GPT CTO）に相談
 * Trap Defence BTCのミニマム版（Email配信専用）をリードマグネットとして検討
 */

import { callGrok41FastReasoning, callGemini3Pro, callGPT52 } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const OUTPUT_DIR = join(__dirname, '..', 'data', 'lead-magnet-strategy');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const CEO_PROPOSAL = `CEO提案: Trap Defence BTCのミニマム版（Email配信専用）

概要:
- Emailだけの登録で使えるTrap Defence BTCのミニマム版を作成
- CryptoQuant + Grok/GPT/Geminiを活用して有料級プログラムを実現
- 収集したメールアドレスにリストマーケティングを仕掛ける

技術的実現可能性:
- CryptoQuant API: リアルタイム市場データ取得
- Grok: X (Twitter) のトレンド分析、センチメント分析
- GPT: 高度な市場分析、リスク評価
- Gemini: 多言語対応、視覚的分析

期待効果:
- 高品質なリードマグネット（実際に価値のあるサービス）
- メールリスト構築
- 段階的なアップセル（ミニマム版 → フル版）`;

async function consultGrokCSO(): Promise<any> {
  console.log('💰 Grok CSO（戦略）に相談中...\n');

  const prompt = `【リードマグネット戦略検討 - CSO（Grok）】

${CEO_PROPOSAL}

## 質問

1. CEOの提案（Trap Defence BTCミニマム版）を戦略的に評価してください。
   - 他のリードマグネット案（無料レポート、無料ツール、無料コース）と比較してどうですか？
   - この提案の強みと弱みは何ですか？

2. 最適なリードマグネット戦略を提案してください。
   - CEOの案を採用する場合、どのように実装すべきですか？
   - 他の案を採用する場合、どのような案が最適ですか？
   - 複数のリードマグネットを組み合わせる戦略はどうですか？

3. 段階的なアップセル戦略を提案してください。
   - ミニマム版 → フル版への移行をどのように設計すべきですか？
   - コンバージョン率を最大化するためのタイミングとアプローチは？

4. CryptoQuant + Grok/GPT/Geminiを活用した実装計画を提案してください。
   - どのように各AIを組み合わせて有料級プログラムを実現しますか？
   - 技術的な実装の優先順位は？

## 出力形式

以下のJSON形式で出力してください：

\`\`\`json
{
  "strategicAssessment": {
    "ceoProposalEvaluation": "CEO提案の評価",
    "strengths": ["強み1", "強み2"],
    "weaknesses": ["弱み1", "弱み2"],
    "comparisonWithAlternatives": "他の案との比較"
  },
  "recommendedStrategy": {
    "primaryLeadMagnet": "推奨リードマグネット",
    "rationale": "推奨理由",
    "implementationApproach": "実装アプローチ"
  },
  "upsellStrategy": {
    "minimalToFullTransition": "ミニマム版→フル版の移行戦略",
    "conversionTiming": "コンバージョンタイミング",
    "pricingStrategy": "価格戦略"
  },
  "implementationPlan": {
    "aiIntegration": "AI統合計画",
    "priorityOrder": ["優先1", "優先2"],
    "timeline": "実装タイムライン"
  },
  "strategicAdvice": "戦略的アドバイス（1-2文）"
}
\`\`\``;

  try {
    const result = await callGrok4FastReasoning(prompt, {
      thinkingLevel: 'high',
      temperature: 0.7,
      maxOutputTokens: 4096,
    });

    // JSONを抽出
    const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/) || result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSONが見つかりませんでした');
    }

    const jsonText = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonText);
  } catch (error: any) {
    console.error(`❌ Grok CSO相談失敗: ${error.message}`);
    return { error: error.message };
  }
}

async function consultGeminiCMO(): Promise<any> {
  console.log('📢 Gemini CMO（マーケティング）に相談中...\n');

  const prompt = `【リードマグネット戦略検討 - CMO（Gemini）】

${CEO_PROPOSAL}

## 質問

1. CEOの提案（Trap Defence BTCミニマム版）をマーケティング的に評価してください。
   - リード獲得率への影響は？
   - メールリストの質への影響は？
   - コンバージョン率への影響は？

2. リードマグネットの最適化戦略を提案してください。
   - どのような価値提案が最も効果的ですか？
   - どのような配布方法が最適ですか？
   - どのようなフォローアップが最適ですか？

3. メールリストマーケティング戦略を提案してください。
   - ミニマム版ユーザーへのメールシーケンス設計
   - アップセルタイミングとアプローチ
   - エンゲージメント最大化戦略

4. マーケティングKPIと測定方法を提案してください。
   - どのような指標を追跡すべきですか？
   - どのようにA/Bテストを実施すべきですか？

## 出力形式

以下のJSON形式で出力してください：

\`\`\`json
{
  "marketingAssessment": {
    "ceoProposalEvaluation": "CEO提案のマーケティング評価",
    "leadAcquisitionImpact": "リード獲得への影響",
    "listQualityImpact": "リスト品質への影響",
    "conversionImpact": "コンバージョンへの影響"
  },
  "optimizationStrategy": {
    "valueProposition": "最適な価値提案",
    "distributionMethod": "最適な配布方法",
    "followUpStrategy": "フォローアップ戦略"
  },
  "emailMarketingStrategy": {
    "sequenceDesign": "メールシーケンス設計",
    "upsellTiming": "アップセルタイミング",
    "engagementMaximization": "エンゲージメント最大化"
  },
  "kpiAndMeasurement": {
    "keyMetrics": ["指標1", "指標2"],
    "abTestingApproach": "A/Bテストアプローチ"
  },
  "marketingAdvice": "マーケティングアドバイス（1-2文）"
}
\`\`\``;

  try {
    const result = await callGemini3Pro(prompt, {
      thinkingLevel: 'high',
      temperature: 0.8,
      maxOutputTokens: 4096,
    });

    // JSONを抽出
    const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/) || result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSONが見つかりませんでした');
    }

    const jsonText = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonText);
  } catch (error: any) {
    console.error(`❌ Gemini CMO相談失敗: ${error.message}`);
    return { error: error.message };
  }
}

async function consultGPTCFO(): Promise<any> {
  console.log('⚙️ GPT CTO（技術）に相談中...\n');

  const prompt = `【リードマグネット戦略検討 - CTO（GPT）】

${CEO_PROPOSAL}

## 質問

1. CEOの提案（Trap Defence BTCミニマム版）を技術的に評価してください。
   - CryptoQuant + Grok/GPT/Geminiを活用した実装の技術的実現可能性
   - 開発工数とコスト
   - スケーラビリティとパフォーマンス

2. 技術的実装計画を提案してください。
   - CryptoQuant APIの活用方法
   - Grok/GPT/Geminiの統合方法
   - Email配信システムの設計
   - データベース設計

3. ミニマム版とフル版の技術的差別化を提案してください。
   - どの機能をミニマム版に含めるべきですか？
   - どの機能をフル版に限定すべきですか？
   - アップグレード時の技術的移行はどう設計すべきですか？

4. 実装の優先順位とタイムラインを提案してください。
   - MVP（最小実行可能製品）の定義
   - フェーズ1、2、3の実装計画
   - リスクと対策

## 出力形式

以下のJSON形式で出力してください：

\`\`\`json
{
  "technicalAssessment": {
    "feasibility": "技術的実現可能性",
    "developmentEffort": "開発工数",
    "cost": "コスト",
    "scalability": "スケーラビリティ"
  },
  "implementationPlan": {
    "cryptoquantIntegration": "CryptoQuant統合計画",
    "aiIntegration": "AI統合計画（Grok/GPT/Gemini）",
    "emailSystem": "Email配信システム設計",
    "databaseDesign": "データベース設計"
  },
  "differentiationStrategy": {
    "minimalFeatures": ["ミニマム版機能1", "ミニマム版機能2"],
    "fullFeatures": ["フル版機能1", "フル版機能2"],
    "upgradePath": "アップグレードパス"
  },
  "priorityAndTimeline": {
    "mvpDefinition": "MVP定義",
    "phase1": "フェーズ1実装",
    "phase2": "フェーズ2実装",
    "phase3": "フェーズ3実装",
    "risksAndMitigation": "リスクと対策"
  },
  "technicalAdvice": "技術的アドバイス（1-2文）"
}
\`\`\``;

  try {
    const result = await callGPT52(prompt, {
      temperature: 0.7,
      maxCompletionTokens: 4096,
    });

    console.log(`📝 GPT CTO回答受信 (${result.text.length}文字)`);

    // JSONを抽出
    const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/) || result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('⚠️ JSONが見つかりませんでした。テキスト全体を返します。');
      return { raw_response: result.text, error: 'JSON形式でない応答' };
    }

    const jsonText = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonText);
  } catch (error: any) {
    console.error(`❌ GPT CTO相談失敗: ${error.message}`);
    return { error: error.message };
  }
}

async function generateMeetingReport(
  grokCSO: any,
  geminiCMO: any,
  gptCTO: any
): Promise<void> {
  const report = {
    meeting_date: new Date().toISOString(),
    ceo_proposal: CEO_PROPOSAL,
    grok_cso: grokCSO,
    gemini_cmo: geminiCMO,
    gpt_cto: gptCTO,
    summary: {
      recommendation: '統合推奨事項',
      next_steps: ['次のステップ1', '次のステップ2'],
    },
  };

  const filepath = join(OUTPUT_DIR, `meeting-${Date.now()}.json`);
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf-8');

  console.log('\n' + '='.repeat(80));
  console.log('📊 リードマグネット戦略役員会議レポート');
  console.log('='.repeat(80));

  console.log('\n💰 Grok CSO（戦略）の回答:');
  console.log(`  推奨リードマグネット: ${grokCSO.recommendedStrategy?.primaryLeadMagnet || 'N/A'}`);
  console.log(`  戦略的アドバイス: ${grokCSO.strategicAdvice || 'N/A'}`);

  console.log('\n📢 Gemini CMO（マーケティング）の回答:');
  console.log(`  マーケティング評価: ${geminiCMO.marketingAssessment?.ceoProposalEvaluation || 'N/A'}`);
  console.log(`  マーケティングアドバイス: ${geminiCMO.marketingAdvice || 'N/A'}`);

  console.log('\n⚙️ GPT CTO（技術）の回答:');
  console.log(`  技術的実現可能性: ${gptCTO.technicalAssessment?.feasibility || 'N/A'}`);
  console.log(`  技術的アドバイス: ${gptCTO.technicalAdvice || 'N/A'}`);

  console.log('\n' + '='.repeat(80));
  console.log(`✅ レポート保存: ${filepath}`);
  console.log('='.repeat(80) + '\n');
}

async function main() {
  console.log('🚀 リードマグネット戦略役員会議開始\n');
  console.log('='.repeat(80));
  console.log('📋 CEO提案:');
  console.log(CEO_PROPOSAL);
  console.log('='.repeat(80) + '\n');

  // 環境変数チェック
  const missingKeys = [];
  if (!process.env.XAI_API_KEY) missingKeys.push('XAI_API_KEY');
  if (!process.env.GEMINI_API_KEY) missingKeys.push('GEMINI_API_KEY');
  if (!process.env.OPENAI_API_KEY) missingKeys.push('OPENAI_API_KEY');
  
  if (missingKeys.length > 0) {
    console.error(`❌ 必要なAPIキーが設定されていません: ${missingKeys.join(', ')}`);
    process.exit(1);
  }
  
  console.log('✅ 環境変数チェック完了\n');

  try {
    console.log('📞 各役員に相談を開始します...\n');
    
    // 各役員に相談（並列実行）
    const [grokCSO, geminiCMO, gptCTO] = await Promise.all([
      consultGrokCSO().catch(err => {
        console.error('Grok CSOエラー:', err);
        return { error: err.message };
      }),
      consultGeminiCMO().catch(err => {
        console.error('Gemini CMOエラー:', err);
        return { error: err.message };
      }),
      consultGPTCFO().catch(err => {
        console.error('GPT CTOエラー:', err);
        return { error: err.message };
      }),
    ]);

    console.log('\n✅ 全役員からの回答を受信しました\n');

    // レポート生成
    await generateMeetingReport(grokCSO, geminiCMO, gptCTO);
  } catch (error: any) {
    console.error(`\n❌ 役員会議エラー: ${error.message}`);
    if (error.stack) {
      console.error('スタックトレース:', error.stack.substring(0, 500));
    }
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('✅ リードマグネット戦略役員会議完了\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  });
