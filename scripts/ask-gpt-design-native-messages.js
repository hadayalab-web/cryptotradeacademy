#!/usr/bin/env node
/**
 * GPTにGrokとGeminiの分析結果を基に、ネイティブ調な語り口調で全体設計を整えてもらうスクリプト
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const OpenAI = require('openai');

// .envファイルを読み込む
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set');
  process.exit(1);
}

const openaiClient = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// 最新の分析結果ファイルを読み込む
const outputDir = path.join(__dirname, '..', 'output');
const analysisFiles = fs.readdirSync(outputDir)
  .filter(file => file.startsWith('grok-gemini-optimization-') && file.endsWith('.md'))
  .map(file => ({
    name: file,
    path: path.join(outputDir, file),
    time: fs.statSync(path.join(outputDir, file)).mtime.getTime(),
  }))
  .sort((a, b) => b.time - a.time);

if (analysisFiles.length === 0) {
  console.error('❌ 分析結果ファイルが見つかりません');
  process.exit(1);
}

const latestAnalysisFile = analysisFiles[0].path;
console.log(`📄 分析結果ファイルを読み込み中: ${latestAnalysisFile}\n`);

const analysisContent = fs.readFileSync(latestAnalysisFile, 'utf-8');

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
 * GPTに全体設計を依頼
 */
async function askGPTForDesign() {
  try {
    const prompt = `You are an expert copywriter and localization specialist specializing in native, conversational tone for crypto trading content.

I have received optimization recommendations from Dr. Grok (X algorithm expert) and Dr. Gemini (psychological analyst) for Trap Defence BTC messages. Now I need you to create a complete redesign that:

1. **Implements ALL recommendations** from Grok and Gemini analysis
2. **Uses EXTREMELY NATIVE conversational tone** - NOT translation-style, but authentic native speech patterns
3. **Adapts to regional/cultural nuances** for each language:
   - **ES (Spanish)**: Latin American style (Mexico, Colombia, Argentina) - passionate, direct, uses local expressions
   - **PT (Portuguese)**: Brazilian style - warm, friendly, uses Brazilian Portuguese expressions (not European)
   - **AR (Arabic)**: Dubai/Gulf style - sophisticated, professional, uses Gulf Arabic expressions
   - **EN (English)**: Native American/British conversational style - natural, engaging, not corporate
   - **JA (Japanese)**: Native Japanese conversational style - respectful but natural, uses appropriate honorifics
   - **KO (Korean)**: Native Korean conversational style - friendly but professional, uses natural Korean expressions

## Analysis Results from Grok & Gemini:

${analysisContent}

## Current Message Samples:

### Minimal Version (Free):
${MINIMAL_VERSION_SAMPLE}

### Regular Briefing (Paid):
${REGULAR_BRIEFING_SAMPLE}

## Your Task:

Create a complete redesign document that includes:

1. **Overall Design Philosophy**: How to implement Grok's X algorithm recommendations and Gemini's psychological insights while maintaining native conversational tone

2. **Language-Specific Tone Guidelines**: Detailed guidelines for each language (EN, ES, PT, AR, JA, KO) with:
   - Native expressions and idioms to use
   - Cultural nuances to respect
   - Regional variations (e.g., Latin American vs European Spanish)
   - Examples of native vs translation-style phrasing

3. **Redesigned Message Templates**: Complete rewritten versions for:
   - Minimal Version (Free) - all 6 languages
   - Regular Briefing (Paid) - all 6 languages

4. **Implementation Strategy**: How to integrate these changes into the codebase structure

5. **Key Differentiators**: What makes these messages impossible for competitors to replicate

## Critical Requirements:

- **NO translation-style phrasing** - everything must sound like a native speaker wrote it
- **Cultural authenticity** - use region-specific expressions and cultural references where appropriate
- **Implement Grok's recommendations**: Thread format, polls, visual elements, engagement hooks
- **Implement Gemini's psychological insights**: Cognitive dissonance, mental block resolution, emotional resonance
- **Maintain brand voice**: Trap Defence, Dr. Grok, psychological coaching elements
- **Conversion optimization**: Strong CTAs that feel natural, not salesy

Provide your complete redesign in a structured, actionable format that can be directly implemented.`;

    console.log('🤖 GPTに全体設計を依頼中...\n');
    
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'You are an expert copywriter and localization specialist specializing in native, conversational tone for crypto trading content. You create authentic, culturally-appropriate content that sounds like it was written by a native speaker, not translated.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: 8000,
      temperature: 0.7,
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    return text || 'No response from GPT';
  } catch (error) {
    console.error('[GPT] Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack.substring(0, 500));
    }
    return `Error: ${error.message}`;
  }
}

/**
 * メイン実行
 */
async function main() {
  console.log('🚀 GPT ネイティブ調メッセージ全体設計スクリプト\n');
  console.log('='.repeat(80));
  console.log('📋 タスク:');
  console.log('  1. GrokとGeminiの分析結果を基に全体設計を整える');
  console.log('  2. 極めてネイティブ調な語り口調で各言語版を作成');
  console.log('  3. 言語別の文化的ニュアンスを反映');
  console.log('='.repeat(80) + '\n');

  const result = await askGPTForDesign();

  console.log('\n' + '='.repeat(80));
  console.log('📊 GPT設計結果');
  console.log('='.repeat(80) + '\n');
  console.log(result);
  console.log('\n');

  // 結果をファイルに保存
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(outputDir, `gpt-native-design-${timestamp}.md`);

  const outputContent = `# GPT ネイティブ調メッセージ全体設計

生成日時: ${new Date().toISOString()}

## 設計結果

${result}
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
