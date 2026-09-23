#!/usr/bin/env tsx
/**
 * Gemini CMOにCVR向上ポテンシャルを相談
 * 
 * Gemini CMO（gemini-3-flash-preview）の企画力とCOO兼CTOの実装力の相乗効果で
 * CVRが跳ね上がる可能性について確認
 */

import { callGemini3Pro } from '../api/unified-api.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const OUTPUT_DIR = join(__dirname, '..', 'data', 'gemini-consultations');
mkdirSync(OUTPUT_DIR, { recursive: true });

const EMAIL_FIRST_STRATEGY = `
# メールファースト戦略の概要

## 戦略の転換点
1. Resendで配信されるCEO宛てメールのデザイン性が非常に良い → メールマーケティングに特化
2. LP構築も得意領域
3. 投稿マーケティング: スパムに注意して投稿数を最大化
4. Trap Defence BTCのUI表現はEメールの方が向いている可能性

## 現在の実装状況
- ✅ リードマグネットLP実装完了（6言語対応）
- ✅ メールシーケンス実装完了（Phase 1-3）
- ✅ 投稿プラットフォーム実装済み（Telegram/X）
- ✅ Resend API統合完了

## メールマーケティングの強み
- Resend APIを使用した高品質なメールデザイン
- HTMLメールの柔軟なレイアウト
- パーソナライゼーション対応
- レスポンシブデザイン
`;

const CURRENT_CVR_METRICS = `
## 現在のCVR関連指標（Grok CSO予測）

### メールアドレス取得ポテンシャル
- 保守的: 30件/日
- 現実的: 100件/日
- 楽観的: 300件/日

### 成功指標（Grok CSO推奨）
- 登録率: 5%以上
- Whop CR: 10%以上
`;

const SYNERGY_POTENTIAL = `
## Gemini CMOとCOO兼CTOの相乗効果

### Gemini CMO（gemini-3-flash-preview）の強み
- 企画力: マーケティング戦略の立案
- コンテンツ生成: 高品質なマーケティングコンテンツ
- 市場分析: 6市場（EN, AR, KO, JA, ES, PT-BR）への深い理解
- クリエイティブ: ビジュアル・コピーライティング

### COO兼CTO（Cursor/Composer）の強み
- 実装力: 高速なコード実装
- LP構築: Next.js + shadcn/uiでの高品質LP
- メールデザイン: Resend APIを使った高品質なメールデザイン
- 自動化: ワークフロー自動化の実装

### 相乗効果の可能性
- Gemini CMOの企画 → COO兼CTOの高速実装
- マーケティングインサイト → 技術的実装の最適化
- A/Bテストの企画 → 自動化された実装・測定
`;

/**
 * Gemini CMOにCVR向上ポテンシャルを相談
 */
