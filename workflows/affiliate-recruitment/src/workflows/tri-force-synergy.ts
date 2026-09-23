/**
 * Tri-Force Architecture: Grok × GPT × Gemini 相乗効果最大化版
 * 
 * Geminiレビューに基づく3者統合戦略:
 * - Grok: Hunter (リアルタイム検索)
 * - Gemini: Analyst (マルチモーダル分析、1次スクリーニング)
 * - GPT: Closer (深い推論、高品質DM)
 */

import type { MarketCode, IntegratedWorkflowResult } from '../types';
import {
  generateSearchQueries,
  batchSearchCandidates,
  analyzeCandidatesWithGrok,
} from '../utils/grok-enhanced';
import {
  enhanceGrokAnalysisWithGPT,
  generateHighQualityDMWithGPT,
  generateStrategicInsights,
} from '../utils/gpt-enhanced';
import {
  analyzeVisualCredibility,
  primaryScreeningWithGemini,
  checkDuplicatesAndConflicts,
  analyzeTrendCorrelation,
} from '../utils/gemini-enhanced';
import { createDetailedError } from '../utils/api-client';
import { validateMarketCode, createValidationError } from '../utils/validation';
import { requireEnvVars, withTimeout, getVercelTimeoutLimit, safeLog, checkMemoryUsage } from '../utils/vercel-safe';

/**
 * Tri-Force統合ワークフロー（Grok × GPT × Gemini）
 */
