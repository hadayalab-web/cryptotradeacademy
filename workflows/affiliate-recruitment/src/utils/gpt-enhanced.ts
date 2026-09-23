/**
 * GPTポテンシャル最大化版 - エンハンストGPTクライアント
 * 
 * GPTレビューに基づく改善:
 * - 深い推論能力の活用（プロンプト設計で担保）
 * - Grok分析結果の強化
 * - 高品質な文章生成
 * - 戦略的インサイト提供
 */

import type { MarketCode } from '../types';
import { callGPT52 } from '../../../scripts/direct-ai-api.js';
import { extractJsonFromText, safeJsonParse } from './vercel-safe';

/**
 * Grok分析結果をGPTで強化
 */
export interface GrokAnalysisResult {
  priorityRanking: Array<{
    candidateId: string;
    name: string;
    priorityScore: number;
    reasoning: string;
    growthPotential: number;
    conversionLikelihood: number;
  }>;
  contentStyles?: Array<{
    candidateId: string;
    name: string;
    style: string;
    tone: string;
    recommendations: string[];
  }>;
  insights: string[];
  summary: {
    totalAnalyzed: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
  };
}

/**
 * GPT強化分析結果
 */
export interface GPTEnhancedAnalysisResult extends GrokAnalysisResult {
  strategicInsights: {
    marketOpportunities: string[];
    riskFactors: string[];
    recommendedActions: string[];
    competitiveAdvantages: string[];
  };
  futurePredictions: Array<{
    candidateId: string;
    predictedImpact: number; // 0-10
    predictedGrowth: number; // 0-10
    timeHorizon: string; // "1month" | "3months" | "6months" | "1year"
    reasoning: string;
  }>;
  marketSegmentAnalysis: Array<{
    segment: string;
    candidates: number;
    averageScore: number;
    opportunities: string[];
  }>;
}

/**
 * Grok分析結果をGPTの深い推論で強化
 */
export async function enhanceGrokAnalysisWithGPT(options: {
  grokAnalysis: GrokAnalysisResult;
  candidates: any[];
  marketCode: MarketCode;
  productInfo?: {
    name: string;
    description: string;
    commissionRate: number;
  };
}): Promise<GPTEnhancedAnalysisResult> {
  const { grokAnalysis, candidates, marketCode, productInfo } = options;

  const prompt = `You are a strategic marketing analyst with deep reasoning capabilities. Enhance the Grok analysis results with strategic insights and future predictions.

**Grok Analysis Results**:
${JSON.stringify(grokAnalysis, null, 2)}

**Candidate Data** (sample):
${JSON.stringify(candidates.slice(0, 20), null, 2)} ${candidates.length > 20 ? `\n... (${candidates.length - 20} more candidates)` : ''}

**Market**: ${marketCode}

${productInfo ? `**Product Info**:
- Name: ${productInfo.name}
- Description: ${productInfo.description}
- Commission Rate: ${productInfo.commissionRate}%` : ''}

**Your Task**:
Using deep reasoning, enhance the Grok analysis with:

1. **Strategic Insights**:
   - Market opportunities based on candidate profiles
   - Risk factors to consider
   - Recommended actions for each priority tier
   - Competitive advantages

2. **Future Predictions**:
   - Predict impact and growth for top candidates
   - Time horizons: 1 month, 3 months, 6 months, 1 year
   - Reasoning for each prediction

3. **Market Segment Analysis**:
   - Segment candidates by characteristics
   - Analyze opportunities per segment
   - Average scores per segment

**Deep Reasoning Process**:
Step 1: Analyze Grok's initial analysis for patterns and insights
Step 2: Identify strategic opportunities and risks
Step 3: Predict future outcomes based on current data and market trends
Step 4: Segment candidates for targeted strategies
Step 5: Provide actionable recommendations

Return JSON format:
{
  "priorityRanking": [...], // Keep Grok's ranking, add GPT enhancements
  "contentStyles": [...], // Keep Grok's styles
  "insights": [...], // Combine Grok and GPT insights
  "summary": {...}, // Keep Grok's summary
  "strategicInsights": {
    "marketOpportunities": ["string"],
    "riskFactors": ["string"],
    "recommendedActions": ["string"],
    "competitiveAdvantages": ["string"]
  },
  "futurePredictions": [
    {
      "candidateId": "string",
      "predictedImpact": number,
      "predictedGrowth": number,
      "timeHorizon": "1month" | "3months" | "6months" | "1year",
      "reasoning": "string"
    }
  ],
  "marketSegmentAnalysis": [
    {
      "segment": "string",
      "candidates": number,
      "averageScore": number,
      "opportunities": ["string"]
    }
  ]
}`;

  try {
    const result = await callGPT52(prompt, {
      temperature: 0.6, // 一貫性のため低め
      maxCompletionTokens: 6000,
    });

    // JSON抽出（安全化）
    const jsonText = extractJsonFromText(result.text);
    if (!jsonText) {
      throw new Error('No JSON found in GPT enhanced analysis response');
    }

    const parsed = safeJsonParse<any>(jsonText, null, 'GPT enhanced analysis');
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON structure in GPT enhanced analysis response');
    }
    
    // Grok分析結果とGPT強化結果を統合
    return {
      ...grokAnalysis,
      strategicInsights: parsed.strategicInsights || {
        marketOpportunities: [],
        riskFactors: [],
        recommendedActions: [],
        competitiveAdvantages: [],
      },
      futurePredictions: parsed.futurePredictions || [],
      marketSegmentAnalysis: parsed.marketSegmentAnalysis || [],
    };
  } catch (error: any) {
    console.error('GPT enhancement error:', error);
    // エラー時はGrok分析結果をそのまま返す
    return {
      ...grokAnalysis,
      strategicInsights: {
        marketOpportunities: [],
        riskFactors: [],
        recommendedActions: [],
        competitiveAdvantages: [],
      },
      futurePredictions: [],
      marketSegmentAnalysis: [],
    };
  }
}

