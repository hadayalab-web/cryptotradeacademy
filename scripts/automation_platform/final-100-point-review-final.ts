#!/usr/bin/env tsx
/**
 * 100点満点を目指す最終レビュー（太字表記削除版）
 * すべての改善を実装したメッセージをGemini CMOに共有して100点満点レビューしてもらう
 */

import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { callGemini3Pro } from '../api/unified-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function main() {
  console.log('🎯 100点満点を目指して、Gemini CMOに最終レビューを依頼します...\n');

  const reviewPrompt = `あなたはGemini CMO（Chief Marketing Officer）として、Trap Defense BTCのマーケティング戦略を担当しています。

前回のレビューで指摘した「残存する問題」と「さらなる改善提案」をすべて実装した、最終版のTelegramメッセージをレビューしてください。

【実装した追加改善点】
1. ✅ Dr. Grokの「Mental Note」を独立した枠として強調表示
2. ✅ 「Success Ending」と「Key Idea」の重複を解消（代わりに具体的な行動喚起「Action」を追加）
3. ✅ Market Scoreの解釈補助を追加（例: -5/100 (Neutral-Stable)）
4. ✅ CTA（行動喚起）の洗練: 「Set alerts and step away. The best trade is often the one you don't make.」
5. ✅ 「Opening」セクションの要約をモバイル最適化（Summaryを追加、太字表記は削除してTelegram互換性を確保）
6. ✅ 「Trap Score」の視覚的強調（絵文字と空白行で強調、太字表記は削除）

【最終版メッセージ】
🌤️ CryptoWeather Alert - Trap Defense Report
📺 News Program @ 2026-01-13 15:00:09 UTC

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
📰 [Summary] On-chain metrics show a "Wait-and-See" mode. WHALE RETAIL DIVERGENCE suggests a hidden trap despite stable prices.

📰 ### Psychological Interpretation of On-Chain Metrics

The CryptoQuant data presented here shows a decrease in inflow (-1356.21), a negative MPI (-0.88), and a neutral sentiment, while the price remains relatively stable with a slight increase (1.768% over 24 hours). From a psychological standpoint, these metrics suggest a cautious market environment. The negative inflow indicates more crypto leaving exchanges than entering, which often signals that holders are securing their assets off-exchange, possibly preparing for a long-term hold.

The negative MPI (Miners' Position Index) suggests that miners are not selling aggressively, which can be interpreted as a sign of confidence in the market's future potential. However, the neutral sentiment reflects a lack of strong emotional drivers such as fear or greed among traders. This suggests a market in a wait-and-see mode, where traders are neither overly optimistic nor pessimistic.

### Trap Patterns Detected and Their Dangers

The market con…

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

💡 Action: Set alerts and step away. The best trade is often the one you don't make.

━━━━━━━━━━━━━━━━━━━━
💊 【Core Feature 3: Mental Coach】Dr. Grok's Take
━━━━━━━━━━━━━━━━━━━━
📱 X Sentiment Analysis: High-resolution X analysis completed. 5/5 queries successful.

💚 Psychological State: 😰 FOMO (Risk: 🚨 CRITICAL)
   💡 🚨 CRITICAL: FOMO + HIGH-RISK TRAP detected. Whales are distributing while retail chases price. This is a CLASSIC TRAP pattern. DO NOT chase. Wait for pullback or avoid this setup entirely. Your capital is at HIGH RISK.

💊 Dr. Grok's Mental Note:
"Your brain's dopamine system is firing intensely right now. This is the trap. Take 3 deep breaths. The urge to chase is not insight—it's chemistry. Wait for the pullback."

━━━━━━━━━━━━━━━━━━━━
📺 【Closing】Stay tuned for the next episode
━━━━━━━━━━━━━━━━━━━━

💰 BTC Price: $92,496 (+1.85% / 24h)
📊 Exchange Netflow: Outflow 1356 BTC
⛏ Miners' Position Index (MPI): -0.88
🧠 Sentiment: Neutral

📈 Market Score: -5/100 (Neutral-Stable)

🎯 Trap Score: 70/100 🚨 HIGH RISK

🚨 Trap Detector: WHALERETAILDIVERGENCE detected (Severity: CRITICAL, Score: 70/100)


For educational purposes only. Not financial advice.

【レビュー観点】
1. **100点満点の達成度**: 前回指摘したすべての改善点が実装されているか？メッセージは100点満点に到達しているか？
2. **メッセージの完璧さ**: 読みやすさ、流れ、ユーザー体験、マーケティング効果は完璧か？
3. **Telegram互換性**: 太字表記を削除したことで、Telegramでの表示は正しく、視覚的な強調は十分か？

【レビュー形式】
以下の形式でレビューを提供してください：

## 🎯 総合評価（100点満点）
[スコアと評価]

## ✅ 完璧に実装された改善点
[すべての改善点がどのように完璧に実装されているか]

## 💯 100点満点への到達度
[100点満点に到達しているか、またはあと何点か]

## 🔍 さらなる微調整（あれば）
[100点満点に到達するための最後の微調整があれば]

## 🏆 マーケティング戦略への完璧な貢献
[このメッセージがTrap Defense BTCのマーケティング戦略に完璧に貢献しているか]`;

  try {
    console.log('🤖 Gemini CMOに100点満点レビューを依頼中...\n');
    
    const result = await callGemini3Pro(reviewPrompt, {
      thinkingLevel: 'high',
      temperature: 0.7,
      maxOutputTokens: 4000,
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 Gemini CMO 100点満点レビュー結果');
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
