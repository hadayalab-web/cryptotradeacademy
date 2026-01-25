// scripts/analyze-minimal-version-value-with-grok.js
// 無料版（Minimal Version）の利用価値をGrokに分析してもらう

const { OpenAI } = require('openai');

const XAI_API_KEY = process.env.XAI_API_KEY || process.argv.find(arg => arg.startsWith('--api-key='))?.split('=')[1];

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is required');
  console.error('Usage: node scripts/analyze-minimal-version-value-with-grok.js [--api-key=XAI_API_KEY]');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

const GROK_MODEL = 'grok-3';

// 無料版（Minimal Version）のサンプルメッセージ（EN）
const MINIMAL_VERSION_SAMPLE = `🌤️ Trap Defence BTC - Free Report
🚨 BREAKING: TRAP DEFENCE BRIEFING
📅 2026-01-23 18:00:21 UTC

━━━━━━━━━━━━━━━━━━━━
🎯 Today's Trap Score
━━━━━━━━━━━━━━━━━━━━
70/100
⚠️ HIGH TRAP RISK: Strong signals indicate potential market traps. Exercise extreme caution

💰 BTC Price: $90,493 (+1.23% / 24h)

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
"Defense is the highest form of attack. Protecting capital is where everything begins."

━━━━━━━━━━━━━━━━━━━━
🚀 Unlock Full Intelligence Report

You're seeing a glimpse. Full members get:

✨ Complete Intelligence Report
• Full on-chain analysis (all indicators in real-time)
• AI-powered market insights & trap detection (24/7 monitoring)
• Real-time alerts: AVOID-LONG / AVOID-SHORT / STANDBY (instant notifications)
• Exit Map & Mental Training guidance (practical strategies)
• Full Dr. Grok psychological support (mental block resolution)
• Real-time X sentiment analysis (predict market emotions)

💎 All of this is designed to protect your capital

📊 Free vs Full Version
• Free: Trap Score only (directional hint)
• Full: All data + Real-time alerts (specific action plan)

🛡️ One missed signal can determine whether you protect or lose your capital

🎯 Upgrade now and get the complete defense system

━━━━━━━━━━━━━━━━━━━━
This is a free report. For detailed analysis and trap alerts, upgrade to Trap Defence BTC

For educational purposes only. Not financial advice`;

async function analyzeMinimalVersionValueWithGrok() {
  try {
    console.log('[Grok Analysis] ========================================');
    console.log('[Grok Analysis] Analyzing Minimal Version Value...');
    console.log('[Grok Analysis] ========================================\n');

    const completion = await openai.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are "Dr. Grok", an expert marketing strategist and conversion optimization specialist for crypto/BTC trading products. 
You analyze product value propositions, user psychology, and conversion funnels.
Provide strategic insights based on 2026 marketing psychology, conversion optimization, and user retention strategies.
Be concise, data-driven, and actionable.`,
        },
        {
          role: 'user',
          content: `Task: Analyze the value proposition and effectiveness of the Minimal Version (Free Report) for Trap Defence BTC.

## Minimal Version (Free Report) Sample

\`\`\`
${MINIMAL_VERSION_SAMPLE}
\`\`\`

## Current Context

1. **Product**: Trap Defence BTC - A BTC trading defense system
2. **Free Version**: Minimal Version (Free Report) - Provides Trap Score + basic analysis
3. **Paid Version**: Full Intelligence Report - Complete on-chain analysis, real-time alerts, AI insights, etc.
4. **Pricing**: $69/month for full version
5. **Target Audience**: BTC traders who want to protect their capital from market traps

## Questions for Analysis

1. **Value Proposition**: What is the core value of the Minimal Version (Free Report)?
   - What problems does it solve for users?
   - What emotional triggers does it activate?
   - What makes it compelling enough to engage users?

2. **User Psychology**: How does the Minimal Version affect user psychology?
   - Does it build trust? How?
   - Does it create FOMO? How?
   - Does it create curiosity? How?
   - Does it create urgency? How?

3. **Conversion Funnel**: How effective is the Minimal Version as a lead magnet?
   - What is the expected conversion rate from free to paid?
   - What factors influence conversion?
   - What improvements could increase conversion?

4. **Retention Strategy**: How does the Minimal Version contribute to user retention?
   - Does it create habit formation?
   - Does it create dependency?
   - Does it create community engagement?

5. **Competitive Advantage**: What makes the Minimal Version unique?
   - How does it differentiate from competitors?
   - What is the "wow factor"?
   - What makes it shareable/viral?

6. **X (Twitter) Posting Strategy**: How should the Minimal Version be posted on X?
   - What format maximizes engagement?
   - What timing maximizes reach?
   - What CTAs maximize conversion?

7. **Expected Impact**: What are the expected metrics?
   - User acquisition rate
   - Conversion rate (free to paid)
   - Retention rate
   - Viral coefficient

8. **Optimization Recommendations**: What improvements would you recommend?
   - Content improvements
   - Format improvements
   - CTA improvements
   - Distribution improvements

Please provide:
- Strategic analysis
- Specific recommendations
- Expected impact (quantitative if possible)
- Implementation roadmap
- Risk factors and mitigation`,
        },
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });

    const response = completion?.choices?.[0]?.message?.content?.trim();
    
    if (!response) {
      console.error('❌ No response from Grok');
      return null;
    }

    console.log('[Grok Analysis] ========================================');
    console.log('[Grok Analysis] Grok Response:');
    console.log('[Grok Analysis] ========================================\n');
    console.log(response);
    console.log('\n[Grok Analysis] ========================================');
    console.log('[Grok Analysis] Analysis completed');
    console.log('[Grok Analysis] ========================================\n');

    return response;
  } catch (error) {
    console.error('[Grok Analysis] ❌ Error:', error.message);
    if (error.status === 404) {
      console.error('[Grok Analysis] Model not found. Available models: grok-beta, grok-3');
    }
    throw error;
  }
}

// 実行
async function main() {
  try {
    const grokResponse = await analyzeMinimalVersionValueWithGrok();
    
    // 結果を保存
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(__dirname, '../docs/MINIMAL_VERSION_VALUE_ANALYSIS_2026-01-23.md');
    
    const report = `# 無料版（Minimal Version）の利用価値分析
**作成日**: 2026-01-23  
**作成者**: Grok (${GROK_MODEL})  
**ステータス**: ✅ 分析完了

---

## 🎯 エグゼクティブサマリー

Grokが無料版（Minimal Version）の利用価値、ユーザー心理学、コンバージョンファネル、リテンション戦略について分析しました。

---

## 🚀 Grok分析結果

${grokResponse || 'Grok analysis pending...'}

---

**作成日**: 2026-01-23  
**作成者**: Grok (${GROK_MODEL})  
**ステータス**: ✅ 分析完了
`;

    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(`\n✅ Report saved to: ${reportPath}\n`);

  } catch (error) {
    console.error('❌ Failed to analyze:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { analyzeMinimalVersionValueWithGrok };
