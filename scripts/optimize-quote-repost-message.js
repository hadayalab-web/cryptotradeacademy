// scripts/optimize-quote-repost-message.js
// 引用リポスト用無料版メッセージの最適化（Grok + COO分析）

const OpenAI = require('openai');

// コマンドライン引数からAPIキーを取得
const args = process.argv.slice(2);
let XAI_API_KEY = process.env.XAI_API_KEY;
for (const arg of args) {
  if (arg.startsWith('--api-key=')) {
    XAI_API_KEY = arg.split('=')[1];
    break;
  }
}

const XAI_BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is not set');
  console.error('Usage: node scripts/optimize-quote-repost-message.js --api-key=YOUR_API_KEY');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: XAI_BASE_URL,
});

// 現在の市況データ
const currentMarketData = {
  trapScore: 0,
  priceUsd: 89077,
  change24h: -0.84,
  exchangeNetflow: 1252,
  whaleRatio: 56,
  date: '2026-01-23 12:00:44 UTC',
};

// 現在の無料版メッセージ（EN版）
const currentMessageEN = `🌤️ Trap Defence BTC - Free Report
🚨 BREAKING: TRAP DEFENCE BRIEFING
📅 2026-01-23 12:00:44 UTC

━━━━━━━━━━━━━━━━━━━━
🎯 Today's Trap Score
━━━━━━━━━━━━━━━━━━━━
0/100
✅ VERY LOW TRAP RISK: Very few trap indicators detected. Market conditions appear safe

💰 BTC Price: $89,077 (-0.84% / 24h)

💡 Current market conditions are relatively stable, but it's important to always remain vigilant

━━━━━━━━━━━━━━━━━━━━
📊 Data-Backed Reasons
━━━━━━━━━━━━━━━━━━━━
• Exchange Netflow: +1252 BTC (inflow) — Potential selling pressure
• Whale Ratio: 56% — Moderately high selling pressure

💡 Strategic Insights
  ✅ Trap Score 0/100: Currently low trap risk, but markets always change
  🛡️ Low-risk times are when strategic preparation matters most. Continue defense until clear advantage emerges
  💎 Professional traders prioritize "waiting time" above all. Take the same strategy

━━━━━━━━━━━━━━━━━━━━
💊 Dr. Grok's Quick Insight
━━━━━━━━━━━━━━━━━━━━
"Low risk now, but markets always change. Not preparing is the path to defeat."

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

async function optimizeWithGrok() {
  const prompt = `あなたはX（旧Twitter）アルゴリズム最適化の専門家です。引用リポスト用の無料版メッセージを、現在の市況を考慮してバズらせるように最適化してください。

## 📊 現在の市況
- **Trap Score**: 0/100（非常に低リスク）
- **BTC Price**: $89,077 (-0.84% / 24h)
- **Exchange Netflow**: +1252 BTC (inflow) — Potential selling pressure
- **Whale Ratio**: 56% — Moderately high selling pressure
- **市場状況**: 比較的安定しているが、潜在的な売り圧力あり

## 📝 現在の無料版メッセージ（EN版）

${currentMessageEN}

## 🎯 最適化要件

### 1. Xアルゴリズム最適化
- **質問CTA必須**: アルゴリズム評価UPのため、質問形式のCTAを追加
- **緊急語の強化**: "BREAKING"だけでなく、より強い緊急語を使用
- **絵文字の最適化**: 2-3個の絵文字を戦略的に配置
- **会話を促す**: リプライを促す質問を追加

### 2. バズらせる要素
- **矛盾の提示**: 低リスクなのに潜在的な売り圧力がある矛盾を強調
- **FOMO（恐れ）**: "準備しないことが敗北の道"というメッセージを強化
- **具体的な数字**: 抽象的な表現を具体的な数字に置き換え
- **ストーリーテリング**: データを物語として提示

### 3. 引用リポスト最適化
- **140文字以内の要約**: 引用リポスト用の短い要約を追加
- **ハッシュタグ最適化**: トレンドハッシュタグを動的に追加
- **エンゲージメント誘導**: リプライ、いいね、RTを促す要素を追加

## 📊 出力形式

以下のJSON形式で回答してください：

