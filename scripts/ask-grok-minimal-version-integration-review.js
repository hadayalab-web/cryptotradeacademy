// scripts/ask-grok-minimal-version-integration-review.js
// Grokに無料版メッセージ素材の引用リポスト統合実装の評価を依頼

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const XAI_API_KEY = process.env.XAI_API_KEY || 'xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii';
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
 * Grok CSO+CFO（grok-4-1-fast-reasoning）で無料版メッセージ素材の引用リポスト統合実装を評価
 */
async function askGrokMinimalVersionIntegrationReview() {
  const prompt = `あなたはTrap Defence BTCのCSO（Chief Strategy Officer）兼CFO（Chief Financial Officer）として、無料版メッセージ素材の引用リポスト統合実装を評価してください。

## 🎯 実装概要

### 1. 無料版メッセージの高品質素材

無料版メッセージは以下の高品質な素材を含んでいます：

**例（実際の配信メッセージ）**:
\`\`\`
🌤️ Trap Defence BTC - Free Report
🚨 BREAKING: TRAP DEFENCE BRIEFING
📅 2026-01-24 00:00:21 UTC

━━━━━━━━━━━━━━━━━━━━
🎯 Today's Trap Score
━━━━━━━━━━━━━━━━━━━━
70/100
⚠️ HIGH TRAP RISK: Strong signals indicate potential market traps. Exercise extreme caution

💰 BTC Price: $89,493 (+0.06% / 24h)

🚨 The market is showing strong trap signals. Despite what price charts might suggest, on-chain data reveals hidden risks
💡 Multiple divergences and anomalies indicate potential market traps. Entering now could expose you to significant risk

━━━━━━━━━━━━━━━━━━━━
📊 Data-Backed Reasons
━━━━━━━━━━━━━━━━━━━━
• Exchange Netflow: +1252 BTC (inflow) — Potential selling pressure
• Whale Ratio: 56% — Moderately high selling pressure

💡 Strategic Insights
  🚨 Trap Score 70/100: Strong signals indicate potential market traps
  🛡️ Strategic preparation is not weakness—it's victory preparation. 70% of the time, prepare for victory

━━━━━━━━━━━━━━━━━━━━
🚫 What to Avoid
━━━━━━━━━━━━━━━━━━━━
• Avoid entering new positions — Strong trap signals detected
• Wait for clearer market signals before trading

━━━━━━━━━━━━━━━━━━━━
💊 Dr. Grok's Quick Insight
━━━━━━━━━━━━━━━━━━━━
"FOMO is high right now. Don't let greed override your defense strategy. Wait. This is the most dangerous time."

━━━━━━━━━━━━━━━━━━━━
✅ Mental Note
━━━━━━━━━━━━━━━━━━━━
"90% of professional traders prioritize waiting time. Take the same strategy."
\`\`\`

### 2. 実装内容

**新規追加機能**: \`getMinimalVersionContent\`関数
- 無料版メッセージを生成
- キーポイントを抽出:
  - **フックメッセージ**: "🚨 BREAKING: TRAP DEFENCE BRIEFING"
  - **Trap Score**: 70/100
  - **データポイント**: Exchange Netflow, Whale Ratio
  - **Dr. Grok's Quick Insight**: "FOMO is high right now. Don't let greed override your defense strategy. Wait. This is the most dangerous time."
  - **Mental Note**: "90% of professional traders prioritize waiting time. Take the same strategy."
  - **What to Avoid**: 具体的な警告リスト

**Grok引用リポスト生成への統合**:
- \`generateQuoteRepostTextWithGrok\`関数で無料版コンテンツを取得
- \`generateQuoteRepostText\`関数に\`minimalContent\`パラメータを追加
- Grokプロンプトに無料版コンテンツのキーポイントを追加
- 無料版の素材を自然に引用リポストに組み込む指示を追加

**プロンプト更新例**:
\`\`\`
🎯 HIGH-QUALITY MINIMAL VERSION CONTENT (Use these powerful elements to maximize engagement):
Hook Message: "🚨 BREAKING: TRAP DEFENCE BRIEFING"
Trap Score: 70/100
Key Data Points:
- Exchange Netflow: +1252 BTC (inflow) — Potential selling pressure
- Whale Ratio: 56% — Moderately high selling pressure
Dr. Grok's Insight: "FOMO is high right now. Don't let greed override your defense strategy. Wait. This is the most dangerous time."
Mental Note: "90% of professional traders prioritize waiting time. Take the same strategy."
What to Avoid:
- Avoid entering new positions — Strong trap signals detected
- Wait for clearer market signals before trading

CRITICAL: Incorporate these high-quality elements naturally into your quote repost. Use the hook message, Dr. Grok's insight, or mental note to create compelling, algorithm-optimized content that drives clicks.
\`\`\`

### 3. ファネル構造

\`\`\`
Grok引用リポスト（無料版素材を活用）
↓ Deep Linkクリック
無料版オプトイン（Telegram Bot）
↓
1日4回の無料版メッセージ受信（15分ごとのcronで配信）
↓
24時間後にVSL2配信（プロモコード付き）
↓
Whopでコンバージョン
\`\`\`

### 4. 引用リポストの例（改善後）

**改善前**:
\`\`\`
Agree! TrapDefence detected this signal 🚀 
How do you trade? 
Free: t.me/TrapDefenceBot?start=minimal_en_x_quote&... 
See full analysis: https://x.com/trapdefence/status/1234567890
\`\`\`

**改善後（無料版素材を活用）**:
\`\`\`
Agree! "FOMO is high right now. Don't let greed override your defense strategy. Wait." 🚨 
Trap Score 70/100 detected. How do you protect your capital? 
Free: t.me/TrapDefenceBot?start=minimal_en_x_quote&... 
See full analysis: https://x.com/trapdefence/status/1234567890
\`\`\`

または

\`\`\`
🚨 BREAKING: "90% of professional traders prioritize waiting time. Take the same strategy." 
TrapDefence caught this. How do you trade? 
Free: t.me/TrapDefenceBot?start=minimal_en_x_quote&... 
See full analysis: https://x.com/trapdefence/status/1234567890
\`\`\`

## 📊 評価依頼事項

以下の視点から、この実装を評価してください：

### 1. 戦略的視点（CSO）

#### 1.1 コンテンツ品質の向上
- 無料版メッセージの高品質素材を引用リポストに活用することの戦略的価値
- 「その場のふわっとした気分のポスト」から「データに基づいた説得力のあるコンテンツ」への転換の重要性
- Xアルゴリズム最適化への影響

#### 1.2 ファネル最適化
- 引用リポスト → 無料版オプトイン → 継続的な価値提供 → VSL2 → コンバージョンの流れの最適化
- 無料版素材を活用することで、オプトイン率とコンバージョン率への影響

#### 1.3 競合優位性
- この実装が競合他社との差別化要因としてどの程度有効か
- 無料版の高品質素材を活用した引用リポストの市場での位置づけ

### 2. 財務的視点（CFO）

#### 2.1 ROI分析
- 無料版素材を活用した引用リポストのエンゲージメント率向上予測
- コンバージョン率向上による収益への影響
- 実装コスト（開発時間、APIコスト）と期待されるROI

#### 2.2 収益予測
- 無料版素材を活用した引用リポストによるコンバージョン率向上予測
- エンゲージメント率向上によるリーチ拡大と収益への影響

### 3. 技術的視点（CTO）

#### 3.1 実装品質
- \`getMinimalVersionContent\`関数の実装品質
- キーポイント抽出の精度と信頼性
- エラーハンドリングとフォールバック戦略

#### 3.2 スケーラビリティ
- 6言語対応の実装が適切か
- 無料版メッセージ生成のパフォーマンスへの影響
- 将来的な拡張性

### 4. マーケティング視点（CMO）

#### 4.1 メッセージング戦略
- 無料版素材を活用した引用リポストのメッセージング戦略の有効性
- ユーザー心理への影響（FOMO、好奇心、信頼性）

#### 4.2 ブランド価値
- 無料版の高品質素材を活用することで、ブランド価値への影響
- 「データに基づいた説得力のあるコンテンツ」というブランドイメージの強化

## 📋 出力形式

以下の形式で評価結果を出力してください：

### 1. エグゼクティブサマリー（300-400字）
この実装の戦略的価値と期待される効果を要約

### 2. 戦略的評価（CSO）
- コンテンツ品質の向上
- ファネル最適化
- 競合優位性

### 3. 財務的評価（CFO）
- ROI分析
- 収益予測

### 4. 技術的評価（CTO）
- 実装品質
- スケーラビリティ

### 5. マーケティング評価（CMO）
- メッセージング戦略
- ブランド価値

### 6. 総合評価とスコア
- 総合評価（1-10点）
- 各カテゴリのスコア（1-10点）
- 強みと改善点

### 7. 推奨事項
- 即座に実行すべき改善（3-5項目）
- 短期（1-3ヶ月）で実装すべき改善（3-5項目）
- 長期（3-6ヶ月）で検討すべき改善（3-5項目）

日本語で回答してください。`;

  try {
    console.log('🔄 Grok CSO+CFO（grok-4-1-fast-reasoning）で無料版メッセージ素材の引用リポスト統合実装を評価中...');
    
    const completion = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'You are "Dr. Grok", the CSO (Chief Strategy Officer) and CFO (Chief Financial Officer) of Trap Defence BTC. You provide strategic, financial, and technical analysis with high-resolution insights. Be critical but constructive. Use Japanese for all responses.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });

    const response = completion?.choices?.[0]?.message?.content?.trim();
    
    if (!response) {
      console.error('❌ Grok returned empty response');
      return;
    }

    // 結果をファイルに保存
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + 'T' + new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    const filename = `docs/GROK_MINIMAL_VERSION_INTEGRATION_REVIEW_${timestamp}.md`;
    const content = `# Grok評価: 無料版メッセージ素材の引用リポスト統合実装
**作成日**: ${new Date().toISOString()}  
**評価AI**: Grok CSO+CFO (grok-4-1-fast-reasoning)  
**評価対象**: 無料版メッセージ素材の引用リポスト統合実装

---

${response}

---

**評価完了日**: ${new Date().toISOString()}
`;

    fs.writeFileSync(filename, content, 'utf-8');
    console.log(`✅ Grok評価結果を保存しました: ${filename}`);
    console.log('\n📊 評価結果:\n');
    console.log(response);
    
    return response;
  } catch (error) {
    console.error('❌ Grok評価エラー:', error.message);
    if (error.response) {
      console.error('Error response:', error.response.data);
    }
    throw error;
  }
}

// 実行
if (require.main === module) {
  askGrokMinimalVersionIntegrationReview()
    .then(() => {
      console.log('\n✅ 評価完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 評価失敗:', error);
      process.exit(1);
    });
}

module.exports = { askGrokMinimalVersionIntegrationReview };
