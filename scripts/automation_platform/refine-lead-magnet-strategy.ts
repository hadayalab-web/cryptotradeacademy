#!/usr/bin/env tsx
/**
 * リードマグネット戦略の磨き上げ - 各役員への相談
 * 
 * Grok CSO、Gemini CMO、GPT CTOに相談して、シンプルで効果的な方法を提案してもらう
 */

import { callGrok41FastReasoning, callGemini3Pro, callGPT52 } from '../api/unified-api.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const OUTPUT_DIR = join(__dirname, '..', 'data', 'lead-magnet-strategy-refinement');
mkdirSync(OUTPUT_DIR, { recursive: true });

const CURRENT_FLOW = `
投稿（Telegram/X/Discord）
  ↓
リードマグネット用LPへ遷移
  ↓
メールアドレスを登録
  ↓
Trap Defence BTCのミニマム版（無料）のユーザーになる
  ↓
ミニマム版はEmailのみで配信（1日1回）
  ↓
リストへメールマーケティングを仕掛け
  ↓
Whopでアップグレードするように促す
  ↓
🎯 Whopでの購入コンバージョン
`;

/**
 * Grok CSO（戦略）に相談
 */
async function consultGrokCSO(): Promise<any> {
  const prompt = `あなたは最高戦略責任者（CSO）です。

現在のリードマグネット戦略のフロー:
${CURRENT_FLOW}

【重要な制約】
- 複雑な方法にならないように注意すること
- シンプルで効果的な方法を提案すること
- Whopコンバージョンが最終ゴールであること

【質問】
1. このフローは戦略的に最適ですか？改善点はありますか？
2. ミニマム版の価値提案は十分ですか？もっとシンプルにできますか？
3. メールマーケティングのタイミングと頻度は最適ですか？
4. Whopコンバージョンを最大化するために、どのステップを最適化すべきですか？
5. 複雑にならない範囲で、追加すべき要素はありますか？

【回答形式】
JSON形式で回答してください:
{
  "strategic_assessment": "戦略的評価",
  "improvements": ["改善点1", "改善点2"],
  "simplification_suggestions": ["簡素化提案1", "簡素化提案2"],
  "optimization_priorities": ["最適化優先順位1", "最適化優先順位2"],
  "final_recommendations": "最終推奨事項"
}`;

  try {
    console.log('💰 Grok CSO（戦略）に相談中...');
    const result = await callGrok41FastReasoning(prompt, {
      maxTokens: 2000,
      temperature: 0.7,
    });
    
    console.log(`✅ Grok CSO回答完了 (${result.text?.length || 0}文字)`);
    return result.text || result;
  } catch (error: any) {
    console.error(`❌ Grok CSO相談エラー: ${error.message}`);
    if (error.stack) {
      console.error('スタック:', error.stack.substring(0, 200));
    }
    return { error: error.message };
  }
}

/**
 * Gemini CMO（マーケティング）に相談
 */
async function consultGeminiCMO(): Promise<any> {
  const prompt = `あなたは最高マーケティング責任者（CMO）です。

現在のリードマグネット戦略のフロー:
${CURRENT_FLOW}

【重要な制約】
- 複雑な方法にならないように注意すること
- シンプルで効果的な方法を提案すること
- Whopコンバージョンが最終ゴールであること

【質問】
1. LPのコンテンツとCTAは最適ですか？もっとシンプルにできますか？
2. メールシーケンスの内容とタイミングは最適ですか？
3. ミニマム版の価値提供は十分ですか？もっと魅力的にできますか？
4. Whopへの導線設計は最適ですか？改善点はありますか？
5. 複雑にならない範囲で、追加すべきマーケティング要素はありますか？

【回答形式】
JSON形式で回答してください:
{
  "marketing_assessment": "マーケティング評価",
  "lp_improvements": ["LP改善点1", "LP改善点2"],
  "email_sequence_optimization": ["メールシーケンス最適化1", "メールシーケンス最適化2"],
  "value_proposition_enhancement": "価値提案の強化",
  "whop_conversion_optimization": ["Whopコンバージョン最適化1", "Whopコンバージョン最適化2"],
  "final_recommendations": "最終推奨事項"
}`;

  try {
    console.log('📢 Gemini CMO（マーケティング）に相談中...');
    const result = await callGemini3Pro(prompt, {
      maxOutputTokens: 2000,
      temperature: 0.7,
    });
    
    console.log(`✅ Gemini CMO回答完了 (${result.text?.length || 0}文字)`);
    return result.text || result;
  } catch (error: any) {
    console.error(`❌ Gemini CMO相談エラー: ${error.message}`);
    if (error.stack) {
      console.error('スタック:', error.stack.substring(0, 200));
    }
    return { error: error.message };
  }
}

/**
 * GPT CTO（技術）に相談
 */
