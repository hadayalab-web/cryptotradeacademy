#!/usr/bin/env tsx
/**
 * GPT CFOにKPIポテンシャルの高解像度シミュレーションを依頼
 * 
 * Grok CSOとGemini CMOの分析結果を踏まえて、
 * GPT CFO（gpt-5.2-2025-12-11）にKPIのポテンシャルを高解像度でシミュレーション
 */

import { callGPT52 } from '../api/unified-api.js';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const OUTPUT_DIR = join(__dirname, '..', 'data', 'gpt-consultations');
mkdirSync(OUTPUT_DIR, { recursive: true });

/**
 * Grok CSOとGemini CMOの分析結果を読み込む
 */
function loadAnalysisResults() {
  const grokAnalysisPath = join(__dirname, '..', 'docs', 'EMAIL_ACQUISITION_POTENTIAL_ANALYSIS.md');
  const geminiAnalysisPath = join(__dirname, '..', 'docs', 'CVR_IMPROVEMENT_POTENTIAL_ANALYSIS.md');
  
  const grokAnalysis = readFileSync(grokAnalysisPath, 'utf-8');
  const geminiAnalysis = readFileSync(geminiAnalysisPath, 'utf-8');
  
  return { grokAnalysis, geminiAnalysis };
}

/**
 * GPT CFOにKPIポテンシャルの高解像度シミュレーションを依頼
 */
