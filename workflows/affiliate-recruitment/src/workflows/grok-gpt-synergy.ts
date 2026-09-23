/**
 * Grok×GPT相乗効果最大化版 - 統合ワークフロー
 * 
 * GPTレビューに基づく改善:
 * - GrokとGPTの最適な役割分担
 * - 重複処理の排除
 * - 相乗効果の最大化
 * - コスト最適化
 */

import type { MarketCode, IntegratedWorkflowResult } from '../types';
import {
  generateSearchQueries,
  searchCandidatesEnhanced,
  analyzeCandidatesWithGrok,
  generatePersonalizedDM as generateDMWithGrok,
  batchSearchCandidates,
} from '../utils/grok-enhanced';
import {
  enhanceGrokAnalysisWithGPT,
  generateHighQualityDMWithGPT,
  generateStrategicInsights,
} from '../utils/gpt-enhanced';
import { createDetailedError } from '../utils/api-client';
import { validateMarketCode, createValidationError } from '../utils/validation';

/**
 * Grok×GPT相乗効果最大化統合ワークフロー
 * 
 * 最適な役割分担:
 * - Grok: リアルタイム情報取得、高速検索、初期分析
 * - GPT: 深い推論、戦略的インサイト、高品質文章生成
 */
export async function executeGrokGPTSynergyWorkflow(options: {
  marketCode: MarketCode;
  whopProductId: string;
  niche: string;
  platforms?: string[];
  maxCandidates?: number;
  minMatchScore?: number;
  useGPTEnhancement?: boolean;
  useGPTDM?: boolean;
  productInfo: {
    name: string;
    description: string;
    commissionRate: number;
  };
}): Promise<IntegratedWorkflowResult & {
  synergyMetadata: {
    grokQueriesGenerated: number;
    grokCandidatesFound: number;
    grokAnalysisCompleted: boolean;
    gptEnhancementCompleted: boolean;
    strategicInsightsGenerated: boolean;
    dmsGenerated: {
      grok: number;
      gpt: number;
    };
  };
}> {
  const {
    marketCode,
    whopProductId,
    niche,
    platforms = ['X', 'Telegram', 'YouTube', 'LinkedIn', 'Instagram'],
    maxCandidates = 50,
    minMatchScore = 7,
    useGPTEnhancement = true,
    useGPTDM = true,
    productInfo,
  } = options;

  // バリデーション
  if (!validateMarketCode(marketCode)) {
    throw createValidationError('marketCode', marketCode, 'EN | AR | KO | JA | ES | PT-BR');
  }

  const result: IntegratedWorkflowResult & {
    synergyMetadata: {
      grokQueriesGenerated: number;
      grokCandidatesFound: number;
      grokAnalysisCompleted: boolean;
      gptEnhancementCompleted: boolean;
      strategicInsightsGenerated: boolean;
      dmsGenerated: {
        grok: number;
        gpt: number;
      };
    };
  } = {
    success: true,
    marketCode,
    workflow: 'grok-gpt-synergy',
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
    synergyMetadata: {
      grokQueriesGenerated: 0,
      grokCandidatesFound: 0,
      grokAnalysisCompleted: false,
      gptEnhancementCompleted: false,
      strategicInsightsGenerated: false,
      dmsGenerated: {
        grok: 0,
        gpt: 0,
      },
    },
  };

  try {
    // ========================================
    // Phase 1: Grok - データ収集と初期分析
    // ========================================

    // Step 1: Grokクエリ自動生成
    result.steps.push({
      step: 'grok_query_generation',
      success: false,
      message: 'Generating optimized search queries with Grok...',
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
    result.synergyMetadata.grokQueriesGenerated = generatedQueries.queries.length;

    // Step 2: Grokエンハンスト候補検索（バッチ処理）
    result.steps.push({
      step: 'grok_enhanced_search',
      success: false,
      message: 'Searching candidates with Grok...',
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
    result.synergyMetadata.grokCandidatesFound = searchResult.total;

    // Step 3: Grok深掘り分析（初期分析）
    if (searchResult.allCandidates.length > 0) {
      result.steps.push({
        step: 'grok_initial_analysis',
        success: false,
        message: 'Performing initial analysis with Grok...',
      });

      const grokAnalysis = await analyzeCandidatesWithGrok({
        candidates: searchResult.allCandidates,
        marketCode,
        analysisType: 'both',
      });

      result.steps[result.steps.length - 1] = {
        step: 'grok_initial_analysis',
        success: true,
        message: `Analyzed ${grokAnalysis.summary.totalAnalyzed} candidates`,
        data: {
          summary: grokAnalysis.summary,
          topCandidates: grokAnalysis.priorityRanking.slice(0, 10),
        },
      };
      result.summary.candidatesAnalyzed = grokAnalysis.summary.totalAnalyzed;
      result.summary.highPriorityCandidates = grokAnalysis.summary.highPriority;
      result.synergyMetadata.grokAnalysisCompleted = true;

      // ========================================
      // Phase 2: GPT - 深い推論と戦略的インサイト
      // ========================================

      // Step 4: GPTでGrok分析結果を強化（重複排除: Grok分析を基にGPTが強化）
      if (useGPTEnhancement) {
        result.steps.push({
          step: 'gpt_enhanced_analysis',
          success: false,
          message: 'Enhancing analysis with GPT deep reasoning...',
        });

        try {
          const gptEnhancedAnalysis = await enhanceGrokAnalysisWithGPT({
            grokAnalysis,
            candidates: searchResult.allCandidates,
            marketCode,
            productInfo,
          });

          result.steps[result.steps.length - 1] = {
            step: 'gpt_enhanced_analysis',
            success: true,
            message: 'GPT enhancement completed',
            data: {
              strategicInsights: gptEnhancedAnalysis.strategicInsights,
              futurePredictions: gptEnhancedAnalysis.futurePredictions.slice(0, 5),
              marketSegments: gptEnhancedAnalysis.marketSegmentAnalysis,
            },
          };
          result.synergyMetadata.gptEnhancementCompleted = true;

          // Step 5: GPT戦略的インサイト生成
          result.steps.push({
            step: 'gpt_strategic_insights',
            success: false,
            message: 'Generating strategic insights with GPT...',
          });

          const strategicInsights = await generateStrategicInsights({
            candidates: searchResult.allCandidates,
            marketCode,
            grokAnalysis,
          });

          result.steps[result.steps.length - 1] = {
            step: 'gpt_strategic_insights',
            success: true,
            message: 'Strategic insights generated',
            data: strategicInsights,
          };
          result.synergyMetadata.strategicInsightsGenerated = true;
        } catch (error: any) {
          const detailedError = createDetailedError('GPT Enhancement', error, {
            marketCode,
          });
          result.steps[result.steps.length - 1] = {
            step: 'gpt_enhanced_analysis',
            success: false,
            error: detailedError.message,
          };
          result.summary.errors.push(`GPT Enhancement: ${detailedError.message}`);
        }
      }

      // ========================================
      // Phase 3: DM生成 - GrokとGPTのハイブリッド
      // ========================================

      // Step 6: DM生成（GrokとGPTのハイブリッド）
      result.steps.push({
        step: 'hybrid_dm_generation',
        success: false,
        message: 'Generating DMs with Grok and GPT...',
      });

      const topCandidates = searchResult.allCandidates.slice(0, 10);
      const dmResults = {
        grok: [] as any[],
        gpt: [] as any[],
      };

      for (const candidate of topCandidates) {
        try {
          // GrokでDM生成（高速・低コスト）
          const grokDM = await generateDMWithGrok({
            candidate,
            marketCode,
            productInfo,
          });
          dmResults.grok.push({
            candidateId: candidate.id,
            candidateName: candidate.name,
            message: grokDM.message,
            reasoning: grokDM.reasoning,
          });

          // GPTで高品質DM生成（高優先度候補のみ）
          if (useGPTDM) {
            const candidateAnalysis = grokAnalysis.priorityRanking.find(
              (r) => r.candidateId === candidate.id
            );
            const contentStyle = grokAnalysis.contentStyles?.find(
              (s) => s.candidateId === candidate.id
            );

            if (candidateAnalysis && candidateAnalysis.priorityScore >= 8) {
              const gptDM = await generateHighQualityDMWithGPT({
                candidate,
                marketCode,
                grokDM: grokDM.message, // Grok DMを参考に
                productInfo,
                analysisInsights: candidateAnalysis && contentStyle ? {
                  priorityScore: candidateAnalysis.priorityScore,
                  contentStyle: contentStyle.style,
                  tone: contentStyle.tone,
                  recommendations: contentStyle.recommendations,
                } : undefined,
              });
              dmResults.gpt.push({
                candidateId: candidate.id,
                candidateName: candidate.name,
                message: gptDM.message,
                reasoning: gptDM.reasoning,
                personalizationLevel: gptDM.personalizationLevel,
                expectedResponseRate: gptDM.expectedResponseRate,
              });
            }
          }
        } catch (error: any) {
          console.error(`DM generation error for ${candidate.id}:`, error);
        }
      }

      result.steps[result.steps.length - 1] = {
        step: 'hybrid_dm_generation',
        success: true,
        message: `Generated ${dmResults.grok.length} Grok DMs and ${dmResults.gpt.length} GPT DMs`,
        data: {
          grokDMs: dmResults.grok.length,
          gptDMs: dmResults.gpt.length,
          samples: {
            grok: dmResults.grok.slice(0, 2),
            gpt: dmResults.gpt.slice(0, 2),
          },
        },
      };
      result.synergyMetadata.dmsGenerated = {
        grok: dmResults.grok.length,
        gpt: dmResults.gpt.length,
      };
    }

    result.endTime = new Date().toISOString();
    result.duration =
      new Date(result.endTime).getTime() - new Date(result.startTime).getTime();

    return result;
  } catch (error: any) {
    const detailedError = createDetailedError('Grok-GPT Synergy Workflow', error, {
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
