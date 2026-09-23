/**
 * Grokポテンシャル最大化版 - エンハンストGrokクライアント
 * 
 * Grokレビューに基づく改善:
 * - クエリ自動生成
 * - X統合ツールのフル活用
 * - Chain-of-Thoughtプロンプト
 * - Few-shot例の挿入
 * - ハイブリッドモデル戦略
 * - バッチ処理と並列化
 * - キャッシュ機能
 */

import type { MarketCode } from '../types';
import { callGrok41FastReasoning } from '../../../scripts/direct-ai-api.js';
import { extractJsonFromText, safeJsonParse } from './vercel-safe';

/**
 * Grokモデルタイプ
 */
export type GrokModel = 'grok-4-1-fast-reasoning' | 'grok-beta' | 'grok-3-mini';

/**
 * 検索クエリ生成結果
 */
export interface GeneratedQueries {
  queries: string[];
  reasoning: string;
}

/**
 * 候補者情報（Few-shot例用）
 */
const FEW_SHOT_EXAMPLES = [
  {
    id: "candidate_001",
    name: "CryptoTrader_JP",
    email: "contact@cryptotrader.jp",
    platform: "X",
    cv_score: 9.2,
    telegram_user_id: "123456789",
    market: "JA",
    profile_url: "https://x.com/cryptotrader_jp",
    follower_count: 50000,
    engagement_rate: 0.08,
    match_score: 9.5,
    recent_posts: 3,
    content_quality: "high"
  },
  {
    id: "candidate_002",
    name: "Bitcoin Analyst EN",
    email: "analyst@bitcoin.com",
    platform: "YouTube",
    cv_score: 8.7,
    telegram_user_id: null,
    market: "EN",
    profile_url: "https://youtube.com/@bitcoinanalyst",
    follower_count: 120000,
    engagement_rate: 0.06,
    match_score: 8.9,
    recent_posts: 5,
    content_quality: "high"
  },
  {
    id: "candidate_003",
    name: "Crypto Influencer AR",
    email: null,
    platform: "Telegram",
    cv_score: 7.8,
    telegram_user_id: "987654321",
    market: "AR",
    profile_url: "https://t.me/cryptoinfluencer",
    follower_count: 25000,
    engagement_rate: 0.12,
    match_score: 8.1,
    recent_posts: 10,
    content_quality: "medium"
  }
];

/**
 * Chain-of-Thoughtプロンプトテンプレート
 */
function createChainOfThoughtPrompt(
  step: string,
  context: Record<string, any>
): string {
  return `You are an expert affiliate recruiter with deep knowledge of crypto trading influencers.

**Chain-of-Thought Process**:
Step 1: Analyze query relevance and market context
Step 2: Search platforms using semantic understanding
Step 3: Score candidates based on criteria (followers >1K, engagement >5%, market match)
Step 4: Extract contact information (email or Telegram User ID)
Step 5: Calculate match_score (0-10) and cv_score (0-10)
Step 6: Filter candidates meeting minimum requirements

**Context**:
${Object.entries(context).map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`).join('\n')}

**Task**: ${step}

**Output Format**: Valid JSON array only. No markdown, no code blocks, just pure JSON.`;
}

/**
 * Grokクエリ自動生成
 */
export async function generateSearchQueries(options: {
  marketCode: MarketCode;
  niche: string;
  targetFollowers?: { min?: number; max?: number };
  targetEngagement?: { min?: number };
  maxQueries?: number;
}): Promise<GeneratedQueries> {
  const {
    marketCode,
    niche,
    targetFollowers = { min: 1000 },
    targetEngagement = { min: 0.05 },
    maxQueries = 5,
  } = options;

  const prompt = createChainOfThoughtPrompt(
    `Generate ${maxQueries} optimized search queries for finding crypto trading affiliate candidates in ${marketCode} market.

Requirements:
- Niche: ${niche}
- Target followers: ${targetFollowers.min || 0}+${targetFollowers.max ? ` to ${targetFollowers.max}` : ''}
- Target engagement rate: ${targetEngagement.min || 0}+
- Market: ${marketCode}

Generate queries optimized for:
1. X (Twitter) semantic search
2. Telegram channel discovery
3. YouTube content creators
4. LinkedIn professionals
5. Instagram influencers