/**
 * GPT高品質DM生成（Grok DMの代替または補完）
 */
export async function generateHighQualityDMWithGPT(options: {
  candidate: any;
  marketCode: MarketCode;
  grokDM?: string; // Grokで生成したDM（参考用）
  productInfo: {
    name: string;
    description: string;
    commissionRate: number;
  };
  analysisInsights?: {
    priorityScore: number;
    contentStyle: string;
    tone: string;
    recommendations: string[];
  };
}): Promise<{
  message: string;
  reasoning: string;
  tone: string;
  cta: string;
  personalizationLevel: 'high' | 'medium' | 'low';
  expectedResponseRate: number; // 0-100%
}> {
  const { candidate, marketCode, grokDM, productInfo, analysisInsights } = options;

  const prompt = `You are an expert copywriter specializing in affiliate recruitment. Generate a high-quality, personalized Telegram DM message.

**Candidate Profile**:
${JSON.stringify(candidate, null, 2)}

**Market**: ${marketCode}

**Product Info**:
- Name: ${productInfo.name}
- Description: ${productInfo.description}
- Commission Rate: ${productInfo.commissionRate}%

${grokDM ? `**Grok-Generated DM (Reference)**:
${grokDM}

Note: Use this as reference, but create a more refined version.` : ''}

${analysisInsights ? `**Analysis Insights**:
- Priority Score: ${analysisInsights.priorityScore}/10
- Content Style: ${analysisInsights.contentStyle}
- Recommended Tone: ${analysisInsights.tone}
- Recommendations: ${analysisInsights.recommendations.join(', ')}` : ''}

**Requirements**:
- High-quality, natural, and conversational
- Deeply personalized based on candidate's profile and content style
- Market-appropriate language (${marketCode})
- Low-friction CTA (e.g., "2分で登録", "Get started in 2 minutes")
- Length: 200-300 characters
- Professional yet approachable tone
- Highlight unique value propositions
- Address candidate's potential pain points

**Deep Reasoning Process**:
Step 1: Analyze candidate's content style, tone, and audience
Step 2: Identify their pain points and motivations
Step 3: Craft a message that resonates deeply
Step 4: Optimize CTA for maximum conversion
Step 5: Predict expected response rate

Return JSON format:
{
  "message": "string",
  "reasoning": "string",
  "tone": "string",
  "cta": "string",
  "personalizationLevel": "high" | "medium" | "low",
  "expectedResponseRate": number (0-100)
}`;

  try {
    const result = await callGPT52(prompt, {
      temperature: 0.8, // 創造性のため高め
      maxCompletionTokens: 2000,
    });

    // JSON抽出（安全化）
    const jsonText = extractJsonFromText(result.text);
    if (!jsonText) {
      throw new Error('No JSON found in GPT enhanced analysis response');
    }

    const parsed = safeJsonParse<any>(jsonText, null, 'GPT enhanced analysis');
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON structure in GPT enhanced analysis response');
    }
    return {
      message: parsed.message || '',
      reasoning: parsed.reasoning || '',
      tone: parsed.tone || 'professional',
      cta: parsed.cta || '',
      personalizationLevel: parsed.personalizationLevel || 'medium',
      expectedResponseRate: parsed.expectedResponseRate || 0,
    };
  } catch (error: any) {
    console.error('GPT DM generation error:', error);
    throw error;
  }
}