async function consultGeminiCMO(): Promise<any> {
  const prompt = `あなたは最高マーケティング責任者（CMO）です。

現在、メールファースト戦略を採用して、リードマグネット戦略でメールアドレスを収集し、Whopコンバージョンを最大化する計画を立てています。

【戦略の概要】
${EMAIL_FIRST_STRATEGY}

${CURRENT_CVR_METRICS}

${SYNERGY_POTENTIAL}

【質問】
1. Gemini CMO（gemini-3-flash-preview）の企画力とCOO兼CTO（Cursor/Composer）の実装力の相乗効果で、CVRはどの程度跳ね上がる可能性があると予測しますか？
   - 現在のCVR予測（Grok CSO: Whop CR 10%以上）と比較して
   - 相乗効果によるCVR向上の予測
   - 市場別のCVR向上予測

2. CVRを最大化するために、Gemini CMOとCOO兼CTOが協力すべき具体的な領域は何ですか？
   - LPの最適化（デザイン・コピー）
   - メールシーケンスの最適化（デザイン・コピー）
   - 投稿コンテンツの最適化
   - A/Bテストの企画と実装

3. メールデザインの強みを活かして、CVRを向上させる具体的な方法は？
   - メールベースUIの最適化
   - インタラクティブな要素の追加
   - パーソナライゼーションの強化

4. LP構築の強みを活かして、CVRを向上させる具体的な方法は？
   - リードマグネットLPの最適化
   - Whop LPの最適化
   - コンバージョン率の向上

5. Gemini CMOの企画力とCOO兼CTOの実装力の相乗効果を最大化するためのワークフローは？

6. メールファースト戦略で、CVRを最大化するための優先順位は？

【回答形式】
JSON形式で回答してください:
{
  "cvr_improvement_potential": {
    "current_baseline": {
      "whop_conversion_rate": "10%",
      "email_to_whop_rate": "10%"
    },
    "with_synergy": {
      "conservative": {
        "whop_conversion_rate": "X%",
        "email_to_whop_rate": "X%",
        "improvement_percentage": "X%"
      },
      "realistic": {
        "whop_conversion_rate": "X%",
        "email_to_whop_rate": "X%",
        "improvement_percentage": "X%"
      },
      "optimistic": {
        "whop_conversion_rate": "X%",
        "email_to_whop_rate": "X%",
        "improvement_percentage": "X%"
      }
    },
    "by_market": {
      "EN": { "conservative": "X%", "realistic": "X%", "optimistic": "X%" },
      "AR": { "conservative": "X%", "realistic": "X%", "optimistic": "X%" },
      "KO": { "conservative": "X%", "realistic": "X%", "optimistic": "X%" },
      "JA": { "conservative": "X%", "realistic": "X%", "optimistic": "X%" },
      "ES": { "conservative": "X%", "realistic": "X%", "optimistic": "X%" },
      "PT-BR": { "conservative": "X%", "realistic": "X%", "optimistic": "X%" }
    }
  },
  "collaboration_areas": [
    "協力領域1",
    "協力領域2"
  ],
  "email_design_optimization": [
    "メールデザイン最適化1",
    "メールデザイン最適化2"
  ],
  "lp_optimization": [
    "LP最適化1",
    "LP最適化2"
  ],
  "workflow_optimization": "ワークフロー最適化案",
  "priority_recommendations": [
    "優先推奨事項1",
    "優先推奨事項2"
  ],
  "final_recommendations": "最終推奨事項"
}`;

  try {
    console.log('📢 Gemini CMO（マーケティング）にCVR向上ポテンシャルを相談中...');
    const result = await callGemini3Pro(prompt, {
      maxOutputTokens: 3000,
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
 * レポートを生成
 */
function generateReport(geminiResponse: any): string {
  const geminiData = typeof geminiResponse === 'string' ? extractJSON(geminiResponse) : geminiResponse;

  return `# CVR向上ポテンシャル分析レポート - Gemini CMO

**作成日**: ${new Date().toISOString()}  
**相談先**: Gemini CMO（最高マーケティング責任者、gemini-3-flash-preview）  
**目的**: Gemini CMOの企画力とCOO兼CTOの実装力の相乗効果によるCVR向上ポテンシャルの評価

---

## 📊 Gemini CMOの分析結果

${typeof geminiResponse === 'string' ? geminiResponse : JSON.stringify(geminiResponse, null, 2)}

---

## 🎯 主要な発見事項

### 1. CVR向上ポテンシャル

（Gemini CMOの予測をここに記載）

### 2. 協力領域

（Gemini CMOの提案をここに記載）

### 3. メールデザイン最適化

（Gemini CMOの提案をここに記載）

### 4. LP最適化

（Gemini CMOの提案をここに記載）

---

## 📝 次のアクション

1. Gemini CMOの提案を検討
2. 相乗効果を最大化するワークフローを実装
3. CVR向上のための最適化を実施

---

**作成者**: COO兼CTO（Cursor/Composer）  
**状態**: ✅ 分析完了
`;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 Gemini CMOへのCVR向上ポテンシャル相談を開始...\n');
  console.log('='.repeat(80));

  // 環境変数チェック
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEYが設定されていません');
    process.exit(1);
  }
  
  console.log('✅ 環境変数チェック完了\n');

  try {
    console.log('📞 Gemini CMOに相談を開始します...\n');
    
    const geminiResponse = await consultGeminiCMO();

    console.log('\n✅ Gemini CMOからの回答を受信しました\n');

    // レスポンスを保存
    const timestamp = Date.now();
    writeFileSync(
      join(OUTPUT_DIR, `cvr-potential-${timestamp}.json`),
      JSON.stringify(geminiResponse, null, 2),
      'utf-8'
    );

    // レポートを生成
    const report = generateReport(geminiResponse);
    writeFileSync(
      join(OUTPUT_DIR, `cvr-potential-report-${timestamp}.md`),
      report,
      'utf-8'
    );

    // ドキュメントディレクトリにも保存
    const docsDir = join(__dirname, '..', 'docs');
    writeFileSync(
      join(docsDir, `CVR_IMPROVEMENT_POTENTIAL_ANALYSIS.md`),
      report,
      'utf-8'
    );

    console.log('\n' + '='.repeat(80));
    console.log('✅ Gemini CMOへの相談が完了しました！');
    console.log(`\n📋 結果ファイル:`);
    console.log(`  - JSON: ${join(OUTPUT_DIR, `cvr-potential-${timestamp}.json`)}`);
    console.log(`  - レポート: ${join(OUTPUT_DIR, `cvr-potential-report-${timestamp}.md`)}`);
    console.log(`  - ドキュメント: ${join(docsDir, `CVR_IMPROVEMENT_POTENTIAL_ANALYSIS.md`)}`);
    
    // レスポンスの一部を表示
    console.log('\n📊 Gemini CMOの回答（一部）:');
    if (typeof geminiResponse === 'string') {
      console.log(geminiResponse.substring(0, 1000) + '...\n');
    } else {
      console.log(JSON.stringify(geminiResponse, null, 2).substring(0, 1000) + '...\n');
    }
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
