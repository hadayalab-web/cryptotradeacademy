// scripts/backtest/validate_data.js
// Validate backtest data integrity

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SIGNALS_LOG_PATH = path.join(__dirname, '..', '..', 'data', 'signals_log.jsonl');
const SIGNALS_BACKTEST_PATH = path.join(__dirname, '..', '..', 'data', 'signals_backtest.jsonl');

/**
 * Validate signals log data
 * @param {string} filepath - Path to signals log file
 * @returns {Object} Validation results
 */
function validateSignalsLog(filepath) {
  const results = {
    filepath,
    exists: false,
    lineCount: 0,
    validLines: 0,
    invalidLines: 0,
    errors: [],
    warnings: [],
    missingFields: {},
    outliers: [],
    duplicates: [],
  };

  if (!fs.existsSync(filepath)) {
    results.errors.push('File does not exist');
    return results;
  }

  results.exists = true;

  const raw = fs.readFileSync(filepath, 'utf8');
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  results.lineCount = lines.length;

  const timestamps = new Set();
  const signalKeys = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    try {
      const obj = JSON.parse(line);
      results.validLines++;

      // Check for required fields
      const requiredFields = ['ts', 'metrics'];
      for (const field of requiredFields) {
        if (!(field in obj)) {
          if (!results.missingFields[field]) {
            results.missingFields[field] = 0;
          }
          results.missingFields[field]++;
          results.warnings.push(`Line ${i + 1}: Missing field '${field}'`);
        }
      }

      // Check metrics subfields
      if (obj.metrics) {
        const metricsFields = ['priceUsd', 'score', 'signal'];
        for (const field of metricsFields) {
          if (!(field in obj.metrics)) {
            const key = `metrics.${field}`;
            if (!results.missingFields[key]) {
              results.missingFields[key] = 0;
            }
            results.missingFields[key]++;
          }
        }

        // Check for outliers
        if (typeof obj.metrics.score === 'number') {
          if (obj.metrics.score < 0 || obj.metrics.score > 100) {
            results.outliers.push({
              line: i + 1,
              field: 'metrics.score',
              value: obj.metrics.score,
              reason: 'Score outside valid range [0, 100]',
            });
          }
        }

        if (typeof obj.metrics.priceUsd === 'number') {
          if (obj.metrics.priceUsd < 100 || obj.metrics.priceUsd > 200000) {
            results.outliers.push({
              line: i + 1,
              field: 'metrics.priceUsd',
              value: obj.metrics.priceUsd,
              reason: 'Price outside typical BTC range',
            });
          }
        }

        if (typeof obj.metrics.change24h === 'number') {
          if (Math.abs(obj.metrics.change24h) > 30) {
            results.outliers.push({
              line: i + 1,
              field: 'metrics.change24h',
              value: obj.metrics.change24h,
              reason: '24h change > 30% (extreme)',
            });
          }
        }
      }

      // Check for duplicates by timestamp
      const ts = obj.ts || obj.timestamp || obj.time || obj.createdAt;
      if (ts) {
        const key = `${ts}_${obj.metrics?.signal || 'UNKNOWN'}`;
        if (signalKeys.has(key)) {
          results.duplicates.push({
            line: i + 1,
            timestamp: ts,
            signal: obj.metrics?.signal,
          });
        }
        signalKeys.add(key);
      }

      // Check timestamp validity
      if (ts) {
        const date = new Date(ts);
        if (isNaN(date.getTime())) {
          results.warnings.push(`Line ${i + 1}: Invalid timestamp '${ts}'`);
        } else {
          const now = Date.now();
          const tsMs = date.getTime();
          if (tsMs > now) {
            results.warnings.push(`Line ${i + 1}: Future timestamp '${ts}'`);
          }
          if (tsMs < new Date('2020-01-01').getTime()) {
            results.warnings.push(`Line ${i + 1}: Very old timestamp '${ts}'`);
          }
        }
      }

    } catch (e) {
      results.invalidLines++;
      results.errors.push(`Line ${i + 1}: JSON parse error - ${e.message}`);
    }
  }

  return results;
}

/**
 * Validate backtest results
 * @param {string} filepath - Path to backtest results file
 * @returns {Object} Validation results
 */
function validateBacktestResults(filepath) {
  const results = {
    filepath,
    exists: false,
    lineCount: 0,
    validLines: 0,
    invalidLines: 0,
    errors: [],
    warnings: [],
    stats: {
      evaluated: 0,
      skipped: 0,
      outcomes: {
        TP: 0,
        TP_FIRST: 0,
        SL: 0,
        SL_FIRST: 0,
        OPEN: 0,
      },
    },
  };

  if (!fs.existsSync(filepath)) {
    results.errors.push('File does not exist');
    return results;
  }

  results.exists = true;

  const raw = fs.readFileSync(filepath, 'utf8');
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  results.lineCount = lines.length;

  for (let i = 0; i < lines.length; i++) {
    try {
      const obj = JSON.parse(lines[i]);
      results.validLines++;

      if (obj.backtest) {
        if (obj.backtest.status === 'EVAL') {
          results.stats.evaluated++;
          const outcome = obj.backtest.outcome || 'UNKNOWN';
          if (results.stats.outcomes[outcome] !== undefined) {
            results.stats.outcomes[outcome]++;
          }
        } else if (obj.backtest.status === 'SKIPPED') {
          results.stats.skipped++;
        }
      } else {
        results.warnings.push(`Line ${i + 1}: Missing backtest field`);
      }

    } catch (e) {
      results.invalidLines++;
      results.errors.push(`Line ${i + 1}: JSON parse error - ${e.message}`);
    }
  }

  return results;
}

