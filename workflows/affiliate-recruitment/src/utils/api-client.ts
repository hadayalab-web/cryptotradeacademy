/**
 * API呼び出し共通ユーティリティ
 * 
 * GPTレビューに基づく改善:
 * - エラーハンドリングの統一
 * - リトライロジック（指数バックオフ）
 * - タイムアウト設定の統一
 * - レート制限の実装
 */

import type { ApiCallOptions, RetryConfig, RateLimitConfig } from '../types';

/**
 * デフォルト設定
 */
const DEFAULT_TIMEOUT = 30000; // 30秒
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1秒
const DEFAULT_EXPONENTIAL_BACKOFF = true;
const DEFAULT_BACKOFF_FACTOR = 2;

/**
 * レート制限管理（簡易版）
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  /**
   * レート制限をチェック
   */
  checkRateLimit(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const requestTimes = this.requests.get(key)!;
    const recentRequests = requestTimes.filter(time => time > windowStart);
    
    if (recentRequests.length >= config.maxRequests) {
      return false; // レート制限超過
    }
    
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    return true;
  }

  /**
   * レート制限をクリア
   */
  clear(key: string): void {
    this.requests.delete(key);
  }
}

const rateLimiter = new RateLimiter();

/**
 * 指数バックオフで待機
 */
async function waitWithExponentialBackoff(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  factor: number = DEFAULT_BACKOFF_FACTOR
): Promise<void> {
  const delay = Math.min(initialDelay * Math.pow(factor, attempt), maxDelay);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * リトライロジック（指数バックオフ対応）
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // 最後の試行でない場合、待機
      if (attempt < config.maxRetries) {
        if (config.exponentialBackoff) {
          await waitWithExponentialBackoff(
            attempt,
            config.initialDelay,
            config.maxDelay || config.initialDelay * 10,
            config.factor || DEFAULT_BACKOFF_FACTOR
          );
        } else {
          await new Promise(resolve => setTimeout(resolve, config.initialDelay));
        }
      }
    }
  }
  
  throw lastError || new Error('Retry failed');
}

/**
 * タイムアウト付きfetch
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms: ${url}`);
    }
    throw error;
  }
}

/**
 * 安全なAPI呼び出し（GPTレビューに基づく改善版）
 */
export async function safeApiCall<T>(
  fn: () => Promise<T>,
  options: ApiCallOptions = {}
): Promise<T> {
  const {
    timeout = DEFAULT_TIMEOUT,
    maxRetries = DEFAULT_MAX_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    exponentialBackoff = DEFAULT_EXPONENTIAL_BACKOFF,
    rateLimit,
  } = options;

  // レート制限チェック
  if (rateLimit) {
    const rateLimitKey = 'api-call';
    if (!rateLimiter.checkRateLimit(rateLimitKey, rateLimit)) {
      throw new Error(
        `Rate limit exceeded: ${rateLimit.maxRequests} requests per ${rateLimit.windowMs}ms`
      );
    }
  }

  // リトライ設定
  const retryConfig: RetryConfig = {
    maxRetries,
    initialDelay: retryDelay,
    maxDelay: timeout,
    exponentialBackoff,
  };

  // リトライロジックで実行
  return retryWithBackoff(fn, retryConfig);
}

/**
 * HTTPリクエスト（タイムアウト・リトライ・レート制限対応）
 */
export async function httpRequest<T>(
  url: string,
  options: RequestInit & {
    timeout?: number;
    maxRetries?: number;
    retryDelay?: number;
    exponentialBackoff?: boolean;
    rateLimit?: RateLimitConfig;
  } = {}
): Promise<T> {
  const {
    timeout = DEFAULT_TIMEOUT,
    maxRetries = DEFAULT_MAX_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    exponentialBackoff = DEFAULT_EXPONENTIAL_BACKOFF,
    rateLimit,
    ...fetchOptions
  } = options;

  return safeApiCall(
    async () => {
      const response = await fetchWithTimeout(url, fetchOptions, timeout);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status} ${response.statusText}: ${errorText}`
        );
      }
      
      return response.json() as Promise<T>;
    },
    {
      timeout,
      maxRetries,
      retryDelay,
      exponentialBackoff,
      rateLimit,
    }
  );
}

/**
 * 内部API呼び出し（ワークフロー間の呼び出し）
 */
export async function callInternalApi<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    timeout?: number;
    maxRetries?: number;
    rateLimit?: RateLimitConfig;
  } = {}
): Promise<T> {
  const {
    method = 'POST',
    body,
    timeout = DEFAULT_TIMEOUT,
    maxRetries = DEFAULT_MAX_RETRIES,
    rateLimit,
  } = options;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = `${baseUrl}${endpoint}`;

  return httpRequest<T>(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    timeout,
    maxRetries,
    rateLimit,
  });
}

/**
 * エラーメッセージを改善（GPTレビューに基づく）
 */
export function createDetailedError(
  context: string,
  error: any,
  additionalInfo?: Record<string, any>
): Error {
  const errorMessage = error?.message || String(error);
  const errorStack = error?.stack;
  
  let detailedMessage = `[${context}] ${errorMessage}`;
  
  if (additionalInfo) {
    const infoStr = Object.entries(additionalInfo)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    detailedMessage += ` (${infoStr})`;
  }
  
  const detailedError = new Error(detailedMessage);
  if (errorStack) {
    detailedError.stack = errorStack;
  }
  
  return detailedError;
}
