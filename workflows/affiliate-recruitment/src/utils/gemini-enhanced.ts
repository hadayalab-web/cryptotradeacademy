/**
 * Geminiポテンシャル最大化版 - エンハンストGeminiクライアント
 * 
 * Geminiレビューに基づく改善:
 * - マルチモーダル分析（視覚的信頼性スコアリング）
 * - 1次スクリーニング（Gemini Flashで安価に大量処理）
 * - ロングコンテキスト活用（重複・競合排除）
 * - コスト効率の最大化
 */

import type { MarketCode } from '../types';
import { callGemini3Pro } from '../../../scripts/direct-ai-api.js';
import { extractJsonFromText, safeJsonParse } from './vercel-safe';

/**
 * 視覚的信頼性スコアリング結果
 */
export interface VisualCredibilityScore {
  candidateId: string;
  name: string;
  credibilityScore: number; // 0-10
  designProfessionalism: number; // 0-10
  trustworthiness: number; // 0-10
  reasoning: string;
  visualAnalysis: {
    colorScheme: string;
    layoutQuality: string;
    contentPresentation: string;
    overallImpression: string;
  };
}

/**
 * 1次スクリーニング結果
 */
export interface PrimaryScreeningResult {
  candidateId: string;
  name: string;
  passed: boolean;
  relevanceScore: number; // 0-10
  reasoning: string;
  quickAssessment: {
    contentRelevance: number;
    audienceMatch: number;
    engagementPotential: number;
  };
}

/**
 * マルチモーダル分析: 視覚的信頼性スコアリング
 * 
 * Geminiの強み: サイトのスクリーンショットや動画サムネイルを分析
 */
export async function analyzeVisualCredibility(options: {
  candidate: any;
  screenshotUrl?: string;
  videoThumbnailUrl?: string;
  marketCode: MarketCode;
}): Promise<VisualCredibilityScore> {
  const { candidate, screenshotUrl, videoThumbnailUrl, marketCode } = options;

  const prompt = `You are an expert in visual design and credibility assessment. Analyze the visual credibility of an affiliate candidate.

**Candidate Profile**:
${JSON.stringify(candidate, null, 2)}

**Market**: ${marketCode}

${screenshotUrl ? `**Website Screenshot**: ${screenshotUrl}` : ''}
${videoThumbnailUrl ? `**Video Thumbnail**: ${videoThumbnailUrl}` : ''}

**Your Task**:
Using your multimodal capabilities, analyze the visual credibility:

1. **Design Professionalism** (0-10):
   - Color scheme appropriateness
   - Layout quality and organization
   - Typography and readability
   - Overall design coherence

2. **Trustworthiness** (0-10):
   - Professional appearance
   - Brand consistency
   - Content presentation quality
   - User experience indicators

3. **Overall Credibility Score** (0-10):
   - Weighted average of design and trustworthiness
   - Consider market context (${marketCode})

**Deep Reasoning Process**:
Step 1: Analyze visual elements (colors, layout, typography)
Step 2: Assess professional appearance and brand consistency
Step 3: Evaluate content presentation and user experience
Step 4: Consider market-specific expectations
Step 5: Calculate credibility scores

Return JSON format:
{
  "candidateId": "string",
  "name": "string",
  "credibilityScore": number (0-10),
  "designProfessionalism": number (0-10),
  "trustworthiness": number (0-10),
  "reasoning": "string",
  "visualAnalysis": {
    "colorScheme": "string",
    "layoutQuality": "string",
    "contentPresentation": "string",
    "overallImpression": "string"
  }
}`;

  try {
    const result = await callGemini3Pro(prompt, {
      thinkingLevel: 'high',
      temperature: 0.6,
      maxOutputTokens: 2000,
    });

    // JSON抽出（安全化）
    const jsonText = extractJsonFromText(result.text);
    if (!jsonText) {
      throw new Error('No JSON found in Gemini visual credibility response');
    }

    const parsed = safeJsonParse<any>(jsonText, {}, 'Gemini visual credibility');
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON structure in Gemini visual credibility response');
    }

    return {
      candidateId: candidate.id || '',
      name: candidate.name || '',
      credibilityScore: parsed.credibilityScore || 0,
      designProfessionalism: parsed.designProfessionalism || 0,
      trustworthiness: parsed.trustworthiness || 0,
      reasoning: parsed.reasoning || '',
      visualAnalysis: parsed.visualAnalysis || {
        colorScheme: '',
        layoutQuality: '',
        contentPresentation: '',
        overallImpression: '',
      },
    };
  } catch (error: any) {
    console.error('Visual credibility analysis error:', error);
    throw error;
  }
}