/**
 * Generate validation report
 * @param {Object} signalsResults - Signals log validation results
 * @param {Object} backtestResults - Backtest results validation (optional)
 * @returns {string} Formatted report
 */
function generateValidationReport(signalsResults, backtestResults = null) {
  let report = '=== Data Validation Report ===\n\n';

  // Signals log validation
  report += '## Signals Log Validation\n\n';
  report += `File: ${signalsResults.filepath}\n`;
  report += `Exists: ${signalsResults.exists ? 'Yes' : 'No'}\n\n`;

  if (signalsResults.exists) {
    report += `Total Lines: ${signalsResults.lineCount}\n`;
    report += `Valid Lines: ${signalsResults.validLines}\n`;
    report += `Invalid Lines: ${signalsResults.invalidLines}\n\n`;

    if (Object.keys(signalsResults.missingFields).length > 0) {
      report += 'Missing Fields:\n';
      for (const [field, count] of Object.entries(signalsResults.missingFields)) {
        report += `  ${field}: ${count} occurrences\n`;
      }
      report += '\n';
    }

    if (signalsResults.outliers.length > 0) {
      report += `Outliers: ${signalsResults.outliers.length}\n`;
      report += '  (First 5 shown)\n';
      for (const outlier of signalsResults.outliers.slice(0, 5)) {
        report += `  Line ${outlier.line}: ${outlier.field} = ${outlier.value} (${outlier.reason})\n`;
      }
      report += '\n';
    }

    if (signalsResults.duplicates.length > 0) {
      report += `Duplicates: ${signalsResults.duplicates.length}\n`;
      report += '  (First 5 shown)\n';
      for (const dup of signalsResults.duplicates.slice(0, 5)) {
        report += `  Line ${dup.line}: ${dup.timestamp} ${dup.signal}\n`;
      }
      report += '\n';
    }

    if (signalsResults.errors.length > 0) {
      report += `Errors: ${signalsResults.errors.length}\n`;
      for (const error of signalsResults.errors.slice(0, 10)) {
        report += `  ${error}\n`;
      }
      if (signalsResults.errors.length > 10) {
        report += `  ... and ${signalsResults.errors.length - 10} more\n`;
      }
      report += '\n';
    }

    if (signalsResults.warnings.length > 0) {
      report += `Warnings: ${signalsResults.warnings.length}\n`;
      for (const warning of signalsResults.warnings.slice(0, 10)) {
        report += `  ${warning}\n`;
      }
      if (signalsResults.warnings.length > 10) {
        report += `  ... and ${signalsResults.warnings.length - 10} more\n`;
      }
      report += '\n';
    }
  }

  // Backtest results validation
  if (backtestResults) {
    report += '## Backtest Results Validation\n\n';
    report += `File: ${backtestResults.filepath}\n`;
    report += `Exists: ${backtestResults.exists ? 'Yes' : 'No'}\n\n`;

    if (backtestResults.exists) {
      report += `Total Lines: ${backtestResults.lineCount}\n`;
      report += `Valid Lines: ${backtestResults.validLines}\n`;
      report += `Invalid Lines: ${backtestResults.invalidLines}\n\n`;

      report += 'Statistics:\n';
      report += `  Evaluated: ${backtestResults.stats.evaluated}\n`;
      report += `  Skipped: ${backtestResults.stats.skipped}\n\n`;

      report += 'Outcomes:\n';
      for (const [outcome, count] of Object.entries(backtestResults.stats.outcomes)) {
        report += `  ${outcome}: ${count}\n`;
      }
      report += '\n';
    }
  }

  // Summary
  report += '## Summary\n\n';
  const hasErrors = signalsResults.errors.length > 0 || 
                    (backtestResults && backtestResults.errors.length > 0);
  const hasWarnings = signalsResults.warnings.length > 0 || 
                      (backtestResults && backtestResults.warnings.length > 0);

  if (!hasErrors && !hasWarnings) {
    report += '✅ All data is valid!\n';
  } else if (hasErrors) {
    report += '❌ Data validation failed with errors\n';
  } else {
    report += '⚠️ Data is valid but has warnings\n';
  }

  return report;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Data Validation\n');

  const signalsResults = validateSignalsLog(SIGNALS_LOG_PATH);
  let backtestResults = null;

  if (fs.existsSync(SIGNALS_BACKTEST_PATH)) {
    backtestResults = validateBacktestResults(SIGNALS_BACKTEST_PATH);
  }

  const report = generateValidationReport(signalsResults, backtestResults);
  console.log(report);

  // Exit with error code if validation failed
  const hasErrors = signalsResults.errors.length > 0 || 
                    (backtestResults && backtestResults.errors.length > 0);
  
  if (hasErrors) {
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  validateSignalsLog,
  validateBacktestResults,
  generateValidationReport,
};
