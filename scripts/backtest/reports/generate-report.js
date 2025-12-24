// scripts/backtest/reports/generate-report.js
// Generate detailed PR reports for backtest results

import fs from 'fs';
import path from 'path';

/**
 * Generate Markdown report for PR
 * @param {Array} eventAnalyses - Array of event analysis results
 * @param {Object} options - Report options
 * @returns {string} Markdown report
 */
export function generateMarkdownReport(eventAnalyses, options = {}) {
  const { title = 'Critical Events Backtest Report', includeTimeline = false } = options;
  
  let markdown = `# ${title}\n\n`;
  markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
  markdown += `**Total Events Analyzed:** ${eventAnalyses.length}\n\n`;
  
  // Executive Summary
  markdown += '## Executive Summary\n\n';
  markdown += generateExecutiveSummary(eventAnalyses);
  markdown += '\n\n';

  // Overall Metrics
  markdown += '## Overall Performance Metrics\n\n';
  markdown += generateOverallMetrics(eventAnalyses);
  markdown += '\n\n';

  // Event-by-Event Analysis
  markdown += '## Event-by-Event Analysis\n\n';
  for (const analysis of eventAnalyses) {
    markdown += generateEventSection(analysis, includeTimeline);
    markdown += '\n\n';
  }

  // Key Findings
  markdown += '## Key Findings\n\n';
  markdown += generateKeyFindings(eventAnalyses);
  markdown += '\n\n';

  // Recommendations
  markdown += '## Recommendations\n\n';
  markdown += generateRecommendations(eventAnalyses);
  markdown += '\n\n';

  return markdown;
}

/**
 * Generate executive summary
 */
function generateExecutiveSummary(eventAnalyses) {
  const totalSignals = eventAnalyses.reduce((sum, a) => sum + a.signalCount, 0);
  const totalTPs = eventAnalyses.reduce((sum, a) => sum + a.performance.truePositives, 0);
  const totalFPs = eventAnalyses.reduce((sum, a) => sum + a.performance.falsePositives, 0);
  const totalTraps = eventAnalyses.reduce((sum, a) => sum + a.trapAnalysis.trapAlertsCount, 0);
  
  const closedTrades = totalTPs + totalFPs;
  const overallAccuracy = closedTrades > 0 ? (totalTPs / closedTrades) * 100 : 0;

  const eventsWithSignals = eventAnalyses.filter((a) => a.signalCount > 0).length;
  
  let summary = `This report analyzes algorithm performance across ${eventAnalyses.length} critical market events.\n\n`;
  summary += `- **Total Signals Generated:** ${totalSignals}\n`;
  summary += `- **Events with Signals:** ${eventsWithSignals} / ${eventAnalyses.length}\n`;
  summary += `- **Overall Accuracy:** ${overallAccuracy.toFixed(1)}% (${totalTPs} TP, ${totalFPs} FP)\n`;
  summary += `- **Trap Alerts Generated:** ${totalTraps}\n`;

  return summary;
}

/**
 * Generate overall metrics table
 */
function generateOverallMetrics(eventAnalyses) {
  const metrics = calculateAggregateMetrics(eventAnalyses);
  
  let table = '| Metric | Value |\n';
  table += '|--------|-------|\n';
  table += `| Average Accuracy | ${metrics.avgAccuracy.toFixed(1)}% |\n`;
  table += `| Signals per Event | ${metrics.avgSignalsPerEvent.toFixed(1)} |\n`;
  table += `| Trap Detection Rate | ${metrics.trapDetectionRate.toFixed(1)}% |\n`;
  table += `| High Confidence Signals | ${metrics.highConfidenceRate.toFixed(1)}% |\n`;
  table += `| Avg Holding Time | ${metrics.avgHoldingHours.toFixed(1)} hours |\n`;
  
  return table;
}

/**
 * Calculate aggregate metrics
 */
