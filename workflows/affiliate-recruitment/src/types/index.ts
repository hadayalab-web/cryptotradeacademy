/**
 * アフィリエイト募集自動化ワークフロー - TypeScript型定義
 * 
 * GPTレビューに基づく型安全性の向上
 */

/**
 * 市場コード
 */
export type MarketCode = 'EN' | 'AR' | 'KO' | 'JA' | 'ES' | 'PT-BR';

/**
 * 候補ステータス
 */
export type CandidateStatus = 'New' | 'Contacted' | 'Responded' | 'Onboarded' | 'Rejected';

/**
 * プラットフォーム
 */
export type Platform = 'X' | 'Telegram' | 'YouTube' | 'LinkedIn' | 'Instagram';

/**
 * 分析タイプ
 */
export type AnalysisType = 'priority_ranking' | 'content_style' | 'both';

/**
 * アフィリエイター候補
 */
export interface AffiliateCandidate {
  id: number;
  name: string;
  email?: string;
  market: MarketCode;
  platform: Platform;
  cvrScore: number;
  status: CandidateStatus;
  telegramUserId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * ワークフロー結果の基本型
 */
export interface WorkflowResult {
  success: boolean;
  marketCode: MarketCode;
  startTime: string;
  endTime?: string;
  duration?: number;
  errors?: string[];
}

/**
 * アフィリエイト展開ワークフローの結果
 */
export interface DeploymentWorkflowResult extends WorkflowResult {
  steps: WorkflowStep[];
  nextSteps?: NextStep[];
}

/**
 * ワークフローステップ
 */
export interface WorkflowStep {
  step: string;
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
  details?: any;
}

/**
 * 次のステップ
 */
export interface NextStep {
  step: string;
  description: string;
  apiEndpoint: string;
  method: string;
  body: any;
}

/**
 * 統合ワークフローの結果
 */
export interface IntegratedWorkflowResult extends WorkflowResult {
  workflow: string;
  steps: WorkflowStep[];
  summary: {
    candidatesFound: number;
    candidatesAnalyzed: number;
    highPriorityCandidates: number;
    telegramDMSent: number;
    emailsSent: number;
    errors: string[];
  };
}

/**
 * 検索ワークフローの結果
 */
export interface SearchWorkflowResult extends WorkflowResult {
  searchQueries: string[];
  candidates: AffiliateCandidate[];
  saved: number;
  skipped: number;
  skippedReasons: any[];
  dataPath: string;
}

/**
 * DM送信ワークフローの結果
 */
export interface DMWorkflowResult extends WorkflowResult {
  sent: Array<{
    candidateId: number;
    messageId?: string;
  }>;
  failed: Array<{
    candidateId: number;
    error: string;
  }>;
}

/**
 * Email送信ワークフローの結果
 */
export interface EmailWorkflowResult extends WorkflowResult {
  sent: Array<{
    email: string;
  }>;
  failed: Array<{
    email: string;
    error: string;
  }>;
}

/**
 * GPT分析ワークフローの結果
 */
export interface AnalyzeWorkflowResult extends WorkflowResult {
  candidatesAnalyzed: number;
  analysisType: AnalysisType;
  analysis: {
    priorityRanking?: Array<{
      candidateId: number;
      name: string;
      priorityScore: number;
      reasoning: string;
    }>;
    insights?: string[];
    summary?: {
      totalAnalyzed: number;
      highPriority: number;
      mediumPriority: number;
      lowPriority: number;
    };
    contentStyles?: Array<{
      candidateId: number;
      name: string;
      style: string;
      tone: string;
      recommendations: string[];
    }>;
  };
}

/**
 * API呼び出しオプション
 */
export interface ApiCallOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

/**
 * リトライ設定
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
  factor?: number;
}

/**
 * レート制限設定
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}