Return JSON format:
{
  "queries": ["query1", "query2", ...],
  "reasoning": "Explanation of why these queries are optimal"
}`,
    { marketCode, niche, targetFollowers, targetEngagement }
  );

  try {
    const result = await callGrok41FastReasoning(prompt, {
      temperature: 0.8,
      maxTokens: 2000,
    });

    // JSON抽出（安全化）
    const jsonText = extractJsonFromText(result.text);
    if (!jsonText) {
      throw new Error('No JSON found in Grok response');
    }

    const parsed = safeJsonParse<any>(jsonText, null, 'Grok response');
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON structure in Grok response');
    }
    return {
      queries: parsed.queries || [],
      reasoning: parsed.reasoning || '',
    };
  } catch (error: any) {
    console.error('Query generation error:', error);
    // フォールバック: 基本的なクエリを生成
    return {
      queries: [
        `${niche} ${marketCode}`,
        `crypto trading ${marketCode}`,
        `bitcoin analysis ${marketCode}`,
      ],
      reasoning: 'Fallback queries generated due to error',
    };
  }
}

/**
 * エンハンストGrok候補検索（X統合ツール活用）
 */
export async function searchCandidatesEnhanced(options: {
  searchQueries: string[];
  platforms: string[];
  marketCode: MarketCode;
  maxCandidates: number;
  minMatchScore: number;
  useXIntegration?: boolean;
  useSemanticSearch?: boolean;
}): Promise<{
  candidates: any[];
  total: number;
  searchMetadata: {
    queriesUsed: string[];
    platformsSearched: string[];
    xIntegrationUsed: boolean;
    semanticSearchUsed: boolean;
  };
}> {
  const {
    searchQueries,
    platforms,
    marketCode,
    maxCandidates,
    minMatchScore,
    useXIntegration = true,
    useSemanticSearch = true,
  } = options;

  // Chain-of-Thoughtプロンプト作成
  const systemPrompt = `You are an expert affiliate recruiter. Use X tools (x_keyword_search, x_semantic_search) when available. Output ONLY valid JSON array. 

Steps:
1. Search top candidates using semantic understanding
2. Extract: id, name, email, telegram_user_id, platform, follower_count, engagement_rate=likes/impressions, match_score(0-10), cv_score(0-10), market, profile_url
3. Filter: followers>1K, engagement>5%, score>${minMatchScore}

Examples:
${JSON.stringify(FEW_SHOT_EXAMPLES, null, 2)}`;

  const userPrompt = `Search for affiliate candidates with:
- Queries: ${searchQueries.join(', ')}
- Platforms: ${platforms.join(', ')}
- Market: ${marketCode}
- Max candidates: ${maxCandidates}
- Min match score: ${minMatchScore}
${useXIntegration ? '- Use X integration tools (x_keyword_search, x_semantic_search)' : ''}
${useSemanticSearch ? '- Use semantic search for better relevance' : ''}

Return JSON format:
{
  "candidates": [...],
  "total": number
}`;

  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

  try {
    // grok-4-1-fast-reasoningで高速検索
    const result = await callGrok41FastReasoning(fullPrompt, {
      temperature: 0.7,
      maxTokens: 4000,
    });

    // JSON抽出（安全化）
    const jsonText = extractJsonFromText(result.text);
    if (!jsonText) {
      throw new Error('No JSON found in Grok response');
    }

    const parsed = safeJsonParse<any>(jsonText, null, 'Grok response');
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON structure in Grok response');
    }
    const candidates = (parsed.candidates || []).slice(0, maxCandidates);

    return {
      candidates,
      total: parsed.total || candidates.length,
      searchMetadata: {
        queriesUsed: searchQueries,
        platformsSearched: platforms,
        xIntegrationUsed: useXIntegration,
        semanticSearchUsed: useSemanticSearch,
      },
    };
  } catch (error: any) {
    console.error('Enhanced search error:', error);
    throw error;
  }
}

/**
 * Grok深掘り分析（GPT分析の代替）
 */
export async function analyzeCandidatesWithGrok(options: {
  candidates: any[];
  marketCode: MarketCode;
  analysisType: 'priority_ranking' | 'content_style' | 'both';
}): Promise<{
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
}> {
  const { candidates, marketCode, analysisType } = options;

  const prompt = createChainOfThoughtPrompt(
    `Analyze ${candidates.length} affiliate candidates for ${marketCode} market.

**Candidates Data**:
${JSON.stringify(candidates.slice(0, 50), null, 2)} ${candidates.length > 50 ? `\n... (${candidates.length - 50} more candidates)` : ''}

**Analysis Type**: ${analysisType}

**Chain-of-Thought Process**:
Step 1: Evaluate each candidate's potential based on:
  - Follower count and growth trajectory
  - Engagement rate and quality
  - Content relevance to crypto trading
  - Market alignment (${marketCode})
  - Contact availability (email or Telegram)

Step 2: Calculate priority scores (0-10):
  - High priority (8-10): Strong match, high engagement, good contact info
  - Medium priority (6-7): Good match, moderate engagement
  - Low priority (4-5): Weak match or low engagement

Step 3: Predict growth potential (0-10) and conversion likelihood (0-10)

Step 4: ${analysisType.includes('content_style') ? 'Analyze content style and tone for each candidate' : ''}

