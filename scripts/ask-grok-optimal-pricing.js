// scripts/ask-grok-optimal-pricing.js
// Grokに最適な価格設定を質問

require('dotenv').config();
const OpenAI = require('openai');

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is not set');
  process.exit(1);
}

const grokClient = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: XAI_BASE_URL,
});

/**
 * Grok CSO+CFO（grok-4-1-fast-reasoning）で最適な価格設定を分析
 */
async function askGrokOptimalPricing() {
  const prompt = `あなたはTrap Defence BTCのCSO（Chief Strategy Officer）兼CFO（Chief Financial Officer）として、言語別の最適な価格設定を分析してください。

## 📊 現在のWhop価格設定（実際の設定）

### 言語別プラン価格

| 言語 | 月額 | 3ヶ月 | 年間 | プランタイプ |
|------|------|-------|------|------------|
| **EN** | $69 | $165 | $588 | renewal |
| **ES** | $117 | $317 | $797 | renewal |
| **PT-BR** | $117 | $317 | $797 | renewal |
| **AR** | $97 | $267 | $597 | renewal |
| **KO** | $117 | $317 | $797 | renewal |
| **JA** | $117 | $317 | $797 | renewal |

### プラン分散（実際の選択率）
- **月額**: 21.4%
- **3ヶ月**: 35.7%
- **年間**: 42.9%

### 言語別ARPU（プロモコード50%割引適用後、Whop手数料3%差し引き後）

| 言語 | 最終利益ARPU | EN比 |
|------|------------|------|
| **EN** | **$158.07** | 1.00x（基準） |
| **ES** | **$232.86** | 1.47x |
| **PT-BR** | **$232.86** | 1.47x |
| **AR** | **$180.51** | 1.14x |
| **KO** | **$232.86** | 1.47x |
| **JA** | **$232.86** | 1.47x |

### 言語別売上配分（目標）
- **EN**: 55%
- **ES**: 20%
- **PT-BR**: 12%
- **JA**: 8%
- **KO**: 3%
- **AR**: 2%

## 🎯 問題点

### 1. ARPUの大きな偏り
- **EN**: $158.07（最も低い）
- **ES/PT-BR/KO/JA**: $232.86（ENの約1.47倍）
- **AR**: $180.51（ENの約1.14倍）

### 2. 価格設定の不整合
- ENが最も低価格（$69/月）だが、売上配分は55%と最も高い
- ES/PT-BR/KO/JAが高価格（$117/月）だが、売上配分は合計43%と低い
- この価格設定では、ENの売上シェア55%を達成するのが困難

### 3. 購買力と価格のミスマッチ
- EN市場（US/UK）は購買力が高いが、価格が最も低い
- ES/PT-BR市場（LATAM）は購買力が中程度だが、価格が高い
- AR市場（MENA）は購買力が低いが、価格が中程度

## 📈 市場特性（参考情報）

### 言語別の購買力・市場特性
- **EN（US/UK）**: 購買力最高（ARPU $250目標）、CryptoユーザーPCI $65k、Coinbase ARPU $280平均
- **ES（LATAM）**: 購買力中（ARPU $180目標）、PCI $12k、Crypto採用率#1地域、FOMO高
- **PT-BR（ブラジル）**: 購買力中（ARPU $170目標）、PCI $15k、TGユーザー多
- **JA（日本）**: 購買力高だが保守的（ARPU $155目標）、PCI $40k、bitFlyer ARPU $150
- **KO（韓国）**: 購買力中高だが規制厳（ARPU $160目標）、PCI $35k、Upbit ARPU $155
- **AR（MENA）**: 購買力低（ARPU $150目標）、PCI $8k、ボラティリティ高、Islamic Finance準拠需要

## 💡 分析依頼事項

以下の視点から、最適な価格設定を分析してください：

### 1. 戦略的視点（CSO）

#### 1.1 価格戦略の最適化
- **ARPU均等化 vs 購買力対応**: ARPUを均等化すべきか、それとも購買力に応じた価格設定を維持すべきか
- **言語別売上配分の達成**: 目標売上配分（EN 55%、ES 20%、PT-BR 12%など）を達成するための価格設定
- **競合分析**: 各言語市場での競合価格とポジショニング

#### 1.2 市場ポジショニング
- **EN市場**: 高購買力市場でのプレミアムポジショニング vs ボリューム戦略
- **ES/PT-BR市場**: 成長市場での価格弾力性とCVR最適化
- **AR市場**: 低購買力市場でのボリューム戦略

### 2. 財務的視点（CFO）

#### 2.1 ARPU最適化
- **目標ARPU**: 言語別の目標ARPU設定（購買力と市場特性を考慮）
- **加重平均ARPU**: 言語別配分を考慮した加重平均ARPUの最適化
- **収益最大化**: 総収益を最大化する価格設定

#### 2.2 価格弾力性分析
- **EN市場**: 価格を上げた場合のCVR低下とARPU向上のトレードオフ
- **ES/PT-BR市場**: 価格を下げた場合のCVR向上とARPU低下のトレードオフ
- **AR市場**: 価格を下げた場合のボリューム増加効果

### 3. 実装視点

#### 3.1 推奨価格設定
各言語について、以下の形式で推奨価格を提示してください：
- **月額**: $XX（現在の$XXから変更）
- **3ヶ月**: $XX（現在の$XXから変更）
- **年間**: $XX（現在の$XXから変更）
- **変更理由**: なぜこの価格が最適か

#### 3.2 期待される効果
- **ARPU変化**: 各言語のARPUがどう変化するか
- **加重平均ARPU**: 言語別配分を考慮した加重平均ARPU
- **売上配分**: 目標売上配分への影響
- **総収益**: 総収益への影響

## 📋 出力形式

以下の形式で分析結果を出力してください：

### 1. エグゼクティブサマリー（300-400字）
現在の価格設定の問題点と最適化の重要性を要約

### 2. 戦略的視点（CSO）の分析
- 価格戦略の最適化方針
- 市場ポジショニング戦略
- 言語別売上配分達成戦略

### 3. 財務的視点（CFO）の分析
- ARPU最適化戦略
- 価格弾力性分析
- 収益最大化シナリオ

### 4. 推奨価格設定（表形式）

| 言語 | 月額（推奨） | 3ヶ月（推奨） | 年間（推奨） | 変更理由 | 期待ARPU（プロモコード適用後） |
|------|------------|-------------|------------|---------|---------------------------|
| **EN** | $XX | $XX | $XX | ... | $XX |
| **ES** | $XX | $XX | $XX | ... | $XX |
| **PT-BR** | $XX | $XX | $XX | ... | $XX |
| **AR** | $XX | $XX | $XX | ... | $XX |
| **KO** | $XX | $XX | $XX | ... | $XX |
| **JA** | $XX | $XX | $XX | ... | $XX |

### 5. 期待される効果
- 言語別ARPUの変化
- 加重平均ARPU（言語別配分考慮）
- 目標売上配分への影響
- 総収益への影響

### 6. 実装優先度
- **即座に修正すべき価格**: 優先度の高い言語（3-5言語）
- **段階的修正**: 検証後に修正すべき言語

### 7. 結論と次のアクション
- 総合的な結論
- 即座に実行すべき具体的な価格設定変更（言語別）

日本語で回答してください。`;

  try {
    console.log('🔄 Grok CSO+CFO（grok-4-1-fast-reasoning）で最適な価格設定分析を実行中...');
    console.log('='.repeat(80));

    const response = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'あなたはTrap Defence BTCのCSO（Chief Strategy Officer）兼CFO（Chief Financial Officer）です。戦略的かつ財務的な視点から、最適な価格設定を分析してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const analysis = response.choices[0].message.content;
    
    console.log('\n📊 Grok分析結果:');
    console.log('='.repeat(80));
    console.log(analysis);
    console.log('='.repeat(80));

    // 結果をファイルに保存
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, '../docs/GROK_OPTIMAL_PRICING_RECOMMENDATION_2026-01-24.md');
    
    const output = `# Grok推奨: 最適な価格設定
**作成日時**: ${new Date().toISOString().split('T')[0]}  
**分析者**: Grok CSO+CFO（grok-4-1-fast-reasoning）

---

${analysis}

---

**データソース**: Whop API（実際の製品設定）  
**分析スクリプト**: \`scripts/ask-grok-optimal-pricing.js\`
`;

    fs.writeFileSync(outputPath, output, 'utf-8');
    console.log(`\n✅ 分析結果を保存しました: ${outputPath}`);

    return analysis;
  } catch (error) {
    console.error('❌ エラー:', error.message);
    if (error.response) {
      console.error('レスポンス:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  askGrokOptimalPricing()
    .then(() => {
      console.log('\n✅ 分析完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { askGrokOptimalPricing };
