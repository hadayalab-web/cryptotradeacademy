// scripts/backtest/evaluation/metrics.js
// Evaluation metrics for backtest performance

/**
 * Calculate accuracy (True Positives / Total Closed Trades)
 * @param {Array} signals - Array of evaluated signals with backtest results
 * @returns {number} Accuracy percentage (0-100)
 */
export function calculateAccuracy(signals) {
  const closedTrades = signals.filter((s) => {
    const outcome = s.backtest?.outcome;
    return outcome === 'TP' || outcome === 'TP_FIRST' || 
           outcome === 'SL' || outcome === 'SL_FIRST';
  });

  if (closedTrades.length === 0) return 0;

  const truePositives = closedTrades.filter((s) => {
    const outcome = s.backtest.outcome;
    return outcome === 'TP' || outcome === 'TP_FIRST';
  }).length;

  return (truePositives / closedTrades.length) * 100;
}

/**
 * Calculate precision (TP / (TP + FP))
 * Precision measures how many of the positive predictions were correct
 * @param {Array} signals - Array of evaluated signals
 * @returns {number} Precision percentage (0-100)
 */
export function calculatePrecision(signals) {
  const positiveSignals = signals.filter((s) => {
    const signal = s.metrics?.signal || s.signal;
    return signal === 'BUY';
  });

  if (positiveSignals.length === 0) return 0;

  const truePositives = positiveSignals.filter((s) => {
    const outcome = s.backtest?.outcome;
    return outcome === 'TP' || outcome === 'TP_FIRST';
  }).length;

  return (truePositives / positiveSignals.length) * 100;
}

/**
 * Calculate recall (TP / (TP + FN))
 * Recall measures how many of the actual positives were correctly identified
 * Note: FN calculation requires market data to identify missed opportunities
 * @param {Array} signals - Array of evaluated signals
 * @param {number} falseNegatives - Number of missed opportunities (from market analysis)
 * @returns {number} Recall percentage (0-100)
 */
export function calculateRecall(signals, falseNegatives = 0) {
  const truePositives = signals.filter((s) => {
    const outcome = s.backtest?.outcome;
    return outcome === 'TP' || outcome === 'TP_FIRST';
  }).length;

  const totalActualPositives = truePositives + falseNegatives;
  
  if (totalActualPositives === 0) return 0;

  return (truePositives / totalActualPositives) * 100;
}

/**
 * Calculate F1 Score (harmonic mean of precision and recall)
 * @param {number} precision - Precision percentage
 * @param {number} recall - Recall percentage
 * @returns {number} F1 score (0-100)
 */
