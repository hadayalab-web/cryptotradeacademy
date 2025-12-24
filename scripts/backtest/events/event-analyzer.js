// scripts/backtest/events/event-analyzer.js
// Event analysis logic for backtest validation

/**
 * Analyze signals for a specific event
 * @param {Object} event - Event object from critical-events.js
 * @param {Array} signals - Array of signal objects
 * @param {Array} klines - Price data (OHLCV)
 * @returns {Object} Analysis results
 */
export function analyzeEventSignals(event, signals, klines) {
  const analysis = {
    eventId: event.id,
    eventName: event.name,
    period: event.period,
    signalCount: signals.length,
    alerts: {
      EMERGENCY: 0,
      WATCH: 0,
      STANDBY_BREAK: 0,
      REGULAR: 0,
    },
    signalTypes: {
      BUY: 0,
      SELL: 0,
    },
    trapAnalysis: {
      trapAlertsCount: 0,
      trapAlertsCorrect: 0,
      averageLeadTimeMinutes: null,
      leadTimes: [],
    },
    timing: {
      beforeEvent: 0,
      duringEvent: 0,
      afterEvent: 0,
    },
    performance: {
      truePositives: 0,
      falsePositives: 0,
      accuracy: null,
      avgHoldingHours: null,
      maxRunup: null,
      maxDrawdown: null,
    },
    scoreDistribution: {
      high: 0,  // score >= 80
      medium: 0, // 50 <= score < 80
      low: 0,    // score < 50
    },
    timeline: [],
  };

  if (signals.length === 0) {
    return analysis;
  }

  const eventStart = new Date(event.period.start).getTime();
  const eventEnd = new Date(event.period.end).getTime();
  const holdingHours = [];
  const runups = [];
  const drawdowns = [];

  for (const signal of signals) {
    const signalTime = new Date(signal.ts || signal.timestamp || signal.time || signal.createdAt).getTime();
    
    // Timing analysis
    if (signalTime < eventStart) {
      analysis.timing.beforeEvent++;
    } else if (signalTime <= eventEnd) {
      analysis.timing.duringEvent++;
    } else {
      analysis.timing.afterEvent++;
    }

    // Alert type counting
    const alertType = signal.alertType || 'REGULAR';
    if (analysis.alerts[alertType] !== undefined) {
      analysis.alerts[alertType]++;
    }

    // Signal type counting
    const signalType = signal.metrics?.signal || signal.signal;
    if (signalType && analysis.signalTypes[signalType] !== undefined) {
      analysis.signalTypes[signalType]++;
    }

    // Trap analysis
    if (signal.trap?.isTrap) {
      analysis.trapAnalysis.trapAlertsCount++;
      
      if (signal.backtest?.trapLeadMinutes != null && signal.backtest.trapLeadMinutes >= 0) {
        analysis.trapAnalysis.leadTimes.push(signal.backtest.trapLeadMinutes);
        
        // Consider trap alert "correct" if it gave advance warning
        if (signal.backtest.trapLeadMinutes > 0) {
          analysis.trapAnalysis.trapAlertsCorrect++;
        }
      }
    }

    // Score distribution
    const score = signal.metrics?.score || 0;
    if (score >= 80) {
      analysis.scoreDistribution.high++;
    } else if (score >= 50) {
      analysis.scoreDistribution.medium++;
    } else {
      analysis.scoreDistribution.low++;
    }

    // Performance metrics from backtest
    if (signal.backtest?.status === 'EVAL') {
      const outcome = signal.backtest.outcome;
      
      if (outcome === 'TP' || outcome === 'TP_FIRST') {
        analysis.performance.truePositives++;
      } else if (outcome === 'SL' || outcome === 'SL_FIRST') {
        analysis.performance.falsePositives++;
      }

      if (signal.backtest.holdingHours != null) {
        holdingHours.push(signal.backtest.holdingHours);
      }

      if (signal.backtest.maxRunup != null) {
        runups.push(signal.backtest.maxRunup);
      }

      if (signal.backtest.maxDrawdown != null) {
        drawdowns.push(signal.backtest.maxDrawdown);
      }
    }

    // Add to timeline
    analysis.timeline.push({
      timestamp: signal.ts || signal.timestamp || signal.time || signal.createdAt,
      alertType,
      signal: signalType,
      score,
      isTrap: signal.trap?.isTrap || false,
      outcome: signal.backtest?.outcome || 'UNKNOWN',
      priceUsd: signal.metrics?.priceUsd || signal.entry,
    });
  }

  // Calculate averages
  const closedTrades = analysis.performance.truePositives + analysis.performance.falsePositives;
  if (closedTrades > 0) {
    analysis.performance.accuracy = (analysis.performance.truePositives / closedTrades) * 100;
  }

  if (holdingHours.length > 0) {
    analysis.performance.avgHoldingHours = 
      holdingHours.reduce((a, b) => a + b, 0) / holdingHours.length;
  }

  if (runups.length > 0) {
    analysis.performance.maxRunup = Math.max(...runups);
  }

  if (drawdowns.length > 0) {
    analysis.performance.maxDrawdown = Math.min(...drawdowns);
  }

  if (analysis.trapAnalysis.leadTimes.length > 0) {
    analysis.trapAnalysis.averageLeadTimeMinutes = 
      analysis.trapAnalysis.leadTimes.reduce((a, b) => a + b, 0) / 
      analysis.trapAnalysis.leadTimes.length;
  }

  // Sort timeline by timestamp
  analysis.timeline.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return analysis;
}

