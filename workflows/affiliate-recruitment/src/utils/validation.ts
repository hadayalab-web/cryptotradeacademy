/**
 * バリデーション共通ユーティリティ
 * 
 * GPTレビューに基づく改善:
 * - 入力検証の強化
 * - エラーメッセージの改善
 */

import type { MarketCode, CandidateStatus, AnalysisType } from '../types';

/**
 * 有効な市場コード
 */
export const VALID_MARKETS: MarketCode[] = ['EN', 'AR', 'KO', 'JA', 'ES', 'PT-BR'];

/**
 * 有効なステータス
 */
export const VALID_STATUSES: CandidateStatus[] = ['New', 'Contacted', 'Responded', 'Onboarded', 'Rejected'];

/**
 * 市場コードを検証
 */
export function validateMarketCode(marketCode: any): marketCode is MarketCode {
  if (!marketCode || typeof marketCode !== 'string') {
    return false;
  }
  return VALID_MARKETS.includes(marketCode as MarketCode);
}

/**
 * ステータスを検証
 */
export function validateStatus(status: any): status is CandidateStatus {
  if (!status || typeof status !== 'string') {
    return false;
  }
  return VALID_STATUSES.includes(status as CandidateStatus);
}

/**
 * 分析タイプを検証
 */
export function validateAnalysisType(analysisType: any): analysisType is AnalysisType {
  if (!analysisType || typeof analysisType !== 'string') {
    return false;
  }
  return ['priority_ranking', 'content_style', 'both'].includes(analysisType);
}

/**
 * 必須フィールドを検証
 */
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[]
): { valid: boolean; missingFields: string[] } {
  const missingFields = requiredFields.filter(field => !data[field]);
  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * バリデーションエラーを作成
 */
export function createValidationError(
  field: string,
  value: any,
  expected: string
): Error {
  return new Error(
    `Validation failed: ${field} = ${JSON.stringify(value)}, expected: ${expected}`
  );
}
