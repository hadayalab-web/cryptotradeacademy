#!/usr/bin/env node
/**
 * GrokとGeminiに無料版・有料版メッセージの最適化案を聞くスクリプト
 */

const path = require('path');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// .envファイルを読み込む
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is not set');
  process.exit(1);
}

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set');
  process.exit(1);
}

const grokClient = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: XAI_BASE_URL,
});

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });

// サンプルメッセージ（ユーザー提供のサンプル）
const MINIMAL_VERSION_SAMPLE = `🌤️ Trap Defence BTC - Free Report
🚨 BREAKING: TRAP DEFENCE BRIEFING
📅 2026-01-26 00:00:14 UTC

━━━━━━━━━━━━━━━━━━━━
🎯 Today's Trap Score
━━━━━━━━━━━━━━━━━━━━
0/100
✅ VERY LOW TRAP RISK: Very few trap indicators detected. Market conditions appear safe

💰 BTC Price: $86,562 (-2.84% / 24h)

💡 Current market conditions are relatively stable, but it's important to always remain vigilant

━━━━━━━━━━━━━━━━━━━━
📊 Data-Backed Reasons
━━━━━━━━━━━━━━━━━━━━
• Exchange Netflow: 41 BTC (outflow) — Holders are keeping assets
• Whale Ratio: 58% — Moderately high selling pressure
• Miners' Position Index (MPI): -1.55 — Miners are holding (positive signal)
• Sentiment: 😨 Extreme Fear

💡 Strategic Insights
  ✅ Trap Score 0/100: Currently low trap risk
  🛡️ Market conditions are stable. Maintain discipline and wait for high-quality opportunities
  💡 Patience pays. Quality setups require both low risk and clear market direction

━━━━━━━━━━━━━━━━━━━━
💊 Dr. Grok's Quick Insight
━━━━━━━━━━━━━━━━━━━━
"Low risk now, but markets always change. Stay prepared and alert."

━━━━━━━━━━━━━━━━━━━━
✅ Mental Note
━━━━━━━━━━━━━━━━━━━━
"Patience pays. The best opportunities come when risk is low and direction is clear."

━━━━━━━━━━━━━━━━━━━━
🚀 Upgrade Now: Get Detailed Trade Signals & Real-Time Alerts

💡 Low risk now, but markets change fast. Upgrade to get instant alerts when traps form.

✨ What Full Members Get (That You're Missing):

🎯 Real-Time Trap Alerts
• AVOID-LONG / AVOID-SHORT / STANDBY signals (instant notifications)
• Exit Map guidance (know exactly when to exit)
• NO TRADE alerts (avoid losses before they happen)

📊 Complete Intelligence Report
• Full on-chain analysis (all indicators in real-time)
• AI-powered market insights & trap detection (24/7 monitoring)
• Real-time X sentiment analysis (predict market emotions)

💊 Full Dr. Grok Psychological Support
• Mental block resolution (overcome FOMO, FEAR, GREED)
• Personalized mental training guidance
• Psychological state diagnosis

💎 All of this is designed to protect your capital

📊 Free vs Full Version
• Free: Trap Score only (directional hint)
• Full: All data + Real-time alerts (specific action plan)

🛡️ One missed signal can determine whether you protect or lose your capital

🎯 Upgrade now and get the complete defense system

━━━━━━━━━━━━━━━━━━━━
This is a free report. For detailed analysis and trap alerts, upgrade to Trap Defence BTC

For educational purposes only. Not financial advice`;