/**
 * Gemini 1次スクリーニング（Gemini Flashで安価に大量処理）
 * 
 * Geminiの強み: コスト効率と高速処理
 */
export async function primaryScreeningWithGemini(options: {
  candidates: any[];
  marketCode: MarketCode;
  niche: string;
  minRelevanceScore?: number;
}): Promise<{
  passed: PrimaryScreeningResult[];
  failed: PrimaryScreeningResult[];
  statistics: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  };
}> {
  const {
    candidates,
    marketCode,
    niche,
    minRelevanceScore = 6,
  } = options;

  // バッチ処理: 一度に複数の候補を評価
  const batchSize = 50; // Geminiのロングコンテキストを活用
  const batches: any[][] = [];
  
  for (let i = 0; i < candidates.length; i += batchSize) {
    batches.push(candidates.slice(i, i + batchSize));
  }

  const allResults: PrimaryScreeningResult[] = [];

  for (const batch of batches) {
    const prompt = `You are an expert affiliate recruiter. Perform primary screening of affiliate candidates.

**Candidates** (Batch of ${batch.length}):
${JSON.stringify(batch, null, 2)}

**Market**: ${marketCode}
**Niche**: ${niche}
**Minimum Relevance Score**: ${minRelevanceScore}/10

**Your Task**:
Quickly assess each candidate for:
1. Content relevance to ${niche}
2. Audience match for ${marketCode} market
3. Engagement potential

**Screening Criteria**:
- Relevance Score >= ${minRelevanceScore}: PASS
- Relevance Score < ${minRelevanceScore}: FAIL

**Deep Reasoning Process**:
Step 1: Quick assessment of each candidate
Step 2: Calculate relevance scores
Step 3: Determine pass/fail status
Step 4: Provide brief reasoning

Return JSON format:
{
  "results": [
    {
      "candidateId": "string",
      "name": "string",
      "passed": boolean,
      "relevanceScore": number (0-10),
      "reasoning": "string",
      "quickAssessment": {
        "contentRelevance": number (0-10),
        "audienceMatch": number (0-10),
        "engagementPotential": number (0-10)
      }
    }
  ]
}`;

    try {
      const result = await callGemini3Pro(prompt, {
        thinkingLevel: 'low', // 1次スクリーニングは高速処理
        temperature: 0.5, // 一貫性のため低め
        maxOutputTokens: 4000,
      });

      // JSON抽出（安全化）
      const jsonText = extractJsonFromText(result.text);
      if (!jsonText) {
        throw new Error('No JSON found in Gemini primary screening response');
      }

      const parsed = safeJsonParse<any>(jsonText, { results: [] }, 'Gemini primary screening');
      if (!parsed || !Array.isArray(parsed.results)) {
        throw new Error('Invalid JSON structure in Gemini primary screening response');
      }

      allResults.push(...parsed.results);
    } catch (error: any) {
      console.error('Primary screening error:', error);
      // エラー時は全員をfailedとして扱う
      batch.forEach((candidate) => {
        allResults.push({
          candidateId: candidate.id || '',
          name: candidate.name || '',
          passed: false,
          relevanceScore: 0,
          reasoning: 'Screening error',
          quickAssessment: {
            contentRelevance: 0,
            audienceMatch: 0,
            engagementPotential: 0,
          },
        });
      });
    }
  }

  const passed = allResults.filter((r) => r.passed);
  const failed = allResults.filter((r) => !r.passed);

  return {
    passed,
    failed,
    statistics: {
      total: allResults.length,
      passed: passed.length,
      failed: failed.length,
      passRate: allResults.length > 0 ? passed.length / allResults.length : 0,
    },
  };
}

