#!/usr/bin/env tsx
/**
 * Gemini CMOによるメッセージレビュー
 * 送信されたTelegramメッセージをGemini CMOに共有してレビューしてもらう
 */

import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { callGemini3Pro } from '../api/unified-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .envファイルを読み込む
dotenv.config({ path: join(__dirname, '..', '.env') });

// 送信されたメッセージ（前回の会話から）
const sentMessage = `🌤️ CryptoWeather Alert - Trap Defense Report
📺 News Program @ 2026-01-13 14:35:48 UTC

🎯 Trade Verdict
🛡️ Signal: TRAP STANDBY (Defense Active)
• Entry (spot ref.): $92,416
• Mode: Trap Standby — wait for clear edge. Prioritize defense.
• Take Profit: $92,416
• Stop Loss: $92,416
• Risk/Reward (RR): 1.40

✨ Today's Highlights (3 USPs)

🛡️ USP1: Trap Defense - 🚨 WHALE RETAIL DIVERGENCE (Score: 70/100)
   📊 Components: Multiple Divergences (2) + Whale/Retail Divergence + Price/Sentiment Divergence
━━━━━━━━━━━━━━━━━━━━
📺 【Opening】Breaking Trap News from GPT Reporter
━━━━━━━━━━━━━━━━━━━━
📰 Psychological Interpretation of On-Chain Metrics:

The data provided indicates a neutral market sentiment with no clear trap patterns detected. The inflow of -1356.21 suggests that more cryptocurrency is being moved out of exchanges than into them, which often indicates a holding pattern rather than active trading. The MPI (Miners' Position Index) of -0.875 suggests that miners are not selling aggressively; they may be holding onto their assets, indicating a lack of immediate panic or fear among this influential group. The price change of 1.867% in 24 hours is relatively modest and aligns with the neutral sentiment.

From a psychological perspective, traders might feel a sense of complacency due to this neutral sentiment, potentially leading to inaction. However, this can also be a trap…

━━━━━━━━━━━━━━━━━━━━
📖 【Story Arc】Opening
━━━━━━━━━━━━━━━━━━━━
You want to protect your capital, but traps are everywhere. Market trap detected: WHALERETAILDIVERGENCE (Severity: CRITICAL, Score: 70/100). This trap is designed to liquidate traders.

━━━━━━━━━━━━━━━━━━━━
📊 【Data Presentation】Market Analysis
━━━━━━━━━━━━━━━━━━━━
Market trap detected: WHALERETAILDIVERGENCE (Severity: CRITICAL, Score: 70/100). This trap is designed to liquidate traders.

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
💊 【Commentator】Dr. Grok's Take
━━━━━━━━━━━━━━━━━━━━
📱 X Sentiment Analysis: High-resolution X analysis completed. 5/5 queries successful.

💚 Psychological State: 😰 FOMO (Risk: 🚨 CRITICAL)
   💡 🚨 CRITICAL: FOMO + HIGH-RISK TRAP detected. Whales are distributing while retail chases price. This is a CLASSIC TRAP pattern. DO NOT chase. Wait for pullback or avoid this setup entirely. Your capital is at HIGH RISK.

━━━━━━━━━━━━━━━━━━━━
📺 【Closing】Stay tuned for the next episode
━━━━━━━━━━━━━━━━━━━━

💰 BTC Price: $92,416 (+1.87% / 24h)
📊 Exchange Netflow: Outflow 1356 BTC
⛏ Miners' Position Index (MPI): -0.88
🧠 Sentiment: Neutral

📈 Market Score: -6/100
🎯 Trap Score: 70/100 🚨 HIGH RISK
✅ Trap Detector: No critical trap detected.


For educational purposes only. Not financial advice.`;

async function main() {
  console.log('📧 Gemini CMOにメッセージを共有してレビューを依頼します...\n');

  const reviewPrompt = `あなたはGemini CMO（Chief Marketing Officer）として、Trap Defense BTCのマーケティング戦略、ブランディング、顧客獲得、マーケティング分析、コンテンツマーケティングを担当しています。

以下のTelegramメッセージは、有料版ユーザーに送信された実際の配信メッセージです。このメッセージをマーケティングの観点からレビューしてください。

【レビュー観点】
1. **メッセージの構造と読みやすさ**: Telegramでの表示、セクション分け、視覚的な階層は適切か？
2. **ストーリーブランド戦略2.0の適用**: Story Arc、Data Presentation、Analysis、Avoid Failure、Success Endingの構成は効果的か？
3. **USP（独自価値提案）の明確さ**: 3つのUSP（Trap Defense、Gemini Show Producer、GPT Mental Trainer + Dr. Grok）が明確に伝わっているか？
4. **ユーザー体験**: メッセージはユーザーに価値を提供しているか？行動を促しているか？
5. **トーンとブランドボイス**: 「70%の時間、何もするな」というブランドメッセージが一貫しているか？
6. **改善提案**: マーケティング効果を高めるための具体的な改善提案

【送信されたメッセージ】
${sentMessage}

【レビュー形式】
以下の形式でレビューを提供してください：

## 📊 総合評価
[1-5のスコアと簡潔な評価]

## ✅ 強み
[メッセージの優れている点を3-5点]

## ⚠️ 改善点
[改善が必要な点を3-5点]

## 💡 具体的な改善提案
[マーケティング効果を高めるための具体的な改善案]

## 🎯 マーケティング戦略への貢献度
[このメッセージがTrap Defense BTCのマーケティング戦略にどのように貢献しているか、または改善が必要か]`;

  try {
    console.log('🤖 Gemini CMOにレビューを依頼中...\n');
    
    const result = await callGemini3Pro(reviewPrompt, {
      thinkingLevel: 'high',
      temperature: 0.7,
      maxOutputTokens: 4000,
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Gemini CMO レビュー結果');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(result.text);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 API使用量:', JSON.stringify(result.usage, null, 2));
    console.log('🧠 Thinking Level:', result.thinkingLevel);
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
