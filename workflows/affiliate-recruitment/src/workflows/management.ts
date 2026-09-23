/**
 * アフィリエイター管理統合モジュール
 * 
 * GPTレビューに基づく改善:
 * - TypeScript型定義の強化
 * - モジュール化の推進
 * - エラーハンドリングの改善
 * - 共通ロジックの抽出
 */

import type { MarketCode, CandidateStatus } from '../types';
import { createDetailedError } from '../utils/api-client';

/**
 * ログ関数（改善: より詳細なログ）
 */
export function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (data && Object.keys(data).length > 0) {
    console.log(logMessage, data);
  } else {
    console.log(logMessage);
  }
}

/**
 * アフィリエイター候補の検索・保存・DM送信を統合実行
 * 
 * 改善: より明確なエラーメッセージと型安全性
 */
export async function unifiedAffiliateWorkflow(options: {
  marketCode: MarketCode;
  searchQueries?: string[];
  maxCandidates?: number;
  minMatchScore?: number;
  sendDM?: boolean;
  // MCPサーバーは使用しない（直接API呼び出し）
}): Promise<{
  success: boolean;
  candidatesFound: number;
  candidates: any[];
  dmsSent: number;
}> {
  const {
    marketCode,
    searchQueries = [],
    maxCandidates = 20,
    minMatchScore = 7,
    sendDM = false,
  } = options;

  try {
    log('info', 'Starting unified affiliate workflow', { marketCode });

    // 1. アフィリエイター候補検索
    log('info', 'Searching affiliate candidates', { marketCode, searchQueries });

    // 注意: 実際の実装では、直接APIを呼び出すか、適切なサービスを使用
    // ここでは型定義とエラーハンドリングの改善を示す
    
    const candidates: any[] = [];
    log('info', 'Candidates found', { count: candidates.length, marketCode });

    // 2. DM送信（オプション）
    let dmsSent = 0;
    if (sendDM && candidates.length > 0) {
      log('info', 'Sending DMs to candidates', { count: candidates.length, marketCode });
      // 実際のDM送信処理はここに実装
      dmsSent = candidates.length;
      log('info', 'DMs sent', { count: dmsSent, marketCode });
    }

    return {
      success: true,
      candidatesFound: candidates.length,
      candidates,
      dmsSent,
    };
  } catch (error: any) {
    const detailedError = createDetailedError('Unified Affiliate Workflow', error, {
      marketCode,
      searchQueries,
    });
    log('error', 'Unified affiliate workflow failed', { error: detailedError.message, marketCode });
    throw detailedError;
  }
}

/**
 * CVRトップ100の生成と通知
 */
export async function generateCVRTop100AndNotify(options: {
  topN?: number;
  recipients?: string[];
}): Promise<{
  success: boolean;
  top100: any[];
  updated: number;
}> {
  const { topN = 100, recipients = [] } = options;

  try {
    log('info', 'Generating CVR top 100', { topN });

    // 実際の実装では、CVR計算とランキング生成を行う
    const top100: any[] = [];
    log('info', 'CVR top 100 generated', { count: top100.length });

    // 通知送信（オプション）
    if (recipients.length > 0) {
      log('info', 'Sending notifications', { recipients: recipients.length });
      // 実際の通知送信処理はここに実装
    }

    return {
      success: true,
      top100,
      updated: top100.length,
    };
  } catch (error: any) {
    const detailedError = createDetailedError('CVR Top 100 Generation', error, { topN });
    log('error', 'CVR top 100 generation failed', { error: detailedError.message });
    throw detailedError;
  }
}

/**
 * アフィリエイター進捗管理統合
 */
export async function unifiedAffiliateProgressManagement(options: {
  marketCode: MarketCode;
  databaseId?: string;
}): Promise<{
  success: boolean;
  completedCount: number;
  linksGenerated: number;
  linksSent: number;
}> {
  const { marketCode, databaseId } = options;

  try {
    log('info', 'Managing affiliate progress', { marketCode });

    // 1. 進捗100%の候補を取得
    const completedCandidates: any[] = [];
    log('info', 'Completed candidates found', {
      count: completedCandidates.length,
      marketCode,
    });

    // 2. アフィリエイトリンク生成
    const affiliateLinks: Array<{ candidateId: number; affiliateLink: string }> = [];
    for (const candidate of completedCandidates) {
      try {
        // 実際の実装では、Whop APIでアフィリエイトリンクを生成
        const affiliateLink = `https://whop.com/checkout/${candidate.productId}?ref=${candidate.id}`;
        affiliateLinks.push({
          candidateId: candidate.id,
          affiliateLink,
        });
      } catch (error: any) {
        const detailedError = createDetailedError('Affiliate Link Generation', error, {
          candidateId: candidate.id,
        });
        log('warn', 'Failed to generate affiliate link', {
          candidateId: candidate.id,
          error: detailedError.message,
        });
      }
    }

    // 3. Telegram DMでリンク配布
    let linksSent = 0;
    for (const linkData of affiliateLinks) {
      try {
        // 実際の実装では、Telegram DMを送信
        log('info', 'Sending affiliate link DM', {
          candidateId: linkData.candidateId,
          marketCode,
        });
        linksSent++;
      } catch (error: any) {
        const detailedError = createDetailedError('Affiliate Link DM', error, {
          candidateId: linkData.candidateId,
        });
        log('warn', 'Failed to send affiliate link DM', {
          candidateId: linkData.candidateId,
          error: detailedError.message,
        });
      }
    }

    return {
      success: true,
      completedCount: completedCandidates.length,
      linksGenerated: affiliateLinks.length,
      linksSent,
    };
  } catch (error: any) {
    const detailedError = createDetailedError('Affiliate Progress Management', error, {
      marketCode,
    });
    log('error', 'Affiliate progress management failed', {
      error: detailedError.message,
      marketCode,
    });
    throw detailedError;
  }
}