export function calculateF1Score(precision, recall) {
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

/**
 * Calculate Sharpe Ratio (risk-adjusted return)
 * Sharpe = (Mean Return - Risk-Free Rate) / Standard Deviation of Returns
 * @param {Array} signals - Array of evaluated signals with returns
 * @param {number} riskFreeRate - Risk-free rate (default: 0)
 * @returns {number} Sharpe ratio
 */
export function calculateSharpeRatio(signals, riskFreeRate = 0) {
  const returns = signals
    .filter((s) => s.backtest?.status === 'EVAL')
    .map((s) => {
      const outcome = s.backtest.outcome;
      const side = s.side || 'LONG';
      
      if (outcome === 'TP' || outcome === 'TP_FIRST') {
        // Profitable trade
        const entry = s.entry || s.metrics?.priceUsd || 0;
        const tp = s.tp || 0;
        if (entry === 0) return 0;
        
        if (side === 'LONG') {
          return ((tp - entry) / entry) * 100;
        } else {
          return ((entry - tp) / entry) * 100;
        }
      } else if (outcome === 'SL' || outcome === 'SL_FIRST') {
        // Loss
        const entry = s.entry || s.metrics?.priceUsd || 0;
        const sl = s.sl || 0;
        if (entry === 0) return 0;
        
        if (side === 'LONG') {
          return ((sl - entry) / entry) * 100;
        } else {
          return ((entry - sl) / entry) * 100;
        }
      }
      
      return 0; // OPEN trades
    });

  if (returns.length === 0) return 0;

  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  
  if (returns.length < 2) return 0;

  const variance = returns
    .map((r) => Math.pow(r - meanReturn, 2))
    .reduce((a, b) => a + b, 0) / (returns.length - 1);
  
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return 0;

  return (meanReturn - riskFreeRate) / stdDev;
}

/**
 * Calculate Maximum Drawdown
 * @param {Array} signals - Array of evaluated signals
 * @returns {number} Max drawdown percentage (negative value)
 */
export function calculateMaxDrawdown(signals) {
  const closedTrades = signals.filter((s) => {
    const outcome = s.backtest?.outcome;
    return outcome === 'TP' || outcome === 'TP_FIRST' || 
           outcome === 'SL' || outcome === 'SL_FIRST';
  });

  if (closedTrades.length === 0) return 0;

  let peak = 100; // Starting capital (normalized to 100)
  let maxDrawdown = 0;
  let current = 100;

  for (const signal of closedTrades) {
    const outcome = signal.backtest.outcome;
    const side = signal.side || 'LONG';
    const entry = signal.entry || signal.metrics?.priceUsd || 0;
    
    if (entry === 0) continue;

    let returnPct = 0;

    if (outcome === 'TP' || outcome === 'TP_FIRST') {
      const tp = signal.tp || 0;
      if (side === 'LONG') {
        returnPct = ((tp - entry) / entry) * 100;
      } else {
        returnPct = ((entry - tp) / entry) * 100;
      }
    } else if (outcome === 'SL' || outcome === 'SL_FIRST') {
      const sl = signal.sl || 0;
      if (side === 'LONG') {
        returnPct = ((sl - entry) / entry) * 100;
      } else {
        returnPct = ((entry - sl) / entry) * 100;
      }
    }

    // Assume 1x leverage (return = portfolio change)
    current = current * (1 + returnPct / 100);

    if (current > peak) {
      peak = current;
    }

    const drawdown = ((current - peak) / peak) * 100;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

/**
 * Calculate Win Rate
 * @param {Array} signals - Array of evaluated signals
 * @returns {number} Win rate percentage (0-100)
 */
export function calculateWinRate(signals) {
  return calculateAccuracy(signals);
}

/**
 * Calculate Average Win/Loss Ratio
 * @param {Array} signals - Array of evaluated signals
 * @returns {number} Win/Loss ratio
 */
export function calculateWinLossRatio(signals) {
  const wins = [];
  const losses = [];

  for (const signal of signals) {
    if (signal.backtest?.status !== 'EVAL') continue;

    const outcome = signal.backtest.outcome;
    const side = signal.side || 'LONG';
    const entry = signal.entry || signal.metrics?.priceUsd || 0;
    
    if (entry === 0) continue;

    if (outcome === 'TP' || outcome === 'TP_FIRST') {
      const tp = signal.tp || 0;
      let returnPct = 0;
      
      if (side === 'LONG') {
        returnPct = ((tp - entry) / entry) * 100;
      } else {
        returnPct = ((entry - tp) / entry) * 100;
      }
      
      wins.push(Math.abs(returnPct));
    } else if (outcome === 'SL' || outcome === 'SL_FIRST') {
      const sl = signal.sl || 0;
      let returnPct = 0;
      
      if (side === 'LONG') {
        returnPct = ((sl - entry) / entry) * 100;
      } else {
        returnPct = ((entry - sl) / entry) * 100;
      }
      
      losses.push(Math.abs(returnPct));
    }
  }

  if (wins.length === 0 || losses.length === 0) return 0;

  const avgWin = wins.reduce((a, b) => a + b, 0) / wins.length;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;

  if (avgLoss === 0) return 0;

  return avgWin / avgLoss;
}

/**
 * Calculate Profit Factor
 * @param {Array} signals - Array of evaluated signals
 * @returns {number} Profit factor (gross profit / gross loss)
 */
export function calculateProfitFactor(signals) {
  let grossProfit = 0;
  let grossLoss = 0;

  for (const signal of signals) {
    if (signal.backtest?.status !== 'EVAL') continue;

    const outcome = signal.backtest.outcome;
    const side = signal.side || 'LONG';
    const entry = signal.entry || signal.metrics?.priceUsd || 0;
    
    if (entry === 0) continue;

    if (outcome === 'TP' || outcome === 'TP_FIRST') {
      const tp = signal.tp || 0;
      let returnPct = 0;
      
      if (side === 'LONG') {
        returnPct = ((tp - entry) / entry) * 100;
      } else {
        returnPct = ((entry - tp) / entry) * 100;
      }
      
      grossProfit += Math.abs(returnPct);
    } else if (outcome === 'SL' || outcome === 'SL_FIRST') {
      const sl = signal.sl || 0;
      let returnPct = 0;
      
      if (side === 'LONG') {
        returnPct = ((sl - entry) / entry) * 100;
      } else {
        returnPct = ((entry - sl) / entry) * 100;
      }
      
      grossLoss += Math.abs(returnPct);
    }
  }

  if (grossLoss === 0) return 0;

  return grossProfit / grossLoss;
}

/**
 * Calculate all metrics at once
 * @param {Array} signals - Array of evaluated signals
 * @param {number} falseNegatives - Number of false negatives (optional)
 * @returns {Object} All metrics
 */
export function calculateAllMetrics(signals, falseNegatives = 0) {
  const accuracy = calculateAccuracy(signals);
  const precision = calculatePrecision(signals);
  const recall = calculateRecall(signals, falseNegatives);
  const f1Score = calculateF1Score(precision, recall);
  const sharpeRatio = calculateSharpeRatio(signals);
  const maxDrawdown = calculateMaxDrawdown(signals);
  const winRate = calculateWinRate(signals);
  const winLossRatio = calculateWinLossRatio(signals);
  const profitFactor = calculateProfitFactor(signals);

  return {
    accuracy,
    precision,
    recall,
    f1Score,
    sharpeRatio,
    maxDrawdown,
    winRate,
    winLossRatio,
    profitFactor,
  };
}