/**
 * GPT戦略的インサイト生成
 */
export async function generateStrategicInsights(options: {
  candidates: any[];
  marketCode: MarketCode;
  grokAnalysis: GrokAnalysisResult;
  historicalData?: {
    conversionRates: Record<string, number>;
    topPerformers: string[];
  };
}): Promise<{
  marketStrategy: {
    focusSegments: string[];
    recommendedApproach: string;
    timing: string;
    messagingStrategy: string;
  };
  riskAssessment: {
    highRiskFactors: string[];
    mitigationStrategies: string[];
  };
  competitiveAnalysis: {
    advantages: string[];
    challenges: string[];
    differentiation: string[];
  };
}> {
  const { candidates, marketCode, grokAnalysis, historicalData } = options;

  const prompt = `You are a strategic marketing consultant. Generate strategic insights for affiliate recruitment.

**Candidates Data**:
${JSON.stringify(candidates.slice(0, 30), null, 2)} ${candidates.length > 30 ? `\n... (${candidates.length - 30} more)` : ''}

**Grok Analysis Summary**:
${JSON.stringify(grokAnalysis.summary, null, 2)}

**Priority Ranking** (Top 10):
${JSON.stringify(grokAnalysis.priorityRanking.slice(0, 10), null, 2)}

**Market**: ${marketCode}

${historicalData ? `**Historical Data**:
- Conversion Rates: ${JSON.stringify(historicalData.conversionRates)}
- Top Performers: ${historicalData.topPerformers.join(', ')}` : ''}

**Your Task**:
Using deep reasoning, provide strategic insights:

1. **Market Strategy**:
   - Focus segments to prioritize
   - Recommended approach for each segment
   - Optimal timing for outreach
   - Messaging strategy

2. **Risk Assessment**:
   - High-risk factors to watch
   - Mitigation strategies

3. **Competitive Analysis**:
   - Advantages over competitors
   - Challenges to overcome
   - Differentiation strategies

**Deep Reasoning Process**:
Step 1: Analyze candidate patterns and market dynamics
Step 2: Identify strategic opportunities and risks
Step 3: Develop actionable strategies
Step 4: Consider competitive landscape
Step 5: Provide specific, actionable recommendations

Return JSON format:
{
  "marketStrategy": {
    "focusSegments": ["string"],
    "recommendedApproach": "string",
    "timing": "string",
    "messagingStrategy": "string"
  },
  "riskAssessment": {
    "highRiskFactors": ["string"],
    "mitigationStrategies": ["string"]
  },
  "competitiveAnalysis": {
    "advantages": ["string"],
    "challenges": ["string"],
    "differentiation": ["string"]
  }
}`;

  try {
    const result = await callGPT52(prompt, {
      temperature: 0.7,
      maxCompletionTokens: 4000,
    });

    // JSON抽出（安全化）
    const jsonText = extractJsonFromText(result.text);
    if (!jsonText) {
      throw new Error('No JSON found in GPT enhanced analysis response');
    }

    const parsed = safeJsonParse<any>(jsonText, null, 'GPT enhanced analysis');
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON structure in GPT enhanced analysis response');
    }
    return {
      marketStrategy: parsed.marketStrategy || {
        focusSegments: [],
        recommendedApproach: '',
        timing: '',
        messagingStrategy: '',
      },
      riskAssessment: parsed.riskAssessment || {
        highRiskFactors: [],
        mitigationStrategies: [],
      },
      competitiveAnalysis: parsed.competitiveAnalysis || {
        advantages: [],
        challenges: [],
        differentiation: [],
      },
    };
  } catch (error: any) {
    console.error('Strategic insights generation error:', error);
    throw error;
  }
}