const REGULAR_BRIEFING_SAMPLE = `🌤️ Trap Defence BTC - Paid Report
🚨 URGENT ALERT: Trap Defence Crisis Briefing
📅 2026-01-26 00:00:14 UTC

🎯 Trade Verdict
🛡️ Signal: TRAP STANDBY (Defense Active)
• Entry: Preparing for Victory — Waiting for Clear Trigger
• Mode: Trap Standby — wait for clear edge. Prioritize defense.
• Take Profit: TBD (To Be Determined)
• Stop Loss: TBD (To Be Determined)
• Risk/Reward (RR): Standby

✨ Today's Highlights (3 Core Features)

🛡️ Core Feature 1: Trap Defense - No trap detected currently
📰 Summary: On-chain metrics show a "Wait-and-See" mode. Market conditions are stable, but remain vigilant for trap patterns

📰 💡 Psychological Interpretation of On-Chain Metrics

The current CryptoQuant data reveals a market environment fraught with emotional turbulence. The inflow of -40.90 suggests a net outflow of assets from exchanges, indicating that traders are moving their holdings away from immediate liquidity, possibly in response to the perceived instability. The MPI (Miners' Position Index) at -1.55 typically signals that miners are holding rather than selling, which usually suggests a lack of confidence in the current price levels.…

You want to protect your capital, but traps are everywhere. The belief that "I must always trade" and "Waiting is weakness". This philosophical problem prevents you from following the 70% waiting strategy.

━━━━━━━━━━━━━━━━━━━━
💊 Dr. Grok's Quick Insight
━━━━━━━━━━━━━━━━━━━━
💚 Psychological State: 😐 NEUTRAL (Risk: 💡 LOW)
   💡 ✅ 中立状態 - メンタルブロック未検出: 市場センチメントはバランスが取れています。極端な感情は検知されていません。条件は安定しています。

メンタルコーチの洞察: これは理想的な状態です。メンタルブロックが判断を曇らせていません。監視を継続してください。規律を維持し、高確率のセットアップを待ってください。トレーダーとしてのあなたの潜在能力は、この冷静な状態を維持できるときに輝きます。資金の保護を続けてください。素晴らしいです。


💊 Dr. Grok's Mental Note:
"Patience is not weakness—it's strategic strength. The best traders know when not to trade."

━━━━━━━━━━━━━━━━━━━━
💎 THIS IS WHY YOU PAID FOR THIS REPORT
━━━━━━━━━━━━━━━━━━━━

While free users see only the score, YOU get:

🎯 Real-Time Action Signals:
✅ AVOID-LONG / AVOID-SHORT / STANDBY alerts (instant notifications)
✅ Exit Map guidance (know exactly when to exit)
✅ NO TRADE alerts (avoid losses before they happen)

📊 Deep Intelligence Analysis:
✅ Complete on-chain analysis (CryptoQuant data, all indicators)
✅ AI-powered trap pattern detection (24/7 monitoring)
✅ Real-time X sentiment analysis (predict market emotions)

💊 Full Psychological Support:
✅ Dr. Grok's mental coaching (overcome FOMO, FEAR, GREED)
✅ Personalized mental training guidance
✅ Psychological state diagnosis & block resolution

🛡️ One missed signal = Lost capital. This is why you paid for this report.

💰 BTC Price: $86,562 (-2.84% / 24h)
📊 Exchange Netflow: Outflow 41 BTC — Holders are keeping assets
⛏ Miners' Position Index (MPI): -1.55
🧠 Sentiment: Extreme Fear

📈 Market Score: 4/100 (Neutral/Stable)

🎯 Trap Score: 0/100 ✅ LOW

🐋 Whale Ratio: 57.6% (Normal)
✅ Trap Detector: No critical trap detected


For educational purposes only. Not financial advice.`;

/**
 * GrokにXアルゴリズム最適化案を聞く
 */
async function askGrokForOptimization(message, version) {
  try {
    const prompt = `You are "Dr. Grok", an expert X (Twitter) algorithm analyst specializing in crypto/BTC content optimization.

Analyze the following ${version === 'minimal' ? 'FREE VERSION (Minimal Version)' : 'PAID VERSION (Regular Briefing)'} message for Trap Defence BTC and provide optimization recommendations:

${message}

Task: Provide specific, actionable optimization recommendations for X algorithm optimization:

1. **X Algorithm Optimization**:
   - How to optimize this content for X's algorithm to maximize reach
   - Current X algorithm trends affecting crypto/BTC content
   - Specific elements that boost engagement on X

2. **Viral Potential**:
   - Viral potential score (0-100) and why
   - Key factors affecting viral potential
   - Specific recommendations to increase viral potential

3. **Engagement Strategy**:
   - Optimal content format for maximum engagement
   - Hook strategies that work on X
   - CTA optimization for conversions

4. **Content Structure**:
   - Optimal content structure for X algorithm
   - Recommended hashtags
   - Visual element recommendations (emojis, formatting)

5. **Competitive Advantage**:
   - What makes this content unique and impossible for competitors to replicate
   - How to leverage X algorithm understanding for maximum impact

Focus on:
- Actionable, specific recommendations
- X algorithm-friendly optimizations
- Viral potential maximization
- Engagement boosters
- Conversion optimization

Provide your analysis in a clear, structured format.`;

    const completion = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'You are "Dr. Grok", an expert X (Twitter) algorithm analyst specializing in crypto/BTC content optimization. Provide actionable, specific recommendations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 3000,
      temperature: 0.7,
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    return text || 'No response from Grok';
  } catch (error) {
    console.error('[Grok] Error:', error.message);
    return `Error: ${error.message}`;
  }
}

/**
 * Geminiに深層心理分析と最適化案を聞く
 */