export async function executeTriForceSynergyWorkflow(options: {
  marketCode: MarketCode;
  whopProductId: string;
  niche: string;
  platforms?: string[];
  maxCandidates?: number;
  minMatchScore?: number;
  productInfo: {
    name: string;
    description: string;
    commissionRate: number;
  };
  historicalCandidates?: any[];
  existingPartners?: any[];
  trends?: Array<{
    keyword: string;
    trendScore: number;
    growthRate: number;
  }>;
}): Promise<IntegratedWorkflowResult & {
  triForceMetadata: {
    grok: {
      queriesGenerated: number;
      candidatesFound: number;
      analysisCompleted: boolean;
    };
    gemini: {
      primaryScreeningCompleted: boolean;
      visualAnalysisCompleted: boolean;
      duplicateCheckCompleted: boolean;
      trendAnalysisCompleted: boolean;
      candidatesPassed: number;
      candidatesFailed: number;
    };
    gpt: {
      enhancementCompleted: boolean;
      strategicInsightsGenerated: boolean;
      highQualityDMsGenerated: number;
    };
  };
}> {
  const {
    marketCode,
    whopProductId,
    niche,
    platforms = ['X', 'Telegram', 'YouTube', 'LinkedIn', 'Instagram'],
    maxCandidates = 100, // Gemini 1次スクリーニングで絞り込むため多めに
    minMatchScore = 6, // Gemini 1次スクリーニング用（低めに設定）
    productInfo,
    historicalCandidates = [],
    existingPartners = [],
    trends = [],
  } = options;

  // バリデーション
  if (!validateMarketCode(marketCode)) {
    throw createValidationError('marketCode', marketCode, 'EN | AR | KO | JA | ES | PT-BR');
  }

  const result: IntegratedWorkflowResult & {
    triForceMetadata: {
      grok: {
        queriesGenerated: number;
        candidatesFound: number;
        analysisCompleted: boolean;
      };
      gemini: {
        primaryScreeningCompleted: boolean;
        visualAnalysisCompleted: boolean;
        duplicateCheckCompleted: boolean;
        trendAnalysisCompleted: boolean;
        candidatesPassed: number;
        candidatesFailed: number;
      };
      gpt: {
        enhancementCompleted: boolean;
        strategicInsightsGenerated: boolean;
        highQualityDMsGenerated: number;
      };
    };
  } = {
    success: true,
    marketCode,
    workflow: 'tri-force-synergy',
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
    triForceMetadata: {
      grok: {
        queriesGenerated: 0,
        candidatesFound: 0,
        analysisCompleted: false,
      },
      gemini: {
        primaryScreeningCompleted: false,
        visualAnalysisCompleted: false,
        duplicateCheckCompleted: false,
        trendAnalysisCompleted: false,
        candidatesPassed: 0,
        candidatesFailed: 0,
      },
      gpt: {
        enhancementCompleted: false,
        strategicInsightsGenerated: false,
        highQualityDMsGenerated: 0,
      },
    },
  };

  try {
    // ========================================
    // Phase 1: Grok (Hunter) - リアルタイム検索
    // ========================================

    // Step 1: Grokクエリ自動生成
    result.steps.push({
      step: 'grok_query_generation',
      success: false,
      message: 'Grok: Generating optimized search queries...',
    });

    const generatedQueries = await generateSearchQueries({
      marketCode,
      niche,
      maxQueries: 5,
    });

    result.steps[result.steps.length - 1] = {
      step: 'grok_query_generation',
      success: true,
      message: `Grok: Generated ${generatedQueries.queries.length} optimized queries`,
      data: {
        queries: generatedQueries.queries,
        reasoning: generatedQueries.reasoning,
      },
    };
    result.triForceMetadata.grok.queriesGenerated = generatedQueries.queries.length;

    // Step 2: Grokエンハンスト候補検索
    result.steps.push({
      step: 'grok_enhanced_search',
      success: false,
      message: 'Grok: Searching candidates...',
    });

    const searchResult = await batchSearchCandidates({
      searchQueries: generatedQueries.queries,
      platforms,
      marketCode,
      maxCandidatesPerQuery: Math.ceil(maxCandidates / generatedQueries.queries.length),
      minMatchScore: 5, // Gemini 1次スクリーニングで絞り込むため低めに
    });

    result.steps[result.steps.length - 1] = {
      step: 'grok_enhanced_search',
      success: true,
      message: `Grok: Found ${searchResult.total} candidates`,
      data: {
        total: searchResult.total,
        queryResults: searchResult.queryResults,
      },
    };
    result.summary.candidatesFound = searchResult.total;
    result.triForceMetadata.grok.candidatesFound = searchResult.total;

    // Step 3: Grok初期分析
    if (searchResult.allCandidates.length > 0) {
      result.steps.push({
        step: 'grok_initial_analysis',
        success: false,
        message: 'Grok: Performing initial analysis...',
      });

      const grokAnalysis = await analyzeCandidatesWithGrok({
        candidates: searchResult.allCandidates,
        marketCode,
        analysisType: 'priority_ranking',
      });

      result.steps[result.steps.length - 1] = {
        step: 'grok_initial_analysis',
        success: true,
        message: `Grok: Analyzed ${grokAnalysis.summary.totalAnalyzed} candidates`,
        data: {
          summary: grokAnalysis.summary,
        },
      };
      result.triForceMetadata.grok.analysisCompleted = true;

      // ========================================
      // Phase 2: Gemini (Analyst) - マルチモーダル分析と1次スクリーニング
      // ========================================

      // Step 4: Gemini 1次スクリーニング（コスト効率の最大化）
      result.steps.push({
        step: 'gemini_primary_screening',
        success: false,
        message: 'Gemini: Performing primary screening (cost-efficient)...',
      });

      const screeningResult = await primaryScreeningWithGemini({
        candidates: searchResult.allCandidates,
        marketCode,
        niche,
        minRelevanceScore: minMatchScore,
      });

      result.steps[result.steps.length - 1] = {
        step: 'gemini_primary_screening',
        success: true,
        message: `Gemini: Screened ${screeningResult.statistics.total} candidates, ${screeningResult.statistics.passed} passed`,
        data: {
          passed: screeningResult.statistics.passed,
          failed: screeningResult.statistics.failed,
          passRate: screeningResult.statistics.passRate,
        },
      };
      result.triForceMetadata.gemini.primaryScreeningCompleted = true;
      result.triForceMetadata.gemini.candidatesPassed = screeningResult.statistics.passed;
      result.triForceMetadata.gemini.candidatesFailed = screeningResult.statistics.failed;

      // Step 5: Gemini重複・競合チェック（ロングコンテキスト活用）
      if (screeningResult.passed.length > 0) {
        result.steps.push({
          step: 'gemini_duplicate_conflict_check',
          success: false,
          message: 'Gemini: Checking duplicates and conflicts (long context)...',
        });

        const duplicateCheck = await checkDuplicatesAndConflicts({
          newCandidates: screeningResult.passed.map((p) =>
            searchResult.allCandidates.find((c) => c.id === p.candidateId) || {}
          ),
          historicalCandidates,
          existingPartners,
          marketCode,
        });

        result.steps[result.steps.length - 1] = {
          step: 'gemini_duplicate_conflict_check',
          success: true,
          message: `Gemini: Found ${duplicateCheck.statistics.duplicatesFound} duplicates, ${duplicateCheck.statistics.conflictsFound} conflicts`,
          data: {
            duplicates: duplicateCheck.duplicates.length,
            conflicts: duplicateCheck.conflicts.length,
            uniqueCandidates: duplicateCheck.statistics.uniqueCandidates,
          },
        };
        result.triForceMetadata.gemini.duplicateCheckCompleted = true;

        // 重複・競合を除外
        const duplicateIds = new Set(duplicateCheck.duplicates.map((d) => d.candidateId));
        const conflictIds = new Set(
          duplicateCheck.conflicts.filter((c) => c.severity === 'high').map((c) => c.candidateId)
        );
        const filteredCandidates = screeningResult.passed.filter(
          (p) => !duplicateIds.has(p.candidateId) && !conflictIds.has(p.candidateId)
        );

        // Step 6: Gemini視覚的信頼性分析（マルチモーダル）
        if (filteredCandidates.length > 0) {
          result.steps.push({
            step: 'gemini_visual_analysis',
            success: false,
            message: 'Gemini: Analyzing visual credibility (multimodal)...',
          });

          const topCandidatesForVisual = filteredCandidates.slice(0, 20); // 上位20人を視覚分析
          const visualResults = [];

          for (const passed of topCandidatesForVisual) {
            try {
              const candidate = searchResult.allCandidates.find((c) => c.id === passed.candidateId);
              if (candidate) {
                const visualScore = await analyzeVisualCredibility({
                  candidate,
                  screenshotUrl: candidate.profile_url, // プロフィールURLからスクリーンショット取得可能な場合
                  marketCode,
                });
                visualResults.push(visualScore);
              }
            } catch (error: any) {
              safeLog('error', `Visual analysis error for ${passed.candidateId}`, {
                candidateId: passed.candidateId,
                error: error.message,
              });
            }
          }

          result.steps[result.steps.length - 1] = {
            step: 'gemini_visual_analysis',
            success: true,
            message: `Gemini: Analyzed ${visualResults.length} candidates visually`,
            data: {
              analyzed: visualResults.length,
              averageCredibility: visualResults.length > 0
                ? visualResults.reduce((sum, v) => sum + v.credibilityScore, 0) / visualResults.length
                : 0,
            },
          };
          result.triForceMetadata.gemini.visualAnalysisCompleted = true;

          // Step 7: Geminiトレンド相関分析（オプション）
          if (trends.length > 0 && filteredCandidates.length > 0) {
            result.steps.push({
              step: 'gemini_trend_correlation',
              success: false,
              message: 'Gemini: Analyzing trend correlation...',
            });

            const topCandidatesForTrend = filteredCandidates.slice(0, 10);
            const trendResults = [];

            for (const passed of topCandidatesForTrend) {
              try {
                const candidate = searchResult.allCandidates.find((c) => c.id === passed.candidateId);
                if (candidate) {
                  const trendAnalysis = await analyzeTrendCorrelation({
                    candidate,
                    trends,
                    marketCode,
                  });
                  trendResults.push(trendAnalysis);
                }
              } catch (error: any) {
                console.error(`Trend analysis error for ${passed.candidateId}:`, error);
              }
            }

            result.steps[result.steps.length - 1] = {
              step: 'gemini_trend_correlation',
              success: true,
              message: `Gemini: Analyzed ${trendResults.length} candidates for trend correlation`,
              data: {
                analyzed: trendResults.length,
                averageTrendPotential: trendResults.length > 0
                  ? trendResults.reduce((sum, t) => sum + t.overallTrendPotential, 0) / trendResults.length
                  : 0,
              },
            };
            result.triForceMetadata.gemini.trendAnalysisCompleted = true;
          }

          // ========================================
          // Phase 3: GPT (Closer) - 深い推論と高品質DM
          // ========================================

          // Step 8: GPTでGrok分析結果を強化（絞り込まれた候補のみ）
          result.steps.push({
            step: 'gpt_enhanced_analysis',
            success: false,
            message: 'GPT: Enhancing analysis with deep reasoning...',
          });

          const finalCandidates = filteredCandidates.map((p) =>
            searchResult.allCandidates.find((c) => c.id === p.candidateId)
          ).filter((c) => c !== undefined);

          const gptEnhancedAnalysis = await enhanceGrokAnalysisWithGPT({
            grokAnalysis,
            candidates: finalCandidates,
            marketCode,
            productInfo,
          });

          result.steps[result.steps.length - 1] = {
            step: 'gpt_enhanced_analysis',
            success: true,
            message: 'GPT: Enhanced analysis completed',
            data: {
              strategicInsights: gptEnhancedAnalysis.strategicInsights,
              futurePredictions: gptEnhancedAnalysis.futurePredictions.slice(0, 5),
            },
          };
          result.triForceMetadata.gpt.enhancementCompleted = true;
          result.summary.candidatesAnalyzed = finalCandidates.length;
          result.summary.highPriorityCandidates = gptEnhancedAnalysis.summary.highPriority;

          // Step 9: GPT戦略的インサイト生成
          result.steps.push({
            step: 'gpt_strategic_insights',
            success: false,
            message: 'GPT: Generating strategic insights...',
          });

          const strategicInsights = await generateStrategicInsights({
            candidates: finalCandidates,
            marketCode,
            grokAnalysis,
          });

          result.steps[result.steps.length - 1] = {
            step: 'gpt_strategic_insights',
            success: true,
            message: 'GPT: Strategic insights generated',
            data: strategicInsights,
          };
          result.triForceMetadata.gpt.strategicInsightsGenerated = true;

          // Step 10: GPT高品質DM生成（高優先度候補のみ）
          result.steps.push({
            step: 'gpt_high_quality_dm',
            success: false,
            message: 'GPT: Generating high-quality DMs...',
          });

          const topPriorityCandidates = gptEnhancedAnalysis.priorityRanking
            .filter((r) => r.priorityScore >= 8)
            .slice(0, 10);

          const gptDMs = [];
          for (const ranking of topPriorityCandidates) {
            try {
              const candidate = finalCandidates.find((c) => c.id === ranking.candidateId);
              if (candidate) {
                const contentStyle = gptEnhancedAnalysis.contentStyles?.find(
                  (s) => s.candidateId === ranking.candidateId
                );
                const dm = await generateHighQualityDMWithGPT({
                  candidate,
                  marketCode,
                  productInfo,
                  analysisInsights: {
                    priorityScore: ranking.priorityScore,
                    contentStyle: contentStyle?.style || 'professional',
                    tone: contentStyle?.tone || 'friendly',
                    recommendations: contentStyle?.recommendations || [],
                  },
                });
                gptDMs.push({
                  candidateId: ranking.candidateId,
                  candidateName: candidate.name,
                  message: dm.message,
                  expectedResponseRate: dm.expectedResponseRate,
                });
              }
            } catch (error: any) {
              safeLog('error', `GPT DM generation error for ${ranking.candidateId}`, {
                candidateId: ranking.candidateId,
                error: error.message,
              });
            }
          }

          result.steps[result.steps.length - 1] = {
            step: 'gpt_high_quality_dm',
            success: true,
            message: `GPT: Generated ${gptDMs.length} high-quality DMs`,
            data: {
              dmsGenerated: gptDMs.length,
              averageExpectedResponseRate: gptDMs.length > 0
                ? gptDMs.reduce((sum, d) => sum + d.expectedResponseRate, 0) / gptDMs.length
                : 0,
            },
          };
          result.triForceMetadata.gpt.highQualityDMsGenerated = gptDMs.length;
        }
      }
    }

    result.endTime = new Date().toISOString();
    result.duration =
      new Date(result.endTime).getTime() - new Date(result.startTime).getTime();

    return result;
  } catch (error: any) {
    const detailedError = createDetailedError('Tri-Force Synergy Workflow', error, {
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
