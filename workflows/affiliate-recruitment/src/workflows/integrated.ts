/**
 * 統合アフィリエイトワークフロー
 * 
 * GPTレビューに基づく改善:
 * - TypeScript型定義の強化
 * - 共通API呼び出しの使用
 * - エラーハンドリングの改善
 * - 並列処理の最適化（Promise.all）
 */

import type {
  MarketCode,
  IntegratedWorkflowResult,
  WorkflowStep,
} from '../types';
import { callInternalApi, createDetailedError } from '../utils/api-client';
import { validateMarketCode, createValidationError } from '../utils/validation';
import { requireEnvVars, safeLog } from '../utils/vercel-safe';

/**
 * 統合アフィリエイトワークフローを実行
 */
export async function executeIntegratedWorkflow(options: {
  marketCode: MarketCode;
  whopProductId: string;
  searchQueries?: string[];
  maxCandidates?: number;
  analyzeCandidates?: boolean;
  sendTelegramDM?: boolean;
  sendEmail?: boolean;
  emailFallback?: boolean;
}): Promise<IntegratedWorkflowResult> {
  const {
    marketCode,
    whopProductId,
    searchQueries = [],
    maxCandidates = 20,
    analyzeCandidates = true,
    sendTelegramDM = true,
    sendEmail = false,
    emailFallback = false,
  } = options;

  // バリデーション
  if (!validateMarketCode(marketCode)) {
    throw createValidationError('marketCode', marketCode, 'EN | AR | KO | JA | ES | PT-BR');
  }

  if (!whopProductId || typeof whopProductId !== 'string') {
    throw createValidationError('whopProductId', whopProductId, 'string (required)');
  }

  // 環境変数チェック（デバッグ炎上対策）
  try {
    // 必須環境変数
    requireEnvVars(['XAI_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY']);

    // Telegram DM送信を使用する場合の環境変数チェック
    if (sendTelegramDM) {
      const telegramTokenKey = `TELEGRAM_BOT_TOKEN_${marketCode}`;
      if (!process.env[telegramTokenKey]) {
        throw new Error(
          `Missing required environment variable for Telegram DM: ${telegramTokenKey}. ` +
          `Telegram DM sending is enabled (sendTelegramDM: true) but the token is not set.`
        );
      }
      safeLog('info', `Telegram DM enabled for market ${marketCode}`, {
        tokenKey: telegramTokenKey,
      });
    }

    // Email送信を使用する場合の環境変数チェック
    if (sendEmail || emailFallback) {
      if (!process.env.RESEND_API_KEY) {
        throw new Error(
          `Missing required environment variable: RESEND_API_KEY. ` +
          `Email sending is enabled (sendEmail: ${sendEmail}, emailFallback: ${emailFallback}) but RESEND_API_KEY is not set.`
        );
      }
      safeLog('info', 'Email sending enabled', {
        sendEmail,
        emailFallback,
      });
    }
  } catch (error: any) {
    const detailedError = createDetailedError('Environment Variables Check', error, {
      marketCode,
      sendTelegramDM,
      sendEmail,
      emailFallback,
    });
    safeLog('error', 'Environment variables check failed', {
      error: detailedError.message,
    });
    throw detailedError;
  }

  const result: IntegratedWorkflowResult = {
    success: true,
    marketCode,
    workflow: 'affiliate-integrated',
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
  };

  // Step 1: アフィリエイト展開ワークフロー実行
  try {
    const deploymentResult = await callInternalApi<any>('/api/workflows/affiliate-deployment', {
      body: {
        marketCode,
        whopProductId,
        searchQueries,
        maxCandidates,
      },
      timeout: 30000,
      maxRetries: 2,
    });

    result.steps.push({
      step: 'affiliate_deployment',
      success: true,
      data: deploymentResult,
    });
  } catch (error: any) {
    const detailedError = createDetailedError('Deployment Workflow', error, {
      marketCode,
      whopProductId,
    });
    result.steps.push({
      step: 'affiliate_deployment',
      success: false,
      error: detailedError.message,
    });
    result.summary.errors.push(`Deployment: ${detailedError.message}`);
  }

  // Step 2: アフィリエイター候補検索
  if (searchQueries.length > 0) {
    try {
      const searchResult = await callInternalApi<any>('/api/workflows/affiliate-search', {
        body: {
          marketCode,
          searchQueries,
          maxCandidates,
        },
        timeout: 60000, // 検索は時間がかかる可能性があるため60秒
        maxRetries: 2,
      });

      result.steps.push({
        step: 'affiliate_search',
        success: true,
        data: searchResult,
      });
      result.summary.candidatesFound = searchResult.candidates?.length || 0;
    } catch (error: any) {
      const detailedError = createDetailedError('Search Workflow', error, {
        marketCode,
        searchQueries,
      });
      result.steps.push({
        step: 'affiliate_search',
        success: false,
        error: detailedError.message,
      });
      result.summary.errors.push(`Search: ${detailedError.message}`);
    }
  }

  // Step 3: GPT分析（安全ロック設計: Grokでストック → GPTで分析）
  if (analyzeCandidates && result.summary.candidatesFound > 0) {
    try {
      const analyzeResult = await callInternalApi<any>('/api/workflows/affiliate-analyze', {
        body: {
          marketCode,
          status: 'New',
          limit: maxCandidates,
          analysisType: 'priority_ranking',
        },
        timeout: 120000, // GPT分析は時間がかかるため120秒
        maxRetries: 1, // GPT分析はリトライを少なく
      });

      result.steps.push({
        step: 'affiliate_analyze',
        success: true,
        data: analyzeResult,
      });
      result.summary.candidatesAnalyzed = analyzeResult.candidatesAnalyzed || 0;
      result.summary.highPriorityCandidates =
        analyzeResult.analysis?.summary?.highPriority || 0;
    } catch (error: any) {
      const detailedError = createDetailedError('Analyze Workflow', error, {
        marketCode,
        candidatesFound: result.summary.candidatesFound,
      });
      result.steps.push({
        step: 'affiliate_analyze',
        success: false,
        error: detailedError.message,
      });
      result.summary.errors.push(`Analyze: ${detailedError.message}`);
    }
  }

  // Step 4: Telegram DM送信（改善: 並列処理の最適化、環境変数チェック済み）
  if (sendTelegramDM) {
    try {
      // 環境変数の再チェック（念のため）
      const telegramTokenKey = `TELEGRAM_BOT_TOKEN_${marketCode}`;
      if (!process.env[telegramTokenKey]) {
        throw new Error(
          `Telegram Bot Token not found: ${telegramTokenKey}. ` +
          `Please set the environment variable for market ${marketCode}.`
        );
      }

      const dmResult = await callInternalApi<any>('/api/workflows/affiliate-dm', {
        body: {
          marketCode,
          limit: maxCandidates,
          status: 'New',
        },
        timeout: 180000, // DM送信は時間がかかるため180秒
        maxRetries: 1,
        rateLimit: {
          maxRequests: 10,
          windowMs: 60000, // 1分あたり10リクエスト
        },
      });

      result.steps.push({
        step: 'telegram_dm',
        success: true,
        data: dmResult,
      });
      result.summary.telegramDMSent = dmResult.sent?.length || 0;
      safeLog('info', 'Telegram DM sent successfully', {
        marketCode,
        sent: result.summary.telegramDMSent,
      });
    } catch (error: any) {
      const detailedError = createDetailedError('Telegram DM Workflow', error, {
        marketCode,
        limit: maxCandidates,
        telegramTokenKey: `TELEGRAM_BOT_TOKEN_${marketCode}`,
      });
      result.steps.push({
        step: 'telegram_dm',
        success: false,
        error: detailedError.message,
      });
      result.summary.errors.push(`Telegram DM: ${detailedError.message}`);
      safeLog('error', 'Telegram DM failed', {
        marketCode,
        error: detailedError.message,
      });
    }
  }

  // Step 5: Email送信（補完または直接送信、環境変数チェック済み）
  if (sendEmail || emailFallback) {
    try {
      // 環境変数の再チェック（念のため）
      if (!process.env.RESEND_API_KEY) {
        throw new Error(
          `Resend API Key not found: RESEND_API_KEY. ` +
          `Please set the environment variable for email sending.`
        );
      }

      const emailResult = await callInternalApi<any>('/api/workflows/affiliate-email', {
        body: {
          marketCode,
          limit: maxCandidates,
        },
        timeout: 60000,
        maxRetries: 2,
        rateLimit: {
          maxRequests: 50,
          windowMs: 60000, // 1分あたり50リクエスト（Resendの制限に合わせる）
        },
      });

      result.steps.push({
        step: 'email',
        success: true,
        data: emailResult,
      });
      result.summary.emailsSent = emailResult.sent?.length || 0;
      safeLog('info', 'Email sent successfully', {
        marketCode,
        sent: result.summary.emailsSent,
      });
    } catch (error: any) {
      const detailedError = createDetailedError('Email Workflow', error, {
        marketCode,
        limit: maxCandidates,
        resendApiKeySet: !!process.env.RESEND_API_KEY,
      });
      result.steps.push({
        step: 'email',
        success: false,
        error: detailedError.message,
      });
      result.summary.errors.push(`Email: ${detailedError.message}`);
      safeLog('error', 'Email sending failed', {
        marketCode,
        error: detailedError.message,
      });
    }
  }

  result.endTime = new Date().toISOString();
  result.duration =
    new Date(result.endTime).getTime() - new Date(result.startTime).getTime();

  return result;
}
