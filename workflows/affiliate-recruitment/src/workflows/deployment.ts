/**
 * アフィリエイト展開ワークフロー
 * 
 * GPTレビューに基づく改善:
 * - TypeScript型定義の強化
 * - エラーハンドリングの改善
 * - タイムアウト設定の統一
 * - エラーメッセージの改善
 */

import type {
  MarketCode,
  DeploymentWorkflowResult,
  WorkflowStep,
  NextStep,
} from '../types';
import { httpRequest, createDetailedError } from '../utils/api-client';
import { validateMarketCode, createValidationError } from '../utils/validation';

/**
 * アフィリエイト展開ワークフローを実行
 */
export async function executeDeploymentWorkflow(options: {
  marketCode: MarketCode;
  whopProductId: string;
  searchQueries?: string[];
  maxCandidates?: number;
}): Promise<DeploymentWorkflowResult> {
  const { marketCode, whopProductId, searchQueries = [], maxCandidates = 20 } = options;

  // バリデーション
  if (!validateMarketCode(marketCode)) {
    throw createValidationError('marketCode', marketCode, 'EN | AR | KO | JA | ES | PT-BR');
  }

  if (!whopProductId || typeof whopProductId !== 'string') {
    throw createValidationError('whopProductId', whopProductId, 'string (required)');
  }

  const result: DeploymentWorkflowResult = {
    success: true,
    marketCode,
    startTime: new Date().toISOString(),
    steps: [],
    nextSteps: [],
  };

  // Step 1: LP情報保存準備（GitHub CSV/JSONベース）
  result.steps.push({
    step: 'lp_preparation',
    success: true,
    message: 'LP情報保存準備完了（GitHub CSV/JSONベース）',
    data: {
      marketCode,
      dataPath: 'data/phase-results/',
    },
  });

  // Step 2: Whop Product情報取得（改善: タイムアウト・エラーハンドリング）
  try {
    if (!process.env.WHOP_API_KEY) {
      throw new Error('WHOP_API_KEY environment variable is not set');
    }

    const whopProduct = await httpRequest<any>(
      `https://api.whop.com/api/v2/products/${whopProductId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10秒タイムアウト
        maxRetries: 2,
      }
    );

    result.steps.push({
      step: 'whop_product_retrieved',
      success: true,
      data: {
        productId: whopProductId,
        productName: whopProduct.data?.name || whopProduct.name,
        productDescription: whopProduct.data?.description || whopProduct.description,
      },
    });
  } catch (error: any) {
    const detailedError = createDetailedError(
      'Whop Product Retrieval',
      error,
      {
        productId: whopProductId,
        apiKeySet: !!process.env.WHOP_API_KEY,
      }
    );

    result.steps.push({
      step: 'whop_product_retrieved',
      success: false,
      error: detailedError.message,
      details: {
        productId: whopProductId,
        apiKeySet: !!process.env.WHOP_API_KEY,
      },
    });
  }

  // Step 3: アフィリエイター候補検索準備
  if (searchQueries.length > 0) {
    result.steps.push({
      step: 'affiliate_candidates_search_prepared',
      success: true,
      message: 'アフィリエイター候補検索準備完了',
      data: {
        searchQueries,
        maxCandidates,
        platforms: ['X', 'Telegram', 'YouTube', 'LinkedIn', 'Instagram'],
        minMatchScore: 7,
      },
    });

    // 次のステップとして候補検索を追加
    result.nextSteps = result.nextSteps || [];
    result.nextSteps.push({
      step: 'search_affiliate_candidates',
      description: 'アフィリエイター候補を検索',
      apiEndpoint: '/api/workflows/affiliate-search',
      method: 'POST',
      body: {
        marketCode,
        searchQueries,
        maxCandidates,
      },
    });
  }

  // Step 4: DM送信準備
  result.nextSteps = result.nextSteps || [];
  result.nextSteps.push({
    step: 'send_dm_to_affiliates',
    description: 'アフィリエイター候補にDM送信',
    apiEndpoint: '/api/workflows/affiliate-dm',
    method: 'POST',
    body: {
      marketCode,
      limit: maxCandidates,
    },
  });

  result.endTime = new Date().toISOString();
  result.duration =
    new Date(result.endTime).getTime() - new Date(result.startTime).getTime();

  return result;
}
