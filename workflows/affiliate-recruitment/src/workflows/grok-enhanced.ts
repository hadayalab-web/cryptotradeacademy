/**
 * Grokポテンシャル最大化版 - エンハンストワークフロー
 * 
 * Grokレビューに基づく改善を実装した統合ワークフロー
 */

import type { MarketCode, IntegratedWorkflowResult } from '../types';
import {
  generateSearchQueries,
  searchCandidatesEnhanced,
  analyzeCandidatesWithGrok,
  generatePersonalizedDM,
  batchSearchCandidates,
} from '../utils/grok-enhanced';
import { createDetailedError } from '../utils/api-client';
import { validateMarketCode, createValidationError } from '../utils/validation';

/**
 * Grokエンハンスト統合ワークフロー
 */
export async function executeGrokEnhancedWorkflow(options: {
  marketCode: MarketCode;
  whopProductId: string;
  niche: string;
  platforms?: string[];
  maxCandidates?: number;
  minMatchScore?: number;
  generateDMs?: boolean;
  productInfo?: {
    name: string;
    description: string;
    commissionRate: number;
  };
}): Promise<IntegratedWorkflowResult & {
  grokMetadata: {
    queriesGenerated: number;
    queriesUsed: string[];
    analysisType: string;
    personalizedDMsGenerated: number;
  };
}> {
  const {
    marketCode,
    whopProductId,
    niche,
    platforms = ['X', 'Telegram', 'YouTube', 'LinkedIn', 'Instagram'],
    maxCandidates = 50,
    minMatchScore = 7,
    generateDMs = true,
    productInfo,
  } = options;

  // バリデーション
  if (!validateMarketCode(marketCode)) {
    throw createValidationError('marketCode', marketCode, 'EN | AR | KO | JA | ES | PT-BR');
  }

  const result: IntegratedWorkflowResult & {
    grokMetadata: {
      queriesGenerated: number;
      queriesUsed: string[];
      analysisType: string;
      personalizedDMsGenerated: number;
    };
  } = {
    success: true,
    marketCode,
    workflow: 'grok-enhanced',
    startTime: new Date().toISOString(),
    steps: [],
    summary: {
      candidatesFound: 0,
      candidatesAnalyzed: 0,
      highPriorityCandidates: 0,
      telegramDMSent: 0,
      emailsSent: 0,
      errors: [],
    },
    grokMetadata: {
      queriesGenerated: 0,
      queriesUsed: [],
      analysisType: 'priority_ranking',
      personalizedDMsGenerated: 0,
    },
  };

  try {
    // Step 1: Grokクエリ自動生成
    result.steps.push({
      step: 'grok_query_generation',
      success: false,
      message: 'Generating optimized search queries...',
    });

    const generatedQueries = await generateSearchQueries({
      marketCode,
      niche,
      maxQueries: 5,
    });

    result.steps[result.steps.length - 1] = {
      step: 'grok_query_generation',
      success: true,
      message: `Generated ${generatedQueries.queries.length} optimized queries`,
      data: {
        queries: generatedQueries.queries,
        reasoning: generatedQueries.reasoning,
      },
    };
    result.grokMetadata.queriesGenerated = generatedQueries.queries.length;
    result.grokMetadata.queriesUsed = generatedQueries.queries;

    // Step 2: Grokエンハンスト候補検索（バッチ処理）
    result.steps.push({
      step: 'grok_enhanced_search',
      success: false,
      message: 'Searching candidates with enhanced Grok...',
    });

    const searchResult = await batchSearchCandidates({
      searchQueries: generatedQueries.queries,
      platforms,
      marketCode,
      maxCandidatesPerQuery: Math.ceil(maxCandidates / generatedQueries.queries.length),
      minMatchScore,
    });

    result.steps[result.steps.length - 1] = {
      step: 'grok_enhanced_search',
      success: true,
      message: `Found ${searchResult.total} unique candidates`,
      data: {
        total: searchResult.total,
        queryResults: searchResult.queryResults,
      },
    };
    result.summary.candidatesFound = searchResult.total;

    // Step 3: Grok深掘り分析（GPT分析の代替）
    if (searchResult.allCandidates.length > 0) {
      result.steps.push({
        step: 'grok_deep_analysis',
        success: false,
        message: 'Analyzing candidates with Grok...',
      });

      const analysisResult = await analyzeCandidatesWithGrok({
        candidates: searchResult.allCandidates,
        marketCode,
        analysisType: 'both', // priority_ranking + content_style
      });

      result.steps[result.steps.length - 1] = {
        step: 'grok_deep_analysis',
        success: true,
        message: `Analyzed ${analysisResult.summary.totalAnalyzed} candidates`,
        data: analysisResult,
      };
      result.summary.candidatesAnalyzed = analysisResult.summary.totalAnalyzed;
      result.summary.highPriorityCandidates = analysisResult.summary.highPriority;
      result.grokMetadata.analysisType = 'both';
    }

    // Step 4: GrokパーソナライズDM生成（オプション）
    if (generateDMs && searchResult.allCandidates.length > 0) {
      result.steps.push({
        step: 'grok_personalized_dm_generation',
        success: false,
        message: 'Generating personalized DMs with Grok...',
      });

      const topCandidates = searchResult.allCandidates.slice(0, 10); // 上位10人
      const dmResults = [];

      for (const candidate of topCandidates) {
        try {
          const dm = await generatePersonalizedDM({
            candidate,
            marketCode,
            productInfo,
          });
          dmResults.push({
            candidateId: candidate.id,
            candidateName: candidate.name,
            message: dm.message,
            reasoning: dm.reasoning,
            tone: dm.tone,
            cta: dm.cta,
          });
        } catch (error: any) {
          console.error(`DM generation error for ${candidate.id}:`, error);
        }
      }

      result.steps[result.steps.length - 1] = {
        step: 'grok_personalized_dm_generation',
        success: true,
        message: `Generated ${dmResults.length} personalized DMs`,
        data: {
          dmsGenerated: dmResults.length,
          samples: dmResults.slice(0, 3), // サンプル3件
        },
      };
      result.grokMetadata.personalizedDMsGenerated = dmResults.length;
    }

    result.endTime = new Date().toISOString();
    result.duration =
      new Date(result.endTime).getTime() - new Date(result.startTime).getTime();

    return result;
  } catch (error: any) {
    const detailedError = createDetailedError('Grok Enhanced Workflow', error, {
      marketCode,
      niche,
    });
    result.steps.push({
      step: 'error',
      success: false,
      error: detailedError.message,
    });
    result.summary.errors.push(detailedError.message);
    result.success = false;
    return result;
  }
}