async function askGeminiForOptimization(message, version) {
  try {
    const prompt = `You are "Dr. Gemini", a world-class psychological analyst specializing in trader psychology and mental coaching.

Analyze the following ${version === 'minimal' ? 'FREE VERSION (Minimal Version)' : 'PAID VERSION (Regular Briefing)'} message for Trap Defence BTC and provide deep psychological optimization recommendations:

${message}

Task: Provide deep psychological analysis and optimization recommendations:

1. **Deep Psychological Analysis**:
   - What psychological triggers are currently being used?
   - What hidden psychological patterns can be leveraged?
   - What emotional drivers are being addressed?

2. **Mental Block Resolution**:
   - What mental blocks (FOMO/FEAR/GREED) are being addressed?
   - How can we better address these mental blocks?
   - What psychological barriers prevent users from upgrading?

3. **Emotional Resonance**:
   - How can we increase emotional resonance with traders?
   - What emotional patterns can be leveraged for better engagement?
   - How can we create deeper psychological connection?

4. **Personalized Coaching**:
   - How can we make the coaching more personalized and impactful?
   - What psychological insights can unlock trader potential?
   - What breakthrough insights can we provide?

5. **Competitive Advantage**:
   - What psychological elements make this content unique and impossible for competitors to replicate?
   - How can we leverage deep psychological understanding for maximum impact?
   - What psychological mastery can we demonstrate?

Focus on:
- Deep, actionable psychological insights
- Personalized coaching optimization
- Emotional resonance maximization
- Mental block resolution strategies
- Breakthrough insights that unlock potential

Provide your analysis in a clear, structured format.`;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text || 'No response from Gemini';
  } catch (error) {
    console.error('[Gemini] Error:', error.message);
    return `Error: ${error.message}`;
  }
}

/**
 * メイン実行
 */
async function main() {
  console.log('🚀 Grok × Gemini メッセージ最適化分析スクリプト\n');
  console.log('='.repeat(80));
  console.log('📋 分析対象:');
  console.log('  1. 無料版（Minimal Version）メッセージ');
  console.log('  2. 有料版（Regular Briefing）メッセージ');
  console.log('='.repeat(80) + '\n');

  const results = {
    minimal: {
      grok: null,
      gemini: null,
    },
    regular: {
      grok: null,
      gemini: null,
    },
  };

  // 無料版の分析
  console.log('📱 無料版（Minimal Version）分析中...\n');
  
  console.log('🔍 GrokにXアルゴリズム最適化案を依頼中...');
  results.minimal.grok = await askGrokForOptimization(MINIMAL_VERSION_SAMPLE, 'minimal');
  console.log('✅ Grok分析完了\n');

  console.log('🔍 Geminiに深層心理分析と最適化案を依頼中...');
  results.minimal.gemini = await askGeminiForOptimization(MINIMAL_VERSION_SAMPLE, 'minimal');
  console.log('✅ Gemini分析完了\n');

  console.log('='.repeat(80) + '\n');

  // 有料版の分析
  console.log('💎 有料版（Regular Briefing）分析中...\n');
  
  console.log('🔍 GrokにXアルゴリズム最適化案を依頼中...');
  results.regular.grok = await askGrokForOptimization(REGULAR_BRIEFING_SAMPLE, 'regular');
  console.log('✅ Grok分析完了\n');

  console.log('🔍 Geminiに深層心理分析と最適化案を依頼中...');
  results.regular.gemini = await askGeminiForOptimization(REGULAR_BRIEFING_SAMPLE, 'regular');
  console.log('✅ Gemini分析完了\n');

  // 結果を出力
  console.log('\n' + '='.repeat(80));
  console.log('📊 分析結果サマリー');
  console.log('='.repeat(80) + '\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📱 無料版（Minimal Version）最適化案');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('🔍 Grok Xアルゴリズム最適化案:');
  console.log('-'.repeat(80));
  console.log(results.minimal.grok);
  console.log('\n');

  console.log('🔍 Gemini深層心理分析と最適化案:');
  console.log('-'.repeat(80));
  console.log(results.minimal.gemini);
  console.log('\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💎 有料版（Regular Briefing）最適化案');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('🔍 Grok Xアルゴリズム最適化案:');
  console.log('-'.repeat(80));
  console.log(results.regular.grok);
  console.log('\n');

  console.log('🔍 Gemini深層心理分析と最適化案:');
  console.log('-'.repeat(80));
  console.log(results.regular.gemini);
  console.log('\n');

  // 結果をファイルに保存
  const fs = require('fs');
  const outputDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(outputDir, `grok-gemini-optimization-${timestamp}.md`);

  const outputContent = `# Grok × Gemini メッセージ最適化分析結果

生成日時: ${new Date().toISOString()}

## 📱 無料版（Minimal Version）最適化案

### 🔍 Grok Xアルゴリズム最適化案

${results.minimal.grok}

### 🔍 Gemini深層心理分析と最適化案

${results.minimal.gemini}

---

## 💎 有料版（Regular Briefing）最適化案

### 🔍 Grok Xアルゴリズム最適化案

${results.regular.grok}

### 🔍 Gemini深層心理分析と最適化案

${results.regular.gemini}
`;

  fs.writeFileSync(outputFile, outputContent, 'utf-8');
  console.log(`\n✅ 結果を保存しました: ${outputFile}`);
  console.log('='.repeat(80));
}

// 実行
main().catch((error) => {
  console.error('\n❌ 予期しないエラー:', error.message);
  if (error.stack) {
    console.error('スタックトレース:', error.stack.substring(0, 500));
  }
  process.exit(1);
});
