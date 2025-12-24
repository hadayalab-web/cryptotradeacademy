// scripts/backtest/evaluation/scorer.js
// Composite scoring for parameter optimization

import { calculateAllMetrics } from './metrics.js';

/**
 * Default weights for different metrics
 * Can be customized based on optimization goals
 */
export const DEFAULT_WEIGHTS = {
  accuracy: 0.25,
  precision: 0.15,
  recall: 0.15,
  f1Score: 0.15,
  sharpeRatio: 0.15,
  maxDrawdown: 0.10,
  profitFactor: 0.05,
};

/**
 * Calculate composite score from metrics
 * @param {Object} metrics - Metrics object from calculateAllMetrics
 * @param {Object} weights - Weight object (optional, uses defaults if not provided)
 * @returns {number} Composite score (0-100)
 */
export function calculateCompositeScore(metrics, weights = DEFAULT_WEIGHTS) {
  let score = 0;

  // Accuracy (0-100)
  if (weights.accuracy) {
    score += (metrics.accuracy / 100) * weights.accuracy * 100;
  }

  // Precision (0-100)
  if (weights.precision) {
    score += (metrics.precision / 100) * weights.precision * 100;
  }

  // Recall (0-100)
  if (weights.recall) {
    score += (metrics.recall / 100) * weights.recall * 100;
  }

  // F1 Score (0-100)
  if (weights.f1Score) {
    score += (metrics.f1Score / 100) * weights.f1Score * 100;
  }

  // Sharpe Ratio (normalize to 0-100, typical range -3 to 3)
  if (weights.sharpeRatio) {
    const normalizedSharpe = Math.min(100, Math.max(0, ((metrics.sharpeRatio + 3) / 6) * 100));
    score += (normalizedSharpe / 100) * weights.sharpeRatio * 100;
  }

  // Max Drawdown (0-100, inverted since lower is better)
  // Typical drawdown range: 0 to -50%
  if (weights.maxDrawdown) {
    const normalizedDrawdown = Math.min(100, Math.max(0, 100 + (metrics.maxDrawdown * 2)));
    score += (normalizedDrawdown / 100) * weights.maxDrawdown * 100;
  }

  // Profit Factor (normalize to 0-100, typical range 0-3)
  if (weights.profitFactor) {
    const normalizedPF = Math.min(100, (metrics.profitFactor / 3) * 100);
    score += (normalizedPF / 100) * weights.profitFactor * 100;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Preset weight configurations for different optimization goals
 */
export const PRESET_WEIGHTS = {
  // Balanced: Equal consideration of all factors
  balanced: DEFAULT_WEIGHTS,

  // Aggressive: Maximize returns, accept higher risk
  aggressive: {
    accuracy: 0.15,
    precision: 0.10,
    recall: 0.10,
    f1Score: 0.10,
    sharpeRatio: 0.30,
    maxDrawdown: 0.05,
    profitFactor: 0.20,
  },

  // Conservative: Minimize risk, prioritize safety
  conservative: {
    accuracy: 0.30,
    precision: 0.20,
    recall: 0.10,
    f1Score: 0.15,
    sharpeRatio: 0.10,
    maxDrawdown: 0.15,
    profitFactor: 0.00,
  },

  // High Precision: Minimize false positives
  highPrecision: {
    accuracy: 0.20,
    precision: 0.35,
    recall: 0.05,
    f1Score: 0.20,
    sharpeRatio: 0.10,
    maxDrawdown: 0.10,
    profitFactor: 0.00,
  },

  // High Recall: Catch all opportunities
  highRecall: {
    accuracy: 0.20,
    precision: 0.05,
    recall: 0.35,
    f1Score: 0.20,
    sharpeRatio: 0.10,
    maxDrawdown: 0.10,
    profitFactor: 0.00,
  },
};

/**
 * Evaluate parameter set and return score
 * @param {Array} signals - Array of evaluated signals with backtest results
 * @param {Object} options - Scoring options
 * @returns {Object} Score and detailed metrics
 */
export function scoreParameterSet(signals, options = {}) {
  const {
    weights = DEFAULT_WEIGHTS,
    falseNegatives = 0,
  } = options;

  const metrics = calculateAllMetrics(signals, falseNegatives);
  const score = calculateCompositeScore(metrics, weights);

  return {
    score,
    metrics,
    weights,
    signalCount: signals.length,
  };
}

/**
 * Compare two parameter sets
 * @param {Object} result1 - First scoring result
 * @param {Object} result2 - Second scoring result
 * @returns {number} Positive if result1 is better, negative if result2 is better
 */
export function compareResults(result1, result2) {
  return result1.score - result2.score;
}

/**
 * Generate scoring report
 * @param {Object} scoringResult - Result from scoreParameterSet
 * @returns {string} Formatted report
 */
export function generateScoringReport(scoringResult) {
  const { score, metrics, weights, signalCount } = scoringResult;

  let report = '=== Parameter Scoring Report ===\n\n';
  report += `Composite Score: ${score.toFixed(2)}/100\n`;
  report += `Signals Evaluated: ${signalCount}\n\n`;
  
  report += 'Metrics:\n';
  report += `  Accuracy:      ${metrics.accuracy.toFixed(2)}%\n`;
  report += `  Precision:     ${metrics.precision.toFixed(2)}%\n`;
  report += `  Recall:        ${metrics.recall.toFixed(2)}%\n`;
  report += `  F1 Score:      ${metrics.f1Score.toFixed(2)}%\n`;
  report += `  Sharpe Ratio:  ${metrics.sharpeRatio.toFixed(3)}\n`;
  report += `  Max Drawdown:  ${metrics.maxDrawdown.toFixed(2)}%\n`;
  report += `  Win Rate:      ${metrics.winRate.toFixed(2)}%\n`;
  report += `  Win/Loss Ratio: ${metrics.winLossRatio.toFixed(2)}\n`;
  report += `  Profit Factor: ${metrics.profitFactor.toFixed(2)}\n\n`;

  report += 'Weights Used:\n';
  for (const [key, value] of Object.entries(weights)) {
    report += `  ${key}: ${(value * 100).toFixed(0)}%\n`;
  }

  return report;
}

/**
 * Find best scoring result from array
 * @param {Array} results - Array of scoring results
 * @returns {Object} Best result
 */
export function findBestResult(results) {
  if (results.length === 0) return null;
  
  return results.reduce((best, current) => {
    return compareResults(current, best) > 0 ? current : best;
  });
}

/**
 * Rank results by score
 * @param {Array} results - Array of scoring results
 * @returns {Array} Sorted results (best first)
 */
export function rankResults(results) {
  return [...results].sort((a, b) => compareResults(b, a));
}
