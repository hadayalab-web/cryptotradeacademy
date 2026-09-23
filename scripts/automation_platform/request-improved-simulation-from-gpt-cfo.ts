#!/usr/bin/env tsx
/**
 * GPT CFOに改修後シミュレーションモデルの仕様を依頼
 * 
 * CFOのレビューを基に、解像度の高いシミュレーションモデルを提案してもらう
 */

import { callGPT52, sendResendEmail } from '../api/unified-api.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('🚀 GPT CFOに改修後シミュレーションモデルの仕様を依頼します...\n');
  console.log('='.repeat(80));
  console.log('📊 依頼内容: 解像度の高いシミュレーションモデルの仕様');
  console.log('='.repeat(80) + '\n');

  // CFOのレビュー結果を読み込む
  const reviewPath = join(__dirname, '../docs/GPT_CFO_SIMULATION_REVIEW.md');
  let reviewContent = '';
  
  if (fs.existsSync(reviewPath)) {
    reviewContent = fs.readFileSync(reviewPath, 'utf-8');
  }

  const prompt = `【CFO（GPT）への依頼: 改修後シミュレーションモデルの仕様】

あなたは、Trap Defence BTCのCFO（Chief Financial Officer）です。

先ほどのレビューで、以下の改善提案をいただきました：

1. **CVを離散化**: Binomial(n=リスト数, p=CVR) または Poisson(λ=リスト数×CVR)
2. **リスト数分布を対数正規/ガンマへ**: 0未満排除＋右裾表現
3. **相関を導入**: リスト数とCVRの負の相関
4. **停止日（ゼロ化）の混入**: p_stop=1〜3%/日でCV=0
5. **市場別モデル**: 6市場を別々に、各市場に供給上限・CVR分布・BANリスク
6. **ファネル分解**: 到達→返信→商談→決済
7. **シナリオ分析**: Base/Upside/Downside

## 依頼内容

以下の詳細な仕様を提示してください：

### 1. 改修後モデルの仕様（数式/疑似コード）

各Phase（Phase 0-4）について、以下の要素を含む詳細な仕様：
- **リスト収集数の分布**: 対数正規/ガンマ分布のパラメータ
- **CVRの分布**: ベータ分布のパラメータ
- **相関関係**: リスト数とCVRの負の相関の実装方法
- **停止日の確率**: p_stop、p_degradedの設定
- **市場別制約**: 各市場（EN, AR, KO, JA, ES, PT-BR）の供給上限
- **CVの離散化**: Binomial/Poissonの選択とパラメータ

### 2. Base/Upside/Downsideの具体パラメータ表

各シナリオについて、以下のパラメータを表形式で提示：
- **Base**: CSO現実（500/日）、CMO現実（最適化後4.5%）
- **Upside**: 600/日＆CVR 5.5%＆停止日少
- **Downside**: 400/日＆CVR 3.5%＆停止日増

各シナリオの：
- リスト収集数（市場別）
- CVR（市場別）
- 停止日確率
- 相関係数
- 期待CV/日
- 達成確率（30CV/日）

### 3. P50/P75での30CV達成設計

**P50で30CV/日**を達成するための：
- 必要リスト数（市場別）
- 必要CVR（市場別）
- 停止日確率の上限
- 相関係数の上限

**P75で30CV/日**を達成するための：
- 必要リスト数（市場別）
- 必要CVR（市場別）
- 停止日確率の上限
- 相関係数の上限

### 4. 実装可能なコード仕様

TypeScriptで実装可能な形で、以下の関数の仕様を提示：
- simulateListCollection関数: 市場とPhaseを受け取り、リスト収集数を返す
- simulateCVR関数: 市場、Phase、リストサイズを受け取り、CVRを返す
- simulateStopDay関数: Phaseを受け取り、停止日かどうかを返す
- simulateCV関数: リストサイズ、CVR、停止日フラグを受け取り、CV数を返す
- simulatePhaseImproved関数: Phase名、目標CV、シナリオを受け取り、シミュレーション結果を返す

### 5. 市場別制約の実装

CSOの評価「EN以外は50-80件が現実的」を反映した：
- 各市場の供給上限
- 市場別のリスト収集分布パラメータ
- 市場別のCVR分布パラメータ

---

**CFOとして、経営判断に耐える解像度の高いシミュレーションモデルの仕様を提示してください。実装可能な形で、具体的な数値とコード仕様を含めてください。**`;

  try {
    console.log('📊 GPT CFOに改修後モデルの仕様を依頼中...\n');
    
    const result = await callGPT52(prompt, {
      temperature: 0.7,
      maxCompletionTokens: 16384, // 長い仕様書のため増やす
    });

    const specificationText = result.text.trim();

    console.log('✅ GPT CFOからの仕様を受領\n');
    console.log(specificationText.substring(0, 2000) + '...\n');
    console.log('='.repeat(80) + '\n');

    // 仕様書を保存
    const specPath = join(__dirname, '../docs/GPT_CFO_IMPROVED_SIMULATION_SPECIFICATION.md');
    const specContent = `# GPT CFOによる改修後シミュレーションモデルの仕様

**作成日時**: ${new Date().toISOString()}  
**作成者**: GPT CFO（gpt-5-2-2025-12-11）  
**目的**: 解像度の高いKPI達成確度シミュレーションモデル

---

## 📊 改修後モデルの仕様

${specificationText}

---

**作成日時**: ${new Date().toISOString()}  
**作成者**: GPT CFO（gpt-5-2-2025-12-11）
`;

    fs.writeFileSync(specPath, specContent, 'utf-8');
    console.log(`✅ 仕様書を保存しました: ${specPath}\n`);

    // CEOにメール報告
    const emailContent = `🚀 GPT CFOによる改修後シミュレーションモデルの仕様完了

⏱️ 作成時刻: ${new Date().toISOString()}

## 📊 仕様書の内容

GPT CFO（gpt-5-2-2025-12-11）が、解像度の高いシミュレーションモデルの仕様を提示しました。

### 含まれる内容
1. 改修後モデルの仕様（数式/疑似コード）
2. Base/Upside/Downsideの具体パラメータ表
3. P50/P75での30CV達成設計
4. 実装可能なコード仕様
5. 市場別制約の実装

---

詳細は docs/GPT_CFO_IMPROVED_SIMULATION_SPECIFICATION.md を参照してください。

**CFOとして、経営判断に耐える解像度の高いシミュレーションモデルの仕様を提示しました。**`;

    try {
      await sendResendEmail({
        from: 'COO兼CTO <noreply@cryptotradeacademy.io>',
        to: 'admin@cryptotradeacademy.io',
        subject: '🚀 GPT CFOによる改修後シミュレーションモデルの仕様完了',
        html: emailContent.replace(/\n/g, '<br>'),
      });
      console.log('✅ CEOにメール報告完了\n');
    } catch (error: any) {
      console.warn(`⚠️ CEOメール通知失敗: ${error.message}\n`);
    }

    console.log('='.repeat(80));
    console.log('✅ GPT CFOによる改修後シミュレーションモデルの仕様完了');
    console.log('='.repeat(80));
    console.log('\n📊 CFOの仕様を基に、解像度の高いシミュレーションを実装します。\n');

  } catch (error: any) {
    console.error('❌ GPT CFO仕様取得エラー:', error.message);
    throw error;
  }
}

main().catch(console.error);