async function consultGPTCFO(): Promise<any> {
  const { grokAnalysis, geminiAnalysis } = loadAnalysisResults();
  
  const prompt = `あなたは最高財務責任者（CFO）です。

現在、メールファースト戦略を採用して、リードマグネット戦略でメールアドレスを収集し、Whopコンバージョンを最大化する計画を立てています。

【Grok CSO（最高戦略責任者）の分析結果】
${grokAnalysis}

【Gemini CMO（最高マーケティング責任者）の分析結果】
${geminiAnalysis}

【依頼内容】
Grok CSOとGemini CMOの分析結果を踏まえて、KPIのポテンシャルを高解像度でシミュレーションしてください。

【シミュレーション要件】
1. **売上予測の高解像度シミュレーション**
   - 日次、週次、月次の売上予測（保守的・現実的・楽観的シナリオ）
   - 市場別（EN, AR, KO, JA, ES, PT-BR）の詳細な売上予測
   - Whop価格設定（$69/月想定）を考慮した売上計算

2. **KPI達成確度の評価**
   - 週末までに$100,000達成の確度（保守的・現実的・楽観的）
   - 日次30CV（5CV/市場）達成の確度
   - 各シナリオでの達成確率（%）

3. **財務リスク分析**
   - 各シナリオでのリスク要因
   - 最悪ケースのシナリオ
   - リスク軽減策

4. **市場別の詳細KPI分析**
   - 各市場（EN, AR, KO, JA, ES, PT-BR）の売上ポテンシャル
   - 市場別のCVRとメール取得率の組み合わせ分析
   - 市場別の優先順位付け

5. **時系列でのKPI推移予測**
   - 1日目、3日目、7日目、14日目、30日目のKPI予測
   - 成長曲線の分析
   - ブレークスルーポイントの特定

6. **ROI分析**
   - 投資対効果の計算
   - コスト構造の分析
   - 利益率の予測

7. **シナリオ別の詳細財務モデル**
   - 保守的シナリオ: メール30件/日、CVR 15%
   - 現実的シナリオ: メール100件/日、CVR 22.5%
   - 楽観的シナリオ: メール300件/日、CVR 35%
   - 各シナリオでの売上、利益、ROIの詳細計算

【回答形式】
JSON形式で回答してください:
{
  "revenue_projections": {
    "daily": {
      "conservative": {
        "total": "$X",
        "by_market": {
          "EN": "$X",
          "AR": "$X",
          "KO": "$X",
          "JA": "$X",
          "ES": "$X",
          "PT-BR": "$X"
        }
      },
      "realistic": { ... },
      "optimistic": { ... }
    },
    "weekly": { ... },
    "monthly": { ... }
  },
  "kpi_achievement_probability": {
    "weekend_100k": {
      "conservative": "X%",
      "realistic": "X%",
      "optimistic": "X%"
    },
    "daily_30cv": {
      "conservative": "X%",
      "realistic": "X%",
      "optimistic": "X%"
    }
  },
  "risk_analysis": {
    "risk_factors": [ ... ],
    "worst_case_scenario": { ... },
    "risk_mitigation": [ ... ]
  },
  "market_analysis": {
    "EN": { ... },
    "AR": { ... },
    "KO": { ... },
    "JA": { ... },
    "ES": { ... },
    "PT-BR": { ... }
  },
  "timeline_projections": {
    "day_1": { ... },
    "day_3": { ... },
    "day_7": { ... },
    "day_14": { ... },
    "day_30": { ... }
  },
  "roi_analysis": {
    "conservative": { ... },
    "realistic": { ... },
    "optimistic": { ... }
  },
  "financial_models": {
    "conservative": {
      "email_acquisition": 30,
      "cvr": "15%",
      "daily_conversions": X,
      "daily_revenue": "$X",
      "weekly_revenue": "$X",
      "monthly_revenue": "$X",
      "profit_margin": "X%",
      "roi": "X%"
    },
    "realistic": { ... },
    "optimistic": { ... }
  },
  "breakthrough_points": [ ... ],
  "recommendations": [ ... ],
  "final_assessment": "最終評価と推奨事項"
}`;

  try {
    console.log('📢 GPT CFO（財務）にKPIポテンシャルの高解像度シミュレーションを依頼中...');
    const result = await callGPT52(prompt, {
      maxCompletionTokens: 8000,
      temperature: 0.3, // 財務分析は低い温度で正確性を重視
    });
    
    console.log(`✅ GPT CFO回答完了 (${result.text?.length || 0}文字)`);
    return result.text || result;
  } catch (error: any) {
    console.error(`❌ GPT CFO相談エラー: ${error.message}`);
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
function generateReport(gptData: any): string {
  const data = gptData;

  return `# KPIポテンシャル高解像度シミュレーション - GPT CFO

**作成日**: ${new Date().toISOString()}  
**相談先**: GPT CFO（最高財務責任者、gpt-5.2-2025-12-11）  
**目的**: Grok CSOとGemini CMOの分析結果を踏まえたKPIポテンシャルの高解像度シミュレーション

---

## 🎯 最終評価

**GPT CFOの結論**: ${data.final_assessment || '分析完了'}

---

## 📊 売上予測（高解像度）

### 日次売上予測

| シナリオ | 合計 | EN | AR | KO | JA | ES | PT-BR |
|---------|------|----|----|----|----|----|----|
| **保守的** | ${data.revenue_projections?.daily?.conservative?.total || 'N/A'} | ${data.revenue_projections?.daily?.conservative?.by_market?.EN || 'N/A'} | ${data.revenue_projections?.daily?.conservative?.by_market?.AR || 'N/A'} | ${data.revenue_projections?.daily?.conservative?.by_market?.KO || 'N/A'} | ${data.revenue_projections?.daily?.conservative?.by_market?.JA || 'N/A'} | ${data.revenue_projections?.daily?.conservative?.by_market?.ES || 'N/A'} | ${data.revenue_projections?.daily?.conservative?.by_market?.['PT-BR'] || 'N/A'} |
| **現実的** | ${data.revenue_projections?.daily?.realistic?.total || 'N/A'} | ${data.revenue_projections?.daily?.realistic?.by_market?.EN || 'N/A'} | ${data.revenue_projections?.daily?.realistic?.by_market?.AR || 'N/A'} | ${data.revenue_projections?.daily?.realistic?.by_market?.KO || 'N/A'} | ${data.revenue_projections?.daily?.realistic?.by_market?.JA || 'N/A'} | ${data.revenue_projections?.daily?.realistic?.by_market?.ES || 'N/A'} | ${data.revenue_projections?.daily?.realistic?.by_market?.['PT-BR'] || 'N/A'} |
| **楽観的** | ${data.revenue_projections?.daily?.optimistic?.total || 'N/A'} | ${data.revenue_projections?.daily?.optimistic?.by_market?.EN || 'N/A'} | ${data.revenue_projections?.daily?.optimistic?.by_market?.AR || 'N/A'} | ${data.revenue_projections?.daily?.optimistic?.by_market?.KO || 'N/A'} | ${data.revenue_projections?.daily?.optimistic?.by_market?.JA || 'N/A'} | ${data.revenue_projections?.daily?.optimistic?.by_market?.ES || 'N/A'} | ${data.revenue_projections?.daily?.optimistic?.by_market?.['PT-BR'] || 'N/A'} |

### 週次売上予測

| シナリオ | 合計 |
|---------|------|
| **保守的** | ${data.revenue_projections?.weekly?.conservative?.total || 'N/A'} |
| **現実的** | ${data.revenue_projections?.weekly?.realistic?.total || 'N/A'} |
| **楽観的** | ${data.revenue_projections?.weekly?.optimistic?.total || 'N/A'} |

### 月次売上予測

| シナリオ | 合計 |
|---------|------|
| **保守的** | ${data.revenue_projections?.monthly?.conservative?.total || 'N/A'} |
| **現実的** | ${data.revenue_projections?.monthly?.realistic?.total || 'N/A'} |
| **楽観的** | ${data.revenue_projections?.monthly?.optimistic?.total || 'N/A'} |

---

## 🎯 KPI達成確度

### 週末$100k達成確度

| シナリオ | 確度 | 必要CV（7日間） | 期待CV（7日間） |
|---------|------|----------------|----------------|
| **保守的** | ${data.kpi_achievement_probability?.weekend_100k?.conservative || 'N/A'} | ${data.kpi_achievement_probability?.weekend_100k?.details?.required_conversions_in_7_days || 'N/A'} | ${data.kpi_achievement_probability?.weekend_100k?.details?.expected_conversions_in_7_days?.conservative || 'N/A'} |
| **現実的** | ${data.kpi_achievement_probability?.weekend_100k?.realistic || 'N/A'} | - | ${data.kpi_achievement_probability?.weekend_100k?.details?.expected_conversions_in_7_days?.realistic || 'N/A'} |
| **楽観的** | ${data.kpi_achievement_probability?.weekend_100k?.optimistic || 'N/A'} | - | ${data.kpi_achievement_probability?.weekend_100k?.details?.expected_conversions_in_7_days?.optimistic || 'N/A'} |

**コメント**: ${data.kpi_achievement_probability?.weekend_100k?.details?.comment || 'N/A'}

### 日次30CV達成確度

| シナリオ | 確度 | 期待CV（日次） |
|---------|------|--------------|
| **保守的** | ${data.kpi_achievement_probability?.daily_30cv?.conservative || 'N/A'} | ${data.kpi_achievement_probability?.daily_30cv?.details?.expected_daily_conversions_total?.conservative || 'N/A'} |
| **現実的** | ${data.kpi_achievement_probability?.daily_30cv?.realistic || 'N/A'} | ${data.kpi_achievement_probability?.daily_30cv?.details?.expected_daily_conversions_total?.realistic || 'N/A'} |
| **楽観的** | ${data.kpi_achievement_probability?.daily_30cv?.optimistic || 'N/A'} | ${data.kpi_achievement_probability?.daily_30cv?.details?.expected_daily_conversions_total?.optimistic || 'N/A'} |

**各市場5CV制約**: ${data.kpi_achievement_probability?.daily_30cv?.details?.probability_notes?.per_market_5cv_constraint || 'N/A'}

---

## ⚠️ 財務リスク分析

### リスク要因

${data.risk_analysis?.risk_factors?.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n') || 'N/A'}

### 最悪ケースシナリオ

- **定義**: ${data.risk_analysis?.worst_case_scenario?.definition || 'N/A'}
- **実効CVR**: ${data.risk_analysis?.worst_case_scenario?.implied_effective_cvr || 'N/A'}
- **日次CV**: ${data.risk_analysis?.worst_case_scenario?.daily_conversions || 'N/A'}
- **日次売上**: ${data.risk_analysis?.worst_case_scenario?.daily_revenue || 'N/A'}
- **週次売上**: ${data.risk_analysis?.worst_case_scenario?.weekly_revenue || 'N/A'}
- **月次売上**: ${data.risk_analysis?.worst_case_scenario?.monthly_revenue || 'N/A'}
- **キャッシュリスク**: ${data.risk_analysis?.worst_case_scenario?.cash_risk || 'N/A'}

### リスク軽減策

${data.risk_analysis?.risk_mitigation?.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n') || 'N/A'}

---

## 🌍 市場別詳細分析

${Object.entries(data.market_analysis || {}).map(([market, info]: [string, any]) => `
### ${market}市場（優先度: ${info.priority}）

- **メール取得数/日**: 保守的 ${info.email_per_day?.conservative || 'N/A'} / 現実的 ${info.email_per_day?.realistic || 'N/A'} / 楽観的 ${info.email_per_day?.optimistic || 'N/A'}
- **CVR**: 保守的 ${info.cvr?.conservative || 'N/A'} / 現実的 ${info.cvr?.realistic || 'N/A'} / 楽観的 ${info.cvr?.optimistic || 'N/A'}
- **期待日次CV（現実的）**: ${info.expected_daily_conversions_realistic || 'N/A'}
- **期待日次売上（現実的）**: ${info.expected_daily_revenue_realistic || 'N/A'}
- **備考**: ${info.notes || 'N/A'}
`).join('\n')}

---

## 📈 時系列KPI推移予測

| 日数 | シナリオ | メール数 | CV数 | 売上 |
|------|---------|---------|------|------|
| **1日目** | 保守的 | ${data.timeline_projections?.day_1?.conservative?.emails || 'N/A'} | ${data.timeline_projections?.day_1?.conservative?.conversions || 'N/A'} | ${data.timeline_projections?.day_1?.conservative?.revenue || 'N/A'} |
| | 現実的 | ${data.timeline_projections?.day_1?.realistic?.emails || 'N/A'} | ${data.timeline_projections?.day_1?.realistic?.conversions || 'N/A'} | ${data.timeline_projections?.day_1?.realistic?.revenue || 'N/A'} |
| | 楽観的 | ${data.timeline_projections?.day_1?.optimistic?.emails || 'N/A'} | ${data.timeline_projections?.day_1?.optimistic?.conversions || 'N/A'} | ${data.timeline_projections?.day_1?.optimistic?.revenue || 'N/A'} |
| **7日目** | 保守的 | ${data.timeline_projections?.day_7?.conservative?.emails || 'N/A'} | ${data.timeline_projections?.day_7?.conservative?.conversions || 'N/A'} | ${data.timeline_projections?.day_7?.conservative?.revenue || 'N/A'} |
| | 現実的 | ${data.timeline_projections?.day_7?.realistic?.emails || 'N/A'} | ${data.timeline_projections?.day_7?.realistic?.conversions || 'N/A'} | ${data.timeline_projections?.day_7?.realistic?.revenue || 'N/A'} |
| | 楽観的 | ${data.timeline_projections?.day_7?.optimistic?.emails || 'N/A'} | ${data.timeline_projections?.day_7?.optimistic?.conversions || 'N/A'} | ${data.timeline_projections?.day_7?.optimistic?.revenue || 'N/A'} |
| **30日目** | 保守的 | ${data.timeline_projections?.day_30?.conservative?.emails || 'N/A'} | ${data.timeline_projections?.day_30?.conservative?.conversions || 'N/A'} | ${data.timeline_projections?.day_30?.conservative?.revenue || 'N/A'} |
| | 現実的 | ${data.timeline_projections?.day_30?.realistic?.emails || 'N/A'} | ${data.timeline_projections?.day_30?.realistic?.conversions || 'N/A'} | ${data.timeline_projections?.day_30?.realistic?.revenue || 'N/A'} |
| | 楽観的 | ${data.timeline_projections?.day_30?.optimistic?.emails || 'N/A'} | ${data.timeline_projections?.day_30?.optimistic?.conversions || 'N/A'} | ${data.timeline_projections?.day_30?.optimistic?.revenue || 'N/A'} |

**成長曲線分析**: ${data.timeline_projections?.growth_curve_analysis?.comment || 'N/A'}

**ブレークスルー候補**: ${data.timeline_projections?.growth_curve_analysis?.breakthrough_candidate || 'N/A'}

---

## 💰 ROI分析

| シナリオ | 月次売上 | 月次コスト | 月次利益 | 利益率 | ROI |
|---------|---------|-----------|---------|--------|-----|
| **保守的** | ${data.roi_analysis?.conservative?.monthly_revenue || 'N/A'} | ${data.roi_analysis?.conservative?.monthly_costs?.total || 'N/A'} | ${data.roi_analysis?.conservative?.monthly_profit || 'N/A'} | ${data.roi_analysis?.conservative?.profit_margin || 'N/A'} | ${data.roi_analysis?.conservative?.roi || 'N/A'} |
| **現実的** | ${data.roi_analysis?.realistic?.monthly_revenue || 'N/A'} | ${data.roi_analysis?.realistic?.monthly_costs?.total || 'N/A'} | ${data.roi_analysis?.realistic?.monthly_profit || 'N/A'} | ${data.roi_analysis?.realistic?.profit_margin || 'N/A'} | ${data.roi_analysis?.realistic?.roi || 'N/A'} |
| **楽観的** | ${data.roi_analysis?.optimistic?.monthly_revenue || 'N/A'} | ${data.roi_analysis?.optimistic?.monthly_costs?.total || 'N/A'} | ${data.roi_analysis?.optimistic?.monthly_profit || 'N/A'} | ${data.roi_analysis?.optimistic?.profit_margin || 'N/A'} | ${data.roi_analysis?.optimistic?.roi || 'N/A'} |

---

## 🎯 ブレークスルーポイント

${data.breakthrough_points?.map((bp: any, i: number) => `
### ${i + 1}. ${bp.name}

- **指標**: ${bp.metric || 'N/A'}
- **必要条件**: ${bp.required ? JSON.stringify(bp.required, null, 2) : bp.bottleneck || 'N/A'}
- **アクションヒント**: ${bp.action_hint || 'N/A'}
`).join('\n') || 'N/A'}

---

## 💡 GPT CFOの推奨事項

${data.recommendations?.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n\n') || 'N/A'}

---

## 📝 次のアクション

1. GPT CFOのシミュレーション結果を検討
2. 最適なシナリオの選択
3. リスク軽減策の実装
4. KPI達成計画の調整

---

**作成者**: COO兼CTO（Cursor/Composer）  
**相談先**: GPT CFO（gpt-5.2-2025-12-11）  
**状態**: ✅ 高解像度シミュレーション完了
`;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 GPT CFOへのKPIポテンシャル高解像度シミュレーション依頼を開始...\n');
  console.log('='.repeat(80));

  // 環境変数チェック
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEYが設定されていません');
    process.exit(1);
  }
  
  console.log('✅ 環境変数チェック完了\n');

  try {
    console.log('📞 GPT CFOに高解像度シミュレーションを依頼します...\n');
    
    const gptResponse = await consultGPTCFO();

    console.log('\n✅ GPT CFOからの回答を受信しました\n');

    // JSONをパース（文字列の場合）
    let parsedResponse: any;
    if (typeof gptResponse === 'string') {
      try {
        // エスケープされたJSON文字列をパース
        parsedResponse = JSON.parse(gptResponse);
      } catch (e) {
        // 既にパース済みの場合
        parsedResponse = extractJSON(gptResponse);
      }
    } else {
      parsedResponse = gptResponse;
    }

    // レスポンスを保存
    const timestamp = Date.now();
    writeFileSync(
      join(OUTPUT_DIR, `kpi-simulation-${timestamp}.json`),
      JSON.stringify(parsedResponse, null, 2),
      'utf-8'
    );

    // レポートを生成
    const report = generateReport(parsedResponse);
    writeFileSync(
      join(OUTPUT_DIR, `kpi-simulation-report-${timestamp}.md`),
      report,
      'utf-8'
    );

    // ドキュメントディレクトリにも保存
    const docsDir = join(__dirname, '..', 'docs');
    writeFileSync(
      join(docsDir, `KPI_POTENTIAL_HIGH_RESOLUTION_SIMULATION.md`),
      report,
      'utf-8'
    );

    console.log('\n' + '='.repeat(80));
    console.log('✅ GPT CFOへの高解像度シミュレーション依頼が完了しました！');
    console.log(`\n📋 結果ファイル:`);
    console.log(`  - JSON: ${join(OUTPUT_DIR, `kpi-simulation-${timestamp}.json`)}`);
    console.log(`  - レポート: ${join(OUTPUT_DIR, `kpi-simulation-report-${timestamp}.md`)}`);
    console.log(`  - ドキュメント: ${join(docsDir, `KPI_POTENTIAL_HIGH_RESOLUTION_SIMULATION.md`)}`);
    
    // レスポンスの一部を表示
    console.log('\n📊 GPT CFOの回答（一部）:');
    if (typeof gptResponse === 'string') {
      console.log(gptResponse.substring(0, 2000) + '...\n');
    } else {
      console.log(JSON.stringify(gptResponse, null, 2).substring(0, 2000) + '...\n');
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