/**
 * Compare analysis results with expected behavior
 * @param {Object} analysis - Analysis results
 * @param {Object} expectedBehavior - Expected behavior from event definition
 * @returns {Object} Comparison results
 */
export function compareWithExpected(analysis, expectedBehavior) {
  const comparison = {
    alertTypesMatch: false,
    signalTypesMatch: false,
    trapDetectionMatch: false,
    observations: [],
    score: 0,
  };

  // Check alert types
  const actualAlerts = Object.entries(analysis.alerts)
    .filter(([, count]) => count > 0)
    .map(([type]) => type);
  
  const expectedAlerts = expectedBehavior.alerts || [];
  const alertsMatch = expectedAlerts.some((expected) => actualAlerts.includes(expected));
  
  comparison.alertTypesMatch = alertsMatch;
  if (!alertsMatch && actualAlerts.length > 0) {
    comparison.observations.push(
      `Alert types mismatch: expected ${expectedAlerts.join(', ')}, got ${actualAlerts.join(', ')}`
    );
  } else if (actualAlerts.length === 0) {
    comparison.observations.push('No alerts generated for this event');
  }

  // Check signal types
  const actualSignals = Object.entries(analysis.signalTypes)
    .filter(([, count]) => count > 0)
    .map(([type]) => type);
  
  const expectedSignals = expectedBehavior.signals || [];
  const signalsMatch = expectedSignals.length === 0 || 
    expectedSignals.some((expected) => actualSignals.includes(expected));
  
  comparison.signalTypesMatch = signalsMatch;
  if (!signalsMatch) {
    comparison.observations.push(
      `Signal types mismatch: expected ${expectedSignals.join(', ')}, got ${actualSignals.join(', ')}`
    );
  }

  // Check trap detection
  const trapExpected = expectedBehavior.trapExpected || false;
  const trapDetected = analysis.trapAnalysis.trapAlertsCount > 0;
  
  comparison.trapDetectionMatch = trapExpected === trapDetected;
  if (trapExpected && !trapDetected) {
    comparison.observations.push('Trap expected but not detected');
  } else if (!trapExpected && trapDetected) {
    comparison.observations.push('Trap detected but not expected');
  }

  // Calculate overall score
  let score = 0;
  if (comparison.alertTypesMatch) score += 40;
  if (comparison.signalTypesMatch) score += 40;
  if (comparison.trapDetectionMatch) score += 20;
  
  comparison.score = score;

  return comparison;
}

/**
 * Generate insights and recommendations based on analysis
 * @param {Object} analysis - Analysis results
 * @param {Object} comparison - Comparison with expected behavior
 * @returns {Object} Insights and recommendations
 */
export function generateInsights(analysis, comparison) {
  const insights = {
    strengths: [],
    weaknesses: [],
    recommendations: [],
  };

  // Analyze accuracy
  if (analysis.performance.accuracy != null) {
    if (analysis.performance.accuracy >= 70) {
      insights.strengths.push(
        `High accuracy (${analysis.performance.accuracy.toFixed(1)}%) during this event`
      );
    } else if (analysis.performance.accuracy < 50) {
      insights.weaknesses.push(
        `Low accuracy (${analysis.performance.accuracy.toFixed(1)}%) during this event`
      );
      insights.recommendations.push(
        'Review signal generation parameters for this type of market condition'
      );
    }
  }

  // Analyze trap detection
  if (analysis.trapAnalysis.trapAlertsCount > 0) {
    const correctRate = analysis.trapAnalysis.trapAlertsCorrect / analysis.trapAnalysis.trapAlertsCount;
    if (correctRate >= 0.7) {
      insights.strengths.push(
        `Effective trap detection with ${(correctRate * 100).toFixed(0)}% advance warnings`
      );
    } else {
      insights.weaknesses.push(
        `Trap alerts often lacked advance warning (${(correctRate * 100).toFixed(0)}% effectiveness)`
      );
    }

    if (analysis.trapAnalysis.averageLeadTimeMinutes != null) {
      const leadHours = (analysis.trapAnalysis.averageLeadTimeMinutes / 60).toFixed(1);
      insights.strengths.push(
        `Average trap warning lead time: ${leadHours} hours`
      );
    }
  }

  // Analyze signal distribution
  const totalSignals = analysis.signalCount;
  if (totalSignals > 0) {
    const duringEventRate = analysis.timing.duringEvent / totalSignals;
    if (duringEventRate < 0.5) {
      insights.weaknesses.push(
        `Only ${(duringEventRate * 100).toFixed(0)}% of signals fired during the event period`
      );
      insights.recommendations.push(
        'Consider improving event detection sensitivity'
      );
    }
  }

  // Analyze score distribution
  const highScoreRate = analysis.scoreDistribution.high / totalSignals;
  if (highScoreRate < 0.3 && totalSignals > 0) {
    insights.weaknesses.push(
      `Only ${(highScoreRate * 100).toFixed(0)}% of signals had high confidence scores`
    );
    insights.recommendations.push(
      'Review scoring algorithm for this market condition'
    );
  }

  // Comparison-based insights
  if (comparison.score < 60) {
    insights.weaknesses.push(
      'Algorithm behavior did not match expected patterns for this event type'
    );
    insights.recommendations.push(
      'Analyze this event type more carefully and adjust parameters'
    );
  }

  return insights;
}
