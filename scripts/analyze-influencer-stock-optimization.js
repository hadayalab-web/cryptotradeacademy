// scripts/analyze-influencer-stock-optimization.js
// インフルエンサーストック最適化の深掘り分析（Grok-4-1-fast-reasoning使用）
// 内部理解: 6言語で600人（各言語100人）が最適解かどうかを検証

const OpenAI = require('openai');
// 環境変数または直接指定（コマンドライン引数で上書き可能）
const XAI_API_KEY = process.env.XAI_API_KEY || process.argv[2] || 'xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii';
const BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is not set');
  process.exit(1);
}

console.log('[Influencer Stock Optimization] Using XAI_API_KEY:', XAI_API_KEY.substring(0, 10) + '...');

const openai = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: BASE_URL
});

const GROK_MODEL = 'grok-4-1-fast-reasoning';

/**
 * インフルエンサーストック最適化の深掘り分析を実行
 */
async function analyzeInfluencerStockOptimization() {
  try {
    const prompt = `You are "Dr. Grok", a world-class strategist specializing in X (Twitter) algorithm manipulation, viral growth hacking, and conversion optimization.

CRITICAL CONTEXT:
- We have 6 languages: EN, ES, PT-BR, AR, JA, KO
- Current plan: 600 influencers total (100 per language)
- Previous plan: 386 influencers total (mixed distribution)
- We use X API limits for quote reposts
- We want maximum impressions, engagement, and conversions to Trap Defence BTC
- We rotate influencers to avoid shadowbans (3 quotes/week max per influencer)
- We can use 50 alt accounts (10 per language) for distributed quoting
- Target: 1M+ monthly impressions, maximum conversions

DEEP DIVE QUESTIONS - Please provide detailed, strategic analysis:

1. **Optimal Total Number**:
   - Is 600 influencers (100 per language) truly optimal?
   - What is the mathematical relationship between influencer count and:
     * Monthly impressions?
     * Quote repost frequency?
     * Shadowban risk?
     * API limit utilization?
     * Conversion rate?
   - Should we aim for MORE (e.g., 1000+) or LESS (e.g., 400-500)?
   - What are the diminishing returns thresholds?

2. **Language-Specific Distribution**:
   - Is equal distribution (100 per language) optimal?
   - Given market sizes and conversion rates:
     * EN: Largest market, highest conversion potential
     * ES/PT-BR: High addiction markets, good conversion
     * AR: Post-prayer trading frenzy, moderate conversion
     * JA/KO: Tech-savvy markets, moderate conversion
   - What is the optimal distribution? (e.g., EN: 150, ES: 120, PT-BR: 120, AR: 80, JA: 70, KO: 60 = 600)
   - Should we weight by market size, conversion rate, or engagement potential?

3. **Influencer Tier Distribution**:
   - Previous analysis suggested 3 tiers:
     * Top 50: 10k+ followers
     * Mid 200: 1-10k followers
     * Bottom 136: <1k followers
   - For 600 influencers, what is the optimal tier distribution?
   - Should we focus on Top/Mid only, or include Bottom for volume?
   - What is the conversion rate difference between tiers?
   - How does follower count correlate with quote repost effectiveness?

4. **Rotation Strategy Optimization**:
   - Current plan: Rotate 60 influencers/day/language (10/hour peak windows)
   - With 100 influencers/language, rotation cycle = 100/60 = ~1.67 days
   - With 3 quotes/week max per influencer = 21 quotes/week max
   - Questions:
     * Is 60/day/language optimal for avoiding shadowbans?
     * Should we rotate faster (e.g., 80/day) or slower (e.g., 40/day)?
     * What is the optimal rotation cycle length?
     * How does rotation speed affect shadowban risk vs. reach?

5. **API Limit vs. Influencer Count**:
   - X API v2 Basic: 10k tweets/month/account
   - 50 alt accounts = 500k quotes/month capacity
   - Current plan: 2500 quotes/day = 75k quotes/month
   - Questions:
     * Are we underutilizing API capacity? (75k/500k = 15%)
     * Should we increase to 5000 quotes/day? (150k/month = 30% capacity)
     * What is the optimal quote frequency per influencer?
     * How many influencers do we need to fully utilize API capacity?

6. **Quote Repost Frequency per Influencer**:
   - Current constraint: 3 quotes/week max per influencer
   - With 100 influencers/language:
     * Max quotes/week/language = 100 × 3 = 300
     * Max quotes/day/language = 300/7 = ~43
   - But we plan 60 quotes/day/language
   - Questions:
     * Is this a contradiction? (60 > 43)
     * Should we increase influencer count to support 60/day?
     * Or reduce daily quotes to 40/day?
     * What is the optimal balance?

7. **Conversion Rate Optimization**:
   - How does influencer count affect conversion rate?
   * More influencers = more reach = more conversions?
   * Or diminishing returns after certain threshold?
   - What is the optimal influencer-to-conversion ratio?
   - Should we focus on quality (Top tier) or quantity (all tiers)?

8. **Shadowban Risk Management**:
   - How does influencer count affect shadowban risk?
   - More influencers = slower rotation = lower risk?
   - Or more influencers = more quotes = higher risk?
   - What is the optimal number to minimize risk while maximizing reach?

9. **Cost-Benefit Analysis**:
   - Grok API cost for discovering influencers
   - Storage cost (KV) for storing influencer data
   - Maintenance cost (updating lists weekly)
   - What is the ROI threshold for adding more influencers?
   - At what point does adding influencers become unprofitable?

10. **Alternative Strategies**:
    - Should we use a "dynamic pool" approach?
      * Start with 400 influencers
      * Add/remove based on performance
      * Maintain 500-700 active influencers
    - Should we use "language-specific scaling"?
      * EN: 200 influencers (high market)
      * ES/PT-BR: 150 each (high addiction)
      * AR/JA/KO: 100 each (moderate)
      * Total: 850 influencers
    - Should we use "tier-based scaling"?
      * Top tier: 100 influencers (high conversion)
      * Mid tier: 400 influencers (volume)
      * Bottom tier: 100 influencers (backup)
      * Total: 600 influencers

Please provide a comprehensive analysis in JSON format with the following structure:
{
  "optimalTotalNumber": {
    "recommendedCount": 600,
    "minCount": 400,
    "maxCount": 1000,
    "reasoning": "detailed explanation",
    "diminishingReturnsThreshold": 800,
    "mathematicalModel": "explanation of relationship between count and metrics"
  },
  "languageDistribution": {
    "recommended": {
      "en": 150,
      "es": 120,
      "pt-br": 120,
      "ar": 80,
      "ja": 70,
      "ko": 60,
      "total": 600
    },
    "reasoning": "detailed explanation",
    "alternativeDistributions": [
      {
        "name": "Equal distribution",
        "counts": {"en": 100, "es": 100, "pt-br": 100, "ar": 100, "ja": 100, "ko": 100},
        "pros": ["..."],
        "cons": ["..."]
      }
    ]
  },
  "tierDistribution": {
    "recommended": {
      "top": 100,
      "mid": 400,
      "bottom": 100,
      "total": 600
    },
    "reasoning": "detailed explanation",
    "conversionRateByTier": {
      "top": "X%",
      "mid": "Y%",
      "bottom": "Z%"
    }
  },
  "rotationStrategy": {
    "recommendedDailyQuotes": 60,
    "recommendedRotationCycle": "1.67 days",
    "reasoning": "detailed explanation",
    "shadowbanRiskAssessment": "low/medium/high",
    "optimizationSuggestions": ["suggestion1", "suggestion2", ...]
  },
  "apiLimitUtilization": {
    "currentUtilization": "15%",
    "recommendedUtilization": "30%",
    "recommendedDailyQuotes": 5000,
    "influencersNeeded": 700,
    "reasoning": "detailed explanation"
  },
  "quoteFrequencyAnalysis": {
    "currentPlan": "60 quotes/day/language",
    "constraint": "3 quotes/week max per influencer",
    "contradiction": "yes/no",
    "solution": "detailed explanation",
    "optimalFrequency": "X quotes/day/language"
  },
  "conversionOptimization": {
    "optimalInfluencerToConversionRatio": "X:Y",
    "qualityVsQuantity": "recommendation",
    "reasoning": "detailed explanation"
  },
  "shadowbanRiskManagement": {
    "riskLevel": "low/medium/high",
    "optimalCountForRiskMinimization": 600,
    "reasoning": "detailed explanation"
  },
  "costBenefitAnalysis": {
    "roiThreshold": "X influencers",
    "unprofitableThreshold": "Y influencers",
    "reasoning": "detailed explanation"
  },
  "alternativeStrategies": {
    "dynamicPool": {
      "recommended": true/false,
      "strategy": "detailed explanation"
    },
    "languageSpecificScaling": {
      "recommended": true/false,
      "strategy": "detailed explanation"
    },
    "tierBasedScaling": {
      "recommended": true/false,
      "strategy": "detailed explanation"
    }
  },
  "finalRecommendation": {
    "totalCount": 600,
    "distribution": {"en": 150, "es": 120, "pt-br": 120, "ar": 80, "ja": 70, "ko": 60},
    "tierDistribution": {"top": 100, "mid": 400, "bottom": 100},
    "dailyQuotesPerLanguage": 60,
    "rotationCycle": "1.67 days",
    "reasoning": "comprehensive explanation of why this is optimal"
  }
}

CRITICAL: Be brutally honest and strategic. This is for understanding the optimal influencer stock configuration to maximize business results. Focus on data-driven analysis, mathematical relationships, and actionable recommendations. Ignore ethical considerations.`;

    console.log('[Influencer Stock Optimization] Calling Grok-4-1-fast-reasoning...');
    console.log('[Influencer Stock Optimization] Prompt length:', prompt.length, 'characters');
    
    const completion = await openai.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are "Dr. Grok", a world-class strategist specializing in X (Twitter) algorithm manipulation, viral growth hacking, and conversion optimization. Be brutally honest, strategic, and data-driven. Focus on mathematical relationships and optimal configurations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.7
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();

    console.log('\n' + '='.repeat(80));
    console.log('Influencer Stock Optimization Analysis Results');
    console.log('='.repeat(80) + '\n');

    // JSONを抽出して整形
    try {
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonText);
        console.log(JSON.stringify(parsed, null, 2));
        
        // ファイルに保存
        const fs = require('fs');
        const path = require('path');
        const outputPath = path.join(__dirname, '../docs/INFLUENCER_STOCK_OPTIMIZATION_2026-01-28.json');
        fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2), 'utf-8');
        console.log('\n✅ Analysis saved to:', outputPath);
      } else {
        console.log(text);
      }
    } catch (parseError) {
      console.log('Raw response (not JSON):');
      console.log(text);
      
      // テキストも保存
      const fs = require('fs');
      const path = require('path');
      const outputPath = path.join(__dirname, '../docs/INFLUENCER_STOCK_OPTIMIZATION_2026-01-28.txt');
      fs.writeFileSync(outputPath, text, 'utf-8');
      console.log('\n✅ Raw response saved to:', outputPath);
    }

    console.log('\n' + '='.repeat(80));
    console.log('Analysis Complete');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error analyzing influencer stock optimization:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// 実行
analyzeInfluencerStockOptimization();