{
  "optimizedMessage": {
    "en": "最適化されたEN版メッセージ（全文）",
    "es": "最適化されたES版メッセージ（全文）",
    "pt-br": "最適化されたPT-BR版メッセージ（全文）",
    "ar": "最適化されたAR版メッセージ（全文）",
    "ko": "最適化されたKO版メッセージ（全文）",
    "ja": "最適化されたJA版メッセージ（全文）"
  },
  "quoteRepostSummary": {
    "en": "引用リポスト用140文字以内の要約（EN）",
    "es": "引用リポスト用140文字以内の要約（ES）",
    "pt-br": "引用リポスト用140文字以内の要約（PT-BR）",
    "ar": "引用リポスト用140文字以内の要約（AR）",
    "ko": "引用リポスト用140文字以内の要約（KO）",
    "ja": "引用リポスト用140文字以内の要約（JA）"
  },
  "optimizationPoints": [
    "最適化ポイント1",
    "最適化ポイント2",
    "最適化ポイント3"
  ],
  "expectedImpact": {
    "impressions": "期待されるインプレッション向上率",
    "engagement": "期待されるエンゲージメント向上率",
    "viralPotential": "バズる可能性の評価"
  }
}`;

  try {
    console.log('[Quote Repost Optimizer] ========================================');
    console.log('[Quote Repost Optimizer] Optimizing with Grok...');
    console.log('[Quote Repost Optimizer] ========================================');
    
    const completion = await openai.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'あなたはX（旧Twitter）アルゴリズム最適化の専門家です。引用リポスト用のメッセージを、現在の市況を考慮してバズらせるように最適化してください。具体的で実行可能な提案を提供してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 4000,
      temperature: 0.7, // 創造性を高めるため、やや高めの温度
      response_format: { type: 'json_object' },
    });

    const responseText = completion?.choices?.[0]?.message?.content?.trim();
    
    if (!responseText) {
      throw new Error('No response from Grok');
    }

    const optimization = JSON.parse(responseText);
    
    console.log('[Quote Repost Optimizer] ========================================');
    console.log('[Quote Repost Optimizer] ✅ Optimization received');
    console.log('[Quote Repost Optimizer] ========================================');
    console.log(JSON.stringify(optimization, null, 2));
    console.log('[Quote Repost Optimizer] ========================================');
    
    return optimization;
  } catch (error) {
    console.error('[Quote Repost Optimizer] ❌ Error:', error.message);
    console.error('[Quote Repost Optimizer] Stack:', error.stack);
    throw error;
  }
}

// COO分析
function cooAnalysis() {
  console.log('\n[COO Analysis] ========================================');
  console.log('[COO Analysis] COO Analysis of Current Message');
  console.log('[COO Analysis] ========================================');
  
  const analysis = {
    strengths: [
      '✅ データに基づいた分析（Exchange Netflow、Whale Ratio）',
      '✅ Dr. Grokの心理的メッセージが含まれている',
      '✅ 無料版と完全版の比較が明確',
      '✅ 教育目的の免責事項が含まれている',
    ],
    weaknesses: [
      '⚠️ 質問CTAが不足（アルゴリズム評価UPのため必須）',
      '⚠️ 緊急語が弱い（"BREAKING"だけでは不十分）',
      '⚠️ 矛盾の提示が弱い（低リスクなのに売り圧力がある矛盾を強調すべき）',
      '⚠️ 具体的な行動喚起が不足（"今すぐアップグレード"だけでは弱い）',
      '⚠️ ストーリーテリングが弱い（データを物語として提示すべき）',
    ],
    optimizationSuggestions: [
      '🎯 質問CTAを追加: "What\'s your biggest fear in this market? Reply below!"',
      '🎯 緊急語を強化: "BREAKING" → "🚨 CRITICAL ALERT" または "⚡ URGENT UPDATE"',
      '🎯 矛盾を強調: "Low risk BUT selling pressure building. What\'s your move?"',
      '🎯 具体的な数字を追加: "56% whale ratio = $50M+ ready to sell"',
      '🎯 ストーリーテリング: "While you sleep, whales are positioning..."',
      '🎯 FOMO強化: "One missed signal = Lost capital. Are you prepared?"',
    ],
    expectedImpact: {
      impressions: '+30-50% (質問CTA + 緊急語強化)',
      engagement: '+40-60% (質問CTA + 矛盾の提示)',
      viralPotential: 'High (矛盾の提示 + FOMO + ストーリーテリング)',
    },
  };
  
  console.log('\n📊 Strengths:');
  analysis.strengths.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  
  console.log('\n⚠️ Weaknesses:');
  analysis.weaknesses.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
  
  console.log('\n🎯 Optimization Suggestions:');
  analysis.optimizationSuggestions.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  
  console.log('\n📈 Expected Impact:');
  console.log(`  Impressions: ${analysis.expectedImpact.impressions}`);
  console.log(`  Engagement: ${analysis.expectedImpact.engagement}`);
  console.log(`  Viral Potential: ${analysis.expectedImpact.viralPotential}`);
  
  return analysis;
}

// 実行
if (require.main === module) {
  Promise.all([
    optimizeWithGrok(),
    Promise.resolve(cooAnalysis()),
  ])
    .then(([grokOptimization, cooAnalysis]) => {
      console.log('\n[Final Recommendations]');
      console.log('========================================');
      console.log('Grok Optimization Points:');
      if (grokOptimization.optimizationPoints) {
        grokOptimization.optimizationPoints.forEach((point, index) => {
          console.log(`${index + 1}. ${point}`);
        });
      }
      console.log('\nCOO Optimization Points:');
      cooAnalysis.optimizationSuggestions.forEach((point, index) => {
        console.log(`${index + 1}. ${point}`);
      });
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to optimize:', error);
      process.exit(1);
    });
}

module.exports = { optimizeWithGrok, cooAnalysis };