/**
 * ロングコンテキスト活用: 重複・競合排除
 * 
 * Geminiの強み: 1M-2M tokensのコンテキストウィンドウ
 */
export async function checkDuplicatesAndConflicts(options: {
  newCandidates: any[];
  historicalCandidates: any[];
  existingPartners: any[];
  marketCode: MarketCode;
}): Promise<{
  duplicates: Array<{
    candidateId: string;
    name: string;
    duplicateOf: string;
    matchType: 'email' | 'telegram' | 'profile' | 'content';
    confidence: number;
  }>;
  conflicts: Array<{
    candidateId: string;
    name: string;
    conflictWith: string;
    conflictReason: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  statistics: {
    totalNew: number;
    duplicatesFound: number;
    conflictsFound: number;
    uniqueCandidates: number;
  };
}> {
  const { newCandidates, historicalCandidates, existingPartners, marketCode } = options;

  const prompt = `You are an expert data analyst. Check for duplicates and conflicts in affiliate candidate lists.

**New Candidates** (${newCandidates.length}):
${JSON.stringify(newCandidates.slice(0, 100), null, 2)} ${newCandidates.length > 100 ? `\n... (${newCandidates.length - 100} more)` : ''}

**Historical Candidates** (${historicalCandidates.length}):
${JSON.stringify(historicalCandidates.slice(0, 100), null, 2)} ${historicalCandidates.length > 100 ? `\n... (${historicalCandidates.length - 100} more)` : ''}

**Existing Partners** (${existingPartners.length}):
${JSON.stringify(existingPartners.slice(0, 50), null, 2)} ${existingPartners.length > 50 ? `\n... (${existingPartners.length - 50} more)` : ''}

**Market**: ${marketCode}

**Your Task**:
Using your long context window, analyze all candidates and identify:

1. **Duplicates**:
   - Same email address
   - Same Telegram User ID
   - Similar profile (name, platform, content)
   - Similar content style

2. **Conflicts**:
   - Content overlap with existing partners
   - Competing products/services
   - Market positioning conflicts

**Deep Reasoning Process**:
Step 1: Compare new candidates with historical candidates
Step 2: Identify exact duplicates (email, Telegram ID)
Step 3: Identify potential duplicates (similar profiles)
Step 4: Check for conflicts with existing partners
Step 5: Assess conflict severity

Return JSON format:
{
  "duplicates": [
    {
      "candidateId": "string",
      "name": "string",
      "duplicateOf": "string (candidate ID)",
      "matchType": "email" | "telegram" | "profile" | "content",
      "confidence": number (0-1)
    }
  ],
  "conflicts": [
    {
      "candidateId": "string",
      "name": "string",
      "conflictWith": "string (partner/candidate ID)",
      "conflictReason": "string",
      "severity": "high" | "medium" | "low"
    }
  ],
  "statistics": {
    "totalNew": number,
    "duplicatesFound": number,
    "conflictsFound": number,
    "uniqueCandidates": number
  }
}`;

  try {
    const result = await callGemini3Pro(prompt, {
      thinkingLevel: 'high', // 深い推論が必要
      temperature: 0.5, // 一貫性のため低め
      maxOutputTokens: 6000,
    });

    // JSON抽出（安全化）
    const jsonText = extractJsonFromText(result.text);
    if (!jsonText) {
      throw new Error('No JSON found in Gemini duplicate/conflict check response');
    }

    const parsed = safeJsonParse<any>(jsonText, {
      duplicates: [],
      conflicts: [],
      statistics: {},
    }, 'Gemini duplicate/conflict check');
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON structure in Gemini duplicate/conflict check response');
    }

    return {
      duplicates: Array.isArray(parsed.duplicates) ? parsed.duplicates : [],
      conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts : [],
      statistics: parsed.statistics || {
        totalNew: newCandidates.length,
        duplicatesFound: Array.isArray(parsed.duplicates) ? parsed.duplicates.length : 0,
        conflictsFound: Array.isArray(parsed.conflicts) ? parsed.conflicts.length : 0,
        uniqueCandidates: newCandidates.length - (Array.isArray(parsed.duplicates) ? parsed.duplicates.length : 0),
      },
    };
  } catch (error: any) {
    console.error('Duplicate/conflict check error:', error);
    throw error;
  }
}