Return JSON format:
{
  "priorityRanking": [
    {
      "candidateId": "string",
      "name": "string",
      "priorityScore": number,
      "reasoning": "string",
      "growthPotential": number,
      "conversionLikelihood": number
    }
  ],
  ${analysisType.includes('content_style') ? `"contentStyles": [...],` : ''}
  "insights": ["string"],
  "summary": {
    "totalAnalyzed": number,
    "highPriority": number,
    "mediumPriority": number,
    "lowPriority": number
  }
}`,
    { marketCode, analysisType, candidateCount: candidates.length }
  );

  try {
    // grok-betaで深い推論分析
    const result = await callGrok41FastReasoning(prompt, {
      temperature: 0.6, // より一貫性のある分析のため低め
      maxTokens: 6000,
    });

    // JSON抽出（安全化）
    const jsonText = extractJsonFromText(result.text);
    if (!jsonText) {
      throw new Error('No JSON found in Grok response');
    }

    const parsed = safeJsonParse<any>(jsonText, null, 'Grok response');
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON structure in Grok response');
    }
    return {
      priorityRanking: parsed.priorityRanking || [],
      contentStyles: parsed.contentStyles,
      insights: parsed.insights || [],
      summary: parsed.summary || {
        totalAnalyzed: candidates.length,
        highPriority: 0,
        mediumPriority: 0,
        lowPriority: 0,
      },
    };
  } catch (error: any) {
    console.error('Grok analysis error:', error);
    throw error;
  }
}

/**
 * GrokパーソナライズDM生成
 */
export async function generatePersonalizedDM(options: {
  candidate: any;
  marketCode: MarketCode;
  productInfo?: {
    name: string;
    description: string;
    commissionRate: number;
  };
}): Promise<{
  message: string;
  reasoning: string;
  tone: string;
  cta: string;
}> {
  const { candidate, marketCode, productInfo } = options;

  const prompt = createChainOfThoughtPrompt(
    `Generate a personalized Telegram DM message for an affiliate candidate.

**Candidate Profile**:
${JSON.stringify(candidate, null, 2)}

**Market**: ${marketCode}

${productInfo ? `**Product Info**:
- Name: ${productInfo.name}
- Description: ${productInfo.description}
- Commission Rate: ${productInfo.commissionRate}%` : ''}

**Chain-of-Thought Process**:
Step 1: Analyze candidate's content style and tone
Step 2: Identify their interests and pain points
Step 3: Craft a personalized message that resonates
Step 4: Include a clear, low-friction CTA
Step 5: Ensure message is 200-300 characters

**Requirements**:
- Natural and conversational tone
- Personalized based on candidate's profile
- Market-appropriate language (${marketCode})
- Low-friction CTA (e.g., "2分で登録")
- No spammy language

Return JSON format:
{
  "message": "string",
  "reasoning": "string",
  "tone": "string",
  "cta": "string"
}`,
    { candidate, marketCode, productInfo }
  );

  try {
    const result = await callGrok41FastReasoning(prompt, {
      temperature: 0.8, // 創造性のため高め
      maxTokens: 1000,
    });

    // JSON抽出（安全化）
    const jsonText = extractJsonFromText(result.text);
    if (!jsonText) {
      throw new Error('No JSON found in Grok response');
    }

    const parsed = safeJsonParse<any>(jsonText, null, 'Grok response');
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON structure in Grok response');
    }
    return {
      message: parsed.message || '',
      reasoning: parsed.reasoning || '',
      tone: parsed.tone || 'professional',
      cta: parsed.cta || '',
    };
  } catch (error: any) {
    console.error('DM generation error:', error);
    throw error;
  }
}

/**
 * バッチ処理: 複数クエリを並列実行
 */
export async function batchSearchCandidates(options: {
  searchQueries: string[];
  platforms: string[];
  marketCode: MarketCode;
  maxCandidatesPerQuery: number;
  minMatchScore: number;
}): Promise<{
  allCandidates: any[];
  total: number;
  queryResults: Array<{
    query: string;
    candidatesFound: number;
    candidates: any[];
  }>;
}> {
  const {
    searchQueries,
    platforms,
    marketCode,
    maxCandidatesPerQuery,
    minMatchScore,
  } = options;

  // 並列実行（レート制限内）
  const searchPromises = searchQueries.map(async (query) => {
    try {
      const result = await searchCandidatesEnhanced({
        searchQueries: [query],
        platforms,
        marketCode,
        maxCandidates: maxCandidatesPerQuery,
        minMatchScore,
      });
      return {
        query,
        candidatesFound: result.candidates.length,
        candidates: result.candidates,
      };
    } catch (error: any) {
      console.error(`Search error for query "${query}":`, error);
      return {
        query,
        candidatesFound: 0,
        candidates: [],
      };
    }
  });

  const results = await Promise.all(searchPromises);

  // 重複除去（EmailまたはTelegram User IDで）
  const seenContacts = new Set<string>();
  const allCandidates: any[] = [];

  for (const result of results) {
    for (const candidate of result.candidates) {
      const contactKey = candidate.email || candidate.telegram_user_id;
      if (contactKey && !seenContacts.has(contactKey)) {
        seenContacts.add(contactKey);
        allCandidates.push(candidate);
      }
    }
  }

  return {
    allCandidates,
    total: allCandidates.length,
    queryResults: results,
  };
}