async function consultGPTCFO(): Promise<any> {
  const prompt = `あなたは最高技術責任者（CTO）です。

現在のリードマグネット戦略のフロー:
${CURRENT_FLOW}

【重要な制約】
- 複雑な方法にならないように注意すること
- シンプルで効果的な方法を提案すること
- Whopコンバージョンが最終ゴールであること
- 技術的実装の複雑さを最小限に抑えること

【質問】
1. このフローの技術的実装は最適ですか？もっとシンプルにできますか？
2. ミニマム版の実装は複雑すぎませんか？シンプルにする方法はありますか？
3. メールシーケンスの自動化は最適ですか？改善点はありますか？
4. Whop連携の実装はシンプルですか？複雑にならないようにする方法はありますか？
5. 技術的負担を最小限に抑えながら、効果を最大化する方法はありますか？

【回答形式】
JSON形式で回答してください:
{
  "technical_assessment": "技術的評価",
  "simplification_opportunities": ["簡素化機会1", "簡素化機会2"],
  "implementation_improvements": ["実装改善1", "実装改善2"],
  "complexity_reduction": ["複雑さ削減1", "複雑さ削減2"],
  "efficiency_optimization": ["効率最適化1", "効率最適化2"],
  "final_recommendations": "最終推奨事項"
}`;

  try {
    console.log('⚙️ GPT CTO（技術）に相談中...');
    const result = await callGPT52(prompt, {
      maxCompletionTokens: 2000,
      temperature: 0.7,
    });
    
    console.log(`✅ GPT CTO回答完了 (${result.text?.length || 0}文字)`);
    return result.text || result;
  } catch (error: any) {
    console.error(`❌ GPT CTO相談エラー: ${error.message}`);
    if (error.stack) {
      console.error('スタック:', error.stack.substring(0, 200));
    }
    return { error: error.message };
  }
}

/**
 * JSONを抽出
 */
function extractJSON(text: string): any {
  try {
    // JSON部分を抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { raw: text };
  } catch (error) {
    return { raw: text, parseError: error };
  }
}

/**
 * 統合レポートを生成
 */
function generateIntegratedReport(
  grokResponse: any,
  geminiResponse: any,
  gptResponse: any
): string {
  const grokData = typeof grokResponse === 'string' ? extractJSON(grokResponse) : grokResponse;
  const geminiData = typeof geminiResponse === 'string' ? extractJSON(geminiResponse) : geminiResponse;
  const gptData = typeof gptResponse === 'string' ? extractJSON(gptResponse) : gptResponse;

  return `# リードマグネット戦略 - 磨き上げレポート

**作成日**: ${new Date().toISOString()}  
**目的**: 各役員からの提案を統合して、シンプルで効果的な戦略を確立

---

## 💰 Grok CSO（戦略）の提案

${typeof grokResponse === 'string' ? grokResponse : JSON.stringify(grokResponse, null, 2)}

---

## 📢 Gemini CMO（マーケティング）の提案

${typeof geminiResponse === 'string' ? geminiResponse : JSON.stringify(geminiResponse, null, 2)}

---

## ⚙️ GPT CTO（技術）の提案

${typeof gptResponse === 'string' ? gptResponse : JSON.stringify(gptResponse, null, 2)}

---

## 🎯 統合推奨事項

### シンプル化のポイント

1. **フローの簡素化**
   - 不要なステップの削除
   - 自動化できる部分の自動化
   - 手動作業の最小化

2. **技術的複雑さの削減**
   - 既存システムの活用
   - 新しいシステムの追加を最小限に
   - シンプルな実装方法の採用

3. **マーケティングの最適化**
   - 効果的なCTAの配置
   - タイミングの最適化
   - コンテンツの簡素化

### 最終的な推奨フロー

（各役員の提案を統合した最終フロー）

---

**作成者**: COO兼CTO（Cursor/Composer）
`;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 リードマグネット戦略の磨き上げを開始...\n');
  console.log('='.repeat(80));

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
    
    // 各役員に並列で相談
    const [grokResponse, geminiResponse, gptResponse] = await Promise.all([
      consultGrokCSO().catch(err => {
        console.error('Grok CSOエラー:', err.message);
        return { error: err.message };
      }),
      consultGeminiCMO().catch(err => {
        console.error('Gemini CMOエラー:', err.message);
        return { error: err.message };
      }),
      consultGPTCFO().catch(err => {
        console.error('GPT CTOエラー:', err.message);
        return { error: err.message };
      }),
    ]);

    console.log('\n✅ 全役員からの回答を受信しました\n');

    // レスポンスを保存
    const timestamp = Date.now();
    writeFileSync(
      join(OUTPUT_DIR, `grok-cso-${timestamp}.json`),
      JSON.stringify(grokResponse, null, 2),
      'utf-8'
    );
    writeFileSync(
      join(OUTPUT_DIR, `gemini-cmo-${timestamp}.json`),
      JSON.stringify(geminiResponse, null, 2),
      'utf-8'
    );
    writeFileSync(
      join(OUTPUT_DIR, `gpt-cto-${timestamp}.json`),
      JSON.stringify(gptResponse, null, 2),
      'utf-8'
    );

    // 統合レポートを生成
    const report = generateIntegratedReport(grokResponse, geminiResponse, gptResponse);
    writeFileSync(
      join(OUTPUT_DIR, `integrated-report-${timestamp}.md`),
      report,
      'utf-8'
    );

    console.log('\n' + '='.repeat(80));
    console.log('✅ すべての役員への相談が完了しました！');
    console.log(`\n📋 結果ファイル:`);
    console.log(`  - Grok CSO: ${join(OUTPUT_DIR, `grok-cso-${timestamp}.json`)}`);
    console.log(`  - Gemini CMO: ${join(OUTPUT_DIR, `gemini-cmo-${timestamp}.json`)}`);
    console.log(`  - GPT CTO: ${join(OUTPUT_DIR, `gpt-cto-${timestamp}.json`)}`);
    console.log(`  - 統合レポート: ${join(OUTPUT_DIR, `integrated-report-${timestamp}.md`)}`);
    
    // 統合レポートの一部を表示
    console.log('\n📊 統合レポートの一部:');
    console.log(report.substring(0, 500) + '...\n');
  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack.substring(0, 500));
    }
    process.exit(1);
  }
}

// スクリプト実行
main().catch((error) => {
  console.error('❌ 予期しないエラー:', error);
  process.exit(1);
});