function calculateAggregateMetrics(eventAnalyses) {
  const validAccuracies = eventAnalyses
    .filter((a) => a.performance.accuracy != null)
    .map((a) => a.performance.accuracy);
  
  const avgAccuracy = validAccuracies.length > 0
    ? validAccuracies.reduce((a, b) => a + b, 0) / validAccuracies.length
    : 0;

  const avgSignalsPerEvent = eventAnalyses.reduce((sum, a) => sum + a.signalCount, 0) / 
    eventAnalyses.length;

  const totalTraps = eventAnalyses.reduce((sum, a) => sum + a.trapAnalysis.trapAlertsCount, 0);
  const totalSignals = eventAnalyses.reduce((sum, a) => sum + a.signalCount, 0);
  const trapDetectionRate = totalSignals > 0 ? (totalTraps / totalSignals) * 100 : 0;

  const totalHighConf = eventAnalyses.reduce((sum, a) => sum + a.scoreDistribution.high, 0);
  const highConfidenceRate = totalSignals > 0 ? (totalHighConf / totalSignals) * 100 : 0;

  const validHoldingTimes = eventAnalyses
    .filter((a) => a.performance.avgHoldingHours != null)
    .map((a) => a.performance.avgHoldingHours);
  
  const avgHoldingHours = validHoldingTimes.length > 0
    ? validHoldingTimes.reduce((a, b) => a + b, 0) / validHoldingTimes.length
    : 0;

  return {
    avgAccuracy,
    avgSignalsPerEvent,
    trapDetectionRate,
    highConfidenceRate,
    avgHoldingHours,
  };
}

/**
 * Generate event section
 */
function generateEventSection(analysis, includeTimeline) {
  let section = `### ${analysis.eventName}\n\n`;
  section += `**Period:** ${analysis.period.start} to ${analysis.period.end}\n\n`;
  section += `**Signals Generated:** ${analysis.signalCount}\n\n`;

  if (analysis.signalCount === 0) {
    section += '*No signals generated during this event.*\n';
    return section;
  }

  // Performance metrics
  section += '**Performance:**\n';
  section += `- Accuracy: ${analysis.performance.accuracy != null ? analysis.performance.accuracy.toFixed(1) + '%' : 'N/A'}\n`;
  section += `- True Positives: ${analysis.performance.truePositives}\n`;
  section += `- False Positives: ${analysis.performance.falsePositives}\n`;
  
  if (analysis.performance.maxRunup != null) {
    section += `- Max Runup: ${(analysis.performance.maxRunup * 100).toFixed(2)}%\n`;
  }
  if (analysis.performance.maxDrawdown != null) {
    section += `- Max Drawdown: ${(analysis.performance.maxDrawdown * 100).toFixed(2)}%\n`;
  }
  section += '\n';

  // Alert distribution
  section += '**Alert Distribution:**\n';
  section += `- EMERGENCY: ${analysis.alerts.EMERGENCY}\n`;
  section += `- WATCH: ${analysis.alerts.WATCH}\n`;
  section += `- STANDBY_BREAK: ${analysis.alerts.STANDBY_BREAK}\n`;
  section += `- REGULAR: ${analysis.alerts.REGULAR}\n`;
  section += '\n';

  // Signal types
  section += '**Signal Types:**\n';
  section += `- BUY: ${analysis.signalTypes.BUY}\n`;
  section += `- SELL: ${analysis.signalTypes.SELL}\n`;
  section += '\n';

  // Trap analysis
  if (analysis.trapAnalysis.trapAlertsCount > 0) {
    section += '**Trap Detection:**\n';
    section += `- Trap Alerts: ${analysis.trapAnalysis.trapAlertsCount}\n`;
    section += `- Correct Warnings: ${analysis.trapAnalysis.trapAlertsCorrect}\n`;
    if (analysis.trapAnalysis.averageLeadTimeMinutes != null) {
      const leadHours = (analysis.trapAnalysis.averageLeadTimeMinutes / 60).toFixed(1);
      section += `- Avg Lead Time: ${leadHours} hours\n`;
    }
    section += '\n';
  }

  // Timing
  section += '**Signal Timing:**\n';
  section += `- Before Event: ${analysis.timing.beforeEvent}\n`;
  section += `- During Event: ${analysis.timing.duringEvent}\n`;
  section += `- After Event: ${analysis.timing.afterEvent}\n`;
  section += '\n';

  // Timeline (optional)
  if (includeTimeline && analysis.timeline.length > 0) {
    section += '**Timeline:**\n\n';
    section += '| Time | Alert | Signal | Score | Trap | Outcome |\n';
    section += '|------|-------|--------|-------|------|----------|\n';
    
    for (const entry of analysis.timeline.slice(0, 10)) { // Limit to 10 for brevity
      const time = new Date(entry.timestamp).toISOString().replace('T', ' ').substring(0, 16);
      section += `| ${time} | ${entry.alertType} | ${entry.signal || '-'} | ${entry.score} | ${entry.isTrap ? 'Yes' : 'No'} | ${entry.outcome} |\n`;
    }
    
    if (analysis.timeline.length > 10) {
      section += `\n*Showing 10 of ${analysis.timeline.length} signals*\n`;
    }
    section += '\n';
  }

  // Comparison with expected (if available)
  if (analysis.comparison) {
    section += '**Expected vs Actual:**\n';
    section += `- Match Score: ${analysis.comparison.score}/100\n`;
    if (analysis.comparison.observations.length > 0) {
      section += '\nObservations:\n';
      for (const obs of analysis.comparison.observations) {
        section += `- ${obs}\n`;
      }
    }
    section += '\n';
  }

  // Insights (if available)
  if (analysis.insights) {
    if (analysis.insights.strengths.length > 0) {
      section += '**Strengths:**\n';
      for (const strength of analysis.insights.strengths) {
        section += `- ✅ ${strength}\n`;
      }
      section += '\n';
    }

    if (analysis.insights.weaknesses.length > 0) {
      section += '**Weaknesses:**\n';
      for (const weakness of analysis.insights.weaknesses) {
        section += `- ⚠️ ${weakness}\n`;
      }
      section += '\n';
    }
  }

  return section;
}