/**
 * Geminiトレンド相関分析
 * 
 * Geminiの強み: 大量の過去記事とトレンドを同時に分析
 */
export async function analyzeTrendCorrelation(options: {
  candidate: any;
  trends: Array<{
    keyword: string;
    trendScore: number;
    growthRate: number;
  }>;
  candidateHistory?: Array<{
    date: string;
    content: string;
    engagement: number;
  }>;
  marketCode: MarketCode;
}): Promise<{
  candidateId: string;
  name: string;
  trendMatchScores: Array<{
    trendKeyword: string;
    matchScore: number; // 0-10
    potential: number; // 0-10
    reasoning: string;
  }>;
  overallTrendPotential: number; // 0-10
  recommendations: string[];
}> {
  const { candidate, trends, candidateHistory, marketCode } = options;

  const prompt = `You are an expert trend analyst. Analyze trend correlation for an affiliate candidate.

**Candidate Profile**:
${JSON.stringify(candidate, null, 2)}

**Current Trends**:
${JSON.stringify(trends, null, 2)}

${candidateHistory ? `**Candidate History** (${candidateHistory.length} posts):
${JSON.stringify(candidateHistory.slice(0, 50), null, 2)} ${candidateHistory.length > 50 ? `\n... (${candidateHistory.length - 50} more)` : ''}` : ''}

**Market**: ${marketCode}

**Your Task**:
Using your deep reasoning and long context capabilities, analyze:

1. **Trend Match Scores**: How well does this candidate align with each trend?
2. **Trend Potential**: Can this candidate capitalize on these trends?
3. **Recommendations**: Specific actions to leverage trends

**Deep Reasoning Process**:
Step 1: Analyze candidate's content style and past performance
Step 2: Evaluate alignment with each trend
Step 3: Predict potential for trend capitalization
Step 4: Generate actionable recommendations

Return JSON format:
{
  "candidateId": "string",
  "name": "string",
  "trendMatchScores": [
    {
      "trendKeyword": "string",
      "matchScore": number (0-10),
      "potential": number (0-10),
      "reasoning": "string"
    }
  ],
  "overallTrendPotential": number (0-10),
  "recommendations": ["string"]
}`;

  try {
    const result = await callGemini3Pro(prompt, {
      thinkingLevel: 'high',
      temperature: 0.7,
      maxOutputTokens: 3000,
    });

    // JSON抽出（安全化）
    const jsonText = extractJsonFromText(result.text);
    if (!jsonText) {
      throw new Error('No JSON found in Gemini trend correlation response');
    }

    const parsed = safeJsonParse<any>(jsonText, {
      trendMatchScores: [],
      overallTrendPotential: 0,
      recommendations: [],
    }, 'Gemini trend correlation');
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON structure in Gemini trend correlation response');
    }

    return {
      candidateId: candidate.id || '',
      name: candidate.name || '',
      trendMatchScores: Array.isArray(parsed.trendMatchScores) ? parsed.trendMatchScores : [],
      overallTrendPotential: typeof parsed.overallTrendPotential === 'number' ? parsed.overallTrendPotential : 0,
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    };
  } catch (error: any) {
    console.error('Trend correlation analysis error:', error);
    throw error;
  }
}
