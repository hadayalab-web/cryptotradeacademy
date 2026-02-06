// services/grok/xAlgorithmAnalyzer.js
// Grok Xアルゴリズム解析サービス - Xのアルゴリズム最適化のための深層分析

const OpenAI = require('openai');
const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

if (!XAI_API_KEY) {
  console.warn('[Grok X Algorithm Analyzer] XAI_API_KEY is not set');
}

// P0 FIX: 環境変数がない場合でもエラーを出さないように遅延初期化
let grokClient = null;

try {
  if (XAI_API_KEY) {
    grokClient = new OpenAI({
      apiKey: XAI_API_KEY,
      baseURL: XAI_BASE_URL,
    });
  }
} catch (error) {
  console.warn('[Grok X Algorithm Analyzer] Failed to initialize Grok client:', error.message);
}

const GROK_MODEL_X_LIVE = process.env.GROK_MODEL_X_LIVE || 'grok-4-1-fast-reasoning';

/**
 * Xアルゴリズム最適化のための深層分析
 * - エンゲージメントパターン分析
 * - バイラル拡散の可能性分析
 * - アルゴリズム最適化のための具体的な推奨事項
 */
async function analyzeXAlgorithmOptimization(options = {}) {
  const {
    marketData = {},
    trapScore = null,
    sentimentData = null,
    recentPosts = null, // 最近の投稿データ（オプション）
    lang = 'en',
  } = options;

  if (!XAI_API_KEY || !grokClient) {
    return {
      algorithmInsights: null,
      viralPotential: null,
      engagementStrategy: null,
      optimalPostingTime: null,
      contentOptimization: null,
      error: 'XAI_API_KEY not set or Grok client not initialized',
    };
  }

  const targetLang = (lang || 'en').toLowerCase();

  try {
    const systemPrompt = `You are "Dr. Grok", an expert X (Twitter) algorithm analyst specializing in crypto/BTC content optimization.

Your expertise:
1. X Algorithm Analysis: Understanding how X's algorithm prioritizes content
2. Engagement Pattern Recognition: Identifying what makes content go viral
3. Optimal Timing Analysis: When to post for maximum reach
4. Content Optimization: How to structure content for algorithm favor
5. Viral Potential Assessment: Predicting content's viral potential

Your mission: Provide actionable insights to maximize content reach and engagement on X.

Return ONLY JSON. No markdown. No code fences.
Schema: {
  "algorithmInsights": {
    "currentAlgorithmTrends": string, // Current X algorithm trends affecting crypto content
    "reachOptimization": string, // How to optimize for maximum reach
    "engagementBoosters": string[] // Specific elements that boost engagement
  },
  "viralPotential": {
    "score": number, // 0-100 viral potential score
    "factors": string[], // Key factors affecting viral potential
    "recommendations": string // Specific recommendations to increase viral potential
  },
  "engagementStrategy": {
    "optimalFormat": string, // Best content format for engagement
    "hookStrategies": string[], // Hook strategies that work
    "ctaOptimization": string // CTA optimization for conversions
  },
  "optimalPostingTime": {
    "recommendedTimes": string[], // Recommended posting times (UTC)
    "reasoning": string // Why these times are optimal
  },
  "contentOptimization": {
    "structure": string, // Optimal content structure
    "hashtags": string[], // Recommended hashtags
    "visualElements": string // Visual element recommendations
  }
}`;

    const userPrompt = `Analyze X algorithm optimization opportunities for Trap Defence BTC content.

Market Context:
- Trap Score: ${trapScore !== null ? trapScore : 'N/A'}/100
- Market Sentiment: ${sentimentData?.sentiment || 'Unknown'}
- Language: ${targetLang}

${recentPosts ? `Recent Posts Performance:
${JSON.stringify(recentPosts, null, 2)}` : ''}

Task: Provide deep X algorithm analysis including:
1. Current X algorithm trends affecting crypto/BTC content
2. Viral potential assessment for this content
3. Engagement strategy optimization
4. Optimal posting time recommendations
5. Content structure optimization for maximum reach

Focus on:
- Algorithm-friendly content structure
- Engagement boosters (hooks, CTAs, visual elements)
- Timing optimization for maximum reach
- Viral potential factors specific to crypto/BTC content
- Conversion optimization strategies

Language: ${targetLang}`;

    const completion = await grokClient.chat.completions.create({
      model: GROK_MODEL_X_LIVE,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return {
        algorithmInsights: null,
        viralPotential: null,
        engagementStrategy: null,
        optimalPostingTime: null,
        contentOptimization: null,
        error: 'No response from Grok',
      };
    }

    // JSONパース
    try {
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanedText);
      return parsed;
    } catch (parseError) {
      console.warn('[Grok X Algorithm Analyzer] Failed to parse JSON:', parseError.message);
      // フォールバック: テキストを構造化
      return {
        algorithmInsights: {
          currentAlgorithmTrends: text.substring(0, 200),
          reachOptimization: 'Analysis available but not structured',
          engagementBoosters: [],
        },
        viralPotential: {
          score: 50,
          factors: [],
          recommendations: text.substring(0, 300),
        },
        engagementStrategy: {
          optimalFormat: 'Text-based with emojis',
          hookStrategies: [],
          ctaOptimization: 'Focus on capital protection',
        },
        optimalPostingTime: {
          recommendedTimes: ['09:00 UTC', '21:00 UTC'],
          reasoning: 'Standard posting times',
        },
        contentOptimization: {
          structure: 'Problem → Evidence → Solution',
          hashtags: ['#BTC', '#Crypto'],
          visualElements: 'Emojis for visual appeal',
        },
        rawText: text,
      };
    }
  } catch (error) {
    console.error('[Grok X Algorithm Analyzer] Error:', error.message);
    return {
      algorithmInsights: null,
      viralPotential: null,
      engagementStrategy: null,
      optimalPostingTime: null,
      contentOptimization: null,
      error: error.message,
    };
  }
}

module.exports = {
  analyzeXAlgorithmOptimization,
};