/**
 * Generate key findings
 */
function generateKeyFindings(eventAnalyses) {
  const findings = [];

  // Find best performing event
  const bestEvent = eventAnalyses
    .filter((a) => a.performance.accuracy != null)
    .sort((a, b) => b.performance.accuracy - a.performance.accuracy)[0];
  
  if (bestEvent) {
    findings.push(
      `**Best Performance:** ${bestEvent.eventName} with ${bestEvent.performance.accuracy.toFixed(1)}% accuracy`
    );
  }

  // Find worst performing event
  const worstEvent = eventAnalyses
    .filter((a) => a.performance.accuracy != null && a.signalCount > 0)
    .sort((a, b) => a.performance.accuracy - b.performance.accuracy)[0];
  
  if (worstEvent) {
    findings.push(
      `**Needs Improvement:** ${worstEvent.eventName} with ${worstEvent.performance.accuracy.toFixed(1)}% accuracy`
    );
  }

  // Events with no signals
  const noSignalEvents = eventAnalyses.filter((a) => a.signalCount === 0);
  if (noSignalEvents.length > 0) {
    findings.push(
      `**No Signals:** ${noSignalEvents.length} events generated no signals (${noSignalEvents.map((a) => a.eventName).join(', ')})`
    );
  }

  // Trap detection effectiveness
  const trapsWithLeadTime = eventAnalyses.filter(
    (a) => a.trapAnalysis.averageLeadTimeMinutes != null
  );
  if (trapsWithLeadTime.length > 0) {
    const avgLeadTime = trapsWithLeadTime.reduce(
      (sum, a) => sum + a.trapAnalysis.averageLeadTimeMinutes, 0
    ) / trapsWithLeadTime.length;
    findings.push(
      `**Trap Detection:** Average warning lead time of ${(avgLeadTime / 60).toFixed(1)} hours across events`
    );
  }

  return findings.map((f) => `- ${f}`).join('\n');
}

/**
 * Generate recommendations
 */
function generateRecommendations(eventAnalyses) {
  const recommendations = new Set();

  // Collect all recommendations from insights
  for (const analysis of eventAnalyses) {
    if (analysis.insights?.recommendations) {
      for (const rec of analysis.insights.recommendations) {
        recommendations.add(rec);
      }
    }
  }

  // Add general recommendations
  const lowAccuracyEvents = eventAnalyses.filter(
    (a) => a.performance.accuracy != null && a.performance.accuracy < 50
  );
  
  if (lowAccuracyEvents.length > 2) {
    recommendations.add(
      'Consider implementing event-specific parameter tuning for different market conditions'
    );
  }

  const noSignalEvents = eventAnalyses.filter((a) => a.signalCount === 0);
  if (noSignalEvents.length > 3) {
    recommendations.add(
      'Review signal sensitivity - multiple significant events produced no signals'
    );
  }

  if (recommendations.size === 0) {
    return '*No specific recommendations at this time. Continue monitoring performance.*';
  }

  return Array.from(recommendations)
    .map((rec, i) => `${i + 1}. ${rec}`)
    .join('\n');
}

/**
 * Generate JSON report for data analysis
 * @param {Array} eventAnalyses - Array of event analysis results
 * @returns {string} JSON string
 */
export function generateJSONReport(eventAnalyses) {
  const report = {
    generated: new Date().toISOString(),
    summary: {
      totalEvents: eventAnalyses.length,
      totalSignals: eventAnalyses.reduce((sum, a) => sum + a.signalCount, 0),
      overallMetrics: calculateAggregateMetrics(eventAnalyses),
    },
    events: eventAnalyses,
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Save report to file
 * @param {string} content - Report content
 * @param {string} filepath - Output file path
 */
export function saveReport(content, filepath) {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filepath, content, 'utf8');
}
