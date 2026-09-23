#!/usr/bin/env tsx
/**
 * Gemini CMOによる最終レビュー
 * 修正後のメッセージをGemini CMOに共有して最終レビューしてもらう
 */

import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { callGemini3Pro } from '../api/unified-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function main() {
  console.log('📧 Gemini CMOに修正後のメッセージを共有して最終レビューを依頼します...\n');

  const reviewPrompt = `あなたはGemini CMO（Chief Marketing Officer）として、Trap Defense BTCのマーケティング戦略を担当しています。

先ほどのレビューで指摘した改善点を実装した、修正後のTelegramメッセージをレビューしてください。

【実装した改善点】
1. ✅ Trade Verdictの表記最適化: Standby状態で「Waiting for Clear Trigger」「TBD」と表記
2. ✅ USPラベルの改善: 「3 Core Features」に変更、「Core Feature 1/2/3」と表示
3. ✅ セクションの統合: Story ArcとData Presentationの重複を排除（最初の文のみをStory Arcに、詳細をData Presentationに）
4. ✅ Dr. Grokの心理的ガイダンス強化: 「Mental Note」セクションを追加
5. ✅ データの不整合修正: Trap Detectorの表示を修正
6. ✅ GPT Mental Trainerの文字数制限を800→1000に緩和

【修正後のメッセージ】
（実際のテスト配信結果をここに挿入）

【レビュー観点】
1. **改善点の反映度**: 先ほど指摘した改善点が正しく実装されているか？
2. **メッセージの品質**: 全体的な読みやすさ、流れ、ユーザー体験は向上しているか？
3. **マーケティング効果**: このメッセージは有料ユーザーに価値を提供しているか？行動を促しているか？
4. **さらなる改善提案**: 追加で改善できる点があれば提案してください

【レビュー形式】
以下の形式でレビューを提供してください：

## 📊 総合評価
[1-5のスコアと簡潔な評価]

## ✅ 改善された点
[実装された改善点がどのようにメッセージを向上させたか]

## ⚠️ 残存する問題
[まだ改善が必要な点があれば]

## 💡 さらなる改善提案
[追加で改善できる点があれば]

## 🎯 マーケティング戦略への貢献度
[このメッセージがTrap Defense BTCのマーケティング戦略にどのように貢献しているか]`;

  // 修正後のテスト配信結果
  const testMessage = `🌤️ CryptoWeather Alert - Trap Defense Report
📺 News Program @ 2026-01-13 14:48:46 UTC

🎯 Trade Verdict
🛡️ Signal: TRAP STANDBY (Defense Active)
• Entry: Waiting for Clear Trigger
• Mode: Trap Standby — wait for clear edge. Prioritize defense.
• Take Profit: TBD (To Be Determined)
• Stop Loss: TBD (To Be Determined)
• Risk/Reward (RR): Standby

✨ Today's Highlights (3 Core Features)

🛡️ Core Feature 1: Trap Defense - 🚨 WHALE RETAIL DIVERGENCE (Score: 70/100)
   📊 Components: Multiple Divergences (2) + Whale/Retail Divergence + Price/Sentiment Divergence
━━━━━━━━━━━━━━━━━━━━
📺 【Opening】Market Intelligence from GPT Mental Trainer
━━━━━━━━━━━━━━━━━━━━
📰 ### Psychological Interpretation of On-Chain Metrics

The data presents an interesting snapshot of the current market sentiment and activity. The negative inflow of -1356.21 suggests that more cryptocurrency is being moved out of exchanges than into them. This can often indicate that traders are holding their assets rather than selling, potentially reflecting a cautious or uncertain market sentiment. The MPI (Miners' Position Index) of -0.88 indicates that miners are not in a position of aggressive selling, which could suggest a lack of immediate panic or fear from this group.

The price of $92,618.4 with a 24-hour change of 2.215% is relatively stable, aligning with the "Neutral" sentiment. This stability, while not indicative of bullish or bearish extremes, can lull traders into complacency, where the absence of significant movement can mask underlying volatility potential.

### Trap Patterns Detected and Their Dangers

The market context indicates no clear trap pattern detected, wit…

━━━━━━━━━━━━━━━━━━━━
📖 【Core Feature 2: Intelligence Editor】Market Story
━━━━━━━━━━━━━━━━━━━━
You want to protect your capital, but traps are everywhere. Market trap detected: WHALERETAILDIVERGENCE (Severity: CRITICAL, Score: 70/100).

━━━━━━━━━━━━━━━━━━━━
🛡️ 【Analysis】Trap Defense Strategy
━━━━━━━━━━━━━━━━━━━━
Step 1: Recognize the trap. Step 2: Standby (70% waiting strategy). Step 3: Wait for clear advantage. Step 4: Act only when odds are unfairly in your favor.

Key Idea: 70% of the time, do nothing. Defend until clear advantage emerges. This is not a bug - it's a feature. The strongest strategy is often doing nothing.

━━━━━━━━━━━━━━━━━━━━
⚠️ 【Avoid Failure】
━━━━━━━━━━━━━━━━━━━━
Losing capital by falling into traps. Making emotional decisions driven by FOMO/FEAR/GREED.

━━━━━━━━━━━━━━━━━━━━
✅ 【Success Ending】
━━━━━━━━━━━━━━━━━━━━
Become a disciplined trader who protects capital. Avoid traps and trade only when clear advantage emerges. Unlock your potential by removing mental blocks.

💡 Key Idea: 70% of the time, do nothing. Defend until clear advantage emerges.

━━━━━━━━━━━━━━━━━━━━
💊 【Core Feature 3: Mental Coach】Dr. Grok's Take
━━━━━━━━━━━━━━━━━━━━
📱 X Sentiment Analysis: High-resolution X analysis completed. 5/5 queries successful.

💚 Psychological State: 😐 NEUTRAL (Risk: 🚨 CRITICAL)
   💡 ⚠️ Market sentiment appears balanced, BUT HIGH-RISK TRAP conditions are present. This "neutral" sentiment may be masking trap conditions. Be EXTRA cautious. Monitor trap indicators closely. Avoid entering positions until trap conditions clear.

━━━━━━━━━━━━━━━━━━━━
📺 【Closing】Stay tuned for the next episode
━━━━━━━━━━━━━━━━━━━━

💰 BTC Price: $92,618 (+2.21% / 24h)
📊 Exchange Netflow: Outflow 1356 BTC
⛏ Miners' Position Index (MPI): -0.88
🧠 Sentiment: Neutral

📈 Market Score: -5/100
🎯 Trap Score: 70/100 🚨 HIGH RISK
🚨 Trap Detector: WHALERETAILDIVERGENCE detected (Severity: CRITICAL, Score: 70/100)


For educational purposes only. Not financial advice.`;

  const finalPrompt = reviewPrompt.replace('（実際のテスト配信結果をここに挿入）', testMessage);

  try {
    console.log('🤖 Gemini CMOに最終レビューを依頼中...\n');
    
    const result = await callGemini3Pro(finalPrompt, {
      thinkingLevel: 'high',
      temperature: 0.7,
      maxOutputTokens: 4000,
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Gemini CMO 最終レビュー結果');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(result.text);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 API使用量:', JSON.stringify(result.usage, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack.substring(0, 500));
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ 予期しないエラー:', error);
  process.exit(1);
});
